import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { BelibayarError, createCharge, getChannels } from '@/lib/belibayar';
import { saveTransaction } from '@/lib/db';
import { APP_URL, PRICE, REF_PREFIX } from '@/lib/product';

export const runtime = 'nodejs';

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

function normalizePhone(raw: string) {
  const d = raw.replace(/[^\d]/g, '');
  if (d.startsWith('62')) return d;
  if (d.startsWith('0')) return '62' + d.slice(1);
  return d;
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== 'object') return fail('Permintaan tidak valid.');

  const name = String(b.name ?? '').trim().slice(0, 100);
  const email = String(b.email ?? '').trim().slice(0, 150);
  const phoneRaw = String(b.phone ?? '').trim();
  const code = String(b.channel ?? '');

  if (!name) return fail('Isi nama kamu.');
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Isi email yang valid.');
  const phone = normalizePhone(phoneRaw);
  if (!/^628\d{7,12}$/.test(phone)) return fail('Isi nomor WhatsApp yang valid, contoh 081234567890.');

  try {
    // Method & channel divalidasi terhadap daftar channel aktif dari Belibayar.
    const channels = await getChannels();
    const ch = channels.find((c) => c.code === code);
    if (!ch) return fail('Metode pembayaran tidak tersedia.');

    const reference = `${REF_PREFIX}${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
    const body: Record<string, unknown> = {
      reference,
      amount: PRICE, // harga selalu dari server
      pay_method: ch.method === 'qris' ? { method: 'qris' } : { method: ch.method, channel: ch.code },
      customer_name: name,
      customer_email: email,
      callback_url: `${APP_URL}/api/webhook/belibayar`,
    };
    if (ch.method === 'qris') body.static_qr = false;
    if (ch.method === 'ewallet') {
      body.customer_phone = phone;
      body.redirect_url = `${APP_URL}/pembayaran/${reference}`;
    }

    const c = await createCharge(body);
    const finalRef = c.reference ?? reference;

    // Simpan data transaksi ke database PostgreSQL
    try {
      await saveTransaction({
        reference: finalRef,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        payment_method: ch.method,
        payment_channel: ch.code,
        channel_name: ch.name,
        amount: c.amount ?? PRICE,
        status: c.status || 'pending',
        va_number: c.va_number,
        qr_url: c.qr_url,
        payment_url: c.payment_url,
        expired_at: c.expired_at,
        raw_payload: c,
      });
    } catch (dbErr) {
      console.error('[checkout db save error]', dbErr);
    }

    return NextResponse.json({
      ok: true,
      charge: {
        reference: finalRef,
        method: ch.method,
        channel: ch.code,
        channelName: ch.name,
        amount: c.amount ?? PRICE,
        status: c.status,
        expired_at: c.expired_at,
        va_number: c.va_number,
        qr_url: c.qr_url,
        payment_url: c.payment_url,
      },
    });
  } catch (e) {
    console.error('[checkout]', e instanceof BelibayarError ? { status: e.status, body: e.body } : e);
    return fail('Pembayaran belum bisa dibuat. Coba metode lain atau ulangi sebentar lagi.', 502);
  }
}
