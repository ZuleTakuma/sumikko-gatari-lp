# すみっコがたり LP（最新動画を自動表示）

YouTubeチャンネル「すみっコがたり」を紹介する1ページLP。
**最新動画＋過去動画を自動で取得・表示**します。動画を更新するたびにサイトを触る必要はありません。

## 仕組み

- `server.js` が YouTube の **RSSフィード**（APIキー不要・クォータ消費なし）をサーバー側で取得
- `/api/videos` が動画リストをJSONで返す（15分キャッシュ付き）
- `public/index.html` がそれを読み込み、先頭を「最新動画」として大きく埋め込み、残りを「これまでのすみっコ」グリッドに並べる
- 過去動画はサムネをタップするとその場で再生

RSSは**最新15件**を返します。それより古い動画は出ません（YouTubeのRSS仕様）。

## ローカルで動かす

```bash
npm install
npm start
# → http://localhost:3000
```

## Render へデプロイ

1. このフォルダをGitHubリポジトリにpush（例: `ZuleTakuma/sumikko-gatari-lp`）
2. Render ダッシュボード → New → Web Service → 該当リポジトリを選択
3. 設定（`render.yaml` があれば自動認識）:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Create Web Service → 数分で公開URLが発行されます

`render.yaml` を含めているので、Renderの「Blueprint」からも一発でデプロイ可能です。

## 別のチャンネルに使う場合

`server.js` 冒頭の `CHANNEL_ID` を差し替えるだけです。

## カスタマイズの目印（index.html）

- 概要文・哲学・二人のプロフィール → HTML内に直書き
- 配色 → `:root` のCSS変数（`--corner` が朱色のアクセント）
- 最新動画の判定 → APIが返す配列の先頭（＝公開日が最新）

## 注意

- 無料プランのRenderは一定時間アクセスがないとスリープし、次のアクセスで起動に十数秒かかります。常時起動が必要なら有料プランへ。
- RSSが一時的に取れないときは、サイトは「読み込めませんでした」を表示します（直前のキャッシュがあればそれを表示）。
