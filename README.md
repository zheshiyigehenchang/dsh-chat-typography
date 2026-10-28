# 对话流排版 · dsh-chat-typography

给 DSH Harness 的对话流加一页排版设置：**一个字号管住全文、一条网格管住所有纵向间距、三种角色各自的字体，以及对话文字到窗口边缘的留白**；此外还固定收紧了几处宿主留白（标题栏、代码块内边距、表格单元格、行内代码药丸底色），并让 `③` 这类圈码跟着中文字体走，不再被等宽字体的 0.55em 字形缩小。

装好后「设置」里会多出一页 **对话流排版**。

![设置界面](docs/settings.png)

> 上图是设置页的四组控件（来源：浅色主题、Windows、默认值 + 代码字体 `Consolas`）。截图只展示设置项本身，上面提到的几处**固定收紧**（标题栏、代码块内边距、表格单元格、行内代码）作用于对话流，不在这张图里。

## 功能

### 字号：一个值管全部

宿主本身有一套刻意的字号阶梯 —— 标题 21 / 19 / 18px、正文 14px、次要文字 13px、行内代码 12px、代码块 11px。本插件把它**全部压到同一个值**：

```css
[data-chat-flow][data-chat-flow] *:not(textarea):not(input):not(svg):not(svg *) {
  font-size: var(--dsh-content-font-size, 14px) !important;
}
```

改的只是字号，不动字重和字体族：标题照样加粗，代码照样等宽。范围 10–22px。输入控件与图标（`svg`）被排除在外，不参与统一。

这个值写进 Harness 的主题设置，所以**和「外观」页共用同一份** —— 在哪一边改，另一边都跟着显示。

### 字体：文字 / 代码 / 终端 三种角色

三个输入框分别设置 `text` / `code` / `terminal` 的字体族，留空即系统默认。写入走 Harness 的主题服务，所以**和「外观」页共用同一份设置** —— 在这一页改，外观页同步显示；在外观页改，这里也会跟着变。输入不需要自己加引号，服务会做清洗和补引号。

### 圈码：③ 跟中文字体走，不跟等宽字体走

宿主允许把正文设成 `"Consolas", "Microsoft YaHei"` 这种混排栈。Consolas 没有汉字，汉字就落到雅黑；但 `③`（U+2462）**在 Consolas 里是有的**，于是它按 Consolas 的设计画出来：0.55em 的小圈，还比汉字基线高出 6px。同一行里因此出现两种大小、两条基线——这是**同一个 `font-size`、不同字体**，任何字号规则都改不回来（实测：Consolas 22px 的 ③ 是 12×12，雅黑 22px 的 ③ 是 21×21）。

修法是让这一块字符改投中文字体，而不是动字号：

```css
@font-face {
  font-family: "dshct-enclosed";
  src: local("PingFang SC"), local("Hiragino Sans GB"), local("Microsoft YaHei"), …;
  unicode-range: U+2460-24FF, U+3251-325F, U+32B1-32BF;  /* ①–⓿、㉑–㉟、㊱–㊿ */
}
[data-chat-flow][data-chat-flow] { font-family: "dshct-enclosed", var(--dsw-font-family) }
```

`unicode-range` 把这层限定在圈码上，其余字符原样落回 `var(--dsw-font-family)`——宿主自己的值——所以**拉丁正文和代码块的字体一处都没变**，只有圈码恢复成 1em 的汉字尺寸、坐回汉字基线。系统里一个中文字体都找不到时，这个 `@font-face` 没有可用源，浏览器直接忽略，等于没装。

markdown 正文自己带着 `font` 简写（里面点名了 `var(--dsw-font-family)`），只在对话流根上写规则够不到它，所以选择器另外点名了 markdown 容器和推理行的 compact 变体。

### 设置页的图标：自己画，不用宿主的齿轮

宿主的设置导航**按 id 发图标**：`navIcon(id)` 只认 `account`、`models`、`agent-presets`、`plugins`、`archived-sessions` 五个内置 id，其余一律退回「设置」齿轮——于是「对话流排版」和「通用设置」顶着同一个齿轮。插件没法直接要到图标：`settings.section` 注册只收 `id` / `order` / `label`，而且 section 的 id 不进 DOM（导航行就是一个裸 `<button>` 加一个标签 `<span>`）；改用某个内置 id 等于把那页换掉。

所以本插件按**自己的标题文字**认出那一行（标题由本页字典提供，且要求行内确实有图标，不会误伤别的按钮），给它打上 `data-dshct-nav`，再由样式表把宿主的齿轮 `display:none` 掉、在同一格里用 `mask` 画出自己的三行文字图形。只加属性、不替换节点，React 重新渲染也不会打架；颜色走 `currentColor`，悬停与选中态跟着整行走。宿主 DOM 将来若改了，这个标记就不会落下——那一行保留齿轮，功能不受影响。

### 行距与间距：所有纵向间隔只走一条网格

这是本插件最花力气的部分。宿主的纵向间距来自三处互不相干的地方：

