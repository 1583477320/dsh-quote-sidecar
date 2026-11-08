window.__ModuleLoader__.load({
  id: 'dsh-quote-sidecar',
  factory(require) {
    var module = { exports: {} }
    var exports = module.exports
    /**
     * dsh-quote-sidecar — Client half.
     *
     * Adds one action to the native text-selection surface ("小窗追问") and a
     * disposable floating window in the bottom-right corner. The window owns a
     * plain model conversation: it never creates a Session, never appends to the
     * main conversation, and never writes to disk.
     *
     * Data path: selection → POST /dsh-quote-sidecar/ask → SSE deltas.
     */

    const React = require('react')
    const ReactDOM = require('react-dom')
    const h = React.createElement

    const NS = 'quoteSidecar'
    const API = '/dsh-quote-sidecar/ask'
    const STYLE_ID = 'dsh-quote-sidecar/panel.css'
    const STYLE_SELECTOR = `style[data-plugin-css="${STYLE_ID}"]`

    /* ------------------------------------------------------------------ */
    /* locale                                                              */
    /* ------------------------------------------------------------------ */

    const zh = {
      action: '小窗追问',
      title: '引用追问',
      temporary: '临时',
      source: '来自主会话',
      expand: '展开',
      collapse: '收起',
      context: '上下文',
      contextSnapshot: '主会话快照',
      contextQuote: '仅这段引用',
      contextReadonly: '只读',
      emptyTitle: '就这段内容问点什么',
      emptyBody: '主会话不会收到消息，也不会多出会话记录。关闭小窗即丢弃。',
      suggestionLock: '为什么不直接加锁？',
      suggestionExample: '举个例子',
      suggestionCounter: '有反例吗',
      placeholder: '就这段继续问…',
      send: '发送',
      sendHint: 'Enter 发送 · Shift+Enter 换行',
      privacy: '仅存在于这个小窗 · 关闭后立即清理',
      clear: '清空',
      clearToast: '小窗内容已清空',
      noWrite: '对话不会写入任何会话',
      end: '结束并清理',
      confirmTitle: '结束这条临时对话？',
      confirmBody: '小窗里的问答只存在于内存里，关闭后会立即丢弃。主会话不会收到消息，也不会在会话列表里留下记录。',
      keepAsking: '继续问',
      confirmEnd: '清理并关闭',
      cleaned: '临时对话已清理，没有留下任何会话记录',
      minimize: '收起小窗',
      close: '关闭',
      stop: '停止',
      regenerate: '重新生成',
      thinking: '正在回答…',
      failed: '这次回答失败了',
      retry: '重试',
      locate: '定位原文',
      located: '已定位到主会话里的原文',
    }

    const en = {
      action: 'Ask in a side window',
      title: 'Quote follow-up',
      temporary: 'Temporary',
      source: 'From the main conversation',
      expand: 'Expand',
      collapse: 'Collapse',
      context: 'Context',
      contextSnapshot: 'Session snapshot',
      contextQuote: 'Quote only',
      contextReadonly: 'read-only',
      emptyTitle: 'Ask something about this passage',
      emptyBody: 'The main conversation receives nothing and gains no session entry. Closing this window discards it.',
      suggestionLock: 'Why not just add a lock?',
      suggestionExample: 'Give me an example',
      suggestionCounter: 'Any counterexample?',
      placeholder: 'Ask about this passage…',
      send: 'Send',
      sendHint: 'Enter to send · Shift+Enter for a new line',
      privacy: 'Lives only in this window · discarded on close',
      clear: 'Clear',
      clearToast: 'Side chat cleared',
      noWrite: 'Nothing is written to any session',
      end: 'End and clean up',
      confirmTitle: 'End this temporary conversation?',
      confirmBody: 'The exchange lives only in memory. Closing discards it immediately; the main conversation receives nothing and no session entry is created.',
      keepAsking: 'Keep asking',
      confirmEnd: 'Discard and close',
      cleaned: 'Temporary conversation discarded — nothing was saved',
      minimize: 'Minimize',
      close: 'Close',
      stop: 'Stop',
      regenerate: 'Regenerate',
      thinking: 'Answering…',
      failed: 'This answer failed',
      retry: 'Retry',
      locate: 'Locate in conversation',
      located: 'Located the passage in the main conversation',
    }

    /* ------------------------------------------------------------------ */
    /* styles                                                              */
    /* ------------------------------------------------------------------ */

    const CSS = `
.qs-action{corner-shape:round;display:inline-flex;align-items:center;gap:5px;margin-left:4px;border:none;border-radius:999px;padding:5px 10px;cursor:pointer;background:var(--dsw-alias-button-floating-fill,#fff);box-shadow:var(--dsw-elevation-panel,0 4px 14px rgba(17,22,38,.14));color:var(--dsw-alias-label-primary,#1b1e23);font-size:13px;line-height:20px;white-space:nowrap}
.qs-action:hover{background:var(--dsw-alias-button-floating-hover,var(--dsw-alias-interactive-bg-hover,rgba(20,24,35,.06)))}
.qs-action svg{width:14px;height:14px;flex:none}
.qs-panel{position:fixed;right:24px;bottom:24px;z-index:900;display:flex;flex-direction:column;box-sizing:border-box;width:432px;height:604px;min-width:360px;min-height:380px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1b1e23);border:1px solid var(--dsw-alias-border-l3,rgba(20,24,35,.12));border-radius:16px;box-shadow:0 18px 50px rgba(17,22,38,.18),0 2px 8px rgba(17,22,38,.08);overflow:hidden;font-size:13px;line-height:1.65}
.qs-panel *{box-sizing:border-box}
.qs-head{display:flex;align-items:center;gap:9px;padding:10px 10px 10px 14px;cursor:grab;user-select:none;border-bottom:1px solid var(--dsw-alias-border-l3,rgba(20,24,35,.1));background:linear-gradient(180deg,color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 5%,transparent),transparent)}
.qs-head:active{cursor:grabbing}
.qs-mark{display:grid;place-items:center;width:24px;height:24px;border-radius:8px;flex:none;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 12%,transparent);color:var(--dsw-alias-brand-primary,#4d6bfe);font-size:11px;font-weight:700}
.qs-title{display:flex;align-items:center;gap:7px;min-width:0}
.qs-title b{font-size:13px;font-weight:600}
.qs-badge{display:inline-flex;align-items:center;gap:4px;height:18px;padding:0 6px;border-radius:5px;background:var(--dsw-alias-state-warn-tertiary,#fff6e8);color:var(--dsw-alias-state-warn-label,#a45c05);font-size:10px;font-weight:500;border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 24%,transparent)}
.qs-badge i{width:5px;height:5px;border-radius:50%;background:currentColor}
.qs-head-actions{margin-left:auto;display:flex;align-items:center;gap:2px}
.qs-icon{display:grid;place-items:center;width:26px;height:26px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-tertiary,#8b929c);cursor:pointer;font-size:15px;line-height:1}
.qs-icon:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(20,24,35,.06));color:var(--dsw-alias-label-primary,#1b1e23)}
.qs-quote{position:relative;margin:10px 12px 0;padding:8px 10px 8px 12px;border-radius:10px;overflow:hidden;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 7%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 16%,transparent)}
.qs-quote:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--dsw-alias-brand-primary,#4d6bfe);opacity:.6}
.qs-quote-src{display:flex;align-items:center;gap:6px;margin-bottom:3px;color:var(--dsw-alias-label-tertiary,#8b929c);font-size:10.5px}
.qs-quote-src button{margin-left:auto;border:0;background:none;padding:0;color:var(--dsw-alias-brand-primary,#4d6bfe);font-size:10.5px;cursor:pointer}
.qs-quote-text{margin:0;color:var(--dsw-alias-label-secondary,#5b626c);font-size:12.5px;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.qs-quote.open .qs-quote-text{-webkit-line-clamp:unset;display:block}
.qs-quote-toggle{margin-top:2px;padding:0;border:0;background:none;color:var(--dsw-alias-brand-primary,#4d6bfe);font-size:10.5px;cursor:pointer}
.qs-context{display:flex;align-items:center;gap:8px;padding:8px 12px 0;color:var(--dsw-alias-label-tertiary,#8b929c);font-size:11px}
.qs-seg{display:inline-flex;gap:2px;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-3,rgba(20,24,35,.06))}
.qs-seg button{height:22px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#5b626c);font-size:11px;cursor:pointer}
.qs-seg button.on{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1b1e23);box-shadow:0 1px 2px rgba(17,22,38,.1)}
.qs-context-note{margin-left:auto;color:var(--dsw-alias-label-tertiary,#8b929c);font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}
.qs-body{flex:1;min-height:0;overflow:auto;padding:10px 14px 4px}
.qs-empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:18px 8px 10px;color:var(--dsw-alias-label-tertiary,#8b929c)}
.qs-orb{display:grid;place-items:center;width:38px;height:38px;margin-bottom:8px;border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 12%,transparent);color:var(--dsw-alias-brand-primary,#4d6bfe)}
.qs-empty h4{margin:0 0 3px;font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-secondary,#5b626c)}
.qs-empty p{margin:0;max-width:290px;font-size:11.5px;line-height:1.65}
.qs-sugs{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:12px}
.qs-sug{height:26px;padding:0 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l3,rgba(20,24,35,.14));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#5b626c);font-size:11.5px;cursor:pointer}
.qs-sug:hover{border-color:var(--dsw-alias-brand-primary,#4d6bfe);color:var(--dsw-alias-brand-primary,#4d6bfe)}
.qs-msg{display:flex;flex-direction:column;margin-bottom:14px}
.qs-msg.me{align-items:flex-end}
.qs-who{display:flex;align-items:center;gap:6px;margin-bottom:4px;color:var(--dsw-alias-label-tertiary,#8b929c);font-size:10.5px}
.qs-msg.me .qs-bubble{max-width:88%;padding:8px 11px;border-radius:12px;background:var(--dsw-alias-bg-layer-3,rgba(20,24,35,.06));font-size:12.5px;white-space:pre-wrap;word-break:break-word}
.qs-msg.ai .qs-bubble{font-size:12.5px;line-height:1.72;word-break:break-word}
.qs-msg.ai .qs-bubble p{margin:0 0 8px}
.qs-msg.ai .qs-bubble p:last-child{margin-bottom:0}
.qs-msg.ai .qs-bubble ul{margin:0 0 8px;padding-left:18px}
.qs-msg.ai .qs-bubble li{margin:1px 0}
.qs-msg.ai .qs-bubble code{padding:1px 4px;border-radius:4px;background:var(--dsw-alias-markdown-inline-code,rgba(20,24,35,.07));font-family:var(--dsw-font-family-mono,Consolas,monospace);font-size:11px}
.qs-msg.ai .qs-bubble pre{margin:0 0 8px;padding:8px 10px;border-radius:8px;overflow:auto;background:var(--dsw-alias-markdown-code-block,var(--dsw-alias-bg-layer-2,#f4f5f7));border:1px solid var(--dsw-alias-border-l3,rgba(20,24,35,.1));font-family:var(--dsw-font-family-mono,Consolas,monospace);font-size:11px;line-height:1.6}
.qs-msg.ai .qs-bubble pre code{padding:0;background:none;font-size:inherit}
.qs-caret{display:inline-block;width:6px;height:13px;margin-left:1px;vertical-align:-2px;border-radius:1px;background:var(--dsw-alias-brand-primary,#4d6bfe);animation:qs-blink 1s steps(2) infinite}
@keyframes qs-blink{50%{opacity:0}}
.qs-msg-foot{display:flex;align-items:center;gap:8px;margin-top:5px;color:var(--dsw-alias-label-tertiary,#8b929c);font-size:10px}
.qs-msg-foot button{padding:0;border:0;background:none;color:var(--dsw-alias-brand-primary,#4d6bfe);font-size:10px;cursor:pointer}
.qs-error{margin-top:6px;padding:7px 9px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d33) 9%,transparent);color:var(--dsw-alias-label-error,#c0392b);font-size:11.5px;line-height:1.6}
.qs-error button{margin-left:6px;border:0;background:none;padding:0;color:inherit;text-decoration:underline;cursor:pointer;font-size:11.5px}
.qs-compose{padding:6px 12px 8px;border-top:1px solid var(--dsw-alias-border-l3,rgba(20,24,35,.1))}
.qs-inbox{border:1px solid var(--dsw-alias-border-l3,rgba(20,24,35,.14));border-radius:11px;padding:8px 9px 6px;background:var(--dsw-alias-bg-layer-1,#fff);transition:border-color .15s,box-shadow .15s}
.qs-inbox:focus-within{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 55%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 12%,transparent)}
.qs-inbox textarea{display:block;width:100%;min-height:22px;max-height:88px;border:0;outline:0;resize:none;background:none;color:var(--dsw-alias-label-primary,#1b1e23);font:inherit;font-size:12.5px;line-height:1.65}
.qs-inbox textarea::placeholder{color:var(--dsw-alias-label-tertiary,#8b929c)}
.qs-compose-row{display:flex;align-items:center;gap:6px;margin-top:4px;color:var(--dsw-alias-label-tertiary,#8b929c);font-size:10.5px}
.qs-send{margin-left:auto;height:24px;padding:0 9px;border:0;border-radius:7px;background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4d6bfe));color:var(--dsw-alias-label-primary-foreground,#fff);font-size:11.5px;cursor:pointer}
.qs-send:disabled{opacity:.45;cursor:not-allowed}
.qs-stop{height:24px;padding:0 9px;border:1px solid var(--dsw-alias-border-l3,rgba(20,24,35,.14));border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#5b626c);font-size:11.5px;cursor:pointer}
.qs-hint{display:flex;align-items:center;gap:5px;padding:6px 2px 0;color:var(--dsw-alias-label-tertiary,#8b929c);font-size:10px}
.qs-foot{display:flex;align-items:center;gap:8px;padding:8px 12px 10px;border-top:1px solid var(--dsw-alias-border-l3,rgba(20,24,35,.1));background:color-mix(in srgb,var(--dsw-alias-label-primary,#1b1e23) 2.5%,transparent);color:var(--dsw-alias-label-tertiary,#8b929c);font-size:10.5px}
.qs-foot button{border:0;background:none;cursor:pointer;font-size:10.5px}
.qs-clear{padding:0 4px;color:var(--dsw-alias-label-tertiary,#8b929c)}
.qs-clear:hover{color:var(--dsw-alias-label-secondary,#5b626c)}
.qs-end{margin-left:auto;height:26px;padding:0 10px;border-radius:7px!important;border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 30%,transparent)!important;background:var(--dsw-alias-state-warn-tertiary,#fff6e8)!important;color:var(--dsw-alias-state-warn-label,#a45c05)!important}
.qs-end:hover{filter:brightness(.98)}
.qs-resize{position:absolute;right:2px;bottom:2px;width:16px;height:16px;cursor:nwse-resize}
.qs-resize:after{content:"";position:absolute;right:4px;bottom:4px;width:7px;height:7px;border-right:1.5px solid var(--dsw-alias-border-l4,rgba(20,24,35,.2));border-bottom:1.5px solid var(--dsw-alias-border-l4,rgba(20,24,35,.2));border-radius:0 0 2px 0}
.qs-pill{position:fixed;right:18px;bottom:18px;z-index:900;display:flex;align-items:center;gap:8px;height:38px;padding:0 12px 0 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l3,rgba(20,24,35,.14));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#5b626c);box-shadow:0 10px 30px rgba(17,22,38,.16);font-size:12px;cursor:pointer}
.qs-pill:hover{border-color:var(--dsw-alias-brand-primary,#4d6bfe);color:var(--dsw-alias-label-primary,#1b1e23)}
.qs-pill .qs-mark{width:22px;height:22px;border-radius:7px;font-size:10px}
.qs-count{display:grid;place-items:center;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:var(--dsw-alias-brand-primary,#4d6bfe);color:var(--dsw-alias-label-primary-foreground,#fff);font-size:10px}
.qs-modal{position:fixed;inset:0;z-index:950;display:grid;place-items:center;background:rgba(17,22,38,.28)}
.qs-modal-card{width:380px;max-width:calc(100vw - 40px);padding:16px 16px 12px;border-radius:14px;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l3,rgba(20,24,35,.12));box-shadow:0 18px 50px rgba(17,22,38,.2);color:var(--dsw-alias-label-primary,#1b1e23)}
.qs-modal-ic{display:grid;place-items:center;width:32px;height:32px;margin-bottom:10px;border-radius:9px;background:var(--dsw-alias-state-warn-tertiary,#fff6e8);color:var(--dsw-alias-state-warn-label,#a45c05);border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 26%,transparent);font-size:15px}
.qs-modal-card h3{margin:0 0 5px;font-size:14px;font-weight:600}
.qs-modal-card p{margin:0;color:var(--dsw-alias-label-secondary,#5b626c);font-size:12px;line-height:1.7}
.qs-modal-facts{margin-top:10px;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2,rgba(20,24,35,.04));color:var(--dsw-alias-label-tertiary,#8b929c);font-size:11px}
.qs-modal-btns{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.qs-btn{height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l3,rgba(20,24,35,.14));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#5b626c);font-size:12px;cursor:pointer}
.qs-btn:hover{color:var(--dsw-alias-label-primary,#1b1e23)}
.qs-btn.primary{background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4d6bfe));border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}
.qs-btn.danger{background:var(--dsw-alias-state-warn-primary,#d97706);border-color:transparent;color:#fff}
.qs-toast{position:fixed;left:50%;bottom:22px;z-index:960;transform:translateX(-50%);display:flex;align-items:center;gap:8px;height:34px;padding:0 13px;border-radius:999px;background:var(--dsw-alias-toast-bg,rgba(20,24,32,.92));color:var(--dsw-alias-toast-label,#fff);font-size:12px;box-shadow:0 10px 30px rgba(17,22,38,.2)}
`

    /** Inject the panel stylesheet once. */
    function injectStyle() {
      if (typeof document === 'undefined') return
      if (document.querySelector(STYLE_SELECTOR) !== null) return
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-quote-sidecar'
      tag.dataset.pluginCss = STYLE_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    /* ------------------------------------------------------------------ */
    /* store                                                               */
    /* ------------------------------------------------------------------ */

    function initialState() {
      return {
        open: false,
        minimized: false,
        confirm: false,
        quote: '',
        source: '',
        sessionId: '',
        mode: 'snapshot',
        provider: '',
        model: '',
        reasoningEffort: '',
        messages: [],
        streaming: false,
        error: '',
        toast: '',
        contextChars: 0,
      }
    }

    let state = initialState()
    const listeners = new Set()

    function getSnapshot() {
      return state
    }

    function subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }

    function patch(next) {
      state = { ...state, ...next }
      for (const listener of listeners) listener()
    }

    let toastTimer
    function toast(text) {
      patch({ toast: text })
      clearTimeout(toastTimer)
      toastTimer = setTimeout(() => patch({ toast: '' }), 2400)
    }

    /** React 18 store hook with a reducer fallback for older headers. */
    const useStore = React.useSyncExternalStore
      ? () => React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
      : () => {
          const [, force] = React.useReducer((x) => x + 1, 0)
          React.useEffect(() => subscribe(force), [])
          return getSnapshot()
        }

    /* ------------------------------------------------------------------ */
    /* services + model selection                                          */
    /* ------------------------------------------------------------------ */

    let services = {}

    /** Read the session's current model route; empty fields mean "use default". */
    function modelOf(sessionId) {
      try {
        const binding = services.sessions?.binding?.(sessionId)
        const projection = binding?.session?.projections?.faceOf?.('modelSelection')
        const snapshot = projection?.getSnapshot?.()
        const selection = snapshot?.next ?? snapshot?.lastUsed
        if (!selection) return { provider: '', model: '', reasoningEffort: '' }
        return {
          provider: selection.provider ?? '',
          model: selection.model ?? '',
          reasoningEffort: selection.reasoningEffort ?? '',
        }
      } catch {
        return { provider: '', model: '', reasoningEffort: '' }
      }
    }

    /* ------------------------------------------------------------------ */
    /* opening                                                             */
    /* ------------------------------------------------------------------ */

    function openSidecar({ quote, source, sessionId }) {
      const model = modelOf(sessionId)
      const hadConversation = state.messages.length > 0
      patch({
        ...initialState(),
        open: true,
        quote,
        source: source || '',
        sessionId: sessionId || '',
        ...model,
      })
      if (hadConversation) toast('已换成新的引用，上一段临时对话已丢弃')
    }

    function resetSidecar() {
      abortActive()
      patch({ ...initialState() })
    }

    /** Element that contained the selection, kept for "locate in conversation". */
    let sourceElement = null

    /* ------------------------------------------------------------------ */
    /* transport                                                           */
    /* ------------------------------------------------------------------ */

    let active = null

    function abortActive() {
      if (active !== null) {
        active.abort()
        active = null
      }
    }

    /**
     * Stream one answer into the last message.
     * @param question - user question text.
     */
    async function ask(question) {
      if (state.streaming) return
      const messages = [
        ...state.messages,
        { role: 'user', text: question },
        { role: 'assistant', text: '', streaming: true, error: '' },
      ]
      const index = messages.length - 1
      patch({ messages, streaming: true, error: '' })

      const controller = new AbortController()
      active = controller

      let pending = ''
      let frame = 0
      const flush = () => {
        frame = 0
        if (pending === '') return
        const addition = pending
        pending = ''
        const next = state.messages.slice()
        const target = next[index]
        if (target === undefined) return
        next[index] = { ...target, text: target.text + addition }
        patch({ messages: next })
      }
      const queue = (text) => {
        pending += text
        if (frame === 0) frame = requestAnimationFrame(flush)
      }
      const settle = (error) => {
        if (frame !== 0) {
          cancelAnimationFrame(frame)
          flush()
        }
        const next = state.messages.slice()
        const target = next[index]
        if (target !== undefined) next[index] = { ...target, streaming: false, error: error || '' }
        patch({ messages: next, streaming: false, error: error || '' })
      }

      try {
        const response = await fetch(API, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-dsh-quote-sidecar': '1',
          },
          body: JSON.stringify({
            sessionId: state.sessionId,
            quote: state.quote,
            question,
            mode: state.mode,
            provider: state.provider,
            model: state.model,
            reasoningEffort: state.reasoningEffort,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || `请求失败（HTTP ${response.status}）`)
        }

        let failed = null
        await readEvents(response, (event, data) => {
          if (event === 'delta' && typeof data.text === 'string') queue(data.text)
          else if (event === 'error') failed = data.message || '模型调用失败'
          else if (event === 'meta' && data.contextChars !== undefined) {
            patch({ contextChars: data.contextChars })
          }
        })
        settle(failed)
      } catch (error) {
        if (error && error.name === 'AbortError') settle('')
        else settle(String((error && error.message) || error))
      } finally {
        if (active === controller) active = null
      }
    }

    /** Parse an SSE response body and hand each frame to the callback. */
    async function readEvents(response, onEvent) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let boundary = buffer.indexOf('\n\n')
        while (boundary >= 0) {
          parseFrame(buffer.slice(0, boundary), onEvent)
          buffer = buffer.slice(boundary + 2)
          boundary = buffer.indexOf('\n\n')
        }
      }
      if (buffer.trim() !== '') parseFrame(buffer, onEvent)
    }

    /** Parse one `event:`/`data:` frame. */
    function parseFrame(raw, onEvent) {
      let event = 'message'
      const data = []
      for (const line of raw.split(/\r?\n/)) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(5).trim())
      }
      if (data.length === 0) return
      try {
        onEvent(event, JSON.parse(data.join('\n')))
      } catch {
        /* ignore a torn frame */
      }
    }

    /* ------------------------------------------------------------------ */
    /* markdown (small, model-output only)                                 */
    /* ------------------------------------------------------------------ */

    /** Render inline code and bold inside one line. */
    function inline(text, keyBase) {
      const nodes = []
      const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g
      let last = 0
      let match
      let key = 0
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > last) nodes.push(text.slice(last, match.index))
        const token = match[0]
        if (token.startsWith('`')) nodes.push(h('code', { key: `${keyBase}-c${key++}` }, token.slice(1, -1)))
        else nodes.push(h('strong', { key: `${keyBase}-b${key++}` }, token.slice(2, -2)))
        last = pattern.lastIndex
      }
      if (last < text.length) nodes.push(text.slice(last))
      return nodes
    }

    /** Render a message body: fenced code, bullets, paragraphs. */
    function markdown(text) {
      const out = []
      const fence = /```([\w+-]*)\r?\n([\s\S]*?)```/g
      let last = 0
      let match
      let key = 0
      while ((match = fence.exec(text)) !== null) {
        if (match.index > last) out.push(...blocks(text.slice(last, match.index), key))
        key += 100
        out.push(
          h('pre', { key: `pre${key}` }, h('code', { className: match[1] ? `language-${match[1]}` : undefined }, match[2].replace(/\n$/, ''))),
        )
        last = fence.lastIndex
      }
      if (last < text.length) out.push(...blocks(text.slice(last), key))
      return out
    }

    /** Paragraphs and simple bullet lists. */
    function blocks(text, keyBase) {
      const out = []
      const chunks = text.split(/\n{2,}/)
      let key = 0
      for (const chunk of chunks) {
        const trimmed = chunk.replace(/^\n+|\n+$/g, '')
        if (trimmed === '') continue
        const lines = trimmed.split(/\r?\n/)
        if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
          out.push(
            h(
              'ul',
              { key: `${keyBase}-u${key++}` },
              lines.map((line, i) => h('li', { key: i }, inline(line.replace(/^\s*[-*]\s+/, ''), `${keyBase}-u${key}-${i}`))),
            ),
          )
        } else if (/^#{1,4}\s+/.test(trimmed)) {
          out.push(h('p', { key: `${keyBase}-h${key++}` }, h('strong', null, trimmed.replace(/^#{1,4}\s+/, ''))))
        } else {
          out.push(h('p', { key: `${keyBase}-p${key++}` }, inline(trimmed, `${keyBase}-p${key}`)))
        }
      }
      return out
    }

    /* ------------------------------------------------------------------ */
    /* selection surface                                                   */
    /* ------------------------------------------------------------------ */

    /**
     * The native selection surface renders exactly one interaction (the first
     * handler that calls `open()`), so a second registered interaction would
     * never appear next to "引用文本". Instead this plugin attaches its own
     * action to the surface element after it appears, and falls back to a
     * standalone pill when no surface is installed.
     */

    let pending = null
    let surfaceElement = null
    let surfaceObserver = null
    let fallbackButton = null
    let attachTimer = 0
    let attachAttempts = 0

    /** Session currently rendered in the main view. */
    function currentSessionId() {
      try {
        const rows = services.sessions?.list?.getSnapshot?.()?.byId ?? {}
        for (const [id, row] of Object.entries(rows)) {
          if ((row?.retainedBy?.mainView ?? 0) > 0) return id
        }
      } catch {
        /* fall through */
      }
      return ''
    }

    /** Remember what the current selection refers to. */
    function captureSelection() {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return null
      const text = selection.toString().trim()
      if (text === '') return null
      let rect = null
      let host = null
      try {
        const range = selection.getRangeAt(0)
        rect = range.getBoundingClientRect()
        const node = range.startContainer
        const element = node instanceof Element ? node : node.parentElement
        if (element?.closest('textarea, input, [contenteditable="true"], .qs-panel') != null) return null
        host = element?.closest('[data-chat-flow-kind]') ?? null
      } catch {
        return null
      }
      // Only chat text participates: composer, sidebar and panel selections stay untouched.
      if (host === null) return null
      sourceElement = host
      return {
        text: text.slice(0, 8000),
        source: (host.innerText || '').trim().slice(0, 6000),
        rect,
        sessionId: currentSessionId(),
      }
    }

    /** Attach the action to the native surface, or build the fallback pill. */
    function scheduleAttach() {
      clearTimeout(attachTimer)
      attachAttempts = 0
      attachTimer = setTimeout(attach, 24)
    }

    function attach() {
      const surface = document.querySelector('[data-text-interaction-surface]')
      const visible = surface !== null && surface.getAttribute('aria-hidden') !== 'true' && surface.offsetParent !== null

      if (visible) {
        removeFallback()
        if (surface !== surfaceElement) watchSurface(surface)
        ensureAction(surface)
        return
      }

      attachAttempts += 1
      if (attachAttempts < 14) {
        attachTimer = setTimeout(attach, 40)
        return
      }
      showFallback()
    }

    function watchSurface(surface) {
      surfaceObserver?.disconnect()
      surfaceElement = surface
      surfaceObserver = new MutationObserver(() => ensureAction(surface))
      surfaceObserver.observe(surface, { childList: true })
    }

    function ensureAction(surface) {
      if (surface.querySelector('.qs-action') !== null) return
      surface.appendChild(buildAction())
    }

    function buildAction() {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'qs-action'
      button.setAttribute('aria-label', '小窗追问')
      button.innerHTML = ACTION_ICON + '<span>小窗追问</span>'
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault()
        event.stopPropagation()
      })
      button.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        launch()
      })
      return button
    }

    /** Open the window from the captured selection. */
    function launch() {
      const info = pending
      if (info === null) return
      openSidecar({ quote: info.text, source: info.source, sessionId: info.sessionId })
      try {
        window.getSelection()?.removeAllRanges()
      } catch {
        /* selection already gone */
      }
      clearSelectionUi()
    }

    function showFallback() {
      if (fallbackButton !== null || pending === null) return
      const button = buildAction()
      button.classList.add('qs-floating')
      const rect = pending.rect
      if (rect !== null) {
        button.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 140))}px`
        button.style.top = `${Math.max(8, rect.top - 44)}px`
      } else {
        button.style.right = '24px'
        button.style.bottom = '80px'
      }
      document.body.appendChild(button)
      fallbackButton = button
    }

    function removeFallback() {
      fallbackButton?.remove()
      fallbackButton = null
    }

    /** Remove the injected action without touching the selection. */
    function clearSelectionUi() {
      clearTimeout(attachTimer)
      surfaceObserver?.disconnect()
      surfaceObserver = null
      surfaceElement?.querySelector('.qs-action')?.remove()
      surfaceElement = null
      removeFallback()
      pending = null
    }

    /** Start watching selections once. */
    function installSelection(cleanup) {
      const onGesture = () => {
        const next = captureSelection()
        if (next === null) {
          clearSelectionUi()
          return
        }
        pending = next
        scheduleAttach()
      }

      document.addEventListener('pointerup', onGesture, true)
      document.addEventListener('selectionchange', onGesture)
      window.addEventListener('scroll', clearSelectionUi, true)

      cleanup(() => {
        document.removeEventListener('pointerup', onGesture, true)
        document.removeEventListener('selectionchange', onGesture)
        window.removeEventListener('scroll', clearSelectionUi, true)
        clearSelectionUi()
      })
    }

    const ACTION_ICON =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 3 4 7v6c0 4 3.5 7 8 8 4.5-1 8-4 8-8V7l-8-4Z"/></svg>'

    /** The floating window itself. */
    function Panel() {
      const state = useStore()
      const [box, setBox] = React.useState(null)
      const [expanded, setExpanded] = React.useState(false)
      const [draft, setDraft] = React.useState('')
      const panelRef = React.useRef(null)
      const bodyRef = React.useRef(null)
      const inputRef = React.useRef(null)
      const dragRef = React.useRef(null)

      React.useEffect(() => {
        if (state.open && !state.minimized) {
          const timer = setTimeout(() => inputRef.current?.focus(), 30)
          return () => clearTimeout(timer)
        }
      }, [state.open, state.minimized])

      React.useEffect(() => {
        const body = bodyRef.current
        if (body) body.scrollTop = body.scrollHeight
      }, [state.messages, state.streaming])

      React.useEffect(() => {
        if (!state.open) {
          setBox(null)
          setDraft('')
          setExpanded(false)
        }
      }, [state.open])

      if (!state.open && !state.minimized) {
        return state.toast ? ReactDOM.createPortal(toastNode(state.toast), document.body) : null
      }
      if (!state.open && state.minimized) {
        return ReactDOM.createPortal(
          h(
            React.Fragment,
            null,
            h(
              'button',
              {
                type: 'button',
                className: 'qs-pill',
                onClick: () => patch({ open: true, minimized: false }),
                title: '引用追问',
              },
              h('span', { className: 'qs-mark' }, '引'),
              '引用追问',
              h('span', { className: 'qs-count' }, String(countQuestions(state))),
            ),
            state.toast ? toastNode(state.toast) : null,
          ),
          document.body,
        )
      }

      const startDrag = (event) => {
        if (event.target.closest('button')) return
        const rect = panelRef.current.getBoundingClientRect()
        dragRef.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }
        event.currentTarget.setPointerCapture(event.pointerId)
      }
      const moveDrag = (event) => {
        const drag = dragRef.current
        if (!drag) return
        const rect = panelRef.current.getBoundingClientRect()
        const left = clamp(drag.left + event.clientX - drag.x, 8, window.innerWidth - Math.min(rect.width, 200) - 8)
        const top = clamp(drag.top + event.clientY - drag.y, 8, window.innerHeight - 80)
        setBox({ left, top, width: rect.width, height: rect.height })
      }
      const endDrag = () => {
        dragRef.current = null
      }

      const startResize = (event) => {
        const rect = panelRef.current.getBoundingClientRect()
        dragRef.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height, resize: true }
        event.currentTarget.setPointerCapture(event.pointerId)
        event.preventDefault()
        event.stopPropagation()
      }
      const moveResize = (event) => {
        const drag = dragRef.current
        if (!drag || !drag.resize) return
        const width = clamp(drag.width + event.clientX - drag.x, 360, window.innerWidth - drag.left - 8)
        const height = clamp(drag.height + event.clientY - drag.y, 380, window.innerHeight - drag.top - 8)
        setBox({ left: drag.left, top: drag.top, width, height })
      }

      const style = box === null ? undefined : { left: `${box.left}px`, top: `${box.top}px`, right: 'auto', bottom: 'auto', width: `${box.width}px`, height: `${box.height}px` }
      const questions = countQuestions(state)

      return ReactDOM.createPortal(
        h(
          React.Fragment,
          null,
          h(
            'section',
            {
              className: 'qs-panel',
              style,
              ref: panelRef,
              role: 'dialog',
              'aria-label': state.title,
              onKeyDown: (event) => {
                if (event.key === 'Escape' && !state.confirm) event.stopPropagation()
              },
            },
            h(
              'header',
              { className: 'qs-head', onPointerDown: startDrag, onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: endDrag },
              h('span', { className: 'qs-mark' }, '引'),
              h('div', { className: 'qs-title' }, h('b', null, '引用追问'), h('span', { className: 'qs-badge' }, h('i', null), '临时')),
              h(
                'div',
                { className: 'qs-head-actions' },
                h('button', { type: 'button', className: 'qs-icon', title: '收起', onClick: () => patch({ minimized: true, open: false }) }, '—'),
                h('button', { type: 'button', className: 'qs-icon', title: '关闭', onClick: () => patch({ confirm: true }) }, '×'),
              ),
            ),
            h(
              'div',
              { className: expanded ? 'qs-quote open' : 'qs-quote' },
              h(
                'div',
                { className: 'qs-quote-src' },
                '来自主会话',
                h('button', { type: 'button', onClick: locateSource, title: '定位原文' }, '定位 ↗'),
              ),
              h('p', { className: 'qs-quote-text' }, state.quote),
              h(
                'button',
                { type: 'button', className: 'qs-quote-toggle', onClick: () => setExpanded((value) => !value) },
                expanded ? '收起' : '展开',
              ),
            ),
            h(
              'div',
              { className: 'qs-context' },
              h('span', null, '上下文'),
              h(
                'div',
                { className: 'qs-seg' },
                h(
                  'button',
                  { type: 'button', className: state.mode === 'snapshot' ? 'on' : '', onClick: () => patch({ mode: 'snapshot' }) },
                  '主会话快照',
                ),
                h(
                  'button',
                  { type: 'button', className: state.mode === 'quote' ? 'on' : '', onClick: () => patch({ mode: 'quote' }) },
                  '仅这段引用',
                ),
              ),
              h('span', { className: 'qs-context-note', title: routeLabel(state) }, routeLabel(state)),
            ),
            h(
              'div',
              { className: 'qs-body', ref: bodyRef },
              state.messages.length === 0 ? emptyState() : state.messages.map((message, index) => messageNode(message, index, state)),
            ),
            h(
              'div',
              { className: 'qs-compose' },
              h(
                'div',
                { className: 'qs-inbox' },
                h('textarea', {
                  ref: inputRef,
                  rows: 1,
                  value: draft,
                  placeholder: '就这段继续问…',
                  onChange: (event) => setDraft(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      send()
                    }
                  },
                }),
                h(
                  'div',
                  { className: 'qs-compose-row' },
                  h('span', null, state.streaming ? '正在回答…' : 'Enter 发送'),
                  state.streaming
                    ? h('button', { type: 'button', className: 'qs-stop', onClick: abortActive }, '停止')
                    : h('button', { type: 'button', className: 'qs-send', disabled: draft.trim() === '', onClick: send }, '发送'),
                ),
              ),
              h('div', { className: 'qs-hint' }, '仅存在于这个小窗 · 关闭后立即清理'),
            ),
            h(
              'div',
              { className: 'qs-foot' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'qs-clear',
                  onClick: () => {
                    abortActive()
                    patch({ messages: [] })
                    toast('小窗内容已清空')
                  },
                },
                '清空',
              ),
              h('span', null, '对话不会写入任何会话'),
              h('button', { type: 'button', className: 'qs-end', onClick: () => patch({ confirm: true }) }, '结束并清理'),
            ),
            h('div', {
              className: 'qs-resize',
              onPointerDown: startResize,
              onPointerMove: moveResize,
              onPointerUp: endDrag,
              onPointerCancel: endDrag,
            }),
          ),
          state.confirm ? confirmNode(questions) : null,
          state.toast ? toastNode(state.toast) : null,
        ),
        document.body,
      )

      function send() {
        const text = draft.trim()
        if (text === '' || state.streaming) return
        setDraft('')
        ask(text)
      }
    }

    /** Suggestions shown before the first question. */
    function emptyState() {
      return h(
        'div',
        { className: 'qs-empty' },
        h(
          'span',
          { className: 'qs-orb' },
          h(
            'svg',
            { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' },
            h('path', { d: 'M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z' }),
          ),
        ),
        h('h4', null, '就这段内容问点什么'),
        h('p', null, '主会话不会收到消息，也不会多出会话记录。关闭小窗即丢弃。'),
        h(
          'div',
          { className: 'qs-sugs' },
          ['为什么不直接加锁？', '举个例子', '有反例吗'].map((label) => h('button', { key: label, type: 'button', className: 'qs-sug', onClick: () => ask(label) }, label)),
        ),
      )
    }

    /** One conversation message. */
    function messageNode(message, index, state) {
      if (message.role === 'user') {
        return h(
          'div',
          { className: 'qs-msg me', key: index },
          h('div', { className: 'qs-who' }, '你'),
          h('div', { className: 'qs-bubble' }, message.text),
        )
      }
      const last = index === state.messages.length - 1
      return h(
        'div',
        { className: 'qs-msg ai', key: index },
        h('div', { className: 'qs-who' }, '引用追问'),
        h(
          'div',
          { className: 'qs-bubble' },
          message.streaming ? h('span', null, message.text, h('span', { className: 'qs-caret' })) : markdown(message.text),
        ),
        message.error ? h('div', { className: 'qs-error' }, message.error, last ? h('button', { type: 'button', onClick: () => retry(index) }, '重试') : null) : null,
        !message.streaming && !message.error && message.text !== ''
          ? h(
              'div',
              { className: 'qs-msg-foot' },
              h('button', { type: 'button', onClick: () => retry(index) }, '重新生成'),
              h('span', null, '·'),
              h('span', null, '关闭即丢弃'),
            )
          : null,
      )
    }

    /** Retry the question that produced one assistant message. */
    function retry(index) {
      const messages = state.messages.slice(0, index)
      while (messages.length > 0 && messages[messages.length - 1].role !== 'user') messages.pop()
      const question = messages.length > 0 ? messages[messages.length - 1].text : ''
      if (question === '') return
      const trimmed = messages.slice(0, -1)
      patch({ messages: trimmed })
      ask(question)
    }

    /** Count user questions for the minimized badge. */
    function countQuestions(state) {
      return state.messages.filter((message) => message.role === 'user').length
    }

    /** Show the current route (or the context budget) in the context row. */
    function routeLabel(state) {
      if (state.provider !== '' && state.model !== '') return `${state.provider}/${state.model}`
      if (state.mode === 'snapshot') {
        return state.contextChars > 0 ? `只读 · ${state.contextChars} 字` : '只读 · 自动附加'
      }
      return '仅引用'
    }

    /** Ask the main conversation to reveal the quoted passage. */
    function locateSource() {
      try {
        if (sourceElement && sourceElement.isConnected) {
          sourceElement.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
      } catch {
        /* the conversation changed under us */
      }
      toast('已定位到主会话里的原文')
    }

    /** Cleanup confirmation. */
    function confirmNode(questions) {
      return h(
        'div',
        { className: 'qs-modal', onClick: (event) => { if (event.target === event.currentTarget) patch({ confirm: false }) } },
        h(
          'div',
          { className: 'qs-modal-card', role: 'alertdialog', 'aria-label': '结束这条临时对话？' },
          h('div', { className: 'qs-modal-ic' }, '🗑'),
          h('h3', null, '结束这条临时对话？'),
          h('p', null, '小窗里的问答只存在于内存里，关闭后会立即丢弃。主会话不会收到消息，也不会在会话列表里留下记录。'),
          h('div', { className: 'qs-modal-facts' }, `引用 1 段 · 问答 ${questions} 轮 · 未写入磁盘`),
          h(
            'div',
            { className: 'qs-modal-btns' },
            h('button', { type: 'button', className: 'qs-btn', onClick: () => patch({ confirm: false }) }, '继续问'),
            h(
              'button',
              {
                type: 'button',
                className: 'qs-btn danger',
                onClick: () => {
                  resetSidecar()
                  toast('临时对话已清理，没有留下任何会话记录')
                },
              },
              '清理并关闭',
            ),
          ),
        ),
      )
    }

    /** Bottom toast. */
    function toastNode(text) {
      return h('div', { className: 'qs-toast', role: 'status' }, text)
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max)
    }

    /* ------------------------------------------------------------------ */
    /* plugin body                                                         */
    /* ------------------------------------------------------------------ */

    const name = 'quote-sidecar'
    const inject = ['slots', 'locale', 'sessions']

    /**
     * Register the floating window, the dictionary, and the selection action.
     * @param ctx - Client root context.
     */
    function apply(ctx) {
      services = ctx
      injectStyle()

      ctx.effect(
        () => ctx.locale.register(NS, { zh, en }),
        'quote-sidecar: dictionaries',
      )

      ctx.effect(
        () =>
          ctx.slots.inject('shell.overlay', () =>
            ctx.slots.register(
              {
                name: 'shell.overlay',
                id: 'quote-sidecar',
                locale: NS,
              },
              Panel,
            ),
          ),
        'quote-sidecar: floating window',
      )

      ctx.effect(
        () => {
          const disposers = []
          installSelection((dispose) => disposers.push(dispose))
          return () => {
            for (const dispose of disposers) dispose()
          }
        },
        'quote-sidecar: selection action',
      )
    }

    exports.apply = apply
    exports.inject = inject
    exports.name = name
    return exports
  },
})
