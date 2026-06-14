// すみっコがたり LP 用 APIサーバー
// YouTube の RSS フィードをサーバー側で取得し、CORS を許可して JSON で返す。
// RSS は認証不要・APIキー不要・クォータ消費なしで最新15件が取れる。

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// 対象チャンネル（すみっコがたり）
const CHANNEL_ID = "UCnPZGAjHk7E8t2YPGPNNmGg";
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

// 簡易メモリキャッシュ（15分）。YouTube への過剰アクセスを防ぐ。
let cache = { data: null, fetchedAt: 0 };
const CACHE_MS = 15 * 60 * 1000;

// XML から必要な値をざっくり抜き出す（依存ライブラリ無しの軽量パース）
function parseFeed(xml) {
  const entries = [];
  const blocks = xml.split("<entry>").slice(1); // 最初のブロックはチャンネル情報なので捨てる
  for (const block of blocks) {
    const pick = (tag) => {
      const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return m ? m[1].trim() : "";
    };
    const videoId = pick("yt:videoId");
    if (!videoId) continue;
    const title = pick("title")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

    // タイトルに #shorts が付いた動画（ショート）は一覧から除外する。
    // 大文字小文字の違い（#Shorts / #SHORTS）も無視して判定。
    if (/#shorts\b/i.test(title)) continue;

    const published = pick("published");
    const views = (block.match(/views="(\d+)"/) || [])[1] || null;

    entries.push({
      videoId,
      title,
      published,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      views: views ? Number(views) : null,
    });
  }
  return entries;
}

app.get("/api/videos", async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  try {
    const now = Date.now();
    if (cache.data && now - cache.fetchedAt < CACHE_MS) {
      return res.json({ source: "cache", videos: cache.data });
    }
    const r = await fetch(RSS_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (sumikko-gatari-lp)" },
    });
    if (!r.ok) throw new Error(`RSS fetch failed: ${r.status}`);
    const xml = await r.text();
    const videos = parseFeed(xml);

    cache = { data: videos, fetchedAt: now };
    res.json({ source: "live", videos });
  } catch (err) {
    console.error(err);
    // 取得失敗時、古いキャッシュがあればそれを返す（サイトが空にならないように）
    if (cache.data) return res.json({ source: "stale-cache", videos: cache.data });
    res.status(502).json({ error: "動画の取得に失敗しました", videos: [] });
  }
});

// 静的ファイル（LP本体）を配信
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => console.log(`すみっコがたり LP → http://localhost:${PORT}`));
