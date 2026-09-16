import { destinations } from "../data/destinations";
import { buildingPositionFor, isNearPath } from "./pathRoute";

export type RockVariant = "boulder" | "flat" | "tall" | "cluster";

type VariantInfo = {
  path: string;
  width: number;
  depth: number;
  height: number;
};

// Authored footprint/height per variant (meters), read from each .glb's own
// bounding box — see CLAUDE.md for how these were derived.
const VARIANTS: Record<RockVariant, VariantInfo> = {
  boulder: { path: "/models/mountain-rock-01-boulder.glb", width: 2.15, depth: 1.57, height: 0.92 },
  flat: { path: "/models/mountain-rock-02-flat.glb", width: 2.48, depth: 1.58, height: 0.48 },
  tall: { path: "/models/mountain-rock-03-tall.glb", width: 1.21, depth: 1.07, height: 1.18 },
  cluster: { path: "/models/mountain-rock-04-cluster.glb", width: 2.43, depth: 1.41, height: 0.68 },
};

const VARIANT_NAMES = Object.keys(VARIANTS) as RockVariant[];

export type RockPlacement = {
  id: string;
  variant: RockVariant;
  position: [number, number, number];
  scale: number;
  rotationY: number;
  solid: boolean;
  colliderHalfExtents: [number, number, number];
};

const ROCK_COUNT = 40;
const WORLD_HALF_EXTENT = 160;
const MIN_DISTANCE_FROM_BUILDING = 10;
const MIN_DISTANCE_FROM_SPAWN = 10;
const MAX_PLACEMENT_ATTEMPTS = 20;

const SCALE_MIN = 0.6;
const SCALE_MAX = 1.8;

// The jeep's own collider sits flush with the ground (no modeled suspension
// or wheel clearance), so "can the jeep roll over this rock" is just a
// height cutoff rather than real physics. Below this, the rock renders with
// no collider at all (drivable); at or above it, it gets a solid RigidBody.
const DRIVABLE_HEIGHT_THRESHOLD = 0.6;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function isPositionClear(x: number, z: number): boolean {
  if (Math.hypot(x, z) < MIN_DISTANCE_FROM_SPAWN) return false;
  if (isNearPath(x, z)) return false;

  return destinations.every((destination) => {
    const [buildingX, buildingZ] = buildingPositionFor(destination.id);
    return Math.hypot(x - buildingX, z - buildingZ) >= MIN_DISTANCE_FROM_BUILDING;
  });
}

export function generateRocks(): RockPlacement[] {
  const rocks: RockPlacement[] = [];

  for (let i = 0; i < ROCK_COUNT; i++) {
    let x = 0;
    let z = 0;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      x = randomBetween(-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT);
      z = randomBetween(-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT);
      if (isPositionClear(x, z)) break;
    }

    const variant = VARIANT_NAMES[Math.floor(Math.random() * VARIANT_NAMES.length)];
    const info = VARIANTS[variant];
    const scale = randomBetween(SCALE_MIN, SCALE_MAX);
    const height = info.height * scale;

    rocks.push({
      id: `rock-${i}`,
      variant,
      position: [x, 0, z],
      scale,
      rotationY: Math.random() * Math.PI * 2,
      solid: height >= DRIVABLE_HEIGHT_THRESHOLD,
      colliderHalfExtents: [(info.width * scale) / 2, height / 2, (info.depth * scale) / 2],
    });
  }

  return rocks;
}

export function rockModelPath(variant: RockVariant): string {
  return VARIANTS[variant].path;
}

export function allRockModelPaths(): string[] {
  return VARIANT_NAMES.map((name) => VARIANTS[name].path);
}
