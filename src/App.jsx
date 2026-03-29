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

  useEffect(() => {
    document.documentElement.lang = "en";
    document.title = "WORLD WINDOWS | Global News Network";
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
            const timestamp = pubDate ? new Date(pubDate).getTime() : Date.now();
            return { id: Math.random(), baslik: title, detay: cleanDesc, kaynak: feedTitle.replace(/ - BBC News| \| World/gi, ''), url: rawLink, img: imgUrl, tagId: activeTag.id, timestamp: isNaN(timestamp) ? Date.now() : timestamp };
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
        
        @keyframes scrollRadar {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-444px * 8)); }
        }
        
        .radar-wrapper { 
          overflow: hidden; 
          width: 100vw; 
          position: relative; 
          padding: 20px 0 40px; 
          display: block;
        }
        
        .radar-inner { 
          display: flex !important; 
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          width: max-content !important;
          animation: scrollRadar 80s linear infinite; 
          will-change: transform;
        }
        
        .radar-wrapper:hover .radar-inner { animation-play-state: paused; }
        
        .top-header-container { padding: 20px 32px 5px; }
        .tag-bar { display: flex; gap: 8px; overflow-x: auto; padding: 12px 32px; background: #0d1424; border-bottom: 1px solid #1e2d4a; position: sticky; top: 0; z-index: 100; }
        .tag-pill { padding: 6px 16px; background: #080c14; border: 1px solid #1e2d4a; border-radius: 4px; color: #4a6080; font-size: 10px; font-weight: 900; cursor: pointer; white-space: nowrap; transition: 0.2s; }
        .tag-pill.active { background: #c9a96e; border-color: #c9a96e; color: #0d1424; }
        
        .search-header-container { display: flex; align-items: center; gap: 20px; padding: 0 32px; margin-bottom: 15px; flex-wrap: wrap; }
        
        .news-card { 
          min-width: 420px !important; 
          max-width: 420px !important; 
          margin-right: 24px;
          background: #0d1424; 
          border: 1px solid #1e2d4a; 
          border-radius: 12px; 
          cursor: pointer; 
          overflow: hidden; 
          flex-shrink: 0 !important;
          display: block !important;
        }
        
        .news-card img { width: 100%; height: 240px; object-fit: cover; border-bottom: 3px solid #c9a96e; }
        .time-badge { position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.85); padding: 5px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #c9a96e; border: 1px solid #c9a96e; z-index: 2; }
        
        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; padding: 0 32px 60px; }
        .archive-card { background: #0d1424; border: 1px solid #1e2d4a; border-radius: 10px; padding: 25px; border-left: 4px solid #1e2d4a; cursor: pointer; }
        
        .close-btn { position: fixed; top: 30px; right: 30px; background: #c9a96e; color: #080c14; border: none; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; font-size: 24px; font-weight: bold; z-index: 20000; display: flex; align-items: center; justify-content: center; }
        .footer { background: #0d1424; padding: 40px 32px; border-top: 1px solid #1e2d4a; text-align: center; }
        .footer-link { color: #4a6080; text-decoration: none; margin: 0 15px; font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .footer-link:hover { color: #c9a96e; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.98); backdrop-filter: blur(15px); z-index: 10000; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .modal-content { background: #0d1424; border: 1px solid #c9a96e; border-radius: 12px; max-width: 850px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; padding: 40px; }
        .modal-img { width: calc(100% + 80px); margin: -40px -40px 20px; height: 350px; object-fit: cover; border-bottom: 2px solid #c9a96e; }
        
        body { top: 0px !important; position: static !important; margin-top: 0px !important; }
        .header-title { font-family: 'Playfair Display', serif; font-size: 32px; color: #c9a96e; font-weight: 900; margin: 0; white-space: nowrap; }
        .header-subtitle { font-family: 'Playfair Display', serif; font-size: 15px; color: #c9a96e; font-style: italic; margin-top: 2px; letter-spacing: 0.5px; opacity: 0.9; }
        .sync-text { font-size: 12px; color: #c9a96e; font-weight: bold; }
        .action-btn { background: #c9a96e; color: #0d1424; border: none; padding: 0 20px; border-radius: 4px; font-weight: 900; cursor: pointer; font-size: 11px; height: 30px; display: flex; align-items: center; text-transform: uppercase; }

        .search-input-wrapper { position: relative; display: flex; align-items: center; width: 250px; }
        .search-input { background: #080c14; border: 1px solid #c9a96e; color: #e8e6e0; padding: 6px 40px 6px 14px; border-radius: 4px; outline: none; font-size: 14px; width: 100%; transition: 0.3s; }
        .search-input-icon { position: absolute; right: 12px; color: #c9a96e; }
        .brand-logo-img { width: 75px; height: 75px; object-fit: contain; margin-right: 20px; border-radius: 8px; }

        @media (max-width: 768px) {
          .top-header-container { flex-direction: column; align-items: flex-start !important; padding: 15px 20px 5px; }
          .header-right-panel { width: 100%; justify-content: space-between; gap: 10px !important; }
          .search-header-container { flex-direction: column; align-items: flex-start; padding: 0 20px; gap: 15px; }
          .search-input-wrapper { width: 100%; }
          
          .news-card { min-width: 85vw !important; max-width: 85vw !important; }
          @keyframes scrollRadar {
            0% { transform: translateX(0); }
            100% { transform: translateX(calc((-85vw - 24px) * 8)); }
          }
          .brand-logo-img { width: 55px; height: 55px; }
        }
      `}</style>

      {modalType && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <button className="close-btn" onClick={() => setModalType(null)}>✕</button>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {modalType === 'news' && selectedNews && (
              <>
                <img src={selectedNews.img} className="modal-img" />
                <div style={{ color: "#c9a96e", fontWeight: "900", fontSize: "12px" }}>{selectedNews.kaynak.toUpperCase()} • {getRelativeTime(selectedNews.timestamp)}</div>
                <h2 style={{ fontFamily: "'Playfair Display'", fontSize: "28px", color: "#fff", margin: "15px 0" }}>{selectedNews.baslik}</h2>
                <p style={{ color: "#8a9ab0", lineHeight: "1.8", fontSize: "16px" }}>{selectedNews.detay}</p>
                <a href={selectedNews.url} target="_blank" rel="noreferrer" style={{ background: "#c9a96e", color: "#0d1424", padding: "12px 30px", textDecoration: "none", fontWeight: "bold", borderRadius: "4px", display: "inline-block", marginTop: "20px" }}>GO TO SOURCE ↗</a>
              </>
            )}
            {modalType === 'about' && (
              <>
                <h2 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'" }}>ABOUT US</h2>
                <p style={{ lineHeight: "1.8", color: "#8a9ab0", fontSize: "14px" }}>World Windows is a professional news terminal that scans global finance, geopolitics, and economy news in seconds.</p>
              </>
            )}
            {modalType === 'contact' && (
              <>
                <h2 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'" }}>CONTACT</h2>
                <h3 style={{ color: "#fff" }}>worldwindows.network@gmail.com</h3>
              </>
            )}
          </div>
        </div>
      )}

      <header style={{ background: "#0d1424" }}>
        <div className="top-header-container" style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="header-left-panel" style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
             <img src="/logo.jpeg" alt="Logo" className="brand-logo-img" />
             <div>
               <h1 className="header-title">WORLD WINDOWS</h1>
               <div className="header-subtitle">Global news to understand the world</div>
             </div>
          </div>
          <div className="header-right-panel" style={{ display: "flex", gap: "10px", alignItems: "center" }} translate="no">
             <div id="google_translate_element"></div>
             <div className="sync-text" style={{ marginLeft: "5px" }}>SYNC: {timeLeft}s</div>
             <button onClick={() => { fetchCollectiveNews(); setTimeLeft(60); }} className="action-btn">SYNC NOW</button>
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
        <section style={{ padding: "30px 0 10px" }}>
          <div className="search-header-container">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
              <span style={{ color: "#c9a96e", fontWeight: "900", fontSize: "12px", letterSpacing: "1px" }}>SEARCH:</span>
              <div className="search-input-wrapper">
                <input type="text" className="search-input" placeholder="Keyword or source..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <span className="search-input-icon">
                  <svg width="18" height="18" viewBox="0 0 100 100" fill="none"><path d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z" stroke="#c9a96e" strokeWidth="6" /><circle cx="50" cy="50" r="15" fill="#c9a96e" /></svg>
                </span>
              </div>
            </div>
            <h2 style={{ fontSize: "20px", color: "#c9a96e", fontFamily: "'Playfair Display'", margin: 0 }}>
              {activeTag.id === "all" ? "ARE YOU READY TO DISCOVER THE WORLD..." : `LIVE RADAR: ${activeTag.label}`}
            </h2>
          </div>
          
          {searchTerm.trim() === "" && displayData.radar.length > 0 && (
            <div className="radar-wrapper">
              <div className="radar-inner">
                {displayData.radar.map(n => (
                  <div key={n.id} className="news-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                    <div className="time-badge" translate="no">{getRelativeTime(n.timestamp)}</div>
                    <img src={n.img} />
                    <div style={{ padding: "20px 25px" }}>
                      <div style={{ color: "#c9a96e", fontWeight: "900", fontSize: "10px", marginBottom: "8px" }}>{n.kaynak.toUpperCase()}</div>
                      <h3 style={{ fontSize: "18px", color: "#e8e6e0", lineHeight: "1.3", margin: 0, fontFamily: "'Playfair Display'" }}>{n.baslik}</h3>
                    </div>
                  </div>
                ))}
                {/* Sonsuz akış için kopya seti */}
                {displayData.radar.map(n => (
                  <div key={n.id + '_clone'} className="news-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                    <div className="time-badge" translate="no">{getRelativeTime(n.timestamp)}</div>
                    <img src={n.img} />
                    <div style={{ padding: "20px 25px" }}>
                      <div style={{ color: "#c9a96e", fontWeight: "900", fontSize: "10px", marginBottom: "8px" }}>{n.kaynak.toUpperCase()}</div>
                      <h3 style={{ fontSize: "18px", color: "#e8e6e0", lineHeight: "1.3", margin: 0, fontFamily: "'Playfair Display'" }}>{n.baslik}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section style={{ padding: searchTerm.trim() === "" ? "10px 0 30px" : "0 0 30px 0", borderTop: searchTerm.trim() === "" ? "1px solid #1e2d4a" : "none" }}>
          <h2 style={{ fontSize: "20px", color: "#8a9ab0", padding: "0 32px", fontFamily: "'Playfair Display'", marginBottom: "20px" }}>
            {searchTerm.trim() !== "" ? `SEARCH RESULTS (${displayData.archive.length} FOUND)` : "ARCHIVE"}
          </h2>
          <div className="archive-grid">
            {displayData.archive.map(n => (
              <div key={n.id} className="archive-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                <div style={{ fontSize: "10px", color: "#c9a96e", marginBottom: "8px", fontWeight: "900" }} translate="no">
                   {n.kaynak.toUpperCase()} • {getRelativeTime(n.timestamp)}
                </div>
                <h4 style={{ fontSize: "16px", color: "#e8e6e0", lineHeight: "1.4", margin: 0 }}>{n.baslik}</h4>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div style={{ color: "#c9a96e", fontWeight: "900", marginBottom: "20px" }}>WORLD WINDOWS</div>
        <div>
          <span className="footer-link" onClick={() => setModalType('about')}>ABOUT US</span>
          <span className="footer-link" onClick={() => setModalType('contact')}>CONTACT</span>
        </div>
        <div style={{ color: "#3a5278", fontSize: "10px", marginTop: "30px" }}>© 2026 World Windows Terminal. All Rights Reserved.</div>
      </footer>
      <Analytics />
    </div>
  );
}
