'use client';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import { fetchAll } from '@/lib/fetchAll';
import { useClasses } from '@/hooks/useClasses';
import { useStudents } from '@/hooks/useStudents';
import { SCHOOL_NAME, bmi, daysInMonth, fullName, monthLabelTH, monthRange, thisMonthTH } from '@/lib/constants';

type FormKey = 'attendance' | 'milk' | 'lunch' | 'growth';
type FormCfg = { title: string; table?: string; marks?: Record<string, string>; countAs?: string[]; legend?: string };

const FORMS: Record<FormKey, FormCfg> = {
  attendance: {
    title: 'แบบบันทึกเวลาเรียน', table: 'attendance',
    marks: { 'มาเรียน': '✓', 'มาสาย': 'ส', 'ลา': 'ล', 'ป่วย': 'ป', 'ขาดเรียน': 'ข' },
    countAs: ['มาเรียน', 'มาสาย'],
    legend: '✓ = มาเรียน · ส = มาสาย · ล = ลา · ป = ป่วย · ข = ขาดเรียน',
  },
  milk: {
    title: 'แบบบันทึกการดื่มนม', table: 'milk',
    marks: { 'ดื่มแล้ว': '✓', 'ไม่ดื่ม': '-', 'ขาดเรียน': 'ข' },
    countAs: ['ดื่มแล้ว'],
    legend: '✓ = ดื่มแล้ว · - = ไม่ดื่ม · ข = ขาดเรียน',
  },
  lunch: {
    title: 'แบบบันทึกการรับประทานอาหารกลางวัน', table: 'lunch',
    marks: { 'รับประทานแล้ว': '✓', 'ไม่รับประทาน': '-', 'ขาดเรียน': 'ข' },
    countAs: ['รับประทานแล้ว'],
    legend: '✓ = รับประทานแล้ว · - = ไม่รับประทาน · ข = ขาดเรียน',
  },
  growth: { title: 'แบบบันทึกน้ำหนักและส่วนสูง' },
};

type GrowthMap = Record<string, { weight: number | null; height: number | null }>;

