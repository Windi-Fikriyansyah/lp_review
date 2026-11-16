import { getStatus } from './belibayar';
import { getTransactionByReference, markTransactionPaid } from './db';

export type PaidPayload = {
  reference: string;
  transaction_id: string;
  amount: number;
  payment_channel: string;
};

/**
 * Memanggil API create-user untuk membuat akun pembeli setelah status pembayaran paid.
 */
async function createUserAccount(name: string, email: string) {
  const secretKey =
    process.env.REACH_LEADS_SECRET_KEY ||
    process.env.CREATE_USER_SECRET_KEY ||
    'reach-leads-secret-key-123';
  const apiUrl =
    process.env.CREATE_USER_API_URL ||
    'https://appreachlead.webkite.online/api/webhook/create-user';

  const authHeader = secretKey.startsWith('Bearer ') ? secretKey : `Bearer ${secretKey}`;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ name, email }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error('[create-user api error]', { status: res.status, data });
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    console.log('[create-user success]', { name, email, data });
    return { ok: true, data };
  } catch (err) {
    console.error('[create-user network error]', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Dipanggil setelah webhook "paid" lolos verifikasi signature atau ketika status terkonfirmasi.
 * Menyimpan status 'paid' ke database PostgreSQL, mencegah proses ganda, dan memanggil API pembuatan user.
 */
export async function fulfillPaidOrder(p: PaidPayload) {
  // Update status di database PostgreSQL menjadi 'paid' secara atomik.
  // `updated: false` jika transaksi sudah berstatus 'paid' sebelumnya.
  let isNewPayment = true;
  let txRecord = null;

  try {
    const res = await markTransactionPaid(p.reference, p.transaction_id, p);
    isNewPayment = res.updated;
    txRecord = res.transaction;
  } catch (err) {
    console.error('[fulfillment db error]', err);
  }

  // Jika sudah pernah diproses di database, abaikan agar tidak dobel kirim akses / trigger
  if (!isNewPayment) {
    console.log('[fulfillment] Transaksi sudah pernah diproses sebelumnya:', p.reference);
    return;
  }

  // Ambil email dan nama pembeli dari database atau fallback ke API Belibayar
  let email = txRecord?.customer_email;
  let name = txRecord?.customer_name;

  if (!email || !name) {
    try {
      const order = await getStatus(p.reference);
      email = email || order.customer_email;
      name = name || order.customer_name;
    } catch (apiErr) {
      console.error('[fulfillment getStatus error]', apiErr);
    }
  }

  // Jalankan API create-user ke appreachlead.webkite.online
  if (email) {
    await createUserAccount(name || '', email);
  }

  console.log('[paid fulfilled]', {
    reference: p.reference,
    transaction_id: p.transaction_id,
    amount: p.amount,
    name,
    email,
  });
}