| 来源 | 宿主取值 |
| --- | --- |
| 行盒 | `line-height: calc(24px + 字号增量)` |
| markdown 块边距 | 段落 16px、列表项之间 6px、标题上 32px |
| 对话流项之间 | `--dsh-chat-flow-gap`：6px / 12px / 16px 三种语境 |

三者叠加的结果是：**同一个段落里换行是一个间隔，两段之间是第二个，两条消息之间是第三个。** 插件把这三处收敛成同一个数：

- 行盒 = `max((16px + 字号增量) × 倍率, 字号)` —— 跟着字号联动，同时保证不会小到装不下文字
- markdown 文本块（`p`、`ul/ol`、`blockquote`、`h1–h6`、列表项之间）的边距**归零**，于是段内换行和段间换行的步长完全相等
- `--dsh-chat-flow-gap` **归零**，于是两条消息之间、正文与工具行之间，也只隔一个行盒
- 例外：代码块 / 表格 / 分隔线保留 `16px × 倍率` 的上下边距 —— 它们自带边框或底色，归零会让框和正文粘在一起

倍率范围 0.80–2.00，步进 0.05，存在 localStorage 的 `dsh-chat-typography.lineHeight`。**1.00 也是这条统一网格**，不会退回宿主原本参差的间距。

### 固定收紧的几处留白

下面这些**与倍率无关**，是固定值，也没有开关：

| 位置 | 宿主 | 现在 |
| --- | --- | --- |
| 对话标题栏上下留白（无标签行时） | 各 10px（栏高 51px） | 各 5px（栏高 41px） |
| 代码块内部上下内边距 | 16px | 8px |
| 表格单元格内边距 | `10px 16px` | `5px 8px` |
| 行内代码 | 底色 + 描边 + 5px 左右内边距 | 无底色、无描边、无内边距 |

**标题栏**那条带 `:not(:has(.wSkVaW_tabs))` 守卫：宿主只在存在标签行时（`tabs.length > 1`）才把标题栏下限锁在 76px。不加守卫的话，一旦某个会话展开出标签行，这个下限会被覆盖掉，标签行就会和内容撞在一起。加守卫后实测：无标签 41px，有标签仍为 76px 不变。

**表格**只收内边距，不动边框。宿主另外把首列左边距和末列右边距归零（让表格左右贴齐），本层的选择器比宿主那两条更深，所以收内边距时会顺带破坏贴齐——因此贴齐也由本层手工还原。

**行内代码**去底色是因为宿主对它的处理本来就不一致：普通行内代码画成带底色和描边的"药丸"，而被判为可解析文件路径的那些（deliverables 会把它们改写成带 `_fileMention_` 的按钮）底色与描边被重置掉了。两段看起来一模一样的代码穿着两种不同的衣服，所以干脆都去掉。

### 恢复默认

一键把三个字号回默认（14 / 11 / 13）、清空三个字体族、行距回 1.00、留白清空。

### 左右留白

数字框设置对话文字距窗口左右边缘的距离（px），留空即宿主的默认宽度。宿主原来的对话列宽是 `clamp(680px, 视口宽 × 0.64, 920px)`，窗口一宽，两侧就空出很大一块；这一项把它收窄。

实现是覆写 `--dsh-chat-content-width`：对话流列、输入框卡片、用户气泡堆、宽表格都从这一个变量取宽度，所以它们会一起收窄并保持互相对齐。宿主已经为输入框两侧控件预留了 `--dsh-composer-side-clearance + 16px`（约 32px），所以填 0 也不会小于这个下限。设置此项后，宿主的「拖宽」手柄不再生效。

## 设置项一览

| 设置项 | 控件 | 范围与默认 | 存放位置 |
| --- | --- | --- | --- |
| 字号 | 数字框 | 10–22px，默认 14（宿主默认） | Harness 主题设置（与「外观」共用） |
| 字体 · 文字 / 代码 / 终端 | 文本框 | 留空 = 系统默认 | 同上 |
| 行距 | 数字框 | 0.80–2.00，步进 0.05，默认 1.00 | localStorage `dsh-chat-typography.lineHeight` |
| 左右留白 | 数字框 | 0–600px，留空 = 宿主默认 | localStorage `dsh-chat-typography.gutter` |

数字框回车或失焦提交；输入非法值会退回原值。

## 安装

在 Harness 的插件管理器里安装，`target` 传包名：

```
@zheshiyigehenchang/dsh-chat-typography
```

也可以从源码安装：先把本仓库 clone 到本地，再往管理器里传**包目录的绝对路径**（例如 `<你的克隆目录>\dsh-chat-typography`），管理器会：

1. 往 `<DSH_HOME>\profiles\<profile>\package.json` 的 `dependencies` 写入 `"@zheshiyigehenchang/dsh-chat-typography": "link:<包目录>"`
2. 把包名追加进该文件的 `dsh.profile.bundles`
3. 执行 pnpm 链接，`node_modules\@zheshiyigehenchang\dsh-chat-typography` 变成指向源码目录的符号链接

