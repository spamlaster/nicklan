import * as THREE from "three";
import { destinations } from "../data/destinations";

// Tour order roughly matching the 2D map artwork's layout: Home Base and the
// Garage/Workshop cluster on the left, GrowCube in the middle, the Airstrip
// and Trailhead further out to the right.
const TOUR_ORDER = ["home", "garage", "workshop", "growcube", "airstrip", "trailhead"];

function waypointFor(id: string): THREE.Vector3 {
  const destination = destinations.find((item) => item.id === id);
  if (!destination) throw new Error(`Unknown destination id in path tour: ${id}`);
  const [x, z] = destination.worldPosition;
  return new THREE.Vector3(x, 0, z);
}

// Starts at the spawn point so the trail leads away from where the car appears.
const CONTROL_POINTS = [new THREE.Vector3(0, 0, 0), ...TOUR_ORDER.map(waypointFor)];

const curve = new THREE.CatmullRomCurve3(CONTROL_POINTS, false, "catmullrom", 0.4);

export const PATH_WIDTH = 7;
const CLEARANCE_MARGIN = 3.5;

// Scaled up alongside the wider destination spacing to keep the same sample
// density along the (now much longer) curve, for a smooth ribbon and an
// accurate distanceToPath lookup.
const SAMPLE_COUNT = 360;
export const PATH_POINTS: THREE.Vector3[] = curve.getPoints(SAMPLE_COUNT);

const UP = new THREE.Vector3(0, 1, 0);

// Buildings sit beside the trail rather than on top of it — offset
// perpendicular to the path's tangent at each destination's waypoint, same
// "cross tangent with world-up" technique Path.tsx uses to build the road
// ribbon. Distance is well clear of the road's own half-width + clearance
// (7 units) so the building footprint never overlaps the path mesh.
const BUILDING_OFFSET = 18;

function tangentAtControlPoint(index: number): THREE.Vector3 {
  const prev = CONTROL_POINTS[Math.max(index - 1, 0)];
  const next = CONTROL_POINTS[Math.min(index + 1, CONTROL_POINTS.length - 1)];
  return new THREE.Vector3().subVectors(next, prev).normalize();
}

const BUILDING_POSITIONS = new Map<string, [number, number]>(
  TOUR_ORDER.map((id, i) => {
    const controlIndex = i + 1; // +1 because CONTROL_POINTS[0] is the spawn point
    const waypoint = CONTROL_POINTS[controlIndex];
    const tangent = tangentAtControlPoint(controlIndex);
    const right = new THREE.Vector3().crossVectors(tangent, UP).normalize();
    const offset = waypoint.clone().addScaledVector(right, BUILDING_OFFSET);
    return [id, [offset.x, offset.z]];
  }),
);

/** Where a destination's building actually sits — off the trail centerline, not on it. */
export function buildingPositionFor(id: string): [number, number] {
  const position = BUILDING_POSITIONS.get(id);
  if (!position) throw new Error(`Unknown destination id for building placement: ${id}`);
  return position;
}

export function distanceToPath(x: number, z: number): number {
  let minDistSq = Infinity;
  for (const point of PATH_POINTS) {
    const dx = x - point.x;
    const dz = z - point.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDistSq) minDistSq = distSq;
  }
  return Math.sqrt(minDistSq);
}

export function isNearPath(x: number, z: number): boolean {
  return distanceToPath(x, z) < PATH_WIDTH / 2 + CLEARANCE_MARGIN;
}
