// 分子づくりの検査。分子のデータ（手の数・化学式・同じ形の分子が無いかを、chem.js とは別の数え方で）・問題の選び方（3年分）・ヒント・
// つなぐ/たしかめる/まちがい（別の分子の名前）・続きから・上級・とことん・あとから・カレンダー・実績・分子帳・Ko-fi・スマホ幅・PWA・引き継ぎ・見やすさ。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
const req = createRequire(import.meta.url);
globalThis.window = globalThis;
const M = req(path.join(root, "data.js"));
const X = req(path.join(root, "chem.js"));
const html = readFileSync(path.join(root, "index.html"), "utf8");
const KEY = "bunshi-v1";
const HANDS = { C: 4, N: 3, O: 2, Cl: 1 }; // chem.js とは別に書く（高校化学の手の数）

// 1. 分子のデータ（ブラウザを使わない。chem.js を使わずに確かめる）
{
  const bad = [];
  const names = new Set();
  for (const m of M) {
    const n = m.a.length, used = new Array(n).fill(0), seen = new Set();
    if (names.has(m.n)) bad.push(`${m.n}:名前が重なる`); names.add(m.n);
    if (!m.a.every((e) => e in HANDS)) bad.push(`${m.n}:使えない原子`);
    for (const [i, j, o] of m.b) { const k = Math.min(i, j) + "," + Math.max(i, j); if (i === j || i < 0 || j < 0 || i >= n || j >= n || ![1, 2, 3].includes(o) || seen.has(k)) bad.push(`${m.n}:結合 ${i}-${j}`); seen.add(k); used[i] += o; used[j] += o; }
    const rest = m.a.map((e, i) => HANDS[e] - used[i]);
    if (rest.some((x) => x < 0)) bad.push(`${m.n}:手が多すぎる原子`);
    if (rest.reduce((a, b) => a + b, 0) !== m.h) bad.push(`${m.n}:H の数`);
    // つながり（結合をたどって全部の原子に届く）
    const reach = new Set([0]); let grew = true; while (grew) { grew = false; for (const [i, j] of m.b) { if (reach.has(i) !== reach.has(j)) { reach.add(i); reach.add(j); grew = true; } } }
    if (reach.size !== n) bad.push(`${m.n}:つながっていない`);
    // 化学式：原子の数と H の数が化学式の字と同じ
    const want = {}; for (const e of m.a) want[e] = (want[e] || 0) + 1; if (m.h) want.H = m.h;
    const got = {}; for (const [, e, c] of m.f.matchAll(/(Cl|[CHNO])(\d*)/g)) got[e] = (got[e] || 0) + (c ? +c : 1);
    if (JSON.stringify(Object.entries(want).sort()) !== JSON.stringify(Object.entries(got).sort()) || m.f.replace(/(Cl|[CHNO])\d*/g, "") !== "") bad.push(`${m.n}:化学式 ${m.f}`);
    // 段：1 一重だけ・2 二重あり三重なし・3 三重あり・4 原子4つ以上
    const ords = m.b.map((b) => b[2]), stOk = m.st === 1 ? ords.every((o) => o === 1) : m.st === 2 ? ords.includes(2) && !ords.includes(3) : m.st === 3 ? ords.includes(3) : m.st === 4 ? n >= 4 : false;
    if (!stOk) bad.push(`${m.n}:段 ${m.st}`);
    if (n > 6) bad.push(`${m.n}:原子が6つより多い（盤に収まらない）`);
    if (!m.c || m.c.length > 26 || !m.t || m.t.length > 26) bad.push(`${m.n}:手がかり・ひとことの長さ`);
  }
  check(`分子${M.length}個：手の数・H の数・つながり・化学式・段・文の長さが合う`, bad.length === 0 && M.length >= 40, bad.slice(0, 8).join(" / "));
  // 同じ形の分子が無い：全部の並べ方の中でいちばん小さい書き方（正規形）を比べる（chem.js の same とは別の数え方）
  const perms = (n) => { const out = []; const rec = (a, rest) => { if (!rest.length) return out.push(a); rest.forEach((x, i) => rec([...a, x], rest.filter((_, j) => j !== i))); }; rec([], [...Array(n).keys()]); return out; };
  const P = {}; const canon = (g) => { const n = g.a.length, mt = g.a.map(() => new Array(n).fill(0)); for (const [i, j, o] of g.b) if (o) { mt[i][j] = o; mt[j][i] = o; } let best = null; for (const p of (P[n] = P[n] || perms(n))) { let s = p.map((i) => g.a[i]).join(",") + "|"; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) s += mt[p[i]][p[j]]; if (best === null || s < best) best = s; } return best; };
  const cs = M.map((m) => canon(m)), dup = [];
  cs.forEach((c, i) => cs.forEach((d, j) => { if (i < j && c === d) dup.push(`${M[i].n}=${M[j].n}`); }));
  check("同じ形の分子が2つ入っていない（正規形で比べる）", dup.length === 0, dup.join(" / "));
  // chem.js の same が正規形と同じ答えを出す：全部の組・原子の並びを混ぜたもの・結合を1つ変えたもの
  const R = X.rng(7), wrong = [];
  for (let i = 0; i < M.length; i++) for (let j = 0; j < M.length; j++) if (X.same(M[i], M[j]) !== (cs[i] === cs[j])) wrong.push(`${M[i].n}/${M[j].n}`);
  for (let t = 0; t < 3000; t++) {
    const m = M[Math.floor(R() * M.length)], n = m.a.length, p = X.shuffle([...Array(n).keys()], R), inv = []; p.forEach((x, k) => (inv[x] = k));
    const g = { a: p.map((i) => m.a[i]), b: m.b.map(([i, j, o]) => [inv[i], inv[j], o]) };
    if (!X.same(g, m)) wrong.push(`並べ替え:${m.n}`);
    const h = { a: g.a, b: g.b.map((b) => b.slice()) }; const k = Math.floor(R() * h.b.length); h.b[k][2] = (h.b[k][2] % 3) + 1;
    if (X.same(h, m) !== (canon(h) === cs[M.indexOf(m)])) wrong.push(`1つ変え:${m.n}`);
  }
  check("同じ形かの判定（chem.js）が、正規形の答えと全部一致する（全部の組・並べ替え3000回）", wrong.length === 0, wrong.slice(0, 5).join(" / "));
  const smi = JSON.parse(readFileSync(path.join(root, "tools", "smiles.json"), "utf8"));
  check("tools/smiles.json（RDKit で作った元）と data.js の分子が同じ並び", smi.length === M.length && smi.every(([n], i) => n === M[i].n));
  const groups = Object.values(M.reduce((g, m) => { (g[m.f] = g[m.f] || []).push(m.n); return g; }, {})).filter((g) => g.length > 1);
  check("同じ化学式で別の形の分子（異性体）の組が4組以上ある（まちがえたとき名前を出せる）", groups.length >= 4, groups.map((g) => g.join("・")).join(" / "));
  // ヒント：何も無い盤から、ヒントだけで必ず完成し、完成したら次のヒントは無い
  const hb = [];
  for (const m of M) for (let rep = 0; rep < 4; rep++) {
    const n = m.a.length, p = X.shuffle([...Array(n).keys()], X.rng(X.seedOf(m.n + rep))), g = { a: p.map((i) => m.a[i]), b: [] };
    if (rep % 2) { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (X.rng(X.seedOf(m.n + i + j))() < 0.3) g.b.push([i, j, 1]); } // まちがった結合がある盤からも
    let steps = 0; while (!X.same(g, m) && steps < 30) { const mv = X.hintMove(g, m); if (!mv) break; const [i, j, o] = mv; g.b = g.b.filter(([x, y]) => !((x === i && y === j) || (x === j && y === i))); if (o) g.b.push([i, j, o]); steps++; }
    if (!X.same(g, m) || X.hintMove(g, m) !== null) hb.push(`${m.n}:${rep}`);
  }
  check("ヒントをくり返すと、まちがった結合がある盤からも必ず完成する（完成したらヒントは無い）", hb.length === 0, hb.slice(0, 5).join(" / "));
  // 盤の並べ方：原子どうしが重ならず、盤の中に収まる
  const lb = M.filter((m) => { const L = X.layout(m); return L.pos.some(([x, y]) => x < 70 || x > 930 || y < 70 || y > L.H - 70) || L.pos.some((a, i) => L.pos.some((b, j) => i < j && Math.hypot(a[0] - b[0], a[1] - b[1]) < 300)); });
  check("盤の原子は盤の中で、となりどうし300以上離れる（幅320pxでも押しまちがえない）", lb.length === 0, lb.map((m) => m.n).join("・"));
}

