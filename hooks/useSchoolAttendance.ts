'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAll } from '@/lib/fetchAll';
import { sortThai, type Status, type Student } from '@/lib/constants';

export function useSchoolAttendance(date: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    (async () => {
      const st = await fetchAll<Student>((f, t) =>
        supabase.from('students').select('*').order('student_code').range(f, t));
      const att = await fetchAll<{ student_id: string; status: Status }>((f, t) =>
        supabase.from('attendance').select('student_id,status').eq('date', date).range(f, t));
      if (!alive) return;
      const map: Record<string, Status> = {};
      att.forEach((r) => { map[r.student_id] = r.status; });
      setStudents(st);
      setRecords(map);
      setLoading(false);
    })().catch((e) => { console.error(e); setLoading(false); });

    const channel = supabase
      .channel(`school:${date}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance', filter: `date=eq.${date}` },
        (p: any) => {
          if (p.eventType === 'DELETE') {
            setRecords((r) => { const n = { ...r }; delete n[p.old.student_id]; return n; });
          } else {
            setRecords((r) => ({ ...r, [p.new.student_id]: p.new.status }));
          }
        }
      )
      .subscribe();

    return () => { alive = false; supabase.removeChannel(channel); };
  }, [date]);

  const groups = useMemo(() => {
    const m = new Map<string, Student[]>();
    students.forEach((s) => {
      if (!m.has(s.class_name)) m.set(s.class_name, []);
      m.get(s.class_name)!.push(s);
    });
    return Array.from(m.keys()).sort(sortThai).map((name) => ({ name, students: m.get(name)! }));
  }, [students]);

  return { students, groups, records, loading };
}