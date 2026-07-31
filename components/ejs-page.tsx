import Script from 'next/script';
import { renderRoute } from '@/lib/next-render';

export default async function EjsPage({ pathname, user }: { pathname: string; user?: Record<string, string> }) {
  const page = await renderRoute(pathname, user);
  return <>
    {page.styles ? <style dangerouslySetInnerHTML={{ __html: page.styles }} /> : null}
    <div dangerouslySetInnerHTML={{ __html: page.body }} />
    {page.scripts.map((script, index) => script.src
      ? <Script key={`${script.src}-${index}`} src={script.src} strategy="afterInteractive" />
      : <Script key={`inline-${index}`} id={`page-script-${index}`} strategy="afterInteractive">{script.content}</Script>)}
  </>;
}
