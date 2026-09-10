import type { Destination } from "../data/destinations";

type Props = {
  destination: Destination;
  onSelect: (destination: Destination) => void;
};

export default function MapMarker({ destination, onSelect }: Props) {
  return (
    <button
      className="map-marker"
      style={{
        left: destination.position.left,
        top: destination.position.top,
        "--marker-color": destination.color,
      } as React.CSSProperties}
      onClick={() => onSelect(destination)}
      aria-haspopup="dialog"
      aria-label={`Explore ${destination.name}`}
    >
      <span className="marker-card">
        <span className="marker-number">{destination.number}</span>

        <span>
          <strong>{destination.name}</strong>
          <small>{destination.description}</small>
        </span>
      </span>

      <span className="marker-pin" />
    </button>
  );
}