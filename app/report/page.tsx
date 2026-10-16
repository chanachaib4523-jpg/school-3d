'use client';
import { useEffect, useMemo, useState } from 'react';
import { Sarabun } from 'next/font/google';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import { fetchAll } from '@/lib/fetchAll';
import { useClasses } from '@/hooks/useClasses';
import { useStudents } from '@/hooks/useStudents';
import {
  DIRECTOR_NAME, SCHOOL_NAME, bmi, classFullName, classLevel, compareClass, daysInMonth, fullName,
  isGirl, isPresent, monthLabelTH, monthRange, thaiDateFull, thisMonthTH, todayTH, type Status,
} from '@/lib/constants';

const sarabun = Sarabun({ subsets: ['thai', 'latin'], weight: ['400', '700'] });
const ROWS_PER_PAGE = 16;

type FormKey = 'stats' | 'attendance' | 'milk' | 'lunch' | 'growth';
type FormCfg = { title: string; table?: string; marks?: Record<string, string>; countAs?: string[]; legend?: string };

const FORMS: Record<FormKey, FormCfg> = {
  stats: { title: 'สถิติการมาเรียนของนักเรียน' },
  attendance: {
    title: 'แบบบันทึกเวลาเรียน', table: 'attendance',
    marks: { 'มาเรียน': '✓', 'มาสาย': 'ส', 'ลา': 'ล', 'ป่วย': 'ป', 'ขาดเรียน': 'ข' },
    countAs: ['มาเรียน', 'มาสาย'],
    legend: '✓ = มาเรียน   ส = มาสาย   ล = ลา   ป = ป่วย   ข = ขาดเรียน',
  },
  milk: {
    title: 'แบบบันทึกการดื่มนม', table: 'milk',
    marks: { 'ดื่มแล้ว': '✓', 'ไม่ดื่ม': 'x', 'ขาดเรียน': 'ข' },
    countAs: ['ดื่มแล้ว'],
    legend: '✓ = ดื่มนม   x = ไม่ดื่ม   ข = ขาดเรียน / ลา / ป่วย ตามข้อมูลจริง',
  },
  lunch: {
    title: 'แบบบันทึกการรับประทานอาหารกลางวัน', table: 'lunch',
    marks: { 'รับประทานแล้ว': '✓', 'ไม่รับประทาน': 'x', 'ขาดเรียน': 'ข' },
    countAs: ['รับประทานแล้ว'],
    legend: '✓ = รับประทาน   x = ไม่รับประทาน   ข = ขาดเรียน / ลา / ป่วย ตามข้อมูลจริง',
  },
  growth: { title: 'แบบบันทึกน้ำหนักและส่วนสูง' },
};

type Grid = Record<string, Record<number, string>>;
type GrowthMap = Record<string, { weight: number | null; height: number | null }>;
type Cnt = { tb: number; tg: number; pb: number; pg: number; ab: number; ag: number };
type StatRow = { label: string; c: Cnt; kind: 'class' | 'sub' | 'total' };

const zero = (): Cnt => ({ tb: 0, tg: 0, pb: 0, pg: 0, ab: 0, ag: 0 });
function addCnt(a: Cnt, b: Cnt) {
  (Object.keys(a) as (keyof Cnt)[]).forEach((k) => { a[k] += b[k]; });
}
const pctText = (c: Cnt) => {
  const t = c.tb + c.tg;
  return t ? (((c.pb + c.pg) * 100) / t).toFixed(2) : '0.00';
};
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out.length ? out : [[]];
}
const blanks = (n: number) => Array.from({ length: Math.max(0, ROWS_PER_PAGE - n) });

async function loadGrid(table: string, ids: string[], start: string, end: string): Promise<Grid> {
  const rows = await fetchAll<any>((f, t) =>
    supabase.from(table).select('student_id,date,status')
      .in('student_id', ids).gte('date', start).lte('date', end).range(f, t));
  const g: Grid = {};
  rows.forEach((r) => {
    if (!g[r.student_id]) g[r.student_id] = {};
    g[r.student_id][Number(r.date.slice(8, 10))] = r.status;
  });
  return g;
}

const DOTS = '.............................................';

function Signatures({ leftName, leftTitle }: { leftName: string; leftTitle: string }) {
  return (
    <div className="sig-row">
      <div>ลงชื่อ {DOTS}<br />( {leftName || DOTS} )<br />{leftTitle}</div>
      <div>ลงชื่อ {DOTS}<br />( {DIRECTOR_NAME || DOTS} )<br />ผู้อำนวยการ{SCHOOL_NAME}</div>
    </div>
  );
}

