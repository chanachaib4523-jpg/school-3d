'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSchoolAttendance } from '@/hooks/useSchoolAttendance';
import {
  ROOM_COLORS, SCHOOL_NAME, STATUSES, STATUS_COLOR, compareClass, isPresent, thaiDateFull, todayTH,
} from '@/lib/constants';

const School3D = dynamic(() => import('@/components/School3D'), {
  ssr: false,
  loading: () => <div className="center">กำลังสร้างโรงเรียน 3 มิติ...</div>,
});

export default function HomePage() {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState(todayTH());
  const [zoom, setZoom] = useState(1);
  const [now, setNow] = useState<Date | null>(null);
  const { students, groups, records, loading } = useSchoolAttendance(date);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => [...groups].sort((a, b) => compareClass(a.name, b.name)), [groups]);
  const open = (c: string) => router.push(`/classroom?c=${encodeURIComponent(c)}`);

  const counts = useMemo(() => {
    const c: Record<string, number> = { 'ยังไม่เช็ค': 0 };
    STATUSES.forEach((s) => { c[s] = 0; });
    students.forEach((s) => { c[records[s.id] ?? 'ยังไม่เช็ค']++; });
    return c;
  }, [students, records]);

  const present = counts['มาเรียน'] + counts['มาสาย'];
  const absent = counts['ลา'] + counts['ป่วย'] + counts['ขาดเรียน'];
  const pct = students.length ? Math.round((present * 100) / students.length) : 0;

  const perClass = sorted.map((g, i) => {
    const total = g.students.length;
    const p = g.students.filter((s) => isPresent(records[s.id])).length;
    const wait = g.students.filter((s) => !records[s.id]).length;
    return {
      name: g.name, total, p, wait, absent: total - p - wait,
      pct: total ? Math.round((p * 100) / total) : 0,
      color: ROOM_COLORS[i % ROOM_COLORS.length],
    };
  });

  const time = now
    ? now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })
    : '--:--';
  const zoomBy = (k: number) => setZoom((z) => Math.min(3, Math.max(0.5, +(z * k).toFixed(2))));
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen();
  };

  return (
    <div className="school-dash" ref={stageRef}>
      <div className="scene">
        {loading && !students.length
          ? <div className="center">กำลังโหลดข้อมูล...</div>
          : <School3D groups={sorted} records={records} onOpenClass={open} zoom={zoom} />}
      </div>

      {/* ===== การ์ดซ้าย ===== */}
      <div className="ov-left">
        <div className="glass">
          <div className="brand-row">
            <img src="/logo.png" alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <div>
              <b>{SCHOOL_NAME}</b>
              <span className="live-dot">● อัปเดตแบบ Realtime</span>
            </div>
          </div>
          <div className="clock">{time}<small>น.</small></div>
          <p className="muted sm">{thaiDateFull(new Date(date + 'T12:00:00'))}</p>
          <div className="mini-bars">
            {perClass.map((r) => (
              <div key={r.name} title={`${r.name} ${r.pct}%`}
                style={{ height: `${Math.max(6, r.pct)}%`, background: r.color }} />
            ))}
          </div>
        </div>

        <div className="glass">
          <h4>สรุปวันนี้</h4>
          <div className="kpis">
            <div className="kpi"><span>นักเรียนทั้งหมด</span><b>{students.length}</b></div>
            <div className="kpi green"><span>มาเรียน</span><b>{present}</b></div>
            <div className="kpi red"><span>ไม่มาเรียน</span><b>{absent}</b></div>
            <div className="kpi gray"><span>รอเช็คชื่อ</span><b>{counts['ยังไม่เช็ค']}</b></div>
          </div>
          <div className="donut-row">
            <div className="donut" style={{ background: `conic-gradient(#22c55e ${pct * 3.6}deg, #e2e8f0 0)` }}>
              <span>{pct}%</span>
            </div>
            <ul className="status-list">
              {[...STATUSES, 'ยังไม่เช็ค'].map((s) => (
                <li key={s}>
                  <span className="dot" style={{ background: STATUS_COLOR[s] }} />{s}<b>{counts[s]}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ===== การ์ดขวา ===== */}
      <div className="ov-right">
        <div className="glass toolbar">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button onClick={() => zoomBy(1 / 1.2)} title="ซูมออก">−</button>
          <button onClick={() => zoomBy(1.2)} title="ซูมเข้า">+</button>
          <button onClick={() => setZoom(1)}>พอดีจอ</button>
          <button onClick={fullscreen}>เต็มจอ</button>
        </div>

        <div className="glass room-list">
          <h4>รายห้องเรียน</h4>
          {perClass.map((r) => (
            <button key={r.name} className="room-row" onClick={() => open(r.name)}>
              <div className="room-row-top">
                <i style={{ background: r.color }} /><b>{r.name}</b><span>{r.p}/{r.total}</span>
              </div>
              <div className="mini-progress"><div style={{ width: `${r.pct}%`, background: r.color }} /></div>
              <small>{r.pct}% · ไม่มา {r.absent} · รอ {r.wait}</small>
            </button>
          ))}
        </div>
      </div>

      {/* ===== คำอธิบายสีด้านล่าง ===== */}
      <div className="glass ov-bottom">
        {[...STATUSES, 'ยังไม่เช็ค'].map((s) => (
          <span key={s}><i className="dot" style={{ background: STATUS_COLOR[s] }} />{s}</span>
        ))}
        <span className="hint-text">คลิกที่ห้องเพื่อเข้าไปดู</span>
      </div>
    </div>
  );
}