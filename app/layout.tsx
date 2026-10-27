'use client';

import localFont from 'next/font/local';
import { cn } from '@/lib/utils';
import './global.css';
import NextAuthProvider from './auth';
import DebugMenu from '@/app/components/debug/DebugMenu';
import { SettingsProvider } from '@/app/contexts/settings';
import { EmbeddedComponentBorderProvider } from '@/app/hooks/EmbeddedComponentBorderProvider';
import QueryProvider from '@/app/providers/QueryProvider';

// Self-hosted rather than next/font/google, so the build never downloads fonts.
// See fonts/README.md.
const fontSans = localFont({
  src: './fonts/InterVariable.woff2',
  weight: '100 900',
  variable: '--font-sans',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Spineline</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={cn('min-h-screen bg-offset font-sans antialiased', fontSans.variable)}>
        <NextAuthProvider>
          <QueryProvider>
            <SettingsProvider>
              <EmbeddedComponentBorderProvider>{children}</EmbeddedComponentBorderProvider>
              <DebugMenu />
            </SettingsProvider>
          </QueryProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
