import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Inter, Roboto, Roboto_Mono } from "next/font/google";
import "../globals.css";

import { cn } from "@/lib/utils";

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

import { AuthProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ActiveThemeProvider } from "@/components/active-theme";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

const interFont = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const robotoFont = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

const robotoMonoFont = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  title: "FinSight | Personal Finance",
  description: "Monitora e analizza le tue finanze personali in modo semplice e intelligente.",
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get("active_theme")?.value;
  const isScaled = activeThemeValue?.endsWith("-scaled");
  
  const sidebarCookie = cookieStore.get("sidebar:state");
  const defaultOpen = sidebarCookie ? sidebarCookie.value === "true" : false;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          interFont.variable,
          robotoFont.variable,
          robotoMonoFont.variable,
          interFont.className,
          "bg-background overscroll-none font-sans antialiased",
          activeThemeValue ? `theme-${activeThemeValue}` : "",
          isScaled ? "theme-scaled" : ""
        )}
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
              enableColorScheme
            >
              <ActiveThemeProvider initialTheme={activeThemeValue}>
                <SidebarProvider
                  defaultOpen={defaultOpen}
                  style={
                    {
                      "--sidebar-width": "calc(var(--spacing) * 72)",
                      "--header-height": "calc(var(--spacing) * 12)",
                    } as React.CSSProperties
                  }
                >
                  <AppSidebar variant="inset" />

                  <SidebarInset className="mx-0 my-0 border-0 rounded-none md:my-2 md:mx-2 md:rounded-xl md:border shadow-none md:shadow-sm">
                    <SiteHeader />

                    <main className="flex-1 px-1 py-4 md:p-6">
                      {children}
                    </main>

                  </SidebarInset>
                </SidebarProvider>
              </ActiveThemeProvider>
            </ThemeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}