-- Tabel Transaksi untuk Reach Leads
-- Kompatibel dengan PostgreSQL 12+

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(64) UNIQUE NOT NULL,
    transaction_id VARCHAR(100),
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20),
    payment_method VARCHAR(50) NOT NULL,
    payment_channel VARCHAR(50) NOT NULL,
    channel_name VARCHAR(100),
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    va_number VARCHAR(100),
    qr_url TEXT,
    payment_url TEXT,
    expired_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk mempercepat query berdasarkan reference, status, email, dan transaction_id
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_email ON transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

