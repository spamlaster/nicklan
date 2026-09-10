import { useEffect, useRef } from "react";
import type { Destination } from "../data/destinations";

type Props = { destination: Destination | null; onClose: () => void };

export default function DestinationPanel({ destination, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!destination) return;
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [destination]);

  return (
    <dialog ref={dialog} className="destination-panel" aria-labelledby="destination-title" onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientY < bounds.top) onClose();
        }
      }}>
      {destination && <>
        <button className="panel-close" onClick={onClose} aria-label="Close destination" autoFocus>×</button>
        <span className="panel-number" aria-hidden="true">{destination.number}</span>
        <p className="destination-eyebrow" style={{ color: destination.color }}>{destination.description}</p>
        <h2 id="destination-title">{destination.name}</h2>
        <p className="destination-summary">{destination.summary}</p>
        <a className="learn-more" href={`#/destinations/${destination.id}`}>Learn more <span aria-hidden="true">→</span></a>
      </>}
    </dialog>
  );
}
