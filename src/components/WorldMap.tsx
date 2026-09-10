import { useState } from "react";
import DestinationPanel from "./DestinationPanel";
import type { Destination } from "../data/destinations";
import MapMarker from "./MapMarker";
import { destinations } from "../data/destinations";

export default function WorldMap() {
  const [selected, setSelected] = useState<Destination | null>(null);

  return (
    <section className="world-map" id="start">
      <div className="world-overlay" />

      <div className="world-intro">
        <span>⌁</span>
        <strong>Nick's World</strong>
        <small>Explore the map</small>
      </div>

      <div className="desktop-markers">
        {destinations.map((destination) => (
          <MapMarker
            key={destination.id}
            destination={destination}
            onSelect={setSelected}
          />
        ))}
      </div>

      <div className="destination-prompt">
        Choose a destination <span>→</span>
      </div>
      <DestinationPanel destination={selected} onClose={() => setSelected(null)} />
    </section>
  );
}