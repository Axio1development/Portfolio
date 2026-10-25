<?php
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/ledger.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$route  = preg_replace('/[^a-z0-9_.]/', '', strtolower($_GET['r'] ?? ''));
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    start_session();

    $public = [
        'session.csrf' => 'GET', 'auth.signup' => 'POST', 'auth.login' => 'POST', 'auth.demo' => 'POST', 'auth.logout' => 'POST',
    ];
    $routes = [
        'auth.me' => 'GET', 'session.ping' => 'POST',
        'dashboard' => 'GET',
        'accounts.list' => 'GET', 'accounts.get' => 'GET', 'accounts.export' => 'GET', 'accounts.rename' => 'POST', 'accounts.reveal' => 'POST',
        'transfer.create' => 'POST',
        'p2p.lookup' => 'POST', 'p2p.send' => 'POST', 'p2p.recent' => 'GET',
        'payees.list' => 'GET', 'payees.add' => 'POST', 'payees.delete' => 'POST',
        'bills.pay' => 'POST', 'bills.cancel' => 'POST',
        'deposit.create' => 'POST',
        'cards.list' => 'GET', 'cards.update' => 'POST', 'cards.replace' => 'POST',
        'goals.list' => 'GET', 'goals.create' => 'POST', 'goals.contribute' => 'POST', 'goals.delete' => 'POST',
        'statements.get' => 'GET',
        'notifications.list' => 'GET', 'notifications.read' => 'POST',
        'settings.get' => 'GET', 'settings.profile' => 'POST', 'settings.password' => 'POST',
        'settings.alerts' => 'POST', 'settings.signout_all' => 'POST', 'settings.close' => 'POST',
    ];

    $expected = $public[$route] ?? $routes[$route] ?? null;
    if ($expected === null) fail('Not found.', 404);
    if ($method !== $expected) fail('Method not allowed.', 405);
    if ($method === 'POST') csrf_check();

    $user = null;
    if (!isset($public[$route])) {
        $user = current_user();
        process_user((int)$user['id']);
        if ($method === 'POST' && $route !== 'session.ping') rate_limit('u' . $user['id'], 60, 60);
    }

    $handler = 'r_' . str_replace('.', '_', $route);
    $handler($user);
} catch (BankError $e) {
    fail($e->getMessage());
} catch (Throwable $e) {
    error_log('[axiomate] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    fail('Something went wrong on our side. Please try again.', 500);
}

function user_out(array $u): array
{
    return [
        'id' => (int)$u['id'], 'email' => $u['email'], 'first_name' => $u['first_name'], 'last_name' => $u['last_name'],
        'phone' => $u['phone'], 'member_since' => (int)$u['member_since'], 'is_demo' => (bool)$u['is_demo'],
        'last_login_at' => (int)($_SESSION['prev_login'] ?? 0),
    ];
}

function account_out(array $a, bool $full = false): array
{
    $o = [
        'id' => (int)$a['id'], 'type' => $a['type'], 'nickname' => $a['nickname'],
        'mask' => substr($a['number'], -4),
        'balance' => (int)$a['balance_cents'], 'available' => available_cents($a),
        'credit_limit' => (int)$a['credit_limit_cents'], 'apy_bps' => (int)$a['apy_bps'],
        'opened_at' => (int)$a['created_at'],
    ];
    if ($full) $o['pending'] = pending_debits((int)$a['id']);
    return $o;
}

function txn_out(array $t): array
{
    return [
        'id' => (int)$t['id'], 'account_id' => (int)$t['account_id'], 'amount' => (int)$t['amount_cents'],
        'balance_after' => $t['balance_after_cents'] === null ? null : (int)$t['balance_after_cents'],
        'description' => $t['description'], 'category' => $t['category'], 'type' => $t['type'],
        'status' => $t['status'], 'memo' => $t['memo'], 'ref' => $t['ref'], 'created_at' => (int)$t['created_at'],
        'account_name' => $t['nickname'] ?? null,
    ];
}

function user_accounts(int $uid): array
{
    $st = db()->prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY CASE type WHEN 'checking' THEN 1 WHEN 'savings' THEN 2 ELSE 3 END, id");
    $st->execute([$uid]);
    return $st->fetchAll();
}

function r_session_csrf(): void
{
    $u = current_user(false);
    json_out(['ok' => true, 'csrf' => $_SESSION['csrf'], 'signed_in' => (bool)$u]);
}

function r_session_ping(array $u): void
{
    json_out(['ok' => true]);
}

function sign_in(array $u): void
{
    session_regenerate_id(true);
    $_SESSION['uid'] = (int)$u['id'];
    $_SESSION['sv'] = (int)$u['session_version'];
    $_SESSION['last_seen'] = now();
    $_SESSION['prev_login'] = (int)$u['last_login_at'];
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    db()->prepare('UPDATE users SET last_login_at = ?, failed_logins = 0, locked_until = 0 WHERE id = ?')->execute([now(), $u['id']]);
    log_login((int)$u['id'], true);
}

function log_login(int $uid, bool $ok): void
{
    db()->prepare('INSERT INTO login_events (user_id, ip, user_agent, success, created_at) VALUES (?,?,?,?,?)')
        ->execute([$uid, client_ip(), mb_substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 300), $ok ? 1 : 0, now()]);
}

