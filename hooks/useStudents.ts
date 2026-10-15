'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAll } from '@/lib/fetchAll';
import type { Student } from '@/lib/constants';

/** className: '' = ยังไม่เลือก, 'ALL' = ทุกห้อง */
export function useStudents(className: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!className) { setStudents([]); return; }
    setLoading(true);
    try {
      const rows = await fetchAll<Student>((f, t) => {
        let q = supabase.from('students').select('*');
        if (className !== 'ALL') q = q.eq('class_name', className);
        return q.order('class_name').order('student_code').range(f, t);
      });
      setStudents(rows);
    } catch (e: any) {
      alert('โหลดรายชื่อไม่สำเร็จ: ' + e.message);
    }
    setLoading(false);
  }, [className]);

  useEffect(() => { reload(); }, [reload]);
  return { students, loading, reload };
}