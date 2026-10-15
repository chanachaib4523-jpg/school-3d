import type { ReactNode } from 'react';
import { thaiDateFull } from '@/lib/constants';

export default function PageHeader({
  title, subtitle, right,
}: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="page-head no-print">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="muted">{right ?? thaiDateFull()}</div>
    </header>
  );
}