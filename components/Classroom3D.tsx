'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { STATUS_COLOR, isGirl, isPresent, type Status, type Student } from '@/lib/constants';

// ===== ผังห้อง =====
// ห้องเรียน: x -8..8, z -7..7 | ประตูอยู่ผนังขวา (x=8) ตรง z=5
// ทางเดินรอเช็คชื่อ: x 8..13 | โซนไม่ได้มาเรียน: x 13..18
const WALL_X = 8;
const DOOR_Z = 5;
const DOOR_IN = new THREE.Vector3(WALL_X - 1, 0, DOOR_Z);
const DOOR_OUT = new THREE.Vector3(WALL_X + 1, 0, DOOR_Z);
const COLS = 8;

const seatPos = (i: number) =>
  new THREE.Vector3(-6 + (i % COLS) * 1.7, 0, -3 + Math.floor(i / COLS) * 1.8);
const waitPos = (i: number) =>
  new THREE.Vector3(9.6 + (i % 3) * 0.9, 0, -6.3 + Math.floor(i / 3) * 0.85);
const awayPos = (i: number) =>
  new THREE.Vector3(14.2 + (i % 4) * 0.9, 0, -6.3 + Math.floor(i / 4) * 0.9);

function buildPath(from: THREE.Vector3, to: THREE.Vector3) {
  const fromIn = from.x < WALL_X;
  const toIn = to.x < WALL_X;
  if (fromIn === toIn) return [to.clone()];
  return fromIn
    ? [DOOR_IN.clone(), DOOR_OUT.clone(), to.clone()]
    : [DOOR_OUT.clone(), DOOR_IN.clone(), to.clone()];
}

function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a + Math.PI) % (Math.PI * 2);
  if (d < 0) d += Math.PI * 2;
  return a + (d - Math.PI) * t;
}

const SKIN = '#f1c27d';
const SHIRT = '#ffffff';
const NAVY = '#1e3a8a';
const HAIR = '#1f1f1f';

// ===== ตัวการ์ตูนเด็ก =====
type KidProps = {
  name: string;
  girl: boolean;
  status?: Status;
  index: number;
  seat: THREE.Vector3;
  wait: THREE.Vector3;
  away: THREE.Vector3;
};

