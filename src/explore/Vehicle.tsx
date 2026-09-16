import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useKeyboardControls } from "@react-three/drei";
import type { RapierRigidBody } from "@react-three/rapier";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { Controls } from "./controls";

const MODEL_PATH = "/models/vehicle.glb";
useGLTF.preload(MODEL_PATH);

// The model is authored Z-up with +X forward (see its glTF extras). These
// half-extents/offsets are the model's own bounding box after correcting it
// to three.js's Y-up, -Z-forward convention (computed once from the file,
// not derived at runtime) so the collider matches the visible mesh.
const COLLIDER_HALF_EXTENTS: [number, number, number] = [1.07, 1.18, 2.28];
const COLLIDER_CENTER: [number, number, number] = [0, 1.18, 0];
const MODEL_OFFSET: [number, number, number] = [0, -0.135, 0.311];

const FORWARD_SPEED = 11;
const REVERSE_SPEED = 6;
const TURN_SPEED = 2.4;
const CAMERA_DISTANCE = 9;
const CAMERA_HEIGHT = 5;

const carForward = new THREE.Vector3();
const carPosition = new THREE.Vector3();
const carQuaternion = new THREE.Quaternion();
const desiredCameraPosition = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const cameraUpOffset = new THREE.Vector3(0, CAMERA_HEIGHT, 0);

export default function Vehicle() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls<Controls>();
  const { scene } = useGLTF(MODEL_PATH);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body) return;

    const { forward, backward, left, right } = getKeys();
    const rotation = body.rotation();
    carQuaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    carForward.set(0, 0, -1).applyQuaternion(carQuaternion);

    const turnInput = (left ? 1 : 0) - (right ? 1 : 0);
    const isReversing = backward && !forward;
    const angularVelocity = forward || backward ? turnInput * TURN_SPEED * (isReversing ? -1 : 1) : 0;
    body.setAngvel({ x: 0, y: angularVelocity, z: 0 }, true);

    const speed = forward ? FORWARD_SPEED : backward ? -REVERSE_SPEED : 0;
    const linvel = body.linvel();
    body.setLinvel({ x: carForward.x * speed, y: linvel.y, z: carForward.z * speed }, true);

    const translation = body.translation();
    carPosition.set(translation.x, translation.y, translation.z);

    desiredCameraPosition
      .copy(carForward)
      .multiplyScalar(-CAMERA_DISTANCE)
      .add(carPosition)
      .add(cameraUpOffset);

    const followLag = 1 - Math.pow(0.001, delta);
    camera.position.lerp(desiredCameraPosition, followLag);
    cameraTarget.lerp(carPosition, 1 - Math.pow(0.02, delta));
    camera.lookAt(cameraTarget);
  });

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      enabledRotations={[false, true, false]}
      linearDamping={0.5}
      position={[0, 2, 0]}
    >
      <CuboidCollider args={COLLIDER_HALF_EXTENTS} position={COLLIDER_CENTER} />
      <group position={MODEL_OFFSET}>
        <group rotation={[0, Math.PI / 2, 0]}>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <primitive object={scene} />
          </group>
        </group>
      </group>
    </RigidBody>
  );
}