// 2. 問題の選び方（3年分）
{
  const bad = [], seenA = [], P = X.pools(M);
  for (let d = 0; d < 1095; d++) {
    const a = X.daily(M, d), h = X.hard(M, d);
    if (a.length !== 3 || new Set(a).size !== 3 || M[a[0]].st !== 1 || ![2, 3].includes(M[a[1]].st) || M[a[2]].st !== 4) bad.push(`${d}:今日`);
    if (h.length !== 2 || new Set(h).size !== 2 || h.some((x) => a.includes(x)) || h.some((x) => M[x].st === 1)) bad.push(`${d}:上級`);
    if (JSON.stringify(X.daily(M, d)) !== JSON.stringify(a)) bad.push(`${d}:毎回同じでない`);
    seenA.push(a);
  }
  // 1周（並びの長さ）のあいだ、同じ分子は出ない
  const rep = [];
  for (const [slot, pool] of [[0, P.a], [1, P.b], [2, P.c]]) for (let c = 0; c < 6; c++) { const got = seenA.slice(c * pool.length, (c + 1) * pool.length).map((x) => x[slot]); if (got.length === pool.length && new Set(got).size !== pool.length) rep.push(`${slot}:${c}`); }
  check("今日の3分子は一重・二重/三重・大きな分子から1つずつ、上級の2分子は今日と重ならない（3年分・毎回同じ）", bad.length === 0, bad.slice(0, 5).join(" / "));
  { const g = {}, hb = []; for (let d = 0; d < 1095; d++) for (const [x, c] of X.hardDay(M, d)) (g[c] = g[c] || []).push(x); for (const [c, l] of Object.entries(g)) if (new Set(l).size !== l.length) hb.push(c);
    check("上級も1周するまで同じ分子は出ない（3年分。今日と重なって飛ばした分子は後に回す）", hb.length === 0 && Object.keys(g).length > 30, hb.join(",")); }
  check("1周するまで同じ分子は出ない（それぞれの段で6周分）", rep.length === 0, rep.join(" / "));
  const code = readFileSync(path.join(root, "chem.js"), "utf8") + html.replace(/<!-- a11y:begin[\s\S]*?<!-- a11y:end -->/, "");
  check("Math.random() は練習ととことんの並びだけ（今日・上級は日付の種）", (code.match(/Math\.random\(\)/g) || []).length === 2 && !/Math\.random/.test(readFileSync(path.join(root, "chem.js"), "utf8")));
  check("乱数を sort の比較の中で引いていない（引く回数がブラウザで変わる）", !/sort\(\s*\(\)\s*=>/.test(code) && !/sort\([^)]*(R\(\)|Math\.random)/.test(code));
  check("一行の式の途中に // のコメントを置いていない（行の残りが消える）", !html.split("\n").some((l) => /;\s*\/\/[^\n]*\}\s*$/.test(l)));
}

