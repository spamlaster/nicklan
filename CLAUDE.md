# nicklan.com

React + TypeScript + Vite site for nicklan.com. Deployed to GitHub Pages via
`.github/workflows/deploy.yml` on push to `master`.

## Routing

No router library — `App.tsx` reads `window.location.hash` directly and
matches it against a few patterns:

- `#/` — the 2D "Nick's World" map (`WorldMap.tsx`)
- `#/destinations/:id` — a destination's page (currently one shared
  placeholder template in `App.tsx`, keyed off `data/destinations.ts`)
- `#/explore` — the 3D drivable world (`src/explore/`), lazy-loaded via
  `React.lazy` + `Suspense` so none of the 3D stack ships in the main bundle

## Destination data

`src/data/destinations.ts` is the single source of truth for the six
destinations (The Garage, The Workshop, GrowCube, The Airstrip, The
Trailhead, Home Base), consumed by both the 2D map and the 3D world:

```ts
type Destination = {
  id: string;
  number: string;
  name: string;
  description: string;
  summary: string;
  color: string;
  position: { left: string; top: string }; // 2D map CSS placement (%)
  worldPosition: [number, number];         // 3D world [x, z], world units
};
```

If you add a destination, add it here once — both views pick it up.

## `/explore` — the 3D world

Inspired by bruno-simon.com: drive a car around a greybox world (real models
for the vehicle and trees, boxes for buildings/ground), enter a building's
sensor volume to see a "Press Enter" prompt, press Enter to jump to that
destination's route, press Escape to return to the 2D map.

**Stack** (exact versions pinned in `package.json`, no carets):

| package | version |
|---|---|
| `react`, `react-dom` | `19.2.8` |
| `three` | `0.186.0` |
| `@react-three/fiber` | `9.7.0` |
| `@react-three/drei` | `10.7.8` |
| `@react-three/rapier` | `2.2.0` |
| `@types/three` | `0.186.0` |

**Why these exact versions, pinned together**: `@react-three/fiber@9.7.0`
declares a peer range of `react: ">=19 <19.3"`. React's latest at the time
this was built is `19.3.0`, which falls outside that range — so `react` and
`react-dom` are pinned to `19.2.8` (the newest version inside fiber's
declared range) rather than the app's previous `^19.2.8`. If `@react-three/fiber`
later widens its peer range, this pin can be revisited.

**Folder structure** (`src/explore/`):

