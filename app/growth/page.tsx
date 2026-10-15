'use client';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import { useClasses } from '@/hooks/useClasses';
import { useStudents } from '@/hooks/useStudents';
import { bmi, fullName, thisMonthTH } from '@/lib/constants';

type Val = { weight: string; height: string };

export default function GrowthPage() {
  const classes = useClasses();
  const [cls, setCls] = useState('');
  const [month, setMonth] = useState(thisMonthTH());
  useEffect(() => { if (!cls && classes.length) setCls(classes[0]); }, [classes, cls]);

  const { students } = useStudents(cls);
  const [vals, setVals] = useState<Record<string, Val>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setMsg('');
    if (!students.length) { setVals({}); return; }
    let alive = true;
    supabase.from('growth').select('student_id,weight,height').eq('month', month)
      .in('student_id', students.map((s) => s.id))
      .then(({ data }) => {
        if (!alive) return;
        const m: Record<string, Val> = {};
        (data ?? []).forEach((r: any) => {
          m[r.student_id] = { weight: r.weight?.toString() ?? '', height: r.height?.toString() ?? '' };
        });
        setVals(m);
      });
    return () => { alive = false; };
  }, [month, students]);

  const setVal = (id: string, key: keyof Val, v: string) =>
    setVals((p) => ({ ...p, [id]: { weight: '', height: '', ...p[id], [key]: v } }));

  async function saveAll() {
    const rows = students
      .filter((s) => vals[s.id]?.weight || vals[s.id]?.height)
      .map((s) => ({
        student_id: s.id,
        month,
        weight: vals[s.id].weight ? Number(vals[s.id].weight) : null,
        height: vals[s.id].height ? Number(vals[s.id].height) : null,
      }));
    if (!rows.length) { setMsg('ยังไม่ได้กรอกข้อมูล'); return; }
    setBusy(true);
    const { error } = await supabase.from('growth').upsert(rows, { onConflict: 'student_id,month' });
    setBusy(false);
    setMsg(error ? 'บันทึกไม่สำเร็จ: ' + error.message : `บันทึกแล้ว ${rows.length} คน`);
  }

  return (
    <>
      <PageHeader title="บันทึกน้ำหนัก/ส่วนสูง" subtitle="กรอกเป็นรายเดือน แล้วกดบันทึกทั้งหมด" />
      <div className="page narrow">
        <div className="card row between">
          <div className="row">
            <select value={cls} onChange={(e) => setCls(e.target.value)}>
              {classes.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="row">
            {msg && <span className="muted">{msg}</span>}
            <button className="btn green" onClick={saveAll} disabled={busy}>
              {busy ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
            </button>
          </div>
        </div>

        <div className="card table-wrap">
          <table className="tbl">
            <thead><tr><th>ที่</th><th>ชื่อ - สกุล</th><th>น้ำหนัก (กก.)</th><th>ส่วนสูง (ซม.)</th><th>BMI</th></tr></thead>
            <tbody>
              {students.map((s, i) => {
                const v = vals[s.id] ?? { weight: '', height: '' };
                return (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td>{fullName(s)}</td>
                    <td><input className="num" type="number" step="0.1" inputMode="decimal" value={v.weight}
                      onChange={(e) => setVal(s.id, 'weight', e.target.value)} /></td>
                    <td><input className="num" type="number" step="0.1" inputMode="decimal" value={v.height}
                      onChange={(e) => setVal(s.id, 'height', e.target.value)} /></td>
                    <td>{bmi(Number(v.weight), Number(v.height)) ?? '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}