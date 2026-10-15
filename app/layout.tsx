import './globals.css';
import { Prompt } from 'next/font/google';

const font = Prompt({ subsets: ['thai', 'latin'], weight: ['400', '600'] });

export const metadata = { title: 'แดชบอร์ดห้องเรียน 3D' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={font.className}>{children}</body>
    </html>
  );
}