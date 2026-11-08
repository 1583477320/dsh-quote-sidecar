import assert from 'node:assert/strict'
import test from 'node:test'

import { apply, buildUserText, collectSnapshot, selectRoute } from '../index.js'

/* ------------------------------------------------------------------ */
/* fakes                                                               */
/* ------------------------------------------------------------------ */

class FakeRes {
  constructor() {
    this.status = 0
    this.headers = {}
    this.chunks = []
    this.headersSent = false
    this.writableEnded = false
    this.destroyed = false
    this.listeners = new Map()
  }
  writeHead(status, headers) {
    this.status = status
    this.headers = headers
    this.headersSent = true
  }
  flushHeaders() {}
  write(chunk) {
    if (this.writableEnded) throw new Error('write after end')
    this.chunks.push(String(chunk))
    return true
  }
  end(chunk) {
    if (chunk !== undefined) this.chunks.push(String(chunk))
    this.writableEnded = true
  }
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, [])
    this.listeners.get(event).push(fn)
  }
  off(event, fn) {
    const list = this.listeners.get(event) ?? []
    this.listeners.set(event, list.filter((item) => item !== fn))
  }
  emit(event) {
    for (const fn of this.listeners.get(event) ?? []) fn()
  }
  get text() {
    return this.chunks.join('')
  }
}

function makeReq(body, options = {}) {
  const data = Buffer.from(JSON.stringify(body))
  return {
    method: options.method ?? 'POST',
    url: options.url ?? '/dsh-quote-sidecar/ask',
    headers: {
      host: '127.0.0.1:65535',
      'content-type': 'application/json',
      ...(options.header === null ? {} : { 'x-dsh-quote-sidecar': options.header ?? '1' }),
      ...(options.origin === undefined ? {} : { origin: options.origin }),
    },
    async *[Symbol.asyncIterator]() {
      yield data
    },
    on() {},
    off() {},
  }
}

function boot({ chunks, defaults, sessions } = {}) {
  const routes = []
  const calls = []
  const ctx = {
    effect(fn) {
      const disposer = fn()
      return typeof disposer === 'function' ? disposer : () => {}
    },
    webServer: {
      register(route) {
        routes.push(route)
        return () => {}
      },
    },
    inject(_names, callback) {
      callback({
        llm: {
          stream(options) {
            calls.push(options)
            return (async function* generate() {
              for (const chunk of chunks ?? []) yield chunk
            })()
          },
        },
        sessions:
          sessions ??
          {
            get() {
              return {
                deriveMessages() {
                  return [
                    { role: 'user', content: [{ type: 'text', text: '主会话里的问题' }] },
                    { role: 'assistant', content: [{ type: 'text', text: '主会话里的回答' }] },
                  ]
                },
              }
            },
          },
        get(name) {
          return name === 'agentDefaultModel' ? defaults : undefined
        },
      })
    },
  }
  apply(ctx)
  return { handler: routes[0].handler, calls }
}

async function run(handler, body, options) {
  const res = new FakeRes()
  await handler(makeReq(body, options), res)
  return res
}

const TEXT_CHUNKS = [
  { type: 'text-delta', index: 0, text: '先' },
  { type: 'text-delta', index: 0, text: '去重。' },
  { type: 'finish', reason: { kind: 'stop' } },
]

const BASE = {
  sessionId: 's1',
  quote: '先按 requestId 去重，再按 seq 排序。',
  question: '为什么不直接加锁？',
  mode: 'snapshot',
  provider: 'deepseek-official',
  model: 'deepseek-chat',
}

/* ------------------------------------------------------------------ */
/* route                                                               */
/* ------------------------------------------------------------------ */

test('streams deltas and done over SSE', async () => {
  const { handler } = boot({ chunks: TEXT_CHUNKS })
  const res = await run(handler, BASE)

  assert.equal(res.status, 200)
  assert.match(res.headers['content-type'], /text\/event-stream/)
  assert.match(res.text, /event: meta/)
  assert.match(res.text, /event: delta\ndata: \{"text":"先"\}/)
  assert.match(res.text, /event: done/)
  assert.match(res.text, /"chars":4/)
  assert.ok(res.writableEnded)
})