export default function ReportPage() {
  const classes = useClasses();
  const [form, setForm] = useState<FormKey>('lunch');
  const [cls, setCls] = useState('');
  const [month, setMonth] = useState(thisMonthTH());
  useEffect(() => { if (!cls && classes.length) setCls(classes[0]); }, [classes, cls]);

  const { students } = useStudents(cls);
  const [grid, setGrid] = useState<Record<string, Record<number, string>>>({});
  const [growth, setGrowth] = useState<GrowthMap>({});
  const [loading, setLoading] = useState(false);

  const cfg = FORMS[form];
  const days = daysInMonth(month);
  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => i + 1), [days]);
  const [y, m] = month.split('-').map(Number);
  const isWeekend = (d: number) => { const w = new Date(y, m - 1, d).getDay(); return w === 0 || w === 6; };

  useEffect(() => {
    if (!students.length) { setGrid({}); setGrowth({}); return; }
    let alive = true;
    const ids = students.map((s) => s.id);
    const { start, end } = monthRange(month);
    setLoading(true);

    (async () => {
      const g: Record<string, Record<number, string>> = {};
      if (cfg.table) {
        const rows = await fetchAll<any>((f, t) =>
          supabase.from(cfg.table!).select('student_id,date,status')
            .in('student_id', ids).gte('date', start).lte('date', end).range(f, t));
        rows.forEach((r) => {
          g[r.student_id] = g[r.student_id] || {};
          g[r.student_id][Number(r.date.slice(8, 10))] = r.status;
        });
      }
      const { data: gr } = await supabase.from('growth').select('student_id,weight,height')
        .eq('month', month).in('student_id', ids);
      const gm: GrowthMap = {};
      (gr ?? []).forEach((r: any) => { gm[r.student_id] = { weight: r.weight, height: r.height }; });
      if (!alive) return;
      setGrid(g);
      setGrowth(gm);
      setLoading(false);
    })().catch((e) => { alert('โหลดข้อมูลไม่สำเร็จ: ' + e.message); setLoading(false); });

    return () => { alive = false; };
  }, [cfg.table, month, students]);

  const rows = useMemo(() => students.map((s) => {
    const g = grid[s.id] ?? {};
    return {
      s,
      marks: dayList.map((d) => (g[d] && cfg.marks?.[g[d]]) || ''),
      total: dayList.filter((d) => g[d] && cfg.countAs?.includes(g[d])).length,
      weight: growth[s.id]?.weight ?? null,
      height: growth[s.id]?.height ?? null,
    };
  }), [students, grid, growth, dayList, cfg]);

  const dayTotals = dayList.map((d) =>
    students.filter((s) => { const st = grid[s.id]?.[d]; return !!st && !!cfg.countAs?.includes(st); }).length);

  function exportCsv() {
    const daily = form !== 'growth';
    const head = daily
      ? ['ที่', 'ชื่อ - สกุล', ...dayList.map(String), 'รวม (วัน)', 'น้ำหนัก (กก.)', 'ส่วนสูง (ซม.)']
      : ['ที่', 'ชื่อ - สกุล', 'น้ำหนัก (กก.)', 'ส่วนสูง (ซม.)', 'BMI'];
    const body = rows.map((r, i) => daily
      ? [i + 1, fullName(r.s), ...r.marks, r.total, r.weight ?? '', r.height ?? '']
      : [i + 1, fullName(r.s), r.weight ?? '', r.height ?? '', bmi(r.weight, r.height) ?? '']);
    const csv = '\uFEFF' + [head, ...body]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cfg.title}_${cls}_${month}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <PageHeader title="พิมพ์รายงาน" subtitle="สรุปข้อมูลประจำวันและภาพรวมโรงเรียน" />
      <div className="page">
        <div className="card no-print">
          <div className="row between">
            <div className="row">
              <label className="field">แบบฟอร์มรายงาน
                <select value={form} onChange={(e) => setForm(e.target.value as FormKey)}>
                  {(Object.keys(FORMS) as FormKey[]).map((k) => <option key={k} value={k}>{FORMS[k].title}</option>)}
                </select>
              </label>
              <label className="field">ชั้นเรียน
                <select value={cls} onChange={(e) => setCls(e.target.value)}>
                  {classes.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="field">เดือน
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </label>
            </div>
            <div className="row">
              <button className="btn green" onClick={() => window.print()}>พิมพ์รายงาน</button>
              <button className="btn light" onClick={exportCsv}>Export CSV</button>
            </div>
          </div>
        </div>

        <div className="report-sheet">
          <h2>{cfg.title}</h2>
          <h3>{SCHOOL_NAME} · นักเรียนชั้น {cls} · เดือน {monthLabelTH(month)}</h3>

          {loading ? <p className="center">กำลังโหลด...</p> : form === 'growth' ? (
            <table className="rpt">
              <thead><tr><th>ที่</th><th>ชื่อ - สกุล</th><th>น้ำหนัก (กก.)</th><th>ส่วนสูง (ซม.)</th><th>BMI</th><th>หมายเหตุ</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.s.id}>
                    <td>{i + 1}</td><td className="name">{fullName(r.s)}</td>
                    <td>{r.weight ?? ''}</td><td>{r.height ?? ''}</td>
                    <td>{bmi(r.weight, r.height) ?? ''}</td><td style={{ minWidth: 120 }}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="rpt">
              <thead>
                <tr>
                  <th rowSpan={2}>ที่</th>
                  <th rowSpan={2}>ชื่อ - สกุล</th>
                  <th colSpan={days}>เดือน {monthLabelTH(month)}</th>
                  <th rowSpan={2}>รวม<br />(วัน)</th>
                  <th rowSpan={2}>น้ำหนัก<br />(กก.)</th>
                  <th rowSpan={2}>ส่วนสูง<br />(ซม.)</th>
                </tr>
                <tr>{dayList.map((d) => <th key={d} className={isWeekend(d) ? 'we' : ''}>{d}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.s.id}>
                    <td>{i + 1}</td>
                    <td className="name">{fullName(r.s)}</td>
                    {r.marks.map((mk, j) => <td key={j} className={isWeekend(j + 1) ? 'we' : ''}>{mk}</td>)}
                    <td><b>{r.total}</b></td>
                    <td>{r.weight ?? ''}</td>
                    <td>{r.height ?? ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}><b>รวมรายวัน</b></td>
                  {dayTotals.map((t, j) => <td key={j} className={isWeekend(j + 1) ? 'we' : ''}>{t || ''}</td>)}
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          )}

          {cfg.legend && <p className="legend-line">{cfg.legend}</p>}
          <div className="sign">
            <div>
              ลงชื่อ ................................................ ครูประจำชั้น
              <br /><br />
              ( ................................................ )
            </div>
          </div>
        </div>
      </div>
    </>
  );
}