- `ExploreWorld.tsx` — the lazy-loaded entry component. Checks WebGL support
  on mount (redirects to `#/` if unsupported, per the constraint that the 2D
  map must keep working if 3D can't load); owns the "which destination is
  nearby" state; handles the Escape/Enter global key handlers; renders the
  `<Canvas>`.
- `controls.ts` — the WASD/arrow-key mapping shared between `KeyboardControls`
  and `useKeyboardControls` in `Vehicle.tsx`.
- `Vehicle.tsx` — the car: a Rapier dynamic `RigidBody` with yaw-only rotation
  (`enabledRotations={[false, true, false]}`, so it can't tip over), driven by
  directly setting linear/angular velocity each frame from key state. Also
  owns the chase camera (position lerped behind the car, lookAt lerped toward
  it, for the "lag" effect). Renders `public/models/vehicle.glb` via
  `useGLTF`; the physics collider is an explicit `CuboidCollider` sized to
  the model's real bounding box (`colliders={false}` on the `RigidBody`)
  rather than auto-generated from the model's 122 sub-meshes.
- `Vegetation.tsx` / `vegetationPlacements.ts` — flora scattered across the
  ground: 12 variants spanning trees (`pine-tree-01`, plus
  `vegetation-pine-02-tall/03-narrow/04-irregular`,
  `vegetation-sapling-01/02`), shrubs (`vegetation-mountain-bush-01/02`), and
  ground cover (`vegetation-grass-clump`, `vegetation-wildflower-cluster`,
  `vegetation-fallen-log`, `vegetation-tree-stump`). `vegetationPlacements.ts`
  generates ~220 random placements (position, uniform scale, random yaw),
  rejecting spots too close to spawn, to any building, or to the road (see
  `pathRoute.ts` below), and picks a variant per placement via a weighted
  random draw (`weight` per variant in `VARIANTS` — ground cover is weighted
  higher than trees, so it reads as a forest floor rather than a uniform
  scatter). The 6 tree/sapling variants are `solid: true` in `VARIANTS` — a
  `RigidBody type="fixed"` + `CuboidCollider` sized to the model's real
  (scaled) bounding box, same pattern as `Rock.tsx` — everything else
  (shrubs, grass, wildflowers, fallen logs, stumps) has `solid: false` and
  no collider at all, so the jeep drives straight through it. This is a
  direct ask: "I should not be able to drive through the trees... logs and
  brush is fine." `Vegetation.tsx` loads whichever `.glb` is needed once per
  path via `useGLTF` (cached) and `scene.clone(true)`s it per instance —
  cloning an `Object3D` copies the node graph but shares geometry/materials,
  which is what you want for many cheap instances of one model. Filenames:
  the component is capitalized (`Vegetation.tsx`) and the data module is
  deliberately NOT just a lowercased version of it (`vegetationPlacements.ts`,
  not `vegetation.ts`) — macOS's case-insensitive filesystem treats
  `Vegetation.tsx` and `vegetation.ts` as the same file and TypeScript errors
  on it; this bit us twice now (once here, once with `Path.tsx`/`path.ts` —
  see below), so it's a real recurring trap, not a one-off.
  **Non-uniform scale gotcha**: an earlier version scaled trees as
  `[size, size * heightMultiplier, size]` for "random heights and sizes"
  independently. A couple of the pine variants have a slightly off-center
  trunk, and stretching Y independently of X/Z exaggerated that into a
  visible diagonal spike poking through the canopy. Scale is uniform now —
  if you want independent height variation again, verify it against
  `pine-02-tall`/`pine-03-narrow`/`pine-04-irregular` specifically, since
  those are the ones that showed it.
- `Path.tsx` / `pathRoute.ts` — the dirt trail connecting the six
  destinations, matching the winding driveway/road visible in the 2D map's
  background artwork (`nicklan-world-base-plate.png`). `pathRoute.ts` builds
  a `THREE.CatmullRomCurve3` through a hand-picked tour order (`TOUR_ORDER`:
  home → garage → workshop → growcube → airstrip → trailhead, chosen to
  roughly match the artwork's left-to-right layout, not derived from it
  automatically), starting at the spawn point. `Path.tsx` samples that curve
  and builds a flat ribbon `BufferGeometry` by hand (no drei helper for
  this) — for each sample point it takes the tangent direction, crosses it
  with world-up to get a "right" vector, and offsets by half the road width
  each side. `distanceToPath`/`isNearPath` (also in `pathRoute.ts`) are
  reused by both `rocks.ts` and `vegetationPlacements.ts` so nothing spawns
  on or blocking the road. The road mesh itself has no collider — it's
  cosmetic, sitting 0.03 units above the ground slab to avoid z-fighting.
  Same filename-casing trap as above: the component is `Path.tsx`, the data
  module is `pathRoute.ts` (not `path.ts` — that collided on macOS's
  case-insensitive filesystem the same way `Vegetation.tsx`/`vegetation.ts`
  did earlier in this same milestone).
- `Rock.tsx` / `rocks.ts` — mountain rocks scattered across the ground, in 4
  variants (`mountain-rock-01-boulder/02-flat/03-tall/04-cluster.glb`).
  `rocks.ts` hardcodes each variant's authored width/depth/height (read once
  from its `.glb`, same method as the vehicle/tree bounding boxes) and, per
  placement, picks a variant + random scale, then classifies the rock as
  `solid` if its *scaled* height is at or above `DRIVABLE_HEIGHT_THRESHOLD`
  (currently `0.6`). Below that: no collider at all, same as trees, so the
  jeep just drives over it. At or above it: a `RigidBody type="fixed"` +
  explicit `CuboidCollider` sized to the scaled footprint, same pattern as
  the vehicle's own collider — this blocks the jeep. There's no real
  suspension/wheel physics in this vehicle controller (the jeep's collider
  sits flush with the ground), so "can you roll over it" is this height
  cutoff rather than a physically simulated ramp-over.
- `Building.tsx` — a greybox building per destination, positioned from
  `destination.worldPosition`. Two `RigidBody`s: a solid one for the visible
  box, and a `sensor` `CuboidCollider` (building footprint + 3-unit margin)
  that fires `onIntersectionEnter`/`onIntersectionExit` to report proximity.
- `Ground.tsx` — a static 200×200 slab.
- `ExploreErrorBoundary.tsx` — wraps `ExploreWorld` in `App.tsx`. `<Canvas>`
  re-throws any runtime error from inside the 3D scene into the regular React
  tree; without this boundary that error had nothing to catch it and unmounted
  the entire app (blank page) instead of just failing the 3D view. Falls back
  to a "back to the map" message instead of taking down the 2D map with it.
- `ExploreLoading.tsx` (+ its own tiny CSS) — the `Suspense` fallback. This
  is imported eagerly by `App.tsx` (not part of the lazy chunk) since a
  `Suspense` fallback must be available before the lazy component loads.

**Adding a new model**: don't assume an up-axis convention — it varies even
within this project. `vehicle.glb` and `pine-tree-01.glb` (from the
"Nicklan"/"trimesh" builders) are authored Z-up (Blender's default). The
whole later "vegetation pack" batch (`vegetation-*.glb`) is already Y-up.
Always check the file's own bounding box (or an `extras.up_axis`/
`front_axis` hint, when present) rather than assuming either way. If it's
Z-up, the fix is a `<group rotation={[-Math.PI/2, 0, 0]}>` wrapping the
loaded scene; if forward also needs to change (e.g. a vehicle that must
face -Z), add an outer `<group rotation={[0, Math.PI/2, 0]}>` on top of
that. See `Vehicle.tsx` (needs both rotations) and `Vegetation.tsx` (applies
the up-axis rotation only per-variant, via `vegetationNeedsUpAxisCorrection`,
since it mixes both conventions).

**Entry point**: `EnterWorldButton.tsx`, rendered inside `WorldMap.tsx`. A
"Hop in / Drive Nick's World →" control using the (previously unused)
`red_atv.png`, styled as a map element rather than a nav link. Links to
`#/explore`.

**Bundle impact**: the `/explore` route is a single lazy chunk, roughly
1.1MB gzipped (three.js core + fiber + drei + Rapier's WASM physics engine,
the last being the largest single piece). It only loads when a visitor
clicks into `/explore` — the main bundle is unaffected.

**WebGL context loss — this is a real user-facing bug, not just a headless
artifact**: a real user reported it directly — driving in worked initially
(car visible for a moment) then the screen went permanently black; opening
DevTools (which shrinks the viewport) or starting from a smaller window
avoided it. This scene's polycount (~220 vegetation + ~40 rocks + buildings,
several multi-material) pushes enough pixels/draw calls that a large and/or
high-DPI canvas can exceed what a weaker or software-fallback GPU can
sustain, and Chromium responds by dropping the WebGL context — after which
three.js just renders nothing, forever, with no error thrown.

