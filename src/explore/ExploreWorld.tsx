import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RootState } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { destinations } from "../data/destinations";
import Building from "./Building";
import { keyboardMap } from "./controls";
import Ground from "./Ground";
import Path from "./Path";
import Rock from "./Rock";
import { generateRocks } from "./rocks";
import Vegetation from "./Vegetation";
import { generateVegetation } from "./vegetationPlacements";
import Vehicle from "./Vehicle";
import "./explore.css";

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// On this scene's polycount, a canvas rendered at native resolution on a
// large/high-DPI display can overwhelm weaker GPUs and lose its WebGL
// context entirely (symptom: the car flashes for a moment, then the screen
// goes black — recoverable by shrinking the window, which was the original
// clue). Rather than rely on the window staying small, cap the canvas's
// actual rendered resolution to a known-safe budget regardless of window
// size or devicePixelRatio; CSS still scales it to fill the screen.
const MAX_CANVAS_DIMENSION = 1280;

function computeDpr() {
  if (typeof window === "undefined") return 1;
  const longestSide = Math.max(window.innerWidth, window.innerHeight);
  return Math.min(1, MAX_CANVAS_DIMENSION / longestSide);
}

export default function ExploreWorld() {
  const [webglSupported] = useState(supportsWebGL);
  const [dpr] = useState(computeDpr);
  const [nearbyId, setNearbyId] = useState<string | null>(null);
  const nearbyRef = useRef<string | null>(null);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    nearbyRef.current = nearbyId;
  }, [nearbyId]);

  useEffect(() => {
    if (!webglSupported) window.location.hash = "#/";
  }, [webglSupported]);

  // If the WebGL context is ever lost (weak/overloaded GPU, driver reset,
  // etc.) the canvas otherwise just goes permanently black with no way
  // back short of a manual refresh. Give the browser a brief window to
  // auto-restore it, and if it doesn't, fall back to the 2D map rather
  // than leaving a dead screen — same "2D map must keep working" rule as
  // the WebGL-unsupported case above.
  useEffect(() => {
    if (!contextLost) return;
    const timer = window.setTimeout(() => {
      window.location.hash = "#/";
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [contextLost]);

  const handleCreated = useCallback((state: RootState) => {
    const canvas = state.gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => setContextLost(false);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        window.location.hash = "#/";
      } else if (event.code === "Enter" && nearbyRef.current) {
        window.location.hash = `#/destinations/${nearbyRef.current}`;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleEnter = useCallback((id: string) => setNearbyId(id), []);
  const handleExit = useCallback(
    (id: string) => setNearbyId((current) => (current === id ? null : current)),
    [],
  );

  const nearbyDestination = useMemo(
    () => destinations.find((item) => item.id === nearbyId) ?? null,
    [nearbyId],
  );

  const vegetation = useMemo(() => generateVegetation(), []);
  const rocks = useMemo(() => generateRocks(), []);

  if (!webglSupported) return null;

  return (
    <div className="explore-world">
      <KeyboardControls map={keyboardMap}>
        <Canvas dpr={dpr} camera={{ fov: 60, position: [0, 5, 9] }} onCreated={handleCreated}>
          <color attach="background" args={["#152922"]} />
          <fog attach="fog" args={["#152922", 45, 170]} />
          <ambientLight intensity={1.8} color="#f2d9a0" />
          <hemisphereLight args={["#cfe8ff", "#1c3b2f", 1.1]} />
          <directionalLight position={[40, 60, 20]} intensity={3.2} color="#f6b56a" />
          <Physics gravity={[0, -18, 0]}>
            <Ground />
            <Path />
            <Vehicle />
            {destinations.map((destination) => (
              <Building key={destination.id} destination={destination} onEnter={handleEnter} onExit={handleExit} />
            ))}
            {rocks.map((rock) => (
              <Rock key={rock.id} {...rock} />
            ))}
            {vegetation.map((item) => (
              <Vegetation key={item.id} {...item} />
            ))}
          </Physics>
        </Canvas>
      </KeyboardControls>

      <a className="explore-exit" href="#/">
        Esc &middot; Back to map
      </a>

      {contextLost && (
        <div className="explore-loading">
          <p>Reconnecting&hellip;</p>
        </div>
      )}

      {nearbyDestination && (
        <div className="explore-prompt" style={{ borderColor: nearbyDestination.color }}>
          <strong>{nearbyDestination.name}</strong>
          <span>Press Enter to explore &rarr;</span>
        </div>
      )}
    </div>
  );
}
