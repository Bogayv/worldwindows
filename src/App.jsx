import { useState, useEffect, useRef, memo, useMemo } from "react";

const GLOBAL_TAGS = [
  { id: "all", label: "TÜMÜ", urls: ["https://www.reutersagency.com/feed/", "http://feeds.bbci.co.uk/news/world/rss.xml", "https://www.theguardian.com/world/rss", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"]},
  { id: "ekonomi", label: "EKONOMİ/FT", urls: ["https://www.ft.com/?format=rss", "https://www.economist.com/sections/economics/rss.xml", "https://www.wsj.com/xml/rss/3_7014.xml", "https://www.forbes.com/economics/feed/"]},
  { id: "finans", label: "FİNANS/WSJ", urls: ["https://www.wsj.com/xml/rss/3_7031.xml", "https://www.cnbc.com/id/10000664/device/rss/rss.html", "https://www.ft.com/markets?format=rss"]},
  { id: "jeopolitik", label: "JEOPOLİTİK", urls: ["https://www.theguardian.com/world/rss", "https://www.aljazeera.com/xml/rss/all.xml", "https://www.independent.co.uk/news/world/rss"]},
  { id: "siyaset", label: "SİYASET/POLITICO", urls: ["https://www.politico.com/rss/politicopicks.xml", "https://www.theguardian.com/politics/rss"]},
  { id: "gold", label: "GOLD/SILVER", urls: ["https://www.kitco.com/rss/index.xml", "https://www.investing.com/rss/news_95.rss"]},
  { id: "fed", label: "FED", urls: ["https://www.cnbc.com/id/20910258/device/rss/rss.html"]},
  { id: "borsa", label: "BORSA", urls: ["https://www.bloomberght.com/rss", "https://www.bigpara.com/rss/"]},
  { id: "kap", label: "KAP", urls: ["https://www.paraanaliz.com/feed/", "https://www.dunya.com/rss"]},
];

const TradingViewLiveTicker = memo(() => {
  const container = useRef();
  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript"; script.async = true;
    script.innerHTML = JSON.stringify({
      "symbols": [
        { "proName": "OANDA:XAUUSD", "title": "GOLD" },
        { "proName": "OANDA:XAGUSD", "title": "SILVER" },
        { "proName": "TVC:UKOIL", "title": "BRENT" },
        { "proName": "FX:USDTRY", "title": "USD/TRY" },
        { "proName": "BINANCE:BTCUSDT", "title": "BTC" }
      ],
      "showSymbolLogo": true, "colorTheme": "dark", "isTransparent": false, "displayMode": "regular", "locale": "tr", "backgroundColor": "#000000"
    });
    container.current.appendChild(script);
  }, []);
  return <div style={{ background: "#000", borderBottom: "1px solid #1e2d4a", minHeight: "46px" }} ref={container}></div>;
});

export default function GlobalHaberler() {
  const [newsPool, setNewsPool] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTag, setActiveTag] = useState(GLOBAL_TAGS[0]);
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { fetchNews(); return 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTag]);

  useEffect(() => { fetchNews(); }, [activeTag]);

  async function fetchNews() {
    setLoading(true);
    let allItems = [];
    
    // YENİ STRATEJİ: Her URL'yi tek tek ve güvenli tünelle dene
    for (const url of activeTag.urls) {
      try {
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&api_key=oyncyf0mgh8v7e5lq9w5z9yqyv8u78moxg8p9r9j`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        
        if (data.status === "ok") {
          const processed = data.items.map(item => ({
            id: item.guid || item.link,
            baslik: item.title,
            kaynak: data.feed.title || "Global",
            url: item.link,
            img: item.enclosure?.link || item.thumbnail || `https://picsum.photos/seed/${encodeURIComponent(item.title.slice(0,5))}/800/450`,
            timestamp: new Date(item.pubDate).getTime()
          }));
          allItems = [...allItems, ...processed];
        }
      } catch (e) { console.log("Hata:", url); }
    }
    
    setNewsPool(allItems.sort((a,b) => b.timestamp - a.timestamp));
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e8e6e0", fontFamily: "sans-serif" }}>
      <style>{`
        .tag-bar { display: flex; gap: 8px; overflow-x: auto; padding: 15px 32px; background: #0d1424; border-bottom: 1px solid #1e2d4a; position: sticky; top: 0; z-index: 100; }
        .tag-pill { padding: 8px 16px; background: #080c14; border: 1px solid #1e2d4a; border-radius: 4px; color: #4a6080; font-size: 11px; font-weight: bold; cursor: pointer; white-space: nowrap; }
        .tag-pill.active { background: #c9a96e; color: #0d1424; border-color: #c9a96e; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; padding: 32px; }
        .card { background: #0d1424; border: 1px solid #1e2d4a; border-radius: 12px; overflow: hidden; cursor: pointer; transition: 0.3s; }
        .card:hover { border-color: #c9a96e; transform: translateY(-5px); }
        .card img { width: 100%; height: 200px; object-fit: cover; }
      `}</style>

      <header style={{ background: "#0d1424", padding: "20px 32px" }}>
        <h1 style={{ color: "#c9a96e", margin: 0, fontSize: "28px", letterSpacing: "2px" }}>WORLD WINDOWS NETWORK</h1>
        <div style={{ color: "#4a6080", fontSize: "12px" }}>REFRESHING IN: {timeLeft}s</div>
      </header>

      <div className="tag-bar">
        {GLOBAL_TAGS.map(t => (
          <div key={t.id} className={`tag-pill ${activeTag.id === t.id ? 'active' : ''}`} onClick={() => setActiveTag(t)}>#{t.label}</div>
        ))}
      </div>
      
      <TradingViewLiveTicker />

      <main>
        {loading && newsPool.length === 0 ? (
          <div style={{ padding: "100px", textAlign: "center", color: "#c9a96e" }}>HABERLER YÜKLENİYOR...</div>
        ) : (
          <div className="grid">
            {newsPool.map(n => (
              <div key={n.id} className="card" onClick={() => window.open(n.url, "_blank")}>
                <img src={n.img} />
                <div style={{ padding: "20px" }}>
                  <div style={{ color: "#c9a96e", fontSize: "10px", fontWeight: "bold", marginBottom: "10px" }}>{n.kaynak.toUpperCase()}</div>
                  <h3 style={{ fontSize: "16px", margin: 0, lineHeight: "1.4" }}>{n.baslik}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={{ padding: "40px", textAlign: "center", background: "#0d1424", borderTop: "1px solid #1e2d4a", marginTop: "50px" }}>
        <div style={{ color: "#c9a96e", fontWeight: "bold" }}>worldwindows.network</div>
      </footer>
    </div>
  );
}
