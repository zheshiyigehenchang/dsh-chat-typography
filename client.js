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
    const { useSyncExternalStore } = React;

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
      sizeTextDesc: '会话界面所有文字都使用这一个字号：标题、正文、代码与终端一起变化。',
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
      sizeTextDesc: 'One size for every run of text in the conversation: headings, body, code and terminal all follow it.',
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

    /** Page chrome, drawn with theme tokens so both color schemes read correctly. */
    const PAGE_CSS = [
      '.dshct-section{max-width:720px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:8px}',
      '.dshct-title{margin:0;font-size:16px;font-weight:500;line-height:24px}',
      '.dshct-desc{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}',
      '.dshct-group{display:flex;flex-direction:column;margin-top:8px}',
      '.dshct-groupTitle{margin-bottom:2px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px}',
      '.dshct-row{display:flex;align-items:center;gap:8px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}',
      '.dshct-row:last-child{border-bottom:none}',
      '.dshct-rowText{display:flex;flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:32px}',
      '.dshct-rowTitle{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}',
      '.dshct-rowDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dshct-control{display:inline-flex;align-items:center;gap:10px}',
      '.dshct-unit{min-width:20px;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:22px}',
      '.dshct-input{box-sizing:border-box;width:210px;height:36px;padding:0 10px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px}',
      '.dshct-input.dshct-number{width:96px;font-variant-numeric:tabular-nums}',
      '.dshct-input:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}',
      '.dshct-button{height:36px;padding:0 16px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:14px;cursor:pointer}',
      '.dshct-button:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshct-button:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}',
    ].join('');

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
     * 16px of gutter between columns plus 10px above and below every line, which
     * makes a short table drift apart vertically.
     *
     * The vertical trim is the half that matters, and it goes all the way to zero.
     * The line-height sheet puts every row on the same 20.8px line box as the
     * prose, so a table only matches the text grid around it if the cell adds no
     * height of its own: any vertical padding makes each row taller than a line
     * of text, and a table is the one block a reader compares against the
     * paragraphs nearest to it. Rows stay apart because each cell keeps its own
     * `border-bottom`. Measured at a 1.30 rhythm, zero gives a 25px row step
     * against 33px at the 5px it used to carry.
     *
     * The horizontal 8px is untouched; the 16px the host charges between columns
     * is the one thing that keeps a dense table readable.
     *
     * Trimming the shorthand alone would not be enough. The host's edge rules are two
     * classes deep at most, so this layer's doubled attribute selector outranks them
     * and `padding: 0 8px` would silently re-indent the first and last columns,
     * undoing the flush edges the host deliberately set. Those two edges are
     * therefore restored by hand, with the same `:first-child` / `:last-child` shape
     * the host uses.
     */
    const TIGHT_TABLE_CSS =
      '[data-chat-flow][data-chat-flow] [class*="_tableScroll_"] :is(th,td)' +
      '{padding:0 8px}' +
      '[data-chat-flow][data-chat-flow] [class*="_tableScroll_"] :is(th,td):first-child' +
      '{padding-left:0}' +
      '[data-chat-flow][data-chat-flow] [class*="_tableScroll_"] td:last-child' +
      '{padding-right:0}';

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
      'header.wSkVaW_header.wSkVaW_header:not(:has(.wSkVaW_tabs))' +
      '{padding-top:5px;padding-bottom:5px}';

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

    /** One labelled preference row. */
    function Row({ title, desc, children }) {
      return h(
        'div',
        { className: 'dshct-row' },
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
      const { ctx, t, store, setLineHeight, setGutter, reset, canWriteFamily } = deps;
      const { subscribe, getSnapshot } = store;
      /** Clamp one typed size into the role's range and write it to the theme. */
      const setSize = (role, value) => {
        const spec = FONT_SIZE_SPECS[role];
        ctx.theme.setFontSize(role, Math.min(spec.max, Math.max(spec.min, Math.round(value))));
      };
      const commitFamily = (role, value) => {
        ctx.theme.setFontFamily(role, value);
      };
      return function ChatTypographySection() {
        const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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
        ];
        const familyRows = canWriteFamily
          ? ROLES.map((role) =>
              h(
                Row,
                { key: `family-${role}`, title: t(ROLE_LABEL[role]), desc: t(FAMILY_DESC[role]) },
                h('input', {
                  /* Keyed by the reset counter so a reset remounts the field. */
                  key: `${role}:${snapshot.resetVersion}`,
                  className: 'dshct-input',
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

        /** Font-family writes ride an undocumented Theme method; guard for it. */
        const canWriteFamily = typeof ctx.theme.setFontFamily === 'function';

        let lineHeight = readLineHeight();
        let gutter = readGutter();
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

        const setLineHeight = (value) => {
          lineHeight = normalizeLineHeight(value);
          writeLineHeight(lineHeight);
          renderLineHeight();
          bump();
        };
        const setGutter = (value) => {
          gutter = normalizeGutter(value);
          writeGutter(gutter);
          renderGutter();
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
          const tag = mountStyle(TIGHT_TABLE_STYLE_ID, TIGHT_TABLE_CSS);
          return () => unmountStyle(tag);
        }, 'chat-typography: tight table cells');

        ctx.effect(() => {
          const tag = mountStyle(TIGHT_CODE_CARD_STYLE_ID, TIGHT_CODE_CARD_CSS);
          return () => unmountStyle(tag);
        }, 'chat-typography: tight code card');

        ctx.effect(() => {
          const tag = mountStyle(TIGHT_HEADER_STYLE_ID, TIGHT_HEADER_CSS);
          return () => unmountStyle(tag);
        }, 'chat-typography: tight header');

        ctx.effect(() => ctx.on('theme/change', bump), 'chat-typography: theme subscription');

        const Section = createSection({ ctx, t, store, setLineHeight, setGutter, reset, canWriteFamily });
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            { name: 'settings.section', id: 'chat-typography', order: 20, label: () => t('nav'), locale: NS },
            Section,
          ),
        );
      },
    };
  },
});
