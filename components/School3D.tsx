'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { STATUS_COLOR, isGirl, isPresent, type Status, type Student } from '@/lib/constants';

export type ClassGroup = { name: string; students: Student[] };

// ===== ขนาด (พิกัดภายในห้อง) =====
// ห้อง x -5..5, z -4..4 | ประตูผนังหน้า (z=4) ตรง x=3.5
// หน้าห้อง: ซ้าย = รอเช็คชื่อ, ขวา = ลา/ป่วย/ขาด
const ROOM_W = 10;
const ROOM_D = 8;
const GAP = 3;
const ROW_Z = 11;
const FRONT = ROOM_D / 2;
const DOOR_X = 3.5;
const DOOR_IN = new THREE.Vector3(DOOR_X, 0, FRONT - 0.8);
const DOOR_OUT = new THREE.Vector3(DOOR_X, 0, FRONT + 0.8);
const COLS = 7;
const MAX_PER_ROOM = 42;

const seatPos = (i: number) =>
  new THREE.Vector3(-4.2 + (i % COLS) * 1.25, 0, -2.3 + Math.floor(i / COLS) * 1.1);
const waitPos = (i: number) =>
  new THREE.Vector3(-4.5 + (i % 7) * 0.62, 0, FRONT + 1.1 + Math.floor(i / 7) * 0.62);
const awayPos = (i: number) =>
  new THREE.Vector3(0.6 + (i % 7) * 0.62, 0, FRONT + 1.1 + Math.floor(i / 7) * 0.62);

function buildPath(from: THREE.Vector3, to: THREE.Vector3) {
  const fromIn = from.z < FRONT;
  const toIn = to.z < FRONT;
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

// ===== รูปทรง/สี ใช้ร่วมกันทุกตัว (ช่วยให้เครื่องไม่หน่วง) =====
const geo = {
  ring: new THREE.RingGeometry(0.2, 0.28, 20),
  leg: new THREE.BoxGeometry(0.12, 0.48, 0.12),
  pants: new THREE.BoxGeometry(0.38, 0.14, 0.24),
  skirt: new THREE.CylinderGeometry(0.18, 0.3, 0.24, 10),
  torso: new THREE.BoxGeometry(0.38, 0.45, 0.24),
  head: new THREE.SphereGeometry(0.2, 12, 12),
  hair: new THREE.SphereGeometry(0.215, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  desk: new THREE.BoxGeometry(0.9, 0.05, 0.45),
  deskLeg: new THREE.BoxGeometry(0.08, 0.6, 0.08),
  chair: new THREE.BoxGeometry(0.42, 0.25, 0.42),
};
const mat = {
  skin: new THREE.MeshStandardMaterial({ color: '#f1c27d' }),
  shirt: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
  navy: new THREE.MeshStandardMaterial({ color: '#1e3a8a' }),
  hair: new THREE.MeshStandardMaterial({ color: '#1f1f1f' }),
  desk: new THREE.MeshStandardMaterial({ color: '#c08552' }),
  deskLeg: new THREE.MeshStandardMaterial({ color: '#6b4423' }),
  chair: new THREE.MeshStandardMaterial({ color: '#60a5fa' }),
  wall: new THREE.MeshStandardMaterial({ color: '#fde68a' }),
};
const ringMat: Record<string, THREE.MeshBasicMaterial> = Object.fromEntries(
  Object.entries(STATUS_COLOR).map(([k, c]) => [k, new THREE.MeshBasicMaterial({ color: c })])
);

// ===== ตัวการ์ตูนเด็ก =====
type KidProps = {
  girl: boolean;
  status?: Status;
  index: number;
  seat: THREE.Vector3;
  wait: THREE.Vector3;
  away: THREE.Vector3;
};

function MiniKid({ girl, status, index, seat, wait, away }: KidProps) {
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const lLeg = useRef<THREE.Group>(null!);
  const rLeg = useRef<THREE.Group>(null!);
  const path = useRef<THREE.Vector3[]>([]);
  const delay = useRef(index * 0.12);
  const placed = useRef(false);

  const target = !status ? wait : isPresent(status) ? seat : away;
  const speed = status === 'มาสาย' ? 3.4 : 2;

  useEffect(() => {
    const g = root.current;
    if (!placed.current) {
      g.position.copy(wait);
      g.rotation.y = Math.PI;
      placed.current = true;
    }
    path.current = buildPath(g.position, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const g = root.current;
    let moving = false;

    if (delay.current > 0) {
      delay.current -= dt;
    } else if (path.current.length) {
      const next = path.current[0];
      const dx = next.x - g.position.x;
      const dz = next.z - g.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.05) {
        g.position.set(next.x, 0, next.z);
        path.current.shift();
      } else {
        moving = true;
        const step = Math.min(dist, speed * dt);
        g.position.x += (dx / dist) * step;
        g.position.z += (dz / dist) * step;
        g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dx, dz), 0.2);
      }
    }

    const seated = !moving && path.current.length === 0 && isPresent(status);
    if (!moving) g.rotation.y = lerpAngle(g.rotation.y, Math.PI, 0.1);

    const t = state.clock.elapsedTime * speed * 4 + index;
    const swing = moving ? Math.sin(t) * 0.7 : 0;
    const L = THREE.MathUtils.lerp;
    lLeg.current.rotation.x = L(lLeg.current.rotation.x, seated ? -Math.PI / 2 : swing, 0.3);
    rLeg.current.rotation.x = L(rLeg.current.rotation.x, seated ? -Math.PI / 2 : -swing, 0.3);
    body.current.position.y = L(
      body.current.position.y,
      seated ? -0.22 : moving ? Math.abs(Math.sin(t)) * 0.05 : 0,
      0.2
    );
  });

  const legMat = girl ? mat.skin : mat.navy;
  return (
    <group ref={root}>
      <mesh geometry={geo.ring} material={ringMat[status ?? 'ยังไม่เช็ค']} rotation-x={-Math.PI / 2} position-y={0.05} />
      <group ref={body}>
        <group ref={lLeg} position={[-0.09, 0.5, 0]}>
          <mesh geometry={geo.leg} material={legMat} position-y={-0.24} />
        </group>
        <group ref={rLeg} position={[0.09, 0.5, 0]}>
          <mesh geometry={geo.leg} material={legMat} position-y={-0.24} />
        </group>
        {girl
          ? <mesh geometry={geo.skirt} material={mat.navy} position-y={0.5} />
          : <mesh geometry={geo.pants} material={mat.navy} position-y={0.53} />}
        <mesh geometry={geo.torso} material={mat.shirt} position-y={0.8} />
        <mesh geometry={geo.head} material={mat.skin} position-y={1.22} />
        <mesh geometry={geo.hair} material={mat.hair} position={[0, 1.25, -0.02]} />
      </group>
    </group>
  );
}

