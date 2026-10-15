'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useClasses } from '@/hooks/useClasses';
import { useClassAttendance } from '@/hooks/useClassAttendance';
import { STATUSES, STATUS_COLOR, fullName, isPresent, todayTH } from '@/lib/constants';

const Classroom3D = dynamic(() => import('@/components/Classroom3D'), {
  ssr: false,
  loading: () => <div className="center">กำลังสร้างห้องเรียน 3 มิติ...</div>,
});

export default function ClassroomPage() {
  const classes = useClasses();
  const [cls, setCls] = useState('');
  const [date, setDate] = useState(todayTH());

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('c');
    if (c) setCls(c);
  }, []);
  useEffect(() => { if (!cls && classes.length) setCls(classes[0]); }, [classes, cls]);

  const { students, records } = useClassAttendance(cls, date);

  const counts = useMemo(() => {
    const c: Record<string, number> = { 'ยังไม่เช็ค': 0 };
    STATUSES.forEach((s) => { c[s] = 0; });
    students.forEach((s) => { c[records[s.id] ?? 'ยังไม่เช็ค']++; });
    return c;
  }, [students, records]);

  const present = counts['มาเรียน'] + counts['มาสาย'];
  const pct = students.length ? Math.round((present * 100) / students.length) : 0;
  const notHere = students.filter((s) => records[s.id] && !isPresent(records[s.id]));

  return (
    <div className="dash">
      <section className="stage">
        <Classroom3D students={students} records={records} />
      </section>
      <aside className="panel">
        <Link href="/" className="back">← ดูทั้งโรงเรียน</Link>
        <h1>ห้อง {cls}</h1>
        <div className="row">
          <select value={cls} onChange={(e) => setCls(e.target.value)}>
            {classes.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

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

        {notHere.length > 0 && (
          <>
            <h3>ไม่ได้มาเรียนวันนี้</h3>
            <ul className="names">
              {notHere.map((s) => (
                <li key={s.id}>
                  <span className="dot" style={{ background: STATUS_COLOR[records[s.id]] }} />
                  {fullName(s)} — {records[s.id]}
                </li>
              ))}
            </ul>
          </>
        )}
        <Link className="btn" href="/checkin">ไปหน้าเช็คชื่อ →</Link>
      </aside>
    </div>
  );
}