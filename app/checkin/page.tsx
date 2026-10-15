'use client';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import { useClasses } from '@/hooks/useClasses';
import { useClassAttendance } from '@/hooks/useClassAttendance';
import { STATUSES, STATUS_COLOR, fullName, todayTH, type Status } from '@/lib/constants';

export default function CheckinPage() {
  const classes = useClasses();
  const [cls, setCls] = useState('');
  const [date, setDate] = useState(todayTH());
  useEffect(() => { if (!cls && classes.length) setCls(classes[0]); }, [classes, cls]);

  const { students, records, setLocal } = useClassAttendance(cls, date);

  async function mark(studentId: string, status: Status) {
    setLocal(studentId, status);
    const { error } = await supabase
      .from('attendance')
      .upsert({ student_id: studentId, date, status }, { onConflict: 'student_id,date' });
    if (error) alert('บันทึกไม่สำเร็จ: ' + error.message);
  }

  async function markAllPresent() {
    const rows = students
      .filter((s) => !records[s.id])
      .map((s) => ({ student_id: s.id, date, status: 'มาเรียน' as Status }));
    if (!rows.length) return;
    rows.forEach((r) => setLocal(r.student_id, r.status));
    const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,date' });
    if (error) alert('บันทึกไม่สำเร็จ: ' + error.message);
  }

  const checked = students.filter((s) => records[s.id]).length;

  return (
    <>
      <PageHeader title="เช็คชื่อ" subtitle="กดสถานะของนักเรียน ตัวการ์ตูนในหน้าแรกจะเดินตามทันที" />
      <div className="page narrow">
        <div className="card">
          <div className="row">
            <select value={cls} onChange={(e) => setCls(e.target.value)}>
              {classes.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="row between">
            <span>เช็คแล้ว {checked}/{students.length}</span>
            <button className="btn green" onClick={markAllPresent}>ที่เหลือ &quot;มาเรียน&quot; ทั้งหมด</button>
          </div>
        </div>

        {students.map((s, i) => (
          <div className="stu" key={s.id}>
            <span>{i + 1}. {fullName(s)}</span>
            <div className="btns">
              {STATUSES.map((st) => {
                const on = records[s.id] === st;
                return (
                  <button
                    key={st}
                    style={on ? { background: STATUS_COLOR[st], borderColor: STATUS_COLOR[st], color: '#fff' } : {}}
                    onClick={() => mark(s.id, st)}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}