function validate_password(string $pw, string $email): void
{
    if (strlen($pw) < 10) fail('Password must be at least 10 characters.');
    if (strlen($pw) > 128) fail('Password is too long.');
    if (!preg_match('/[A-Za-z]/', $pw) || !preg_match('/\d/', $pw)) fail('Password needs at least one letter and one number.');
    $local = strtolower(strstr($email, '@', true) ?: $email);
    if (strlen($local) >= 4 && str_contains(strtolower($pw), $local)) fail('Password can\'t contain your email name.');
}

function create_user(string $email, string $pw, string $first, string $last, bool $demo): array
{
    return tx(function (PDO $pdo) use ($email, $pw, $first, $last, $demo) {
        $pdo->prepare('INSERT INTO users (email, password_hash, first_name, last_name, member_since, is_demo) VALUES (?,?,?,?,?,?)')
            ->execute([$email, password_hash($pw, PASSWORD_DEFAULT), $first, $last, now(), $demo ? 1 : 0]);
        $uid = (int)$pdo->lastInsertId();
        open_starter_accounts($uid);
        notify($uid, 'Welcome to Axiomate', 'Your checking, savings and rewards card are ready. Everything here is simulated, so explore freely.', 'success');
        $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([$uid]);
        return $st->fetch();
    });
}

function r_auth_signup(): void
{
    rate_limit('signup:' . client_ip(), 6, 3600);
    $first = str_in('first_name', 40);
    $last  = str_in('last_name', 40);
    $email = strtolower(str_in('email', 120));
    $pw    = (string)(input()['password'] ?? '');
    $name  = '/^[\p{L}][\p{L} \'.-]{0,39}$/u';
    if (!preg_match($name, $first) || !preg_match($name, $last)) fail('Enter your first and last name.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Enter a valid email address.');
    if (str_ends_with($email, '@demo.axiomatebank.com')) fail('That email domain is reserved.');
    validate_password($pw, $email);
    if (empty(input()['accept'])) fail('Please confirm you understand this is a concept bank.');

    $st = db()->prepare('SELECT 1 FROM users WHERE email = ?');
    $st->execute([$email]);
    if ($st->fetchColumn()) fail('An account with that email already exists. Try signing in.');

    $u = create_user($email, $pw, $first, $last, false);
    sign_in($u);
    json_out(['ok' => true, 'csrf' => $_SESSION['csrf']]);
}

function r_auth_demo(): void
{
    rate_limit('demo:' . client_ip(), 10, 3600);

    db()->prepare('DELETE FROM users WHERE is_demo = 1 AND member_since < ?')->execute([now() - 86400]);

    $firsts = ['Avery', 'Jordan', 'Riley', 'Morgan', 'Quinn', 'Taylor', 'Casey', 'Rowan'];
    $lasts  = ['Bennett', 'Carter', 'Ellis', 'Hayes', 'Monroe', 'Parker', 'Reyes', 'Sullivan'];
    $email  = 'guest-' . bin2hex(random_bytes(4)) . '@demo.axiomatebank.com';
    $u = create_user($email, bin2hex(random_bytes(24)), $firsts[array_rand($firsts)], $lasts[array_rand($lasts)], true);
    sign_in($u);
    json_out(['ok' => true, 'csrf' => $_SESSION['csrf']]);
}

function r_auth_login(): void
{
    rate_limit('login:' . client_ip(), 20, 900);
    $email = strtolower(str_in('email', 120));
    $pw = (string)(input()['password'] ?? '');
    $generic = 'That email and password don\'t match our records.';

    $st = db()->prepare('SELECT * FROM users WHERE email = ? AND is_demo = 0');
    $st->execute([$email]);
    $u = $st->fetch();
    if (!$u) {
        password_hash($pw, PASSWORD_DEFAULT);
        fail($generic);
    }
    if ((int)$u['locked_until'] > now()) {
        $mins = (int)ceil(((int)$u['locked_until'] - now()) / 60);
        fail("For your security, sign-in is locked for $mins more minute(s) after too many attempts.", 423);
    }
    if (!password_verify($pw, $u['password_hash'])) {
        $fails = (int)$u['failed_logins'] + 1;
        $lock = $fails >= MAX_FAILED_LOGINS ? now() + LOCKOUT_SECONDS : 0;
        db()->prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?')->execute([$lock ? 0 : $fails, $lock, $u['id']]);
        log_login((int)$u['id'], false);
        if ($lock) {
            notify((int)$u['id'], 'Sign-in locked', 'We locked sign-in for 15 minutes after several wrong passwords.', 'alert');
            fail('Too many wrong passwords. Sign-in is locked for 15 minutes.', 423);
        }
        $left = MAX_FAILED_LOGINS - $fails;
        fail($generic . ($left <= 2 ? " $left attempt(s) left before a 15-minute lock." : ''));
    }
    if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) {
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
    }
    sign_in($u);
    json_out(['ok' => true, 'csrf' => $_SESSION['csrf']]);
}

function r_auth_logout(): void
{
    end_session();
    json_out(['ok' => true, 'csrf' => $_SESSION['csrf']]);
}

function r_auth_me(array $u): void
{
    $st = db()->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0');
    $st->execute([$u['id']]);
    json_out(['ok' => true, 'user' => user_out($u), 'csrf' => $_SESSION['csrf'], 'unread' => (int)$st->fetchColumn(),
        'idle_seconds' => SESSION_IDLE_SECONDS]);
}

