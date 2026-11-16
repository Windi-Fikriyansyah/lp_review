import { NextResponse } from 'next/server';
import { getStatus } from '@/lib/belibayar';
import { getTransactionByReference, updateTransactionStatus } from '@/lib/db';
import { fulfillPaidOrder } from '@/lib/fulfillment';
import { REF_PREFIX } from '@/lib/product';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!reference.startsWith(REF_PREFIX) || reference.length > 64) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    // 1. Cek database PostgreSQL terlebih dahulu
    try {
      const tx = await getTransactionByReference(reference);
      if (tx && tx.status === 'paid') {
        return NextResponse.json({ status: 'paid' });
      }
    } catch (dbErr) {
      console.warn('[status db check warn]', dbErr);
    }

    // 2. Jika belum paid di database, cek ke API Belibayar
    const c = await getStatus(reference);

    // 3. Sinkronkan status baru ke database
    if (c.status === 'paid') {
      await fulfillPaidOrder({
        reference: c.reference,
        transaction_id: String(c.transaction_id || ''),
        amount: Number(c.amount),
        payment_channel: String(c.payment_channel || ''),
      }).catch((e) => console.error('[status fulfillment error]', e));
    } else if (c.status && c.status !== 'pending') {
      await updateTransactionStatus(reference, c.status).catch((e) =>
        console.error('[status db update error]', e)
      );
    }

    // Hanya status yang dikirim ke browser
    return NextResponse.json({ status: c.status });
  } catch (e) {
    console.error('[status]', e);
    return NextResponse.json({ error: 'Gagal cek status' }, { status: 502 });
  }
}
