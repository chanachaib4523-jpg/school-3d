'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const LINKS = [
  { href: '/', label: 'หน้าแรก' },
  { href: '/students', label: 'ฐานข้อมูลนักเรียน' },
  { href: '/student', label: 'ดูนักเรียนรายบุคคล' },
  { href: '/checkin', label: 'เช็คชื่อ' },
  { href: '/milk', label: 'บันทึกดื่มนม' },
  { href: '/growth', label: 'บันทึกน้ำหนัก/ส่วนสูง' },
  { href: '/report', label: 'พิมพ์รายงาน' },
];

const CSS = `
.topnav {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; gap: 16px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #ede9fe;
  box-shadow: 0 2px 12px rgba(76, 29, 149, 0.06);
}
.topnav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
.topnav-brand img { width: 36px; height: 36px; border-radius: 10px; object-fit: contain; }
.topnav-title { display: flex; flex-direction: column; line-height: 1.15; }
.topnav-title b { font-size: 15px; color: #2e1065; }
.topnav-title small { font-size: 11px; color: #7c3aed; }
.topnav-links {
  display: flex; align-items: center; gap: 6px;
  flex: 1; overflow-x: auto; scrollbar-width: none;
}
.topnav-links::-webkit-scrollbar { display: none; }
.topnav-link {
  padding: 7px 14px; border-radius: 999px; white-space: nowrap;
  font-size: 14px; text-decoration: none;
  color: #6d28d9; background: transparent;
  transition: background 0.15s;
}
.topnav-link:hover { background: #f5f3ff; }
.topnav-link.active { background: #ede9fe; color: #4c1d95; font-weight: 600; }
.topnav-out {
  flex-shrink: 0; padding: 7px 14px; border-radius: 999px;
  border: 1px solid #ddd6fe; background: #fff; color: #6d28d9;
  font: inherit; font-size: 14px; cursor: pointer;
}
.topnav-out:hover { background: #f5f3ff; }
@media (max-width: 720px) {
  .topnav { gap: 10px; padding: 8px 12px; }
  .topnav-title small { display: none; }
}
`;

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <style>{CSS}</style>
      <header className="topnav">
        <Link href="/" className="topnav-brand">
          <img src="/logo.png" alt="โลโก้โรงเรียน" />
          <span className="topnav-title">
            <b>ระบบสารสนเทศโรงเรียน</b>
            <small>School Information System</small>
          </span>
        </Link>

        <nav className="topnav-links">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={'topnav-link' + (isActive(l.href) ? ' active' : '')}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button className="topnav-out" onClick={() => supabase.auth.signOut()}>
          ออกจากระบบ
        </button>
      </header>
    </>
  );
}
