import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New Tools Radar',
  description: 'Next.js + VisActor dashboard for emerging data tools'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