包目录不必放在 workspace 里；链接之后**源码即产物**，改 `client.js` 刷新页面就生效，不需要重新安装。

装完**刷新页面**即可，不需要重启 Harness。验证：打开设置，导航里应出现「对话流排版」。

## 目录结构

```
dsh-chat-typography/
├── package.json          包清单：exports / files / dsh.bundle.patch / dsh.client
├── cordis.patch.yml      向 profile 插入 bundle 行的 patch
├── index.js              Host 半个 bundle（本插件没有 Host 逻辑，只有空 apply）
├── client.js             全部实现：设置页 + 若干层样式
├── locale/
│   ├── zh.json           插件列表里的显示名与简介
│   └── en.json
├── icon.svg              插件列表图标
└── docs/                 README 里的截图
```

`client.js` 里叠了若干层样式，各自独立注入一个 `<style data-plugin-css=...>`：

| 层 | 作用域 | 是否常驻 |
| --- | --- | --- |
| 统一字号 | `[data-chat-flow]` 内除输入控件与图标 | 常驻 |
| 行距与间距 | `[data-chat-flow]`，内容随倍率重写 | 常驻（倍率 1.00 也写） |
| 行内代码去底色 | `[data-chat-flow]` 内 markdown 的 `:not(pre)>code` 与文件提及 | 常驻 |
| 圈码改投中文字体 | `[data-chat-flow]` 及其 markdown 正文里的 `U+2460-24FF` 等圈码 | 常驻 |
| 表格单元格收紧 | `[data-chat-flow]` 内 markdown 表格 | 常驻 |
| 代码卡片内部收紧 | `[data-chat-flow]` 内代码块的 `<pre>` 上下内边距 | 常驻 |
| 标题栏收紧 | `header.wSkVaW_header`（无标签行时） | 常驻 |
| 设置页导航图标 | 设置对话框 `nav` 里本插件那一行（按标题文字认，打了 `data-dshct-nav`） | 常驻 |
| 左右留白 | `:has([data-chat-flow])` 上的 `--dsh-chat-content-width` | 仅在填了数值时 |

后面这几层（行内代码、表格、代码卡片、标题栏）是**固定的紧凑化**，不提供开关，也不随任何设置变化。其共同做法是靠提高选择器特异性取胜（重复属性选择器 `[data-chat-flow][data-chat-flow]`、重复类名 `header.wSkVaW_header.wSkVaW_header`），**不使用 `!important`** —— 因为被覆盖的宿主规则本身都不是 `!important`。

**一个需要注意的坑：正文段落节奏的归零并不在常驻层里，而是「行距与间距」层的一部分。** 因此它跟着倍率走（倍率 1.00 同样生效），但如果行距层整个不挂载，正文节奏会退回宿主的 16px。

> 维护提示：`TIGHT_CODE_CARD_CSS` 里那两条 margin 规则其实是**死代码**。行距层已经归零了同样的文本块，而且选择器更深、注入更晚，实测开不开这两条规则结果完全一致。它们还表达了**相反**的意图（把 `.md-code-block` 和 `hr` 也归零），一旦样式表顺序变化就会静默生效，让分隔线和代码卡片贴上正文。真正属于这一层的只有 `<pre>` 的上下内边距那一条。

## 兼容性与已知限制

- **强依赖宿主内部实现**：`[data-chat-flow]` 钩子，`--dsh-chat-flow-gap`、`--dsh-chat-content-width`、`--dsl-terminal-line-height` 变量，以及 `[class*="_markdown_"]` 这类 CSS Modules 类名半段。宿主大版本升级（尤其是 `dsh-client-ui-chat` 与 `dsh-client-ui-primitives`）可能让某一层失效。类名用的是 localName 半段而不是哈希，跨构建稳定；变量名一旦改了就要跟着改。
- **改动全在浏览器侧**，生效方式是刷新页面。
- 设置页的导航图标是**运行时认行改画**：宿主把 dialog 挂到 `document.body`、并给面板留了 `data-shortcut-modal="settings"` 与 `<nav>`，本插件据此定位。这两点若变，标记不再落下，图标退回宿主的齿轮，其余功能照常。
- 单行的控件行（时间戳、复制/重试按钮行、工具卡标题行）高度由按钮决定，不随行距伸缩。
- 展开状态的步骤进程标题自带 `padding-bottom: 8px`，是固定值，也不随倍率走。
- 字体族的写入依赖主题服务暴露 `setFontFamily`；万一没有，字体分组会自动隐藏，其余功能不受影响。
- 标题栏那一层依赖 `wSkVaW_header` / `wSkVaW_tabs` 这两个 CSS Modules 类名，以及 `:has()` 支持（Chromium 105+ / Safari 15.4+）。宿主若改名，该层静默失效，但不会影响其他层。
- 去掉行内代码底色后，行内代码与其后的普通文字完全靠字形区分。若宿主将来取消文件提及的重写，这一层就只剩"把药丸去掉"这一个作用。

## 许可

MIT，见 [LICENSE](LICENSE)。
