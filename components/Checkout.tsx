'use client';
import { useCallback, useEffect, useState } from 'react';

type Channel = { code: string; name: string; method: string; logo_url?: string };
type Charge = {
  reference: string;
  method: string;
  channel: string;
  channelName: string;
  amount: number;
  status: string;
  expired_at?: number;
  va_number?: string;
  qr_url?: string;
  payment_url?: string;
};

const GROUPS = ['QRIS', 'Virtual Account', 'E-Wallet', 'Gerai Retail'] as const;
const groupOf = (c: Channel) =>
  c.method === 'qris'
    ? 'QRIS'
    : c.method === 'ewallet'
    ? 'E-Wallet'
    : ['INDOMARET', 'ALFAMART'].includes(c.code)
    ? 'Gerai Retail'
    : 'Virtual Account';

const rp = (n: number) => 'Rp' + new Intl.NumberFormat('id-ID').format(n);

export default function Checkout({ price }: { price: number }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [chErr, setChErr] = useState('');
  const [loadingCh, setLoadingCh] = useState(true);
  const [sel, setSel] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const loadChannels = useCallback(async () => {
    setLoadingCh(true);
    setChErr('');
    try {
      const r = await fetch('/api/channels');
      const j = await r.json();
      const list: Channel[] = j.channels ?? [];
      if (!list.length) throw new Error();
      setChannels(list);
      setSel((s) => s || (list.find((c) => c.method === 'qris') ?? list[0]).code);
    } catch {
      setChErr('Metode pembayaran belum bisa dimuat.');
    } finally {
      setLoadingCh(false);
    }
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setErr('Isi nama kamu.');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      return setErr('Isi email yang valid, akses dikirim ke sini.');
    if (!/^(\+62|62|0)8\d{7,12}$/.test(form.phone.replace(/[\s-]/g, '')))
      return setErr('Isi nomor WhatsApp yang valid, contoh 081234567890.');
    if (!sel) return setErr('Pilih metode pembayaran.');

    setErr('');
    setBusy(true);

    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, channel: sel }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Gagal membuat pembayaran.');
      const c: Charge = j.charge;

      if (c.method === 'ewallet' && c.payment_url) {
        window.location.assign(c.payment_url);
        return;
      }

      // Alihkan ke halaman pembayaran baru
      window.location.assign(`/pembayaran/${c.reference}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal membuat pembayaran.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="n">Nama</label>
      <input
        id="n"
        type="text"
        autoComplete="name"
        placeholder="Nama lengkap"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <label htmlFor="e">Email (untuk kirim akses)</label>
      <input
        id="e"
        type="email"
        autoComplete="email"
        placeholder="nama@domain.com"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <label htmlFor="w">WhatsApp</label>
      <input
        id="w"
        type="tel"
        autoComplete="tel"
        placeholder="08xxxxxxxxxx"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />

      <label>Metode pembayaran</label>
      {loadingCh && <p className="muted">Memuat metode pembayaran...</p>}
      {chErr && (
        <p className="err">
          {chErr}{' '}
          <button
            type="button"
            className="btn ghost"
            style={{ padding: '4px 10px', marginTop: 0 }}
            onClick={loadChannels}
          >
            Coba lagi
          </button>
        </p>
      )}
      {GROUPS.map((g) => {
        const list = channels.filter((c) => groupOf(c) === g);
        if (!list.length) return null;
        return (
          <div key={g}>
            <div className="grp">{g}</div>
            <div className="pay">
              {list.map((c) => (
                <label key={c.code}>
                  <input
                    type="radio"
                    name="m"
                    value={c.code}
                    checked={sel === c.code}
                    onChange={() => setSel(c.code)}
                  />
                  {c.logo_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={c.logo_url} alt="" />
                  )}
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <p className="err" role="alert">
        {err}
      </p>
      <button className="btn" type="submit" disabled={busy || loadingCh || !!chErr}>
        {busy ? 'Memproses...' : `Bayar ${rp(price)} sekarang`}
      </button>
      <p className="secure">
        Pembayaran diproses aman oleh Belibayar. Akses dikirim ke email setelah bayar.
      </p>
    </form>
  );
}
