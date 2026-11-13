/**
 * Browser half of the chat-typography bundle: one Settings page that adjusts the
 * conversation flow's font size (shared with the Appearance section), font
 * family, and line spacing.
 *
 * Font size and font family are written through the Theme service, so they
 * persist in the Host user-settings document and stay in sync with Appearance.
 * Line spacing has no host variable of its own, so it is applied as a scoped CSS
 * override layer owned by this bundle.
 */
window.__ModuleLoader__.load({
  id: '@zheshiyigehenchang/dsh-chat-typography',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useSyncExternalStore, useState, useEffect } = React;

    /** Package id: the module-table key and the owner of every style tag below. */
    const PKG = '@zheshiyigehenchang/dsh-chat-typography';
    /** Locale namespace holding this page's copy. */
    const NS = 'chat-typography';
    /** localStorage key holding the line-height multiplier. */
    const LH_KEY = 'dsh-chat-typography.lineHeight';
    const PAGE_STYLE_ID = `${PKG}/settings-page`;
    const LH_STYLE_ID = `${PKG}/line-height`;
    const FLAT_SIZE_STYLE_ID = `${PKG}/uniform-font-size`;
    const BARE_CODE_STYLE_ID = `${PKG}/bare-inline-code`;
    const TIGHT_TABLE_STYLE_ID = `${PKG}/tight-table`;
    const TIGHT_CODE_CARD_STYLE_ID = `${PKG}/tight-code-card`;
    const TIGHT_HEADER_STYLE_ID = `${PKG}/tight-header`;
    const ENCLOSED_STYLE_ID = `${PKG}/enclosed-symbols`;
    const HIDE_TABS_STYLE_ID = `${PKG}/hide-view-tabs`;
    const COMPACT_HEADER_STYLE_ID = `${PKG}/compact-header`;
    const MERGED_STYLE_ID = `${PKG}/merged-settings`;
    const WRAP_STYLE_ID = `${PKG}/copy-wrapping`;

    /** Independently configurable font roles, matching the Appearance section. */
    const ROLES = ['text', 'code', 'terminal'];
    /** Per-role size range and default, mirroring the ui-theme Host schema. */
    const FONT_SIZE_SPECS = {
      text: { min: 10, max: 22, fallback: 14 },
      code: { min: 10, max: 16, fallback: 11 },
      terminal: { min: 10, max: 20, fallback: 13 },
    };
    /** Line-height multiplier bounds; 1 leaves the built-in spacing untouched. */
    const LH_MIN = 0.8;
    const LH_MAX = 2;
    const LH_STEPS = 20;
    const LH_FALLBACK = 1;
    /** Style tag holding the side-gutter layer. */
    const GUTTER_STYLE_ID = `${PKG}/side-gutter`;
    /** localStorage key holding the requested side gutter, in CSS pixels. */
    const GUTTER_KEY = 'dsh-chat-typography.gutter';
    /** Side-gutter bounds, in pixels. */
    const GUTTER_MIN = 0;
    const GUTTER_MAX = 600;
    /** localStorage key: `'1'` hides the conversation View tab row. */
    const HIDE_TABS_KEY = 'dsh-chat-typography.hideViewTabs';
    /** Root attribute the hide-tabs sheet keys off, so the CSS can stay static. */
    const HIDE_TABS_ATTR = 'data-dshct-hide-view-tabs';
    /** localStorage key: `'1'` removes the conversation header's block padding. */
    const COMPACT_HEADER_KEY = 'dsh-chat-typography.compactHeader';
    /** Root attribute the compact-header sheet keys off. */
    const COMPACT_HEADER_ATTR = 'data-dshct-compact-header';
    /** localStorage key: `'1'` makes the terminal size follow the body size. */
    const TERMINAL_FOLLOW_KEY = 'dsh-chat-typography.terminalFollowText';

    const zh = {
      nav: '对话流排版',
      title: '对话流排版',
      desc: '统一设置对话流中的字体、字号与间距。字号与「外观」共用同一份设置。',
      groupFontSize: '字号',
      groupFontFamily: '字体',
      groupLineHeight: '行距与间距',
      groupLayout: '留白',
      roleText: '正文',
      roleCode: '代码块',
      roleTerminal: '终端',
      sizeTextDesc: '会话界面所有文字都使用这一个字号：标题、正文、代码一起变化。侧栏终端单独设。',
      sizeTerminalDesc: '侧栏终端里字符的字号（10–20px）。和正文字号是两份设置：勾选下面的「跟随正文」就不用手动改。',
      terminalFollowTitle: '终端跟随正文',
      terminalFollowDesc:
        '打开后，终端字号跟着正文字号走（超过 20px 按 20px 算），上面的输入框变成只读；关掉后终端保留当前值，可以单独改。',
      familyTextDesc: '留空则使用系统默认字体。',
      familyCodeDesc: '留空则使用系统默认等宽字体。',
      familyTerminalDesc: '留空则使用系统默认等宽字体。',
      familyPlaceholder: '系统默认',
      lineHeightTitle: '倍率',
      lineHeightDesc:
      '所有文字的行高、以及任意两段文字之间的垂直间距，都按这一个倍率缩放；1.00 为基准。',
      gutterTitle: '左右留白',
      gutterDesc:
      '文字距窗口左右边缘的距离（px）。留空则用宿主默认宽度；宿主已为输入框两侧控件预留约 32px，所以填 0 也不会低于这个值。设置后宽度由它决定，拖动宽度手柄不再生效。',
      gutterPlaceholder: '自动',
      hideTabsTitle: '隐藏视图标签栏',
      hideTabsDesc:
        '隐藏标题栏下方「对话 / 轨迹 / …」这一行，让标题栏只剩一行。注意：标签栏是切换「轨迹」等其它视图的唯一入口，隐藏后无法在界面里切换；需要时回到这里重新打开。',
      compactHeaderTitle: '紧凑会话标题栏',
      compactHeaderDesc:
        '把会话标题栏上下的 5px 留白归零：单行标题栏从约 41px 压到约 31px，字号和「标准模式」胶囊都不缩小。标签栏可见时宿主仍保留 76px 下限，这一项主要作用于单行标题栏。',
      titlebarTitle: '桌面标题栏',
      titlebarDesc:
        '把官方桌面版最上面一行（文件 / 视图 / 运行 / 帮助与窗口按钮）压到 28px。改完要完全退出 DSH 再启动才生效；应用更新会恢复原值，回来再点一次即可。',
      titlebarAction: '写入 28px',
      titlebarBusy: '写入中…',
      titlebarPatched: '已写入 28px：请完全退出 DSH 再启动。',
      titlebarAlready: '已经是 28px，无需修改。',
      titlebarReading: '正在读取桌面版的 app.asar…',
      titlebarCurrent: (height) => `现在是 ${height}px。`,
      titlebarNotDesktop: '没找到桌面版的 app.asar：只有官方桌面版能改它。',
      titlebarNoMarker: '这个 app.asar 里的写法不认识，未做修改。',
      titlebarNoAccess: '找到了 app.asar 但读写失败（可能权限不足）。',
      titlebarFailed: '写入失败，请稍后再试。',
      reset: '恢复默认',
      resetDesc: '字号、字体与间距都回到默认值。',
      resetAction: '重置',
    };
    const en = {
      nav: 'Chat typography',
      title: 'Chat typography',
      desc: 'Set the font family, font size, and spacing of the conversation flow in one place. Font size is shared with Appearance.',
      groupFontSize: 'Font size',
      groupFontFamily: 'Font family',
      groupLineHeight: 'Line & block spacing',
      groupLayout: 'Gutter',
      roleText: 'Body',
      roleCode: 'Code',
      roleTerminal: 'Terminal',
      sizeTextDesc: 'One size for every run of text in the conversation: headings, body and code all follow it. The sidebar terminal is set separately.',
      sizeTerminalDesc: 'The cell size of the sidebar terminal (10–20px). It is a separate setting from the body size; turn on “Follow body” below to skip it.',
      terminalFollowTitle: 'Terminal follows body',
      terminalFollowDesc:
        'While on, the terminal size tracks the body size (capped at 20px) and the field above becomes read-only. While off, the terminal keeps its current size and can be changed on its own.',
      familyTextDesc: 'Empty uses the system default font.',
      familyCodeDesc: 'Empty uses the system default monospace font.',
      familyTerminalDesc: 'Empty uses the system default monospace font.',
      familyPlaceholder: 'System default',
      lineHeightTitle: 'Multiplier',
      lineHeightDesc:
      'Scales the line height of every run of text and the vertical gap between any two of them. 1.00 is the baseline.',
      gutterTitle: 'Side gutter',
      gutterDesc:
      'Distance in px from the conversation text to the left and right window edges. Empty keeps the host width; the host already reserves about 32px for the composer controls, so 0 cannot go below that. While set, this value owns the width and the drag handle no longer changes it.',
      gutterPlaceholder: 'Auto',
      hideTabsTitle: 'Hide the view tab row',
      hideTabsDesc:
        'Hides the “Chat / Trajectory / …” row under the header so the header keeps a single line. Note: the tab row is the only way to switch to other views such as Trajectory, so hiding it leaves no in-app switcher; turn it back on here when needed.',
      compactHeaderTitle: 'Compact conversation header',
      compactHeaderDesc:
        'Zeroes the 5px padding above and below the conversation header, taking the single-line header from about 41px to about 31px. Font size and the “Standard mode” pill stay as they are. While the tab row is visible the host still floors the header at 76px, so this mainly affects the single-line header.',
      titlebarTitle: 'Desktop title bar',
      titlebarDesc:
        'Shrinks the official desktop app’s top row (File / View / Run / Help and the window buttons) to 28px. Fully quit and start DSH again to see it; app updates restore the original value, so one more click reapplies it.',
      titlebarAction: 'Write 28px',
      titlebarBusy: 'Writing…',
      titlebarPatched: 'Wrote 28px — fully quit and start DSH.',
      titlebarAlready: 'Already 28px, nothing to change.',
      titlebarReading: 'Reading the desktop app’s app.asar…',
      titlebarCurrent: (height) => `Currently ${height}px.`,
      titlebarNotDesktop: 'Could not find the desktop app’s app.asar: only the official desktop app can be retuned.',
      titlebarNoMarker: 'The title bar height is written differently in this app.asar, so nothing was changed.',
      titlebarNoAccess: 'Found app.asar but could not read or write it (permissions?).',
      titlebarFailed: 'The write failed. Try again later.',
      reset: 'Restore defaults',
      resetDesc: 'Reset font size, font family, and spacing.',
      resetAction: 'Reset',
    };

    const ROLE_LABEL = { text: 'roleText', code: 'roleCode', terminal: 'roleTerminal' };
    const FAMILY_DESC = { text: 'familyTextDesc', code: 'familyCodeDesc', terminal: 'familyTerminalDesc' };

    /** Clamp and snap a multiplier onto the step grid the number field steps over. */
    function normalizeLineHeight(value) {
      if (!Number.isFinite(value)) return LH_FALLBACK;
      const snapped = Math.round(value * LH_STEPS) / LH_STEPS;
      return Math.min(LH_MAX, Math.max(LH_MIN, snapped));
    }

    /** Read the stored multiplier, falling back to the built-in spacing. */
    function readLineHeight() {
      if (typeof localStorage === 'undefined') return LH_FALLBACK;
      try {
        const raw = localStorage.getItem(LH_KEY);
        if (raw === null) return LH_FALLBACK;
        return normalizeLineHeight(Number(raw));
      } catch (_storageUnavailable) {
        return LH_FALLBACK;
      }
    }

    /** Persist the multiplier; a failed write only costs the next reload. */
    function writeLineHeight(value) {
      if (typeof localStorage === 'undefined') return;
      try {
        localStorage.setItem(LH_KEY, String(value));
      } catch (_storageUnavailable) {
        /* The value still applies for this page session. */
      }
    }

    /** Clamp a typed gutter into range; a non-number clears it back to the host width. */
    function normalizeGutter(value) {
      if (!Number.isFinite(value)) return null;
      return Math.min(GUTTER_MAX, Math.max(GUTTER_MIN, Math.round(value)));
    }

    /** Read the stored gutter; `null` means "let the host size the column". */
    function readGutter() {
      if (typeof localStorage === 'undefined') return null;
      try {
        const raw = localStorage.getItem(GUTTER_KEY);
        if (raw === null || raw === '') return null;
        return normalizeGutter(Number(raw));
      } catch (_storageUnavailable) {
        return null;
      }
    }

    /** Persist the gutter, dropping the key again when the field is cleared. */
    function writeGutter(value) {
      if (typeof localStorage === 'undefined') return;
      try {
        if (value === null) localStorage.removeItem(GUTTER_KEY);
        else localStorage.setItem(GUTTER_KEY, String(value));
      } catch (_storageUnavailable) {
        /* The value still applies for this page session. */
      }
    }

    /** Read the stored hide-tabs flag; anything but `'1'` leaves the row visible. */
    function readHideTabs() {
      if (typeof localStorage === 'undefined') return false;
      try {
        return localStorage.getItem(HIDE_TABS_KEY) === '1';
      } catch (_storageUnavailable) {
        return false;
      }
    }

    /** Persist the hide-tabs flag, dropping the key again when it is off. */
    function writeHideTabs(value) {
      if (typeof localStorage === 'undefined') return;
      try {
        if (value) localStorage.setItem(HIDE_TABS_KEY, '1');
        else localStorage.removeItem(HIDE_TABS_KEY);
      } catch (_storageUnavailable) {
        /* The value still applies for this page session. */
      }
    }

    /** Read the stored compact-header flag; anything but `'1'` keeps the padding. */
    function readCompactHeader() {
      if (typeof localStorage === 'undefined') return false;
      try {
        return localStorage.getItem(COMPACT_HEADER_KEY) === '1';
      } catch (_storageUnavailable) {
        return false;
      }
    }

    /** Persist the compact-header flag, dropping the key again when it is off. */
    function writeCompactHeader(value) {
      if (typeof localStorage === 'undefined') return;
      try {
        if (value) localStorage.setItem(COMPACT_HEADER_KEY, '1');
        else localStorage.removeItem(COMPACT_HEADER_KEY);
      } catch (_storageUnavailable) {
        /* The value still applies for this page session. */
      }
    }

    /** Read the stored follow-text flag; anything but `'1'` keeps the two sizes apart. */
    function readTerminalFollow() {
      if (typeof localStorage === 'undefined') return false;
      try {
        return localStorage.getItem(TERMINAL_FOLLOW_KEY) === '1';
      } catch (_storageUnavailable) {
        return false;
      }
    }

    /** Persist the follow-text flag, dropping the key again when it is off. */
    function writeTerminalFollow(value) {
      if (typeof localStorage === 'undefined') return;
      try {
        if (value) localStorage.setItem(TERMINAL_FOLLOW_KEY, '1');
        else localStorage.removeItem(TERMINAL_FOLLOW_KEY);
      } catch (_storageUnavailable) {
        /* The value still applies for this page session. */
      }
    }

    /**
     * The override sheet that puts the whole conversation on one vertical rhythm:
     * every run of text gets the same line box, and every separation between two
     * runs of text gets the same gap.
     *
     * The host instead derives both from the size of the role at hand — a heading
     * line box is 30px, a body line 24px, a table row 22px, a code line 19px —
     * and spaces its blocks by hand: 32px above a heading, 16px around a
     * paragraph, 6px between list items and between the flow's top-level blocks,
     * 4px inside a reasoning row.
     *
     * Everything is scoped to `[data-chat-flow]`, the attribute the chat column
     * carries, so the composer, the sidebar and this settings page keep the host
     * spacing. `--dsh-content-font-delta` itself is never touched: it also drives
     * icon sizes and container heights.
     *
     * @param mult - rhythm multiplier; above 1 for looser spacing.
     * @returns the CSS text for the override style tag.
     */
    function lineHeightCss(mult) {
      const lh = 'var(--dshct-lh)';
      const scope = '[data-chat-flow]';
      /**
       * One line box for every run of text, on the same 16px base as the gap
       * below, so that every vertical step in the conversation is the same size.
       * It grows with the single font size the flow is rendered at, the way the
       * host's own line boxes do, and the multiplier is applied on top.
       *
       * The `max()` stops a tightened multiplier from squeezing a line box below
       * the text it holds, which would overlap consecutive lines.
       */
      const lineBox =
        `max(calc((16px + var(--dsh-content-font-delta,0px)) * ${lh}),` +
        ` var(--dsh-content-font-size,14px))`;
      /**
       * One gap for every separation between two runs of text.
       */
      const blockGap = `calc(16px * ${lh})`;
      const md = `${scope} [class*="_markdown_"]:not([data-markdown-variant="compact"])`;
      const compact = `${scope} [data-markdown-variant="compact"]`;
      return [
        `${scope}{--dshct-lh:${mult}}`,
        /**
         * The same line box as a unitless number, for the few surfaces that take
         * a `line-height` multiplier rather than a length — a GenUI table cell
         * declares `line-height: 1.5` for itself and has to be pointed back at
         * the conversation's own rhythm.
         */
        `:has([data-chat-flow]){--dshct-lh-box:${
          Math.round(Number(mult) * 100) / 100
        }}`,
        // The exclusions keep the line box off the composer's fields and off icon
        // geometry, where it would only add dead height.
        `${scope}[data-chat-flow] *:not(textarea):not(input):not(svg):not(svg *)` +
          `{line-height:${lineBox}!important}`,
        // A list bullet is a pseudo-element, so the rule above never reaches it.
        `${md} li::marker{line-height:${lineBox}}`,
        /**
         * Text blocks carry no margin at all. A margin sits outside the line box,
         * so any non-zero value makes the step between two paragraphs larger than
         * the step between two lines of the same paragraph. Zeroing it puts every
         * line of text on the one grid, at the cost of the blank space that used
         * to mark a paragraph break.
         */
        `${md} :is(p,ul,ol,blockquote,h1,h2,h3,h4,h5,h6)` +
          `{margin-top:0;margin-bottom:0}`,
        `${md} li:not(:first-child){margin-top:0}`,
        `${md} li > :is(p,ul,ol,blockquote){margin-top:0;margin-bottom:0}`,
        /**
         * Boxed blocks keep a gap. A table and a rule still need one: a table has
         * no background of its own, so a zero margin lets the first row's text sit
         * flush against the paragraph above it.
         */
        `${md} :is(pre,hr,table){margin-top:${blockGap};margin-bottom:${blockGap}}`,
        /**
         * A code card is the exception, set just below. Kept as its own rule
         * because the tightening sheet that zeroes it is emitted into a separate
         * style tag and out-specifies this one, so the card's margin there wins.
         * Naming it separately here keeps the two rules readable side by side
         * instead of hiding the exception inside the `:is()` list.
         */
        `${md} .md-code-block{margin-top:${blockGap};margin-bottom:${blockGap}}`,
        // Reasoning rows render the compact markdown variant, which the host
        // marks with a data attribute rather than with a class.
        `${compact} :is(p,ul,ol,blockquote){margin-top:0;margin-bottom:0}`,
        `${compact} li:not(:first-child){margin-top:0}`,
        /**
         * The separation between the flow's top-level blocks is read from a
         * variable the host rebinds per context (6px between parts, 12px after a
         * turn process, 6px inside a group body). Rebinding it to zero on every
         * node in the flow — important, so the host's own values lose — leaves
         * the line box as the only step between two blocks, which is the point:
         * two neighbouring blocks then sit exactly as close as two lines of one
         * paragraph, and the whole turn reads on a single grid.
         */
        `${scope},${scope} *,[data-slot="conversation.chat.flow"],[data-slot="conversation.chat.flow"] *` +
          `{--dsh-chat-flow-gap:0px!important}`,
        /**
         * A terminal card carries its own line box and reuses it for the status
         * bar and the copy button, so it is pointed at the same uniform line box.
         * The tool and plugin-manager surfaces rebind it on a class they merge
         * onto the same root, and the later rule wins there.
         */
        `${scope} [data-terminal]{--dsl-terminal-line-height:${lineBox};` +
          `margin-top:${blockGap};margin-bottom:${blockGap}}`,
        `${scope} [class*="_terminal"]{--dsl-terminal-line-height:${lineBox}}`,
      ].join('\n');
    }

    /**
     * The sheet that decides how much room the conversation keeps from the left
     * and right window edges. Every conversation surface reads its measure from
     * `--dsh-chat-content-width` — the flow column, the composer card, the user
     * bubble stack, wide tables — so moving that one variable moves all of them
     * together and they stay aligned with each other.
     *
     * The scroller already spends `--dsh-composer-side-clearance + 16px` of
     * padding on each side, so only the part of the request above that floor has
     * to come out of the column width; the gutter that lands is exact.
     *
     * `:has()` is what reaches the element that owns the variable: the layout body
     * is the nearest ancestor containing the flow column, and an `!important`
     * declaration there beats the `--dsh-chat-user-width` the width drag handle
     * writes inline on that same element.
     *
     * @param gutter - px between the text and each edge, or null to leave the
     * host's own width untouched.
     * @returns the CSS text for the gutter style tag.
     */
    function gutterCss(gutter) {
      if (gutter === null) return '';
      const side = '(var(--dsh-composer-side-clearance,16px) + 16px)';
      /* Whatever the window size and the request, the column keeps a readable floor. */
      const excess = `max(0px, min(${gutter}px - ${side}, calc((100% - 360px) / 2)))`;
      return (
        ':has([data-chat-flow]){--dsh-chat-content-width:' +
        `calc(100% - 2 * ${excess})!important}` +
        /* The host sizes this handle from the column, so a narrow gutter makes its
           subtraction negative and the width falls back to zero — pin a usable one. */
        ':has([data-chat-flow]) [class*="_widthHandle"]{width:10px}'
      );
    }

    /*
     * 设置页的宽度预算：宿主把 `settings.section` 的内容放进一个滚动容器，
     * 而本节默认只占 720px。面板一旦铺满窗口（见 `MERGED_CSS`），剩下的宽度
     * 就成了浪费——这里让本节占满容器，并用容器查询在宽容器下放宽长文案，
     * 让说明和控件在同一行读起来更顺。
     */
    const PAGE_CSS = [
      '.dshct-section{width:100%;max-width:none;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:8px}',
      '.dshct-title{margin:0;font-size:16px;font-weight:500;line-height:24px}',
      '.dshct-desc{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}',
      '.dshct-group{display:flex;flex-direction:column;margin-top:8px}',
      '.dshct-groupTitle{margin-bottom:2px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px}',
      '.dshct-row{display:flex;align-items:center;gap:8px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}',
      '.dshct-row:last-child{border-bottom:none}',
      /*
       * 宽控件行（目前只有桌面标题栏：命令块 + 状态行）。它和普通行一样占满整行，
       * 但改成上下排：说明先吃满整行宽度，控件放在下面。以前挤在右栏时，控件把
       * 说明压成一条只放七八个字的窄缝，堆到六七行。
       */
      '.dshct-rowWide{flex-direction:column;align-items:stretch;gap:10px}',
      '.dshct-rowWide .dshct-rowText{padding-right:0}',
      '.dshct-rowWide .dshct-control{display:block;width:100%;min-width:0}',
      /*
       * 长说明（RESET_DESC 一整句、标题栏那段）要折行，而 `*:has([data-chat-flow])`
       * 那族规则可能把 `white-space` 继承进设置对话框；这里显式钉回 `normal`，
       * 再用 `flex-basis:0` 让说明只吃剩余宽度，不会按内容把控件挤没。
       */
      '.dshct-rowText{display:flex;flex-direction:column;flex:1 1 0;gap:4px;min-width:0;padding-right:32px;white-space:normal}',
      '.dshct-rowTitle{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}',
      '.dshct-rowDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dshct-control{display:inline-flex;align-items:center;gap:10px}',
      '.dshct-unit{min-width:20px;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:22px}',
      '.dshct-input{box-sizing:border-box;width:210px;height:36px;padding:0 10px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px}',
      '.dshct-input.dshct-number{width:96px;font-variant-numeric:tabular-nums}',
      /* 字体栈长得像 `"Consolas", "Microsoft YaHei"`，210px 装不下第三行就看不见了。
       * 这三个框改成吃掉行里的空余宽度：两个子项各占一半，再由 440px / 52% 封顶，
       * 所以窄面板下只压到一半宽，不会把左侧说明挤没；数字框仍是固定 96px。 */
      '.dshct-row:has(.dshct-family) .dshct-control{flex:1 1 0;min-width:0;max-width:min(440px,52%)}',
      '.dshct-input.dshct-family{width:100%;min-width:0;text-overflow:ellipsis}',
      '.dshct-input:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}',
      /* 终端字号跟随正文时这个框只显示值、不接受输入。 */
      '.dshct-input:disabled{opacity:.55;cursor:default;background:var(--dsw-alias-bg-layer-1)}',
      '.dshct-button{height:36px;padding:0 16px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:14px;cursor:pointer}',
      '.dshct-button:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshct-button:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}',
      '.dshct-button:disabled{opacity:.55;cursor:default}',
      /*
       * 标题栏这一行：按钮在左，状态行在下面一行。控件不再和说明抢同一行宽度。
       */
      '.dshct-titlebar{display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-width:0;max-width:100%}',
      '.dshct-write{height:32px;padding:0 14px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;cursor:pointer}',
      '.dshct-write:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshct-write:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}',
      '.dshct-write:disabled{opacity:.55;cursor:default}',
      '.dshct-titlebarStatus{max-width:100%;text-align:left;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dshct-checkbox{width:18px;height:18px;margin:0;cursor:pointer;accent-color:var(--dsw-alias-brand-primary)}',
      '.dshct-checkbox:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:2px}',
    ].join('');

    /*
     * 折行预算：说明文案可能很长。中文没有空格、浏览器默认也不在行首放标点，
     * 所以既要允许「任意字符都能断」（超长 URL、字体栈），又要把 `text-wrap`
     * 留在 `pretty` 上——它会让中文在无可断处按标点断行，而不是把一串长
     * 路径/数字挤到下一行。`min-width:0` 只保证 flex 子项不撑破容器，
     * 并不阻止一个超长词把列撑宽。
     */
    const WRAP_CSS =
      '.dshct-desc,.dshct-rowDesc,.dshct-groupTitle,.dshct-rowTitle,.dshct-titlebarStatus' +
      '{overflow-wrap:anywhere;word-break:normal;line-break:auto;text-wrap:pretty;min-width:0}';

    /**
     * One size for every run of text inside the conversation flow. The host ships
     * a deliberate ladder — 21/19/18 for headings, 14 for the body, 13 for
     * secondary rows, 12 for inline code, 11 for code blocks — and a few labels
     * even carry a literal `px`. This layer flattens all of it onto the body size
     * so a single number governs the whole conversation.
     *
     * Only the size is unified: weights, families and spacing are left alone, so
     * headings stay bold and code stays monospace. The doubled attribute selector
     * lifts the rule above the host's own `!important` inline-code size
     * (`.markdown :not(pre) > code`), which a plain `[data-chat-flow] *` loses to.
     */
    const FLAT_SIZE_CSS =
      '[data-chat-flow][data-chat-flow] *:not(textarea):not(input):not(svg):not(svg *)' +
      '{font-size:var(--dsh-content-font-size,14px)!important}';

    /**
     * Enclosed symbols take the CJK text font instead of whatever Latin face
     * claims them first.
     *
     * ③ is U+2462. In a full-width CJK face it is a 1em ring on the ideographic
     * baseline, exactly as tall as the hanzi beside it. In a Latin-metric mono it
     * is a 0.55em ring lifted above the baseline: Consolas draws it 12x12 next to
     * a 22px hanzi, and that is what a mixed `"Consolas", "Microsoft YaHei"` stack
     * produces — hanzi fall through to YaHei, but the circled digit hits Consolas
     * first, so one line carries two sizes and two baselines. No size rule can fix
     * that, because both runs already share one font-size.
     *
     * So this declares a face sourced only from the usual CJK text families and
     * points it at the enclosed-symbol blocks alone, then prepends it to the
     * family list. Every other character falls straight through to
     * `var(--dsw-font-family)` — the Host's own value — so Latin prose keeps the
     * chosen face. The three selectors are the three places inside the flow that
     * carry a family of their own: the column itself, the markdown body (its
     * `font` shorthand names `var(--dsw-font-family)` outright, so a rule on the
     * column would never reach the prose), and the compact reasoning variant.
     * `pre` and `code` are left out on purpose — the Host gives them the code
     * family directly and this layer has no business changing it. Where no CJK
     * family exists the face has no usable source, the browser drops it, and the
     * layer costs nothing.
     */
    const ENCLOSED_FAMILY = 'dshct-enclosed';
    const ENCLOSED_CSS =
      '@font-face{font-family:"' + ENCLOSED_FAMILY + '";' +
      'src:local("PingFang SC"),local("Hiragino Sans GB"),local("Microsoft YaHei"),' +
      'local("Microsoft YaHei UI"),local("Noto Sans CJK SC"),local("Noto Sans SC"),' +
      'local("Source Han Sans SC"),local("SimHei"),local("WenQuanYi Micro Hei");' +
      'unicode-range:U+2460-24FF,U+3251-325F,U+32B1-32BF}' +
      '[data-chat-flow][data-chat-flow],' +
      '[data-chat-flow][data-chat-flow] [class*="_markdown_"],' +
      '[data-chat-flow][data-chat-flow] [data-markdown-variant="compact"]' +
      '{font-family:"' + ENCLOSED_FAMILY + '",var(--dsw-font-family)}';

    /**
     * Inline code as plain monospace text, with no chip of its own.
     *
     * The host paints `:not(pre) > code` as a chip — `--dsw-alias-markdown-inline-code`
     * fill, a hairline border, 5px of side padding and a small radius — but a run of
     * inline code that the deliverables bundle resolved against a produced or
     * delivered file is rewritten into a `_fileMention_` button, and that rule resets
     * `background` and `border` to nothing. Two runs that read identically in the
     * prose therefore wore two different outfits. This layer drops the chip from
     * both, so inline code is monospace and nothing else.
     *
     * The doubled attribute selector is what gets there: the host's chip rule is one
     * class plus a type selector, so `[data-chat-flow][data-chat-flow]` outranks it
     * whatever order the sheets land in. The host's spec is the one being overridden,
     * and it is not `!important`, so no `!important` is needed here.
     *
     * Scope is deliberately narrow — only `code`, only inside `[data-chat-flow]`, and
     * `:not(pre) > code` so code blocks, the composer's fields and the terminal keep
     * their own surfaces. The `padding` reset also covers the `[data-markdown-variant="compact"]`
     * variant used by reasoning rows, which carries `padding: 0 3px` and no fill.
     */
    const BARE_CODE_CSS =
      '[data-chat-flow][data-chat-flow] [class*="_markdown_"] :not(pre)>code,' +
      '[data-chat-flow][data-chat-flow] [class*="_markdown_"] [class*="_fileMention_"]' +
      '{background-color:transparent;border:none;padding:0;border-radius:0}';

    /**
     * Tighter markdown table cells.
     *
     * The host pads every `th`/`td` with `padding: 10px 16px`, and then reclaims the
     * outer edges — `th:first-child, td:first-child { padding-left: 0 }` and
     * `td:last-child { padding-right: 0 }`. What a reader actually sees is therefore
     * 32px between two columns plus 10px above and below every line, which makes a
     * short table drift apart in both directions.
     *
     * The vertical trim is the half that matters, and it goes all the way to zero.
     * The line-height sheet puts every row on the same 20.8px line box as the
     * prose, so a table only matches the text grid around it if the cell adds no
     * height of its own: any vertical padding makes each row taller than a line
     * of text, and a table is the one block a reader compares against the
     * paragraphs nearest to it. Rows stay apart because each cell keeps its own
     * `border-bottom`. Measured at a 1.30 rhythm, zero gives a 23px row step
     * against 33px at the 5px it used to carry.
     *
     * The horizontal half is zero too, for the same reason read sideways. A cell is
     * either a label or a value in a block that already reads as a list: on a wide
     * window the two-to-six words in it do not need 16px of breathing room to be
     * told apart, and the on-screen distance between two columns is the 16px gap
     * the host already grants each side. At the default gutter that took a
     * two-column key/value table from 488px wide to 456px, well inside the column,
     * which is where a table belongs — the host only scrolls one once it would
     * overflow the measure.
     *
     * Trimming the shorthand alone would not be enough. The host's edge rules are two
     * classes deep at most, so this layer's doubled attribute selector outranks them
     * and `padding: 0` would silently re-indent the first and last columns,
     * undoing the flush edges the host deliberately set. Those two edges are
     * therefore restored by hand, with the same `:first-child` / `:last-child` shape
     * the host uses.
     *
     * The same trim is owed to the tables a GenUI plugin draws — `table`,
     * `keyvalue`, `list` and the rest are rendered by `@changfenhuang/dsh-genui`,
     * not by the markdown renderer, so nothing above reaches them. Its cells are
     * `padding: 9px 12px` (head) and `10px 12px` (body), and those are what made
     * a five-row build report look loose: 20px of air around a 16px line box is
     * more than the line itself.
     *
     * The class name is not a guess. GenUI ships CSS-module names with a
     * generated hash (`V1MMBW_table`, `V1MMBW_tableWrap`), so the match has to be
     * a substring — but `[class*="_table_"]` finds nothing, because `_table` is
     * followed by a capital `W` and never by an underscore. The searchable stem
     * is the bare element name, `_table`, which both GenUI names carry. Its rules
     * are one class deep, so the doubled attribute selector outranks them the same
     * way it does the host's.
     *
     * Here the horizontal padding is *kept*: a GenUI table draws its own rounded
     * border and the cell text has to clear it, and its columns are often strings
     * (`out\rel64\SPDF.exe`) rather than two words that read as a pair.
     */
    const TIGHT_TABLE_CSS =
      '[data-chat-flow][data-chat-flow] [class*="_tableScroll_"] :is(th,td)' +
      '{padding:0}' +
      '[data-chat-flow][data-chat-flow] [class*="_tableScroll_"] :is(th,td):first-child' +
      '{padding-left:0}' +
      '[data-chat-flow][data-chat-flow] [class*="_tableScroll_"] td:last-child' +
      '{padding-right:0}' +
      /**
       * The scroll box clips at its padding box, and the host zeroes the first
       * cell's left padding so a table lines up with the prose above it. A file
       * link's leading icon then sits exactly on that clip edge, and the outer
       * antialiased column of its leftmost stroke is shaved off — the `<` looks
       * half cut. Padding the box and pulling it back by the same amount leaves
       * the table where it was but moves the clip edge two pixels to the left.
       */
      '[data-chat-flow][data-chat-flow] [class*="_tableScroll_"]' +
      '{padding-left:2px;margin-left:-2px}' +
      '[data-chat-flow][data-chat-flow] [class*="_table"] :is(th,td)' +
      '{padding-top:0;padding-bottom:0}' +
      /* The cell's line box, put back on the conversation's own rhythm: GenUI
         writes a literal 1.5 while the prose around it follows the multiplier. */
      '[data-chat-flow][data-chat-flow] [class*="_table"] td' +
      '{line-height:var(--dshct-lh-box,1.5)}' +
      /**
       * `keyvalue` never reaches the rule above: GenUI draws it as a column of
       * `div.kvRow` rather than a `<table>`, each one `padding: 7px 0` around a
       * 16px line. At 30.6px a row is nearly twice the text it holds, and a
       * build report is four or five of them in a stack.
       *
       * Zero, on the same reasoning as a table cell: the row already carries its
       * own hairline `border-top`, which is what separates one pair from the next.
       * It goes to 14px of air back to being 0.
       */
      '[data-chat-flow][data-chat-flow] [class*="_kvRow"]' +
      '{padding-top:0;padding-bottom:0}' +
      /* Same literal `1.5` as a table cell, same way back to the rhythm. */
      '[data-chat-flow][data-chat-flow] [class*="_kvValue"]' +
      '{line-height:var(--dshct-lh-box,1.5)}' +
      /**
       * The rest of the surface GenUI draws: a list item, a step, a timeline
       * entry. Each is a run of text wrapped in a fixed padding that was sized
       * for a 12.5–13.5px label and kept after the font-size layer flattened
       * every label in the flow to the body size. A `li` at `9px 16px 9px`
       * around a 16px line is 34px for one line of text.
       *
       * Zero, for the same reason as a table row, and only the vertical half.
       * Every one of these already separates itself from its neighbours — a
       * `li + li` border, a rail, a marker — so the padding was never what made
       * two entries read apart.
       */
      '[data-chat-flow][data-chat-flow] [class*="_li"]' +
      '{padding-top:0;padding-bottom:0}' +
      '[data-chat-flow][data-chat-flow] [class*="_stepContent"]' +
      '{padding-top:0}' +
      '[data-chat-flow][data-chat-flow] [class*="_tlBody"]' +
      '{padding-bottom:0}' +
      /**
       * The bullet is absolutely positioned at a fixed `top: 15px`, chosen
       * against the 9px of padding above it. With that gone the dot would hang
       * below the baseline of the line it belongs to, so it moves with the
       * padding — 15px less 9px is 6px, and 5px is the length of the pad itself.
       */
      '[data-chat-flow][data-chat-flow] [class*="_li"]:before' +
      '{top:6px}' +
      /**
       * A callout is the same bargain as a table row: a box whose whole job is to
       * hold two lines of text. GenUI gives it `padding: 12px 15px` top and bottom
       * of a 60px box that carries 35px of content, so a third of its height is
       * air. Halved to 6px, and the 3px it puts between title and body left alone
       * — the two lines are one statement and read as a unit either way.
       *
       * `:not([class*="Title"]):not([class*="Body"])` is not defensive noise. The
       * box, its title and its body all carry `_callout` in their class name, so a
       * bare substring match pads all three and lands a 28px title inside a 6px
       * frame — the box grows instead of shrinking.
       */
      '[data-chat-flow][data-chat-flow] [class*="_callout"]' +
      ':not([class*="Title"]):not([class*="Body"])' +
      '{padding-top:6px;padding-bottom:6px}';

    /**
     * Code cards with less air inside and none around.
     *
     * A fenced block is rendered as `.block` (banner + `<pre>`) and, when the
     * renderer picks that shape, `.card`. Two different paddings apply:
     *
     *   .block :where(pre) -> padding: 16px          (all four sides)
     *   .card  :where(pre) -> padding: 6px 22px 20px (top / sides / bottom)
     *
     * The card's numbers are the ones that read wrong: 6px under the banner but a
     * full 20px below the last line, so the text sits high and the card trails off
     * into empty space. The block variant is symmetric but simply generous.
     *
     * Both are trimmed to the same vertical value. The horizontal padding is left
     * exactly as the host set it for each variant — 22px on the card, 16px on the
     * plain block — since that is what aligns the code with the banner label above
     * it, and narrowing it would break that alignment rather than tighten spacing.
     *
     * `:where()` contributes no specificity, so the host's own selector is just
     * `.block :where(pre)` — one class. The doubled attribute selector outranks it.
     *
     * The `<pre>` is a descendant of the `.block` wrapper, not the wrapper itself,
     * so the class match is on the ancestor and `pre` is the subject of the rule.
     * Declared after the table layer only for readability; the two touch disjoint
     * elements.
     *
     * The space *around* the card belongs to the line-height sheet, which sets
     * its margin to `16px × 倍率`. The margin rules below are what take the card
     * back off that grid, so the layer owns the card's outer margin after all.
     *
     * The card's outer margin is deliberately zero. Measured at a 1.30 rhythm,
     * the box cost a full rhythm gap plus its own 8px of inner padding on each
     * side of the code, for a box that already wears a background. Zeroing both
     * edges is what turns the card into one more block on the text grid.
     *
     * Zeroing the card alone is what the neighbouring paragraphs make work: they
     * are already at 0px from the line-height sheet, and adjacent vertical margins
     * collapse to the larger of the two, so the card and the prose share one edge
     * instead of adding up.
     *
     * The text rules restated here (`p`, `ul`, headings, …) are redundant with the
     * line-height sheet, which emits them first at equal specificity. They are
     * kept because that sheet's gap is tunable and this constant's is not: if the
     * two ever disagree, the fixed behavioural rule should win.
     *
     * `hr` is deliberately not in that list. A rule between two paragraphs is a
     * separator, and giving it no margin on either side is worse than the air it
     * was given.
     *
     * The card selector is longer than the rest on purpose. A tie on specificity
     * is broken by source order, and that only works if the two declarations
     * really are a tie: the line-height sheet writes the card as
     * `:not([data-markdown-variant="compact"]) .md-code-block`, one attribute
     * heavier than a bare `.md-code-block`, so it would win the tie against the
     * short form. Naming the two classes the card element itself carries puts
     * this rule above it whatever order the tags land in.
     *
     * What this layer uniquely owns is the inner padding on the `<pre>`: the host
     * charges 16px on all four sides, this trims the vertical pair to 8px, and the
     * horizontal padding is left alone because it is what aligns the code with
     * the banner label above it. That rule is not in conflict with anything.
     */
    const TIGHT_CODE_CARD_CSS =
      '[data-chat-flow][data-chat-flow] [class*="_block_"] pre' +
      '{padding-top:8px;padding-bottom:8px}' +
      '[data-chat-flow][data-chat-flow] [class*="_markdown_"] .md-code-block.md-code-block,' +
      '[data-chat-flow][data-chat-flow] [class*="_markdown_"] :where(p,ul,ol,h1,h2,h3,h4,h5,h6,blockquote)' +
      '{margin-top:0;margin-bottom:0}' +
      '[data-chat-flow][data-chat-flow] [class*="_markdown_"] li:not(:first-child)' +
      '{margin-top:0}';

    /**
     * Shorter conversation header.
     *
     * The header is `header.wSkVaW_header` from dsh-client-ui-conversation, which
     * injects its own sheet at runtime rather than shipping in the frontend CSS
     * bundle — hence the `wSkVaW_` prefix and the runtime sheet as the source of
     * truth here. Measured at 51px: `padding:10px 28px 0 20px` from the host plus
     * `padding-bottom:10px` from its no-tabs rule, a 30px `.titleRow`
     * (`min-height:30px`), and the 1px bottom hairline.
     *
     * Two levers move it, and they are not equally safe:
     *
     *  - The 10px/10px block padding is the honest one — it is pure breathing room.
     *    Trimming each to 5px costs 10px and leaves every child's own box untouched.
     *  - `.titleRow`'s `min-height:30px` is worth only 2px (the row measures 28px on
     *    its own), so it is not worth reaching for.
     *
     * The crumb's `padding:4px 8px` and `line-height:20px` are deliberately left
     * alone: measured, they change the header by 0px. Swept in a browser, the
     * padding maps to height one-for-one (7px→45, 5px→41, 3px→37, 0→31), so the
     * only question was how much air to keep around the title; 5px leaves the text
     * clear of both the top edge and the bottom hairline.
     *
     * The `:not(:has(.wSkVaW_tabs))` guard matters. The host's own rule only floors
     * the header at 76px when a tab row is present (`showTabs = tabs.length > 1`);
     * with the guard dropped, a session that grows tabs would lose that floor and
     * the tab strip would collide with the content. Reproduced in a browser: 51px
     * normally, 76px with tabs, and this layer keeps the tabs case at 76px.
     *
     * The doubled class in the leading selector is the same trick used above: the
     * host's rules are single-class, so this outranks them whatever order the sheets
     * land in, and no `!important` is needed because the host's are not `!important`.
     */
    const TIGHT_HEADER_CSS =
      'header.wSkVaW_header.wSkVaW_header:not(:has(.wSkVaW_tabs)),' +
      /**
       * Build-independent fallback. The host's CSS-Modules hash changes between
       * releases (`wSkVaW` in rc.4, `an3WzG` in the official rc.5), but the
       * `data-conversation-tabs` attribute on the tab list does not, and the
       * header always carries a `*_titleRow` localName. While tabs exist the
       * guard keeps the host's 76px floor; without them this tightens the bar.
       */
      'header:has([class*="_titleRow"]):not(:has([data-conversation-tabs]))' +
      '{padding-top:5px;padding-bottom:5px}';

    /**
     * Optional: drop the View tab row entirely.
     *
     * The host renders a second header row (`div.wSkVaW_tabs`) only while at least
     * two Views are registered, and floors the header at 76px for exactly that
     * case (`:has(.wSkVaW_tabs)`). Hiding the row therefore takes two declarations
     * together: the row itself, and the geometry the host would have used had the
     * row never existed — `min-height: 0` plus the tighter 5px padding this bundle
     * already applies to a tab-less header, so the result is the same 41px bar.
     *
     * It is gated on `html[data-dshct-hide-view-tabs]` rather than baked in because
     * the tab row is the only in-app entry point to the other Views (Trajectory):
     * switching it on is a user's choice, not a default. The attribute is owned by
     * the settings page; the sheet itself never changes, so nothing is rebuilt when
     * the toggle flips.
     */
    const HIDE_TABS_CSS =
      `html[${HIDE_TABS_ATTR}] header.wSkVaW_header .wSkVaW_tabs{display:none}` +
      /**
       * The row is the element whose direct child carries the stable
       * `data-conversation-tabs` attribute; the header is any `<header>` holding
       * it. Both rules are hash-agnostic, so rc.4 (`wSkVaW`) and rc.5 (`an3WzG`)
       * behave the same.
       */
      `html[${HIDE_TABS_ATTR}] header :has(> [data-conversation-tabs]){display:none}` +
      `html[${HIDE_TABS_ATTR}] header:has([data-conversation-tabs])` +
      '{min-height:0;padding-top:5px;padding-bottom:5px}' +
      `html[${HIDE_TABS_ATTR}] header.wSkVaW_header.wSkVaW_header` +
      '{min-height:0;padding-top:5px;padding-bottom:5px}';

    /**
     * Optional: squeeze the conversation header down to its content.
     *
     * The 5px block padding above is pure breathing room; the comment above the
     * tight-header sheet records the measured sweep — 5px→41, 3px→37, 0→31 — so
     * zeroing it recovers 10px without touching any child's own box. That matters
     * here: the title's font size and the “standard mode” pill are deliberately
     * left alone, so the bar gets shorter, not smaller.
     *
     * The triple class is only about ordering. `HIDE_TABS_CSS` also declares the
     * padding on a two-class selector, and both sheets are static; a third class
     * keeps this one winning whatever order the tags land in, and still loses no
     * `!important` arms race with the host.
     *
     * `min-height` is not in this sheet on purpose: with the tab row visible the
     * host floors the header at 76px, and that floor is what keeps the strip from
     * colliding with the content. Here the padding simply tightens; the floor
     * still holds.
     */
    const COMPACT_HEADER_CSS =
      `html[${COMPACT_HEADER_ATTR}] header.wSkVaW_header.wSkVaW_header.wSkVaW_header` +
      '{padding-top:0;padding-bottom:0}' +
      /**
       * Same rule for builds whose hash is not `wSkVaW`; the doubled `:has()`
       * keeps it above `HIDE_TABS_CSS`'s padding whatever order the tags land in.
       */
      `html[${COMPACT_HEADER_ATTR}] header:has([data-conversation-tabs]):has([data-conversation-tabs])` +
      '{padding-top:0;padding-bottom:0}';

    /**
     * The Settings dialog re-laid out as a page of the frame.
     *
     * The shell (dsh-client-ui-settings-general, `SettingsPanel`) portals
     * `overlay > mask + panel` onto `document.body`: an `inset:0` flex layer
     * that centres a fixed 800x800 rounded card over a blurred mask, with the
     * card's two columns pinned at `188px minmax(0,1fr)`. Nothing in the shell
     * exposes that geometry, but two hooks are stable across builds: the
     * wrapper's `role="presentation"` and the panel's
     * `data-shortcut-modal="settings"` (the class names are CSS-module hashes
     * that change whenever the shell is rebuilt).
     *
     * So this sheet keeps the shell's DOM and behaviour and only overrides
     * geometry: the mask goes away, the panel covers the frame from just below
     * the native title bar (`--dsh-frame-chrome-top`, the same variable the
     * shell's own mask insets by) and the nav column scales with the window
     * instead of sitting at a fixed 188px. Closing still works through the
     * header button and Escape - `useModalLayer` owns the Escape listener, not
     * the mask.
     *
     * Below 900px the shell's own mobile layout takes over (its breakpoint is
     * 767px), so phone and narrow-window behaviour are untouched; between 768
     * and 899 the stock centred card stays.
     */
    const MERGED_CSS =
      '@media (min-width:900px){' +
      'body div[role="presentation"]:has(> div[data-shortcut-modal="settings"])' +
      '{display:block;background:none}' +
      'body div[role="presentation"]:has(> div[data-shortcut-modal="settings"])>[aria-hidden="true"]' +
      '{display:none}' +
      'div[data-shortcut-modal="settings"]' +
      '{position:fixed;inset:var(--dsh-frame-chrome-top,0px) 0 0 0;' +
      'width:auto;height:auto;max-width:none;max-height:none;' +
      'border-radius:0;box-shadow:none;' +
      'grid-template-columns:clamp(180px,17vw,250px) minmax(0,1fr)}' +
      'div[data-shortcut-modal="settings"]>div:last-child' +
      '{padding-inline:clamp(20px,3vw,40px)}' +
      'div[data-shortcut-modal="settings"]>div:last-child>*' +
      '{max-width:980px;margin-inline:auto}' +
      '}';

    /** Create or reuse this bundle's own style tag for one sheet id. */
    function mountStyle(id, css) {
      let tag = document.querySelector(`style[data-plugin-css=${JSON.stringify(id)}]`);
      if (tag === null) {
        tag = document.createElement('style');
        tag.dataset.plugin = PKG;
        tag.dataset.pluginCss = id;
        document.head.appendChild(tag);
      }
      tag.textContent = css;
      return tag;
    }

    /** Remove a style tag this bundle owns. */
    function unmountStyle(tag) {
      if (tag !== null && tag.parentNode !== null) tag.parentNode.removeChild(tag);
    }

    /**
     * Resolve one of this bundle's host routes against the page's own base.
     *
     * The host UI anchors its API paths on `document.baseURI`; the desktop shell
     * loads the SPA from a file-like origin, where a hard-coded `/` path is not
     * necessarily reachable, while a base-relative path lands on the same route
     * as in the browser GUI.
     */
    function apiPath(path) {
      const relative = String(path).replace(/^\/+/, '');
      if (typeof document === 'undefined' || typeof document.baseURI !== 'string') return `/${relative}`;
      try {
        return new URL(relative, document.baseURI).pathname;
      } catch (_noBase) {
        return `/${relative}`;
      }
    }

    /**
     * This section's glyph in the Settings nav.
     *
     * The shell draws a row's icon itself: `navIcon(id)` in
     * dsh-client-ui-settings-general maps five built-in ids to their icons and
     * falls back to the settings gear, so this section used to share the gear
     * with the general section. The shell docks an extension seat for exactly
     * this: `settings.section.icon` is a root list slot whose registrant
     * id must equal the target `settings.section` id, rendered inside the row's
     * icon span in place of the default glyph and receiving `{ size, active }`.
     * Reusing a built-in id is not an option: it would replace that section.
     *
     * Earlier revisions instead marked the row in the DOM and swapped its glyph
     * through a mask. That made TWO icons appear: the shell wraps its glyph in
     * `<span class="navIcon">`, so a selector aimed at the button's direct
     * children hid nothing while the injected pseudo-element took its own flex
     * slot beside the gear. Nothing in this file touches that markup now.
     */
    /** The nav glyph's drawing box, in CSS pixels; the shell asks for 16. */
    const NAV_GLYPH_SIZE = 16;
    /**
     * Slot seat for the nav glyph.
     *
     * The shell hands over `{ size, active }`; the drawing scales with `size`
     * and the stroke keeps the row's own colour through `currentColor`, so the
     * hover and active states paint themselves and the glyph never needs a
     * stylesheet of its own.
     * @param props - icon owner props supplied by the Settings shell.
     * @returns the glyph, sized to the seat.
     */
    function NavGlyph({ size }) {
      const box = typeof size === 'number' && size > 0 ? size : NAV_GLYPH_SIZE;
      return h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          viewBox: '0 0 16 16',
          width: box,
          height: box,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('path', { d: 'M2.6 4.6h10.8' }),
        h('path', { d: 'M2.6 8h10.8' }),
        h('path', { d: 'M2.6 11.4h6.6' }),
      );
    }

    /** One labelled preference row. */
    function Row({ title, desc, block, children }) {
      return h(
        'div',
        { className: block === true ? 'dshct-row dshct-rowWide' : 'dshct-row' },
        h(
          'div',
          { className: 'dshct-rowText' },
          h('div', { className: 'dshct-rowTitle' }, title),
          desc === undefined ? null : h('div', { className: 'dshct-rowDesc' }, desc),
        ),
        h('div', { className: 'dshct-control' }, children),
      );
    }

    /**
     * Build the settings page component.
     * @param deps - the live store plus the actions and translate bound by the plugin.
     * @returns the section component registered into `settings.section`.
     */
    function createSection(deps) {
      const {
        ctx,
        t,
        store,
        setLineHeight,
        setGutter,
        setHideTabs,
        setCompactHeader,
        setTerminalFollow,
        reset,
        canWriteFamily,
      } = deps;
      const { subscribe, getSnapshot } = store;
      /** Clamp one typed size into the role's range and write it to the theme. */
      const setSize = (role, value) => {
        const spec = FONT_SIZE_SPECS[role];
        ctx.theme.setFontSize(role, Math.min(spec.max, Math.max(spec.min, Math.round(value))));
      };
      const commitFamily = (role, value) => {
        ctx.theme.setFontFamily(role, value);
      };
      /** The height the desktop app reads right now, 28, or null when unknown. */
      const TARGET_TITLEBAR_HEIGHT = 28;
      return function ChatTypographySection() {
        const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
        /**
         * Read the archive's state once, on mount.
         *
         * The Host half is the only part that can look inside `app.asar`; the
         * answer also says whether it can write the two literals right now, and
         * that is what decides whether the button is offered at all.
         */
        const [survey, setSurvey] = useState(null);
        useEffect(() => {
          let live = true;
          fetch(apiPath('/chat-typography/api/windows-titlebar'), { headers: { accept: 'application/json' } })
            .then((response) => response.json())
            .then((data) => {
              if (live && data && typeof data === 'object') setSurvey(data);
            })
            .catch(() => {
              if (live) setSurvey({ ok: false, code: 'not-desktop' });
            });
          return () => {
            live = false;
          };
        }, []);
        /** The last write result, cleared as soon as a new attempt starts. */
        const [write, setWrite] = useState({ busy: false, code: null, message: null });
        const atTarget = survey?.ok === true && survey.height === TARGET_TITLEBAR_HEIGHT;
        const canWrite = survey?.ok === true && survey.writable === true && !atTarget;
        const writeTitlebar = () => {
          if (!canWrite || write.busy) return;
          setWrite({ busy: true, code: null, message: null });
          fetch(apiPath('/chat-typography/api/windows-titlebar'), {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-dshct-action': 'titlebar' },
            body: JSON.stringify({ height: TARGET_TITLEBAR_HEIGHT }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data?.ok === true) {
                setSurvey({ ok: true, height: TARGET_TITLEBAR_HEIGHT, writable: survey.writable });
                setWrite({
                  busy: false,
                  code: null,
                  message: data.already === true ? t('titlebarAlready') : t('titlebarPatched'),
                });
                return;
              }
              const code = typeof data?.code === 'string' ? data.code : 'unknown';
              setWrite({ busy: false, code, message: null });
            })
            .catch(() => {
              setWrite({ busy: false, code: 'unknown', message: null });
            });
        };
        /**
         * One line describing what is true now: the last write, the stored
         * height, whether it already matches, or why the archive is unreachable.
         */
        const titlebarStatus = () => {
          if (write.message !== null) return write.message;
          if (write.code !== null) {
            if (write.code === 'not-desktop') return t('titlebarNotDesktop');
            if (write.code === 'no-marker') return t('titlebarNoMarker');
            if (write.code === 'io' || write.code === 'unreadable') return t('titlebarNoAccess');
            return t('titlebarFailed');
          }
          if (survey === null) return t('titlebarReading');
          if (!survey.ok) {
            if (survey.code === 'no-marker') return t('titlebarNoMarker');
            if (survey.code === 'unreadable' || survey.code === 'io') return t('titlebarNoAccess');
            return t('titlebarNotDesktop');
          }
          if (atTarget) return t('titlebarAlready');
          return t('titlebarCurrent')(survey.height);
        };
        /** Read a number field, or put the field back when it holds no number. */
        const readNumber = (input, shown) => {
          const raw = input.value.trim();
          const parsed = raw === '' ? Number.NaN : Number(raw);
          if (Number.isNaN(parsed)) {
            input.value = shown;
            return null;
          }
          return parsed;
        };
        const commitSize = (role, input) => {
          const spec = FONT_SIZE_SPECS[role];
          const parsed = readNumber(input, String(snapshot.fontSizes[role]));
          if (parsed === null) return;
          setSize(role, parsed);
          input.value = String(Math.min(spec.max, Math.max(spec.min, Math.round(parsed))));
        };
        const commitLineHeight = (input) => {
          const parsed = readNumber(input, snapshot.lineHeight.toFixed(2));
          if (parsed === null) return;
          const next = normalizeLineHeight(parsed);
          input.value = next.toFixed(2);
          setLineHeight(next);
        };
        /* An empty field is a real choice here — it hands the width back to the host. */
        const commitGutter = (input) => {
          const raw = input.value.trim();
          if (raw === '') {
            setGutter(null);
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) {
            input.value = snapshot.gutter === null ? '' : String(snapshot.gutter);
            return;
          }
          const next = normalizeGutter(parsed);
          input.value = next === null ? '' : String(next);
          setGutter(next);
        };
        const sizeRows = [
          h(
            Row,
            { key: 'size-text', title: t('roleText'), desc: t('sizeTextDesc') },
            h('input', {
              /* Keyed by the live value so a change made outside repaints the field. */
              key: `size-text:${snapshot.fontSizes.text}:${snapshot.resetVersion}`,
              className: 'dshct-input dshct-number',
              type: 'number',
              min: FONT_SIZE_SPECS.text.min,
              max: FONT_SIZE_SPECS.text.max,
              step: 1,
              defaultValue: String(snapshot.fontSizes.text),
              'aria-label': t('roleText'),
              onBlur: (event) => commitSize('text', event.target),
              onKeyDown: (event) => {
                if (event.key === 'Enter') commitSize('text', event.currentTarget);
              },
            }),
            h('span', { className: 'dshct-unit' }, 'px'),
          ),
          h(
            Row,
            { key: 'size-terminal', title: t('roleTerminal'), desc: t('sizeTerminalDesc') },
            h('input', {
              /* Disabled while the size follows the body, and re-keyed when it stops. */
              key: `size-terminal:${snapshot.fontSizes.terminal}:${snapshot.terminalFollow}:${snapshot.resetVersion}`,
              className: 'dshct-input dshct-number',
              type: 'number',
              min: FONT_SIZE_SPECS.terminal.min,
              max: FONT_SIZE_SPECS.terminal.max,
              step: 1,
              defaultValue: String(snapshot.fontSizes.terminal),
              disabled: snapshot.terminalFollow,
              'aria-label': t('roleTerminal'),
              onBlur: (event) => commitSize('terminal', event.target),
              onKeyDown: (event) => {
                if (event.key === 'Enter') commitSize('terminal', event.currentTarget);
              },
            }),
            h('span', { className: 'dshct-unit' }, 'px'),
          ),
          h(
            Row,
            { key: 'terminal-follow', title: t('terminalFollowTitle'), desc: t('terminalFollowDesc') },
            h('input', {
              className: 'dshct-checkbox',
              type: 'checkbox',
              checked: snapshot.terminalFollow,
              'aria-label': t('terminalFollowTitle'),
              onChange: (event) => setTerminalFollow(event.target.checked),
            }),
          ),
        ];
        const familyRows = canWriteFamily
          ? ROLES.map((role) =>
              h(
                Row,
                { key: `family-${role}`, title: t(ROLE_LABEL[role]), desc: t(FAMILY_DESC[role]) },
                h('input', {
                  /* Keyed by the reset counter so a reset remounts the field. */
                  key: `${role}:${snapshot.resetVersion}`,
                  className: 'dshct-input dshct-family',
                  type: 'text',
                  defaultValue: snapshot.fontFamilies[role] ?? '',
                  placeholder: t('familyPlaceholder'),
                  spellCheck: false,
                  'aria-label': t(ROLE_LABEL[role]),
                  onBlur: (event) => commitFamily(role, event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') commitFamily(role, event.currentTarget.value);
                  },
                }),
              ),
            )
          : [];
        const tailRows = [
          h(
            Row,
            { key: 'line-height', title: t('lineHeightTitle'), desc: t('lineHeightDesc') },
            h('input', {
              /* Keyed by the live value so the reset button repaints the field. */
              key: `line-height:${snapshot.lineHeight}:${snapshot.resetVersion}`,
              className: 'dshct-input dshct-number',
              type: 'number',
              min: LH_MIN,
              max: LH_MAX,
              step: 1 / LH_STEPS,
              defaultValue: snapshot.lineHeight.toFixed(2),
              'aria-label': t('lineHeightTitle'),
              onBlur: (event) => commitLineHeight(event.target),
              onKeyDown: (event) => {
                if (event.key === 'Enter') commitLineHeight(event.currentTarget);
              },
            }),
            h('span', { className: 'dshct-unit' }, '×'),
          ),
          h(
            Row,
            { key: 'reset', title: t('reset'), desc: t('resetDesc') },
            h('button', { className: 'dshct-button', type: 'button', onClick: reset }, t('resetAction')),
          ),
        ];
        const layoutRows = [
          h(
            Row,
            { key: 'gutter', title: t('gutterTitle'), desc: t('gutterDesc') },
            h('input', {
              /* Keyed by the live value so a reset repaints the field. */
              key: `gutter:${snapshot.gutter}:${snapshot.resetVersion}`,
              className: 'dshct-input dshct-number',
              type: 'number',
              min: GUTTER_MIN,
              max: GUTTER_MAX,
              step: 1,
              defaultValue: snapshot.gutter === null ? '' : String(snapshot.gutter),
              placeholder: t('gutterPlaceholder'),
              'aria-label': t('gutterTitle'),
              onBlur: (event) => commitGutter(event.target),
              onKeyDown: (event) => {
                if (event.key === 'Enter') commitGutter(event.currentTarget);
              },
            }),
            h('span', { className: 'dshct-unit' }, 'px'),
          ),
          h(
            Row,
            { key: 'hide-tabs', title: t('hideTabsTitle'), desc: t('hideTabsDesc') },
            h('input', {
              className: 'dshct-checkbox',
              type: 'checkbox',
              checked: snapshot.hideTabs,
              'aria-label': t('hideTabsTitle'),
              onChange: (event) => setHideTabs(event.target.checked),
            }),
          ),
          h(
            Row,
            { key: 'compact-header', title: t('compactHeaderTitle'), desc: t('compactHeaderDesc') },
            h('input', {
              className: 'dshct-checkbox',
              type: 'checkbox',
              checked: snapshot.compactHeader,
              'aria-label': t('compactHeaderTitle'),
              onChange: (event) => setCompactHeader(event.target.checked),
            }),
          ),
          h(
            Row,
            { key: 'desktop-titlebar', title: t('titlebarTitle'), desc: t('titlebarDesc') },
            h(
              'div',
              { className: 'dshct-titlebar' },
              h(
                'button',
                {
                  className: 'dshct-write',
                  type: 'button',
                  disabled: !canWrite || write.busy,
                  onClick: writeTitlebar,
                },
                write.busy ? t('titlebarBusy') : t('titlebarAction'),
              ),
              h('div', { className: 'dshct-titlebarStatus', role: 'status' }, titlebarStatus()),
            ),
          ),
        ];
        return h(
          'div',
          { className: 'dshct-section' },
          h('h2', { className: 'dshct-title' }, t('title')),
          h('p', { className: 'dshct-desc' }, t('desc')),
          h('div', { className: 'dshct-group' }, h('div', { className: 'dshct-groupTitle' }, t('groupFontSize')), sizeRows),
          canWriteFamily
            ? h(
                'div',
                { className: 'dshct-group' },
                h('div', { className: 'dshct-groupTitle' }, t('groupFontFamily')),
                familyRows,
              )
            : null,
          h('div', { className: 'dshct-group' }, h('div', { className: 'dshct-groupTitle' }, t('groupLineHeight')), tailRows),
          h('div', { className: 'dshct-group' }, h('div', { className: 'dshct-groupTitle' }, t('groupLayout')), layoutRows),
        );
      };
    }

    return {
      inject: ['slots', 'locale', 'theme'],
      apply(ctx) {
        const t = ctx.locale.bind(NS);
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'chat-typography: copy dictionaries');
        ctx.effect(() => {
          const tag = mountStyle(PAGE_STYLE_ID, PAGE_CSS);
          return () => unmountStyle(tag);
        }, 'chat-typography: page styles');
        ctx.effect(() => {
          const tag = mountStyle(MERGED_STYLE_ID, MERGED_CSS);
          return () => unmountStyle(tag);
        }, 'chat-typography: merged settings layout');
        ctx.effect(() => {
          const tag = mountStyle(WRAP_STYLE_ID, WRAP_CSS);
          return () => unmountStyle(tag);
        }, 'chat-typography: copy wrapping');

        /** Font-family writes ride an undocumented Theme method; guard for it. */
        const canWriteFamily = typeof ctx.theme.setFontFamily === 'function';

        let lineHeight = readLineHeight();
        let gutter = readGutter();
        let hideTabs = readHideTabs();
        let compactHeader = readCompactHeader();
        let terminalFollow = readTerminalFollow();
        let resetVersion = 0;
        let version = 0;
        let cache = null;
        const listeners = new Set();
        const bump = () => {
          version += 1;
          for (const listener of listeners) listener();
        };
        const store = {
          subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
          },
          getSnapshot() {
            if (cache !== null && cache.version === version) return cache;
            const theme = ctx.theme.getTheme();
            cache = {
              version,
              fontSizes: { ...theme.fontSizes },
              fontFamilies: { ...theme.fontFamilies },
              lineHeight,
              gutter,
              hideTabs,
              compactHeader,
              terminalFollow,
              resetVersion,
            };
            return cache;
          },
        };

        let lhTag = null;
        /**
         * The sheet is rewritten whenever the multiplier changes, and it is never
         * left empty: at 1.00 the line boxes match the host's own, but the gaps
         * are still collapsed onto one value, which is the point of this page.
         */
        const renderLineHeight = () => {
          if (lhTag === null) return;
          lhTag.textContent = lineHeightCss(lineHeight);
        };
        ctx.effect(() => {
          lhTag = mountStyle(LH_STYLE_ID, '');
          renderLineHeight();
          return () => {
            unmountStyle(lhTag);
            lhTag = null;
          };
        }, 'chat-typography: line-height layer');

        let gutterTag = null;
        /** The two sheets `hoistAfterRhythm` keeps after the rhythm layer. */
        let tableTag = null;
        let codeCardTag = null;
        /** Same deal as the line-height sheet: rewritten whenever the value changes. */
        const renderGutter = () => {
          if (gutterTag === null) return;
          gutterTag.textContent = gutterCss(gutter);
        };
        ctx.effect(() => {
          gutterTag = mountStyle(GUTTER_STYLE_ID, '');
          renderGutter();
          return () => {
            unmountStyle(gutterTag);
            gutterTag = null;
          };
        }, 'chat-typography: side-gutter layer');

        /**
         * The two layers whose declarations must land after the rhythm sheet's.
         *
         * Most tightening rules out-rank the rhythm sheet on specificity alone and
         * need no help. The table cells do not: their padding shorthand is two
         * selectors deep, exactly like the line-height sheet's
         * `:not([data-markdown-variant="compact"])` prefix, and a tie between them
         * is broken by source order. The table layer wins today only because its
         * `ctx.effect` happens to run after the rhythm sheet's — an accident of
         * registration order that survives a page load but not a rebuild, since a
         * changed sheet moves its tag to the end of `<head>`.
         *
         * Moving both tags to the end of the document on every rhythm change makes
         * the order say what the code means. Only these two: the header layer is
         * left where it is because its selector carries two classes and never
         * ties, and keeping the set small keeps the cost of re-appending to a
         * no-op when nothing else moved.
         */
        const hoistAfterRhythm = () => {
          for (const tag of [tableTag, codeCardTag]) {
            if (tag !== null && tag.parentNode === document.head) {
              document.head.appendChild(tag);
            }
          }
        };

        const setLineHeight = (value) => {
          lineHeight = normalizeLineHeight(value);
          writeLineHeight(lineHeight);
          renderLineHeight();
          hoistAfterRhythm();
          bump();
        };
        const setGutter = (value) => {
          gutter = normalizeGutter(value);
          writeGutter(gutter);
          renderGutter();
          bump();
        };
        /** Mirror the stored flag onto the root element the sheet keys off. */
        const applyHideTabs = () => {
          if (typeof document === 'undefined') return;
          if (hideTabs) document.documentElement.setAttribute(HIDE_TABS_ATTR, '');
          else document.documentElement.removeAttribute(HIDE_TABS_ATTR);
        };
        const setHideTabs = (value) => {
          hideTabs = Boolean(value);
          writeHideTabs(hideTabs);
          applyHideTabs();
          bump();
        };
        /** Mirror the stored compact-header flag onto the root element. */
        const applyCompactHeader = () => {
          if (typeof document === 'undefined') return;
          if (compactHeader) document.documentElement.setAttribute(COMPACT_HEADER_ATTR, '');
          else document.documentElement.removeAttribute(COMPACT_HEADER_ATTR);
        };
        const setCompactHeader = (value) => {
          compactHeader = Boolean(value);
          writeCompactHeader(compactHeader);
          applyCompactHeader();
          bump();
        };
        /**
         * Copy the body size onto the terminal while the follow switch is on.
         *
         * The terminal role is the sidebar terminal's cell size, and it is a
         * separate Theme field — nothing in the host ties it to the body. Follow
         * mode is therefore a one-way mirror: read `text`, clamp it into the
         * terminal range (10–20), write `terminal`. Writing only when the two
         * differ keeps this idempotent, because the write itself emits
         * `theme/change` and lands right back here.
         */
        const syncTerminalFollow = () => {
          if (!terminalFollow) return;
          const spec = FONT_SIZE_SPECS.terminal;
          const sizes = ctx.theme.getTheme().fontSizes;
          const target = Math.min(spec.max, Math.max(spec.min, Math.round(sizes.text)));
          if (sizes.terminal === target) return;
          ctx.theme.setFontSize('terminal', target);
        };
        const setTerminalFollow = (value) => {
          terminalFollow = Boolean(value);
          writeTerminalFollow(terminalFollow);
          syncTerminalFollow();
          bump();
        };
        const reset = () => {
          for (const role of ROLES) {
            ctx.theme.setFontSize(role, FONT_SIZE_SPECS[role].fallback);
            if (canWriteFamily) ctx.theme.setFontFamily(role, '');
          }
          resetVersion += 1;
          setLineHeight(LH_FALLBACK);
          setGutter(null);
          setHideTabs(false);
          setCompactHeader(false);
          setTerminalFollow(false);
        };

        /**
         * Two of the tightenings below change a computed value: the card's zero
         * margin and the table's zero vertical margin. Neither needs to out-rank
         * the rhythm sheet, because the selector on each is the heavier one.
         */
        ctx.effect(() => {
          const tag = mountStyle(FLAT_SIZE_STYLE_ID, FLAT_SIZE_CSS);
          return () => unmountStyle(tag);
        }, 'chat-typography: uniform font size');

        ctx.effect(() => {
          const tag = mountStyle(BARE_CODE_STYLE_ID, BARE_CODE_CSS);
          return () => unmountStyle(tag);
        }, 'chat-typography: bare inline code');

        ctx.effect(() => {
          const tag = mountStyle(ENCLOSED_STYLE_ID, ENCLOSED_CSS);
          return () => unmountStyle(tag);
        }, 'chat-typography: enclosed symbols');

        ctx.effect(() => {
          tableTag = mountStyle(TIGHT_TABLE_STYLE_ID, TIGHT_TABLE_CSS);
          hoistAfterRhythm();
          return () => {
            unmountStyle(tableTag);
            tableTag = null;
          };
        }, 'chat-typography: tight table cells');

        ctx.effect(() => {
          codeCardTag = mountStyle(TIGHT_CODE_CARD_STYLE_ID, TIGHT_CODE_CARD_CSS);
          hoistAfterRhythm();
          return () => {
            unmountStyle(codeCardTag);
            codeCardTag = null;
          };
        }, 'chat-typography: tight code card');

        ctx.effect(() => {
          const tag = mountStyle(TIGHT_HEADER_STYLE_ID, TIGHT_HEADER_CSS);
          return () => unmountStyle(tag);
        }, 'chat-typography: tight header');

        ctx.effect(() => {
          const tag = mountStyle(HIDE_TABS_STYLE_ID, HIDE_TABS_CSS);
          applyHideTabs();
          return () => {
            unmountStyle(tag);
            if (typeof document !== 'undefined') {
              document.documentElement.removeAttribute(HIDE_TABS_ATTR);
            }
          };
        }, 'chat-typography: hide view tabs');

        ctx.effect(() => {
          const tag = mountStyle(COMPACT_HEADER_STYLE_ID, COMPACT_HEADER_CSS);
          applyCompactHeader();
          return () => {
            unmountStyle(tag);
            if (typeof document !== 'undefined') {
              document.documentElement.removeAttribute(COMPACT_HEADER_ATTR);
            }
          };
        }, 'chat-typography: compact header');

        /**
         * Keep the terminal on the body size while follow mode is on.
         *
         * One subscription carries both jobs: follow mode needs every
         * `theme/change` (the body size may have moved in Appearance, or the
         * terminal role was written elsewhere), and the page needs to repaint.
         * The first run happens at mount, because a page loaded with follow
         * already on has to catch up with a body size that changed while it was
         * closed.
         */
        ctx.effect(() => {
          syncTerminalFollow();
          return ctx.on('theme/change', () => {
            syncTerminalFollow();
            bump();
          });
        }, 'chat-typography: theme subscription');

        const Section = createSection({
          ctx,
          t,
          store,
          setLineHeight,
          setGutter,
          setHideTabs,
          setCompactHeader,
          setTerminalFollow,
          reset,
          canWriteFamily,
        });
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            { name: 'settings.section', id: 'chat-typography', order: 20, label: () => t('nav'), locale: NS },
            Section,
          ),
        );

        /* The shell keeps its gear until an icon carries this section's exact id. */
        ctx.slots.inject('settings.section.icon', () =>
          ctx.slots.register(
            { name: 'settings.section.icon', id: 'chat-typography', order: 20 },
            NavGlyph,
          ),
        );
      },
    };
  },
});
