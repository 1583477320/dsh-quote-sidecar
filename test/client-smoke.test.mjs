import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'

/**
 * Load client.js as the browser module table would, with the smallest DOM and
 * React surface the registration path touches. Components are never rendered;
 * this proves the bundle registers the window and installs its selection hooks.
 */
function loadBundle() {
  const code = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  const registrations = []
  const listeners = []

  const element = () => ({
    dataset: {},
    style: {},
    className: '',
    innerHTML: '',
    textContent: '',
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) {
      return child
    },
    remove() {},
    querySelector: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }),
    closest: () => null,
    offsetParent: null,
  })

  const document = {
    body: element(),
    head: { appendChild() {} },
    documentElement: element(),
    querySelector: () => null,
    createElement: () => element(),
    addEventListener(type, fn) {
      listeners.push(['document', type, fn])
    },
    removeEventListener() {},
  }

  const window = {
    __ModuleLoader__: {
      load(registration) {
        registrations.push(registration)
      },
    },
    document,
    getSelection: () => null,
    addEventListener(type, fn) {
      listeners.push(['window', type, fn])
    },
    removeEventListener() {},
    innerWidth: 1440,
    innerHeight: 900,
  }

  const sandbox = {
    console,
    document,
    window,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    setTimeout,
    clearTimeout,
  }
  vm.createContext(sandbox)
  vm.runInContext(code, sandbox)
  return { registration: registrations[0], listeners }
}

const ReactStub = {
  createElement: (...args) => ({ args }),
  Fragment: 'fragment',
  useState: () => [null, () => {}],
  useRef: () => ({ current: null }),
  useEffect: () => {},
  useSyncExternalStore: () => null,
  useReducer: () => [{}, () => {}],
}

function loadModule() {
  const { registration } = loadBundle()
  return registration.factory((name) => {
    if (name === 'react') return ReactStub
    if (name === 'react-dom') return { createPortal: () => null }
    throw new Error(`unexpected require: ${name}`)
  })
}

test('registers under the package name with the expected services', () => {
  const { registration } = loadBundle()
  assert.equal(registration.id, 'dsh-quote-sidecar')
  const mod = loadModule()
  assert.deepEqual([...mod.inject], ['slots', 'locale', 'sessions'])
})

test('registers the floating window slot and the selection hooks', () => {
  const mod = loadModule()
  const calls = { locale: [], slots: [], injected: [] }
  const ctx = {
    effect(fn) {
      const disposer = fn()
      return typeof disposer === 'function' ? disposer : () => {}
    },
    locale: {
      register(namespace, dictionaries) {
        calls.locale.push([namespace, dictionaries])
      },
    },
    slots: {
      inject(name, factory) {
        calls.injected.push(name)
        return factory()
      },
      register(options, component) {
        calls.slots.push({ options, component })
        return { options, component }
      },
    },
    sessions: {},
    uiConversation: {
      interactions: {
        register() {
          throw new Error('this plugin must not compete for the selection surface')
        },
      },
    },
  }

  mod.apply(ctx)

  assert.equal(calls.locale.length, 1)
  assert.equal(calls.locale[0][0], 'quoteSidecar')
  assert.deepEqual(calls.injected, ['shell.overlay'])
  assert.equal(calls.slots.length, 1)
  assert.equal(calls.slots[0].options.name, 'shell.overlay')
  assert.equal(typeof calls.slots[0].component, 'function')
})

test('installs one pointerup and one selectionchange listener', () => {
  const { registration, listeners } = loadBundle()
  const mod = registration.factory((name) => {
    if (name === 'react') return ReactStub
    if (name === 'react-dom') return { createPortal: () => null }
    throw new Error(`unexpected require: ${name}`)
  })
  mod.apply({
    effect(fn) {
      fn()
    },
    locale: { register() {} },
    slots: {
      inject(_name, factory) {
        return factory()
      },
      register: () => ({}),
    },
    sessions: {},
  })

  const types = listeners.filter(([scope]) => scope === 'document').map(([, type]) => type)
  assert.ok(types.includes('pointerup'))
  assert.ok(types.includes('selectionchange'))
  assert.equal(listeners.filter(([scope, type]) => scope === 'window' && type === 'scroll').length, 1)
})
