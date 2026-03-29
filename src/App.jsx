import { useState, useEffect, useRef, memo, useMemo } from "react";
import { Analytics } from "@vercel/analytics/react";

// GLOBAL MEDYA DEVLERİ VE KAYNAKLAR
const GLOBAL_TAGS = [
  { id: "all", label: "ALL", urls: ["http://feeds.bbci.co.uk/news/world/rss.xml", "https://www.theguardian.com/world/rss", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "https://www.reutersagency.com/feed/"]},
  { id: "ekonomi", label: "ECONOMY/FT", urls: ["https://www.ft.com/?format=rss", "https://www.economist.com/sections/economics/rss.xml", "https://www.wsj.com/xml/rss/3_7014.xml", "https://www.forbes.com/economics/feed/"]},
  { id: "finans", label: "FINANCE/WSJ", urls: ["https://www.wsj.com/xml/rss/3_7031.xml", "https://www.cnbc.com/id/10000664/device/rss/rss.html", "https://www.ft.com/markets?format=rss"]},
  { id: "jeopolitik", label: "GEOPOLITICS", urls: ["https://www.theguardian.com/world/rss", "https://www.aljazeera.com/xml/rss/all.xml", "https://www.independent.co.uk/news/world/rss"]},
  { id: "siyaset", label: "POLITICS", urls: ["https://www.politico.com/rss/politicopicks.xml", "https://www.theguardian.com/politics/rss"]},
  { id: "gold", label: "GOLD/SILVER", urls: ["https://www.kitco.com/rss/index.xml", "https://www.investing.com/rss/news_95.rss"]},
  { id: "fed", label: "FED", urls: ["https://www.cnbc.com/id/20910258/device/rss/rss.html"]},
  { id: "borsa", label: "MARKETS", urls: ["https://www.bloomberght.com/rss", "https://www.bigpara.com/rss/"]},
  { id: "kap", label: "CORP NEWS", urls: ["https://www.paraanaliz.com/feed/", "https://www.dunya.com/rss"]},
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

  useEffect(() => {
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,tr,es,de,fr,ar,zh-CN,ru',
        autoDisplay: false
      }, 'google_translate_element');
    };
    
    const script = document.createElement("script");
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit&hl=en";
    script.async = true;
    document.body.appendChild(script);

    // KISA "EN" YAZISI VE TASARIM SABİTLEYİCİ
    const styleInterval = setInterval(() => {
      const combo = document.querySelector('.goog-te-combo');
      if (combo) {
        if (combo.options && combo.options.length > 0) {
          if (combo.options[0].text !== 'EN') {
            combo.options[0].text = 'EN';
          }
        }
        combo.style.cssText = "background-color: #c9a96e !important; color: #0d1424 !important; border: none !important; padding: 0px 15px !important; border-radius: 4px !important; font-size: 11px !important; font-weight: 900 !important; font-family: 'Source Sans 3', sans-serif !important; text-transform: uppercase !important; cursor: pointer !important; height: 30px !important; outline: none !important;";
      }
      
      const gadget = document.querySelector('.goog-te-gadget');
      if(gadget) {
        gadget.style.cssText = "color: transparent !important; font-size: 0px !important; display: flex !important; align-items: center !important;";
      }
    }, 500);

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
      const fetchPromises = activeTag.urls.map(async (url) => {
        try {
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
          if (!res.ok) return [];
          const xmlText = await res.text();
          
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 10);
          const feedTitle = xmlDoc.querySelector("channel > title")?.textContent || "Global";

          return items.map(item => {
            const title = item.querySelector("title")?.textContent || "News";
            const link = item.querySelector("link")?.textContent || "#";
            const desc = item.querySelector("description")?.textContent || "";
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

            const pubDate = item.querySelector("pubDate")?.textContent;
            const timestamp = pubDate ? new Date(pubDate).getTime() : Date.now();

            return {
              id: item.querySelector("guid")?.textContent || link,
              baslik: title,
              ozet: cleanDesc.slice(0, 180) + "...",
              detay: cleanDesc,
              kaynak: feedTitle.replace(/ - BBC News| \| World \| The Guardian/gi, ''),
              url: link,
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
    const filtered = activeTag.id === "all" ? newsPool : newsPool.filter(i => i.tagId === activeTag.id);
    const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);
    return { radar: sorted.slice(0, 8), archive: sorted.slice(8, 500) };
  }, [newsPool, activeTag]);

  return (
    // PADDING 40PX'E ÇIKARILDI (4 SATIR)
    <div style={{ paddingTop: "40px", minHeight: "100vh", background: "#080c14", color: "#e8e6e0", fontFamily: "'Georgia', serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@400;700&display=swap');
        .tag-bar { display: flex; gap: 8px; overflow-x: auto; padding: 12px 32px; background: #0d1424; border-bottom: 1px solid #1e2d4a; position: sticky; top: 0; z-index: 100; }
        .tag-pill { padding: 6px 16px; background: #080c14; border: 1px solid #1e2d4a; border-radius: 4px; color: #4a6080; font-size: 10px; font-weight: 900; cursor: pointer; white-space: nowrap; transition: 0.2s; }
        .tag-pill.active { background: #c9a96e; border-color: #c9a96e; color: #0d1424; }
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
        
        /* === BALONCUK VE BANT GİZLEME CSS === */
        body { top: 0px !important; position: static !important; margin-top: 0px !important; }
        iframe.goog-te-banner-frame { display: none !important; visibility: hidden !important; }
        .goog-te-banner-frame { display: none !important; }
        .goog-logo-link { display: none !important; }
        .goog-tooltip { display: none !important; }
        .goog-tooltip:hover { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; border: none !important; box-shadow: none !important; }

        /* === BUTON TASARIMLARI VE MOBİL DUYARLILIK === */
        .header-title { font-family: 'Playfair Display'; font-size: 32px; color: #c9a96e; font-weight: 900; margin: 0; white-space: nowrap; }
        .sync-text { font-size: 12px; color: #c9a96e; font-weight: bold; }
        .action-btn { background: #c9a96e; color: #0d1424; border: none; padding: 0 20px; border-radius: 4px; font-weight: 900; cursor: pointer; font-size: 11px; height: 30px; display: flex; align-items: center; font-family: 'Source Sans 3', sans-serif; text-transform: uppercase; }
        
        .goog-te-combo { background-color: #c9a96e !important; color: #0d1424 !important; border: none !important; padding: 0px 15px !important; border-radius: 4px !important; font-size: 11px !important; font-weight: 900 !important; font-family: 'Source Sans 3', sans-serif !important; text-transform: uppercase !important; cursor: pointer !important; height: 30px !important; outline: none !important; margin: 0 !important; }

        /* TELEFON EKRANLARI İÇİN KÜÇÜLTME ADIMLARI */
        @media (max-width: 768px) {
          .header-title { font-size: 22px; }
          .sync-text { font-size: 10px; }
          .action-btn, .goog-te-combo {
            padding: 0px 8px !important;
            font-size: 9px !important;
            height: 26px !important;
          }
          .header-right-panel { gap: 8px !important; }
        }
      `}</style>

      {/* MODAL SYSTEM */}
      {modalType && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <button className="close-btn" onClick={() => setModalType(null)}>✕</button>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {modalType === 'news' && selectedNews && (
              <>
                <img src={selectedNews.img} style={{ width: "calc(100% + 80px)", margin: "-40px -40px 20px", height: "350px", objectFit: "cover", borderBottom: "2px solid #c9a96e" }} />
                <div style={{ color: "#c9a96e", fontWeight: "900", fontSize: "12px" }}>#{selectedNews.tagLabel} • {getRelativeTime(selectedNews.timestamp)}</div>
                <h2 style={{ fontFamily: "'Playfair Display'", fontSize: "32px", color: "#fff", margin: "15px 0" }}>{selectedNews.baslik}</h2>
                <p style={{ color: "#8a9ab0", lineHeight: "1.8", fontSize: "18px" }}>{selectedNews.detay}</p>
                <a href={selectedNews.url} target="_blank" rel="noreferrer" style={{ background: "#c9a96e", color: "#0d1424", padding: "12px 30px", textDecoration: "none", fontWeight: "bold", borderRadius: "4px", display: "inline-block", marginTop: "20px" }}>GO TO SOURCE ↗</a>
              </>
            )}
            {modalType === 'about' && (
              <>
                <h2 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'" }}>ABOUT US</h2>
                <p style={{ lineHeight: "1.8", color: "#8a9ab0" }}>World Windows is a professional news terminal that scans global finance, geopolitics, and economy news in seconds. Our goal is to present the complex news flow on a single screen in its purest and fastest form. Our sources include media giants such as Reuters, FT, WSJ, and Bloomberg.</p>
              </>
            )}
            {modalType === 'privacy' && (
              <>
                <h2 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'" }}>PRIVACY POLICY</h2>
                <p style={{ lineHeight: "1.8", color: "#8a9ab0" }}>The privacy of your user data is important to us. Our site uses cookies to enhance user experience and serve advertising. Third-party ad vendors (like Google AdSense) may use cookies to serve ads based on your interests. By using our site, you consent to this cookie usage.</p>
              </>
            )}
            {modalType === 'contact' && (
              <>
                <h2 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'" }}>CONTACT</h2>
                <p style={{ lineHeight: "1.8", color: "#8a9ab0" }}>For your questions, collaborations, or advertising proposals, you can reach us via the email address below:</p>
                <h3 style={{ color: "#fff" }}>iletisim@worldwindows.network</h3>
              </>
            )}
          </div>
        </div>
      )}

      <header style={{ background: "#0d1424" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 32px 5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 className="header-title">WORLD WINDOWS</h1>
          <div className="header-right-panel" style={{ display: "flex", gap: "15px", alignItems: "center" }} translate="no">
             
             <div id="google_translate_element"></div>

             <div className="sync-text">SYNC: {timeLeft}s</div>
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
        <section style={{ padding: "30px 0" }}>
          <h2 style={{ fontSize: "20px", color: "#c9a96e", fontFamily: "'Playfair Display'", padding: "0 32px", marginBottom: "10px" }}>LIVE RADAR: {activeTag.label}</h2>
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
          <h2 style={{ fontSize: "20px", color: "#8a9ab0", padding: "0 32px", fontFamily: "'Playfair Display'", marginBottom: "20px" }}>ARCHIVE</h2>
          <div className="archive-grid">
            {displayData.archive.map(n => (
              <div key={n.id} className="archive-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                <div style={{ fontSize: "10px", color: "#c9a96e", marginBottom: "8px", fontWeight: "900" }} translate="no">#{n.tagLabel} • {getRelativeTime(n.timestamp)}</div>
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
          <span className="footer-link" onClick={() => setModalType('privacy')}>PRIVACY POLICY</span>
          <span className="footer-link" onClick={() => setModalType('contact')}>CONTACT</span>
        </div>
        <div style={{ color: "#3a5278", fontSize: "10px", marginTop: "30px" }}>© 2026 World Windows Terminal. All Rights Reserved.</div>
      </footer>
      <Analytics />
    </div>
  );
}
