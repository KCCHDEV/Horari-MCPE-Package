import { renderFavicon } from '@/lib/next-render';
export const dynamic = 'force-dynamic';
export async function GET() { return new Response(await renderFavicon(), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } }); }
