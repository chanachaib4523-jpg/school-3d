export const STATUSES = ['มาเรียน', 'มาสาย', 'ลา', 'ป่วย', 'ขาดเรียน'] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_COLOR: Record<string, string> = {
  'มาเรียน': '#22c55e',
  'มาสาย': '#f59e0b',
  'ลา': '#3b82f6',
  'ป่วย': '#a855f7',
  'ขาดเรียน': '#ef4444',
  'ยังไม่เช็ค': '#9ca3af',
};

export type Student = {
  id: string;
  student_code: string | null;
  prefix: string | null;
  first_name: string;
  last_name: string;
  class_name: string;
};

export const isPresent = (s?: Status) => s === 'มาเรียน' || s === 'มาสาย';

export const isGirl = (prefix?: string | null) =>
  !!prefix && /ด\.ญ|เด็กหญิง|นางสาว|น\.ส/.test(prefix);

export const fullName = (s: Student) =>
  `${s.prefix ?? ''}${s.first_name} ${s.last_name}`.trim();

/** วันที่วันนี้ตามเวลาไทย รูปแบบ YYYY-MM-DD */
export function todayTH() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}