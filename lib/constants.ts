// แก้เป็นชื่อโรงเรียนจริง (ใช้ในหัวรายงาน)
export const SCHOOL_NAME = 'โรงเรียนบ้านเขาตาอิ๋น';

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
// ===== ส่วนเพิ่มสำหรับหน้าแรก 3D และหน้าพิมพ์รายงาน =====

// ชื่อผู้อำนวยการ ใช้ในช่องลงชื่อท้ายรายงาน (ปล่อยว่าง '' จะเป็นจุดไข่ปลาให้เขียนเอง)
export const DIRECTOR_NAME = '';

// สีประจำห้อง (เรียงตามลำดับห้อง)
export const ROOM_COLORS = [
  '#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf',
  '#38bdf8', '#818cf8', '#c084fc', '#f472b6',
];

/** ป.1 → ประถมศึกษาปีที่ 1, อ.2 → อนุบาล 2, ม.1 → มัธยมศึกษาปีที่ 1 */
export function classFullName(c: string) {
  let m = c.match(/^ป\.?\s*(\d+)(.*)$/);
  if (m) return `ประถมศึกษาปีที่ ${m[1]}${m[2]}`;
  m = c.match(/^อ\.?\s*(\d+)(.*)$/);
  if (m) return `อนุบาล ${m[1]}${m[2]}`;
  m = c.match(/^ม\.?\s*(\d+)(.*)$/);
  if (m) return `มัธยมศึกษาปีที่ ${m[1]}${m[2]}`;
  return c;
}

export function classLevel(c: string) {
  if (/^(อ\.|อนุบาล)/.test(c)) return 'อนุบาล';
  if (/^(ป\.|ประถม)/.test(c)) return 'ประถมศึกษา';
  if (/^(ม\.|มัธยม)/.test(c)) return 'มัธยมศึกษา';
  return 'อื่นๆ';
}

const LEVEL_ORDER = ['อนุบาล', 'ประถมศึกษา', 'มัธยมศึกษา', 'อื่นๆ'];

/** เรียงห้อง: อนุบาล → ประถม → มัธยม แล้วเรียงตามชื่อ */
export const compareClass = (a: string, b: string) =>
  LEVEL_ORDER.indexOf(classLevel(a)) - LEVEL_ORDER.indexOf(classLevel(b)) || sortThai(a, b);