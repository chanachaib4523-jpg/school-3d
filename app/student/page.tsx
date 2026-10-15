'use client';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import { useClasses } from '@/hooks/useClasses';
import { useStudents } from '@/hooks/useStudents';
import {
  STATUSES, STATUS_COLOR, bmi, fullName, isPresent, monthLabelTH, monthRange, thisMonthTH, type Status,
} from '@/lib/constants';

type Row = { date: string; status: string };
type Growth = { month: string; weight: number | null; height: number | null };
type Data = { att: Row[]; milk: Row[]; lunch: Row[]; growth: Growth[] };

const shortDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

export default function StudentPage() {
  const classes = useClasses();
  const [cls, setCls] = useState('');
  useEffect(() => { if (!cls && classes.length) setCls(classes[0]); }, [classes, cls]);

  const { students } = useStudents(cls);
  const [sid, setSid] = useState('');
  useEffect(() => { setSid(students[0]?.id ?? ''); }, [students]);

  const [month, setMonth] = useState(thisMonthTH());
  const [data, setData] = useState<Data | null>(null);
  const stu = students.find((s) => s.id === sid);

  useEffect(() => {
    if (!sid) { setData(null); return; }
    let alive = true;
    const { start, end } = monthRange(month);
    const daily = (t: string) =>
      supabase.from(t).select('date,status').eq('student_id', sid).gte('date', start).lte('date', end).order('date');
    Promise.all([
      daily('attendance'), daily('milk'), daily('lunch'),
      supabase.from('growth').select('month,weight,height').eq('student_id', sid).order('month'),
    ]).then(([a, m, l, g]) => {
      if (!alive) return;
      setData({
        att: (a.data ?? []) as Row[],
        milk: (m.data ?? []) as Row[],
        lunch: (l.data ?? []) as Row[],
        growth: (g.data ?? []) as Growth[],
      });
    });
    return () => { alive = false; };
  }, [sid, month]);

  const att = useMemo(() => {
    const c: Record<string, number> = {};
    STATUSES.forEach((s) => { c[s] = 0; });
    data?.att.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [data]);

  const recorded = data?.att.length ?? 0;
  const presentDays = att['มาเรียน'] + att['มาสาย'];
  const milkYes = data?.milk.filter((r) => r.status === 'ดื่มแล้ว').length ?? 0;
  const lunchYes = data?.lunch.filter((r) => r.status === 'รับประทานแล้ว').length ?? 0;
  const missed = data?.att.filter((r) => !isPresent(r.status as Status)) ?? [];

  return (
    <>
      <PageHeader title="ดูนักเรียนรายบุคคล" subtitle="สรุปข้อมูลของนักเรียนแต่ละคน" />
      <div className="page">
        <div className="card row">
          <label className="field">ชั้นเรียน
            <select value={cls} onChange={(e) => setCls(e.target.value)}>
              {classes.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">นักเรียน
            <select value={sid} onChange={(e) => setSid(e.target.value)}>
              {students.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {fullName(s)}</option>)}
            </select>
          </label>
          <label className="field">เดือน
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
        </div>

        {stu && data && (
          <>
            <div className="card profile">
              <h2>{fullName(stu)}</h2>
              <p className="muted">เลขประจำตัว {stu.student_code ?? '-'} · ชั้น {stu.class_name} · เดือน {monthLabelTH(month)}</p>
            </div>

            <div className="stats-grid">
              <div className="stat" style={{ borderColor: '#6d28d9' }}>
                มาเรียน<b>{presentDays}/{recorded}</b><small>{recorded ? Math.round((presentDays * 100) / recorded) : 0}%</small>
              </div>
              {STATUSES.map((s) => (
                <div key={s} className="stat" style={{ borderColor: STATUS_COLOR[s] }}>{s}<b>{att[s]}</b></div>
              ))}
              <div className="stat" style={{ borderColor: '#0ea5e9' }}>ดื่มนม<b>{milkYes}/{data.milk.length}</b></div>
              <div className="stat" style={{ borderColor: '#f97316' }}>อาหารกลางวัน<b>{lunchYes}/{data.lunch.length}</b></div>
            </div>

            <div className="two-col">
              <div className="card">
                <h3 className="card-title">วันที่ไม่ได้มาเรียน</h3>
                {missed.length === 0 ? <p className="muted">มาเรียนครบทุกวัน</p> : (
                  <ul className="names">
                    {missed.map((r) => (
                      <li key={r.date}>
                        <span className="dot" style={{ background: STATUS_COLOR[r.status] }} />
                        {shortDate(r.date)} — {r.status}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="card">
                <h3 className="card-title">น้ำหนัก / ส่วนสูง</h3>
                {data.growth.length === 0 ? <p className="muted">ยังไม่มีข้อมูล</p> : (
                  <table className="tbl">
                    <thead><tr><th>เดือน</th><th>น้ำหนัก (กก.)</th><th>ส่วนสูง (ซม.)</th><th>BMI</th></tr></thead>
                    <tbody>
                      {data.growth.map((g) => (
                        <tr key={g.month}>
                          <td>{monthLabelTH(g.month)}</td><td>{g.weight ?? '-'}</td>
                          <td>{g.height ?? '-'}</td><td>{bmi(g.weight, g.height) ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}