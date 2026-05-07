import './globals.css';
import type { Metadata } from 'next';
import DataIcon from '@/components/data-icon.5c082963.svg';

export const metadata: Metadata = {
  title: 'New Tools Radar',
  description: 'Dashboard for emerging data tools',
  icons: {
    icon: DataIcon.src
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
