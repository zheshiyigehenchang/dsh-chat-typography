# PR 文案（提交到 awesome-dsh-plugin）

标题：

```
Add dsh-chat-typography (ui)
```

正文：

```markdown
Adds `@zheshiyigehenchang/dsh-chat-typography` to the **ui** category.

One settings page for the DSH conversation flow's typography:

- **Font size** — a single value applied to every text node in the flow, so a
  heading, a paragraph, inline code and a code block all render at the same
  size. Shared with the Appearance section through the theme service.
- **Line spacing** — one multiplier governing the line box, the markdown block
  gutters and the flow item gap, so every vertical step in the conversation is
  equal rather than three unrelated values stacked on top of each other.
- **Font family** — independent text / code / terminal roles.
- **Side gutter** — narrows the conversation column via
  `--dsh-chat-content-width`.

Repo: https://github.com/zheshiyigehenchang/dsh-chat-typography
npm: https://www.npmjs.com/package/@zheshiyigehenchang/dsh-chat-typography

Installability:

- `package.json` declares `dsh.bundle` (`{ "patch": "./cordis.patch.yml" }`)
  together with `dsh.client`, and `cordis.patch.yml` sits at the repo root.
- Works fully client-side; the Host half is an empty `apply`.

The README screenshot is referenced with a relative path
(`docs/settings.png`), so the market can resolve it from the repository.
```

# 提交步骤

```bash
# 1. fork + clone
git clone https://github.com/<your-fork>/awesome-dsh-plugin.git
cd awesome-dsh-plugin

# 2. 放条目文件（文件名必须与仓库名一致）
cp <本目录>/awesome-dsh-plugin.yml \
   data/plugins/zheshiyigehenchang__dsh-chat-typography.yml

# 3. 可选：本地预览 README 里的那一行
npm ci
node scripts/generate-readme.mjs

# 4. 提交（只提交这一个条目文件）
git add data/plugins/zheshiyigehenchang__dsh-chat-typography.yml
git commit -m "Add dsh-chat-typography (ui)"
git push
```

然后在 GitHub 上开 PR，正文用上面的内容。
