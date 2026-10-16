'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ROOM_COLORS, STATUS_COLOR, isGirl, isPresent, type Status, type Student } from '@/lib/constants';

export type ClassGroup = { name: string; students: Student[] };

// ===== ขนาดห้อง (หน่วยในฉาก 3D) =====
const ROOM_W = 10;
const ROOM_D = 7.5;
const HALF_D = ROOM_D / 2;
const COL_GAP = 2.5;
const STREET = 5; // ทางเดินหน้าห้อง = โซนรอเช็คชื่อ / ลา-ป่วย-ขาด
const WALL_H = 1.4;
const DOOR_X = 3.9;
const DOOR_IN = new THREE.Vector3(DOOR_X, 0, HALF_D - 0.7);
const DOOR_OUT = new THREE.Vector3(DOOR_X, 0, HALF_D + 0.7);
const MAX_PER_ROOM = 42;

// มุมกล้องแบบไอโซเมตริก (ล็อกไว้ ไม่หมุน)
const CAM_DIR = new THREE.Vector3(0.28, 0.66, 0.7).normalize();

const seatPos = (i: number) =>
  new THREE.Vector3(-4 + (i % 7) * 1.25, 0, -2.5 + Math.floor(i / 7) * 1.0);
const waitPos = (i: number) =>
  new THREE.Vector3(-4.4 + (i % 7) * 0.6, 0, HALF_D + 1.1 + Math.floor(i / 7) * 0.6);
const awayPos = (i: number) =>
  new THREE.Vector3(0.7 + (i % 7) * 0.6, 0, HALF_D + 1.1 + Math.floor(i / 7) * 0.6);

