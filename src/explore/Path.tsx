import { useMemo } from "react";
import * as THREE from "three";
import { PATH_POINTS, PATH_WIDTH } from "./pathRoute";

const UP = new THREE.Vector3(0, 1, 0);
const ROAD_HEIGHT = 0.03; // sits just above the ground slab to avoid z-fighting

function buildRoadGeometry(): THREE.BufferGeometry {
  const halfWidth = PATH_WIDTH / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const direction = new THREE.Vector3();
  const right = new THREE.Vector3();
  const left = new THREE.Vector3();
  const edge = new THREE.Vector3();

  for (let i = 0; i < PATH_POINTS.length; i++) {
    const point = PATH_POINTS[i];
    const next = PATH_POINTS[Math.min(i + 1, PATH_POINTS.length - 1)];
    const prev = PATH_POINTS[Math.max(i - 1, 0)];
    direction.subVectors(next, prev).normalize();
    right.crossVectors(direction, UP).normalize();

    left.copy(point).addScaledVector(right, -halfWidth);
    edge.copy(point).addScaledVector(right, halfWidth);

    positions.push(left.x, ROAD_HEIGHT, left.z, edge.x, ROAD_HEIGHT, edge.z);
    const v = i / (PATH_POINTS.length - 1);
    uvs.push(0, v, 1, v);

    if (i > 0) {
      const base = (i - 1) * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export default function Path() {
  const geometry = useMemo(() => buildRoadGeometry(), []);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#8a6b4a" roughness={1} />
    </mesh>
  );
}
