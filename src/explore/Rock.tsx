import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { RockPlacement } from "./rocks";
import { allRockModelPaths, rockModelPath } from "./rocks";

allRockModelPaths().forEach((path) => useGLTF.preload(path));

export default function Rock({ variant, position, scale, rotationY, solid, colliderHalfExtents }: RockPlacement) {
  const { scene } = useGLTF(rockModelPath(variant));
  const instance = useMemo(() => scene.clone(true), [scene]);

  const model = (
    <group rotation={[0, rotationY, 0]} scale={scale}>
      {/* The model is authored Z-up; rotate it into three.js's Y-up convention. */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={instance} />
      </group>
    </group>
  );

  if (!solid) {
    // Below the drivable-height threshold: no collider, the jeep just drives over it.
    return <group position={position}>{model}</group>;
  }

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CuboidCollider args={colliderHalfExtents} position={[0, colliderHalfExtents[1], 0]} />
      {model}
    </RigidBody>
  );
}
