import Checkout from '@/components/Checkout';
import Demo from '@/components/Demo';
import { PRICE, rupiah } from '@/lib/product';

export const dynamic = 'force-dynamic'; // harga dibaca dari env saat runtime

export default function Home() {
  const price = rupiah(PRICE);
  return (
    <>
      <header className="wrap hero">
        <div className="nav">
          <div className="logo">Reach Leads</div>
          <a href="#beli" className="btn" style={{ padding: '9px 18px', fontSize: '.9rem' }}>Beli {price}</a>
        </div>
        <div className="hero-grid">
          <div>
            <h1>Toko baru tanpa ulasan? Pembeli cenderung pergi.</h1>
            <p className="lead">Reach Leads mengambil ulasan produk dari marketplace dan menampilkannya di halaman produk tokomu. Tempel link, klik impor, selesai dalam hitungan menit.</p>
            <a href="#beli" className="btn">Dapatkan akses selamanya</a>
            <p className="sub">Bayar sekali {price}. Tanpa langganan bulanan.</p>
          </div>
          <div className="demo" aria-label="Contoh halaman produk sebelum dan sesudah memakai Reach Leads">
            <div className="pane"><h3>Sebelum</h3><div className="stars" aria-hidden="true">☆☆☆☆☆</div><div className="empty">Belum ada ulasan</div></div>
            <div className="pane after"><h3>Sesudah</h3>
              <div className="stars" aria-label="Rating 4,8 dari 5">★★★★★ <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>4,8</span></div>
              <div className="rv"><b>Rina S.</b>Barang sampai cepat, kualitas sesuai foto.<div><span className="ph" /><span className="ph" /></div></div>
              <div className="rv"><b>Dimas A.</b>Bahannya bagus, ukuran pas.</div>
            </div>
          </div>
        </div>
      </header>

      <section className="wrap" id="demo"><Demo /></section>

      <section className="wrap">
        <div className="grid3">
          <div className="card"><h3>Impor sekali klik</h3><p>Tempel link produk, ulasan langsung masuk. Tidak perlu salin satu per satu.</p></div>
          <div className="card"><h3>Pilih yang berfoto</h3><p>Saring ulasan berfoto dan tampilkan yang paling meyakinkan.</p></div>
          <div className="card"><h3>Terjemah otomatis</h3><p>Ulasan berbahasa asing diterjemahkan ke Bahasa Indonesia.</p></div>
        </div>
      </section>

      <section className="wrap" id="beli">
        <div className="buy">
          <div className="buy-grid">
            <div>
              <h2>Bayar sekali, pakai selamanya</h2>
              <div className="price"><span className="now">{price}</span><s>Rp1.800.000/tahun*</s></div>
              <ul className="ticks">
                <li>Akses lifetime ke semua fitur</li>
                <li>Impor ulasan dari marketplace</li>
                <li>Widget ulasan siap pasang di tokomu</li>
                <li>Update fitur gratis</li>
                <li>Bantuan pemasangan via WhatsApp</li>
              </ul>
              <p className="sub">*Pembanding: aplikasi ulasan berlangganan sekitar Rp150.000 per bulan.</p>
            </div>
            <Checkout price={PRICE} />
          </div>
        </div>
      </section>

      <section className="wrap">
        <h2>Pertanyaan umum</h2>
        <details><summary>Benar-benar bayar sekali?</summary><p>Ya. {price} satu kali, tanpa tagihan bulanan atau tahunan.</p></details>
        <details><summary>Bisa dipakai di platform toko apa saja?</summary><p>Isi dengan platform yang kamu dukung, misalnya Shopify dan WooCommerce.</p></details>
        <details><summary>Bagaimana kalau tidak cocok?</summary><p>Isi dengan kebijakan refund kamu, misalnya jaminan uang kembali 7 hari.</p></details>
        <details><summary>Apakah ulasan boleh ditampilkan di tokoku?</summary><p>Gunakan ulasan secara jujur dan sebutkan sumbernya. Kamu bertanggung jawab atas kepatuhan terhadap aturan marketplace dan platform tokomu.</p></details>
      </section>

      <footer className="wrap">© 2026 Reach Leads. Semua hak dilindungi.</footer>
    </>
  );
}
