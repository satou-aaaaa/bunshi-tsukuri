# 分子づくり

原子の手の数を手がかりに、原子を結合でつないで分子を組み立てる。だれでも同じ1日3分子のパズル。化学式と分子の形がいっしょに覚えられます。

- 遊ぶ: <https://satou-aaaaa.github.io/bunshi-tsukuri/>
- 2つの原子を順に押すと結合ができ、同じ2つを押すたびに 一重 → 二重 → 三重 → なし と変わります。
- 原子の手の数は C 4本・N 3本・O 2本・Cl 1本・H 1本。あまった手には H（水素）が自動でつきます。H の数が化学式とそろったら「たしかめる」。名前の分子と同じ形なら完成です。同じ原子で別の形の分子（異性体）を作ると、その分子の名前が出ます。
- 今日の3分子（一重だけ・二重/三重がある・大きな分子から1つずつ）はだれでも同じで1日1回。上級（手がかりと H の数なし・ヒントなしの2分子）、とことん（全部の分子を順に。🎫3枚）、練習、取りこぼした日をあとから、分子帳、実績、カレンダーがあります。時間制限はありません。
- 記録は遊ぶ人のブラウザにだけ残り、ゲームから自動で外へ送ることはありません。例外は2つ：文字（Google Fonts）を読み込むとき、まだ端末に保存が無ければ Google に IP アドレスが届きます。「Xで投稿」「LINEで送る」「結果をシェア」を押したときだけ、結果の文が選んだ先に渡ります（分子の名前や答えは入りません）。別の端末へは「引き継ぎ」のコードか QR で移せます。

## 出典

- 原子の手の数（価標）：高校化学の共有結合のきまり。[福岡県教育センター「共有結合」教材](https://www.educ.pref.fukuoka.jp/wp-content/uploads/w3educ/2023/11/up_VOXOJIA67R02_%E9%85%8D%E4%BF%A1%E6%95%99%E6%9D%90%EF%BC%88%E5%85%B1%E6%9C%89%E7%B5%90%E5%90%88%EF%BC%89.pdf)
- 分子の形と性質のひとこと：[PubChem](https://pubchem.ncbi.nlm.nih.gov/)（米国国立医学図書館）などで確かめています。分子の一覧は `tools/molecules.tsv`（名前・SMILES・手がかり・ひとこと）。
- ベンゼンは二重と一重が交互の形（ケクレ構造）で作ります。

## 開発

```bash
bash scripts/setup.sh   # 最初に一度
node qa/run.mjs         # 検査（CI と同じ）
pip install rdkit && python3 tools/make-data.py   # 分子の一覧（tools/molecules.tsv）を直したとき。data.js を作り直す
node tools/make-icons.cjs && node tools/make-og.cjs   # アイコンと SNS 用の絵を作り直すとき
```

感想は [Issue のフォーム](https://github.com/satou-aaaaa/bunshi-tsukuri/issues/new?template=feedback.yml) からどうぞ。
