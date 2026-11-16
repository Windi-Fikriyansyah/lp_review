import { NextResponse } from 'next/server';
import { getChannels } from '@/lib/belibayar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const channels = await getChannels();
    return NextResponse.json({ channels });
  } catch (e) {
    console.error('[channels]', e);
    return NextResponse.json({ channels: [], error: 'Metode pembayaran belum bisa dimuat.' }, { status: 502 });
  }
}