// 3. PWA・ファイル
{
  const sw = readFileSync(path.join(root, "sw.js"), "utf8"), shell = JSON.parse((sw.match(/SHELL = (\[[^\]]+\])/) || [])[1].replace(/'/g, '"'));
  const srcs = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => "./" + m[1]);
  check("sw.js の SHELL に画面の script が全部入っている", srcs.every((s) => shell.includes(s)), srcs.filter((s) => !shell.includes(s)).join(","));
  check("SHELL のファイルが全部ある", shell.every((f) => f === "./" || existsSync(path.join(root, f))));
  const man = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  check("manifest のアイコンが全部ある（maskable も）", man.icons.every((i) => existsSync(path.join(root, i.src))) && man.icons.some((i) => i.purpose === "maskable"));
  check("CSP の connect-src は 'self' だけ（外へ通信しない）", /connect-src 'self';/.test(html));
  check("感想フォームとラベル「感想」", existsSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml")) && /labels:\s*\[?\s*["']?感想/.test(readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8")) && /name:\s*感想フォーム/.test(readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8")));
  check("キーボードの枠の規則が style のいちばん最後にある", /:is\(button,a\):focus-visible\{[^}]*!important\}\s*<\/style>/.test(html));
  check("遊び方に、手の数の出典（教材）と分子の出典（PubChem）がある", /educ\.pref\.fukuoka\.jp/.test(html) && /pubchem\.ncbi\.nlm\.nih\.gov/.test(html));
  check("README に出典がある", /educ\.pref\.fukuoka\.jp/.test(readFileSync(path.join(root, "README.md"), "utf8")) && /PubChem/.test(readFileSync(path.join(root, "README.md"), "utf8")));
}

