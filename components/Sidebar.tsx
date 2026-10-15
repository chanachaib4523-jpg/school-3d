'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const MENU = [
  { href: '/', label: 'หน้าแรก' },
  { href: '/students', label: 'ฐานข้อมูลนักเรียน' },
  { href: '/student', label: 'ดูนักเรียนรายบุคคล' },
  { href: '/checkin', label: 'เช็คชื่อ' },
  { href: '/milk', label: 'บันทึกดื่มนม' },
  { href: '/growth', label: 'บันทึกน้ำหนัก/ส่วนสูง' },
  { href: '/report', label: 'พิมพ์รายงาน' },
];

export default function Sidebar() {
  const path = usePathname();
  const active = (href: string) =>
    href === '/'
      ? path === '/' || path.startsWith('/classroom')
      : path === href || path.startsWith(href + '/');

  return (
    <nav className="sidebar no-print">
      <div className="brand">
        <img
          src="/logo.png"
          alt=""
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
        />
        <div>
          <b>ระบบสารสนเทศ<br />โรงเรียน</b>
          <small>School Information System</small>
        </div>
      </div>
      <ul className="menu">
        {MENU.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className={active(m.href) ? 'active' : ''}>{m.label}</Link>
          </li>
        ))}
      </ul>
      <button className="logout" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
    </nav>
  );
}