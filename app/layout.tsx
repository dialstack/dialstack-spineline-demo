"use client";

import { Inter as FontSans } from "next/font/google";
import { cn } from "@/lib/utils";
import "./global.css";
import NextAuthProvider from "./auth";
import DebugMenu from "@/app/components/debug/DebugMenu";
import { SettingsProvider } from "@/app/contexts/settings";
import { EmbeddedComponentBorderProvider } from "@/app/hooks/EmbeddedComponentBorderProvider";
import QueryProvider from "@/app/providers/QueryProvider";

const fontSans = FontSans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Spineline</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-offset font-sans antialiased",
          fontSans.variable,
        )}
      >
        <NextAuthProvider>
          <QueryProvider>
            <SettingsProvider>
              <EmbeddedComponentBorderProvider>
                {children}
              </EmbeddedComponentBorderProvider>
              <DebugMenu />
            </SettingsProvider>
          </QueryProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
