<?php
declare(strict_types=1);

const SCHEMA_VERSION = 1;

function migrate(PDO $pdo): void
{
    $v = (int)$pdo->query('PRAGMA user_version')->fetchColumn();
    if ($v >= SCHEMA_VERSION) return;

    $pdo->exec(<<<SQL
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        member_since INTEGER NOT NULL,
        is_demo INTEGER NOT NULL DEFAULT 0,
        session_version INTEGER NOT NULL DEFAULT 1,
        failed_logins INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER NOT NULL DEFAULT 0,
        last_login_at INTEGER NOT NULL DEFAULT 0,
        alerts_large_txn INTEGER NOT NULL DEFAULT 1,
        alerts_low_balance INTEGER NOT NULL DEFAULT 1,
        low_balance_cents INTEGER NOT NULL DEFAULT 10000
    );

    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('checking','savings','credit')),
        nickname TEXT NOT NULL,
        number TEXT NOT NULL UNIQUE,
        balance_cents INTEGER NOT NULL DEFAULT 0,
        credit_limit_cents INTEGER NOT NULL DEFAULT 0,
        apy_bps INTEGER NOT NULL DEFAULT 0,
        interest_month TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL,
        balance_after_cents INTEGER,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Other',
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','pending','failed')),
        posts_at INTEGER NOT NULL DEFAULT 0,
        memo TEXT NOT NULL DEFAULT '',
        ref TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_txn_account ON transactions(account_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_txn_pending ON transactions(status, posts_at);

    CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('debit','credit')),
        last4 TEXT NOT NULL,
        exp TEXT NOT NULL,
        frozen INTEGER NOT NULL DEFAULT 0,
        online_enabled INTEGER NOT NULL DEFAULT 1,
        intl_enabled INTEGER NOT NULL DEFAULT 0,
        contactless_enabled INTEGER NOT NULL DEFAULT 1,
        daily_limit_cents INTEGER NOT NULL DEFAULT 250000,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Bills',
        account_hint TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduled_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        payee_id INTEGER NOT NULL REFERENCES payees(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL,
        next_date TEXT NOT NULL,
        frequency TEXT NOT NULL CHECK (frequency IN ('once','weekly','monthly')),
        memo TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        emoji TEXT NOT NULL DEFAULT '',
        target_cents INTEGER NOT NULL,
        saved_cents INTEGER NOT NULL DEFAULT 0,
        target_date TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL DEFAULT 'info',
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS login_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        success INTEGER NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        window_start INTEGER NOT NULL
    );
    SQL);

    $pdo->exec('PRAGMA user_version = ' . SCHEMA_VERSION);
}
