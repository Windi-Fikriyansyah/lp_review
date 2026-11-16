'use client';
import { useEffect, useState } from 'react';

const URL_TXT = 'https://shopee.co.id/produk-kamu-i.123456.789';
const DONE = '128 ulasan berhasil diimpor';
const REVIEWS = [
  { stars: '★★★★★', who: 'Rina S.', text: 'Barang sampai cepat, kualitas sesuai foto.' },
  { stars: '★★★★★', who: 'Dimas A.', text: 'Bahannya bagus, ukuran pas.' },
  { stars: '★★★★☆', who: 'Sari W.', text: 'Sesuai deskripsi, packing rapi.' },
];

export default function Demo() {
  const [typed, setTyped] = useState(0);
  const [typing, setTyping] = useState(true);
  const [click, setClick] = useState(false);
  const [prog, setProg] = useState(0);
  const [stat, setStat] = useState('');
  const [shown, setShown] = useState(0);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(URL_TXT.length); setTyping(false); setProg(100); setStat(DONE); setShown(REVIEWS.length); setStep(3);
      return;
    }
    let timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    const run = () => {
      timers.forEach(clearTimeout); timers = [];
      setTyped(0); setTyping(true); setClick(false); setProg(0); setStat(''); setShown(0); setStep(1);
      for (let i = 1; i <= URL_TXT.length; i++) at(300 + i * 45, () => setTyped(i));
      const t = 300 + URL_TXT.length * 45 + 500;
      at(t, () => { setTyping(false); setClick(true); setStep(2); setStat('Mengambil ulasan...'); });
      at(t + 250, () => { setClick(false); setProg(100); });
      at(t + 2200, () => { setStat(DONE); setStep(3); });
      REVIEWS.forEach((_, i) => at(t + 2500 + i * 600, () => setShown(i + 1)));
      at(t + 2500 + REVIEWS.length * 600 + 3500, run);
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="dm">
      <div className="dm-head">
        <h2>Lihat cara kerjanya</h2>
        <p className="lead" style={{ margin: '0 auto' }}>Dari link produk sampai ulasan tampil di tokomu, kurang dari satu menit.</p>
      </div>
      <div className="frame">
        <div className="bar"><i /><i /><i /><span>tokomu.com/admin/reach-leads</span></div>
        <div className="stage" aria-label="Animasi demo: tempel link, klik impor, ulasan tampil">
          <div className="row">
            <div className="fake">{URL_TXT.slice(0, typed)}{typing && <em />}</div>
            <div className={'go' + (click ? ' on' : '')}>Impor</div>
          </div>
          <div className="prog"><b style={{ width: `${prog}%`, transition: prog > 0 ? 'width 1.8s ease' : 'none' }} /></div>
          <div className="stat">{stat}</div>
          <div>
            {REVIEWS.map((r, i) => (
              <div key={r.who} className={'dr' + (i < shown ? ' show' : '')}>
                <span className="ph" />
                <div><div className="stars" aria-hidden="true">{r.stars}</div><b>{r.who}</b>{r.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="steps">
        <span className={step === 1 ? 'on' : ''}>1. Tempel link</span>
        <span className={step === 2 ? 'on' : ''}>2. Klik impor</span>
        <span className={step === 3 ? 'on' : ''}>3. Ulasan tampil</span>
      </div>
      <p className="sub" style={{ textAlign: 'center' }}>Animasi ilustrasi alur penggunaan.</p>
    </div>
  );
}
