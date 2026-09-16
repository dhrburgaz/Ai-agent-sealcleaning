import type { Metadata } from 'next';
import './globals.css';
import { getOrCreateThemeConfig } from '@/lib/server/repo';

export const metadata: Metadata = {
  title: 'Beyza Security',
  description: 'Dordrecht Hovenier / Onderhoudbedrijf AI Operating System',
};

// This app is a live operational dashboard, not marketing content: every page
// reads session/DB state that can change between requests (theme, auth, leads,
// prices), so static prerendering is never correct here. Forcing dynamic
// rendering here also avoids `next build` trying to prerender pages against a
// database that may not exist yet at build time (see progress.md).
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getOrCreateThemeConfig();

  return (
    <html
      lang="tr"
      data-theme={theme.activeTheme}
      data-demo-mode={theme.customerDemoMode ? 'true' : 'false'}
    >
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
