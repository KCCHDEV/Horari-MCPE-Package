import Script from 'next/script';
import type { Metadata } from 'next';
import './next.css';

const siteUrl = process.env.APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Horari Service Online', template: '%s | Horari Service Online' },
  description: 'Minecraft Server, Web Hosting และ Code Hosting พร้อมทีมดูแลหลังการขาย',
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    siteName: 'Horari Service Online',
    images: [{ url: '/images/horari-minecraft-hero.png', width: 1672, height: 941, alt: 'Horari Service Online — Minecraft server hosting' }]
  },
  twitter: { card: 'summary_large_image', images: ['/images/horari-minecraft-hero.png'] }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>
    <link rel="stylesheet" href="/css/styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" />
    <Script src="https://code.iconify.design/3/3.1.0/iconify.min.js" strategy="afterInteractive" />
    <Script src="/js/app.js" strategy="afterInteractive" />
    {children}
  </body></html>;
}
