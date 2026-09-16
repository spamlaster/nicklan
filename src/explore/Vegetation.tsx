import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { VegetationPlacement } from "./vegetationPlacements";
import {
  allVegetationModelPaths,
  vegetationColliderHalfExtents,
  vegetationIsSolid,
  vegetationModelPath,
  vegetationNeedsUpAxisCorrection,
} from "./vegetationPlacements";

allVegetationModelPaths().forEach((path) => useGLTF.preload(path));

export default function Vegetation({ variant, position, scale, rotationY }: VegetationPlacement) {
  const { scene } = useGLTF(vegetationModelPath(variant));
  const instance = useMemo(() => scene.clone(true), [scene]);
  const needsUpAxisCorrection = vegetationNeedsUpAxisCorrection(variant);

  const model = (
    <group rotation={[0, rotationY, 0]} scale={scale}>
      {needsUpAxisCorrection ? (
        // This variant is authored Z-up; rotate it into three.js's Y-up convention.
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <primitive object={instance} />
        </group>
      ) : (
        <primitive object={instance} />
      )}
    </group>
  );

  if (!vegetationIsSolid(variant)) {
    return <group position={position}>{model}</group>;
  }

  const colliderHalfExtents = vegetationColliderHalfExtents(variant, scale);

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CuboidCollider args={colliderHalfExtents} position={[0, colliderHalfExtents[1], 0]} />
      {model}
    </RigidBody>
  );
}
