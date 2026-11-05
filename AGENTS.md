# AGENTS.md

分子づくり：原子の手の数（C 4・N 3・O 2・Cl 1・H 1）を手がかりに、原子を結合でつないで分子を組み立てる1日3分子のパズル。`index.html` と `chem.js`（手の数・同じ形かの判定・問題の選び方）・`data.js`（分子）を GitHub Pages で公開する。

## 準備（最初に一度）

```bash
bash scripts/setup.sh   # Node.js（版は .nvmrc）を確かめ、検査の依存とブラウザを入れる。何度実行してもよい
```

## push する前の確認

```bash
node qa/run.mjs   # 分子のデータ（手の数・化学式・同じ形の分子が無いかを別の数え方で）・3分子の組み方（3年分）・ヒント・つなぐ/たしかめる/まちがい・続きから・上級・とことん・あとから・カレンダー・実績・分子帳・Ko-fi・スマホ幅・PWA・引き継ぎ・見やすさ（CI の QA と同じ）
```

## このリポジトリの決まり

- `data.js`・`tools/smiles.json` は `python3 tools/make-data.py`（RDKit）で `tools/molecules.tsv` から作る（手で直さない）。分子を足すときは、名前と構造（SMILES）を PubChem などの一次資料で確かめ、ひとこと（26字以内）は今も正しい事実か出典で確かめる（2026-11-05「使われた」と過去にして不正確だった行を直した）。原子は H 以外で6つまで（盤に収まる数）。
- 段：1 一重だけ・2 二重あり・3 三重あり・4 原子4つ以上。今日の3分子は 1・2か3・4 から1つずつ、上級は 2〜4 から今日と重ねない2つ（`chem.js` の `daily`・`hard`）。1周するまで同じ分子は出ない。`molecules.tsv` の並びや段を変えると過去の日の分子も変わるので、変えた PR に一言書く。
- 完成は「名前の分子と同じ形（原子の種類と、どの2つが何重でつながるかが全部同じ）」。手の数がそろっていても別の形ならまちがいで、知っている分子ならその名前を出す（異性体を学ぶため）。H の数がそろうまでは「たしかめる」を押せない（まちがいに数えない）。
- 今日の3分子・上級は日本時間の日付から作る種で決まり、だれでも同じ。`Math.random()` は練習ととことんの並びだけ（QA が数を見る）。盤の原子の並びは分子の名前から決める。
- ★はまちがい＋ヒントの数（0で★3・2まで★2・それ以上★1）。ヒントは答えの結合を1つつなぐ。上級は手がかり・H の数を出さず、ヒントなし。時間制限は付けない。
- 今日の3分子・上級は1日1回で、途中で閉じても次の分子から続き。途中経過はモードごとに分けて保存し（`runs.d`・`runs.h`・`runs.p`・`runs.a`・`runs.e`）、練習で今日・上級の途中を消さない。答えを入れる前に、保存した進み具合が画面と同じ分子か確かめる（古いタブで二重に入れない）。保存に失敗したあとは、途中経過を時刻でなく進み具合で選び、分子帳の★は高いほうを残す（shared-workflows `incidents/2026-11-04-daily-game-save-gaps.md`）。
- 共有は遊ぶ人が押したときに開くリンク（X・LINE・Web Share・コピー）だけ。シェアの文に分子の名前・化学式を出さない（★だけ）。
- 文字は少なめ・一画面一分子。お笑いの言葉は入れない。ほかの作品の名前・キャラ・見た目は使わない。
- 感想は「感想を送る」から GitHub の Issue フォーム（`.github/ISSUE_TEMPLATE/feedback.yml`、ラベル「感想」、フォーム名は「感想フォーム」）を開くだけ。名前・メールは聞かない。週1で shared-workflows `routines/game-feedback.md` が読んで直す。
- 応援は Ko-fi（https://ko-fi.com/satouaaaaa）へのただのリンクだけ。今日の3分子・上級を初めて終えて全部★3のときだけ、結果の画面の下に1行（共有フォルダ kofi/app-guide.md）。遊ぶのは無料のまま、有料版は置かない。
- 外へ通信しない。外から読むのは Google Fonts の文字だけ（CSP の `connect-src 'self'` を広げない）。記録は遊ぶ人のブラウザ（localStorage）だけ。
- 見やすさの設定（`<!-- a11y:begin -->`〜`<!-- a11y:end -->`）と `transfer.js`（data-keys は自分の記録のキー `bunshi-v1` だけ）・`qa/a11y.mjs`・`qa/transfer-check.mjs` は shared-workflows の template の写し。ここでは直さず、ひな形を直して写し直す。原子は色だけでなく字（C・N・O・Cl）でも分かり、手が多すぎる原子は！の印と読み上げの文で知らせる。
- 同じ日はどの端末でも同じ問題にする：乱数は `sort` の比較の中で引かない（QA が見る）。少し遅れて動く処理（setTimeout）は、画面が替わっていたら何もしない。一行の式の途中にコメント `//` を足さない（2026-11-05 作っている途中に画面が真っ白になった。QA が見る）。
- 押せる所は高さ44px以上、原子のボタンは幅320pxでも44px以上で盤の中（QA が見る）。機能を足す・直すたびに `qa/run.mjs` に検査を足す。乱数で組む部分は何年分も作って確かめる（shared-workflows `incidents/2026-10-31-roppo-empty-village.md`）。
- PWA（`manifest.webmanifest`・`sw.js`・`icon-*.png`）：画面のファイルを足したら `sw.js` の `SHELL` にも足し、中身を大きく変えたら `CACHE` の版を上げる。アイコンは `node tools/make-icons.cjs`、SNS 用の絵 `og.png` は `node tools/make-og.cjs`（今日の分子を入れない）。
- 公開リポジトリなので、個人情報・鍵を入れない。

## 公開

- GitHub Pages は `main` のルート（`/`）を公開する。PR の QA と Secret scan が ✅ になると `automerge.yml` が自動でマージする。止めたいときは下書きにするか、ラベル「自動マージしない」を付ける。
- `sw.js`・`manifest.webmanifest` を変える PR は自動ではマージされない（`hold_paths`）。CodeRabbit のレビューを待ち、手でマージする直前に今の head へのレビューを読み直す（shared-workflows `incidents/2026-11-01-roppo-merged-before-review.md`）。CodeRabbit は PR に `@coderabbitai review` とコメントして頼む。

## 共通のきまり

- PR の作り方・マージの仕方は satou-aaaaa/shared-workflows の `routines/pr.md`、全体のきまりは `routines/common.md` に従う。
- CI の部品は shared-workflows の共通部品を呼ぶ。リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
- Claude 以外の AI・人が作業するときは、shared-workflows の `routines/tool-map.md` と `routines/without-claude.md` を読む。
