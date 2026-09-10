import { useEffect, useState } from "react";
import Header from "./components/Header";
import WorldMap from "./components/WorldMap";
import { destinations } from "./data/destinations";

export default function App() {
  const [route, setRoute] = useState(window.location.hash);
  const destination = destinations.find((item) => route === `#/destinations/${item.id}`);

  useEffect(() => {
    const navigate = () => {
      setRoute(window.location.hash);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  useEffect(() => {
    document.title = destination ? `${destination.name} | Nick Lancaster` : "Nick Lancaster | Nick's World";
    if (destination) document.getElementById("page-title")?.focus();
  }, [destination]);

  return (
    <>
      <Header />
      <main>
        {destination ? (
          <article className="destination-page">
            <a className="back-to-map" href="#/">← Back to the map</a>
            <p className="destination-eyebrow" style={{ color: destination.color }}>{destination.number} · {destination.description}</p>
            <h1 id="page-title" tabIndex={-1}>{destination.name}</h1>
            <p className="destination-summary">{destination.summary}</p>
            <p className="destination-placeholder">More content will be added during the next phase.</p>
          </article>
        ) : <WorldMap />}
      </main>
    </>
  );
}
