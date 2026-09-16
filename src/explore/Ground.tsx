import { RigidBody } from "@react-three/rapier";

const GROUND_SIZE = 360;

export default function Ground() {
  return (
    <RigidBody type="fixed" colliders="cuboid" friction={1}>
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[GROUND_SIZE, 1, GROUND_SIZE]} />
        <meshStandardMaterial color="#1c3b34" />
      </mesh>
    </RigidBody>
  );
}
