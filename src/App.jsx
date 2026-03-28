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

const getRelativeTime = (ts) => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (m < 1) return "Az önce";
  if (m < 60) return `${m} dk önce`;
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
};

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
  const [selectedNews, setSelectedNews] = useState(null);
  const [activeTag, setActiveTag] = useState(GLOBAL_TAGS[0]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [modalType, setModalType] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { fetchCollectiveNews(); return 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTag]);

  useEffect(() => { fetchCollectiveNews(); setTimeLeft(60); }, [activeTag]);

  async function fetchCollectiveNews() {
    setLoading(true);
    const allFetchedNews = [];
    
    for (const url of activeTag.urls) {
      try {
        // DOĞRUDAN API ERİŞİMİ (TÜNEL YOK - API KEY VAR)
        const fetchUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&api_key=oyncyf0mgh8v7e5lq9w5z9yqyv8u78moxg8p9r9j&nocache=${Date.now()}`;
        const res = await fetch(fetchUrl);
        const data = await res.json();
        
        if (data.status === "ok" && data.items) {
          const items = data.items.map(item => ({
            id: item.guid || item.link,
            baslik: item.title,
            ozet: item.description?.replace(/<[^>]*>?/gm, '').slice(0, 180) + "...",
            detay: item.content?.replace(/<[^>]*>?/gm, '') || item.description?.replace(/<[^>]*>?/gm, ''),
            kaynak: data.feed.title || "Global Intel",
            url: item.link,
            img: item.enclosure?.link || item.thumbnail || `https://picsum.photos/seed/${encodeURIComponent(item.title.slice(0,5))}/800/450`,
            tagLabel: activeTag.label,
            tagId: activeTag.id,
            timestamp: new Date(item.pubDate).getTime()
          }));
          allFetchedNews.push(...items);
        }
      } catch (e) {
        console.error("Fetch failed for:", url);
      }
    }

    setNewsPool(prev => {
      const combined = [...allFetchedNews, ...prev];
      return combined.filter((v, i, a) => a.findIndex(t => t.baslik === v.baslik) === i);
    });
    setLoading(false);
  }

  const displayData = useMemo(() => {
    const filtered = activeTag.id === "all" ? newsPool : newsPool.filter(i => i.tagId === activeTag.id);
    const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);
    return { radar: sorted.slice(0, 8), archive: sorted.slice(8, 500) };
  }, [newsPool, activeTag]);

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e8e6e0", fontFamily: "'Source Sans 3', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@400;700&display=swap');
        .tag-bar { display: flex; gap: 8px; overflow-x: auto; padding: 12px 32px; background: #0d1424; border-bottom: 1px solid #1e2d4a; position: sticky; top: 0; z-index: 100; }
        .tag-pill { padding: 6px 16px; background: #080c14; border: 1px solid #1e2d4a; border-radius: 4px; color: #4a6080; font-size: 10px; font-weight: 900; cursor: pointer; white-space: nowrap; transition: 0.2s; }
        .tag-pill.active { background: #c9a96e; border-color: #c9a96e; color: #0d1424; }
        .news-slider { display: flex; gap: 24px; overflow-x: auto; padding: 20px 32px 40px; scroll-behavior: smooth; }
        .news-card { min-width: 420px; max-width: 420px; background: #0d1424; border: 1px solid #1e2d4a; border-radius: 12px; cursor: pointer; overflow: hidden; position: relative; }
        .news-card img { width: 100%; height: 240px; object-fit: cover; border-bottom: 3px solid #c9a96e; }
        .time-badge { position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.85); padding: 5px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #c9a96e; border: 1px solid #c9a96e; z-index: 2; }
        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; padding: 0 32px 60px; }
        .archive-card { background: #0d1424; border: 1px solid #1e2d4a; border-radius: 10px; cursor: pointer; padding: 25px; border-left: 4px solid #1e2d4a; }
        .close-btn { position: fixed; top: 30px; right: 30px; background: #c9a96e; color: #0d1424; border: none; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; font-size: 24px; font-weight: bold; z-index: 20000; display: flex; align-items: center; justify-content: center; }
        .footer { background: #0d1424; padding: 40px 32px; border-top: 1px solid #1e2d4a; text-align: center; }
        .footer-link { color: #4a6080; text-decoration: none; margin: 0 15px; font-size: 12px; font-weight: bold; cursor: pointer; }
      `}</style>

      {modalType && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(8,12,20,0.98)", backdropFilter: "blur(15px)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setModalType(null)}>
          <button className="close-btn" onClick={() => setModalType(null)}>✕</button>
          <div style={{ background: "#0d1424", border: "1px solid #c9a96e", borderRadius: "12px", maxWidth: "850px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative", padding: "40px" }} onClick={e => e.stopPropagation()}>
            {modalType === 'news' && selectedNews && (
              <>
                <img src={selectedNews.img} style={{ width: "calc(100% + 80px)", margin: "-40px -40px 20px", height: "350px", objectFit: "cover", borderBottom: "2px solid #c9a96e" }} />
                <div style={{ color: "#c9a96e", fontWeight: "900", fontSize: "12px" }}>#{selectedNews.tagLabel} • {getRelativeTime(selectedNews.timestamp)}</div>
                <h2 style={{ fontFamily: "'Playfair Display'", fontSize: "32px", color: "#fff", margin: "15px 0" }}>{selectedNews.baslik}</h2>
                <p style={{ color: "#8a9ab0", lineHeight: "1.8", fontSize: "18px" }}>{selectedNews.detay}</p>
                <a href={selectedNews.url} target="_blank" rel="noreferrer" style={{ background: "#c9a96e", color: "#0d1424", padding: "12px 30px", textDecoration: "none", fontWeight: "bold", borderRadius: "4px", display: "inline-block", marginTop: "20px" }}>FULL SOURCE ↗</a>
              </>
            )}
            {modalType === 'about' && (
              <><h2 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'" }}>ABOUT</h2><p style={{ color: "#8a9ab0", lineHeight: "1.8" }}>World Windows Network provides real-time global intelligence.</p></>
            )}
            {modalType === 'privacy' && (
              <><h2 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'" }}>PRIVACY</h2><p style={{ color: "#8a9ab0", lineHeight: "1.8" }}>We use cookies to improve your experience.</p></>
            )}
            {modalType === 'contact' && (
              <><h2 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'" }}>CONTACT</h2><h3 style={{ color: "#fff" }}>iletisim@worldwindows.network</h3></>
            )}
          </div>
        </div>
      )}

      <header style={{ background: "#0d1424" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 32px 5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display'", fontSize: "32px", color: "#c9a96e", fontWeight: "900", margin: 0 }}>WORLD WINDOWS</h1>
            <div style={{ fontSize: "10px", color: "#4a6080", letterSpacing: "3px", fontWeight: "bold" }}>.NETWORK INTELLIGENCE</div>
          </div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }} translate="no">
             <div style={{ fontSize: "12px", color: "#c9a96e", fontWeight: "bold" }}>SYNC: {timeLeft}s</div>
             <button onClick={() => { fetchCollectiveNews(); setTimeLeft(60); }} style={{ background: "#c9a96e", color: "#0d1424", border: "none", padding: "8px 20px", borderRadius: "4px", fontWeight: "900", cursor: "pointer", fontSize: "11px" }}>SYNC NOW</button>
          </div>
        </div>
        <div className="tag-bar">
          {GLOBAL_TAGS.map(t => (
            <div key={t.id} className={`tag-pill ${activeTag.id === t.id ? 'active' : ''}`} onClick={() => setActiveTag(t)}>#{t.label}</div>
          ))}
        </div>
        <TradingViewLiveTicker />
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {loading && newsPool.length === 0 ? (
          <div style={{ textAlign: "center", padding: "100px", color: "#c9a96e", letterSpacing: "3px" }}>SCANNING GLOBAL CHANNELS...</div>
        ) : (
          <>
            <section style={{ padding: "30px 0" }}>
              <h2 style={{ fontSize: "18px", color: "#c9a96e", fontFamily: "'Playfair Display'", padding: "0 32px", marginBottom: "10px" }}>LIVE RADAR</h2>
              <div className="news-slider">
                {displayData.radar.map(n => (
                  <div key={n.id} className="news-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                    <div className="time-badge" translate="no">{getRelativeTime(n.timestamp)}</div>
                    <img src={n.img} />
                    <div style={{ padding: "25px" }}>
                      <div style={{ color: "#c9a96e", fontWeight: "900", fontSize: "10px", marginBottom: "8px" }}>{n.kaynak.toUpperCase()}</div>
                      <h3 style={{ fontSize: "18px", color: "#e8e6e0", lineHeight: "1.3", margin: 0, fontFamily: "'Playfair Display'" }}>{n.baslik}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section style={{ padding: "30px 0", borderTop: "1px solid #1e2d4a" }}>
              <div className="archive-grid">
                {displayData.archive.map(n => (
                  <div key={n.id} className="archive-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                    <div style={{ fontSize: "10px", color: "#c9a96e", marginBottom: "8px", fontWeight: "900" }} translate="no">#{n.tagLabel} • {getRelativeTime(n.timestamp)}</div>
                    <h4 style={{ fontSize: "16px", color: "#e8e6e0", lineHeight: "1.4", margin: 0 }}>{n.baslik}</h4>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <div style={{ color: "#c9a96e", fontWeight: "900", marginBottom: "20px" }}>WORLDWINDOWS.NETWORK</div>
        <div>
          <span className="footer-link" style={{cursor:'pointer'}} onClick={() => setModalType('about')}>ABOUT</span>
          <span className="footer-link" style={{cursor:'pointer', marginLeft:'15px'}} onClick={() => setModalType('privacy')}>PRIVACY</span>
          <span className="footer-link" style={{cursor:'pointer', marginLeft:'15px'}} onClick={() => setModalType('contact')}>CONTACT</span>
        </div>
        <div style={{ color: "#3a5278", fontSize: "10px", marginTop: "30px" }}>© 2026 World Windows Network. All Rights Reserved.</div>
      </footer>
    </div>
  );
}
