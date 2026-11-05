// アプリのアイコン（icon-192.png・icon-512.png・icon-512-maskable.png）を作る。maskable は絵を中心から0.75倍にして、丸く切られても欠けないようにする（安全な範囲は中心の直径80%）。生成りの地に、二重結合でつながる C と O（ホルムアルデヒドの形）。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [s, name, k] of [[192, "icon-192.png", 1], [512, "icon-512.png", 1], [512, "icon-512-maskable.png", 0.75]]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#f6f2e8"/><g transform="translate(50 50) scale(${k}) translate(-50 -50)">
      <g stroke="#1f2933" stroke-width="4.5" stroke-linecap="round"><line x1="34" y1="44" x2="70" y2="44"/><line x1="34" y1="56" x2="70" y2="56"/><line x1="30" y1="50" x2="14" y2="26"/><line x1="30" y1="50" x2="14" y2="74"/></g>
      <circle cx="14" cy="26" r="7" fill="#5f6b76"/><circle cx="14" cy="74" r="7" fill="#5f6b76"/>
      <circle cx="30" cy="50" r="15" fill="#2f3640"/><circle cx="72" cy="50" r="15" fill="#c62828"/>
      <g font-family="sans-serif" font-weight="700" font-size="17" fill="#fff" text-anchor="middle"><text x="30" y="56">C</text><text x="72" y="56">O</text></g></g></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", name), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
