import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { Destination } from "../data/destinations";
import type { BuildingModelInfo } from "./buildingModels";
import { allBuildingModelPaths, buildingModelFor, hasNoBuildingBox } from "./buildingModels";
import { buildingPositionFor } from "./pathRoute";

allBuildingModelPaths().forEach((path) => useGLTF.preload(path));

type Props = {
  destination: Destination;
  onEnter: (id: string) => void;
  onExit: (id: string) => void;
};

const WIDTH = 6;
const HEIGHT = 5;
const DEPTH = 6;
const SENSOR_MARGIN = 3;

function BuildingModel({ path, halfExtents, centerOffset }: BuildingModelInfo) {
  const { scene } = useGLTF(path);
  const instance = useMemo(() => scene.clone(true), [scene]);
  const [offsetX, offsetZ] = centerOffset;

  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={halfExtents} position={[offsetX, halfExtents[1], offsetZ]} />
      <primitive object={instance} />
    </RigidBody>
  );
}

export default function Building({ destination, onEnter, onExit }: Props) {
  const [x, z] = buildingPositionFor(destination.id);
  const model = buildingModelFor(destination.id);

  return (
    <group position={[x, 0, z]}>
      {model ? (
        <BuildingModel {...model} />
      ) : hasNoBuildingBox(destination.id) ? null : (
        <RigidBody type="fixed" colliders="cuboid">
          <mesh position={[0, HEIGHT / 2, 0]}>
            <boxGeometry args={[WIDTH, HEIGHT, DEPTH]} />
            <meshStandardMaterial color={destination.color} />
          </mesh>
        </RigidBody>
      )}

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[WIDTH / 2 + SENSOR_MARGIN, HEIGHT / 2 + SENSOR_MARGIN, DEPTH / 2 + SENSOR_MARGIN]}
          position={[0, HEIGHT / 2, 0]}
          sensor
          onIntersectionEnter={() => onEnter(destination.id)}
          onIntersectionExit={() => onExit(destination.id)}
        />
      </RigidBody>
    </group>
  );
}
