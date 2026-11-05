// 分子づくり：原子の手の数・つながり・同じ形か（原子の対応を順に決めて確かめる）・問題の選び方。index.html と qa/run.mjs で使う。
(function (root) {
  "use strict";
  // 原子の手の数（価標の数）：H 1・O 2・N 3・C 4・Cl 1（高校化学の共有結合。福岡県教育センター「共有結合」教材）
  const HANDS = { C: 4, N: 3, O: 2, Cl: 1 };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function seedOf(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function shuffle(arr, R) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const key = (i, j) => (i < j ? i + "-" + j : j + "-" + i);
  function mat(g) { const n = g.a.length, m = g.a.map(() => new Array(n).fill(0)); for (const [i, j, o] of g.b) if (o > 0) { m[i][j] = o; m[j][i] = o; } return m; }

  // 盤の様子 g = { a: [元素], b: [[i, j, 何重か]] } を調べる：原子ごとの使った手・H の数・手が多すぎる原子・全部つながっているか・H の合計
  function check(g) {
    const n = g.a.length, used = new Array(n).fill(0), adj = g.a.map(() => []);
    for (const [i, j, o] of g.b) if (o > 0) { used[i] += o; used[j] += o; adj[i].push(j); adj[j].push(i); }
    const hs = g.a.map((e, i) => HANDS[e] - used[i]);
    const over = []; hs.forEach((h, i) => { if (h < 0) over.push(i); });
    const seen = new Set([0]), st = [0];
    while (st.length) { const x = st.pop(); for (const y of adj[x]) if (!seen.has(y)) { seen.add(y); st.push(y); } }
    return { used, hs, over, connected: seen.size === n, h: hs.reduce((t, x) => t + Math.max(0, x), 0) };
  }
  // 作り終えたか：手が多すぎる原子が無く、全部つながり、H の数が目標と同じ（このとき分子式は目標と同じ）
  const ready = (g, h) => { const c = check(g); return !c.over.length && c.connected && c.h === h; };

  // 同じ形か：原子の種類と、どの2つが何重でつながるかが全部そろう対応があるか（6原子までなので順に試せば足りる）
  function same(g1, g2) {
    const n = g1.a.length;
    if (n !== g2.a.length || [...g1.a].sort().join() !== [...g2.a].sort().join()) return false;
    const A = mat(g1), B = mat(g2), map = new Array(n).fill(-1), used = new Array(n).fill(false);
    const go = (i) => {
      if (i === n) return true;
      for (let j = 0; j < n; j++) {
        if (used[j] || g2.a[j] !== g1.a[i]) continue;
        let ok = true; for (let k = 0; k < i; k++) if (A[i][k] !== B[j][map[k]]) { ok = false; break; }
        if (!ok) continue;
        map[i] = j; used[j] = true; if (go(i + 1)) return true; used[j] = false;
      }
      map[i] = -1; return false;
    };
    return go(0);
  }
  // いまの結合とのちがいがいちばん少ない、答えへの原子の対応（ヒントで、すでに合っている所を崩さないため）
  function bestMap(g, t) {
    const n = g.a.length, A = mat(g), B = mat(t), map = new Array(n).fill(-1), used = new Array(n).fill(false);
    let best = null, bestScore = -1;
    const go = (i, score) => {
      if (i === n) { if (score > bestScore) { bestScore = score; best = map.slice(); } return; }
      for (let j = 0; j < n; j++) {
        if (used[j] || t.a[j] !== g.a[i]) continue;
        let s = score; for (let k = 0; k < i; k++) if (A[i][k] === B[j][map[k]]) s++;
        map[i] = j; used[j] = true; go(i + 1, s); used[j] = false;
      }
      map[i] = -1;
    };
    go(0, 0);
    return best;
  }
  // ヒント：答えとちがう2つの原子の結合を1つ、答えの何重かにする。[i, j, 何重か]（どれも合っていれば null）
  function hintMove(g, t, avoid) {
    const m = bestMap(g, t); if (!m) return null;
    const A = mat(g), B = mat(t), n = g.a.length, diffs = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const want = B[m[i]][m[j]]; if (A[i][j] !== want) diffs.push([i, j, want]); }
    const pick = diffs.find(([i, j, o]) => o > 0 && !(avoid && avoid.has(key(i, j)))) || diffs.find(([i, j]) => !(avoid && avoid.has(key(i, j)))) || diffs[0];
    return pick || null;
  }

  // 盤の並べ方：原子を輪の上に、名前から決まる順で置く（答えのつながり順にしない。だれでも同じ並び）
  function layout(mol) {
    const n = mol.a.length, perm = shuffle([...Array(n).keys()], rng(seedOf("lay:" + mol.n)));
    const R = n === 2 ? 270 : n === 3 ? 290 : 320, cx = 500, cy = n === 2 ? 340 : 430;
    const pos = perm.map((_, k) => { const ang = (n === 2 ? Math.PI : -Math.PI / 2) + (2 * Math.PI * k) / n; return [Math.round(cx + R * Math.cos(ang)), Math.round(cy + R * Math.sin(ang))]; });
    return { a: perm.map((i) => mol.a[i]), perm, pos, H: n === 2 ? 680 : 860 };
  }

  // 問題の選び方。段：1 一重だけ・2 二重あり・3 三重あり・4 大きな分子
  function pools(M) { const idx = (f) => M.map((m, i) => (f(m) ? i : -1)).filter((i) => i >= 0); return { a: idx((m) => m.st === 1), b: idx((m) => m.st === 2 || m.st === 3), c: idx((m) => m.st === 4) }; }
  // n 日目に並びの何番目を使うか。1周（並びの長さの日数）ごとに種で混ぜ直し、1周するまで同じものは出ない
  function cyc(pool, salt, n) { const L = pool.length, c = Math.floor(n / L), order = shuffle(pool, rng(seedOf(salt + ":" + c))); return order[((n % L) + L) % L]; }
  // 今日の3分子：一重だけ・二重/三重・大きな分子から1つずつ（n は始めた日からの日数）
  function daily(M, n) { const P = pools(M); return [cyc(P.a, "a", n), cyc(P.b, "b", n), cyc(P.c, "c", n)]; }
  // 上級の2分子：二重/三重と大きな分子をまぜた並びを、始めた日から順に1日2つずつ使う。今日の3分子と同じものはその日は飛ばして後に回し、
  // 1周（並びを全部使う）するまで同じ分子は出さない。残りが足りなくなったら、残りを先にして次の周の並びをつなぐ（日ごとの番号から直接は決めない。2026-11-05 CodeRabbit）
  const HCACHE = new WeakMap();
  function hardDay(M, n) { // [[分子, 何周目], [分子, 何周目]]
    let memo = HCACHE.get(M);
    if (!memo) { memo = { days: [], queue: [], cyc: 0 }; HCACHE.set(M, memo); }
    const P = pools(M), pool = P.b.concat(P.c);
    while (memo.days.length <= n) {
      const today = daily(M, memo.days.length), out = [], free = () => memo.queue.filter(([x]) => !today.includes(x));
      while (free().length < 2) { const c = memo.cyc++; memo.queue = memo.queue.concat(shuffle(pool, rng(seedOf("h:" + c))).map((x) => [x, c])); }
      for (const q of memo.queue) if (out.length < 2 && !today.includes(q[0]) && !out.some((o) => o[0] === q[0])) out.push(q);
      memo.queue = memo.queue.filter((q) => !out.includes(q));
      memo.days.push(out);
    }
    return n < 0 ? [] : memo.days[n].map((q) => q.slice());
  }
  const hard = (M, n) => hardDay(M, n).map((q) => q[0]);
  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  const sub = (f) => f.replace(/\d+/g, (d) => [...d].map((c) => SUB[+c]).join(""));

  const B = { HANDS, rng, seedOf, shuffle, key, mat, check, ready, same, bestMap, hintMove, layout, pools, cyc, daily, hard, hardDay, sub };
  if (typeof module !== "undefined") module.exports = B; else root.CHEM = B;
})(this);
