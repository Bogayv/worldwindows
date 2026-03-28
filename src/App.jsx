import { useState, useEffect, useRef, memo } from "react";

const SOURCES = [
  { id: "all", label: "TÜMÜ", url: "https://www.reutersagency.com/feed/" },
  { id: "finans", label: "FİNANS", url: "https://www.wsj.com/xml/rss/3_7031.xml" },
  { id: "ekonomi", label: "EKONOMİ", url: "https://www.ft.com/?format=rss" },
  { id: "jeopolitik", label: "JEOPOLİTİK", url: "https://www.theguardian.com/world/rss" }
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
      "colorTheme": "dark", "isTransparent": false, "displayMode": "regular", "locale": "tr"
    });
    container.current.appendChild(script);
  }, []);
  return <div ref={container}></div>;
});

export default function GlobalHaberler() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTag, setActiveTag] = useState(SOURCES[0]);
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
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(activeTag.url)}&api_key=oyncyf0mgh8v7e5lq9w5z9yqyv8u78moxg8p9r9j`);
      const data = await res.json();
      if (data.status === "ok") {
        setNews(data.items.map(item => ({
          id: item.guid || item.link,
          title: item.title,
          link: item.link,
          source: data.feed.title || "Global",
          img: item.enclosure?.link || item.thumbnail || `https://picsum.photos/seed/${Math.random()}/800/450`
        })));
      }
    } catch (e) { console.error("Hata"); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#05070a", color: "#e0e0e0", fontFamily: "monospace" }}>
      <header style={{ background: "#0a0d14", borderBottom: "1px solid #1e2d4a", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1200px", margin: "0 auto" }}>
          <h1 style={{ color: "#c9a96e", margin: 0, fontSize: "22px", letterSpacing: "3px" }}>WORLD WINDOWS NETWORK</h1>
          <div style={{ color: "#c9a96e", fontSize: "12px", fontWeight: "bold" }}>SYNC: {timeLeft}s</div>
        </div>
      </header>

      <div style={{ background: "#0a0d14", borderBottom: "1px solid #1e2d4a", padding: "10px", display: "flex", justifyContent: "center", gap: "10px", overflowX: "auto" }}>
        {SOURCES.map(s => (
          <button key={s.id} onClick={() => setActiveTag(s)} style={{
            padding: "8px 15px", background: activeTag.id === s.id ? "#c9a96e" : "transparent",
            color: activeTag.id === s.id ? "#05070a" : "#4a6080", border: "1px solid #1e2d4a", cursor: "pointer", fontSize: "11px"
          }}>{s.label}</button>
        ))}
      </div>

      <Ticker />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "30px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#c9a96e", padding: "50px" }}>[ DECRYPTING_GLOBAL_DATA... ]</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "25px" }}>
            {news.map(n => (
              <div key={n.id} onClick={() => window.open(n.link, "_blank")} style={{ background: "#0a0d14", border: "1px solid #1e2d4a", cursor: "pointer", transition: "0.3s" }}>
                <img src={n.img} style={{ width: "100%", height: "180px", objectFit: "cover", opacity: 0.7 }} />
                <div style={{ padding: "15px" }}>
                  <div style={{ color: "#c9a96e", fontSize: "10px", marginBottom: "10px" }}>// {n.source.toUpperCase()}</div>
                  <h3 style={{ fontSize: "14px", color: "#fff", margin: 0, lineHeight: "1.4" }}>{n.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <footer style={{ textAlign: "center", padding: "30px", fontSize: "10px", color: "#1e2d4a" }}>WORLDWINDOWS.NETWORK // EST. 2026</footer>
    </div>
  );
}
