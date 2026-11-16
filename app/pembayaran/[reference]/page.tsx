import StatusView, { TransactionViewData } from '@/components/StatusView';
import { getStatus } from '@/lib/belibayar';
import { getTransactionByReference } from '@/lib/db';
import { REF_PREFIX } from '@/lib/product';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Status pembayaran – Reach Leads', robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!reference || !reference.startsWith(REF_PREFIX)) {
    notFound();
  }

  let txData: TransactionViewData | null = null;

  // 1. Ambil data dari database PostgreSQL
  try {
    const tx = await getTransactionByReference(reference);
    if (tx) {
      txData = {
        reference: tx.reference,
        status: tx.status,
        customer_name: tx.customer_name,
        customer_email: tx.customer_email,
        payment_method: tx.payment_method,
        payment_channel: tx.payment_channel,
        channel_name: tx.channel_name || tx.payment_channel,
        amount: Number(tx.amount),
        va_number: tx.va_number || undefined,
        qr_url: tx.qr_url || undefined,
        payment_url: tx.payment_url || undefined,
        expired_at: tx.expired_at ? new Date(tx.expired_at).toISOString() : null,
      };
    }
  } catch (err) {
    console.error('[pembayaran page db error]', err);
  }

  // 2. Fallback ke API Belibayar jika belum ada di database
  if (!txData) {
    try {
      const b = await getStatus(reference);
      if (b) {
        txData = {
          reference: b.reference,
          status: b.status,
          customer_name: b.customer_name,
          customer_email: b.customer_email,
          payment_method: b.payment_method,
          payment_channel: b.payment_channel,
          channel_name: b.payment_channel,
          amount: Number(b.amount),
          va_number: b.va_number,
          qr_url: b.qr_url,
          payment_url: b.payment_url,
          expired_at: b.expired_at ?? null,
        };
      }
    } catch (apiErr) {
      console.error('[pembayaran page api error]', apiErr);
    }
  }

  return (
    <main className="pg">
      <div className="buy">
        <StatusView reference={reference} initialData={txData} />
      </div>
    </main>
  );
}
