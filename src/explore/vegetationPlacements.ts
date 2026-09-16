import { destinations } from "../data/destinations";
import { buildingPositionFor, isNearPath } from "./pathRoute";

export type VegetationVariant =
  | "pine-01"
  | "pine-02-tall"
  | "pine-03-narrow"
  | "pine-04-irregular"
  | "sapling-01"
  | "sapling-02"
  | "mountain-bush-01"
  | "mountain-bush-02"
  | "grass-clump"
  | "wildflower-cluster"
  | "fallen-log"
  | "tree-stump";

type VariantInfo = {
  path: string;
  /** Authored width/depth/height (meters), read from the .glb's own bounding box. */
  width: number;
  depth: number;
  height: number;
  /** True for models authored Z-up (need rotating into three.js's Y-up convention). */
  zUp: boolean;
  /** Relative frequency in the random mix — higher spawns more often. */
  weight: number;
  /** Trees block the jeep; logs/brush/grass/stumps don't. */
  solid: boolean;
};

const VARIANTS: Record<VegetationVariant, VariantInfo> = {
  "pine-01": { path: "/models/pine-tree-01.glb", width: 2.49, depth: 2.46, height: 5.18, zUp: true, weight: 2, solid: true },
  "pine-02-tall": { path: "/models/vegetation-pine-02-tall.glb", width: 2.04, depth: 2.06, height: 6.2, zUp: false, weight: 2, solid: true },
  "pine-03-narrow": { path: "/models/vegetation-pine-03-narrow.glb", width: 1.49, depth: 1.51, height: 5.3, zUp: false, weight: 2, solid: true },
  "pine-04-irregular": { path: "/models/vegetation-pine-04-irregular.glb", width: 2.44, depth: 2.47, height: 4.05, zUp: false, weight: 2, solid: true },
  "sapling-01": { path: "/models/vegetation-sapling-01.glb", width: 0.88, depth: 0.89, height: 1.42, zUp: false, weight: 3, solid: true },
  "sapling-02": { path: "/models/vegetation-sapling-02.glb", width: 0.68, depth: 0.69, height: 0.9, zUp: false, weight: 3, solid: true },
  "mountain-bush-01": { path: "/models/vegetation-mountain-bush-01.glb", width: 1.57, depth: 1.24, height: 0.92, zUp: false, weight: 4, solid: false },
  "mountain-bush-02": { path: "/models/vegetation-mountain-bush-02.glb", width: 2.02, depth: 1.32, height: 0.92, zUp: false, weight: 4, solid: false },
  "grass-clump": { path: "/models/vegetation-grass-clump.glb", width: 0.67, depth: 0.81, height: 0.61, zUp: false, weight: 6, solid: false },
  "wildflower-cluster": { path: "/models/vegetation-wildflower-cluster.glb", width: 0.71, depth: 0.61, height: 0.6, zUp: false, weight: 5, solid: false },
  "fallen-log": { path: "/models/vegetation-fallen-log.glb", width: 2.25, depth: 0.55, height: 0.56, zUp: false, weight: 3, solid: false },
  "tree-stump": { path: "/models/vegetation-tree-stump.glb", width: 0.77, depth: 0.77, height: 0.64, zUp: false, weight: 3, solid: false },
};

const VARIANT_NAMES = Object.keys(VARIANTS) as VegetationVariant[];
const TOTAL_WEIGHT = VARIANT_NAMES.reduce((sum, name) => sum + VARIANTS[name].weight, 0);

function pickVariant(): VegetationVariant {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const name of VARIANT_NAMES) {
    roll -= VARIANTS[name].weight;
    if (roll <= 0) return name;
  }
  return VARIANT_NAMES[VARIANT_NAMES.length - 1];
}

export type VegetationPlacement = {
  id: string;
  variant: VegetationVariant;
  position: [number, number, number];
  scale: number;
  rotationY: number;
};

const VEGETATION_COUNT = 220;
const WORLD_HALF_EXTENT = 160;
const MIN_DISTANCE_FROM_BUILDING = 10;
const MIN_DISTANCE_FROM_SPAWN = 8;
const MAX_PLACEMENT_ATTEMPTS = 20;

// Scale is relative to each variant's own authored size, so a scaled-up
// grass clump stays small and a scaled-up pine stays tall. Uniform (not
// per-axis) — a couple of the pine variants have a slightly off-center
// trunk, and stretching Y independently of X/Z exaggerated that into a
// visible diagonal spike poking through the canopy.
const SIZE_MIN = 0.7;
const SIZE_MAX = 1.4;

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

export function generateVegetation(): VegetationPlacement[] {
  const items: VegetationPlacement[] = [];

  for (let i = 0; i < VEGETATION_COUNT; i++) {
    let x = 0;
    let z = 0;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      x = randomBetween(-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT);
      z = randomBetween(-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT);
      if (isPositionClear(x, z)) break;
    }

    items.push({
      id: `veg-${i}`,
      variant: pickVariant(),
      position: [x, 0, z],
      scale: randomBetween(SIZE_MIN, SIZE_MAX),
      rotationY: Math.random() * Math.PI * 2,
    });
  }

  return items;
}

export function vegetationModelPath(variant: VegetationVariant): string {
  return VARIANTS[variant].path;
}

export function vegetationNeedsUpAxisCorrection(variant: VegetationVariant): boolean {
  return VARIANTS[variant].zUp;
}

export function vegetationIsSolid(variant: VegetationVariant): boolean {
  return VARIANTS[variant].solid;
}

/** Collider half-extents [x, y, z] for a solid variant at the given uniform scale. */
export function vegetationColliderHalfExtents(variant: VegetationVariant, scale: number): [number, number, number] {
  const info = VARIANTS[variant];
  return [(info.width / 2) * scale, (info.height / 2) * scale, (info.depth / 2) * scale];
}

export function allVegetationModelPaths(): string[] {
  return VARIANT_NAMES.map((name) => VARIANTS[name].path);
}
