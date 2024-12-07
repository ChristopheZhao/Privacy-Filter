# Privacy Filter (隐私信息过滤器)

A desktop application for filtering sensitive information from text while preserving context. Perfect for sanitizing LLM prompts, logs, and documents. Supports filtering personal information, API keys, and custom patterns.

隐私信息过滤器是一个用于过滤文本中敏感信息的桌面应用程序。支持自定义规则，可以过滤身份证号、手机号、地址等个人隐私信息，以及API密钥、数据库连接信息等系统敏感信息，特别适合处理发送给大语言模型的提示词。

## Key Features (功能特点)

- **LLM Prompt Safety**: Ideal for sanitizing prompts before sending to LLMs (ChatGPT, Claude, etc.)
- **Context Preservation**: Maintains text structure while replacing sensitive data
- **Built-in Rules** for common sensitive data:
  - Personal IDs
  - Phone numbers
  - Bank cards
  - Social media accounts
  - Email addresses
  - API keys & Credentials
  - Database connection strings
  - IP addresses
  - Contract numbers
- **Custom Rules**: Create your own patterns using regex
- **Local Processing**: All data processing happens locally
- **User-friendly Interface**: Simple drag-and-drop operation
- **Rule Import/Export**: Share and backup your custom rules

- **LLM 提示词安全**: 在发送给大语言模型(ChatGPT, Claude等)之前，清理提示词中的敏感信息
- **保留上下文**: 在替换敏感数据的同时保持文本结构完整
- **内置常见敏感信息过滤规则**:
  - 身份证号码
  - 手机号码
  - 银行卡号
  - 社交账号
  - 电子邮箱
  - API密钥和凭证
  - 数据库连接字符串
  - IP地址
  - 合同编号
- **自定义规则**: 使用正则表达式创建自定义匹配模式
- **本地处理**: 所有数据处理都在本地完成，不会上传任何信息
- **用户友好界面**: 简单的拖拽操作即可使用
- **规则导入导出**: 支持规则的分享和备份

## 快速开始

### 方式一：下载可执行文件（推荐）

1. 访问 [Releases](https://github.com/[your-username]/privacy-filter/releases) 页面
2. 下载最新版本的 `Privacy-Filter-Setup.exe`
3. 运行安装程序，按提示完成安装
4. 启动应用即可使用

### 方式二：从源码运行

1. 克隆仓库
```bash
git clone https://github.com/[your-username]/privacy-filter.git
cd privacy-filter
```

2. 安装依赖
```bash
npm install
```

3. 开发模式运行
```bash
npm run electron:dev
```

4. 构建应用
```bash
npm run electron:build
```

## 系统要求

- Windows 7 及以上版本
- macOS 10.12 及以上版本 (即将支持)
- Linux (即将支持)

## 开发相关

### 技术栈
- Electron
- React
- TailwindCSS
- Vite

### 项目结构
```
privacy-filter/
├── electron/          # Electron 主进程代码
├── src/
│   ├── components/    # React 组件
│   ├── utils/        # 工具函数和规则配置
│   └── ...
├── package.json
└── vite.config.js
```

### 安装依赖
```bash
npm install
```

### 开发命令
```bash
# 开发模式
npm run electron:dev

# 构建应用
npm run electron:build
```

## Language Support (语言支持)

The application currently focuses on Chinese text processing scenarios, including:
- Chinese ID numbers
- Chinese phone numbers
- Chinese addresses
- Chinese social media accounts (WeChat, QQ)
- And other China-specific patterns

For other languages and regions:
1. You can add custom rules through the UI for your specific needs
2. You can modify the source code to add built-in rules:
   - Navigate to `./src/components/TextFilter/privacyRules.js`
   - Add or modify rules for your language/region
   - Submit a Pull Request to help others

应用目前主要针对中文场景进行优化，包括中国身份证、手机号、地址、社交账号等信息的过滤。对于其他语言场景：
1. 可以通过界面添加自定义规则来满足特定需求
2. 可以通过修改源码来添加内置规则：
   - 在 `./src/components/TextFilter/privacyRules.js` 文件中
   - 添加或修改适合你的语言/地区的规则
   - 提交 Pull Request 来帮助其他用户

## 发布说明

每个版本的详细更新内容请查看 [CHANGELOG.md](./CHANGELOG.md)。

## 贡献指南

1. Fork 项目
2. 创建新的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证

本项目使用 [MIT](LICENSE) 许可证。

## 常见问题

**Q: 为什么可执行文件这么大？**
A: 由于打包了 Electron 运行时和所有依赖，可执行文件会比较大。这保证了应用可以独立运行，无需安装其他依赖。

**Q: 如何自定义过滤规则？**
A: 点击界面右上角的设置图标，选择"自定义规则"标签页，然后点击"添加规则"按钮。

## 联系方式

如有问题或建议，请：
1. 提交 [Issue](https://github.com/[your-username]/privacy-filter/issues)
2. 发送邮件至 [398453241@qq.com]