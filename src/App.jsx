import { useState, useEffect, useRef, memo, useMemo } from "react";

const GLOBAL_TAGS = [
  { id: "all", label: "TÜMÜ", query: "finance+world+news+geopolitics" },
  { id: "ekonomi", label: "EKONOMİ", query: "global+economy+inflation+markets" },
  { id: "finans", label: "FİNANS", query: "investing+wall+street+fed" },
  { id: "jeopolitik", label: "JEOPOLİTİK", query: "geopolitics+intelligence+war" },
  { id: "borsa", label: "BORSA", query: "stock+market+analysis+sp500" },
  { id: "kripto", label: "KRİPTO", query: "crypto+bitcoin+ethereum+blockchain" },
];

const Ticker = memo(() => {
  const container = useRef();
  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbols": [
        { "proName": "OANDA:XAUUSD", "title": "GOLD" },
        { "proName": "FX:USDTRY", "title": "USD/TRY" },
        { "proName": "BINANCE:BTCUSDT", "title": "BTC" },
        { "proName": "TVC:UKOIL", "title": "BRENT" }
      ],
      "colorTheme": "dark", "isTransparent": false, "displayMode": "regular", "locale": "tr", "backgroundColor": "#000000"
    });
    container.current.appendChild(script);
  }, []);
  return <div style={{ borderBottom: "1px solid #1e2d4a" }} ref={container}></div>;
});

export default function GlobalHaberler() {
  const [newsPool, setNewsPool] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTag, setActiveTag] = useState(GLOBAL_TAGS[0]);
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { fetchNews(); setTimeLeft(60); }, [activeTag]);

  async function fetchNews() {
    setLoading(true);
    try {
      // Daha fazla haber çekmek için num=50 parametresini simüle eden geniş sorgu
      const googleRss = `https://news.google.com/rss/search?q=${activeTag.query}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(googleRss)}&count=50`);
      const data = await res.json();
      if (data.status === "ok") {
        setNewsPool(data.items.map(item => ({
          id: item.guid,
          title: item.title,
          link: item.link,
          source: item.source || "Global Intel",
          pubDate: item.pubDate,
          img: `https://picsum.photos/seed/${encodeURIComponent(item.title.slice(0,5))}/800/450`,
          timestamp: new Date(item.pubDate).getTime()
        })));
      }
    } catch (e) { console.error("Hata"); }
    setLoading(false);
  }

  // HABERLERİ RADAR VE ARŞİV OLARAK BÖLME
  const displayData = useMemo(() => {
    const sorted = [...newsPool].sort((a, b) => b.timestamp - a.timestamp);
    return {
      radar: sorted.slice(0, 8),
      archive: sorted.slice(8, 50)
    };
  }, [newsPool]);

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e8e6e0", fontFamily: "serif" }}>
      <header style={{ background: "#0d1424", padding: "20px 32px", borderBottom: "1px solid #1e2d4a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ color: "#c9a96e", margin: 0, fontSize: "28px", letterSpacing: "3px", fontWeight: "900" }}>WORLD WINDOWS</h1>
          <div style={{ color: "#c9a96e", fontWeight: "bold", fontSize: "12px" }}>SYNC: {timeLeft}s</div>
        </div>
      </header>

      <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "12px 32px", background: "#0d1424", borderBottom: "1px solid #1e2d4a" }}>
        {GLOBAL_TAGS.map(t => (
          <button key={t.id} onClick={() => setActiveTag(t)} style={{
            padding: "6px 16px", background: activeTag.id === t.id ? "#c9a96e" : "#080c14",
            color: activeTag.id === t.id ? "#0d1424" : "#4a6080", border: "1px solid #1e2d4a", cursor: "pointer", fontSize: "10px", fontWeight: "900", borderRadius: "4px"
          }}>#{t.label}</button>
        ))}
      </div>

      <Ticker />

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px" }}>
        {loading && newsPool.length === 0 ? (
          <div style={{ textAlign: "center", padding: "100px", color: "#c9a96e" }}>[ STREAMING_INTELLIGENCE... ]</div>
        ) : (
          <>
            <h2 style={{ color: "#c9a96e", fontSize: "20px", marginBottom: "20px", borderLeft: "4px solid #c9a96e", paddingLeft: "15px" }}>LIVE RADAR</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px", marginBottom: "50px" }}>
              {displayData.radar.map(n => (
                <div key={n.id} onClick={() => window.open(n.link, "_blank")} style={{ background: "#0d1424", border: "1px solid #1e2d4a", borderRadius: "12px", overflow: "hidden", cursor: "pointer" }}>
                  <img src={n.img} style={{ width: "100%", height: "200px", objectFit: "cover", borderBottom: "2px solid #c9a96e" }} />
                  <div style={{ padding: "20px" }}>
                    <div style={{ color: "#c9a96e", fontSize: "10px", fontWeight: "900", marginBottom: "10px" }}>[{n.source.toUpperCase()}]</div>
                    <h3 style={{ fontSize: "16px", margin: 0, lineHeight: "1.4" }}>{n.title}</h3>
                  </div>
                </div>
              ))}
            </div>

            <h2 style={{ color: "#4a6080", fontSize: "20px", marginBottom: "20px", borderLeft: "4px solid #1e2d4a", paddingLeft: "15px" }}>ARCHIVE</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "15px" }}>
              {displayData.archive.map(n => (
                <div key={n.id} onClick={() => window.open(n.link, "_blank")} style={{ background: "#0d1424", border: "1px solid #1e2d4a", padding: "15px", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <div style={{ flex: 1 }}>
                    <div style={{ color: "#c9a96e", fontSize: "9px", fontWeight: "900", marginBottom: "5px" }}>{n.source}</div>
                    <h4 style={{ fontSize: "14px", margin: 0, color: "#e8e6e0" }}>{n.title}</h4>
                   </div>
                   <div style={{ color: "#1e2d4a", fontSize: "18px", marginLeft: "15px" }}>↗</div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer style={{ padding: "50px", textAlign: "center", background: "#0d1424", borderTop: "1px solid #1e2d4a", color: "#1e2d4a", fontSize: "12px" }}>
        WORLDWINDOWS.NETWORK // © 2026
      </footer>
    </div>
  );
}
