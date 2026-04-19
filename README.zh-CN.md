# Privacy Filter

[English](README.md) | [简体中文](README.zh-CN.md)

Privacy Filter 是一个本地优先的桌面应用，用于在保留文本可读性的前提下过滤敏感信息。它适合提示词脱敏、日志分享、Issue 报告整理和文档清洗，并且整个过滤流程都在本地完成。

## 为什么做这个项目

在线大模型很好用，但用户发给它们的内容里常常会混入隐私信息或内部信息，比如姓名、联系方式、凭据、日志和工单上下文。Privacy Filter 想解决的就是这个问题: 在文本离开本机之前，先增加一层本地脱敏。

项目当前把这件事拆成三步：

- 用规则处理高确定性的结构化敏感字段
- 用本地 LLM 识别更依赖上下文的隐私信息
- 在复制或分享前先审阅替换结果

## 过滤模式

当前提供两种过滤模式。

### 1. 规则模式

适用场景：结构清晰、确定性高的内容，例如：

- 邮箱地址
- 手机号
- 数据库连接串
- API key 和明显的凭据

特点：

- 不需要 Ollama
- 不需要本地模型
- 纯 CPU 即可
- 适合快速脱敏和兜底场景

在当前界面里，这一块显示为 `规则快速预览`。

### 2. 深度过滤模式

适用场景：需要结合上下文语义识别的内容，例如：

- 自然语言中的姓名
- 地址
- 组织名称
- 工作账号标识
- 混合代码、配置和自然语言的复杂文本

特点：

- 需要本地 LLM 运行时
- 当前默认推荐 `ollama + qwen3.5:4b`
- 返回可审阅的命中项，而不是直接改写整段文本
- 有独立 GPU 时体验更好

## 项目亮点

- 全程本地处理
- 基于规则的快速过滤，适合高确定性字段
- 基于本地 LLM 的深度过滤
- Provider 化的本地运行时配置，便于后续扩展不同模型和 provider
- 支持逐条审阅和应用命中项
- 使用 Tauri + React + Rust 构建桌面应用
- 内置本地模型 benchmark 资产，便于模型选型

## 默认本地 LLM 配置

基于当前 `60` 条 starter corpus，参考 benchmark 快照如下：

| 方案 | Recall | Precision | F1 | Negative FP Rate | Avg Latency |
| --- | --- | --- | --- | --- | --- |
| `regex + qwen3.5:4b` | `72.73%` | `72.73%` | `72.73%` | `18.18%` | `1208.10 ms` |
| `regex + gemma4:e4b` | `67.13%` | `69.06%` | `68.09%` | `54.55%` | `1556.00 ms` |
| `pure + qwen3.5:2b + priors-v2` | `57.34%` | `78.85%` | `66.40%` | `0.00%` | `715.90 ms` |
| `pure + qwen3.5:4b + priors-v4 + post-processing` | `93.84%` | `99.28%` | `96.48%` | `0.00%` | `1483.13 ms` |

应用默认值：

- provider：`ollama`
- 模型：`qwen3.5:4b`
- 深度过滤实现：`pure + qwen3.5:4b + priors-v4 + post-processing`
- 如果想先用低成本方案，可以优先试 `qwen3.5:2b`

如果需要修改 provider 或模型：

1. 打开 `规则设置`
2. 切到 `本地 LLM` 选项卡
3. 修改 `provider`、`base_url` 或 `model`
4. 如果切换到新的 Ollama 模型，先执行 `ollama pull <model>`
5. 回到主界面重新运行一次深度过滤

当前默认策略使用的 prompt 契约和后处理逻辑内置在应用中。日常使用通常只需要修改 provider、地址或模型，不需要手动切换 prompt 版本。

参考资料：

- [本地 LLM 评估](docs/local-llm-evaluation.md)
- [Benchmark README](benchmarks/local-llm-filter/README.md)
- [文档索引](docs/README.md)
- [Roadmap](ROADMAP.md)

## 安装与开发

### 最终用户

如果已经有打包好的 Release，最省事的方式就是直接下载桌面版本来用。

### 开发者

#### 通用依赖

- Node.js 18+
- Rust toolchain
- 当前平台对应的 Tauri 构建依赖

如果在 WSL 或 Linux 图形环境下开发，还需要安装 GTK / WebKit 等常见 Tauri GUI 依赖。

#### 通用安装步骤

```bash
npm install
```

#### 只使用规则模式

这条路径只使用内置规则，不需要本地 LLM 运行时。

```bash
npm run dev:tauri
```

#### 使用深度过滤模式

这条路径需要本地 LLM 运行时。当前默认组合是 `ollama + qwen3.5:4b`。

1. 安装 Ollama
2. 拉取推荐模型并启动本地运行时：

```bash
ollama pull qwen3.5:4b
ollama serve
```

3. 启动应用：

```bash
npm run dev:tauri
```

4. 在应用里打开 `规则设置` -> `本地 LLM`，然后确认：

