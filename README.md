# Reach Leads – Landing Page (Next.js + Belibayar)

Next.js 15 (App Router, TypeScript). Pembayaran lewat Direct API Belibayar: daftar metode diambil langsung dari API Channels, pembeli bayar di halaman yang sama (QRIS, Virtual Account, e-wallet, gerai retail).

## Menjalankan
```bash
npm install
cp .env.example .env.local   # lalu isi nilainya
npm run dev
```

## Environment (`.env.local`)
| Variabel | Isi |
|---|---|
| `BELIBAYAR_BASE_URL` | `https://api.belibayar.id` |
| `BELIBAYAR_ENV` | `sandbox` (uji coba) atau `live` |
| `BELIBAYAR_API_KEY` | `byr_test_...` / `byr_live_...` |
| `BELIBAYAR_SECRET_KEY` | secret_key pasangan API key (sandbox dan live berbeda) |
| `BELIBAYAR_WEBHOOK_SECRET` | webhook_secret (bukan secret_key) |
| `NEXT_PUBLIC_APP_URL` | URL publik situs, mis. `https://reachleads.com` |
| `PRODUCT_PRICE` | `149000` |

## Setup di dashboard Belibayar
1. **Kredensial**: buat API key dan secret, catat webhook_secret.
2. **IP whitelist (wajib)**: daftarkan IP server yang memanggil API. Tanpa ini semua request ditolak `403 IP_WHITELIST_REQUIRED`.
   Hosting serverless seperti Vercel memakai IP yang berubah-ubah. Pakai VPS dengan IP tetap, atau layanan static IP/proxy.
3. **Callback URL**: `https://DOMAIN-KAMU/api/webhook/belibayar` (kode ini juga mengirimnya per transaksi).
4. **Channel Pembayaran**: pastikan channel yang mau dipakai sudah aktif, karena yang tampil di halaman hanya channel aktif.

## Uji di sandbox
Isi kredensial `byr_test_`, buka halaman, buat pesanan, lalu klik **Simulasi** di dashboard Transaksi atau
`POST /direct/v1/sandbox/payment/simulate` dengan `{ "reference": "...", "action": "success" }`.
Halaman otomatis berubah ke "Pembayaran diterima". Setelah lolos, ganti `BELIBAYAR_ENV=live` dan kredensial live.

## Struktur
- `app/page.tsx`: landing page (tampilan sama seperti sebelumnya)
- `components/Checkout.tsx`: form + metode bayar dari gateway + panel QR/VA + polling status
- `components/Demo.tsx`: animasi demo
- `app/api/channels`: daftar channel (cache 5 menit)
- `app/api/checkout`: validasi, buat transaksi (harga dari server)
- `app/api/status/[reference]`: cek status
- `app/api/webhook/belibayar`: verifikasi signature, lalu `lib/fulfillment.ts`
- `app/pembayaran/[reference]`: halaman tujuan setelah bayar e-wallet
- `lib/belibayar.ts`: signing HMAC-SHA256 dan pemanggilan API

## Yang masih harus kamu isi
`lib/fulfillment.ts` → `fulfillPaidOrder()`: kirim akses ke email pembeli (Resend/SMTP) dan simpan pesanan di database.
Pencegah proses ganda di file itu hanya di memori; untuk produksi pakai database (kunci `transaction_id`).
Disarankan juga menambah rate limiting pada `/api/checkout`.