function Kid({ name, girl, status, index, seat, wait, away }: KidProps) {
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const lLeg = useRef<THREE.Group>(null!);
  const rLeg = useRef<THREE.Group>(null!);
  const lArm = useRef<THREE.Group>(null!);
  const rArm = useRef<THREE.Group>(null!);
  const path = useRef<THREE.Vector3[]>([]);
  const delay = useRef(index * 0.15); // เดินเข้าห้องทีละคน ไม่เบียดกัน
  const placed = useRef(false);

  const target = !status ? wait : isPresent(status) ? seat : away;
  const speed = status === 'มาสาย' ? 3.4 : 2;

  useEffect(() => {
    const g = root.current;
    if (!placed.current) { g.position.copy(wait); placed.current = true; }
    path.current = buildPath(g.position, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.x, target.z]);

  useFrame((state, dt) => {
    const g = root.current;
    let moving = false;

    if (delay.current > 0) {
      delay.current -= dt;
    } else if (path.current.length) {
      const next = path.current[0];
      const dir = next.clone().sub(g.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist < 0.05) {
        g.position.copy(next);
        path.current.shift();
      } else {
        moving = true;
        dir.normalize();
        g.position.addScaledVector(dir, Math.min(dist, speed * dt));
        g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dir.x, dir.z), 0.2);
      }
    }

    const seated = !moving && path.current.length === 0 && isPresent(status);
    if (!moving) {
      // นั่ง = หันหน้าเข้ากระดาน, ยืนข้างนอก = หันหน้าเข้าหาห้อง
      g.rotation.y = lerpAngle(g.rotation.y, seated ? Math.PI : -Math.PI / 2, 0.1);
    }

    const t = state.clock.elapsedTime * speed * 4;
    const swing = moving ? Math.sin(t) * 0.7 : 0;
    const L = THREE.MathUtils.lerp;
    lLeg.current.rotation.x = L(lLeg.current.rotation.x, seated ? -Math.PI / 2 : swing, 0.3);
    rLeg.current.rotation.x = L(rLeg.current.rotation.x, seated ? -Math.PI / 2 : -swing, 0.3);
    lArm.current.rotation.x = L(lArm.current.rotation.x, -swing * 0.8, 0.3);
    rArm.current.rotation.x = L(rArm.current.rotation.x, swing * 0.8, 0.3);
    body.current.position.y = L(
      body.current.position.y,
      seated ? -0.22 : moving ? Math.abs(Math.sin(t)) * 0.05 : 0,
      0.2
    );
  });

  const color = STATUS_COLOR[status ?? 'ยังไม่เช็ค'];

  return (
    <group ref={root}>
      {/* วงสถานะที่เท้า */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.28, 0.38, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <group ref={body}>
        {/* ขา */}
        <group ref={lLeg} position={[-0.09, 0.5, 0]}>
          <mesh position-y={-0.24} castShadow>
            <boxGeometry args={[0.12, 0.48, 0.12]} />
            <meshStandardMaterial color={girl ? SKIN : NAVY} />
          </mesh>
        </group>
        <group ref={rLeg} position={[0.09, 0.5, 0]}>
          <mesh position-y={-0.24} castShadow>
            <boxGeometry args={[0.12, 0.48, 0.12]} />
            <meshStandardMaterial color={girl ? SKIN : NAVY} />
          </mesh>
        </group>

        {/* กระโปรง / กางเกง */}
        {girl ? (
          <mesh position-y={0.5} castShadow>
            <cylinderGeometry args={[0.18, 0.3, 0.24, 12]} />
            <meshStandardMaterial color={NAVY} />
          </mesh>
        ) : (
          <mesh position-y={0.53} castShadow>
            <boxGeometry args={[0.38, 0.14, 0.24]} />
            <meshStandardMaterial color={NAVY} />
          </mesh>
        )}

        {/* ลำตัว */}
        <mesh position-y={0.8} castShadow>
          <boxGeometry args={[0.38, 0.45, 0.24]} />
          <meshStandardMaterial color={SHIRT} />
        </mesh>

        {/* แขน */}
        <group ref={lArm} position={[-0.25, 0.98, 0]}>
          <mesh position-y={-0.18} castShadow>
            <boxGeometry args={[0.1, 0.38, 0.1]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
        </group>
        <group ref={rArm} position={[0.25, 0.98, 0]}>
          <mesh position-y={-0.18} castShadow>
            <boxGeometry args={[0.1, 0.38, 0.1]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
        </group>

        {/* หัว ผม ตา */}
        <mesh position-y={1.22} castShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
        <mesh position={[0, 1.25, -0.02]}>
          <sphereGeometry args={[0.215, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={HAIR} />
        </mesh>
        {girl && (
          <mesh position={[0, 1.2, -0.22]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color={HAIR} />
          </mesh>
        )}
        <mesh position={[-0.07, 1.24, 0.18]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color="#000" />
        </mesh>
        <mesh position={[0.07, 1.24, 0.18]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color="#000" />
        </mesh>
      </group>

      {/* ป้ายชื่อ */}
      <Html position={[0, 1.7, 0]} center distanceFactor={12} zIndexRange={[10, 0]}>
        <div className="kid-label" style={{ borderColor: color }}>{name}</div>
      </Html>
    </group>
  );
}

// ===== โต๊ะ + เก้าอี้ =====
function Desk({ seat }: { seat: THREE.Vector3 }) {
  return (
    <group position={[seat.x, 0, seat.z]}>
      <mesh position={[0, 0.6, -0.55]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.05, 0.5]} />
        <meshStandardMaterial color="#c08552" />
      </mesh>
      <mesh position={[0, 0.3, -0.55]}>
        <boxGeometry args={[0.08, 0.6, 0.08]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>
      <mesh position={[0, 0.125, 0]} castShadow>
        <boxGeometry args={[0.45, 0.25, 0.45]} />
        <meshStandardMaterial color="#60a5fa" />
      </mesh>
    </group>
  );
}

// ===== ห้องเรียน =====
function FloorLabel({ position, text }: { position: [number, number, number]; text: string }) {
  return (
    <Html position={position} center distanceFactor={14}>
      <div className="zone-label">{text}</div>
    </Html>
  );
}

function Room() {
  const wall = '#fde68a';
  return (
    <>
      {/* พื้น */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[16, 14]} />
        <meshStandardMaterial color="#e9d8b4" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[10.5, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 14]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[15.5, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 14]} />
        <meshStandardMaterial color="#fecaca" />
      </mesh>

      {/* ผนัง */}
      <mesh position={[0, 1.5, -7]} receiveShadow>
        <boxGeometry args={[16, 3, 0.2]} />
        <meshStandardMaterial color={wall} />
      </mesh>
      <mesh position={[-8, 1.5, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3, 14]} />
        <meshStandardMaterial color={wall} />
      </mesh>
      {/* ผนังขวา (เว้นช่องประตู z 4.2–5.8) */}
      <mesh position={[WALL_X, 1.5, -1.4]}>
        <boxGeometry args={[0.2, 3, 11.2]} />
        <meshStandardMaterial color={wall} />
      </mesh>
      <mesh position={[WALL_X, 1.5, 6.4]}>
        <boxGeometry args={[0.2, 3, 1.2]} />
        <meshStandardMaterial color={wall} />
      </mesh>
      <mesh position={[WALL_X, 2.6, DOOR_Z]}>
        <boxGeometry args={[0.2, 0.8, 1.6]} />
        <meshStandardMaterial color="#92400e" />
      </mesh>

      {/* กระดาน + โต๊ะครู */}
      <mesh position={[0, 1.6, -6.85]}>
        <boxGeometry args={[6, 1.8, 0.05]} />
        <meshStandardMaterial color="#14532d" />
      </mesh>
      <mesh position={[0, 0.4, -5.5]} castShadow>
        <boxGeometry args={[2, 0.8, 0.9]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>

      <FloorLabel position={[10.5, 0.05, 6.5]} text="รอเช็คชื่อ" />
      <FloorLabel position={[15.5, 0.05, 6.5]} text="ลา / ป่วย / ขาด" />
    </>
  );
}

// ===== Scene หลัก =====
export default function Classroom3D({
  students,
  records,
}: {
  students: Student[];
  records: Record<string, Status>;
}) {
  const spots = useMemo(
    () => students.map((_, i) => ({ seat: seatPos(i), wait: waitPos(i), away: awayPos(i) })),
    [students.length]
  );

  return (
    <Canvas shadows camera={{ position: [5, 15, 17], fov: 45 }}>
      <color attach="background" args={['#e0f2fe']} />
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[10, 16, 8]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <Room />
      {spots.map((s, i) => <Desk key={i} seat={s.seat} />)}
      {students.map((st, i) =>
        spots[i] ? (
          <Kid
            key={st.id}
            name={st.first_name}
            girl={isGirl(st.prefix)}
            status={records[st.id]}
            index={i}
            seat={spots[i].seat}
            wait={spots[i].wait}
            away={spots[i].away}
          />
        ) : null
      )}
      <OrbitControls enableRotate={false} enablePan={false} enableZoom={false} />
    </Canvas>
  );
}