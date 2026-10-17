'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AuthGate from './AuthGate';
import Sidebar from './Sidebar';

// หน้าที่ต้องเต็มจอ (แดชบอร์ด 3D) ไม่ใส่ขอบและไม่จำกัดความกว้าง
const FULL_BLEED = ['/', '/classroom'];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const full = FULL_BLEED.includes(pathname);
  const slug = pathname.split('/')[1] || 'home';

  return (
    <AuthGate>
      <div className="shell">
        <Sidebar />
        <main className={full ? 'main main-full' : `main main-page page-${slug}`}>
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