function r_dashboard(array $u): void
{
    $uid = (int)$u['id'];
    $pdo = db();
    $accounts = user_accounts($uid);
    $ids = array_map(fn($a) => (int)$a['id'], $accounts);
    $in = implode(',', $ids) ?: '0';

    $recent = $pdo->query("SELECT t.*, a.nickname FROM transactions t JOIN accounts a ON a.id = t.account_id
                           WHERE t.account_id IN ($in) AND t.status != 'failed' ORDER BY t.created_at DESC, t.id DESC LIMIT 8")->fetchAll();

    $months = [];
    for ($i = 5; $i >= 0; $i--) $months[gmdate('Y-m', strtotime(gmdate('Y-m-01') . " -$i months"))] = ['in' => 0, 'out' => 0];
    $since = strtotime(array_key_first($months) . '-01');
    $rows = $pdo->query("SELECT strftime('%Y-%m', created_at, 'unixepoch') m,
                                SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END) i,
                                SUM(CASE WHEN amount_cents < 0 THEN -amount_cents ELSE 0 END) o
                         FROM transactions WHERE account_id IN ($in) AND status = 'posted' AND category != 'Transfer' AND created_at >= $since
                         GROUP BY m")->fetchAll();
    foreach ($rows as $r) if (isset($months[$r['m']])) $months[$r['m']] = ['in' => (int)$r['i'], 'out' => (int)$r['o']];
    $cashflow = [];
    foreach ($months as $m => $v) $cashflow[] = ['month' => $m] + $v;

    $since30 = now() - 30 * 86400;
    $spend = $pdo->query("SELECT category, SUM(-amount_cents) total, COUNT(*) n FROM transactions
                          WHERE account_id IN ($in) AND amount_cents < 0 AND status != 'failed' AND category NOT IN ('Transfer') AND created_at >= $since30
                          GROUP BY category ORDER BY total DESC")->fetchAll();

    $cashIds = array_map(fn($a) => (int)$a['id'], array_filter($accounts, fn($a) => $a['type'] !== 'credit'));
    $trend = balance_trend($cashIds, 90);

    $st = $pdo->prepare("SELECT s.*, p.name payee FROM scheduled_payments s JOIN payees p ON p.id = s.payee_id
                         WHERE s.user_id = ? AND s.status = 'active' ORDER BY s.next_date LIMIT 4");
    $st->execute([$uid]);
    $upcoming = array_map(fn($s) => ['id' => (int)$s['id'], 'payee' => $s['payee'], 'amount' => (int)$s['amount_cents'],
        'date' => $s['next_date'], 'frequency' => $s['frequency']], $st->fetchAll());

    json_out([
        'ok' => true,
        'accounts' => array_map('account_out', $accounts),
        'recent' => array_map('txn_out', $recent),
        'cashflow' => $cashflow,
        'spending' => array_map(fn($r) => ['category' => $r['category'], 'total' => (int)$r['total'], 'count' => (int)$r['n']], $spend),
        'trend' => $trend,
        'upcoming' => $upcoming,
        'goals' => goals_for($uid),
    ]);
}

function balance_trend(array $accountIds, int $days): array
{
    if (!$accountIds) return [];
    $pdo = db();
    $start = strtotime(gmdate('Y-m-d', now() - ($days - 1) * 86400));
    $bal = [];
    foreach ($accountIds as $id) {
        $st = $pdo->prepare("SELECT balance_after_cents FROM transactions WHERE account_id = ? AND status = 'posted' AND created_at < ?
                             ORDER BY created_at DESC, id DESC LIMIT 1");
        $st->execute([$id, $start]);
        $bal[$id] = (int)($st->fetchColumn() ?: 0);
    }
    $in = implode(',', array_map('intval', $accountIds));
    $rows = $pdo->query("SELECT account_id, balance_after_cents b, created_at FROM transactions
                         WHERE account_id IN ($in) AND status = 'posted' AND created_at >= $start ORDER BY created_at, id")->fetchAll();
    $out = [];
    $i = 0;
    for ($d = 0; $d < $days; $d++) {
        $end = $start + ($d + 1) * 86400;
        while ($i < count($rows) && (int)$rows[$i]['created_at'] < $end) {
            $bal[(int)$rows[$i]['account_id']] = (int)$rows[$i]['b'];
            $i++;
        }
        $out[] = ['date' => gmdate('Y-m-d', $start + $d * 86400), 'balance' => array_sum($bal)];
    }
    return $out;
}

function r_accounts_list(array $u): void
{
    json_out(['ok' => true, 'accounts' => array_map('account_out', user_accounts((int)$u['id']))]);
}

function txn_filters(int $accountId): array
{
    $where = ['t.account_id = ?'];
    $args = [$accountId];
    $q = trim((string)($_GET['q'] ?? ''));
    if ($q !== '') { $where[] = '(t.description LIKE ? OR t.memo LIKE ? OR t.ref LIKE ?)'; $like = '%' . mb_substr($q, 0, 60) . '%'; array_push($args, $like, $like, $like); }
    $cat = trim((string)($_GET['category'] ?? ''));
    if ($cat !== '') { $where[] = 't.category = ?'; $args[] = mb_substr($cat, 0, 40); }
    $dir = $_GET['dir'] ?? '';
    if ($dir === 'in') $where[] = 't.amount_cents > 0';
    if ($dir === 'out') $where[] = 't.amount_cents < 0';
    foreach (['from' => '>=', 'to' => '<'] as $k => $op) {
        $v = $_GET[$k] ?? '';
        if (is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            $ts = strtotime($v . ' 00:00:00 UTC') + ($k === 'to' ? 86400 : 0);
            $where[] = "t.created_at $op ?";
            $args[] = $ts;
        }
    }
    return [implode(' AND ', $where), $args];
}

function r_accounts_get(array $u): void
{
    $a = account_for_user((int)($_GET['id'] ?? 0), (int)$u['id']);
    [$where, $args] = txn_filters((int)$a['id']);
    $limit = 40;
    $page = max(1, (int)($_GET['page'] ?? 1));
    $pdo = db();
    $st = $pdo->prepare("SELECT COUNT(*) FROM transactions t WHERE $where");
    $st->execute($args);
    $total = (int)$st->fetchColumn();
    $st = $pdo->prepare("SELECT t.* FROM transactions t WHERE $where ORDER BY t.created_at DESC, t.id DESC LIMIT $limit OFFSET " . (($page - 1) * $limit));
    $st->execute($args);
    $cats = $pdo->prepare('SELECT DISTINCT category FROM transactions WHERE account_id = ? ORDER BY category');
    $cats->execute([$a['id']]);
    $card = $pdo->prepare('SELECT last4, kind, frozen FROM cards WHERE account_id = ? AND status = ?');
    $card->execute([$a['id'], 'active']);

    json_out([
        'ok' => true,
        'account' => account_out($a, true),
        'transactions' => array_map('txn_out', $st->fetchAll()),
        'total' => $total, 'page' => $page, 'pages' => max(1, (int)ceil($total / $limit)),
        'categories' => $cats->fetchAll(PDO::FETCH_COLUMN),
        'card' => $card->fetch() ?: null,
        'trend' => balance_trend([(int)$a['id']], 60),
    ]);
}

function r_accounts_reveal(array $u): void
{
    $a = account_for_user(int_in('id'), (int)$u['id']);
    json_out(['ok' => true, 'number' => $a['number']]);
}

function r_accounts_export(array $u): void
{
    $a = account_for_user((int)($_GET['id'] ?? 0), (int)$u['id']);
    [$where, $args] = txn_filters((int)$a['id']);
    $st = db()->prepare("SELECT t.* FROM transactions t WHERE $where ORDER BY t.created_at DESC, t.id DESC");
    $st->execute($args);
    $name = 'axiomate-' . $a['type'] . '-' . substr($a['number'], -4) . '-' . gmdate('Ymd') . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $name . '"');
    header('Cache-Control: no-store');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Date', 'Description', 'Category', 'Type', 'Status', 'Amount', 'Balance', 'Memo', 'Reference']);
    $safe = fn($s) => preg_match('/^[=+\-@\t\r]/', (string)$s) ? "'" . $s : $s;
    while ($t = $st->fetch()) {
        fputcsv($out, [
            gmdate('Y-m-d H:i', (int)$t['created_at']), $safe($t['description']), $t['category'], $t['type'], $t['status'],
            number_format($t['amount_cents'] / 100, 2, '.', ''),
            $t['balance_after_cents'] === null ? '' : number_format($t['balance_after_cents'] / 100, 2, '.', ''),
            $safe($t['memo']), $t['ref'],
        ]);
    }
    exit;
}

function r_accounts_rename(array $u): void
{
    $a = account_for_user(int_in('id'), (int)$u['id']);
    $name = str_in('nickname', 40);
    if ($name === '') fail('Enter a nickname.');
    db()->prepare('UPDATE accounts SET nickname = ? WHERE id = ?')->execute([$name, $a['id']]);
    json_out(['ok' => true]);
}

function r_transfer_create(array $u): void
{
    $uid = (int)$u['id'];
    $from = account_for_user(int_in('from'), $uid);
    $to = account_for_user(int_in('to'), $uid);
    if ($from['id'] === $to['id']) fail('Choose two different accounts.');
    $amt = cents_in('amount', 5000000);
    $memo = str_in('memo', 80);
    $ref = new_ref();
    tx(function () use ($from, $to, $amt, $memo, $ref) {
        $toIsCard = $to['type'] === 'credit';
        post_txn((int)$from['id'], -$amt, ($toIsCard ? 'Payment to ' : 'Transfer to ') . $to['nickname'], 'Transfer', 'transfer', ['memo' => $memo, 'ref' => $ref]);
        post_txn((int)$to['id'], $amt, $toIsCard ? 'Payment — thank you' : 'Transfer from ' . $from['nickname'], 'Transfer', 'transfer', ['memo' => $memo, 'ref' => $ref]);
    });
    json_out(['ok' => true, 'ref' => $ref, 'amount' => $amt, 'from' => $from['nickname'], 'to' => $to['nickname']]);
}

function find_member(string $email, int $selfId): array
{
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Enter a valid email address.');
    $st = db()->prepare('SELECT id, first_name, last_name, email FROM users WHERE email = ?');
    $st->execute([strtolower($email)]);
    $r = $st->fetch();
    if (!$r) fail('No Axiomate member uses that email. Ask them to open a free account.');
    if ((int)$r['id'] === $selfId) fail('You can\'t send money to yourself. Use Transfer instead.');
    return $r;
}

function r_p2p_lookup(array $u): void
{
    rate_limit('lookup' . $u['id'], 20, 300);
    $r = find_member(str_in('email', 120), (int)$u['id']);
    json_out(['ok' => true, 'name' => $r['first_name'] . ' ' . mb_substr($r['last_name'], 0, 1) . '.']);
}

function r_p2p_send(array $u): void
{
    $uid = (int)$u['id'];
    $from = account_for_user(int_in('from'), $uid);
    if ($from['type'] === 'credit') fail('Send money from checking or savings.');
    $amt = cents_in('amount', 250000);
    $memo = str_in('memo', 80);
    $r = find_member(str_in('email', 120), $uid);

    $st = db()->prepare("SELECT COALESCE(SUM(-t.amount_cents),0) FROM transactions t JOIN accounts a ON a.id = t.account_id
                         WHERE a.user_id = ? AND t.type = 'p2p' AND t.amount_cents < 0 AND t.created_at >= ?");
    $st->execute([$uid, now() - 86400]);
    $sent = (int)$st->fetchColumn();
    if ($sent + $amt > 500000) fail('This would exceed your $5,000.00 daily send limit (' . money(500000 - $sent) . ' left today).');

    $st = db()->prepare("SELECT * FROM accounts WHERE user_id = ? AND type = 'checking' ORDER BY id LIMIT 1");
    $st->execute([$r['id']]);
    $dest = $st->fetch();
    if (!$dest) fail('That member can\'t receive money right now.');

    $ref = new_ref();
    $toName = $r['first_name'] . ' ' . $r['last_name'];
    $fromName = $u['first_name'] . ' ' . $u['last_name'];
    tx(function () use ($from, $dest, $amt, $memo, $ref, $toName, $fromName, $r) {
        post_txn((int)$from['id'], -$amt, 'Sent to ' . $toName, 'Payments', 'p2p', ['memo' => $memo, 'ref' => $ref]);
        post_txn((int)$dest['id'], $amt, 'Received from ' . $fromName, 'Payments', 'p2p', ['memo' => $memo, 'ref' => $ref]);
        notify((int)$r['id'], 'Money received', $fromName . ' sent you ' . money($amt) . ($memo ? ' — "' . $memo . '"' : '') . '.', 'success');
    });
    json_out(['ok' => true, 'ref' => $ref, 'amount' => $amt, 'to' => $toName]);
}

function r_p2p_recent(array $u): void
{
    $st = db()->prepare("SELECT DISTINCT substr(t.description, 9) name FROM transactions t JOIN accounts a ON a.id = t.account_id
                         WHERE a.user_id = ? AND t.type = 'p2p' AND t.amount_cents < 0 ORDER BY t.created_at DESC LIMIT 5");
    $st->execute([$u['id']]);
    json_out(['ok' => true, 'recent' => $st->fetchAll(PDO::FETCH_COLUMN)]);
}

function r_payees_list(array $u): void
{
    $pdo = db();
    $st = $pdo->prepare('SELECT * FROM payees WHERE user_id = ? ORDER BY name');
    $st->execute([$u['id']]);
    $payees = array_map(fn($p) => ['id' => (int)$p['id'], 'name' => $p['name'], 'category' => $p['category'], 'hint' => $p['account_hint']], $st->fetchAll());
    $st = $pdo->prepare("SELECT s.*, p.name payee, a.nickname account FROM scheduled_payments s JOIN payees p ON p.id = s.payee_id
                         JOIN accounts a ON a.id = s.account_id WHERE s.user_id = ? AND s.status = 'active' ORDER BY s.next_date");
    $st->execute([$u['id']]);
    $sched = array_map(fn($s) => ['id' => (int)$s['id'], 'payee' => $s['payee'], 'account' => $s['account'], 'amount' => (int)$s['amount_cents'],
        'date' => $s['next_date'], 'frequency' => $s['frequency'], 'memo' => $s['memo']], $st->fetchAll());
    $st = $pdo->prepare("SELECT t.* FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE a.user_id = ? AND t.type = 'bill'
                         ORDER BY t.created_at DESC LIMIT 8");
    $st->execute([$u['id']]);
    json_out(['ok' => true, 'payees' => $payees, 'scheduled' => $sched, 'history' => array_map('txn_out', $st->fetchAll())]);
}

function r_payees_add(array $u): void
{
    $name = str_in('name', 60);
    $cat = str_in('category', 30);
    $hint = preg_replace('/\D/', '', str_in('account_hint', 30));
    if (mb_strlen($name) < 2) fail('Enter the payee name.');
    $allowed = ['Utilities', 'Housing', 'Insurance', 'Loans', 'Subscriptions', 'Health', 'Education', 'Bills'];
    if (!in_array($cat, $allowed, true)) $cat = 'Bills';
    $st = db()->prepare('SELECT COUNT(*) FROM payees WHERE user_id = ?');
    $st->execute([$u['id']]);
    if ((int)$st->fetchColumn() >= 50) fail('You can save up to 50 payees.');
    db()->prepare('INSERT INTO payees (user_id, name, category, account_hint, created_at) VALUES (?,?,?,?,?)')
        ->execute([$u['id'], $name, $cat, substr($hint, -4), now()]);
    json_out(['ok' => true, 'id' => (int)db()->lastInsertId()]);
}

function r_payees_delete(array $u): void
{
    db()->prepare('DELETE FROM payees WHERE id = ? AND user_id = ?')->execute([int_in('id'), $u['id']]);
    json_out(['ok' => true]);
}

function r_bills_pay(array $u): void
{
    $uid = (int)$u['id'];
    $from = account_for_user(int_in('from'), $uid);
    $st = db()->prepare('SELECT * FROM payees WHERE id = ? AND user_id = ?');
    $st->execute([int_in('payee'), $uid]);
    $p = $st->fetch();
    if (!$p) fail('Choose a payee.');
    $amt = cents_in('amount', 2500000);
    $memo = str_in('memo', 80);
    $freq = str_in('frequency', 10);
    if (!in_array($freq, ['once', 'weekly', 'monthly'], true)) $freq = 'once';
    $date = str_in('date', 10);
    $today = gmdate('Y-m-d');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !strtotime($date)) $date = $today;

    if ($date < gmdate('Y-m-d', now() - 86400)) fail('Choose today or a future date.');
    if ($date < $today) $date = $today;
    if ($date > gmdate('Y-m-d', strtotime('+1 year'))) fail('You can schedule up to one year ahead.');

    if ($date === $today) {
        $ref = new_ref();
        tx(fn() => post_txn((int)$from['id'], -$amt, $p['name'], $p['category'], 'bill', ['memo' => $memo, 'ref' => $ref]));
        if ($freq !== 'once') {
            $next = (new DateTime($today))->modify($freq === 'weekly' ? '+1 week' : '+1 month')->format('Y-m-d');
            schedule_payment($uid, (int)$from['id'], (int)$p['id'], $amt, $next, $freq, $memo);
        }
        json_out(['ok' => true, 'paid' => true, 'ref' => $ref, 'amount' => $amt, 'payee' => $p['name']]);
    }
    schedule_payment($uid, (int)$from['id'], (int)$p['id'], $amt, $date, $freq, $memo);
    json_out(['ok' => true, 'paid' => false, 'amount' => $amt, 'payee' => $p['name'], 'date' => $date]);
}

function schedule_payment(int $uid, int $acct, int $payee, int $amt, string $date, string $freq, string $memo): void
{
    db()->prepare('INSERT INTO scheduled_payments (user_id, account_id, payee_id, amount_cents, next_date, frequency, memo, created_at) VALUES (?,?,?,?,?,?,?,?)')
        ->execute([$uid, $acct, $payee, $amt, $date, $freq, $memo, now()]);
}

function r_bills_cancel(array $u): void
{
    db()->prepare("UPDATE scheduled_payments SET status = 'cancelled' WHERE id = ? AND user_id = ?")->execute([int_in('id'), $u['id']]);
    json_out(['ok' => true]);
}

function r_deposit_create(array $u): void
{
    $uid = (int)$u['id'];
    $to = account_for_user(int_in('to'), $uid);
    if ($to['type'] === 'credit') fail('Deposit into checking or savings.');
    $amt = cents_in('amount', 500000);
    $st = db()->prepare("SELECT COALESCE(SUM(t.amount_cents),0) FROM transactions t JOIN accounts a ON a.id = t.account_id
                         WHERE a.user_id = ? AND t.type = 'deposit' AND t.description = 'Mobile check deposit' AND t.created_at >= ?");
    $st->execute([$uid, now() - 86400]);
    $today = (int)$st->fetchColumn();
    if ($today + $amt > 1000000) fail('Mobile deposits are limited to $10,000.00 per day (' . money(1000000 - $today) . ' left).');
    $checkNo = preg_replace('/\D/', '', str_in('check_number', 10));
    $ref = new_ref();
    tx(fn() => post_txn((int)$to['id'], $amt, 'Mobile check deposit', 'Deposit', 'deposit',
        ['memo' => $checkNo ? 'Check #' . $checkNo : '', 'ref' => $ref, 'pending_seconds' => 60]));
    json_out(['ok' => true, 'ref' => $ref, 'amount' => $amt, 'to' => $to['nickname']]);
}

function r_cards_list(array $u): void
{
    $st = db()->prepare("SELECT c.*, a.nickname, a.type acct_type FROM cards c JOIN accounts a ON a.id = c.account_id WHERE c.user_id = ? AND c.status = 'active' ORDER BY c.kind DESC");
    $st->execute([$u['id']]);
    $cards = array_map(fn($c) => [
        'id' => (int)$c['id'], 'kind' => $c['kind'], 'last4' => $c['last4'], 'exp' => $c['exp'], 'account' => $c['nickname'],
        'account_id' => (int)$c['account_id'], 'frozen' => (bool)$c['frozen'], 'online' => (bool)$c['online_enabled'],
        'intl' => (bool)$c['intl_enabled'], 'contactless' => (bool)$c['contactless_enabled'], 'daily_limit' => (int)$c['daily_limit_cents'],
        'holder' => strtoupper($u['first_name'] . ' ' . $u['last_name']),
    ], $st->fetchAll());
    json_out(['ok' => true, 'cards' => $cards]);
}

function card_for_user(int $id, int $uid): array
{
    $st = db()->prepare("SELECT * FROM cards WHERE id = ? AND user_id = ? AND status = 'active'");
    $st->execute([$id, $uid]);
    $c = $st->fetch();
    if (!$c) fail('Card not found.');
    return $c;
}

function r_cards_update(array $u): void
{
    $c = card_for_user(int_in('id'), (int)$u['id']);
    $in = input();
    $fields = ['frozen' => 'frozen', 'online' => 'online_enabled', 'intl' => 'intl_enabled', 'contactless' => 'contactless_enabled'];
    foreach ($fields as $k => $col) {
        if (array_key_exists($k, $in)) {
            db()->prepare("UPDATE cards SET $col = ? WHERE id = ?")->execute([$in[$k] ? 1 : 0, $c['id']]);
            if ($k === 'frozen') notify((int)$u['id'], $in[$k] ? 'Card locked' : 'Card unlocked',
                'Your card ending in ' . $c['last4'] . ($in[$k] ? ' is locked. New purchases will be declined.' : ' is active again.'), $in[$k] ? 'alert' : 'info');
        }
    }
    if (array_key_exists('daily_limit', $in)) {
        $limit = cents_in('daily_limit', 1000000);
        if ($limit < 10000) fail('Daily limit must be at least $100.00.');
        db()->prepare('UPDATE cards SET daily_limit_cents = ? WHERE id = ?')->execute([$limit, $c['id']]);
    }
    json_out(['ok' => true]);
}

function r_cards_replace(array $u): void
{
    $c = card_for_user(int_in('id'), (int)$u['id']);
    $reason = str_in('reason', 20);
    $last4 = sprintf('%04d', random_int(0, 9999));
    tx(function (PDO $pdo) use ($c, $last4) {
        $pdo->prepare("UPDATE cards SET status = 'replaced' WHERE id = ?")->execute([$c['id']]);
        $pdo->prepare('INSERT INTO cards (user_id, account_id, kind, last4, exp, online_enabled, intl_enabled, contactless_enabled, daily_limit_cents, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
            ->execute([$c['user_id'], $c['account_id'], $c['kind'], $last4, gmdate('m/y', strtotime('+4 years')), $c['online_enabled'], $c['intl_enabled'], $c['contactless_enabled'], $c['daily_limit_cents'], now()]);
    });
    notify((int)$u['id'], 'Replacement card ordered', 'Card ending in ' . $c['last4'] . ' is deactivated' . ($reason ? " ($reason)" : '') . '. Your new card ends in ' . $last4 . '.', 'info');
    json_out(['ok' => true, 'last4' => $last4]);
}

function goals_for(int $uid): array
{
    $st = db()->prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at');
    $st->execute([$uid]);
    return array_map(fn($g) => ['id' => (int)$g['id'], 'name' => $g['name'], 'emoji' => $g['emoji'], 'target' => (int)$g['target_cents'],
        'saved' => (int)$g['saved_cents'], 'target_date' => $g['target_date']], $st->fetchAll());
}

function r_goals_list(array $u): void
{
    json_out(['ok' => true, 'goals' => goals_for((int)$u['id'])]);
}

function r_goals_create(array $u): void
{
    $name = str_in('name', 40);
    if (mb_strlen($name) < 2) fail('Give your goal a name.');
    $target = cents_in('target', 100000000);
    $emoji = mb_substr(str_in('emoji', 8), 0, 2);
    $date = str_in('target_date', 10);
    if ($date !== '' && (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || $date <= gmdate('Y-m-d'))) fail('Target date must be in the future.');
    $st = db()->prepare('SELECT COUNT(*) FROM goals WHERE user_id = ?');
    $st->execute([$u['id']]);
    if ((int)$st->fetchColumn() >= 12) fail('You can have up to 12 goals.');
    db()->prepare('INSERT INTO goals (user_id, name, emoji, target_cents, target_date, created_at) VALUES (?,?,?,?,?,?)')
        ->execute([$u['id'], $name, $emoji, $target, $date, now()]);
    json_out(['ok' => true]);
}

function r_goals_contribute(array $u): void
{
    $uid = (int)$u['id'];
    $st = db()->prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?');
    $st->execute([int_in('id'), $uid]);
    $g = $st->fetch();
    if (!$g) fail('Goal not found.');
    $from = account_for_user(int_in('from'), $uid);
    if ($from['type'] !== 'checking') fail('Fund goals from a checking account.');
    $st = db()->prepare("SELECT * FROM accounts WHERE user_id = ? AND type = 'savings' ORDER BY id LIMIT 1");
    $st->execute([$uid]);
    $sav = $st->fetch();
    if (!$sav) fail('You need a savings account for goals.');
    $amt = cents_in('amount', 5000000);
    $ref = new_ref();
    tx(function (PDO $pdo) use ($from, $sav, $amt, $g, $ref) {
        post_txn((int)$from['id'], -$amt, 'Transfer to ' . $sav['nickname'], 'Transfer', 'transfer', ['memo' => 'Goal: ' . $g['name'], 'ref' => $ref]);
        post_txn((int)$sav['id'], $amt, 'Transfer from ' . $from['nickname'], 'Transfer', 'transfer', ['memo' => 'Goal: ' . $g['name'], 'ref' => $ref]);
        $pdo->prepare('UPDATE goals SET saved_cents = saved_cents + ? WHERE id = ?')->execute([$amt, $g['id']]);
    });
    if ((int)$g['saved_cents'] < (int)$g['target_cents'] && (int)$g['saved_cents'] + $amt >= (int)$g['target_cents']) {
        notify($uid, 'Goal reached', 'You hit your "' . $g['name'] . '" goal of ' . money((int)$g['target_cents']) . '. Nice work.', 'success');
    }
    json_out(['ok' => true, 'ref' => $ref]);
}

function r_goals_delete(array $u): void
{
    db()->prepare('DELETE FROM goals WHERE id = ? AND user_id = ?')->execute([int_in('id'), $u['id']]);
    json_out(['ok' => true]);
}

function r_statements_get(array $u): void
{
    $a = account_for_user((int)($_GET['id'] ?? 0), (int)$u['id']);
    $months = [];
    $cur = new DateTime(gmdate('Y-m-01', (int)$a['created_at']));
    $last = gmdate('Y-m');
    while ($cur->format('Y-m') <= $last) { array_unshift($months, $cur->format('Y-m')); $cur->modify('+1 month'); }

    $month = $_GET['month'] ?? $months[0];
    if (!in_array($month, $months, true)) $month = $months[0];
    $start = strtotime("$month-01 00:00:00 UTC");
    $end = strtotime("$month-01 00:00:00 UTC +1 month");

    $pdo = db();
    $st = $pdo->prepare("SELECT balance_after_cents FROM transactions WHERE account_id = ? AND status = 'posted' AND created_at < ? ORDER BY created_at DESC, id DESC LIMIT 1");
    $st->execute([$a['id'], $start]);
    $opening = (int)($st->fetchColumn() ?: 0);
    $st = $pdo->prepare("SELECT * FROM transactions WHERE account_id = ? AND status = 'posted' AND created_at >= ? AND created_at < ? ORDER BY created_at, id");
    $st->execute([$a['id'], $start, $end]);
    $txns = $st->fetchAll();
    $credits = 0; $debits = 0;
    foreach ($txns as $t) { if ($t['amount_cents'] > 0) $credits += $t['amount_cents']; else $debits -= $t['amount_cents']; }

    json_out([
        'ok' => true, 'months' => $months, 'month' => $month,
        'account' => account_out($a), 'holder' => $u['first_name'] . ' ' . $u['last_name'],
        'opening' => $opening, 'credits' => $credits, 'debits' => $debits, 'closing' => $opening + $credits - $debits,
        'transactions' => array_map('txn_out', $txns), 'complete' => $month !== $last,
    ]);
}

function r_notifications_list(array $u): void
{
    $st = db()->prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50');
    $st->execute([$u['id']]);
    json_out(['ok' => true, 'notifications' => array_map(fn($n) => ['id' => (int)$n['id'], 'kind' => $n['kind'], 'title' => $n['title'],
        'body' => $n['body'], 'read' => (bool)$n['is_read'], 'created_at' => (int)$n['created_at']], $st->fetchAll())]);
}

function r_notifications_read(array $u): void
{
    db()->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')->execute([$u['id']]);
    json_out(['ok' => true]);
}

function r_settings_get(array $u): void
{
    $st = db()->prepare('SELECT ip, user_agent, success, created_at FROM login_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 12');
    $st->execute([$u['id']]);
    json_out(['ok' => true, 'user' => user_out($u), 'alerts' => [
        'large_txn' => (bool)$u['alerts_large_txn'], 'low_balance' => (bool)$u['alerts_low_balance'], 'low_balance_threshold' => (int)$u['low_balance_cents'],
    ], 'logins' => array_map(fn($l) => ['ip' => $l['ip'], 'agent' => $l['user_agent'], 'success' => (bool)$l['success'], 'at' => (int)$l['created_at']], $st->fetchAll())]);
}

function r_settings_profile(array $u): void
{
    $first = str_in('first_name', 40);
    $last = str_in('last_name', 40);
    $phone = preg_replace('/[^\d+()\- ]/', '', str_in('phone', 20));
    $name = '/^[\p{L}][\p{L} \'.-]{0,39}$/u';
    if (!preg_match($name, $first) || !preg_match($name, $last)) fail('Enter your first and last name.');
    db()->prepare('UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE id = ?')->execute([$first, $last, $phone, $u['id']]);
    json_out(['ok' => true]);
}

function r_settings_password(array $u): void
{
    if ($u['is_demo']) fail('Guest demo profiles don\'t have a password. Create a free account to set one.');
    rate_limit('pw' . $u['id'], 5, 900);
    if (!password_verify((string)(input()['current'] ?? ''), $u['password_hash'])) fail('Your current password is incorrect.');
    $new = (string)(input()['new'] ?? '');
    validate_password($new, $u['email']);
    db()->prepare('UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?')
        ->execute([password_hash($new, PASSWORD_DEFAULT), $u['id']]);
    $_SESSION['sv'] = (int)$u['session_version'] + 1;
    notify((int)$u['id'], 'Password changed', 'Your password was changed and other devices were signed out.', 'alert');
    json_out(['ok' => true]);
}

function r_settings_alerts(array $u): void
{
    $in = input();
    $th = isset($in['low_balance_threshold']) ? cents_in('low_balance_threshold', 10000000) : (int)$u['low_balance_cents'];
    db()->prepare('UPDATE users SET alerts_large_txn = ?, alerts_low_balance = ?, low_balance_cents = ? WHERE id = ?')
        ->execute([!empty($in['large_txn']) ? 1 : 0, !empty($in['low_balance']) ? 1 : 0, $th, $u['id']]);
    json_out(['ok' => true]);
}

function r_settings_signout_all(array $u): void
{
    db()->prepare('UPDATE users SET session_version = session_version + 1 WHERE id = ?')->execute([$u['id']]);
    end_session();
    json_out(['ok' => true]);
}

function r_settings_close(array $u): void
{
    if (!$u['is_demo'] && !password_verify((string)(input()['password'] ?? ''), $u['password_hash'])) fail('Your password is incorrect.');
    db()->prepare('DELETE FROM users WHERE id = ?')->execute([$u['id']]);
    end_session();
    json_out(['ok' => true]);
}
