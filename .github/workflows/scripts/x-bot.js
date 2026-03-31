const { TwitterApi } = require('twitter-api-v2');
const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const scriptsDir = __dirname;
const postedFile = path.join(scriptsDir, 'posted.json');

// Hafıza dosyasını sağlama alalım
if (!fs.existsSync(postedFile)) { fs.writeFileSync(postedFile, '[]'); }

let postedUrls = [];
try {
    postedUrls = JSON.parse(fs.readFileSync(postedFile, 'utf8'));
} catch (e) {
    postedUrls = [];
}

const client = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

const parser = new Parser();

async function runBot() {
  console.log("Tarama basliyor...");
  let allNews = [];
  const feeds = ["https://www.ft.com/?format=rss", "https://www.bloomberght.com/rss", "https://www.reutersagency.com/feed/"];

  for (const url of feeds) {
    try {
      const feed = await parser.parseURL(url);
      feed.items.forEach(item => {
        if (item.link && !postedUrls.includes(item.link)) {
          allNews.push({ title: item.title, link: item.link, source: (feed.title || "News").split(" - ")[0] });
        }
      });
    } catch (e) {}
  }

  if (allNews.length > 0) {
    const news = allNews[0];
    try {
      // @metadoloji için tweet formatı
      const tweetText = `🔴 RADAR: ${news.source}\n\n${news.title}\n\n${news.link}\n\nvia @metadoloji`;
      await client.v2.tweet(tweetText);
      console.log("Tweet basarili!");
      
      postedUrls.push(news.link);
      fs.writeFileSync(postedFile, JSON.stringify(postedUrls.slice(-100)));
    } catch (error) {
      console.error("X Hatasi:", error.data || error.message);
      process.exit(1);
    }
  } else {
    console.log("Yeni haber yok.");
  }
}
runBot();
