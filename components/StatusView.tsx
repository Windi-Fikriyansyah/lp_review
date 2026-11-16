'use client';
import { useEffect, useState } from 'react';

const rp = (n: number) => 'Rp' + new Intl.NumberFormat('id-ID').format(n);

export type TransactionViewData = {
  reference: string;
  status: string;
  customer_name?: string;
  customer_email?: string;
  payment_method?: string;
  payment_channel?: string;
  channel_name?: string;
  amount?: number;
  va_number?: string;
  qr_url?: string;
  payment_url?: string;
  expired_at?: string | number | null;
};

export default function StatusView({
  reference,
  initialData,
}: {
  reference: string;
  initialData?: TransactionViewData | null;
}) {
  const [data, setData] = useState<TransactionViewData | null>(initialData ?? null);
  const [status, setStatus] = useState(initialData?.status || 'pending');
  const [copied, setCopied] = useState(false);

  // Polling status sampai transaksi terkonfirmasi atau selesai
  useEffect(() => {
    if (status !== 'pending') return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/status/${reference}`);
        const j = await r.json();
        if (!stop && j.status) {
          setStatus(j.status);
          setData((prev) => (prev ? { ...prev, status: j.status } : null));
        }
      } catch {
        /* coba lagi */
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [reference, status]);

  const email = data?.customer_email || 'email Anda';

  if (status === 'paid') {
    return (
      <div className="res">
        <div className="ok">Pembayaran diterima</div>
        <h3>Terima kasih!</h3>
        <p>
          Akses Reach Leads dikirim ke <b>{email}</b>. Cek folder spam jika belum masuk.
        </p>
        <a className="btn" href="/" style={{ display: 'inline-block', marginTop: 16 }}>
          Kembali ke beranda
        </a>
      </div>
    );
  }

  if (status === 'expired' || status === 'cancelled') {
    return (
      <div className="res">
        <h3>Pembayaran kedaluwarsa</h3>
        <p className="muted">
          Kalau kamu sudah terlanjur membayar, akses tetap dikirim otomatis setelah pembayaran terkonfirmasi.
        </p>
        <a className="btn" href="/#beli" style={{ display: 'inline-block', marginTop: 16 }}>
          Buat pesanan baru
        </a>
      </div>
    );
  }

  // Status masih pending: tampilkan petunjuk pembayaran
  const method = data?.payment_method || '';
  const channel = data?.payment_channel || '';
  const channelName = data?.channel_name || channel || 'Metode Pembayaran';
  const amount = data?.amount || 0;
  const isRetail = ['INDOMARET', 'ALFAMART'].includes(channel);

  let exp = '';
  if (data?.expired_at) {
    const expDate =
      typeof data.expired_at === 'number'
        ? new Date(data.expired_at * 1000)
        : new Date(data.expired_at);
    if (!isNaN(expDate.getTime())) {
      exp = expDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    }
  }

  return (
    <div className="res">
      <h3>Selesaikan pembayaran</h3>
      {amount > 0 && (
        <p style={{ margin: '0 0 12px' }}>
          {channelName} · <b>{rp(amount)}</b>
        </p>
      )}

      {method === 'qris' && data?.qr_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="qr" src={data.qr_url} alt="Kode QRIS untuk membayar" />
          <p className="muted">Scan dengan aplikasi bank atau e-wallet apa saja.</p>
        </>
      )}

      {(method === 'virtual_account' || isRetail) && data?.va_number && (
        <>
          <p className="muted" style={{ margin: '10px 0 0' }}>
            {isRetail ? 'Kode pembayaran (tunjukkan di kasir)' : 'Nomor Virtual Account'}
          </p>
          <div className="vanum">{data.va_number}</div>
          <button
            type="button"
            className="btn ghost"
            style={{ marginTop: 0 }}
            onClick={async () => {
              await navigator.clipboard?.writeText(data.va_number!).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? 'Tersalin' : 'Salin nomor'}
          </button>
        </>
      )}

      {method === 'ewallet' && (
        <>
          <p style={{ marginTop: 12 }}>
            Cek notifikasi di aplikasi {channelName} kamu, lalu setujui pembayaran.
          </p>
          {data?.payment_url && (
            <a
              className="btn"
              href={data.payment_url}
              style={{ display: 'inline-block', marginTop: 12 }}
            >
              Buka aplikasi e-wallet
            </a>
          )}
        </>
      )}

      {exp && <p className="muted">Bayar sebelum {exp}</p>}
      <p className="muted" aria-live="polite">
        Menunggu pembayaran... halaman ini otomatis berubah setelah pembayaran terkonfirmasi.
      </p>
      <a className="btn ghost" href="/#beli" style={{ display: 'inline-block', marginTop: 12 }}>
        Ganti metode pembayaran
      </a>
    </div>
  );
}