// 4. ブラウザで遊ぶ
const errors = [];
let browser = null;
try {
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const NOW = new Date("2026-11-10T03:00:00Z"); // 日本時間 11/10 12時。11/5〜11/9 が取りこぼした日になる
  const newPage = async (w = 390, fresh = true) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 820 } });
    const p = await ctx.newPage();
    await p.clock.setFixedTime(NOW);
    p.on("pageerror", (e) => errors.push(String(e)));
    await p.goto(url);
    if (fresh) { await p.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 1, tut: true })), KEY); await p.reload(); }
    return p;
  };
  // いまの分子を、答えの結合のとおりに押す（盤の j 番目の原子は答えの perm[j] 番目）
  const solve = (p, click = false) => p.evaluate(async (click) => {
    const g = window.__bt, st = g.state(), pos = {}; st.L.perm.forEach((t, j) => (pos[t] = j));
    for (const [i, j, o] of st.C.b) for (let k = 0; k < o; k++) { if (click) { document.querySelector(`.atom[data-j="${pos[i]}"]`).click(); document.querySelector(`.atom[data-j="${pos[j]}"]`).click(); } else { g.tap(pos[i]); g.tap(pos[j]); } }
    g.submit();
  }, click);
  const bondsOf = (p, list) => p.evaluate((list) => { const g = window.__bt, st = g.state(), pos = {}; st.L.perm.forEach((t, j) => (pos[t] = j)); for (const [i, j, o] of list) for (let k = 0; k < o; k++) { g.tap(pos[i]); g.tap(pos[j]); } }, list);

  { // はじめて開く：遊び方が出る。ホームの見た目
    const p = await newPage(320, false);
    check("はじめて開くと遊び方が出る", await p.evaluate(() => document.getElementById("howto").open));
    await p.keyboard.press("Escape"); await p.waitForTimeout(100); check("遊び方を Esc で閉じられる", await p.locator("#howto[open]").count() === 0);
  await p.reload(); await p.waitForTimeout(200); check("遊び方を Esc で閉じても、開き直したとき出ない", await p.locator("#howto[open]").count() === 0);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(200); await p.click("#howto-ok"); await p.reload(); await p.waitForTimeout(200); check("遊び方を「わかった」で閉じてすぐ読み直しても出ない", await p.locator("#howto[open]").count() === 0);
  { let again = 0; for (let i = 0; i < 10; i++) { await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(200); await p.keyboard.press("Escape"); await p.reload(); await p.waitForTimeout(200); again += await p.locator("#howto[open]").count(); } check("遊び方を Esc で閉じてすぐ読み直しても出ない（10回）", again === 0); }
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(200); check("「わかった」を押したその場で「見た」が残る", await p.locator("#howto-ok").evaluate((b) => { b.click(); return Object.keys(localStorage).some((k) => { try { return JSON.parse(localStorage.getItem(k)).tut === true; } catch { return false; } }); }));
    check("ホームは幅320pxで横にはみ出さない", await p.evaluate(() => document.documentElement.scrollWidth <= 320));
    const small = await p.$$eval("button, a", (bs) => bs.filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim()));
    check("ホームの押せる所は高さ44px以上", small.length === 0, small.join(","));
    check("ホームに「見やすさ」と「引き継ぎ」がある", (await p.locator("[data-a11y-open]").count()) > 0 && (await p.locator("[data-hk]").count()) > 0);
    await p.context().close();
  }
  { // 今日の3分子を通しで遊ぶ（1つ目は本当に押す）
    const p = await newPage(320);
    await p.click("#go-d");
    const st0 = await p.evaluate(() => window.__bt.state());
    const want = await p.evaluate(() => window.__bt.pick(window.__bt.todayKey(), false).map((i) => window.__bt.MOLS[i].n));
    check("今日の1つ目は日付の種で決まった分子", st0.C.n === want[0], `${st0.C.n} / ${want.join(",")}`);
    check("遊ぶ画面は幅320pxで横にはみ出さない", await p.evaluate(() => document.documentElement.scrollWidth <= 320));
    const atoms = await p.$$eval(".atom", (bs) => { const bd = document.getElementById("board").getBoundingClientRect(); return bs.map((b) => { const r = b.getBoundingClientRect(); return { h: r.height, w: r.width, inside: r.left >= bd.left - 1 && r.right <= bd.right + 1 && r.top >= bd.top - 1 && r.bottom <= bd.bottom + 1 }; }); });
    check("原子のボタンは44px以上で、盤の中にある（幅320px）", atoms.every((a) => a.h >= 44 && a.w >= 44 && a.inside), JSON.stringify(atoms));
    check("つなぐ前は「たしかめる」を押せない", await p.locator("#check").isDisabled());
    // 1つの原子を選ぶと、選んだ印と知らせ
    await p.click('.atom[data-j="0"]');
    check("原子を押すと選んだ印（色だけでなく aria-pressed と知らせの文）", (await p.getAttribute('.atom[data-j="0"]', "aria-pressed")) === "true" && /選んだ/.test(await p.textContent("#msg")));
    await p.click('.atom[data-j="0"]');
    check("同じ原子をもう一度押すと選ぶのをやめる", (await p.getAttribute('.atom[data-j="0"]', "aria-pressed")) === "false");
    // 同じ2つを押すたびに 一重 → 二重 → 三重 → なし
    const ords = [];
    for (let t = 0; t < 4; t++) { await p.click('.atom[data-j="0"]'); await p.click('.atom[data-j="1"]'); ords.push(await p.evaluate(() => { const b = window.__bt.state().bonds; return b.length ? b[0][1] : 0; })); }
    check("同じ2つを押すたびに 一重→二重→三重→なし", JSON.stringify(ords) === "[1,2,3,0]", JSON.stringify(ords));
    await solve(p, true);
    check("答えの形にすると完成し、ひとことと★3が出る", (await p.locator(".verdict").count()) === 1 && (await p.textContent(".verdict")).includes(st0.C.t) && (await p.locator(".verdict .stars").getAttribute("aria-label")) === "星3つ");
    await p.click("#next");
    await p.reload(); // 途中で閉じても続きから
    check("途中で閉じて開くと「続きから（2つ目）」", /続きから（2つ目）/.test(await p.textContent("#go-d")));
    await p.click("#go-d");
    check("続きからは2つ目の分子", (await p.evaluate(() => window.__bt.state().C.n)) === want[1]);
    await solve(p); await p.click("#next"); await solve(p); await p.click("#next");
    const share = await p.textContent(".share");
    check("結果のシェアの文に分子の名前・化学式を出さない", !want.some((n) => share.includes(n)) && !/[CHNO]\d/.test(share) && /#\d+/.test(share), share);
    check("全部★3で初めて終えると、Ko-fi の1行が出る", (await p.locator(".kofi").count()) === 1);
    check("結果の画面にとことんへのボタン（続けて遊べる）", (await p.locator("#go-e").count()) === 1);
    const s = await p.evaluate(() => window.__bt.load());
    check("今日の記録と分子帳に3つ", !!s.days["2026-11-10"] && Object.keys(s.dex).length === 3, JSON.stringify(s.days));
    await p.click("#back");
    await p.click("#go-d");
    check("もう一度開いても Ko-fi は出ない（1日1回）", (await p.locator(".kofi").count()) === 0);
    await p.click("#back");
    // 上級：手がかりなし・ヒントなし・H の数を出さない・今日と重ならない
    await p.click("#go-h");
    const sh = await p.evaluate(() => window.__bt.state());
    check("上級：手がかりと H の数を出さず、ヒントのボタンが無い", sh.blind && (await p.locator("#hint").count()) === 0 && /手がかりなし/.test(await p.textContent(".clue")) && !(await p.$$eval(".atom", (bs) => bs.some((b) => b.textContent.includes("H")))));
    check("上級は今日の3分子と重ならない", !want.includes(sh.C.n));
    await solve(p); await p.click("#next"); await solve(p); await p.click("#next");
    check("上級の記録がつく", !!(await p.evaluate(() => window.__bt.load().hdays["2026-11-10"])));
    await p.click("#back");
    check("実績：はじめての★3・一発でそろえた日・手がかりなしデビュー・名前だけで分かる", await p.evaluate(() => { const a = window.__bt.achOf(window.__bt.load()); return ["s1", "clear", "h1", "hc"].every((id) => a.find((x) => x.id === id).got) && a.length >= 10 && a.length <= 14; }));
    await p.context().close();
  }
  { // まちがい：同じ原子で別の形（エタノールの代わりにジメチルエーテル）を作ると、その名前を出して★が減る
    const p = await newPage();
    const iE = await p.evaluate(() => window.__bt.MOLS.findIndex((m) => m.n === "エタノール"));
    await p.evaluate((i) => window.__bt.startRun("p", i), iE);
    const st = await p.evaluate(() => window.__bt.state()); // 答え：a = [C, C, O]（data の並び）
    const ia = st.C.a.map((e, i) => [e, i]), Cs = ia.filter(([e]) => e === "C").map(([, i]) => i), O = ia.find(([e]) => e === "O")[1];
    await bondsOf(p, [[Cs[0], O, 1], [Cs[1], O, 1]]); // C-O-C
    check("H の数がそろえば「たしかめる」を押せる", !(await p.locator("#check").isDisabled()));
    await p.click("#check");
    check("別の形の分子なら、その名前（ジメチルエーテル）を出し、✕の記号で知らせる", /✕/.test(await p.textContent("#after")) && /ジメチルエーテル/.test(await p.textContent("#after")) && (await p.evaluate(() => window.__bt.state().miss)) === 1);
    await p.click("#reset");
    check("やり直すと結合が消える", (await p.evaluate(() => window.__bt.state().bonds.length)) === 0);
    // 手が多すぎる・ばらばら・H が多い の知らせ
    await bondsOf(p, [[Cs[0], O, 3]]);
    check("手が多すぎる原子は！の印と読み上げの文（色だけにしない）", await p.evaluate(() => { const b = document.querySelector(".atom.over"); return !!b && getComputedStyle(b, "::after").content.includes("！") && /手が多すぎる/.test(b.getAttribute("aria-label")); }) && (await p.locator("#check").isDisabled()));
    await p.click("#reset");
    await bondsOf(p, [[Cs[0], Cs[1], 1]]);
    check("ばらばらの原子があると知らせ、たしかめられない", /ばらばら/.test(await p.textContent("#msg")) && (await p.locator("#check").isDisabled()));
    await p.click("#reset");
    await bondsOf(p, [[Cs[0], Cs[1], 2], [Cs[1], O, 1]]);
    check("H が足りないと知らせる", /足りない/.test(await p.textContent("#msg")));
    await p.click("#reset");
    // ヒントで1本つなぎ、残りを作ると★2
    await p.click("#hint");
    check("ヒントは答えの結合を1つつなぎ、知らせを出す", (await p.evaluate(() => window.__bt.state().bonds.length)) === 1 && /ヒント/.test(await p.textContent("#after")));
    await p.click("#reset");
    await solve(p);
    check("まちがい1回・ヒント1回で★2", (await p.locator(".verdict .stars").getAttribute("aria-label")) === "星2つ");
    await p.click("#next");
    check("練習は今日の記録を増やさず、分子帳には載る", await p.evaluate(() => { const s = window.__bt.load(); return !Object.keys(s.days).length && s.dex["エタノール"] === 2; }));
    // 分子帳：段ごとに全部、まだの分子も押すと練習できる
    await p.click("#go-dex");
    check("分子帳に全部の分子が段ごとに並ぶ", (await p.locator(".dex button").count()) === (await p.evaluate(() => window.__bt.MOLS.length)) && (await p.locator(".dexh").count()) === 4);
    await p.click(".dex button.unk >> nth=0");
    check("分子帳のまだの分子を押すと、その分子だけ練習できる", (await p.evaluate(() => window.__bt.mode())) === "p" && !!(await p.evaluate(() => window.__bt.state().C)));
    await p.context().close();
  }
  { // とことん：まちがいで🎫を使い、🎫が無いときにまちがえると終わり。自己ベストが残る
    const p = await newPage();
    await p.click("#go-e");
    const list = await p.evaluate(() => window.__bt.load().runs.e.list.map((i) => window.__bt.MOLS[i].st));
    check("とことんは一重→二重→三重→大きな分子の順で全部、2周目は手がかりなし", list.length === (await p.evaluate(() => window.__bt.MOLS.length)) * 2 && list.slice(0, list.length / 2).every((s, i, a) => i === 0 || a[i - 1] <= s));
    await solve(p); await p.click("#next"); await solve(p); await p.click("#next");
    // 3つ目で、手の数はそろうが答えでない形を作る（作れない分子は飛ばす）
    let outs = 0;
    for (let t = 0; t < 20 && outs < 4; t++) {
      const wrong = await p.evaluate(() => { const g = window.__bt, st = g.state(), X = g.X; const pos = {}; st.L.perm.forEach((t, j) => (pos[t] = j)); for (const m of g.MOLS) { if (m === st.C || m.f !== st.C.f || X.same(m, st.C)) continue; const map = X.bestMap({ a: st.L.a, b: [] }, m); if (!map) continue; const inv = {}; map.forEach((t, j) => (inv[t] = j)); return m.b.map(([i, j, o]) => [inv[i], inv[j], o]); } return null; });
      if (!wrong) { await solve(p); await p.click("#next"); continue; }
      await p.evaluate((w) => { const g = window.__bt; for (const [i, j, o] of w) for (let k = 0; k < o; k++) { g.tap(i); g.tap(j); } g.submit(); }, wrong);
      outs++;
      if (await p.locator("#eres").count()) break;
      await p.click("#reset");
    }
    check("とことん：🎫3枚を使い切ったあとのまちがいで終わる", (await p.locator("#eout").count()) === 1 && outs === 4, `まちがい${outs}回`);
    check("とことんの自己ベストが残る", (await p.evaluate(() => window.__bt.load().ebest)) >= 2);
    await p.context().close();
  }
  { // あとから：取りこぼした日を遊ぶと pdays に入り、連続の日には入らない
    const p = await newPage();
    const miss = await p.evaluate(() => window.__bt.missed(window.__bt.load()));
    check("取りこぼした日は始めた日（11/5）から昨日まで", JSON.stringify(miss) === JSON.stringify(["2026-11-09", "2026-11-08", "2026-11-07", "2026-11-06", "2026-11-05"]), JSON.stringify(miss));
    await p.click("#go-cal");
    check("カレンダーに取りこぼした日の ↺ ボタン", (await p.locator(".cal button.d").count()) === 5);
    await p.click('.misses button[data-k="2026-11-08"]');
    const n0 = await p.evaluate(() => window.__bt.state().C.n), want = await p.evaluate(() => window.__bt.MOLS[window.__bt.pick("2026-11-08", false)[0]].n);
    check("あとからはその日の3分子と同じ", n0 === want);
    for (let i = 0; i < 3; i++) { await solve(p); await p.click("#next"); }
    const s = await p.evaluate(() => window.__bt.load());
    check("あとから遊んだ日は pdays に入り、今日の記録・連続には入らない・シェアしない", !!s.pdays["2026-11-08"] && !Object.keys(s.days).length && (await p.locator("#share").count()) === 0 && (await p.evaluate(() => window.__bt.streak(window.__bt.load().days))) === 0);
    await p.click("#go-cal");
    check("カレンダーにあとから遊んだ日の印（点線）", (await p.locator('.cal .d.later[data-k="2026-11-08"]').count()) === 1);
    await p.click("#back"); await p.click("#go-ach");
    check("実績の画面に全部の実績と、まだのものの進み具合", (await p.locator(".ach").count()) === (await p.evaluate(() => window.__bt.ACH.length)) && (await p.locator(".ach .pg i").count()) > 0);
    await p.context().close();
  }
  { // 別のタブ：できたと確かめたあと、保存の読み直しまでに別のタブが進めていたら、できた画面を出さない
    const p = await newPage();
    await p.click("#go-p");
    const r = await p.evaluate((K) => { const g = window.__bt, st = g.state(), pos = {}; st.L.perm.forEach((t, j) => (pos[t] = j)); for (const [i, j, o] of st.C.b) for (let k = 0; k < o; k++) { g.tap(pos[i]); g.tap(pos[j]); } const orig = Storage.prototype.getItem; let n = 0; Storage.prototype.getItem = function (k) { const v = orig.call(this, k); if (k !== K || ++n < 2) return v; const s = JSON.parse(v); s.runs.p = Object.assign({}, s.runs.p, { id: "other-tab" }); return JSON.stringify(s); }; try { g.submit(); } finally { Storage.prototype.getItem = orig; } return { n, verdict: !!document.querySelector(".verdict") }; }, KEY);
    check("できたときに別のタブで回が変わっていたら、できた画面を出さない", r.n >= 2 && !r.verdict, JSON.stringify(r));
    check("保存に失敗したあと別のタブが保存しても、両方の日の記録を残し、分子帳の★は高いほう", await p.evaluate((K) => { const g = window.__bt, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, days: { "2000-01-01": { m: [0] } }, dex: { "エタン": 3 } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, days: { "2000-01-02": { m: [0] } }, dex: { "エタン": 1 } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && !!r.days["2000-01-02"] && r.dex["エタン"] === 3; }, KEY));
    check("保存に失敗したタブの時刻が進んでいても、別のタブで先に進んだ途中経過を古いメモリで戻さない", await p.evaluate((K) => { const g = window.__bt, s0 = g.load(), base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], id: "x", res: [] }; mem = JSON.stringify(Object.assign({}, s0, { t: 99, runs: { d: Object.assign({}, base) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 1, runs: { d: Object.assign({}, base, { res: [0] }) } }))); const r = g.load(); mem = null; return r.runs.d.res.length === 1; }, KEY));
    check("結果を見る前に別のタブが次の日を保存しても、終えた日の記録を残す", await p.evaluate((K) => { const g = window.__bt, s0 = g.load(), base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], res: [] }; mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: { d: Object.assign({}, base, { res: [0, 0, 1] }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: { d: Object.assign({}, base, { date: "2000-01-02" }) } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && r.runs.d.date === "2000-01-02"; }, KEY));
    check("時計が戻っても、保存の時刻 t は前より大きくなる", await p.evaluate((K) => { const s0 = JSON.parse(localStorage.getItem(K)); const far = Date.now() + 1e9; localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: far }))); save(() => {}); return JSON.parse(localStorage.getItem(K)).t > far; }, KEY));
    await p.context().close();
  }
  { // 引き継ぎコードや手で書きかえた記録に、字や範囲外の数が入っていても、画面の HTML に入れず、落ちない
    const p = await newPage();
    await p.evaluate((K) => localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, dex: { "エタン": "<img src=x onerror=window.__x=1>", "酢酸": 99, "ないもの": 3 }, ebest: "<b>9</b>", days: { "2026-11-09": { m: ["<i>", 1, 0] }, "<x>": { m: [0] } }, runs: { e: { mode: "e", date: "2026-11-10", list: [0, 1], res: [], life: "<script>" }, d: { mode: "d", date: "2026-11-10", list: ["a"], res: [] }, p: { mode: "p", date: "x", list: [0], res: "bad" } }, apark: { "2026-11-08": { bad: 1 } } })), KEY);
    await p.reload();
    const s = await p.evaluate(() => window.__bt.load());
    check("記録の値をそろえる：星は1〜3の数・知らない分子は消す・自己ベストは数・形のちがう途中経過は捨てる", s.dex["エタン"] === 1 && s.dex["酢酸"] === 3 && !("ないもの" in s.dex) && s.ebest === 0 && s.days["2026-11-09"].m[0] === 0 && !s.days["<x>"] && s.runs.e.life === 0 && s.runs.d === null && s.runs.p === null && s.apark["2026-11-08"] === null, JSON.stringify(s).slice(0, 300));
    await p.click("#go-dex"); await p.click("#back"); await p.click("#go-e");
    check("書きかえた記録で分子帳・とことんを開いても、HTML が入らずエラーも出ない", (await p.evaluate(() => !window.__x && !document.querySelector("img[src=x]")) && (await p.locator("#life").count()) === 1));
    await p.context().close();
  }
  { // ありえない日付の記録は取り込まない・始めた日より前は今日と上級を始めない（2026-11-06 CodeRabbit）
    const p = await newPage(390, false);
    await p.evaluate((K) => localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, days: { "2026-02-30": { m: [0, 0, 0] } }, runs: { d: { mode: "d", date: "2026-11-99", list: [0, 1, 2], res: [0, 0, 0], id: "x" } } })), KEY);
    await p.reload();
    const r = await p.evaluate(() => { const s = window.__bt.load(); return { d: s.runs.d, days: Object.keys(s.days), home: !!document.querySelector("#go-d") }; });
    check("ありえない日付（11/99・2/30）の記録は捨てて、ホームが開く", r.d == null && r.days.length === 0 && r.home, JSON.stringify(r));
    await p.context().close();
    const q = await browser.newContext({ viewport: { width: 390, height: 820 } }), qp = await q.newPage();
    await qp.clock.setFixedTime(new Date("2026-11-03T03:00:00Z")); qp.on("pageerror", (e) => errors.push(String(e)));
    await qp.goto(url); await qp.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 1, tut: true })), KEY); await qp.reload();
    const t = await qp.locator("#go-d").innerText();
    await qp.evaluate(() => { window.__bt.startRun("d"); window.__bt.startRun("h"); });
    const runs = await qp.evaluate(() => window.__bt.load().runs);
    check("始めた日より前の日付では、今日・上級を始めず、遊べる日を出す", /11\/5から遊べます/.test(t) && !runs.d && !runs.h, JSON.stringify({ t, runs }));
    await q.close();
  }
  { // 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
    const sample = { [KEY]: JSON.stringify({ v: 1, tut: true, days: { "2026-11-09": { m: [0, 1, 0] } }, hdays: {}, pdays: {}, dex: { "エタン": 3, "酢酸": 2 }, runs: {}, kofi: {}, ach: {}, apark: {}, ebest: 7, t: 1 }) };
    await checkTransfer({ browser, url, game: "bunshi-tsukuri", sample, check, open: async (page) => { await page.evaluate(() => { const d = document.getElementById("howto"); if (d.open) d.close(); }); } });
  }
} catch (e) {
  check("QA の操作が最後まで完了する", false, e.message.split("\n")[0]);
} finally {
  if (browser) await browser.close();
}
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し。routines/game-dev.md「だれでも遊べるように」）
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# 分子づくり QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
