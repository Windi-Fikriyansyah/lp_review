export const PRICE = Number(process.env.PRODUCT_PRICE) > 0 ? Number(process.env.PRODUCT_PRICE) : 279000;
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
export const REF_PREFIX = 'RL-';
export const rupiah = (n: number) => 'Rp' + new Intl.NumberFormat('id-ID').format(n);
