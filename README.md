# 微信小游戏开发模板

一个使用原生 JavaScript 和 Canvas 的微信小游戏起步模板，同时支持浏览器预览。保留接星星玩法作为可运行示例，提供构建、测试、打包和微信工具调用脚本。默认构建与测试无需第三方依赖。

## 开始使用

需要 Git 和 Node.js 18 或更高版本。克隆仓库，或使用 GitHub 的 Use this template 创建自己的仓库：

```sh
git clone https://github.com/wavachao/wechat-minigame-starter.git my-new-game
cd my-new-game
npm run init -- --name my-new-game --title "我的|小游戏" --version 0.1.0 --description "我的小游戏介绍"
npm run test
npm run check
npm run preview
```

打开 http://127.0.0.1:4173。保留两行游戏标题，每行最多五个字符；其他布局可直接修改 src/renderer.js。

通过克隆开始时，origin 指向本模板仓库。开发自己的项目前，将远程地址改为自己的仓库，或直接使用 GitHub 的 Use this template。

## 项目身份与微信配置

项目名称、版本和上传说明保存在 package.json；微信账号配置在 project.config.json；标题和本地存档前缀在 src/project-settings.js。init 命令同步更新这三处。

默认 AppID 为 touristappid。准备微信预览或发布时，设置自己真实的小游戏 AppID：

```sh
npm run init -- --appid YOUR_WECHAT_APPID
```

YOUR_WECHAT_APPID 是占位符，执行前需替换成真实值。也可通过 WECHAT_APPID 环境变量覆盖构建 AppID。

安装微信开发者工具，并将 WECHAT_DEVTOOLS 环境变量设置为其安装目录。例如 Windows PowerShell：

```powershell
$env:WECHAT_DEVTOOLS = 'C:\Tools\wechat-devtools'
npm run wechat -- open
```

路径只是示例，请替换为自己的安装目录。微信命令行调用需要登录、有对应项目权限，并在工具中开启服务端口。登录会话不在模板中；脚本也兼容项目内 .tools/wechat-devtools 安装方式。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| npm run init -- --name my-game | 设置项目身份 |
| npm run build | 生成 dist/wechat 和浏览器资源 |
| npm run test | 运行 Node 自带自动化测试 |
| npm run check | 检查语法、配置和构建包 |
| npm run preview | 构建并启动本地预览 |
| npm run package | 按项目名称和版本生成 ZIP |
| npm run wechat -- status | 检查微信工具登录状态 |
| npm run wechat -- open | 打开构建后的微信项目 |
| npm run wechat -- preview | 生成微信预览二维码 |
| npm run wechat -- upload | 上传开发版本 |

upload 使用 package.json 中的版本和说明，支持 WECHAT_UPLOAD_DESC 覆盖说明。默认 touristappid 不用于正式上传；上传后仍需在平台完成审核与发布。

## 可选浏览器验收

需要实际浏览器测试时，在自己的项目中安装开发依赖：

```sh
npm install --save-dev --save-exact playwright
npx playwright install chromium
```

先启动 npm run preview，再在另一个终端运行 npm run test:browser。提交生成的 package-lock.json 以固定依赖版本。也支持 PLAYWRIGHT_MODULE / CHROME_PATH 指定已有工具环境。

## 修改示例

- src/core.js：玩法、碰撞和计分。
- src/renderer.js：画面与按钮。
- src/platform.js：微信与浏览器输入、存储和音频适配。
- assets：示例图标、分享图和音效，按新游戏需要替换。
- tests：示例玩法、平台、画面和构建测试，随玩法调整。

tools/create-media.js 可以生成原示例素材，运行会覆盖对应文件。构建器支持本模板使用的相对 CommonJS 模块，添加第三方运行依赖时需要扩展打包方式。

## 公开内容与本地文件

仓库包含源码、示例素材、测试和文档。示例 AppID wx0123456789abcdef 只用于测试，并非项目账号。默认配置不包含真实 AppID、账号登录信息、后台截图或用户资料。

.tools、node_modules、artifacts、dist、日志、微信私有配置和本地 .env 文件均由 .gitignore 排除。提交自己的修改前，检查新增文件是否包含真实凭据或个人资料。package.json 的 private 字段仅阻止意外发布到 npm，不影响 GitHub 仓库公开可见。

实机与发布准备见 [发布说明](docs/RELEASE.md)。
