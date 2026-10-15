'use client';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import { useClasses } from '@/hooks/useClasses';
import { useStudents } from '@/hooks/useStudents';
import {
  LUNCH_STATUSES, MILK_STATUSES, STATUS_COLOR, fullName, isPresent, todayTH, type Status,
} from '@/lib/constants';

const KINDS = {
  milk: { table: 'milk', label: 'ดื่มนม', statuses: MILK_STATUSES as readonly string[] },
  lunch: { table: 'lunch', label: 'อาหารกลางวัน', statuses: LUNCH_STATUSES as readonly string[] },
};
type Kind = keyof typeof KINDS;

export default function MilkPage() {
  const classes = useClasses();
  const [kind, setKind] = useState<Kind>('milk');
  const [cls, setCls] = useState('');
  const [date, setDate] = useState(todayTH());
  useEffect(() => { if (!cls && classes.length) setCls(classes[0]); }, [classes, cls]);

  const { students } = useStudents(cls);
  const [records, setRecords] = useState<Record<string, string>>({});
  const cfg = KINDS[kind];

  useEffect(() => {
    if (!students.length) { setRecords({}); return; }
    let alive = true;
    supabase.from(cfg.table).select('student_id,status').eq('date', date)
      .in('student_id', students.map((s) => s.id))
      .then(({ data }) => {
        if (!alive) return;
        const m: Record<string, string> = {};
        (data ?? []).forEach((r: any) => { m[r.student_id] = r.status; });
        setRecords(m);
      });
    return () => { alive = false; };
  }, [cfg.table, date, students]);

  async function save(rows: { student_id: string; status: string }[]) {
    if (!rows.length) return;
    setRecords((r) => {
      const n = { ...r };
      rows.forEach((x) => { n[x.student_id] = x.status; });
      return n;
    });
    const { error } = await supabase
      .from(cfg.table)
      .upsert(rows.map((r) => ({ ...r, date })), { onConflict: 'student_id,date' });
    if (error) alert('บันทึกไม่สำเร็จ: ' + error.message);
  }

  // คนที่ยังไม่บันทึก: ถ้าเช็คชื่อว่า ลา/ป่วย/ขาด → "ขาดเรียน" นอกนั้น → ดื่ม/รับประทานแล้ว
  async function fillRest() {
    const rest = students.filter((s) => !records[s.id]);
    if (!rest.length) return;
    const { data } = await supabase.from('attendance').select('student_id,status')
      .eq('date', date).in('student_id', rest.map((s) => s.id));
    const att: Record<string, Status> = {};
    (data ?? []).forEach((r: any) => { att[r.student_id] = r.status; });
    save(rest.map((s) => ({
      student_id: s.id,
      status: att[s.id] && !isPresent(att[s.id]) ? 'ขาดเรียน' : cfg.statuses[0],
    })));
  }

  const done = students.filter((s) => records[s.id] === cfg.statuses[0]).length;

  return (
    <>
      <PageHeader title="บันทึกดื่มนม / อาหารกลางวัน" subtitle="เลือกประเภท ชั้นเรียน และวันที่" />
      <div className="page narrow">
        <div className="card">
          <div className="tabs">
            {(Object.keys(KINDS) as Kind[]).map((k) => (
              <button key={k} className={k === kind ? 'active' : ''} onClick={() => setKind(k)}>
                {KINDS[k].label}
              </button>
            ))}
          </div>
          <div className="row">
            <select value={cls} onChange={(e) => setCls(e.target.value)}>
              {classes.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="row between">
            <span>{cfg.statuses[0]} {done}/{students.length} คน</span>
            <button className="btn green" onClick={fillRest}>บันทึกที่เหลือทั้งหมด (ดึงคนขาดจากเช็คชื่อ)</button>
          </div>
        </div>

        {students.map((s, i) => (
          <div className="stu" key={s.id}>
            <span>{i + 1}. {fullName(s)}</span>
            <div className="btns">
              {cfg.statuses.map((st) => {
                const on = records[s.id] === st;
                return (
                  <button
                    key={st}
                    style={on ? { background: STATUS_COLOR[st], borderColor: STATUS_COLOR[st], color: '#fff' } : {}}
                    onClick={() => save([{ student_id: s.id, status: st }])}
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