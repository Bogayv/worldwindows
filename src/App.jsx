import { useState, useEffect, useRef, memo, useMemo } from "react";
import { Analytics } from "@vercel/analytics/react";

const GLOBAL_TAGS = [
  { id: "all", label: "ALL", urls: [] },
  { id: "ekonomi", label: "ECONOMY", urls: ["https://www.ft.com/?format=rss", "https://www.economist.com/sections/economics/rss.xml", "https://www.wsj.com/xml/rss/3_7014.xml", "https://www.forbes.com/economics/feed/"]},
  { id: "finans", label: "FINANCE", urls: ["https://www.wsj.com/xml/rss/3_7031.xml", "https://www.cnbc.com/id/10000664/device/rss/rss.html", "https://feeds.barrons.com/v1/barrons/rss?xml=1", "https://www.ft.com/markets?format=rss"]},
  { id: "kripto", label: "CRYPTO", urls: ["https://cointelegraph.com/rss", "https://www.coindesk.com/arc/outboundfeeds/rss/"]},
  { id: "asya", label: "ASIA PACIFIC", urls: ["https://www.scmp.com/rss/4/feed", "https://asia.nikkei.com/rss/feed/category/53", "https://en.yna.co.kr/RSS/news.xml"]},
  { id: "jeopolitik", label: "GEOPOLITICS", urls: ["https://www.theguardian.com/world/rss", "https://www.aljazeera.com/xml/rss/all.xml", "https://rss.dw.com/rdf/rss-en-biz", "https://www.telegraph.co.uk/business/rss.xml", "http://feeds.bbci.co.uk/news/world/rss.xml", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "https://www.reutersagency.com/feed/"]},
  { id: "siyaset", label: "POLITICS", urls: ["https://www.politico.com/rss/politicopicks.xml", "https://www.theguardian.com/politics/rss"]},
  { id: "gold", label: "GOLD/SILVER", urls: ["https://www.kitco.com/rss/index.xml", "https://www.investing.com/rss/news_95.rss"]},
  { id: "borsa", label: "MARKETS", urls: ["https://www.bloomberght.com/rss", "https://finance.yahoo.com/news/rss", "https://www.bigpara.com/rss/"]},
  { id: "kap", label: "KAP & CORP", urls: ["https://www.kap.org.tr/tr/rss", "https://www.paraanaliz.com/feed/", "https://www.dunya.com/rss"]},
];

const ALL_URLS = Array.from(new Set(GLOBAL_TAGS.flatMap(tag => tag.urls)));

