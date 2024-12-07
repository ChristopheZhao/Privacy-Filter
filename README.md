# Privacy Filter (隐私信息过滤器)

一个用于过滤文本中敏感信息的桌面应用程序。支持自定义规则，可以过滤身份证号、手机号、地址等个人隐私信息，以及API密钥、数据库连接信息等系统敏感信息。

## 功能特点

- 内置多种隐私信息过滤规则
  - 身份信息 (身份证号、手机号等)
  - 社交账号 (微信、QQ等)
  - 银行卡信息
  - API密钥
  - 数据库连接信息
  - IP地址
  - 合同信息
- 支持自定义过滤规则
- 所有处理均在本地完成，不会上传任何数据
- 简单易用的图形界面
- 支持规则的导入导出

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