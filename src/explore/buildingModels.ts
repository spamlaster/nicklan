export type BuildingModelInfo = {
  path: string;
  /** Half-extents [x, y, z], read from the model's own bounding box. */
  halfExtents: [number, number, number];
  /** Horizontal offset of the bbox center from the model's local origin (x, z). */
  centerOffset: [number, number];
};

// Half-extents/offsets computed once from each .glb's own bounding box (all
// authored Y-up with base at y=0, no node transforms), same method as the
// vehicle/rock/vegetation colliders documented in CLAUDE.md.
const WORKSHOP_GARAGE_MODEL: BuildingModelInfo = {
  path: "/models/building-workshop-garage.glb",
  halfExtents: [3.78, 4.35, 2.88],
  centerOffset: [0, 0],
};

// The Garage and The Workshop share the same model — only one
// "workshop/garage" building was authored, reused for both destinations.
const BUILDING_MODELS: Partial<Record<string, BuildingModelInfo>> = {
  garage: WORKSHOP_GARAGE_MODEL,
  workshop: WORKSHOP_GARAGE_MODEL,
  growcube: {
    path: "/models/building-glass-greenhouse.glb",
    halfExtents: [2.675, 3.733, 2.175],
    centerOffset: [0, 0],
  },
  airstrip: {
    path: "/models/building-airplane-hangar.glb",
    halfExtents: [5.13, 5.95, 4.145],
    centerOffset: [0, 0.015],
  },
  home: {
    path: "/models/building-modern-mountain-house.glb",
    halfExtents: [4.825, 5.25, 3.885],
    centerOffset: [0.025, 0.76],
  },
};

// Trailhead intentionally has no building — the plan is parked RZR/dirt-bike
// props there instead, which haven't been supplied yet. Render neither a
// greybox nor a model for it in the meantime (see CLAUDE.md).
const NO_BUILDING_IDS = new Set(["trailhead"]);

export function buildingModelFor(id: string): BuildingModelInfo | undefined {
  return BUILDING_MODELS[id];
}

export function hasNoBuildingBox(id: string): boolean {
  return NO_BUILDING_IDS.has(id);
}

export function allBuildingModelPaths(): string[] {
  return [...new Set(Object.values(BUILDING_MODELS).map((info) => info!.path))];
}
