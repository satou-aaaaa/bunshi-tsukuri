// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の分子は入れず、見本のエタノールだけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const at = (x, y, e, col, r = 46) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><text x="${x}" y="${y + 17}" font-size="${r * 1.05}" fill="#fff" font-weight="700" text-anchor="middle">${e}</text>`;
  const svg = `<svg width="1200" height="630" style="position:absolute;left:0;top:0"><g stroke="#1f2933" stroke-width="10" stroke-linecap="round">
    <line x1="760" y1="330" x2="900" y2="250"/><line x1="900" y1="250" x2="1040" y2="330"/>
    <line x1="760" y1="330" x2="700" y2="440"/><line x1="760" y1="330" x2="660" y2="300"/><line x1="760" y1="330" x2="780" y2="450"/>
    <line x1="900" y1="250" x2="860" y2="140"/><line x1="900" y1="250" x2="960" y2="140"/><line x1="1040" y1="330" x2="1120" y2="420"/></g>
    ${at(700, 440, "H", "#5f6b76", 30)}${at(660, 300, "H", "#5f6b76", 30)}${at(780, 450, "H", "#5f6b76", 30)}${at(860, 140, "H", "#5f6b76", 30)}${at(960, 140, "H", "#5f6b76", 30)}${at(1120, 420, "H", "#5f6b76", 30)}
    ${at(760, 330, "C", "#2f3640")}${at(900, 250, "C", "#2f3640")}${at(1040, 330, "O", "#c62828")}</svg>`;
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:70px 80px;background:#f6f2e8;color:#1f2933;position:relative;overflow:hidden">
    ${svg}
    <div style="position:relative;font-size:34px;color:#0f6b63;letter-spacing:.1em">だれでも同じ 1日3分子</div>
    <div style="position:relative;font-size:100px;font-weight:900;margin-top:16px;letter-spacing:.06em">分子づくり</div>
    <div style="position:relative;font-size:40px;margin-top:18px;line-height:1.5">C は4本、O は2本。<br>手の数で分子を組み立てる。</div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
