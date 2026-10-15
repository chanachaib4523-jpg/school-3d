'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { supabase } from '@/lib/supabase';
import { useClasses } from '@/hooks/useClasses';
import { useClassAttendance } from '@/hooks/useClassAttendance';
import { STATUSES, STATUS_COLOR, fullName, todayTH } from '@/lib/constants';

export default function Page() {
  return <AuthGate><CheckIn /></AuthGate>;
}

function CheckIn() {
  const classes = useClasses();
  const [cls, setCls] = useState('');
  const [date, setDate] = useState(todayTH());
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!cls && classes.length) setCls(classes[0]); }, [classes, cls]);

  const { students, records, setLocal } = useClassAttendance(cls, date);
  const checked = students.filter((s) => records[s.id]).length;

  async function mark(studentId: string, status: string) {
    setMsg('');
    setLocal(studentId, status as any);
    const { error } = await supabase
      .from('attendance')
      .upsert({ student_id: studentId, date, status }, { onConflict: 'student_id,date' });
    if (error) {
      console.error('save attendance failed:', error.message);
      setMsg('บันทึกไม่สำเร็จ: ' + error.message);
    }
  }

  async function markAllPresent() {
    setMsg('');
    const todo = students.filter((s) => !records[s.id]);
    if (!todo.length) return;
    todo.forEach((s) => setLocal(s.id, 'มาเรียน' as any));
    const { error } = await supabase
      .from('attendance')
      .upsert(
        todo.map((s) => ({ student_id: s.id, date, status: 'มาเรียน' })),
        { onConflict: 'student_id,date' }
      );
    if (error) {
      console.error('save attendance failed:', error.message);
      setMsg('บันทึกไม่สำเร็จ: ' + error.message);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h1 style={{ margin: 0 }}>เช็คชื่อ</h1>
        <Link href="/" style={{ color: '#2563eb' }}>← กลับแดชบอร์ด</Link>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <select value={cls} onChange={(e) => setCls(e.target.value)}>
          {classes.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn" onClick={markAllPresent}>มาครบทุกคน</button>
      </div>

      <p>เช็คแล้ว {checked}/{students.length} คน</p>
      {msg && <p style={{ color: '#dc2626' }}>{msg}</p>}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {students.map((s) => (
          <li
            key={s.id}
            style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}
          >
            <div style={{ marginBottom: 6 }}>
              <b>{s.student_code}</b> {fullName(s)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STATUSES.map((st) => {
                const on = records[s.id] === st;
                return (
                  <button
                    key={st}
                    onClick={() => mark(s.id, st)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: `2px solid ${STATUS_COLOR[st]}`,
                      background: on ? STATUS_COLOR[st] : 'transparent',
                      color: on ? '#fff' : 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
