import './globals.css';
import './pages.css';
import { Prompt } from 'next/font/google';
import AppShell from '@/components/AppShell';

const font = Prompt({ subsets: ['thai', 'latin'], weight: ['400', '500', '600'] });

export const metadata = { title: 'ระบบสารสนเทศโรงเรียน' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={font.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}