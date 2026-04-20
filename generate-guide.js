const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  PageOrientation, LevelFormat,
} = require("docx");
const fs = require("fs");

// ── Palette: Deep Cyan (DM-1) — AI, tech proposals, digital ──
const P = {
  primary: "FFFFFF",
  body: "1A2B40",
  secondary: "6878A0",
  accent: "37DCF2",
  surface: "F4F8FC",
  bg: "162235",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "1B6B7A", headerText: "FFFFFF", accentLine: "1B6B7A", innerLine: "C8DDE2", surface: "EDF3F5" },
};
const c = (hex) => hex.replace("#", "");

// ── Cover Recipe R4: Top Color Block ──
function buildCover(config) {
  const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

  // calcTitleLayout
  const maxWidthTwips = 11906 - 1701 - 1417; // ~8788
  const charWidth = (pt) => pt * 20;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = 40;
  let titleLines;
  const title = config.title;
  while (titlePt >= 24) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    if (title.length <= cpl) { titleLines = [title]; break; }
    titlePt -= 2;
  }
  if (!titleLines) {
    titlePt = 24;
    const cpl = charsPerLine(titlePt);
    const mid = Math.ceil(title.length / 2);
    titleLines = [title.slice(0, mid), title.slice(mid)];
  }

  const colorBlockHeight = 5000;
  const bottomSpacing = 16838 - colorBlockHeight - 800;

  const titleRuns = [];
  titleLines.forEach((line, i) => {
    if (i > 0) titleRuns.push(new TextRun({ break: 1, text: "", font: { ascii: "Calibri", eastAsia: "SimHei" } }));
    titleRuns.push(new TextRun({
      text: line,
      bold: true,
      size: titlePt * 2,
      color: P.cover.titleColor,
      font: { ascii: "Calibri", eastAsia: "SimHei" },
    }));
  });

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: allNoBorders,
      rows: [
        // Color block row
        new TableRow({
          height: { value: colorBlockHeight, rule: "exact" },
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: c(P.bg) },
              borders: allNoBorders,
              verticalAlign: "top",
              children: [
                new Paragraph({ spacing: { before: 1800 } }),
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  indent: { left: 800 },
                  spacing: { line: Math.ceil(titlePt * 23), lineRule: "atLeast", after: 200 },
                  children: titleRuns,
                }),
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  indent: { left: 800 },
                  spacing: { before: 200 },
                  children: [
                    new TextRun({
                      text: config.subtitle,
                      size: 24,
                      color: P.cover.subtitleColor,
                      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        // Bottom area
        new TableRow({
          height: { value: bottomSpacing, rule: "exact" },
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: allNoBorders,
              verticalAlign: "top",
              children: [
                new Paragraph({ spacing: { before: 400 } }),
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  indent: { left: 800 },
                  children: [
                    new TextRun({
                      text: config.metaLine1,
                      size: 20,
                      color: "606060",
                      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  indent: { left: 800 },
                  spacing: { before: 100 },
                  children: [
                    new TextRun({
                      text: config.metaLine2,
                      size: 20,
                      color: "606060",
                      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];
}

// ── Heading builder ──
function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: c(P.body),
        font: { ascii: "Calibri", eastAsia: "SimHei" },
        size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 28 : 24,
      }),
    ],
  });
}

// ── Body paragraph ──
function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 420 },
    spacing: { line: 312 },
    children: [
      new TextRun({
        text,
        size: 24,
        color: c(P.body),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
      }),
    ],
  });
}

// ── Simple body paragraph (no indent) ──
function bodyNoIndent(text) {
  return new Paragraph({
    spacing: { line: 312 },
    children: [
      new TextRun({
        text,
        size: 24,
        color: c(P.body),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
      }),
    ],
  });
}

// ── Horizontal-Only Table builder ──
function buildTable(headers, rows) {
  const t = P.table;
  const borderAccent = { style: BorderStyle.SINGLE, size: 2, color: t.accentLine };
  const borderInner = { style: BorderStyle.SINGLE, size: 1, color: t.innerLine };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: borderAccent,
      bottom: borderAccent,
      left: noBorder,
      right: noBorder,
      insideHorizontal: borderInner,
      insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map((h) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: h, bold: true, size: 21, color: t.headerText, font: { ascii: "Calibri", eastAsia: "SimHei" } }),
                ],
              }),
            ],
            shading: { type: ShadingType.CLEAR, fill: t.headerBg },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
          })
        ),
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          cantSplit: true,
          children: row.map((cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: cell, size: 21, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
                  ],
                }),
              ],
              shading: ri % 2 === 0
                ? { type: ShadingType.CLEAR, fill: t.surface }
                : { type: ShadingType.CLEAR, fill: "FFFFFF" },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
            })
          ),
        })
      ),
    ],
  });
}

// ── Bullet paragraph ──
function bulletItem(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { line: 312 },
    children: [
      new TextRun({
        text,
        size: 24,
        color: c(P.body),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
      }),
    ],
  });
}

// ── Numbered list config ──
const numberingConfig = [
  {
    reference: "steps-ai",
    levels: [{
      level: 0,
      format: LevelFormat.DECIMAL,
      text: "%1.",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } },
    }],
  },
  {
    reference: "steps-preset",
    levels: [{
      level: 0,
      format: LevelFormat.DECIMAL,
      text: "%1.",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } },
    }],
  },
  {
    reference: "steps-custom",
    levels: [{
      level: 0,
      format: LevelFormat.DECIMAL,
      text: "%1.",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } },
    }],
  },
  {
    reference: "steps-outfit",
    levels: [{
      level: 0,
      format: LevelFormat.DECIMAL,
      text: "%1.",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } },
    }],
  },
  {
    reference: "tips-ai",
    levels: [{
      level: 0,
      format: LevelFormat.DECIMAL,
      text: "%1.",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } },
    }],
  },
];

function numberedItem(ref, text) {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { line: 312 },
    children: [
      new TextRun({
        text,
        size: 24,
        color: c(P.body),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
      }),
    ],
  });
}

// ── Tip paragraph ──
function tipParagraph(text) {
  return new Paragraph({
    indent: { left: 400 },
    spacing: { line: 312, before: 60, after: 60 },
    children: [
      new TextRun({
        text: "\u2611 ",
        size: 22,
        color: c(P.accent),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
      }),
      new TextRun({
        text: text,
        size: 22,
        color: "506070",
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
        italics: true,
      }),
    ],
  });
}

// ── Warn paragraph ──
function warnParagraph(text) {
  return new Paragraph({
    indent: { left: 400 },
    spacing: { line: 312, before: 60, after: 60 },
    children: [
      new TextRun({
        text: "\u26A0 ",
        size: 22,
        color: "D4875A",
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
      }),
      new TextRun({
        text: text,
        size: 22,
        color: "506070",
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
      }),
    ],
  });
}