export default function ReportPage() {
  const classes = useClasses();
  const [form, setForm] = useState<FormKey>('milk');
  const [cls, setCls] = useState('');
  const [month, setMonth] = useState(thisMonthTH());
  const [date, setDate] = useState(todayTH());
  useEffect(() => { if (!cls && classes.length) setCls(classes[0]); }, [classes, cls]);

  const isStats = form === 'stats';
  const cfg = FORMS[form];
  const { students } = useStudents(isStats ? 'ALL' : cls);

  // ชื่อครู (จำไว้ในเครื่อง แยกตามห้อง)
  const tKey = `teacher:${isStats ? 'stats' : cls}`;
  const [teacher, setTeacher] = useState('');
  useEffect(() => { setTeacher(localStorage.getItem(tKey) ?? ''); }, [tKey]);
  const changeTeacher = (v: string) => { setTeacher(v); localStorage.setItem(tKey, v); };

  const [grid, setGrid] = useState<Grid>({});
  const [attGrid, setAttGrid] = useState<Grid>({});
  const [growth, setGrowth] = useState<GrowthMap>({});
  const [dayAtt, setDayAtt] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(false);

  const days = daysInMonth(month);
  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => i + 1), [days]);
  const [y, m] = month.split('-').map(Number);
  const isWeekend = (d: number) => { const w = new Date(y, m - 1, d).getDay(); return w === 0 || w === 6; };

  useEffect(() => {
    if (!students.length) { setGrid({}); setAttGrid({}); setGrowth({}); setDayAtt({}); return; }
    let alive = true;
    setLoading(true);

    (async () => {
      if (isStats) {
        const rows = await fetchAll<any>((f, t) =>
          supabase.from('attendance').select('student_id,status').eq('date', date).range(f, t));
        const map: Record<string, Status> = {};
        rows.forEach((r) => { map[r.student_id] = r.status; });
        if (alive) setDayAtt(map);
      } else {
        const ids = students.map((s) => s.id);
        const { start, end } = monthRange(month);
        const g = cfg.table ? await loadGrid(cfg.table, ids, start, end) : {};
        // ใช้ข้อมูลเช็คชื่อเติม "ข" ให้วันที่ขาด/ลา/ป่วย
        const a = cfg.table && cfg.table !== 'attendance' ? await loadGrid('attendance', ids, start, end) : {};
        const { data: gr } = await supabase.from('growth').select('student_id,weight,height')
          .eq('month', month).in('student_id', ids);
        const gm: GrowthMap = {};
        (gr ?? []).forEach((r: any) => { gm[r.student_id] = { weight: r.weight, height: r.height }; });
        if (!alive) return;
        setGrid(g); setAttGrid(a); setGrowth(gm);
      }
      if (alive) setLoading(false);
    })().catch((e) => { alert('โหลดข้อมูลไม่สำเร็จ: ' + e.message); setLoading(false); });

    return () => { alive = false; };
  }, [isStats, cfg.table, month, date, students]);

  // ===== แถวรายเดือน =====
  const rows = useMemo(() => students.map((s) => {
    const g = grid[s.id] ?? {};
    const a = attGrid[s.id] ?? {};
    return {
      s,
      marks: dayList.map((d) => {
        if (g[d]) return cfg.marks?.[g[d]] ?? '';
        return a[d] && !isPresent(a[d] as Status) ? 'ข' : '';
      }),
      total: dayList.filter((d) => !!g[d] && !!cfg.countAs?.includes(g[d])).length,
      weight: growth[s.id]?.weight ?? null,
      height: growth[s.id]?.height ?? null,
    };
  }), [students, grid, attGrid, growth, dayList, cfg]);
  const pages = useMemo(() => chunk(rows, ROWS_PER_PAGE), [rows]);

  // ===== สถิติการมาเรียนรายวัน =====
  const statRows = useMemo<StatRow[]>(() => {
    if (!isStats) return [];
    const byClass = new Map<string, Cnt>();
    students.forEach((s) => {
      const c = byClass.get(s.class_name) ?? zero();
      const girl = isGirl(s.prefix || s.first_name);
      const st = dayAtt[s.id];
      if (girl) c.tg++; else c.tb++;
      if (st && isPresent(st)) { if (girl) c.pg++; else c.pb++; }
      else if (st) { if (girl) c.ag++; else c.ab++; }
      byClass.set(s.class_name, c);
    });
    const names = Array.from(byClass.keys()).sort(compareClass);
    const out: StatRow[] = [];
    const total = zero();
    Array.from(new Set(names.map(classLevel))).forEach((lv) => {
      const sub = zero();
      names.filter((n) => classLevel(n) === lv).forEach((n) => {
        const c = byClass.get(n)!;
        out.push({ label: classFullName(n), c, kind: 'class' });
        addCnt(sub, c);
      });
      out.push({ label: lv === 'อื่นๆ' ? 'รวมอื่นๆ' : `รวมระดับ${lv}`, c: sub, kind: 'sub' });
      addCnt(total, sub);
    });
    out.push({ label: 'รวมทั้งหมด', c: total, kind: 'total' });
    return out;
  }, [isStats, students, dayAtt]);

  function exportCsv() {
    let table: (string | number)[][];
    if (isStats) {
      table = [
        ['ชั้นเรียน', 'นักเรียน ชาย', 'นักเรียน หญิง', 'นักเรียน รวม', 'มาเรียน ชาย', 'มาเรียน หญิง', 'มาเรียน รวม',
          'ไม่มาเรียน ชาย', 'ไม่มาเรียน หญิง', 'ไม่มาเรียน รวม', 'ร้อยละ'],
        ...statRows.map(({ label, c }) => [label, c.tb, c.tg, c.tb + c.tg, c.pb, c.pg, c.pb + c.pg,
          c.ab, c.ag, c.ab + c.ag, pctText(c)]),
      ];
    } else if (form === 'growth') {
      table = [
        ['ที่', 'ชื่อ', 'น้ำหนัก (กก.)', 'ส่วนสูง (ซม.)', 'BMI'],
        ...rows.map((r, i) => [i + 1, fullName(r.s), r.weight ?? '', r.height ?? '', bmi(r.weight, r.height) ?? '']),
      ];
    } else {
      table = [
        ['ที่', 'ชื่อ', ...dayList.map(String), 'รวม (วัน)', 'น้ำหนัก (กก.)', 'ส่วนสูง (ซม.)'],
        ...rows.map((r, i) => [i + 1, fullName(r.s), ...r.marks, r.total, r.weight ?? '', r.height ?? '']),
      ];
    }
    const csv = '\uFEFF' + table
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cfg.title}_${isStats ? date : `${cls}_${month}`}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const head = (
    <>
      <h2>{cfg.title}</h2>
      <p className="sub">นักเรียนชั้น{classFullName(cls)}&nbsp;&nbsp;&nbsp;เดือน {monthLabelTH(month)}</p>
      <p className="school">{SCHOOL_NAME}</p>
    </>
  );
  const classTeacher = `ครูประจำชั้น${classFullName(cls)}`;

  return (
    <>
      <PageHeader title="พิมพ์รายงาน" subtitle="เลือกแบบฟอร์ม แล้วกดพิมพ์ได้ทันที (A4 แนวนอน)" />
      <div className="page">
        <div className="card no-print">
          <div className="row between">
            <div className="row">
              <label className="field">แบบฟอร์มรายงาน
                <select value={form} onChange={(e) => setForm(e.target.value as FormKey)}>
                  {(Object.keys(FORMS) as FormKey[]).map((k) => <option key={k} value={k}>{FORMS[k].title}</option>)}
                </select>
              </label>
              {isStats ? (
                <label className="field">วันที่
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
              ) : (
                <>
                  <label className="field">ชั้นเรียน
                    <select value={cls} onChange={(e) => setCls(e.target.value)}>
                      {classes.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="field">เดือน
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                  </label>
                </>
              )}
              <label className="field">{isStats ? 'ครูผู้รับผิดชอบ' : 'ชื่อครูประจำชั้น'}
                <input placeholder="ชื่อ - นามสกุล" value={teacher} onChange={(e) => changeTeacher(e.target.value)} />
              </label>
            </div>
            <div className="row">
              <button className="btn green" onClick={() => window.print()}>พิมพ์รายงาน</button>
              <button className="btn light" onClick={exportCsv}>Export CSV</button>
            </div>
          </div>
        </div>

        <div className={`sheets ${sarabun.className}`}>
          {loading ? (
            <div className="sheet"><p className="center">กำลังโหลด...</p></div>
          ) : isStats ? (
            <div className="sheet">
              <h2>สถิติการมาเรียนของนักเรียน</h2>
              <p className="sub">{thaiDateFull(new Date(date + 'T12:00:00'))}</p>
              <p className="school">{SCHOOL_NAME}</p>
              <table className="form-tbl">
                <thead>
                  <tr>
                    <th rowSpan={2}>ชั้นเรียน</th>
                    <th colSpan={3}>นักเรียน</th>
                    <th colSpan={3}>มาเรียน</th>
                    <th colSpan={3}>ไม่มาเรียน</th>
                    <th rowSpan={2}>มาเรียน<br />คิดเป็นร้อยละ</th>
                  </tr>
                  <tr>
                    {['ชาย', 'หญิง', 'รวม', 'ชาย', 'หญิง', 'รวม', 'ชาย', 'หญิง', 'รวม'].map((h, i) => <th key={i}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {statRows.map((r, i) => (
                    <tr key={i} className={r.kind === 'class' ? '' : r.kind}>
                      <td className="left">{r.label}</td>
                      <td>{r.c.tb}</td><td>{r.c.tg}</td><td>{r.c.tb + r.c.tg}</td>
                      <td>{r.c.pb}</td><td>{r.c.pg}</td><td>{r.c.pb + r.c.pg}</td>
                      <td>{r.c.ab}</td><td>{r.c.ag}</td><td>{r.c.ab + r.c.ag}</td>
                      <td>{pctText(r.c)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Signatures leftName={teacher} leftTitle="ครูผู้รับผิดชอบ" />
            </div>
          ) : form === 'growth' ? (
            pages.map((pg, pi) => (
              <div className="sheet" key={pi}>
                {head}
                <table className="form-tbl">
                  <thead>
                    <tr><th>ที่</th><th>ชื่อ</th><th>น้ำหนัก (กก.)</th><th>ส่วนสูง (ซม.)</th><th>BMI</th><th>หมายเหตุ</th></tr>
                  </thead>
                  <tbody>
                    {pg.map((r, i) => (
                      <tr key={r.s.id}>
                        <td>{pi * ROWS_PER_PAGE + i + 1}</td>
                        <td className="name">{fullName(r.s)}</td>
                        <td>{r.weight ?? ''}</td><td>{r.height ?? ''}</td>
                        <td>{bmi(r.weight, r.height) ?? ''}</td><td style={{ minWidth: 160 }}></td>
                      </tr>
                    ))}
                    {blanks(pg.length).map((_, i) => (
                      <tr key={'b' + i}>
                        <td>{pi * ROWS_PER_PAGE + pg.length + i + 1}</td>
                        <td className="name"></td><td></td><td></td><td></td><td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Signatures leftName={teacher} leftTitle={classTeacher} />
              </div>
            ))
          ) : (
            pages.map((pg, pi) => (
              <div className="sheet" key={pi}>
                {head}
                <table className="form-tbl">
                  <thead>
                    <tr>
                      <th rowSpan={2}>ที่</th>
                      <th rowSpan={2}>ชื่อ</th>
                      <th colSpan={days}>เดือน {monthLabelTH(month)}</th>
                      <th rowSpan={2}>รวม<br />(วัน)</th>
                      <th rowSpan={2}>น้ำหนัก<br />(กก.)</th>
                      <th rowSpan={2}>ส่วนสูง<br />(ซม.)</th>
                    </tr>
                    <tr>{dayList.map((d) => <th key={d} className={isWeekend(d) ? 'we' : ''}>{d}</th>)}</tr>
                  </thead>
                  <tbody>
                    {pg.map((r, i) => (
                      <tr key={r.s.id}>
                        <td>{pi * ROWS_PER_PAGE + i + 1}</td>
                        <td className="name">{fullName(r.s)}</td>
                        {r.marks.map((mk, j) => <td key={j} className={isWeekend(j + 1) ? 'we' : ''}>{mk}</td>)}
                        <td><b>{r.total}</b></td>
                        <td>{r.weight ?? ''}</td>
                        <td>{r.height ?? ''}</td>
                      </tr>
                    ))}
                    {blanks(pg.length).map((_, i) => (
                      <tr key={'b' + i}>
                        <td>{pi * ROWS_PER_PAGE + pg.length + i + 1}</td>
                        <td className="name"></td>
                        {dayList.map((d) => <td key={d} className={isWeekend(d) ? 'we' : ''}></td>)}
                        <td></td><td></td><td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cfg.legend && <p className="form-legend">หมายเหตุ: {cfg.legend}</p>}
                <Signatures leftName={teacher} leftTitle={classTeacher} />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}