test('frames the quote, snapshot and question for the model', async () => {
  const { handler, calls } = boot({ chunks: TEXT_CHUNKS })
  await run(handler, BASE)

  assert.equal(calls.length, 1)
  const call = calls[0]
  assert.equal(call.provider, 'deepseek-official')
  assert.equal(call.model, 'deepseek-chat')
  assert.match(call.system, /引用追问/)
  const text = call.messages[0].content[0].text
  assert.match(text, /先按 requestId 去重/)
  assert.match(text, /主会话里的回答/)
  assert.match(text, /为什么不直接加锁/)
})

test('quote mode drops the session snapshot', async () => {
  const { handler, calls } = boot({ chunks: TEXT_CHUNKS })
  await run(handler, { ...BASE, mode: 'quote' })

  const text = calls[0].messages[0].content[0].text
  assert.doesNotMatch(text, /主会话里的回答/)
  assert.match(text, /仅|引用片段/)
})

test('rejects a request without the plugin header', async () => {
  const { handler } = boot({ chunks: TEXT_CHUNKS })
  const res = await run(handler, BASE, { header: null })
  assert.equal(res.status, 403)
  assert.match(res.text, /x-dsh-quote-sidecar/)
})

test('rejects a cross-origin caller', async () => {
  const { handler } = boot({ chunks: TEXT_CHUNKS })
  const res = await run(handler, BASE, { origin: 'https://evil.example' })
  assert.equal(res.status, 403)
})

test('falls back to the application default model', async () => {
  const defaults = { currentSelection: () => ({ provider: 'p-default', model: 'm-default' }) }
  const { handler } = boot({ chunks: TEXT_CHUNKS, defaults })
  const res = await run(handler, { ...BASE, provider: undefined, model: undefined })
  assert.match(res.text, /"provider":"p-default"/)
})

test('reports a missing model instead of guessing', async () => {
  const { handler } = boot({ chunks: TEXT_CHUNKS })
  const res = await run(handler, { ...BASE, provider: undefined, model: undefined })
  assert.equal(res.status, 500)
  assert.match(res.text, /无法确定模型/)
})

test('surfaces a terminal stream error', async () => {
  const { handler } = boot({
    chunks: [
      { type: 'text-delta', index: 0, text: '半' },
      { type: 'finish', reason: { kind: 'error', failure: { code: 'AUTH', message: 'bad key' } } },
    ],
  })
  const res = await run(handler, BASE)
  assert.match(res.text, /event: error/)
  assert.match(res.text, /"code":"AUTH"/)
})

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

test('selectRoute prefers the explicit pair', () => {
  const route = selectRoute({ get: () => undefined }, { provider: 'a', model: 'b', reasoningEffort: 'low' })
  assert.deepEqual(route, { provider: 'a', model: 'b', reasoningEffort: 'low' })
})

test('collectSnapshot skips systems and survives a missing session', () => {
  const snapshot = collectSnapshot(
    {
      sessions: {
        get() {
          return {
            deriveMessages() {
              return [
                { role: 'system', content: [{ type: 'text', text: '系统提示' }] },
                { role: 'user', content: [{ type: 'text', text: '问题' }] },
                { role: 'assistant', content: [{ type: 'text', text: '回答' }] },
              ]
            },
          }
        },
      },
    },
    's1',
  )
  assert.doesNotMatch(snapshot, /系统提示/)
  assert.match(snapshot, /用户：问题/)
  assert.match(snapshot, /助手：回答/)

  assert.equal(collectSnapshot({ sessions: { get: () => undefined } }, 'missing'), '')
  assert.equal(collectSnapshot({}, ''), '')
})

test('buildUserText frames sections in order', () => {
  const text = buildUserText({ quote: 'Q', snapshot: 'S', question: 'P' })
  assert.ok(text.indexOf('【引用片段】') < text.indexOf('【主会话上下文'))
  assert.ok(text.indexOf('【主会话上下文') < text.indexOf('【我的问题】'))
})