Two changes address this:
1. `ExploreWorld.tsx`'s `computeDpr()` caps the canvas's actual rendered
   resolution so its longest side is at most `MAX_CANVAS_DIMENSION` (1280px)
   regardless of window size or `devicePixelRatio` — CSS still stretches it
   to fill the screen. This directly targets "large canvas → GPU overload,"
   matching what the user found by shrinking their window. A plain
   `dpr={[1, 1.5]}` clamp (the more common R3F idiom, targeting only
   high-DPI displays) was tried first and rejected: the user's own repro
   was about window *size*, not display density, so a fix keyed only to
   `devicePixelRatio` wouldn't have covered their case.
2. `ExploreWorld.tsx` now listens for `webglcontextlost` on the canvas (via
   `Canvas`'s `onCreated`) and, if the context doesn't restore itself within
   1.5s, redirects to `#/` — the same "2D map must keep working" fallback
   as the WebGL-unsupported case. Previously a context loss for *any*
   reason left a dead black screen forever with no recovery path. This part
   is verified working (see below); item 1 is a best-effort mitigation
   whose real-world effectiveness the user still needs to confirm.

**Known limitation — headless/software-rendered testing is unreliable for
this specific class of bug**: this was investigated at length in a headless
Chromium + SwiftShader (software GL) sandbox, with contradictory results
that make it a poor tool for validating resolution/performance fixes here:
- A bare three.js scene (no physics, no app code) survives fine at 1920×1080
  for 3+ seconds in this same sandbox.
- The full app scene loses its WebGL context reliably within ~1–1.8s
  whenever the canvas's CSS display size differs from its actual rendered
  resolution (i.e., whenever `dpr`/resolution-capping is doing anything at
  all) — independent of object count (reproduced with as few as ~30 total
  rocks+vegetation instances) and independent of `devicePixelRatio` emulation
  specifically (reproduced with `deviceScaleFactor` left at its default of 1
  too).
- The exact same scene, same object counts, is stable indefinitely when the
  canvas's CSS size and rendered resolution match exactly (e.g. a native
  1280×720 viewport, no capping applied).
