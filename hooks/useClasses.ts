'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useClasses() {
  const [classes, setClasses] = useState<string[]>([]);
  useEffect(() => {
    supabase.from('students').select('class_name').then(({ data }) => {
      const unique = Array.from(new Set((data ?? []).map((r: any) => r.class_name as string)));
      unique.sort((a, b) => a.localeCompare(b, 'th', { numeric: true }));
      setClasses(unique);
    });
  }, []);
  return classes;
}