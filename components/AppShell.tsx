'use client';
import type { ReactNode } from 'react';
import AuthGate from './AuthGate';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="shell">
        <Sidebar />
        <main className="main">{children}</main>
      </div>
    </AuthGate>
  );
}