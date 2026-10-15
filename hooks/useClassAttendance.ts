'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Status, Student } from '@/lib/constants';

export function useClassAttendance(className: string, date: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, Status>>({});

  useEffect(() => {
    if (!className) return;
    let alive = true;

    (async () => {
      const { data: st, error } = await supabase
        .from('students').select('*')
        .eq('class_name', className)
        .order('student_code');
      if (error || !alive) return;

      const list = (st ?? []) as Student[];
      const map: Record<string, Status> = {};

      if (list.length) {
        const { data: att } = await supabase
          .from('attendance').select('student_id,status')
          .eq('date', date)
          .in('student_id', list.map((s) => s.id));
        (att ?? []).forEach((r: any) => { map[r.student_id] = r.status; });
      }
      if (!alive) return;
      setStudents(list);
      setRecords(map);
    })();

    const channel = supabase
      .channel(`att:${className}:${date}`)
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
  }, [className, date]);

  const setLocal = useCallback(
    (id: string, s: Status) => setRecords((r) => ({ ...r, [id]: s })), []
  );

  return { students, records, setLocal };
}