import crypto from 'node:crypto';

export type Channel = {
  code: string;
  name: string;
  method: 'virtual_account' | 'ewallet' | 'qris' | string;
  logo_url?: string;
};

export type Charge = {
  reference: string;
  transaction_id: string;
  payment_method: string;
  payment_channel: string;
  amount: number;
  status: string;
  expired_at?: number;
  va_number?: string;
  qr_url?: string;
  qr_content?: string;
  payment_url?: string;
  customer_name?: string;
  customer_email?: string;
};

export class BelibayarError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

function config() {
  const apiKey = process.env.BELIBAYAR_API_KEY;
  const secret = process.env.BELIBAYAR_SECRET_KEY;
  if (!apiKey || !secret) {
    throw new Error('BELIBAYAR_API_KEY dan BELIBAYAR_SECRET_KEY belum diisi di environment.');
  }
  const base = (process.env.BELIBAYAR_BASE_URL || 'https://api.belibayar.id').replace(/\/+$/, '');
  const live = process.env.BELIBAYAR_ENV === 'live';
  return { apiKey, secret, base, prefix: live ? '/direct/v1' : '/direct/v1/sandbox' };
}

export const hmacHex = (data: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');

async function parse(res: Response) {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new BelibayarError(json?.messages || `Belibayar error ${res.status}`, res.status, json);
  }
  return json.data;
}

/** GET /channels — canonical signature = path saja. */
export async function getChannels(): Promise<Channel[]> {
  const { apiKey, secret, base, prefix } = config();
  const path = `${prefix}/channels`;
  const res = await fetch(base + path, {
    headers: { 'X-Api-Key': apiKey, 'X-Signature': hmacHex(path, secret) },
    next: { revalidate: 300 },
  });
  const data = await parse(res);
  return (data.channels ?? []) as Channel[];
}

/** POST /payment/charge — canonical signature = raw body (string yang sama persis dengan yang dikirim). */
export async function createCharge(body: Record<string, unknown>): Promise<Charge> {
  const { apiKey, secret, base, prefix } = config();
  const raw = JSON.stringify(body);
  const res = await fetch(`${base}${prefix}/payment/charge`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'X-Signature': hmacHex(raw, secret),
      'Content-Type': 'application/json',
    },
    body: raw,
    cache: 'no-store',
  });
  return (await parse(res)) as Charge;
}

/** GET /payment/status/:reference — signature legacy v1: canonical = ":" + timestamp. */
export async function getStatus(reference: string): Promise<Charge> {
  const { apiKey, secret, base, prefix } = config();
  const ts = Math.floor(Date.now() / 1000).toString();
  const res = await fetch(`${base}${prefix}/payment/status/${encodeURIComponent(reference)}`, {
    headers: {
      'X-Api-Key': apiKey,
      'X-Timestamp': ts,
      'X-Signature': hmacHex(':' + ts, secret),
    },
    cache: 'no-store',
  });
  return (await parse(res)) as Charge;
}