// ── Build Document ──
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
          size: 24,
          color: c(P.body),
        },
        paragraph: {
          spacing: { line: 312 },
        },
      },
      heading1: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 32, bold: true, color: c(P.body) },
        paragraph: { spacing: { before: 360, after: 160, line: 312 } },
      },
      heading2: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 28, bold: true, color: c(P.body) },
        paragraph: { spacing: { before: 240, after: 120, line: 312 } },
      },
      heading3: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 24, bold: true, color: c(P.body) },
        paragraph: { spacing: { before: 200, after: 100, line: 312 } },
      },
    },
  },
  numbering: { config: numberingConfig },
  sections: [
    // ── Section 1: Cover ──
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: buildCover({
        title: "Vivid-Life \u4F7F\u3044\u65B9\u30AC\u30A4\u30C9",
        subtitle: "Live2D Outfit Plugin System \u30E6\u30FC\u30B6\u30FC\u30DE\u30CB\u30E5\u30A2\u30EB",
        metaLine1: "PixiJS + pixi-live2d-display + AI\u753B\u50CF\u751F\u6210",
        metaLine2: "2026\u5E744\u6708",
      }),
    },
    // ── Section 2: Body ──
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "909090" }),
              ],
            }),
          ],
        }),
      },
      children: [
        // ═══════════════════════════════════════════
        // 1. はじめに
        // ═══════════════════════════════════════════
        heading("1. \u306F\u3058\u3081\u306B"),
        body("Vivid-Life\u306F\u3001\u30D6\u30E9\u30A6\u30B6\u4E0A\u3067Live2D\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u3092\u8868\u793A\u3057\u3001\u547C\u5438\u30FB\u307E\u3070\u305F\u304D\u30FB\u8996\u7DDA\u8FFD\u5F93\u30FB\u611F\u60C5\u8868\u73FE\u3068\u3044\u3063\u305F\u201C\u751F\u304D\u751F\u304D\u3068\u3057\u305F\u52D5\u304D\uFF08Vividness\uFF09\u201D\u3092\u7DAD\u6301\u3057\u305F\u307E\u307E\u3001\u8863\u88C5\u306E\u5207\u308A\u66FF\u3048\u3084AI\u306B\u3088\u308B\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u751F\u6210\u304C\u3067\u304D\u308BWeb\u30A2\u30D7\u30EA\u30B1\u30FC\u30B7\u30E7\u30F3\u3067\u3059\u3002\u4ECA\u307E\u3067\u306ELive2D\u30D3\u30E5\u30FC\u30A2\u3068\u306F\u7570\u306A\u308A\u3001\u8863\u88C5\u3092\u5909\u3048\u3066\u3082\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u751F\u304D\u751F\u304D\u3057\u305F\u52D5\u304D\u304C\u4E00\u5207\u9014\u5207\u308C\u308B\u3053\u3068\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u3053\u308C\u304CVivid-Life\u306E\u6700\u5927\u306E\u7279\u5FB4\u3067\u3059\u3002"),
        body("\u672C\u30AC\u30A4\u30C9\u3067\u306F\u3001\u30A2\u30D7\u30EA\u306E\u8D77\u52D5\u65B9\u6CD5\u304B\u3089\u5404\u6A5F\u80FD\u306E\u8A73\u7D30\u306A\u4F7F\u3044\u65B9\u307E\u3067\u3001\u521D\u5FC3\u8005\u306E\u65B9\u3067\u3082\u308F\u304B\u308A\u3084\u3059\u304F\u89E3\u8AAC\u3057\u307E\u3059\u3002AI\u3092\u4F7F\u3063\u305F\u30AA\u30EA\u30B8\u30CA\u30EB\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u4F5C\u308A\u65B9\u3001\u30D7\u30EA\u30BB\u30C3\u30C8\u30E2\u30C7\u30EB\u306E\u8AAD\u307F\u8FBC\u307F\u3001\u8863\u88C5\u5207\u308A\u66FF\u3048\u3001\u611F\u60C5\u8868\u73FE\u306E\u64CD\u4F5C\u306A\u3069\u3001\u3059\u3079\u3066\u306E\u6A5F\u80FD\u3092\u7DB2\u7F85\u3057\u307E\u3059\u3002"),

        // ═══════════════════════════════════════════
        // 2. アプリの起動方法
        // ═══════════════════════════════════════════
        heading("2. \u30A2\u30D7\u30EA\u306E\u8D77\u52D5\u65B9\u6CD5"),
        body("\u30A2\u30D7\u30EA\u3092\u8D77\u52D5\u3059\u308B\u306B\u306F\u3001\u30BF\u30FC\u30DF\u30CA\u30EB\u3092\u958B\u3044\u3066\u4EE5\u4E0B\u306E\u30B3\u30DE\u30F3\u30C9\u3092\u5B9F\u884C\u3057\u307E\u3059\u3002Bun\u30E9\u30F3\u30BF\u30A4\u30E0\u304C\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u6E08\u307F\u3067\u3042\u308B\u3053\u3068\u304C\u524D\u63D0\u3067\u3059\u3002\u8D77\u52D5\u5F8C\u3001\u30D6\u30E9\u30A6\u30B6\u3067 http://localhost:3000 \u306B\u30A2\u30AF\u30BB\u30B9\u3059\u308B\u3068\u3001\u30B5\u30A4\u30D0\u30FC\u30D1\u30F3\u30AF\u98A8\u306E\u30C0\u30FC\u30AF\u306A\u30C6\u30FC\u30DE\u3067\u30A2\u30D7\u30EA\u304C\u8868\u793A\u3055\u308C\u307E\u3059\u3002\u521D\u671F\u30ED\u30FC\u30C9\u6642\u306B\u306F\u3001\u30B3\u30FC\u30C9\u5206\u5272\u306E\u305F\u3081\u77ED\u304F\u30ED\u30FC\u30C7\u30A3\u30F3\u30B0\u30B9\u30D4\u30CA\u30FC\u304C\u8868\u793A\u3055\u308C\u308B\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u304C\u3001\u6570\u79D2\u3067\u5207\u308A\u66FF\u308F\u308A\u307E\u3059\u3002"),
        bodyNoIndent("bun dev"),
        body("\u307E\u305F\u3001Caddy\u3092\u30D7\u30ED\u30AD\u30B7\u3068\u3057\u3066\u4F7F\u7528\u3059\u308B\u5834\u5408\u306F\u3001\u30DD\u30FC\u30C881\u304B\u30893000\u3078\u306E\u8EE2\u9001\u304C\u8A2D\u5B9A\u6E08\u307F\u3067\u3059\u3002Caddy\u3092\u8D77\u52D5\u3059\u308B\u3068\u3001http://localhost:81 \u3067\u30A2\u30AF\u30BB\u30B9\u3067\u304D\u307E\u3059\u3002\u672C\u756A\u74B0\u5883\u3067\u306E\u30C7\u30D7\u30ED\u30A4\u3092\u691C\u8A0E\u3057\u3066\u3044\u308B\u5834\u5408\u306B\u3054\u5229\u7528\u304F\u3060\u3055\u3044\u3002"),

        // ═══════════════════════════════════════════
        // 3. 画面構成
        // ═══════════════════════════════════════════
        heading("3. \u753B\u9762\u69CB\u6210"),
        body("\u753B\u9762\u306F\u5927\u304D\u304F2\u3064\u306E\u30A8\u30EA\u30A2\u306B\u5206\u304B\u308C\u3066\u3044\u307E\u3059\u3002\u5DE6\u5074\u306E\u30E1\u30A4\u30F3\u30A8\u30EA\u30A2\u306B\u306FLive2D\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u304C\u8868\u793A\u3055\u308C\u308BWebGL\u30AD\u30E3\u30F3\u30D0\u30B9\u304C\u3042\u308A\u3001\u53F3\u5074\u306B\u306F4\u3064\u306E\u30BF\u30D6\u304B\u3089\u306A\u308B\u30B3\u30F3\u30C8\u30ED\u30FC\u30EB\u30D1\u30CD\u30EB\u304C\u914D\u7F6E\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u30AD\u30E3\u30F3\u30D0\u30B9\u4E0A\u306E\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306F\u30DE\u30A6\u30B9\u30AB\u30FC\u30BD\u30EB\u306E\u52D5\u304D\u306B\u5408\u308F\u305B\u3066\u8996\u7DDA\u3092\u52D5\u304B\u3057\u3001\u547C\u5438\u3068\u307E\u3070\u305F\u304D\u3092\u7D71\u5408\u7684\u306B\u7D99\u7D9A\u3057\u307E\u3059\u3002\u30B3\u30F3\u30C8\u30ED\u30FC\u30EB\u30D1\u30CD\u30EB\u306E\u5404\u30BF\u30D6\u306E\u8A73\u7D30\u306F\u4EE5\u4E0B\u306E\u901A\u308A\u3067\u3059\u3002"),

        buildTable(
          ["\u30BF\u30D6\u540D", "\u30A2\u30A4\u30B3\u30F3", "\u6A5F\u80FD\u6982\u8981"],
          [
            ["\u30AD\u30E3\u30E9\uFF08Character\uFF09", "\u2728", "\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u8AAD\u307F\u8FBC\u307F\u30FBAI\u751F\u6210"],
            ["\u8863\u88C5\uFF08Outfit\uFF09", "\uD83D\uDC57", "\u8863\u88C5\u30D7\u30E9\u30B0\u30A4\u30F3\u306E\u9078\u629E\u30FB\u9069\u7528\u30FB\u89E3\u9664"],
            ["\u611F\u60C5\uFF08Emotion\uFF09", "\uD83D\uDE0A", "\u611F\u60C5\u306E\u5207\u308A\u66FF\u3048\u3068Vividness Monitor"],
            ["\u8A2D\u5B9A\uFF08Settings\uFF09", "\u2699\uFE0F", "\u30B8\u30E3\u30A4\u30ED\u30B9\u30B3\u30FC\u30D7\u3068\u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3\u60C5\u5831"],
          ]
        ),

        // ═══════════════════════════════════════════
        // 4. キャラクタータブ
        // ═══════════════════════════════════════════
        heading("4. \u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u30BF\u30D6\uFF08\u30AD\u30E3\u30E9\uFF09"),
        body("\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u30BF\u30D6\u3067\u306F\u3001\u4EE5\u4E0B\u306E3\u3064\u306E\u65B9\u6CD5\u3067\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u3092\u8AAD\u307F\u8FBC\u3080\u3053\u3068\u304C\u3067\u304D\u307E\u3059\u3002\u305D\u308C\u305E\u308C\u306E\u65B9\u6CD5\u306B\u3064\u3044\u3066\u8A73\u7D30\u3092\u89E3\u8AAC\u3057\u307E\u3059\u3002"),

        heading("4.1 AI\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u751F\u6210\uFF08\u63A8\u5968\uFF09", HeadingLevel.HEADING_2),
        body("\u30C6\u30AD\u30B9\u30C8\u30D7\u30ED\u30F3\u30D7\u30C8\u304B\u3089AI\u304C7\u3064\u306E\u8868\u60C5\u30D1\u30FC\u30C4\u753B\u50CF\u3092\u751F\u6210\u3057\u3001\u30B9\u30D7\u30E9\u30A4\u30C8\u30D9\u30FC\u30B9\u306E\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u3092\u4F5C\u6210\u3057\u307E\u3059\u3002\u3053\u308C\u306F\u672C\u30A2\u30D7\u30EA\u6700\u5927\u306E\u76EE\u7389\u6A5F\u80FD\u3067\u3042\u308A\u3001\u81EA\u5206\u3060\u3051\u306E\u30AA\u30EA\u30B8\u30CA\u30EB\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u3092\u7C21\u5358\u306B\u4F5C\u308B\u3053\u3068\u304C\u3067\u304D\u307E\u3059\u3002\u751F\u6210\u3055\u308C\u308B7\u3064\u306E\u30D1\u30FC\u30C4\u306F\u3001\u57FA\u672C\u8868\u60C5\uFF08base\uFF09\u3001\u9589\u773C\uFF08eyes-closed\uFF09\u3001\u559C\u3073\uFF08joy\uFF09\u3001\u60B2\u3057\u307F\uFF08sorrow\uFF09\u3001\u6012\u308A\uFF08anger\uFF09\u3001\u9A5A\u304D\uFF08surprise\uFF09\u3001\u30EA\u30E9\u30C3\u30AF\u30B9\uFF08relax\uFF09\u3067\u3059\u3002\u3053\u308C\u3089\u306E\u30D1\u30FC\u30C4\u304C\u30AF\u30ED\u30B9\u30D5\u30A7\u30FC\u30C9\u3067\u5207\u308A\u66FF\u308F\u308B\u3053\u3068\u3067\u3001\u611F\u60C5\u8868\u73FE\u3092\u5B9F\u73FE\u3057\u3066\u3044\u307E\u3059\u3002"),
        body("\u64CD\u4F5C\u624B\u9806\u306F\u4EE5\u4E0B\u306E\u901A\u308A\u3067\u3059\u3002"),
        numberedItem("steps-ai", "\u30D7\u30ED\u30F3\u30D7\u30C8\u5165\u529B\u6B04\u306B\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u7279\u5FB4\u3092\u5165\u529B\u3057\u307E\u3059\u3002\u4F8B\u3048\u3070\u300C\u9752\u3044\u9AEA\u306E\u9B54\u6CD5\u4F7F\u3044\u306E\u5C11\u5973\u3001\u661F\u306E\u30DA\u30F3\u30C0\u30F3\u30C8\u4ED8\u304D\u300D\u306E\u3088\u3046\u306B\u3001\u5177\u4F53\u7684\u306B\u8A18\u8FF0\u3059\u308B\u307B\u3069\u671B\u307F\u306E\u901A\u308A\u306E\u7D50\u679C\u304C\u5F97\u3089\u308C\u307E\u3059\u3002"),
        numberedItem("steps-ai", "\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\uFF088\u7A2E\u985E\uFF09\u304B\u3089\u9078\u3076\u3053\u3068\u3082\u3067\u304D\u307E\u3059\u3002\u30A2\u30CB\u30E1\u5C11\u5973\u30FB\u30A2\u30CB\u30E1\u5C11\u5E74\u30FB\u30D5\u30A1\u30F3\u30BF\u30B8\u30FC\u30FB\u30B5\u30A4\u30D0\u30FC\u30D1\u30F3\u30AF\u30FB\u3061\u3073\u30AD\u30E3\u30E9\u30FB\u6226\u58EB\u30FB\u30E1\u30A4\u30C9\u30FB\u5B66\u5712\u304B\u3089\u9078\u629E\u53EF\u80FD\u3067\u3059\u3002"),
        numberedItem("steps-ai", "\u30B9\u30BF\u30A4\u30EB\uFF085\u7A2E\u985E\uFF09\u3092\u9078\u629E\u3057\u307E\u3059\u3002\u30A2\u30CB\u30E1\u30FB\u30D5\u30A1\u30F3\u30BF\u30B8\u30FC\u30FB\u30B5\u30A4\u30D0\u30FC\u30D1\u30F3\u30AF\u30FB\u3061\u3073\u30FB\u30EA\u30A2\u30EB\u304B\u3089\u9078\u3079\u307E\u3059\u3002"),
        numberedItem("steps-ai", "\u300C\u751F\u6210\u958B\u59CB\u300D\u30DC\u30BF\u30F3\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u307E\u3059\u3002"),
        numberedItem("steps-ai", "7\u6BB5\u968E\u306E\u30D7\u30ED\u30B0\u30EC\u30B9\u30D0\u30FC\u304C\u9032\u307F\u307E\u3059\uFF08base \u2192 \u9589\u773C \u2192 \u559C\u3073 \u2192 \u60B2\u3057\u307F \u2192 \u6012\u308A \u2192 \u9A5A\u304D \u2192 \u30EA\u30E9\u30C3\u30AF\u30B9\uFF09\u3002"),
        numberedItem("steps-ai", "\u5B8C\u4E86\u5F8C\u3001\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u304C\u30AD\u30E3\u30F3\u30D0\u30B9\u306B\u8868\u793A\u3055\u308C\u307E\u3059\u3002\u547C\u5438\u30FB\u307E\u3070\u305F\u304D\u30FB\u8996\u7DDA\u8FFD\u5F93\u306F\u81EA\u52D5\u7684\u306B\u958B\u59CB\u3055\u308C\u307E\u3059\u3002"),
        tipParagraph("AI\u751F\u6210\u3055\u308C\u305F\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306F\u3001\u672C\u7269\u306ELive2D\u30E2\u30C7\u30EB\u3067\u306F\u306A\u304F\u300C\u30B9\u30D7\u30E9\u30A4\u30C8\u30D9\u30FC\u30B9\u300D\u3067\u3059\u304C\u3001\u547C\u5438\u30FB\u307E\u3070\u305F\u304D\u30FB\u8996\u7DDA\u8FFD\u5F93\u30FB\u611F\u60C5\u8868\u73FE\u306F\u3059\u3079\u3066\u518D\u73FE\u3055\u308C\u307E\u3059\uFF01"),

        heading("4.2 \u30D7\u30EA\u30BB\u30C3\u30C8\u30E2\u30C7\u30EB\u8AAD\u307F\u8FBC\u307F", HeadingLevel.HEADING_2),
        body("\u7528\u610F\u3055\u308C\u305F4\u3064\u306E\u30E2\u30C7\u30EB\u304B\u3089\u9078\u3076\u3053\u3068\u304C\u3067\u304D\u307E\u3059\u3002\u3053\u308C\u3089\u306F\u672C\u7269\u306ECubism 4\u5BFE\u5FDCLive2D\u30E2\u30C7\u30EB\u3067\u3042\u308A\u3001CDN\u304B\u3089\u81EA\u52D5\u7684\u306B\u8AAD\u307F\u8FBC\u307E\u308C\u307E\u3059\u3002\u547C\u5438\u30FB\u307E\u3070\u305F\u304D\u306A\u3069\u306E\u30C7\u30D5\u30A9\u30EB\u30C8\u30E2\u30FC\u30B7\u30E7\u30F3\u306B\u52A0\u3048\u3001Vivid-Life\u72EC\u81EA\u306E\u547C\u5438\u540C\u671F\u30FB\u8996\u7DDA\u8FFD\u5F93\u304C\u30AA\u30FC\u30D0\u30FC\u30E9\u30A4\u30C9\u3055\u308C\u307E\u3059\u3002\u8863\u88C5\u30D7\u30E9\u30B0\u30A4\u30F3\u6A5F\u80FD\u3082\u5B8C\u5168\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002"),
        buildTable(
          ["\u30E2\u30C7\u30EB\u540D", "\u8AAC\u660E"],
          [
            ["Hiyori Pro", "\u9AD8\u54C1\u8CEA\u306ALive2D\u30E2\u30C7\u30EB\u3002\u8868\u60C5\u306E\u30D0\u30EA\u30A8\u30FC\u30B7\u30E7\u30F3\u304C\u8C4A\u5BCC"],
            ["Hiyori", "\u6A19\u6E96\u7684\u306ALive2D\u30E2\u30C7\u30EB\u3002\u52D5\u4F5C\u304C\u6ED1\u3089\u304B"],
            ["Shizuku", "\u3057\u305A\u304F\u30E2\u30C7\u30EB\u3002\u7A4D\u3082\u306E\u3063\u305F\u308A\u3057\u305F\u5370\u8C61"],
            ["Haru", "\u306F\u308B\u30E2\u30C7\u30EB\u3002\u660E\u308B\u3044\u8868\u60C5\u304C\u7279\u5FB4"],
          ]
        ),
        body("\u64CD\u4F5C\u306F\u7C21\u5358\u3067\u3059\u3002\u30E2\u30C7\u30EB\u540D\u306E\u6A2A\u306B\u3042\u308B\u300C\u8AAD\u307F\u8FBC\u307F\u300D\u30DC\u30BF\u30F3\u3092\u30AF\u30EA\u30C3\u30AF\u3059\u308B\u3060\u3051\u3067\u3059\u3002\u8AAD\u307F\u8FBC\u307F\u4E2D\u306F\u30ED\u30FC\u30C7\u30A3\u30F3\u30B0\u30AA\u30FC\u30D0\u30FC\u30EC\u30A4\u304C\u8868\u793A\u3055\u308C\u3001\u6570\u79D2\u3067\u5B8C\u4E86\u3057\u307E\u3059\u3002"),

        heading("4.3 \u30AB\u30B9\u30BF\u30E0\u30E2\u30C7\u30EBURL", HeadingLevel.HEADING_2),
        body("\u81EA\u5206\u306ELive2D\u30E2\u30C7\u30EB\u3092\u8AAD\u307F\u8FBC\u3080\u3053\u3068\u3082\u3067\u304D\u307E\u3059\u3002.model3.json\u306EURL\u3092\u76F4\u63A5\u5165\u529B\u3057\u3066\u300C\u8AAD\u307F\u8FBC\u307F\u300D\u30DC\u30BF\u30F3\u3092\u30AF\u30EA\u30C3\u30AF\u3059\u308B\u3060\u3051\u3067\u3059\u3002Cubism 2\u30E2\u30C7\u30EB\uFF08.model.json\uFF09\u3068Cubism 4\u30E2\u30C7\u30EB\uFF08.model3.json\uFF09\u306E\u4E21\u65B9\u306B\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002\u30E2\u30C7\u30EB\u30D5\u30A1\u30A4\u30EB\u306FCORS\u30D8\u30C3\u30C0\u30FC\u3067\u8A31\u53EF\u3055\u308C\u3066\u3044\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002"),
        warnParagraph("\u30AB\u30B9\u30BF\u30E0\u30E2\u30C7\u30EB\u306ECORS\u8A2D\u5B9A\u306B\u3088\u308A\u8AAD\u307F\u8FBC\u3081\u306A\u3044\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002\u305D\u306E\u5834\u5408\u306F\u3001\u30E2\u30C7\u30EB\u30D5\u30A1\u30A4\u30EB\u3092public\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u914D\u7F6E\u3057\u3066\u304F\u3060\u3055\u3044\u3002"),

        // ═══════════════════════════════════════════
        // 5. 衣装タブ
        // ═══════════════════════════════════════════
        heading("5. \u8863\u88C5\u30BF\u30D6\uFF08Outfit\uFF09"),
        body("\u30D9\u30FC\u30B9\u30E2\u30C7\u30EB\u306E\u4E0A\u306B\u8863\u88C5\u3092\u91CD\u306D\u3066\u5207\u308A\u66FF\u3048\u308B\u6A5F\u80FD\u3067\u3059\u3002Vivid-Life\u306E\u6700\u5927\u306E\u7279\u5FB4\u306F\u3001\u8863\u88C5\u3092\u5207\u308A\u66FF\u3048\u3066\u3082\u547C\u5438\u30FB\u307E\u3070\u305F\u304D\u30FB\u8996\u7DDA\u8FFD\u5F93\u304C\u4E00\u5207\u9014\u5207\u308C\u306A\u3044\u3053\u3068\u3067\u3059\u3002\u8863\u88C5\u30E2\u30C7\u30EB\u3082\u30D9\u30FC\u30B9\u30E2\u30C7\u30EB\u3068\u5B8C\u5168\u306B\u540C\u671F\u3055\u308C\u308B\u305F\u3081\u3001\u81EA\u7136\u306A\u8868\u60C5\u306E\u307E\u307E\u8863\u88C5\u304C\u5909\u308F\u308A\u307E\u3059\u3002\u307E\u305F\u3001\u8863\u88C5\u30D1\u30FC\u30C4\u306E\u4E0B\u306B\u808C\u8089\u304C\u900F\u3051\u308B\u73FE\u8C61\uFF08\u30AA\u30AF\u30EB\u30FC\u30B8\u30E7\u30F3\uFF09\u3092\u9632\u3050\u305F\u3081\u3001\u8863\u88C5\u9069\u7528\u6642\u306B\u81EA\u52D5\u7684\u306B\u5BFE\u5FDC\u3059\u308B\u30D1\u30FC\u30C4\u306E\u4E0D\u900F\u660E\u5EA6\u304C\u5236\u5FA1\u3055\u308C\u307E\u3059\u3002"),
        body("\u64CD\u4F5C\u624B\u9806\uFF1A"),
        numberedItem("steps-outfit", "3\u3064\u306E\u8863\u88C5\u304B\u3089\u9078\u629E\u3057\u307E\u3059\u3002\u30B9\u30AF\u30FC\u30EB\u5236\u670D\uFF08school\uFF09\u3001\u30AB\u30B8\u30E5\u30A2\u30EB\uFF08casual\uFF09\u3001\u30D5\u30A9\u30FC\u30DE\u30EB\uFF08formal\uFF09\u304B\u3089\u9078\u3079\u307E\u3059\u3002"),
        numberedItem("steps-outfit", "\u8863\u88C5\u3092\u9078\u3076\u3068\u3001\u30D6\u30E9\u30FC\u30D5\u30A7\u30FC\u30C9\u30A2\u30A6\u30C8\uFF0BCSS\u30D1\u30FC\u30C6\u30A3\u30AF\u30EB\u30A8\u30D5\u30A7\u30AF\u30C8\u3068\u3068\u3082\u306B\u8863\u88C5\u304C\u5207\u308A\u66FF\u308F\u308A\u307E\u3059\u3002"),
        numberedItem("steps-outfit", "\u300C\u8863\u88C5\u89E3\u9664\u300D\u30DC\u30BF\u30F3\u3067\u5143\u306E\u59FF\u306B\u623B\u305B\u307E\u3059\u3002"),
        tipParagraph("\u8863\u88C5\u6A5F\u80FD\u306F\u672C\u7269\u306ELive2D\u30E2\u30C7\u30EB\uFF08\u30D7\u30EA\u30BB\u30C3\u30C8/\u30AB\u30B9\u30BF\u30E0\uFF09\u3067\u306E\u307F\u52D5\u4F5C\u3057\u307E\u3059\u3002AI\u751F\u6210\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306F\u30B9\u30D7\u30E9\u30A4\u30C8\u30D9\u30FC\u30B9\u306E\u305F\u3081\u3001\u8863\u88C5\u30D7\u30E9\u30B0\u30A4\u30F3\u306F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u305B\u3093\u3002"),

        // ═══════════════════════════════════════════
        // 6. 感情タブ
        // ═══════════════════════════════════════════
        heading("6. \u611F\u60C5\u30BF\u30D6\uFF08Emotion\uFF09"),
        body("\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u611F\u60C5\u30926\u7A2E\u985E\u304B\u3089\u5207\u308A\u66FF\u3048\u3089\u308C\u307E\u3059\u3002Live2D\u30E2\u30C7\u30EB\u306E\u5834\u5408\u306F\u30E2\u30C7\u30EB\u306E\u30D1\u30E9\u30E1\u30FC\u30BF\u3092\u76F4\u63A5\u64CD\u4F5C\u3057\u3066\u8868\u60C5\u3092\u5909\u5316\u3055\u305B\u307E\u3059\u3002AI\u751F\u6210\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u5834\u5408\u306F\u3001\u5BFE\u5FDC\u3059\u308B\u611F\u60C5\u30D1\u30FC\u30C4\u753B\u50CF\u3078\u306E\u30AF\u30ED\u30B9\u30D5\u30A7\u30FC\u30C9\u306B\u3088\u308A\u8868\u60C5\u304C\u5207\u308A\u66FF\u308F\u308A\u307E\u3059\u3002\u3069\u3061\u3089\u306E\u5834\u5408\u3082\u3001\u611F\u60C5\u5207\u308A\u66FF\u3048\u4E2D\u3082\u547C\u5438\u3084\u8996\u7DDA\u8FFD\u5F93\u306F\u7D99\u7D9A\u3057\u307E\u3059\u3002"),
        buildTable(
          ["\u611F\u60C5", "\u52B9\u679C"],
          [
            ["Neutral\uFF08\u7121\u8868\u60C5\uFF09", "\u901A\u5E38\u72B6\u614B\u30FB\u7121\u8868\u60C5"],
            ["Joy\uFF08\u559C\u3073\uFF09", "\u76EE\u304C\u7D30\u307E\u308A\u3001\u53E3\u89D2\u304C\u4E0A\u304C\u308B"],
            ["Sorrow\uFF08\u60B2\u3057\u307F\uFF09", "\u7709\u304C\u4E0B\u304C\u308A\u3001\u76EE\u304C\u6F64\u3080"],
            ["Anger\uFF08\u6012\u308A\uFF09", "\u7709\u304C\u540A\u308A\u4E0A\u304C\u308A\u3001\u76EE\u304C\u92ED\u304F\u306A\u308B"],
            ["Relax\uFF08\u30EA\u30E9\u30C3\u30AF\u30B9\uFF09", "\u7A4C\u3084\u304B\u306A\u8868\u60C5"],
            ["Surprise\uFF08\u9A5A\u304D\uFF09", "\u76EE\u304C\u5927\u304D\u304F\u958B\u304F"],
          ]
        ),
        body("\u611F\u60C5\u30BF\u30D6\u306E\u4E0B\u306B\u306F\u3001Vividness Monitor\uFF08\u751F\u304D\u751F\u304D\u30E2\u30CB\u30BF\u30FC\uFF09\u304C\u3042\u308A\u307E\u3059\u3002\u3053\u308C\u306F\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u72B6\u614B\u3092\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u3067\u8996\u899A\u5316\u3059\u308B\u30D0\u30FC\u30B0\u30E9\u30D5\u3067\u3001\u547C\u5438\uFF08Breath\uFF09\u30FB\u8996\u7DDA\uFF08Look-at\uFF09\u30FB\u307E\u3070\u305F\u304D\uFF08Blink\uFF09\u306E3\u3064\u306E\u6307\u6A19\u3092\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u3067\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002\u30E0\u30FC\u30D6\u306A\u547C\u5438\u30EA\u30BA\u30E0\u3084\u3001\u30DE\u30A6\u30B9\u306B\u8FFD\u5F93\u3059\u308B\u8996\u7DDA\u306E\u52D5\u304D\u3001\u30E9\u30F3\u30C0\u30E0\u306A\u307E\u3070\u305F\u304D\u306E\u30BF\u30A4\u30DF\u30F3\u30B0\u3092\u76F4\u611F\u7684\u306B\u628A\u63E1\u3067\u304D\u307E\u3059\u3002"),

        // ═══════════════════════════════════════════
        // 7. 設定タブ
        // ═══════════════════════════════════════════
        heading("7. \u8A2D\u5B9A\u30BF\u30D6\uFF08Settings\uFF09"),
        body("\u8A2D\u5B9A\u30BF\u30D6\u3067\u306F\u3001\u4EE5\u4E0B\u306E2\u3064\u306E\u6A5F\u80FD\u3092\u5229\u7528\u3067\u304D\u307E\u3059\u3002\u307E\u305A\u3001\u30B8\u30E3\u30A4\u30ED\u30B9\u30B3\u30FC\u30D7\u306E\u30C8\u30B0\u30EB\u3067\u3059\u3002\u30E2\u30D0\u30A4\u30EB\u7AEF\u672B\u3067\u7AEF\u672B\u306E\u50BE\u304D\u306B\u5408\u308F\u305B\u3066\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u304C\u8996\u7DDA\u3092\u52D5\u304B\u3059\u6A5F\u80FD\u3067\u3001\u30B9\u30DE\u30FC\u30C8\u30D5\u30A9\u30F3\u3084\u30BF\u30D6\u30EC\u30C3\u30C8\u3067\u4F7F\u7528\u3059\u308B\u3068\u3001\u7AEF\u672B\u3092\u50BE\u3051\u308B\u3060\u3051\u3067\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u304C\u3053\u3061\u3089\u3092\u898B\u308B\u3088\u3046\u306B\u306A\u308A\u307E\u3059\u3002\u30C7\u30D5\u30A9\u30EB\u30C8\u3067\u306FOFF\u306B\u306A\u3063\u3066\u3044\u308B\u306E\u3067\u3001\u5FC5\u8981\u306B\u5FDC\u3058\u3066\u30C8\u30B0\u30EB\u3092ON\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u3055\u3089\u306B\u3001\u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3\u60C5\u5831\u3068\u3057\u3066\u3001\u4F7F\u7528\u3057\u3066\u3044\u308B\u6280\u8853\u30B9\u30BF\u30C3\u30AF\uFF08Next.js\u3001PixiJS\u3001Cubism SDK\u3001AI\u753B\u50CF\u751F\u6210\u306A\u3069\uFF09\u306E\u4E00\u89A7\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002"),

        // ═══════════════════════════════════════════
        // 8. インタラクション
        // ═══════════════════════════════════════════
        heading("8. \u30A4\u30F3\u30BF\u30E9\u30AF\u30B7\u30E7\u30F3\uFF08\u64CD\u4F5C\u65B9\u6CD5\uFF09"),
        body("\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306F\u3055\u307E\u3056\u307E\u306A\u65B9\u6CD5\u3067\u64CD\u4F5C\u3067\u304D\u307E\u3059\u3002\u30DE\u30A6\u30B9\u3092\u52D5\u304B\u3059\u3068\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u8996\u7DDA\u304C\u8FFD\u5F93\u3057\u3001\u30B9\u30DE\u30FC\u30C8\u30D5\u30A9\u30F3\u3067\u306F\u30BF\u30C3\u30C1\u4F4D\u7F6E\u306B\u53CD\u5FDC\u3057\u307E\u3059\u3002\u8996\u7DDA\u8FFD\u5F93\u306B\u306F\u6307\u6570\u30B9\u30E0\u30FC\u30B8\u30F3\u30B0\u304C\u4F7F\u308F\u308C\u3066\u304A\u308A\u3001\u30DE\u30A6\u30B9\u3092\u6025\u306B\u52D5\u304B\u3057\u3066\u3082\u30AB\u30AF\u30AB\u30AF\u3057\u307E\u305B\u3093\u3002\u7A93\u306E\u30B5\u30A4\u30BA\u3092\u5909\u3048\u308B\u3068\u30AD\u30E3\u30F3\u30D0\u30B9\u3082\u81EA\u52D5\u7684\u306B\u30EA\u30B5\u30A4\u30BA\u3055\u308C\u308B\u305F\u3081\u3001\u30EC\u30B9\u30DD\u30F3\u30B7\u30D6\u306A\u8868\u793A\u304C\u5B9F\u73FE\u3055\u308C\u307E\u3059\u3002"),
        buildTable(
          ["\u64CD\u4F5C", "\u52B9\u679C"],
          [
            ["\u30DE\u30A6\u30B9\u79FB\u52D5", "\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u304C\u30DE\u30A6\u30B9\u30AB\u30FC\u30BD\u30EB\u3092\u8FFD\u3044\u304B\u3051\u308B\uFF08\u8996\u7DDA\u8FFD\u5F93\uFF09"],
            ["\u30BF\u30C3\u30C1\u64CD\u4F5C", "\u30B9\u30DE\u30DB/\u30BF\u30D6\u30EC\u30C3\u30C8\u3067\u30BF\u30C3\u30C1\u4F4D\u7F6E\u3092\u8FFD\u5F93"],
            ["\u30B8\u30E3\u30A4\u30ED\u30B9\u30B3\u30FC\u30D7", "\u7AEF\u672B\u306E\u50BE\u304D\u3067\u8996\u7DDA\u304C\u52D5\u304F\uFF08\u8A2D\u5B9A\u3067ON/OFF\uFF09"],
            ["\u30A6\u30A3\u30F3\u30C9\u30A6\u30EA\u30B5\u30A4\u30BA", "\u30AD\u30E3\u30F3\u30D0\u30B9\u304C\u81EA\u52D5\u7684\u306B\u30EA\u30B5\u30A4\u30BA\u3055\u308C\u308B"],
          ]
        ),

        // ═══════════════════════════════════════════
        // 9. AIキャラクター生成のヒント
        // ═══════════════════════════════════════════
        heading("9. AI\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u751F\u6210\u306E\u30D2\u30F3\u30C8"),
        body("\u3088\u308A\u826F\u3044\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u3092\u751F\u6210\u3059\u308B\u305F\u3081\u306E\u30B3\u30C4\u3092\u7D39\u4ECB\u3057\u307E\u3059\u3002\u30D7\u30ED\u30F3\u30D7\u30C8\u306E\u66F8\u304D\u65B9\u4E00\u3064\u3067\u3001\u751F\u6210\u7D50\u679C\u306E\u54C1\u8CEA\u304C\u5927\u304D\u304F\u5909\u308F\u308A\u307E\u3059\u3002"),
        numberedItem("tips-ai", "\u5177\u4F53\u7684\u306B\u66F8\u304F\uFF1A\u300C\u53EF\u611B\u3044\u5973\u306E\u5B50\u300D\u3088\u308A\u300C\u30D4\u30F3\u30AF\u306E\u30C4\u30A4\u30F3\u30C6\u30FC\u30EB\u3001\u9752\u3044\u76EE\u3001\u732B\u8033\u3001\u767D\u3044\u30EF\u30F3\u30D4\u30FC\u30B9\u306E\u5C11\u5973\u300D\u306E\u3088\u3046\u306B\u3001\u8272\u3001\u578B\u3001\u88C5\u98FE\u306A\u3069\u306E\u8A73\u7D30\u3092\u76DB\u308A\u8FBC\u3093\u3060\u307B\u3046\u304C\u671B\u307F\u306E\u901A\u308A\u306E\u7D50\u679C\u304C\u5F97\u3089\u308C\u307E\u3059\u3002"),
        numberedItem("tips-ai", "\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u3092\u6D3B\u7528\uFF1A\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u9078\u629E\u3067\u57FA\u672C\u30D7\u30ED\u30F3\u30D7\u30C8\u304C\u81EA\u52D5\u5165\u529B\u3055\u308C\u308B\u306E\u3067\u3001\u305D\u308C\u306B\u8FFD\u52A0\u3059\u308B\u5F62\u304C\u4FBF\u5229\u3067\u3059\u3002\u4F8B\u3048\u3070\u300C\u30B5\u30A4\u30D0\u30FC\u30D1\u30F3\u30AF\u300D\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u3092\u9078\u3073\u3001\u300C\u8D64\u3044\u30E1\u30AC\u30CD\u88C5\u5099\u300D\u3092\u8FFD\u52A0\u3059\u308B\u3068\u3044\u3063\u305F\u4F7F\u3044\u65B9\u304C\u3067\u304D\u307E\u3059\u3002"),
        numberedItem("tips-ai", "\u30B9\u30BF\u30A4\u30EB\u3092\u5408\u308F\u305B\u308B\uFF1A\u30D7\u30ED\u30F3\u30D7\u30C8\u3068\u30B9\u30BF\u30A4\u30EB\u306E\u7D44\u307F\u5408\u308F\u305B\u3092\u610F\u8B58\u3057\u307E\u3057\u3087\u3046\u3002\u4F8B\u3048\u3070\u300C\u30B5\u30A4\u30D0\u30FC\u30D1\u30F3\u30AF\u30D7\u30ED\u30F3\u30D7\u30C8\uFF0B\u30B5\u30A4\u30D0\u30FC\u30D1\u30F3\u30AF\u30B9\u30BF\u30A4\u30EB\u300D\u306E\u7D44\u307F\u5408\u308F\u305B\u306F\u7279\u306B\u52B9\u679C\u7684\u3067\u3059\u3002"),
        numberedItem("tips-ai", "7\u3064\u306E\u30D1\u30FC\u30C4\u306E\u7406\u89E3\uFF1A\u88CF\u5074\u3067\u306Fbase\u30FB\u9589\u773C\u30FB\u559C\u3073\u30FB\u60B2\u3057\u307F\u30FB\u6012\u308A\u30FB\u9A5A\u304D\u30FB\u30EA\u30E9\u30C3\u30AF\u30B9\u306E7\u679A\u304C\u751F\u6210\u3055\u308C\u3001\u305D\u308C\u305E\u308C\u304C\u8868\u60C5\u5207\u308A\u66FF\u3048\u306B\u4F7F\u308F\u308C\u307E\u3059\u3002\u7279\u306B\u300C\u9589\u773C\u300D\u30D1\u30FC\u30C4\u306F\u307E\u3070\u305F\u304D\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u306B\u4F7F\u7528\u3055\u308C\u308B\u305F\u3081\u3001\u91CD\u8981\u306A\u30D1\u30FC\u30C4\u3067\u3059\u3002"),

        // ═══════════════════════════════════════════
        // 10. アーキテクチャ概要
        // ═══════════════════════════════════════════
        heading("10. \u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3\u6982\u8981"),
        body("Vivid-Life\u306F\u3001Next.js 16\uFF08React 19\uFF09\u3092\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u3068\u3057\u3066\u63A1\u7528\u3057\u3001PixiJS 7\u3068pixi-live2d-display\u306B\u3088\u308BWebGL\u30EC\u30F3\u30C0\u30EA\u30F3\u30B0\u3001Cubism 4 SDK\u306B\u3088\u308BLive2D\u30E2\u30C7\u30EB\u518D\u751F\u3001z-ai-web-dev-sdk\u306B\u3088\u308BAI\u753B\u50CF\u751F\u6210\u3092\u7D71\u5408\u3057\u305FWeb\u30A2\u30D7\u30EA\u30B1\u30FC\u30B7\u30E7\u30F3\u3067\u3059\u3002\u30B9\u30BF\u30A4\u30EA\u30F3\u30B0\u306B\u306FTailwind CSS 4\u3068shadcn/ui\u3092\u4F7F\u7528\u3057\u3001\u30B5\u30A4\u30D0\u30FC\u30D1\u30F3\u30AF\u98A8\u306E\u30C0\u30FC\u30AF\u306A\u30C7\u30B6\u30A4\u30F3\u3092\u5B9F\u73FE\u3057\u3066\u3044\u307E\u3059\u3002"),
        body("\u30B3\u30A2\u306E\u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3\u306F\u4EE5\u4E0B\u306E\u901A\u308A\u3067\u3059\u3002VividnessSyncManager\u304CrequestAnimationFrame\u30EB\u30FC\u30D7\u3067\u547C\u5438\u30FB\u307E\u3070\u305F\u304D\u30FB\u8996\u7DDA\u8FFD\u5F93\u30FB\u611F\u60C5\u306E\u30D1\u30E9\u30E1\u30FC\u30BF\u3092\u6BCE\u30D5\u30EC\u30FC\u30E0\u8A08\u7B97\u3057\u3001\u30D9\u30FC\u30B9\u30E2\u30C7\u30EB\u3068\u8863\u88C5\u30E2\u30C7\u30EB\u306E\u4E21\u65B9\u306B\u540C\u671F\u30D6\u30ED\u30FC\u30C9\u30AD\u30E3\u30B9\u30C8\u3057\u307E\u3059\u3002\u3053\u308C\u306B\u3088\u308A\u3001\u8863\u88C5\u5207\u308A\u66FF\u3048\u4E2D\u3082\u30D9\u30FC\u30B9\u3068\u8863\u88C5\u304C\u5B8C\u5168\u306B\u540C\u671F\u3057\u3001\u81EA\u7136\u306A\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u304C\u7DAD\u6301\u3055\u308C\u307E\u3059\u3002AI\u751F\u6210\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u5834\u5408\u306F\u3001SpriteCharacterRenderer\u304C\u540C\u69D8\u306E\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u30EB\u30FC\u30D7\u3092\u5B9F\u884C\u3057\u3001\u8868\u60C5\u30D1\u30FC\u30C4\u306E\u30AF\u30ED\u30B9\u30D5\u30A7\u30FC\u30C9\u306B\u3088\u308B\u611F\u60C5\u8868\u73FE\u3092\u5B9F\u73FE\u3057\u3066\u3044\u307E\u3059\u3002"),
        buildTable(
          ["\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8", "\u5F79\u5272"],
          [
            ["PixiJS Canvas", "WebGL\u30EC\u30F3\u30C0\u30EA\u30F3\u30B0\u57FA\u76E4"],
            ["pixi-live2d-display", "Cubism 4 SDK\u7D71\u5408\u30EC\u30F3\u30C0\u30EA\u30F3\u30B0"],
            ["VividnessSyncManager", "\u547C\u5438\u30FB\u307E\u3070\u305F\u304D\u30FB\u8996\u7DDA\u30FB\u611F\u60C5\u306E\u540C\u671F\u5236\u5FA1"],
            ["Live2DEngine", "\u30E2\u30C7\u30EB\u306E\u8AAD\u307F\u8FBC\u307F\u30FB\u7834\u68C4\u30FB\u5207\u308A\u66FF\u3048\u7BA1\u7406"],
            ["CharacterGenerator", "AI\u753B\u50CF\u751F\u6210\u30D1\u30A4\u30D7\u30E9\u30A4\u30F3\uFF087\u30D1\u30FC\u30C4\u4E26\u5217\u751F\u6210\uFF09"],
            ["SpriteCharacterRenderer", "\u30B9\u30D7\u30E9\u30A4\u30C8\u30D9\u30FC\u30B9\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3"],
            ["OutfitPluginLoader", "IndexedDB\u30AD\u30E3\u30C3\u30B7\u30E5\u4ED8\u304D\u8863\u88C5\u8AAD\u307F\u8FBC\u307F"],
            ["OcclusionManager", "\u8863\u88C5\u4E0B\u30D1\u30FC\u30C4\u306E\u4E0D\u900F\u660E\u5EA6\u5236\u5FA1"],
            ["OutfitTransitionEffect", "\u30D6\u30E9\u30FC+\u30D1\u30FC\u30C6\u30A3\u30AF\u30EB\u306E\u8863\u88C5\u5909\u66F4\u6F14\u51FA"],
          ]
        ),

        // ═══════════════════════════════════════════
        // 11. トラブルシューティング
        // ═══════════════════════════════════════════
        heading("11. \u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0"),
        body("\u4F7F\u7528\u4E2D\u306B\u554F\u984C\u304C\u767A\u751F\u3057\u305F\u5834\u5408\u306E\u5BFE\u51E6\u6CD5\u3092\u7D39\u4ECB\u3057\u307E\u3059\u3002\u307E\u305A\u3001\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u304C\u8868\u793A\u3055\u308C\u306A\u3044\u5834\u5408\u306F\u3001\u30D6\u30E9\u30A6\u30B6\u304CWebGL\u3092\u30B5\u30DD\u30FC\u30C8\u3057\u3066\u3044\u308B\u304B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u307B\u3068\u3093\u3069\u306E\u73FE\u4EE3\u7684\u306A\u30D6\u30E9\u30A6\u30B6\u3067\u306F\u52D5\u4F5C\u3057\u307E\u3059\u304C\u3001\u53E4\u3044\u30D6\u30E9\u30A6\u30B6\u3084\u7279\u5B9A\u306E\u30E2\u30D0\u30A4\u30EB\u7AEF\u672B\u3067\u306FWebGL\u304C\u7121\u52B9\u5316\u3055\u308C\u3066\u3044\u308B\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u3002"),
        body("AI\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u751F\u6210\u304C\u5931\u6557\u3059\u308B\u5834\u5408\u306F\u3001\u30B5\u30FC\u30D0\u30FC\u5074\u306E\u753B\u50CF\u751F\u6210API\u304C\u6B63\u5E38\u306B\u52D5\u4F5C\u3057\u3066\u3044\u308B\u304B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u307E\u305F\u3001\u30D7\u30ED\u30F3\u30D7\u30C8\u304C\u77ED\u3059\u304E\u308B\u5834\u5408\u3084\u3001\u7279\u6B8A\u6587\u5B57\u3092\u542B\u3080\u5834\u5408\u306B\u5931\u6557\u3057\u3084\u3059\u3044\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u3002\u5931\u6557\u3057\u305F\u30D1\u30FC\u30C4\u306F\u81EA\u52D5\u7684\u306B\u57FA\u672C\u8868\u60C5\u30D1\u30FC\u30C4\u3067\u4EE3\u66FF\u3055\u308C\u308B\u305F\u3081\u3001\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u81EA\u4F53\u306F\u751F\u6210\u3055\u308C\u307E\u3059\u304C\u3001\u4E00\u90E8\u306E\u8868\u60C5\u304C\u8868\u793A\u3055\u308C\u306A\u3044\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002"),
        body("\u8863\u88C5\u304C\u8868\u793A\u3055\u308C\u306A\u3044\u5834\u5408\u306F\u3001\u30D9\u30FC\u30B9\u30E2\u30C7\u30EB\u304C\u6B63\u3057\u304F\u8AAD\u307F\u8FBC\u307E\u308C\u3066\u3044\u308B\u304B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u8863\u88C5\u6A5F\u80FD\u306F\u672C\u7269\u306ELive2D\u30E2\u30C7\u30EB\u3067\u306E\u307F\u52D5\u4F5C\u3057\u307E\u3059\u3002\u307E\u305F\u3001\u8863\u88C5\u30DE\u30CB\u30D5\u30A7\u30B9\u30C8\u306Ehide_parts\u306B\u6307\u5B9A\u3055\u308C\u305F\u30D1\u30FC\u30C4\u540D\u304C\u30E2\u30C7\u30EB\u3068\u4E00\u81F4\u3057\u3066\u3044\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002"),
        body("\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u52D5\u304D\u304C\u30AB\u30AF\u30AB\u30AF\u3059\u308B\u5834\u5408\u306F\u3001\u30C7\u30D0\u30A4\u30B9\u306E\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u304C\u4F4E\u3044\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u7279\u306B\u53E4\u3044\u30B9\u30DE\u30FC\u30C8\u30D5\u30A9\u30F3\u3084\u30ED\u30FC\u30A8\u30F3\u30C9\u306EPC\u3067\u306F\u3001WebGL\u306E\u63CF\u753B\u8CA0\u8377\u304C\u9AD8\u304F\u306A\u308B\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u3002\u30D6\u30E9\u30A6\u30B6\u306E\u30BF\u30D6\u3092\u9589\u3058\u3066\u518D\u8AAD\u307F\u8FBC\u307F\u3059\u308B\u3053\u3068\u3067\u6539\u5584\u3059\u308B\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002"),
      ],
    },
  ],
});

// ── Generate DOCX ──
const outputPath = "/home/z/my-project/download/Vivid-Life_使い方ガイド.docx";
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outputPath, buf);
  console.log("DOCX generated:", outputPath);
});