- `provider = ollama`
- `model = qwen3.5:4b`
- `base_url = http://127.0.0.1:11434`

#### 通用命令

启动 Web 前端：

```bash
npm run dev
```

启动桌面应用：

```bash
npm run dev:tauri
```

构建应用：

```bash
npm run build
npm run build:tauri
```

运行测试：

```bash
npm run test:deep-filter
```

```bash
cargo test --lib --manifest-path src-tauri/Cargo.toml
```

运行本地 LLM benchmark：

```bash
npm run bench:local-llm-filter
```

## 深度过滤运行说明

### 硬件建议

这些建议基于当前默认模型、仓库里的 benchmark 结果，以及 Ollama 公布的模型体积。它们是本项目的使用建议，不是模型方或运行时官方给出的最低要求。

- 当前 benchmark 默认模型 `qwen3.5:4b`
- Ollama 公布的模型体积
- Ollama 关于 GPU / CPU 混合装载的说明

如果你只用规则模式：

- 推荐：任意现代 CPU
- 推荐内存：`8 GB RAM` 或更高
- GPU：不需要

如果你打算用 `qwen3.5:4b` 跑深度过滤：

- 推荐：优先使用独立 GPU
- 推荐显存：`8 GB VRAM` 或更高
- 推荐内存：`16 GB RAM` 或更高
- 可工作的 fallback：纯 CPU + `16 GB RAM`，但响应速度通常会明显更慢

如果你只能先用更轻的 `qwen3.5:2b` fallback：

- 推荐显存：`4 GB 到 6 GB VRAM`
- 推荐内存：`8 GB 到 16 GB RAM`
- 仅在 `4b` 太慢或本地机器装不下时作为退路

存储空间方面：

- Ollama Windows 文档说明安装本体之外，还需要额外空间存储模型，整体可能从几十 GB 到几百 GB 不等，具体取决于你拉了多少模型
- 当前 Ollama 上的 `qwen3.5:4b` 标签体积大约是 `3.4 GB`

一句话总结：

- 有 GPU 时优先用 GPU
- 默认优先推荐 `qwen3.5:4b`
- `qwen3.5:2b` 只作为低配机器的 fallback

### Windows 与 WSL 说明

`127.0.0.1` 只有在“应用”和“Ollama”运行在同一个环境里时才可靠。

常见情况：

- Windows 桌面应用 + Windows 上的 Ollama：`http://127.0.0.1:11434` 通常没问题
- WSL 里的应用 + WSL 里的 Ollama：`http://127.0.0.1:11434` 通常没问题
- WSL 里的应用 + Windows 上的 Ollama：`127.0.0.1` 可能会失败，因为 WSL 的 localhost 不是 Windows 主机的 localhost

如果 deep filter 出现类似下面的错误：

```text
error sending request for url (http://127.0.0.1:11434/api/tags)
```

请按顺序检查：

1. Ollama 是否真的在运行
2. `ollama pull qwen3.5:4b` 是否已经成功完成
3. 当前应用是跑在 Windows 还是 WSL
4. `base_url` 是否指向了和 Ollama 相同的运行环境

## 项目结构

```text
privacy-filter/
|- benchmarks/   # 本地 LLM benchmark 资产与报告
|- docs/         # 用户文档、评估说明和计划文档
|- scripts/      # 辅助脚本
|- src/          # React UI
|- src-tauri/    # Tauri + Rust 后端
|- package.json
`- vite.config.js
```

## 故障排查

### PowerShell 拦截 `npm`

如果 Windows PowerShell 提示 `npm.ps1` 因执行策略被阻止，请设置当前用户执行策略，然后重新打开一个新的 PowerShell 会话：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### WSL 下桌面应用无法启动

如果 `npm run dev:tauri` 能启动前端，但桌面应用本身起不来，请确认你的 GUI 环境、显示转发以及 Tauri 依赖已经完整安装。

### Deep filter 无法连接 Ollama

如果规则预览正常，但 deep filter 失败，最常见的原因是应用当前访问不到 Ollama API。

快速排查：

- 在和应用相同的运行环境里打开 `http://127.0.0.1:11434/api/tags`
- 确认设置里的 `base_url` 指向同一个环境
- 确认 `ollama serve` 仍在运行
- 确认目标模型能在 `ollama list` 里看到

## 语言支持

当前内置规则和 starter benchmark corpus 主要偏中文场景。如果你需要支持更多地区或语言，可以：

- 在 UI 里添加自定义规则
- 扩展 `src/components/TextFilter/privacyRules.js`
- 为目标语言或目标领域补充 benchmark 样本

## 贡献指南

欢迎贡献。开始前建议先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，里面包含开发、测试和 PR 提交流程。

## 安全说明

如果问题涉及漏洞利用细节、真实密钥或隐私数据，请不要直接公开发 Issue。请先阅读 [SECURITY.md](SECURITY.md)。

## 更新记录

项目历史记录见 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

本项目基于 [MIT License](LICENSE) 发布。