This strongly suggests the sandbox's software compositor is unusually
expensive at scaling a WebGL canvas — a cost that's normally near-free on
real hardware — which means this sandbox can't be trusted to validate (or
invalidate) a resolution-capping fix like `computeDpr()`. The context-loss
*recovery* behavior (redirecting to `#/`), by contrast, was verified
directly and reliably in this same sandbox, since it doesn't depend on
performance characteristics — only on the `webglcontextlost` event firing
and being handled, which it reliably does once a context is lost by any
means.

Separately (also discovered while investigating this): a raw
`RapierRigidBody` reference captured via a debug hook (e.g.
`window.__carBody = body` in `Vehicle.tsx`'s `useFrame`) throws `"null
pointer passed to rust"` if you call `setTranslation`/`setRotation`/
`rotation()`/etc. on it after the context has been lost — consistent with
the whole Canvas subtree (Physics included) getting torn down alongside the
renderer, not just the visible pixels. Useful to know if you try scripting
physics assertions against a live app instance.

**Bottom line**: do a real-browser check on real hardware (`npm run dev`,
visit `/explore`, try a large/high-DPI display) to confirm whether
`computeDpr()` actually prevents the context loss for the reporting user.
If it still happens, the app now at least recovers instead of hanging —
but the goal is for it not to happen at all.

## Decisions made this milestone

- Buildings and the ground are still greybox (flat-colored boxes, destination
  `color` reused per building); the vehicle, rocks, and vegetation now use
  real models.
- Header is hidden while `#/explore` is active — the 3D view is a full-screen
  takeover, not a page with the normal nav chrome.
- Sky/fog color (`#0d1a17`) picked to match the 2D map's dark teal dusk
  palette rather than a literal sunset orange.
- Car spawns at world origin `[0, 2, 0]`; destination `worldPosition`s were
  hand-placed to roughly echo the 2D map's relative layout, not derived from
  the 2D `position` percentages.
- Trees/saplings are solid (block the jeep); shrubs, grass, wildflowers,
  fallen logs, and stumps are all visual-only, per an explicit ask. Tune
  `solid` per variant in `vegetationPlacements.ts` if that split is wrong.
- Rocks below `DRIVABLE_HEIGHT_THRESHOLD` (0.6 units, scaled) are also
  visual-only; at/above it they get a solid collider. This threshold is the
  whole "can the jeep roll over it" mechanism — there's no ramp/suspension
  simulation, so a rock right at the threshold may still feel like an abrupt
  wall rather than a bump. Tune the constant in `rocks.ts` if that's off.
- Lighting was bumped substantially (ambient 0.6→1.8, directional 1.2→3.2,
  plus a new `hemisphereLight`) and the sky/fog color lightened
  (`#0d1a17`→`#152922`) after the scene read as "too dark, can't see
  anything" — PBR materials under three.js's default lighting model need
  meaningfully higher intensities than a naive guess suggests, especially
  with the vertex-colored/low-reflectance rock and tree materials.
- The road (`Path.tsx`) is a single flat ribbon mesh, not a series of
  distinct road segments per destination — it's one continuous curve
  through the whole tour order, since that's what the 2D artwork shows
  (one winding driveway/trail, not separate disconnected paths).
