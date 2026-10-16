# 发布到 GitHub 与 npm

包目录已经是一个干净的 git 仓库（`main` 分支，首次提交 `9452f26`，12 个文件）。
下面每一步都需要你本人操作——登录 GitHub、登录 npm、输入密码/令牌，这些我不做。

## 1. 建 GitHub 仓库并推送

先在 https://github.com/new 建一个**空**仓库（不要勾选 README / .gitignore / License）：

- Owner: `zheshiyigehenchang`
- Repository name: `dsh-chat-typography`
- Public（市场收录要求 URL 可公开访问）

然后在包目录里执行：

```bash
cd D:\test\dsh-chat-typography
git remote add origin https://github.com/zheshiyigehenchang/dsh-chat-typography.git
git push -u origin main
```

检查：仓库根目录能看到 `package.json`、`cordis.patch.yml`、`README.md`、`docs/settings.png`。

> README 里的截图是相对路径 `docs/settings.png`，市场会按
> `https://raw.githubusercontent.com/zheshiyigehenchang/dsh-chat-typography/HEAD/docs/settings.png`
> 去取，所以 `docs/settings.png` 必须在仓库里——它已经在首次提交中。

## 2. 发到 npm

```bash
cd D:\test\dsh-chat-typography
npm login                 # 需要 npm 账号，scope 与用户名一致才能发 @zheshiyigehenchang/*
npm publish --access public
```

发布前想再确认一次内容（不实际发布）：

```bash
npm pack --dry-run
```

预期 10 个文件：LICENSE、README.md、client.js、cordis.patch.yml、docs/settings.png、
icon.svg、index.js、locale/en.json、locale/zh.json、package.json。

> 首次发布 scoped 包必须带 `--access public`，否则默认是私有包（要付费）。

## 3. 提交市场收录

见同目录的 `PR.md`，以及要提交的条目文件 `awesome-dsh-plugin.yml`。

## 4. 发布之后

### 4.1 把本机那份源码链接换成正式包

现在 profile 里还是从源码链的旧包名：

```
C:\Users\zhang\.dsh\profiles\core-020\package.json
  dependencies:  "@local/dsh-chat-typography": "link:D:/test/dsh-chat-typography"
  dsh.profile.bundles:  "@local/dsh-chat-typography"
```

而 `client.js` 现在以 `@zheshiyigehenchang/dsh-chat-typography` 注册，浏览器预载的模块名还是旧的，
**设置页现在多半是打不开的**。npm 发布成功后，在插件管理器里：

1. 先卸载 / 移除旧的 `@local/dsh-chat-typography`（否则两行都指向同一个 `chat-typography` 行 id）
2. 安装 `@zheshiyigehenchang/dsh-chat-typography`（传包名，不要传目录）
3. 刷新页面，打开设置，确认导航里有「对话流排版」

换成正式包之后，`D:\test\dsh-chat-typography` 就只是源码仓库，改它不再影响运行中的 GUI——
要再验证改动用回链接安装，或每次发新版本。

### 4.2 验收

- 插件管理器里用包名安装：
  `@zheshiyigehenchang/dsh-chat-typography`
- 市场收录合并后，那一页会显示 `description`（npm 与目录都有之后），版本行会出现「已是最新」徽标。
  （本地 `link:` 安装永远拿不到这个徽标，市场只认目录 + registry 版本。）
- 以后升级：改 `package.json` 的 `version` → 提交 → 打 tag → `npm publish`。