const getRelativeTime = (ts) => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} mins ago`;
  if (h < 24) return `${h} hours ago`;
  return `${Math.floor(h / 24)} days ago`;
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
      "showSymbolLogo": true, "colorTheme": "dark", "isTransparent": false, "displayMode": "regular", "locale": "en", "backgroundColor": "#000000"
    });
    container.current.appendChild(script);
  }, []);
  return <div style={{ background: "#000", borderBottom: "1px solid #1e2d4a", minHeight: "46px" }} ref={container}></div>;
});

export default function GlobalHaberler() {
  const [newsPool, setNewsPool] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const [activeTag, setActiveTag] = useState(GLOBAL_TAGS[0]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [modalType, setModalType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const radarRef = useRef(null);

  useEffect(() => {
    document.documentElement.lang = "en";
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,tr,es,de,fr,ar,zh-CN,ru,hi,ja,ko,th,kk,az,el,pt,cs,da,nl',
        autoDisplay: false
      }, 'google_translate_element');
    };
    const script = document.createElement("script");
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit&hl=en";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // OTOMATIK AKIŞ VE MANUEL KAYDIRMA DENGESİ
  useEffect(() => {
    const el = radarRef.current;
    if (!el) return;
    let scrollSpeed = 1;
    let isPaused = false;

    const autoScroll = () => {
      if (!isPaused) {
        el.scrollLeft += scrollSpeed;
        if (el.scrollLeft >= (el.scrollWidth / 2)) {
          el.scrollLeft = 0;
        }
      }
    };

    const interval = setInterval(autoScroll, 30);
    el.onmouseenter = () => isPaused = true;
    el.onmouseleave = () => isPaused = false;
    el.ontouchstart = () => isPaused = true;
    el.ontouchend = () => isPaused = false;

    return () => clearInterval(interval);
  }, [newsPool]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { fetchCollectiveNews(); return 60; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTag]);

  useEffect(() => { fetchCollectiveNews(); setTimeLeft(60); }, [activeTag]);

  async function fetchCollectiveNews() {
    try {
      const allFetchedNews = [];
      const targetUrls = activeTag.id === "all" ? ALL_URLS : activeTag.urls;
      const fetchPromises = targetUrls.map(async (url) => {
        try {
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
          if (!res.ok) return [];
          const xmlText = await res.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          const items = Array.from(xmlDoc.querySelectorAll("item, entry")).slice(0, 10);
          const feedTitle = xmlDoc.querySelector("channel > title, feed > title")?.textContent || "Global";
          return items.map(item => {
            const title = item.querySelector("title")?.textContent || "News";
            const linkElem = item.querySelector("link");
            let rawLink = (linkElem?.textContent || linkElem?.getAttribute("href") || "#").trim();
            const desc = item.querySelector("description")?.textContent || item.querySelector("summary")?.textContent || "";
            const cleanDesc = desc.replace(/<[^>]*>?/gm, '');
            let imgUrl = `https://picsum.photos/seed/${encodeURIComponent(title.slice(0,5))}/800/450`;
            const enclosure = item.querySelector("enclosure");
            if (enclosure?.getAttribute("url")) imgUrl = enclosure.getAttribute("url");
            const pubDate = item.querySelector("pubDate")?.textContent || item.querySelector("published")?.textContent;
            return { id: Math.random(), baslik: title, detay: cleanDesc, kaynak: feedTitle.replace(/ - BBC News| \| World/gi, ''), url: rawLink, img: imgUrl, tagId: activeTag.id, timestamp: isNaN(new Date(pubDate).getTime()) ? Date.now() : new Date(pubDate).getTime() };
          });
        } catch (e) { return []; }
      });
      const results = await Promise.all(fetchPromises);
      results.forEach(batch => { if(batch) allFetchedNews.push(...batch); });
      setNewsPool(allFetchedNews);
    } catch (e) {}
  }

  const displayData = useMemo(() => {
    let filtered = activeTag.id === "all" ? newsPool : newsPool.filter(i => i.tagId === activeTag.id);
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(i => i.baslik.toLowerCase().includes(term) || i.kaynak.toLowerCase().includes(term));
      return { radar: [], archive: [...filtered].sort((a,b) => b.timestamp - a.timestamp) };
    }
    const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);
    return { radar: sorted.slice(0, 8), archive: sorted.slice(8, 500) };
  }, [newsPool, activeTag, searchTerm]);

  return (
    <div style={{ paddingTop: "40px", minHeight: "100vh", background: "#080c14", color: "#e8e6e0", fontFamily: "'Georgia', serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=Source+Sans+3:wght@400;700&display=swap');
        
        /* RADAR: MANUEL KAYDIRILABILIR VE AKIŞKAN */
        .radar-scroll-area { 
          overflow-x: auto; 
          display: flex; 
          gap: 24px; 
          padding: 20px 32px 40px;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        .radar-scroll-area::-webkit-scrollbar { display: none; }
        
        .news-card { 
          min-width: 420px; 
          max-width: 420px; 
          background: #0d1424; 
          border: 1px solid #1e2d4a; 
          border-radius: 12px; 
          cursor: pointer; 
          overflow: hidden; 
          flex-shrink: 0;
          transition: transform 0.3s;
        }
        .news-card:hover { border-color: #c9a96e; transform: translateY(-5px); }
        .news-card img { width: 100%; height: 240px; object-fit: cover; border-bottom: 3px solid #c9a96e; }
        
        .top-header-container { padding: 20px 32px 5px; display: flex; justify-content: space-between; align-items: center; max-width: 1400px; margin: 0 auto; }
        .tag-bar { display: flex; gap: 8px; overflow-x: auto; padding: 12px 32px; background: #0d1424; border-bottom: 1px solid #1e2d4a; position: sticky; top: 0; z-index: 100; }
        .tag-pill { padding: 6px 16px; background: #080c14; border: 1px solid #1e2d4a; border-radius: 4px; color: #4a6080; font-size: 10px; font-weight: 900; cursor: pointer; white-space: nowrap; }
        .tag-pill.active { background: #c9a96e; color: #0d1424; }
        
        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; padding: 32px; max-width: 1400px; margin: 0 auto; }
        .archive-card { background: #0d1424; border: 1px solid #1e2d4a; border-radius: 10px; padding: 25px; border-left: 4px solid #1e2d4a; cursor: pointer; }
        
        .close-btn { position: fixed; top: 20px; right: 20px; background: #c9a96e; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-weight: bold; z-index: 20000; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.98); z-index: 10000; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .modal-content { background: #0d1424; border: 1px solid #c9a96e; border-radius: 12px; max-width: 850px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 40px; }
        
        .header-title { font-family: 'Playfair Display', serif; font-size: 32px; color: #c9a96e; font-weight: 900; margin: 0; }
        .header-subtitle { font-family: 'Playfair Display', serif; font-size: 14px; color: #c9a96e; opacity: 0.8; }
        .action-btn { background: #c9a96e; color: #0d1424; border: none; padding: 0 15px; border-radius: 4px; font-weight: 900; height: 30px; cursor: pointer; text-transform: uppercase; font-size: 11px; }

        .search-input-wrapper { position: relative; display: flex; align-items: center; width: 250px; }
        .search-input { background: #080c14; border: 1px solid #c9a96e; color: #e8e6e0; padding: 6px 12px; border-radius: 4px; outline: none; width: 100%; font-size: 14px; }
        .brand-logo-img { width: 65px; height: 65px; object-fit: contain; margin-right: 15px; }

        @media (max-width: 768px) {
          .top-header-container { flex-direction: column; align-items: flex-start; padding: 15px 20px; }
          .header-right-panel { width: 100%; justify-content: space-between; margin-top: 15px; }
          .news-card { min-width: 85vw; max-width: 85vw; }
          .archive-grid { grid-template-columns: 1fr; padding: 20px; }
          .search-input-wrapper { width: 100%; }
          .modal-content { padding: 20px; }
          .brand-logo-img { width: 50px; height: 50px; }
        }
      `}</style>

      {modalType === 'news' && selectedNews && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <button className="close-btn" onClick={() => setModalType(null)}>✕</button>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <img src={selectedNews.img} style={{ width: "100%", height: "300px", objectFit: "cover", borderRadius: "8px", marginBottom: "20px" }} />
            <div style={{ color: "#c9a96e", fontWeight: "bold", fontSize: "12px" }}>{selectedNews.kaynak.toUpperCase()}</div>
            <h2 style={{ color: "#fff", margin: "15px 0" }}>{selectedNews.baslik}</h2>
            <p style={{ color: "#8a9ab0", lineHeight: "1.8" }}>{selectedNews.detay}</p>
            <a href={selectedNews.url} target="_blank" rel="noreferrer" style={{ background: "#c9a96e", color: "#0d1424", padding: "12px 25px", textDecoration: "none", fontWeight: "bold", borderRadius: "4px", display: "inline-block", marginTop: "20px" }}>SOURCE ↗</a>
          </div>
        </div>
      )}

      <header style={{ background: "#0d1424" }}>
        <div className="top-header-container">
          <div style={{ display: "flex", alignItems: "center" }}>
             <img src="/logo.jpeg" alt="Logo" className="brand-logo-img" />
             <div><h1 className="header-title">WORLD WINDOWS</h1><div className="header-subtitle">Global news terminal</div></div>
          </div>
          <div className="header-right-panel" style={{ display: "flex", gap: "10px", alignItems: "center" }} translate="no">
             <div id="google_translate_element"></div>
             <div style={{ fontSize: "11px", color: "#c9a96e" }}>SYNC: {timeLeft}s</div>
             <button onClick={() => { fetchCollectiveNews(); setTimeLeft(60); }} className="action-btn">SYNC NOW</button>
          </div>
        </div>
        <div className="tag-bar">{GLOBAL_TAGS.map(t => (<div key={t.id} className={`tag-pill ${activeTag.id === t.id ? 'active' : ''}`} onClick={() => setActiveTag(t)}>#{t.label}</div>))}</div>
        <TradingViewLiveTicker />
      </header>

      <main>
        <section style={{ padding: "20px 32px 0" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "20px", maxWidth: "1400px", margin: "0 auto" }}>
            <div className="search-input-wrapper">
              <input type="text" className="search-input" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <h2 style={{ color: "#c9a96e", fontSize: "18px" }}>{activeTag.id === "all" ? "EXPLORING THE WORLD..." : `LIVE: ${activeTag.label}`}</h2>
          </div>
        </section>

        {searchTerm.trim() === "" && displayData.radar.length > 0 && (
          <div className="radar-scroll-area" ref={radarRef}>
            {displayData.radar.map(n => (
              <div key={n.id} className="news-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                <img src={n.img} />
                <div style={{ padding: "20px" }}>
                  <div style={{ color: "#c9a96e", fontWeight: "900", fontSize: "10px" }}>{n.kaynak.toUpperCase()}</div>
                  <h3 style={{ fontSize: "18px", color: "#e8e6e0", margin: "10px 0 0" }}>{n.baslik}</h3>
                </div>
              </div>
            ))}
            {/* Sonsuz döngü için kopya seti */}
            {displayData.radar.map(n => (
              <div key={n.id + '_c'} className="news-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                <img src={n.img} />
                <div style={{ padding: "20px" }}>
                  <div style={{ color: "#c9a96e", fontWeight: "900", fontSize: "10px" }}>{n.kaynak.toUpperCase()}</div>
                  <h3 style={{ fontSize: "18px", color: "#e8e6e0", margin: "10px 0 0" }}>{n.baslik}</h3>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="archive-grid">
          {displayData.archive.map(n => (
            <div key={n.id} className="archive-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
              <div style={{ fontSize: "10px", color: "#c9a96e", fontWeight: "900" }}>{n.kaynak.toUpperCase()} • {getRelativeTime(n.timestamp)}</div>
              <h4 style={{ fontSize: "16px", margin: "10px 0 0" }}>{n.baslik}</h4>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ padding: "40px", textAlign: "center", background: "#0d1424", borderTop: "1px solid #1e2d4a" }}>
        <div style={{ color: "#c9a96e", fontWeight: "900" }}>WORLD WINDOWS</div>
        <div style={{ color: "#3a5278", fontSize: "10px", marginTop: "10px" }}>© 2026 World Windows Terminal. All Rights Reserved.</div>
      </footer>
      <Analytics />
    </div>
  );
}
