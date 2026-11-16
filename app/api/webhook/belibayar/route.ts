import crypto from 'node:crypto';
import { after } from 'next/server';
import { hmacHex } from '@/lib/belibayar';
import { updateTransactionStatus } from '@/lib/db';
import { fulfillPaidOrder } from '@/lib/fulfillment';
import { PRICE, REF_PREFIX } from '@/lib/product';

export const runtime = 'nodejs';

const ok = () => new Response(null, { status: 200 });

export async function POST(req: Request) {
  const secret = process.env.BELIBAYAR_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook secret belum diisi', { status: 500 });

  // Raw body, persis seperti yang diterima. Jangan di-parse sebelum verifikasi.
  const raw = await req.text();
  const sig = req.headers.get('x-belibayar-signature') ?? '';
  const expected = Buffer.from(hmacHex(raw, secret));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) {
    return Response.json({ success: false, messages: 'Invalid signature' }, { status: 401 });
  }

  let p: Record<string, any>;
  try {
    p = JSON.parse(raw);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  // Penarikan (withdrawal) tidak dipakai di sini.
  if (typeof p.event === 'string' && p.event.startsWith('withdrawal.')) return ok();
  // Payload pembayaran tidak punya field "event". Selain itu, abaikan.
  if (Object.hasOwn(p, 'event')) {
    console.warn('[webhook] event tidak dikenal', p.event);
    return ok();
  }

  // Hanya "paid" yang final (termasuk pembayaran terlambat setelah expired/cancelled).
  if (p.status === 'paid' && typeof p.reference === 'string' && p.reference.startsWith(REF_PREFIX)) {
    if (Number(p.base_amount ?? p.amount) < PRICE) {
      console.error('[webhook] nominal tidak sesuai', p.reference, p.base_amount, p.amount);
      return ok();
    }
    // Balas 200 dulu, kerjakan fulfillment setelahnya agar tidak timeout.
    after(() =>
      fulfillPaidOrder({
        reference: p.reference,
        transaction_id: String(p.transaction_id),
        amount: Number(p.amount),
        payment_channel: String(p.payment_channel),
      }).catch((e) => console.error('[fulfillment]', e)),
    );
  } else if (
    ['expired', 'cancelled', 'failed'].includes(p.status) &&
    typeof p.reference === 'string' &&
    p.reference.startsWith(REF_PREFIX)
  ) {
    after(() =>
      updateTransactionStatus(p.reference, p.status).catch((e) =>
        console.error('[webhook db update error]', e)
      )
    );
  }
  return ok();
}
