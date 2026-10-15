// แก้เป็นชื่อโรงเรียนจริง (ใช้ในหัวรายงาน)
export const SCHOOL_NAME = 'โรงเรียนของฉัน';

export const STATUSES = ['มาเรียน', 'มาสาย', 'ลา', 'ป่วย', 'ขาดเรียน'] as const;
export type Status = (typeof STATUSES)[number];

export const MILK_STATUSES = ['ดื่มแล้ว', 'ไม่ดื่ม', 'ขาดเรียน'] as const;
export const LUNCH_STATUSES = ['รับประทานแล้ว', 'ไม่รับประทาน', 'ขาดเรียน'] as const;
export const PREFIXES = ['ด.ช.', 'ด.ญ.', 'นาย', 'นางสาว'];

export const STATUS_COLOR: Record<string, string> = {
  'มาเรียน': '#22c55e',
  'มาสาย': '#f59e0b',
  'ลา': '#3b82f6',
  'ป่วย': '#a855f7',
  'ขาดเรียน': '#ef4444',
  'ยังไม่เช็ค': '#9ca3af',
  'ดื่มแล้ว': '#22c55e',
  'ไม่ดื่ม': '#f59e0b',
  'รับประทานแล้ว': '#22c55e',
  'ไม่รับประทาน': '#f59e0b',
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

export const isGirl = (text?: string | null) =>
  !!text && /ด\.ญ|เด็กหญิง|นางสาว|น\.ส/.test(text);

export const fullName = (s: Student) =>
  `${s.prefix ?? ''}${s.first_name} ${s.last_name}`.trim();

export const sortThai = (a: string, b: string) => a.localeCompare(b, 'th', { numeric: true });

/** วันที่วันนี้ตามเวลาไทย YYYY-MM-DD */
export function todayTH() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/** เดือนนี้ YYYY-MM */
export const thisMonthTH = () => todayTH().slice(0, 7);

export const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export function monthLabelTH(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS_TH[m - 1]} พ.ศ. ${y + 543}`;
}

export function daysInMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthRange(ym: string) {
  return { start: `${ym}-01`, end: `${ym}-${String(daysInMonth(ym)).padStart(2, '0')}` };
}

export function thaiDateFull(d: Date = new Date()) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'full', timeZone: 'Asia/Bangkok' }).format(d);
}

export function bmi(weight?: number | null, height?: number | null) {
  if (!weight || !height) return null;
  const m = height / 100;
  return Math.round((weight / (m * m)) * 10) / 10;
}