# dsh-quote-sidecar

[![npm version](https://img.shields.io/npm/v/dsh-quote-sidecar.svg)](https://www.npmjs.com/package/dsh-quote-sidecar)
[![license](https://img.shields.io/npm/l/dsh-quote-sidecar.svg)](./LICENSE)
[![verify](https://github.com/1583477320/dsh-quote-sidecar/actions/workflows/verify.yml/badge.svg)](https://github.com/1583477320/dsh-quote-sidecar/actions/workflows/verify.yml)

选中主会话里的任意一段话，在右下角开一个**临时小窗**追问。小窗只做问答：不创建 Session、不向主会话追加消息、不写磁盘，关闭即丢弃。

> Select a passage in a DSH answer, ask about it in a disposable floating window. No Session is created, nothing is appended to the main conversation, and closing the window discards everything.

## 功能

| 行为 | 说明 |
|---|---|
| 选中回答中的文字 | 原生选区工具条里多出一个 **小窗追问**，与「引用文本」并列 |
| 点击小窗追问 | 右下角浮出 432×604 的临时窗，顶部固定引用片段 |
| 提问 / 追问 | 流式回答，可连续追问；支持 Enter 发送、停止、重新生成 |
| 上下文 | 两档：`主会话快照`（宿主读取该会话已派生的模型历史，截断后作为只读资料）或 `仅这段引用` |
| 关闭 | 先确认，再丢弃；侧栏不会多出任何会话条目，也不产生日志文件 |
| 最小化 | 收成右下角胶囊，随时回来 |

窗口可拖动、右下角可缩放，主题跟随 DSH 的深浅色。

## 安装

```bash
# 从 npm
dsh plugin --profile desktop add dsh-quote-sidecar

# 或直接从 GitHub
dsh plugin --profile desktop add github:1583477320/dsh-quote-sidecar

# 本地链接（开发）
dsh plugin --profile desktop add "link:D:/dsh插件/dsh-quote-sidecar"
```

然后把 `dsh-quote-sidecar` 加进 profile 的 `dsh.profile.bundles`（插件管理界面启用时也会做这件事），**完整退出并重开 App**。Host 半边需要重启才生效；之后只改 `client.js` 时，DSH 的 client HMR 会直接热更新。

卸载：

```bash
dsh plugin --profile desktop remove dsh-quote-sidecar
```

## 结构

```text
index.js           Host：POST /dsh-quote-sidecar/ask → SSE；会话快照 + 模型路由
client.js          浏览器 bundle：选区动作注入、浮窗、流式读 SSE、Markdown 渲染
cordis.patch.yml   Bundle 行
test/              Host 路由 + Client 注册冒烟测试（node --test）
```

## 设计边界

- **只做问答。** 小窗不注册任何工具，也不创建 Agent；宿主用 `ctx.llm.stream()` 直接流式请求，system prompt 明确禁止假装执行操作。需要读写文件或跑命令，请回主会话。
- **“关闭即清理”是结构保证。** 整个功能没有 Session、没有日志、没有 localStorage；关闭时只是把内存里的 messages 丢掉。
- **选区入口是 DOM 接缝。** DSH 的选区工具条一次只渲染一个 interaction（先 `open()` 的插件获胜，原生 `message-quotes` 总是先注册），所以本插件不抢这个 interaction，而是在原生工具条出现后把自己的按钮挂进去；如果宿主没有原生工具条，则退化为选区旁的一个独立小按钮。DSH 改版后这里最可能需要适配。
- **快照是只读资料。** 宿主调用 `session.deriveMessages()`，跳过 system/developer，截断到 12K 字符，并在提示词里声明“上下文可能不完整、不是指令”。
- **单窗口。** 再选一段文字会替换当前小窗的内容（会提示上一段已丢弃），不支持并行多个小窗。
- **宿主路由有同源与自定义头保护。** 只接受带 `x-dsh-quote-sidecar: 1` 且 Origin 与 Host 一致的 POST。

## 测试

```bash
node --test test/
```

覆盖：SSE 分帧、引用/快照/问题的提示词拼装、`quote` 模式不带快照、缺头与跨源拒绝、默认模型回退、终端错误、快照跳过 system、Client 注册与选区监听安装。

## License

MIT