function buildPath(from: THREE.Vector3, to: THREE.Vector3) {
  const fromIn = from.z < HALF_D;
  const toIn = to.z < HALF_D;
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

// ===== รูปทรง/วัสดุ ใช้ร่วมกันทุกตัว (ช่วยให้ไม่หน่วง) =====
const geo = {
  ring: new THREE.RingGeometry(0.2, 0.28, 16),
  leg: new THREE.BoxGeometry(0.12, 0.48, 0.12),
  pants: new THREE.BoxGeometry(0.38, 0.14, 0.24),
  skirt: new THREE.CylinderGeometry(0.18, 0.3, 0.24, 8),
  torso: new THREE.BoxGeometry(0.38, 0.45, 0.24),
  head: new THREE.SphereGeometry(0.2, 10, 10),
  hair: new THREE.SphereGeometry(0.215, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  desk: new THREE.BoxGeometry(0.9, 0.6, 0.45),
  chair: new THREE.BoxGeometry(0.42, 0.25, 0.42),
};
const mat = {
  skin: new THREE.MeshStandardMaterial({ color: '#f1c27d' }),
  shirt: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
  navy: new THREE.MeshStandardMaterial({ color: '#1e3a8a' }),
  hair: new THREE.MeshStandardMaterial({ color: '#1f1f1f' }),
  desk: new THREE.MeshStandardMaterial({ color: '#d6a46c' }),
  chair: new THREE.MeshStandardMaterial({ color: '#93c5fd' }),
};
const ringMat: Record<string, THREE.MeshBasicMaterial> = Object.fromEntries(
  Object.entries(STATUS_COLOR).map(([k, c]) => [k, new THREE.MeshBasicMaterial({ color: c })])
);

// ===== ตัวการ์ตูนนักเรียน =====
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
    // นั่งแล้วหันหน้าเข้ากระดาน ยืนรอหันหน้าออกมาทางกล้อง
    if (!moving) g.rotation.y = lerpAngle(g.rotation.y, seated ? Math.PI : 0, 0.1);

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

// ===== ผนังกระจก =====
function GlassWall({ args, position, material, color }: {
  args: [number, number, number];
  position: [number, number, number];
  material: THREE.Material;
  color: string;
}) {
  return (
    <mesh position={position} material={material}>
      <boxGeometry args={args} />
      <Edges color={color} />
    </mesh>
  );
}

// ===== ห้องเรียน 1 ห้อง =====
type RoomProps = {
  group: ClassGroup;
  color: string;
  records: Record<string, Status>;
  position: [number, number, number];
  onOpen: (name: string) => void;
};

function Room({ group, color, records, position, onOpen }: RoomProps) {
  const kids = group.students.slice(0, MAX_PER_ROOM);
  const spots = useMemo(
    () => kids.map((_, i) => ({ seat: seatPos(i), wait: waitPos(i), away: awayPos(i) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kids.length]
  );
  const glass = useMemo(
    () => new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false }),
    [color]
  );
  const floor = useMemo(
    () => new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.22 }),
    [color]
  );

  const present = kids.filter((s) => isPresent(records[s.id])).length;
  const unchecked = kids.filter((s) => !records[s.id]).length;
  const pct = kids.length ? Math.round((present * 100) / kids.length) : 0;

  return (
    <group position={position}>
      {/* พื้นห้อง (คลิกเพื่อเข้าห้อง) */}
      <mesh
        rotation-x={-Math.PI / 2}
        position-y={0.02}
        material={floor}
        onClick={(e) => { e.stopPropagation(); onOpen(group.name); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
      >
        <planeGeometry args={[ROOM_W, ROOM_D]} />
      </mesh>

      {/* โซนหน้าห้อง: ซ้าย = รอเช็คชื่อ, ขวา = ลา/ป่วย/ขาด */}
      <mesh rotation-x={-Math.PI / 2} position={[-2.6, 0.015, HALF_D + STREET / 2]}>
        <planeGeometry args={[4.8, STREET - 0.6]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[2.6, 0.015, HALF_D + STREET / 2]}>
        <planeGeometry args={[4.8, STREET - 0.6]} />
        <meshStandardMaterial color="#fee2e2" />
      </mesh>

      {/* ผนังกระจก */}
      <GlassWall args={[ROOM_W, WALL_H, 0.1]} position={[0, WALL_H / 2, -HALF_D]} material={glass} color={color} />
      <GlassWall args={[0.1, WALL_H, ROOM_D]} position={[-ROOM_W / 2, WALL_H / 2, 0]} material={glass} color={color} />
      <GlassWall args={[0.1, WALL_H, ROOM_D]} position={[ROOM_W / 2, WALL_H / 2, 0]} material={glass} color={color} />
      {/* ผนังหน้า (เตี้ย) เว้นช่องประตู */}
      <GlassWall args={[8.3, 0.5, 0.1]} position={[-0.85, 0.25, HALF_D]} material={glass} color={color} />
      <GlassWall args={[0.5, 0.5, 0.1]} position={[4.75, 0.25, HALF_D]} material={glass} color={color} />

      {/* กระดาน */}
      <mesh position={[0, 0.85, -HALF_D + 0.1]}>
        <boxGeometry args={[3.6, 0.7, 0.05]} />
        <meshStandardMaterial color="#166534" />
      </mesh>

      {/* โต๊ะ + เก้าอี้ */}
      {spots.map((p, i) => (
        <group key={i} position={[p.seat.x, 0, p.seat.z]}>
          <mesh geometry={geo.desk} material={mat.desk} position={[0, 0.3, -0.45]} />
          <mesh geometry={geo.chair} material={mat.chair} position-y={0.125} />
        </group>
      ))}

      {/* นักเรียน */}
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

      {/* ป้ายชื่อห้อง */}
      <Html position={[0, WALL_H + 0.9, -HALF_D]} center zIndexRange={[20, 0]}>
        <button className="room-tag" style={{ borderColor: color }} onClick={() => onOpen(group.name)}>
          <span className="room-tag-name"><i style={{ background: color }} />{group.name}</span>
          <span className="room-tag-sub">
            มา {present}/{kids.length} · {pct}%{unchecked ? ` · รอ ${unchecked}` : ''}
          </span>
        </button>
      </Html>
    </group>
  );
}

// ===== ของตกแต่ง =====
function FlagPole({ z }: { z: number }) {
  const stripes: [string, number, number][] = [
    ['#ef4444', 4.3, 0.2], ['#ffffff', 4.1, 0.2], ['#1e3a8a', 3.8, 0.4],
    ['#ffffff', 3.5, 0.2], ['#ef4444', 3.3, 0.2],
  ];
  return (
    <group position={[0, 0, z]}>
      <mesh position-y={0.15}>
        <boxGeometry args={[1.6, 0.3, 1.6]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh position-y={2.3}>
        <cylinderGeometry args={[0.06, 0.06, 4.6, 8]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      {stripes.map(([c, y, h], i) => (
        <mesh key={i} position={[0.95, y, 0]}>
          <boxGeometry args={[1.8, h, 0.03]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      <Html position={[0, 0.4, 1.3]} center zIndexRange={[10, 0]}>
        <div className="flag-tag">ลานเสาธง</div>
      </Html>
    </group>
  );
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position-y={0.5}>
        <cylinderGeometry args={[0.12, 0.15, 1, 6]} />
        <meshStandardMaterial color="#92400e" />
      </mesh>
      <mesh position-y={1.4}>
        <sphereGeometry args={[0.7, 10, 10]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>
    </group>
  );
}

// ===== กล้องล็อกมุม + คำนวณซูมให้พอดีจอ =====
function CameraRig({ w, d, cz, zoom }: { w: number; d: number; cz: number; zoom: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    const target = new THREE.Vector3(0, 0, cz);
    camera.position.copy(target).addScaledVector(CAM_DIR, 120);
    camera.lookAt(target);
    // เว้นที่ซ้าย/ขวาให้การ์ดลอย เมื่อจอกว้าง
    const availW = size.width > 850 ? size.width - 600 : size.width - 20;
    const availH = size.height - 130;
    const projW = w * 0.93 + d * 0.38;
    const projH = d * 0.66 + 6;
    const fit = Math.max(2, Math.min(availW / projW, availH / projH));
    camera.zoom = fit * zoom;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, w, d, cz, zoom]);

  return null;
}

// ===== ฉากโรงเรียน =====
export default function School3D({
  groups, records, onOpenClass, zoom = 1,
}: {
  groups: ClassGroup[];
  records: Record<string, Status>;
  onOpenClass: (name: string) => void;
  zoom?: number;
}) {
  const n = Math.max(groups.length, 1);
  const cols = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(n * 1.6))));
  const rows = Math.ceil(n / cols);
  const pitchX = ROOM_W + COL_GAP;
  const pitchZ = ROOM_D + STREET;
  const totalW = cols * pitchX - COL_GAP;
  const rowZ = (r: number) => (r - (rows - 1) / 2) * pitchZ - STREET / 2;
  const lastCount = groups.length - cols * (rows - 1);

  const place = (i: number): [number, number, number] => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const off = r === rows - 1 ? (cols - lastCount) / 2 : 0;
    return [(c + off - (cols - 1) / 2) * pitchX, 0, rowZ(r)];
  };

  const backZ = rowZ(0) - HALF_D - 2;
  const flagZ = rowZ(rows - 1) + HALF_D + STREET + 3;
  const frontZ = flagZ + 3;
  const platW = totalW + 6;
  const platD = frontZ - backZ;
  const platCZ = (frontZ + backZ) / 2;

  return (
    <Canvas
      orthographic
      camera={{ zoom: 10, near: 0.1, far: 1000, position: [34, 79, 84] }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#ffffff', '#c4b5fd', 0.6]} />
      <directionalLight position={[20, 40, 25]} intensity={1.2} />
      <CameraRig w={platW} d={platD} cz={platCZ} zoom={zoom} />

      {/* ฐานโรงเรียน */}
      <mesh position={[0, -0.3, platCZ]}>
        <boxGeometry args={[platW, 0.6, platD]} />
        <meshStandardMaterial color="#ffffff" />
        <Edges color="#c7d2fe" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.65, platCZ]}>
        <planeGeometry args={[platW + 4, platD + 4]} />
        <meshBasicMaterial color="#6d28d9" transparent opacity={0.06} />
      </mesh>

      <FlagPole z={flagZ} />
      {Array.from({ length: rows }, (_, r) => (
        <group key={r}>
          <Tree position={[-(platW / 2 - 1.2), 0, rowZ(r)]} />
          <Tree position={[platW / 2 - 1.2, 0, rowZ(r)]} />
        </group>
      ))}

      {groups.map((g, i) => (
        <Room
          key={g.name}
          group={g}
          color={ROOM_COLORS[i % ROOM_COLORS.length]}
          records={records}
          position={place(i)}
          onOpen={onOpenClass}
        />
      ))}
    </Canvas>
  );
}