import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';
import './globals.css';

// Served from our own site, so the page doesn't wait on Google before drawing.
const display = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], variable: '--font-display' });
const body = Figtree({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: '9AM Crew',
  description: 'Check in, see the workouts, track your lifts.',
  appleWebApp: { capable: true, title: '9AM Crew', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#f4f3ee',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}
