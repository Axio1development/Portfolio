<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
date_default_timezone_set('UTC');

const SESSION_IDLE_SECONDS = 900;
const MAX_FAILED_LOGINS    = 5;
const LOCKOUT_SECONDS      = 900;

function data_dir(): string
{
    static $dir = null;
    if ($dir !== null) return $dir;

    $candidates = [
        dirname(__DIR__, 3) . '/axiomate-data',
        dirname(__DIR__) . '/.data',
    ];
    foreach ($candidates as $c) {
        if (!is_dir($c)) @mkdir($c, 0700, true);
        if (is_dir($c) && is_writable($c)) {
            if (!is_dir("$c/sessions")) @mkdir("$c/sessions", 0700, true);
            if (!file_exists("$c/.htaccess")) @file_put_contents("$c/.htaccess", "Require all denied\nDeny from all\n");
            return $dir = $c;
        }
    }
    fail('Storage is not writable on this server.', 500);
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO('sqlite:' . data_dir() . '/bank.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    require_once __DIR__ . '/schema.php';
    migrate($pdo);
    return $pdo;
}

function now(): int { return time(); }

function json_out($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $code = 400, array $extra = []): void
{
    json_out(['ok' => false, 'error' => $message] + $extra, $code);
}

function input(): array
{
    static $in = null;
    if ($in !== null) return $in;
    $raw = file_get_contents('php://input') ?: '';
    $in = json_decode($raw, true);
    if (!is_array($in)) $in = [];
    return $in;
}

function str_in(string $key, int $max = 200): string
{
    $v = input()[$key] ?? '';
    if (!is_string($v) && !is_numeric($v)) return '';
    $v = trim((string)$v);
    return mb_substr($v, 0, $max);
}

function int_in(string $key): int
{
    $v = input()[$key] ?? 0;
    return is_numeric($v) ? (int)$v : 0;
}

function cents_in(string $key, int $maxCents = 1000000000): int
{
    $v = input()[$key] ?? '';
    $v = str_replace([',', '$', ' '], '', (string)$v);
    if (!preg_match('/^\d{1,9}(\.\d{1,2})?$/', $v)) fail('Enter a valid amount.');
    $parts = explode('.', $v);
    $cents = (int)$parts[0] * 100 + (isset($parts[1]) ? (int)str_pad($parts[1], 2, '0') : 0);
    if ($cents <= 0) fail('Amount must be greater than $0.00.');
    if ($cents > $maxCents) fail('That amount is over the limit of ' . money($maxCents) . '.');
    return $cents;
}

function money(int $cents): string
{
    $sign = $cents < 0 ? '-' : '';
    return $sign . '$' . number_format(abs($cents) / 100, 2);
}

function client_ip(): string
{
    return substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 64);
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'
        || (int)($_SERVER['SERVER_PORT'] ?? 0) === 443;
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.save_path', data_dir() . '/sessions');
    ini_set('session.gc_maxlifetime', (string)(SESSION_IDLE_SECONDS * 2));
    ini_set('session.use_strict_mode', '1');
    session_name('AXBSESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function csrf_check(): void
{
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($sent) || !hash_equals($_SESSION['csrf'] ?? '', $sent)) {
        fail('Your session expired. Please refresh the page.', 419);
    }
}

function current_user(bool $required = true): ?array
{
    $uid = $_SESSION['uid'] ?? null;
    if ($uid) {
        $last = $_SESSION['last_seen'] ?? 0;
        if (now() - $last > SESSION_IDLE_SECONDS) {
            end_session();
            if ($required) fail('You were signed out after 15 minutes of inactivity.', 401, ['reason' => 'timeout']);
            return null;
        }
        $st = db()->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([$uid]);
        $user = $st->fetch();
        if ($user && (int)$user['session_version'] === (int)($_SESSION['sv'] ?? -1)) {
            $_SESSION['last_seen'] = now();
            return $user;
        }
        end_session();
    }
    if ($required) fail('Please sign in.', 401);
    return null;
}

function end_session(): void
{
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
}

function rate_limit(string $key, int $max, int $windowSeconds): void
{
    $pdo = db();
    $t = now();
    $st = $pdo->prepare('SELECT count, window_start FROM rate_limits WHERE key = ?');
    $st->execute([$key]);
    $row = $st->fetch();
    if (!$row || $t - (int)$row['window_start'] >= $windowSeconds) {
        $pdo->prepare('INSERT OR REPLACE INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)')->execute([$key, $t]);
        return;
    }
    if ((int)$row['count'] >= $max) {
        $wait = $windowSeconds - ($t - (int)$row['window_start']);
        fail('Too many attempts. Try again in ' . max(1, (int)ceil($wait / 60)) . ' minute(s).', 429);
    }
    $pdo->prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?')->execute([$key]);
}

function notify(int $uid, string $title, string $body, string $kind = 'info'): void
{
    db()->prepare('INSERT INTO notifications (user_id, kind, title, body, created_at) VALUES (?,?,?,?,?)')
        ->execute([$uid, $kind, $title, $body, now()]);
}
