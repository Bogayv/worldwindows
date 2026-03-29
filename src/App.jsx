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

const SOURCE_LINKS = [
  { name: "Reuters", url: "https://www.reuters.com", color: "#FF8000" },
  { name: "Financial Times", url: "https://www.ft.com", color: "#FCD0B4" },
  { name: "The Wall Street Journal", url: "https://www.wsj.com", color: "#E8E6E0" },
  { name: "The Economist", url: "https://www.economist.com", color: "#E3120B" },
  { name: "Bloomberg HT", url: "https://www.bloomberght.com", color: "#E8E6E0" },
  { name: "BBC News", url: "https://www.bbc.com/news", color: "#EB3323" },
  { name: "The New York Times", url: "https://www.nytimes.com", color: "#E8E6E0" },
  { name: "CNBC", url: "https://www.cnbc.com", color: "#00ACFF" },
  { name: "The Guardian", url: "https://www.theguardian.com", color: "#0582CA" },
  { name: "Forbes", url: "https://www.forbes.com", color: "#E8E6E0" },
  { name: "Barron's", url: "https://www.barrons.com", color: "#E8E6E0" },
  { name: "Politico", url: "https://www.politico.com", color: "#FF3344" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com", color: "#F9B000" },
  { name: "Bigpara", url: "https://bigpara.hurriyet.com.tr/", color: "#FF3333" },
  { name: "KAP", url: "https://www.kap.org.tr", color: "#00BFFF" },
];

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
      "symbols": [{ "proName": "OANDA:XAUUSD", "title": "GOLD" }, { "proName": "OANDA:XAGUSD", "title": "SILVER" }, { "proName": "TVC:UKOIL", "title": "BRENT" }, { "proName": "FX:USDTRY", "title": "USD/TRY" }, { "proName": "BINANCE:BTCUSDT", "title": "BTC" }],
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
    document.title = "WORLD WINDOWS";
    // Favicon & Translate Init
    const head = document.getElementsByTagName('head')[0];
    let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/jpeg'; link.rel = 'shortcut icon'; link.href = '/logo.jpeg';
    head.appendChild(link);

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'en,tr,es,de,fr,ar,zh-CN,ru,hi,ja,ko,th,kk,az,el,pt,cs,da,nl', autoDisplay: false }, 'google_translate_element');
    };
    const script = document.createElement("script");
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit&hl=en";
    script.async = true;
    document.body.appendChild(script);
  }, []);

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
          const feedOrigin = new URL(url).origin;

          return items.map(item => {
            const title = item.querySelector("title")?.textContent || "News";
            const linkElem = item.querySelector("link");
            let rawLink = (linkElem?.textContent || linkElem?.getAttribute("href") || "#").trim();
            if (rawLink.startsWith("/")) rawLink = feedOrigin + rawLink;
            if (rawLink.includes('bigpara.com')) rawLink = rawLink.replace('www.bigpara.com', 'bigpara.hurriyet.com.tr');
            const desc = item.querySelector("description")?.textContent || item.querySelector("summary")?.textContent || "";
            const cleanDesc = desc.replace(/<[^>]*>?/gm, '');
            let imgUrl = `https://picsum.photos/seed/${encodeURIComponent(title.slice(0,5))}/800/450`;
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
      filtered = filtered.filter(i => i.baslik.toLowerCase().includes(term));
      return { radar: [], archive: [...filtered].sort((a,b) => b.timestamp - a.timestamp) };
    }
    const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);
    return { radar: sorted.slice(0, 12), archive: sorted.slice(12, 500) };
  }, [newsPool, activeTag, searchTerm]);

  return (
    <div style={{ paddingTop: "40px", minHeight: "100vh", background: "#080c14", color: "#e8e6e0", fontFamily: "'Georgia', serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=Source+Sans+3:wght@400;700&display=swap');
        .radar-container { overflow-x: auto; display: flex; gap: 20px; padding: 20px 32px 40px; -webkit-overflow-scrolling: touch; }
        .radar-container::-webkit-scrollbar { height: 4px; }
        .radar-container::-webkit-scrollbar-thumb { background: #1e2d4a; border-radius: 10px; }
        .news-card { min-width: 400px; max-width: 400px; background: #0d1424; border: 1px solid #1e2d4a; border-radius: 12px; cursor: pointer; overflow: hidden; flex-shrink: 0; }
        .news-card img { width: 100%; height: 220px; object-fit: cover; border-bottom: 3px solid #c9a96e; }
        .top-header-container { padding: 20px 32px 5px; display: flex; justify-content: space-between; align-items: center; max-width: 1400px; margin: 0 auto; }
        .tag-bar { display: flex; gap: 8px; overflow-x: auto; padding: 12px 32px; background: #0d1424; border-bottom: 1px solid #1e2d4a; position: sticky; top: 0; z-index: 100; }
        .tag-pill { padding: 6px 16px; background: #080c14; border: 1px solid #1e2d4a; border-radius: 4px; color: #4a6080; font-size: 10px; font-weight: 900; cursor: pointer; white-space: nowrap; }
        .tag-pill.active { background: #c9a96e; color: #0d1424; }
        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; padding: 32px; max-width: 1400px; margin: 0 auto; }
        .archive-card { background: #0d1424; border: 1px solid #1e2d4a; border-radius: 10px; padding: 25px; border-left: 4px solid #1e2d4a; cursor: pointer; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.98); z-index: 10000; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .modal-content { background: #0d1424; border: 1px solid #c9a96e; border-radius: 12px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 40px; position: relative; }
        .close-btn { position: absolute; top: 15px; right: 15px; background: #c9a96e; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-weight: 900; }
        .header-title { font-family: 'Playfair Display', serif; font-size: 32px; color: #c9a96e; font-weight: 900; margin: 0; }
        .search-input { background: #080c14; border: 1px solid #c9a96e; color: #e8e6e0; padding: 6px 12px; border-radius: 4px; outline: none; width: 250px; }
        .fiyakali-slogan { font-family: 'Playfair Display', serif; font-style: italic; color: #c9a96e; opacity: 0.9; font-size: 15px; margin-top: 4px; letter-spacing: 0.5px; }
        .footer-link { color: #4a6080; text-decoration: none; margin: 0 10px; font-size: 12px; font-weight: bold; cursor: pointer; }

        @media (max-width: 768px) {
          .top-header-container { flex-direction: column; align-items: flex-start; padding: 15px 20px; }
          .header-right-panel { width: 100%; justify-content: space-between; margin-top: 15px; display: flex !important; align-items: center; }
          .news-card { min-width: 78vw; max-width: 78vw; }
          .archive-grid { grid-template-columns: 1fr; padding: 20px; }
          .modal-content { padding: 20px; width: 95%; }
        }
      `}</style>

      {modalType === 'news' && selectedNews && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setModalType(null)}>✕</button>
            <img src={selectedNews.img} style={{ width: "100%", height: "250px", objectFit: "cover", borderRadius: "8px", marginBottom: "20px" }} />
            <div style={{ color: "#c9a96e", fontWeight: "bold", fontSize: "12px" }}>{selectedNews.kaynak.toUpperCase()}</div>
            <h2 style={{ color: "#fff", margin: "15px 0", fontSize: "22px" }}>{selectedNews.baslik}</h2>
            <p style={{ color: "#8a9ab0", lineHeight: "1.6" }}>{selectedNews.detay}</p>
            <a href={selectedNews.url} target="_blank" rel="noreferrer" style={{ background: "#c9a96e", color: "#0d1424", padding: "12px 25px", textDecoration: "none", fontWeight: "bold", borderRadius: "4px", display: "inline-block", marginTop: "20px" }}>GO TO SOURCE ↗</a>
          </div>
        </div>
      )}

      {modalType && modalType !== 'news' && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setModalType(null)}>✕</button>
            <h2 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'" }}>{modalType.toUpperCase()}</h2>
            <p style={{ color: "#8a9ab0", lineHeight: "1.8" }}>
              {modalType === 'about' && "World Windows is a professional news terminal that scans global finance, geopolitics, and economy news. Integrated sources include: Reuters, FT, WSJ, Bloomberg HT, BBC, NYT, CNBC and more."}
              {modalType === 'contact' && "Email: worldwindows.network@gmail.com"}
              {modalType === 'privacy' && "We value your privacy. We use standard cookies for analytics and user experience."}
            </p>
          </div>
        </div>
      )}

      <header style={{ background: "#0d1424" }}>
        <div className="top-header-container">
          <div style={{ display: "flex", alignItems: "center" }}>
             <img src="/logo.jpeg" style={{ width: "50px", height: "50px", marginRight: "12px", objectFit: "contain" }} />
             <div><h1 className="header-title">WORLD WINDOWS</h1><div className="fiyakali-slogan">Global news to understand the world</div></div>
          </div>
          <div className="header-right-panel" translate="no" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
             <div id="google_translate_element"></div>
             <div style={{ fontSize: "11px", color: "#c9a96e", fontWeight: "bold" }}>SYNC: {timeLeft}s</div>
             <button onClick={() => { fetchCollectiveNews(); setTimeLeft(60); }} style={{ background: "#c9a96e", border: "none", padding: "0 12px", height: "30px", borderRadius: "4px", fontWeight: "900", cursor: "pointer", fontSize: "10px" }}>SYNC NOW</button>
          </div>
        </div>
        <div className="tag-bar">{GLOBAL_TAGS.map(t => (<div key={t.id} className={`tag-pill ${activeTag.id === t.id ? 'active' : ''}`} onClick={() => setActiveTag(t)}>#{t.label}</div>))}</div>
        <TradingViewLiveTicker />
      </header>

      <main>
        <section style={{ padding: "20px 32px 0", maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "20px" }}>
            <input type="text" className="search-input" placeholder="Search news..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <h2 style={{ color: "#c9a96e", fontSize: "16px", fontFamily: "'Playfair Display', serif" }}>ARE YOU READY TO DISCOVER THE WORLD...</h2>
          </div>
        </section>

        {searchTerm.trim() === "" && (
          <div className="radar-container">
            {displayData.radar.map(n => (
              <div key={n.id} className="news-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                <img src={n.img} />
                <div style={{ padding: "15px" }}>
                  <div style={{ color: "#c9a96e", fontWeight: "900", fontSize: "10px" }}>{n.kaynak.toUpperCase()}</div>
                  <h3 style={{ fontSize: "16px", color: "#e8e6e0", margin: "8px 0 0", lineHeight: "1.3" }}>{n.baslik}</h3>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="archive-grid">
          {displayData.archive.map(n => (
            <div key={n.id} className="archive-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
              <div style={{ fontSize: "10px", color: "#c9a96e", fontWeight: "900" }}>{n.kaynak.toUpperCase()} • {getRelativeTime(n.timestamp)}</div>
              <h4 style={{ fontSize: "15px", margin: "8px 0 0" }}>{n.baslik}</h4>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ padding: "40px", textAlign: "center", borderTop: "1px solid #1e2d4a", marginTop: "40px" }}>
        <div style={{ color: "#c9a96e", fontWeight: "900", marginBottom: "20px" }}>WORLD WINDOWS</div>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px" }}>
          <span className="footer-link" onClick={() => setModalType('about')}>ABOUT US</span>
          <span className="footer-link" onClick={() => setModalType('privacy')}>PRIVACY</span>
          <span className="footer-link" onClick={() => setModalType('contact')}>CONTACT</span>
        </div>
        <div style={{ color: "#3a5278", fontSize: "10px", marginTop: "20px" }}>© 2026 World Windows Terminal. All Rights Reserved.</div>
      </footer>
      <Analytics />
    </div>
  );
}
