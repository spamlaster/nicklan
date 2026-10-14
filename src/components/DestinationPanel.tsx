import { useEffect, useRef } from "react";
import type { Destination } from "../data/destinations";

type Props = { destination: Destination | null; onClose: () => void };

const recentBuilds = [
  {
    name: "BeRegular",
    href: "https://beregular.com",
    label: "Shopify storefront · Ecommerce",
    description: "A cleaner, more focused storefront experience for a growing wellness brand.",
  },
  {
    name: "MsJana.com",
    href: "https://msjana.com",
    label: "Speech practice · Learning games",
    description: "A playful speech therapy resource that helps students practice sounds through games.",
  },
  {
    name: "RJ Performance Horses",
    href: "https://rjperformancehorses.com",
    label: "Lessons · Scheduling platform",
    description: "A custom site with lesson information and a streamlined booking experience.",
  },
];

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
        {destination.id === "workshop" && (
          <section className="recent-builds" aria-labelledby="recent-builds-title">
            <h3 id="recent-builds-title">Recent builds</h3>
            <ul className="build-list">
              {recentBuilds.map((build) => (
                <li key={build.href}>
                  <a className="build-card" href={build.href} target="_blank" rel="noopener noreferrer">
                    <h4>{build.name} <span aria-hidden="true">↗</span></h4>
                    <p className="build-label">{build.label}</p>
                    <p className="build-description">{build.description}</p>
                    <span className="build-link-note">Opens in a new tab</span>
                  </a>
                </li>
              ))}
              <li>
                <article className="build-card build-card-planned">
                  <h4>MyGarage <span className="build-status">In progress</span></h4>
                  <p className="build-label">Vehicle history · Maintenance · Parts</p>
                  <p className="build-description">A practical home for vehicle builds, repairs and everything that keeps a vehicle on the road. It’s still on the roadmap while I finish these recent projects.</p>
                </article>
              </li>
            </ul>
          </section>
        )}
        <a className="learn-more" href={`#/destinations/${destination.id}`}>Learn more <span aria-hidden="true">→</span></a>
      </>}
    </dialog>
  );
}
