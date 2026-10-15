'use client';
import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import { useClasses } from '@/hooks/useClasses';
import { useStudents } from '@/hooks/useStudents';
import { PREFIXES, fullName, type Student } from '@/lib/constants';

const EMPTY = { student_code: '', prefix: 'ด.ช.', first_name: '', last_name: '', class_name: '' };

export default function StudentsPage() {
  const classes = useClasses();
  const [cls, setCls] = useState('ALL');
  const [q, setQ] = useState('');
  const { students, reload } = useStudents(cls);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => {
    const k = q.trim();
    return k ? students.filter((s) => (fullName(s) + (s.student_code ?? '')).includes(k)) : students;
  }, [students, q]);

  function edit(s: Student) {
    setEditId(s.id);
    setForm({
      student_code: s.student_code ?? '', prefix: s.prefix ?? '',
      first_name: s.first_name, last_name: s.last_name, class_name: s.class_name,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditId(null);
    setForm({ ...EMPTY, class_name: cls === 'ALL' ? '' : cls });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const row = {
      student_code: form.student_code.trim() || null,
      prefix: form.prefix || null,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      class_name: form.class_name.trim(),
    };
    const { error } = editId
      ? await supabase.from('students').update(row).eq('id', editId)
      : await supabase.from('students').insert(row);
    setBusy(false);
    if (error) { alert('บันทึกไม่สำเร็จ: ' + error.message); return; }
    reset();
    reload();
  }

  async function remove(s: Student) {
    if (!confirm(`ลบ ${fullName(s)} ?\nประวัติเช็คชื่อ นม อาหารกลางวัน และน้ำหนักของคนนี้จะถูกลบด้วย`)) return;
    const { error } = await supabase.from('students').delete().eq('id', s.id);
    if (error) alert('ลบไม่สำเร็จ: ' + error.message);
    else reload();
  }

  return (
    <>
      <PageHeader title="ฐานข้อมูลนักเรียน" subtitle="เพิ่ม แก้ไข และลบรายชื่อนักเรียน" />
      <div className="page">
        <form className="card" onSubmit={save}>
          <h3 className="card-title">{editId ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียนใหม่'}</h3>
          <div className="row">
            <label className="field">เลขประจำตัว
              <input value={form.student_code} onChange={(e) => setForm({ ...form, student_code: e.target.value })} />
            </label>
            <label className="field">คำนำหน้า
              <select value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })}>
                <option value="">-</option>
                {PREFIXES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="field">ชื่อ
              <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </label>
            <label className="field">นามสกุล
              <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </label>
            <label className="field">ชั้น/ห้อง
              <input required list="class-list" placeholder="เช่น ป.1/1" value={form.class_name}
                onChange={(e) => setForm({ ...form, class_name: e.target.value })} />
            </label>
            <datalist id="class-list">{classes.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="row">
            <button className="btn green" disabled={busy}>
              {busy ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'เพิ่มนักเรียน'}
            </button>
            {editId && <button type="button" className="btn ghost" onClick={reset}>ยกเลิก</button>}
          </div>
        </form>

        <div className="card">
          <div className="row between">
            <div className="row">
              <select value={cls} onChange={(e) => setCls(e.target.value)}>
                <option value="ALL">ทุกห้อง</option>
                {classes.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input placeholder="ค้นหาชื่อ / เลขประจำตัว" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <span className="muted">ทั้งหมด {shown.length} คน</span>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>ที่</th><th>เลขประจำตัว</th><th>ชื่อ - สกุล</th><th>ชั้น</th><th></th></tr></thead>
              <tbody>
                {shown.map((s, i) => (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td>{s.student_code}</td>
                    <td>{fullName(s)}</td>
                    <td>{s.class_name}</td>
                    <td className="actions">
                      <button className="btn ghost sm" onClick={() => edit(s)}>แก้ไข</button>
                      <button className="btn red sm" onClick={() => remove(s)}>ลบ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}