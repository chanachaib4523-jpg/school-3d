'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useSchoolAttendance } from '@/hooks/useSchoolAttendance';
import { STATUSES, STATUS_COLOR, isPresent, thaiDateFull, todayTH } from '@/lib/constants';

const School3D = dynamic(() => import('@/components/School3D'), {
  ssr: false,
  loading: () => <div className="center">กำลังสร้างโรงเรียน 3 มิติ...</div>,
});

export default function HomePage() {
  const router = useRouter();
  const [date, setDate] = useState(todayTH());
  const { students, groups, records, loading } = useSchoolAttendance(date);
  const open = (c: string) => router.push(`/classroom?c=${encodeURIComponent(c)}`);

  const counts = useMemo(() => {
    const c: Record<string, number> = { 'ยังไม่เช็ค': 0 };
    STATUSES.forEach((s) => { c[s] = 0; });
    students.forEach((s) => { c[records[s.id] ?? 'ยังไม่เช็ค']++; });
    return c;
  }, [students, records]);

  const present = counts['มาเรียน'] + counts['มาสาย'];
  const pct = students.length ? Math.round((present * 100) / students.length) : 0;

  const perClass = groups.map((g) => {
    const total = g.students.length;
    const p = g.students.filter((s) => isPresent(records[s.id])).length;
    const wait = g.students.filter((s) => !records[s.id]).length;
    return { name: g.name, total, p, absent: total - p - wait, wait, pct: total ? Math.round((p * 100) / total) : 0 };
  });

  return (
    <div className="dash">
      <section className="stage">
        {loading && !students.length
          ? <div className="center">กำลังโหลดข้อมูล...</div>
          : <School3D groups={groups} records={records} onOpenClass={open} />}
        <div className="legend">
          {[...STATUSES, 'ยังไม่เช็ค'].map((s) => (
            <span key={s}><i className="dot" style={{ background: STATUS_COLOR[s] }} />{s}</span>
          ))}
        </div>
        <div className="hint">คลิกที่ห้องเพื่อเข้าไปดู · ลากเพื่อหมุน · เลื่อนลูกกลิ้งเพื่อซูม</div>
      </section>

      <aside className="panel">
        <h1>ภาพรวมโรงเรียน</h1>
        <p className="muted">{thaiDateFull(new Date(date + 'T12:00:00'))}</p>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="big">{present}/{students.length} <small>คน ({pct}%)</small></div>
        <div className="bar"><div style={{ width: `${pct}%` }} /></div>

        <ul className="stats">
          {[...STATUSES, 'ยังไม่เช็ค'].map((s) => (
            <li key={s}>
              <span className="dot" style={{ background: STATUS_COLOR[s] }} />
              {s}<b>{counts[s]}</b>
            </li>
          ))}
        </ul>

        <h3>รายห้อง</h3>
        <table className="tbl">
          <thead><tr><th>ห้อง</th><th>มา</th><th>ไม่มา</th><th>รอ</th><th>%</th></tr></thead>
          <tbody>
            {perClass.map((r) => (
              <tr key={r.name} className="clickable" onClick={() => open(r.name)}>
                <td><b>{r.name}</b></td><td>{r.p}</td><td>{r.absent}</td><td>{r.wait}</td><td>{r.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="live">● อัปเดตแบบ Realtime</p>
      </aside>
    </div>
  );
}