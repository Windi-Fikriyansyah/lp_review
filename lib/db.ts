import { Pool, QueryResult, QueryResultRow } from 'pg';

// Singleton pool untuk mencegah pembuatan koneksi berulang saat Next.js hot-reload di development
const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
};

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === 'true' || process.env.DATABASE_URL?.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgPool = pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export interface TransactionRecord {
  id?: number;
  reference: string;
  transaction_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  payment_method: string;
  payment_channel: string;
  channel_name?: string | null;
  amount: number;
  status: string;
  va_number?: string | null;
  qr_url?: string | null;
  payment_url?: string | null;
  expired_at?: Date | string | null;
  paid_at?: Date | string | null;
  raw_payload?: any;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Menyimpan transaksi baru yang di-generate dari checkout ke database PostgreSQL.
 */
export async function saveTransaction(tx: {
  reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  payment_method: string;
  payment_channel: string;
  channel_name?: string;
  amount: number;
  status?: string;
  va_number?: string;
  qr_url?: string;
  payment_url?: string;
  expired_at?: number | Date | null;
  raw_payload?: any;
}) {
  const expiredAt =
    tx.expired_at != null
      ? typeof tx.expired_at === 'number'
        ? new Date(tx.expired_at * 1000)
        : tx.expired_at
      : null;

  const sql = `
    INSERT INTO transactions (
      reference,
      customer_name,
      customer_email,
      customer_phone,
      payment_method,
      payment_channel,
      channel_name,
      amount,
      status,
      va_number,
      qr_url,
      payment_url,
      expired_at,
      raw_payload
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    )
    ON CONFLICT (reference) DO UPDATE SET
      customer_name = EXCLUDED.customer_name,
      customer_email = EXCLUDED.customer_email,
      customer_phone = EXCLUDED.customer_phone,
      payment_method = EXCLUDED.payment_method,
      payment_channel = EXCLUDED.payment_channel,
      channel_name = EXCLUDED.channel_name,
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      va_number = EXCLUDED.va_number,
      qr_url = EXCLUDED.qr_url,
      payment_url = EXCLUDED.payment_url,
      expired_at = EXCLUDED.expired_at,
      raw_payload = EXCLUDED.raw_payload,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  const values = [
    tx.reference,
    tx.customer_name,
    tx.customer_email,
    tx.customer_phone || null,
    tx.payment_method,
    tx.payment_channel,
    tx.channel_name || null,
    tx.amount,
    tx.status || 'pending',
    tx.va_number || null,
    tx.qr_url || null,
    tx.payment_url || null,
    expiredAt,
    tx.raw_payload ? JSON.stringify(tx.raw_payload) : null,
  ];

  const res = await query<TransactionRecord>(sql, values);
  return res.rows[0];
}

/**
 * Mendapatkan detail transaksi berdasarkan kode reference.
 */
export async function getTransactionByReference(reference: string): Promise<TransactionRecord | null> {
  const res = await query<TransactionRecord>(
    'SELECT * FROM transactions WHERE reference = $1 LIMIT 1',
    [reference]
  );
  return res.rows[0] || null;
}

/**
 * Memperbarui status transaksi menjadi paid dan mencatat waktu pembayaran.
 * Mengembalikan transaksi yang diupdate jika sebelumnya belum paid (idempotent lock).
 */
export async function markTransactionPaid(
  reference: string,
  transactionId?: string,
  rawPayload?: any
): Promise<{ updated: boolean; transaction: TransactionRecord | null }> {
  // Hanya update jika status belum 'paid' untuk mencegah double fulfillment
  const sql = `
    UPDATE transactions
    SET
      status = 'paid',
      transaction_id = COALESCE($2, transaction_id),
      paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
      raw_payload = COALESCE($3, raw_payload),
      updated_at = CURRENT_TIMESTAMP
    WHERE reference = $1 AND status != 'paid'
    RETURNING *;
  `;

  const res = await query<TransactionRecord>(sql, [
    reference,
    transactionId || null,
    rawPayload ? JSON.stringify(rawPayload) : null,
  ]);

  if (res.rows.length > 0) {
    return { updated: true, transaction: res.rows[0] };
  }

  // Jika tidak ada baris yang ter-update, ambil data yang sudah ada
  const current = await getTransactionByReference(reference);
  return { updated: false, transaction: current };
}

/**
 * Memperbarui status transaksi umum (misal: 'expired', 'cancelled', 'failed').
 */
export async function updateTransactionStatus(
  reference: string,
  status: string
): Promise<TransactionRecord | null> {
  const sql = `
    UPDATE transactions
    SET status = $2, updated_at = CURRENT_TIMESTAMP
    WHERE reference = $1
    RETURNING *;
  `;
  const res = await query<TransactionRecord>(sql, [reference, status]);
  return res.rows[0] || null;
}