// ===== ห้องเรียน 1 ห้อง =====
type RoomProps = {
  group: ClassGroup;
  records: Record<string, Status>;
  position: [number, number, number];
  rotation: number;
  onOpen: (name: string) => void;
};

function Room({ group, records, position, rotation, onOpen }: RoomProps) {
  const kids = group.students.slice(0, MAX_PER_ROOM);
  const spots = useMemo(
    () => kids.map((_, i) => ({ seat: seatPos(i), wait: waitPos(i), away: awayPos(i) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kids.length]
  );
  const present = kids.filter((s) => isPresent(records[s.id])).length;
  const unchecked = kids.filter((s) => !records[s.id]).length;
  const wallH = 1.1;

  return (
    <group position={position} rotation-y={rotation}>
      {/* พื้นห้อง (คลิกเพื่อเข้าห้อง) */}
      <mesh
        rotation-x={-Math.PI / 2}
        position-y={0.02}
        onClick={(e: any) => { e.stopPropagation(); onOpen(group.name); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
      >
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#e9d8b4" />
      </mesh>

      {/* โซนหน้าห้อง */}
      <mesh rotation-x={-Math.PI / 2} position={[-2.6, 0.03, FRONT + 2.6]}>
        <planeGeometry args={[4.6, 3.8]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[2.6, 0.03, FRONT + 2.6]}>
        <planeGeometry args={[4.6, 3.8]} />
        <meshStandardMaterial color="#fecaca" />
      </mesh>

      {/* ผนัง */}
      <mesh position={[0, wallH / 2, -FRONT]} material={mat.wall}>
        <boxGeometry args={[ROOM_W, wallH, 0.15]} />
      </mesh>
      <mesh position={[-ROOM_W / 2, wallH / 2, 0]} material={mat.wall}>
        <boxGeometry args={[0.15, wallH, ROOM_D]} />
      </mesh>
      <mesh position={[ROOM_W / 2, wallH / 2, 0]} material={mat.wall}>
        <boxGeometry args={[0.15, wallH, ROOM_D]} />
      </mesh>
      {/* ผนังหน้า (เตี้ย) เว้นช่องประตู */}
      <mesh position={[-1.1, 0.3, FRONT]} material={mat.wall}>
        <boxGeometry args={[7.8, 0.6, 0.15]} />
      </mesh>
      <mesh position={[4.6, 0.3, FRONT]} material={mat.wall}>
        <boxGeometry args={[0.8, 0.6, 0.15]} />
      </mesh>

      {/* กระดาน */}
      <mesh position={[0, 0.75, -FRONT + 0.1]}>
        <boxGeometry args={[3.5, 0.6, 0.04]} />
        <meshStandardMaterial color="#14532d" />
      </mesh>

      {/* โต๊ะ + เก้าอี้ */}
      {spots.map((p, i) => (
        <group key={i} position={[p.seat.x, 0, p.seat.z]}>
          <mesh geometry={geo.desk} material={mat.desk} position={[0, 0.6, -0.5]} />
          <mesh geometry={geo.deskLeg} material={mat.deskLeg} position={[0, 0.3, -0.5]} />
          <mesh geometry={geo.chair} material={mat.chair} position-y={0.125} />
        </group>
      ))}

      {/* เด็ก */}
      {kids.map((st, i) =>
        spots[i] ? (
          <MiniKid
            key={st.id}
            girl={isGirl(st.prefix || st.first_name)}
            status={records[st.id]}
            index={i}
            seat={spots[i].seat}
            wait={spots[i].wait}
            away={spots[i].away}
          />
        ) : null
      )}

      {/* ป้ายห้อง */}
      <Html position={[0, 2.4, -FRONT]} center distanceFactor={45} zIndexRange={[10, 0]}>
        <div className="room-label" onClick={() => onOpen(group.name)}>
          <b>{group.name}</b>
          <span>มา {present}/{kids.length}</span>
          {unchecked > 0 && <small>รอเช็ค {unchecked}</small>}
        </div>
      </Html>
    </group>
  );
}

// ===== เสาธง =====
function FlagPole() {
  const stripes: [string, number, number][] = [
    ['#ef4444', 5.8, 0.2], ['#ffffff', 5.6, 0.2], ['#1e3a8a', 5.3, 0.4],
    ['#ffffff', 5.0, 0.2], ['#ef4444', 4.8, 0.2],
  ];
  return (
    <group>
      <mesh position-y={0.15}>
        <boxGeometry args={[1.6, 0.3, 1.6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position-y={3}>
        <cylinderGeometry args={[0.06, 0.06, 6, 8]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      {stripes.map(([c, y, h], i) => (
        <mesh key={i} position={[0.95, y, 0]}>
          <boxGeometry args={[1.8, h, 0.03]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}

function FitCamera({ span }: { span: number }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const d = Math.max(30, span * 0.9);
    camera.position.set(0, d * 0.9, d);
    camera.lookAt(0, 0, 0);
  }, [span, camera]);
  return null;
}

// ===== ฉากโรงเรียน =====
export default function School3D({
  groups, records, onOpenClass,
}: {
  groups: ClassGroup[];
  records: Record<string, Status>;
  onOpenClass: (name: string) => void;
}) {
  const perRow = Math.max(1, Math.ceil(groups.length / 2));
  const step = ROOM_W + GAP;
  const span = perRow * step;

  return (
    <Canvas camera={{ position: [0, 40, 45], fov: 45 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#bae6fd']} />
      <hemisphereLight args={['#ffffff', '#86efac', 1.1]} />
      <directionalLight position={[20, 40, 20]} intensity={1.4} />
      <FitCamera span={span} />

      {/* สนามหญ้า + ลานกลาง */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <planeGeometry args={[span + 60, 120]} />
        <meshStandardMaterial color="#86efac" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005}>
        <planeGeometry args={[span, 2 * ROW_Z - ROOM_D]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <FlagPole />

      {groups.map((g, i) => {
        const row = i < perRow ? 0 : 1;
        const col = row === 0 ? i : i - perRow;
        const x = (col - (perRow - 1) / 2) * step;
        return (
          <Room
            key={g.name}
            group={g}
            records={records}
            position={[x, 0, row === 0 ? -ROW_Z : ROW_Z]}
            rotation={row === 0 ? 0 : Math.PI}
            onOpen={onOpenClass}
          />
        );
      })}

      <OrbitControls target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.3} minDistance={8} maxDistance={span + 80} />
    </Canvas>
  );
}