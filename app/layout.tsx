import './globals.css';
import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import Nav from '@/components/Nav';
import Providers from '@/components/Providers';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'ATS Resume Parser',
  description: 'LLM-powered ATS with structured resume parsing, job matching, and credibility scoring.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.className} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
