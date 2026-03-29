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
  { name: "BBC News", url: "https://www.bbc.com/news", color: "#EB3323", font: "sans-serif", weight: "900" },
  { name: "Reuters", url: "https://www.reuters.com", color: "#FF8000", font: "sans-serif", weight: "700" },
  { name: "The New York Times", url: "https://www.nytimes.com", color: "#E8E6E0", font: "'Playfair Display', serif", weight: "900", style: "italic" },
  { name: "The Guardian", url: "https://www.theguardian.com", color: "#0582CA", font: "'Playfair Display', serif", weight: "900" },
  { name: "Financial Times", url: "https://www.ft.com", color: "#FCD0B4", font: "'Playfair Display', serif", weight: "700" },
  { name: "The Wall Street Journal", url: "https://www.wsj.com", color: "#E8E6E0", font: "'Playfair Display', serif", weight: "900" },
  { name: "The Economist", url: "https://www.economist.com", color: "#E3120B", font: "'Playfair Display', serif", weight: "700" },
  { name: "Forbes", url: "https://www.forbes.com", color: "#E8E6E0", font: "sans-serif", weight: "900", letterSpacing: "1px" },
  { name: "CNBC", url: "https://www.cnbc.com", color: "#00ACFF", font: "sans-serif", weight: "900" },
  { name: "Barron's", url: "https://www.barrons.com", color: "#E8E6E0", font: "'Playfair Display', serif", style: "italic", weight: "900" },
  { name: "CoinDesk", url: "https://www.coindesk.com", color: "#00D1B2", font: "sans-serif", weight: "900" },
  { name: "Cointelegraph", url: "https://cointelegraph.com", color: "#FABF2C", font: "sans-serif", weight: "900" },
  { name: "South China Morning Post", url: "https://www.scmp.com", color: "#0082E6", font: "'Playfair Display', serif", weight: "700" },
  { name: "Nikkei Asia", url: "https://asia.nikkei.com", color: "#FF4A4A", font: "sans-serif", weight: "700" },
  { name: "Yonhap News", url: "https://en.yna.co.kr", color: "#4A90E2", font: "sans-serif", weight: "900", style: "italic" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com", color: "#F9B000", font: "sans-serif", weight: "900" },
  { name: "Deutsche Welle", url: "https://www.dw.com", color: "#00A5FF", font: "sans-serif", weight: "900" },
  { name: "The Telegraph", url: "https://www.telegraph.co.uk", color: "#E8E6E0", font: "'Playfair Display', serif", weight: "700" },
  { name: "Politico", url: "https://www.politico.com", color: "#FF3344", font: "sans-serif", weight: "900" },
  { name: "Kitco", url: "https://www.kitco.com", color: "#00D46A", font: "sans-serif", weight: "900" },
  { name: "Investing.com", url: "https://www.investing.com", color: "#F38B00", font: "sans-serif", weight: "900" },
  { name: "Bloomberg HT", url: "https://www.bloomberght.com", color: "#E8E6E0", font: "sans-serif", weight: "900" },
  { name: "Yahoo Finance", url: "https://finance.yahoo.com", color: "#A666FA", font: "sans-serif", weight: "900", style: "italic" },
  { name: "Bigpara", url: "https://bigpara.hurriyet.com.tr/", color: "#FF3333", font: "sans-serif", weight: "900" },
  { name: "KAP", url: "https://www.kap.org.tr", color: "#00BFFF", font: "sans-serif", weight: "900" },
  { name: "Para Analiz", url: "https://www.paraanaliz.com", color: "#E8E6E0", font: "sans-serif", weight: "700" },
  { name: "Dünya", url: "https://www.dunya.com", color: "#FF3333", font: "'Playfair Display', serif", weight: "900" },
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
  const [loading, setLoading] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [activeTag, setActiveTag] = useState(GLOBAL_TAGS[0]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [modalType, setModalType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    document.documentElement.lang = "en";
    document.title = "WORLD WINDOWS | Global News to Understand the World";
  }, []);

  useEffect(() => {
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

    const styleInterval = setInterval(() => {
      const combo = document.querySelector('.goog-te-combo');
      if (combo && !combo.dataset.hacked) {
        combo.dataset.hacked = "true";
        if (combo.options && combo.options.length > 0) {
          combo.options[0].textContent = 'LANG';
        }
        combo.style.cssText = "background-color: #c9a96e !important; color: #0d1424 !important; border: none !important; padding: 0px 8px !important; border-radius: 4px !important; font-size: 11px !important; font-weight: 900 !important; font-family: 'Source Sans 3', sans-serif !important; text-transform: uppercase !important; cursor: pointer !important; height: 30px !important; width: 70px !important; outline: none !important; margin: 0 !important;";
      }
      const gadget = document.querySelector('.goog-te-gadget');
      if(gadget) {
        gadget.style.cssText = "color: transparent !important; font-size: 0px !important; display: flex !important; align-items: center !important;";
      }
    }, 100);
    return () => clearInterval(styleInterval);
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
    setLoading(true);
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
            
            if (rawLink.startsWith("/")) {
              try {
                const feedOrigin = new URL(url).origin;
                rawLink = feedOrigin + rawLink;
                if (rawLink.includes('bigpara.com')) {
                  rawLink = rawLink.replace('www.bigpara.com', 'bigpara.hurriyet.com.tr');
                }
              } catch(e) {}
            }

            const desc = item.querySelector("description")?.textContent || item.querySelector("summary")?.textContent || item.querySelector("content")?.textContent || "";
            const cleanDesc = desc.replace(/<[^>]*>?/gm, '');

            let imgUrl = `https://picsum.photos/seed/${encodeURIComponent(title.slice(0,5))}/800/450`;
            const enclosure = item.querySelector("enclosure");
            if (enclosure?.getAttribute("url")) imgUrl = enclosure.getAttribute("url");
            else {
              const mediaContent = item.getElementsByTagNameNS("*", "content");
              if (mediaContent.length > 0 && mediaContent[0].getAttribute("url")) imgUrl = mediaContent[0].getAttribute("url");
              else {
                const mediaThumb = item.getElementsByTagNameNS("*", "thumbnail");
                if (mediaThumb.length > 0 && mediaThumb[0].getAttribute("url")) imgUrl = mediaThumb[0].getAttribute("url");
              }
            }
            const pubDate = item.querySelector("pubDate")?.textContent || item.querySelector("published")?.textContent || item.querySelector("updated")?.textContent;
            const timestamp = pubDate ? new Date(pubDate).getTime() : Date.now();

            return {
              id: item.querySelector("guid")?.textContent || rawLink,
              baslik: title,
              ozet: cleanDesc.slice(0, 180) + "...",
              detay: cleanDesc,
              kaynak: feedTitle.replace(/ - BBC News| \| World \| The Guardian/gi, ''),
              url: rawLink,
              img: imgUrl,
              tagLabel: activeTag.label,
              tagId: activeTag.id,
              timestamp: isNaN(timestamp) ? Date.now() : timestamp
            };
          });
        } catch (e) { return []; }
      });
      const results = await Promise.all(fetchPromises);
      results.forEach(batch => { if(batch) allFetchedNews.push(...batch); });
      setNewsPool(prev => {
        const combined = [...allFetchedNews, ...prev];
        return combined.filter((v, i, a) => a.findIndex(t => t.baslik === v.baslik) === i);
      });
    } catch (e) { console.error("Error"); } finally { setLoading(false); }
  }

  const displayData = useMemo(() => {
    let filtered = activeTag.id === "all" ? newsPool : newsPool.filter(i => i.tagId === activeTag.id);
    const isSearching = searchTerm.trim() !== "";

    if (isSearching) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(i => 
        i.baslik.toLowerCase().includes(term) || 
        i.detay.toLowerCase().includes(term) ||
        i.kaynak.toLowerCase().includes(term)
      );
    }
    
    const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);
    
    if (isSearching) {
      return { radar: [], archive: sorted };
    }

    return { radar: sorted.slice(0, 8), archive: sorted.slice(8, 500) };
  }, [newsPool, activeTag, searchTerm]);

  return (
    <div style={{ paddingTop: "40px", minHeight: "100vh", background: "#080c14", color: "#e8e6e0", fontFamily: "'Georgia', serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=Source+Sans+3:wght@400;700&display=swap');
        
        .top-header-container { padding: 20px 32px 5px; }
        .tag-bar { display: flex; gap: 8px; overflow-x: auto; padding: 12px 32px; background: #0d1424; border-bottom: 1px solid #1e2d4a; position: sticky; top: 0; z-index: 100; }
        .tag-pill { padding: 6px 16px; background: #080c14; border: 1px solid #1e2d4a; border-radius: 4px; color: #4a6080; font-size: 10px; font-weight: 900; cursor: pointer; white-space: nowrap; transition: 0.2s; }
        .tag-pill.active { background: #c9a96e; border-color: #c9a96e; color: #0d1424; }
        
        .search-header-container { display: flex; alignItems: center; gap: 20px; padding: 0 32px; margin-bottom: 15px; flex-wrap: wrap; }
        .news-slider { display: flex; gap: 24px; overflow-x: auto; padding: 20px 32px 40px; }
        .news-card { min-width: 420px; max-width: 420px; background: #0d1424; border: 1px solid #1e2d4a; border-radius: 12px; cursor: pointer; overflow: hidden; position: relative; transition: 0.3s; }
        .news-card:hover { border-color: #c9a96e; transform: translateY(-5px); }
        .news-card img { width: 100%; height: 240px; object-fit: cover; border-bottom: 3px solid #c9a96e; }
        
        .time-badge { position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.85); padding: 5px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #c9a96e; border: 1px solid #c9a96e; z-index: 2; }
        
        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; padding: 0 32px 60px; }
        .archive-card { background: #0d1424; border: 1px solid #1e2d4a; border-radius: 10px; cursor: pointer; padding: 25px; border-left: 4px solid #1e2d4a; }
        
        .close-btn { position: fixed; top: 30px; right: 30px; background: #c9a96e; color: #080c14; border: none; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; font-size: 24px; font-weight: bold; z-index: 20000; display: flex; align-items: center; justify-content: center; }
        .footer { background: #0d1424; padding: 40px 32px; border-top: 1px solid #1e2d4a; text-align: center; }
        .footer-link { color: #4a6080; text-decoration: none; margin: 0 15px; font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .footer-link:hover { color: #c9a96e; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.98); backdrop-filter: blur(15px); z-index: 10000; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .modal-content { background: #0d1424; border: 1px solid #c9a96e; border-radius: 12px; max-width: 850px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; padding: 40px; }
        .modal-img { width: calc(100% + 80px); margin: -40px -40px 20px; height: 350px; object-fit: cover; border-bottom: 2px solid #c9a96e; }
        
        body { top: 0px !important; position: static !important; margin-top: 0px !important; }
        .header-left-panel { display: flex; flex-direction: column; }
        .header-title { font-family: 'Playfair Display', serif; font-size: 32px; color: #c9a96e; font-weight: 900; margin: 0; white-space: nowrap; }
        .header-subtitle { font-family: 'Playfair Display', serif; font-size: 15px; color: #c9a96e; font-style: italic; margin-top: 2px; letter-spacing: 0.5px; opacity: 0.9; }
        .sync-text { font-size: 12px; color: #c9a96e; font-weight: bold; }
        .action-btn { background: #c9a96e; color: #0d1424; border: none; padding: 0 20px; border-radius: 4px; font-weight: 900; cursor: pointer; font-size: 11px; height: 30px; display: flex; align-items: center; font-family: 'Source Sans 3', sans-serif; text-transform: uppercase; }

        .goog-te-gadget { color: transparent !important; font-size: 0px !important; display: flex !important; align-items: center !important; }
        .goog-te-combo { background-color: #c9a96e !important; color: #0d1424 !important; border: none !important; padding: 0px 8px !important; border-radius: 4px !important; font-size: 11px !important; font-weight: 900 !important; font-family: 'Source Sans 3', sans-serif !important; text-transform: uppercase !important; cursor: pointer !important; height: 30px !important; width: 70px !important; outline: none !important; margin: 0 !important; }

        .search-input-wrapper { position: relative; display: flex; align-items: center; width: 250px; }
        .search-input { background: #080c14; border: 1px solid #c9a96e; color: #e8e6e0; padding: 6px 40px 6px 14px; border-radius: 4px; outline: none; font-family: 'Source Sans 3', sans-serif; font-size: 14px; width: 100%; transition: 0.3s; }
        .search-input:focus { box-shadow: 0 0 8px rgba(201, 169, 110, 0.4); }
        .search-input-icon { position: absolute; right: 12px; display: flex; align-items: center; justify-content: center; color: #c9a96e; }

        /* YENİ FOTOĞRAF LOGOSU İÇİN STİL */
        .brand-logo-img { width: 75px; height: 75px; object-fit: contain; margin-right: 20px; border-radius: 8px; }

        @media (max-width: 768px) {
          .top-header-container { padding: 15px 20px 5px; flex-direction: column; align-items: flex-start !important; gap: 15px; }
          .header-title { font-size: 26px; }
          .header-subtitle { font-size: 12px; margin-top: 2px; }
          .header-right-panel { width: 100%; justify-content: space-between; gap: 10px !important; }
          .sync-text { font-size: 11px; }
          .tag-bar { padding: 12px 20px; }
          .search-header-container { flex-direction: column; align-items: flex-start; padding: 0 20px; gap: 15px; margin-bottom: 10px; }
          .search-input { width: 100%; box-sizing: border-box; }
          .news-slider { padding: 15px 20px 30px; gap: 15px; }
          .news-card { min-width: 85vw; max-width: 85vw; }
          .news-card img { height: 200px; }
          .archive-grid { grid-template-columns: 1fr; padding: 0 20px 40px; gap: 15px; }
          .modal-overlay { padding: 10px; }
          .modal-content { padding: 25px; }
          .modal-img { width: calc(100% + 50px); margin: -25px -25px 15px; height: 220px; }
          .close-btn { top: 15px; right: 15px; width: 35px; height: 35px; font-size: 18px; }
          .footer-link { margin: 0 8px; font-size: 10px; display: inline-block; margin-bottom: 10px; }
          .search-input-wrapper { width: 140px; }
          .search-input { padding: 4px 30px 4px 10px; font-size: 12px; }
          .search-input-icon svg { width: 14px; height: 14px; }
          
          /* Mobilde fotoğraf logosu ekranı boğmasın diye küçültülüyor */
          .brand-logo-img { width: 55px; height: 55px; margin-right: 12px; }
        }
      `}</style>

      {/* MODAL SYSTEM */}
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
                <p style={{ lineHeight: "1.8", color: "#8a9ab0", fontSize: "14px" }}>World Windows is a professional news terminal that scans global finance, geopolitics, and economy news in seconds. Our goal is to present the complex news flow on a single screen in its purest and fastest form.</p>
                <h3 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'", marginTop: "35px", borderBottom: "1px solid #1e2d4a", paddingBottom: "10px", fontSize: "18px" }}>INTEGRATED GLOBAL SOURCES</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "20px" }}>
                  {SOURCE_LINKS.map(s => (
                    <a key={s.name} href={s.url} target="_blank" rel="noreferrer" style={{ color: s.color, fontFamily: s.font, fontWeight: s.weight || "normal", fontStyle: s.style || "normal", textDecoration: "none", background: "#080c14", border: "1px solid #1e2d4a", padding: "8px 14px", borderRadius: "6px", fontSize: "12px", transition: "0.2s", display: "inline-block" }}>{s.name}</a>
                  ))}
                </div>
              </>
            )}
            {modalType === 'privacy' && (
              <>
                <h2 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'" }}>PRIVACY POLICY</h2>
                <p style={{ lineHeight: "1.8", color: "#8a9ab0", fontSize: "14px" }}>The privacy of your user data is important to us. Our site uses cookies to enhance user experience and serve advertising.</p>
              </>
            )}
            {modalType === 'contact' && (
              <>
                <h2 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'" }}>CONTACT</h2>
                <p style={{ lineHeight: "1.8", color: "#8a9ab0", fontSize: "14px" }}>For your questions, collaborations, or advertising proposals:</p>
                <h3 style={{ color: "#fff", fontSize: "16px", wordBreak: "break-all" }}>worldwindows.network@gmail.com</h3>
              </>
            )}
          </div>
        </div>
      )}

      <header style={{ background: "#0d1424" }}>
        <div className="top-header-container" style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="header-left-panel" style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
             
             {/* KOD (SVG) YERİNE DOĞRUDAN SENİN KOYACAĞIN FOTOĞRAFI OKUYAN ETİKET */}
             <img src="/logo.png" alt="World Windows Logo" className="brand-logo-img" />
             
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
              <span style={{ color: "#c9a96e", fontWeight: "900", fontSize: "12px", fontFamily: "'Source Sans 3', sans-serif", letterSpacing: "1px" }}>SEARCH:</span>
              
              <div className="search-input-wrapper">
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Keyword or source..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <span className="search-input-icon">
                  <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z" stroke="#c9a96e" strokeWidth="6" />
                    <circle cx="50" cy="50" r="15" fill="#c9a96e" />
                    <line x1="50" y1="50" x2="50" y2="10" stroke="#c9a96e" strokeWidth="2" />
                    <line x1="50" y1="50" x2="90" y2="70" stroke="#c9a96e" strokeWidth="2" />
                    <line x1="50" y1="50" x2="10" y2="70" stroke="#c9a96e" strokeWidth="2" />
                  </svg>
                </span>
              </div>
            </div>
            <h2 style={{ fontSize: "20px", color: "#c9a96e", fontFamily: "'Playfair Display'", margin: 0, letterSpacing: "0.5px" }}>
              {activeTag.id === "all" ? "ARE YOU READY TO DISCOVER THE WORLD..." : `LIVE RADAR: ${activeTag.label}`}
            </h2>
          </div>
          
          {searchTerm.trim() === "" && (
            <div className="news-slider">
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
          {searchTerm.trim() !== "" && displayData.archive.length === 0 && (
             <div style={{ color: "#8a9ab0", fontStyle: "italic", padding: "0 32px" }}>No recent news found for "{searchTerm}" in this category.</div>
          )}
        </section>
      </main>

      <footer className="footer">
        <div style={{ color: "#c9a96e", fontWeight: "900", marginBottom: "20px" }}>WORLD WINDOWS</div>
        <div>
          <span className="footer-link" onClick={() => setModalType('about')}>ABOUT US</span>
          <span className="footer-link" onClick={() => setModalType('privacy')}>PRIVACY POLICY</span>
          <span className="footer-link" onClick={() => setModalType('contact')}>CONTACT</span>
        </div>
        <div style={{ color: "#3a5278", fontSize: "10px", marginTop: "30px" }}>© 2026 World Windows Terminal. All Rights Reserved.</div>
      </footer>
      <Analytics />
    </div>
  );
}
