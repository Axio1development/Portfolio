<?php
 

declare(strict_types=1);

const HUB_TICKET_TYPES = ['support', 'scam', 'rules', 'marketplace', 'jobs', 'other'];
 
const HUB_COSMETICS = [
    'effect' => ['smoke', 'petals', 'arise', 'lightning', 'snow', 'embers', 'stars', 'scan', 'aura', 'rain'],
    'deco' => ['shadow-flame', 'blossom-wreath', 'system-frame', 'crown', 'halo', 'lightning', 'rune', 'monarch', 'frost', 'ember'],
    'plate' => ['shadow-mist', 'blossom', 'system-grid', 'gate', 'aurora', 'ember', 'starfield', 'glitch', 'gold', 'void'],
    'namestyle' => ['violet', 'blossom', 'system', 'monarch', 'fire', 'ice', 'gold', 'rainbow', 'glitch', 'chrome'],
];
function hub_need_login(): array { $c = hub_auth(); if (!$c) fail('Please sign in first.', 401); return $c; }
function hub_need_post(array $c): void { $g = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null; if (!is_string($g) || !hash_equals($c['csrf'], $g)) fail('Session expired. Refresh the app and try again.', 403); }
function hub_look(array $r): array {
    return ['deco' => (string)($r['hub_deco'] ?? ''), 'plate' => (string)($r['hub_plate'] ?? ''), 'namestyle' => (string)($r['hub_namestyle'] ?? '')];
}

function hub_device(string $ua): string {
    $b = preg_match('/Edg\//', $ua) ? 'Edge' : (preg_match('/OPR\/|Opera/', $ua) ? 'Opera' : (preg_match('/Chrome\//', $ua) ? 'Chrome' : (preg_match('/Firefox\//', $ua) ? 'Firefox' : (preg_match('/Safari\//', $ua) ? 'Safari' : 'a browser'))));
    $o = preg_match('/Windows/', $ua) ? 'Windows' : (preg_match('/iPhone|iPad/', $ua) ? 'iPhone / iPad' : (preg_match('/Android/', $ua) ? 'Android' : (preg_match('/Mac OS X/', $ua) ? 'Mac' : (preg_match('/Linux/', $ua) ? 'Linux' : 'a computer'))));
    return $b . ' on ' . $o;
}
const HUB_STATUSES = ['online', 'idle', 'dnd', 'invisible'];
const HUB_PREFS = ['dm_from' => 'everyone', 'fr_from' => 'everyone', 'theme' => 'shadow', 'compact' => false, 'font' => 100, 'notify' => true];
function hub_avatar_of(array $r, string $idKey = 'id'): ?string {
    if (!empty($r['hub_avatar_at'])) return '/api/hub/avatar/' . (int)$r[$idKey] . '?v=' . strtotime((string)$r['hub_avatar_at'] . ' UTC');
    return !empty($r['avatar']) ? avatar_url((string)$r['discord_id'], (string)$r['avatar'], 128) : null;
}
function hub_prefs(array $u): array {
    $p = json_decode((string)($u['hub_prefs'] ?? ''), true);
    return array_merge(HUB_PREFS, is_array($p) ? array_intersect_key($p, HUB_PREFS) : []);
}
 
function hub_presence(array $r): string {
    if (($r['hub_seen'] ?? '') <= gmdate('Y-m-d H:i:s', time() - 300)) return 'offline';
    $s = (string)($r['hub_status'] ?? 'online');
    return $s === 'invisible' ? 'offline' : (in_array($s, HUB_STATUSES, true) ? $s : 'online');
}
function hub_author(array $r): array {
    $owner = (string)setting('owner_discord_id');
    $role = $owner !== '' && $owner === (string)$r['discord_id'] ? 'owner' : (string)($r['staff_role'] ?? '');
    return ['id' => (int)$r['user_id'], 'name' => (string)(($r['hub_name'] ?? '') ?: $r['username']), 'username' => (string)$r['username'], 'avatar' => hub_avatar_of($r, 'user_id'),
        'roblox' => !empty($r['roblox_verified_at']) ? (string)$r['roblox_username'] : null, 'staff' => $role, 'roles' => hub_role_ids((int)$r['user_id'])] + hub_look($r);
}
const HUB_MSG_SQL = 'SELECT m.*, u.username, u.avatar, u.discord_id, u.hub_discord_id, u.roblox_username, u.roblox_verified_at, u.hub_name, u.hub_avatar_at, u.hub_deco, u.hub_plate, u.hub_namestyle, s.role AS staff_role FROM chat_messages m JOIN users u ON u.id=m.user_id LEFT JOIN staff s ON s.discord_id=u.discord_id';
function hub_pair(int $x, int $y): array { return $x < $y ? [$x, $y] : [$y, $x]; }
function hub_friendship(int $me, int $other): ?array { [$a, $z] = hub_pair($me, $other); return one('SELECT * FROM friends WHERE user_a=? AND user_b=?', [$a, $z]) ?: null; }
function hub_blocked(int $x, int $y): bool { return (bool)one('SELECT 1 AS x FROM blocks WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)', [$x, $y, $y, $x]); }
function hub_relation(int $me, int $other): string {
    if (one('SELECT 1 AS x FROM blocks WHERE user_id=? AND blocked_id=?', [$me, $other])) return 'blocked';
    $f = hub_friendship($me, $other);
    if (!$f) return 'none';
    if ($f['status'] === 'accepted') return 'friends';
    return (int)$f['requester'] === $me ? 'outgoing' : 'incoming';
}
function hub_msg(array $r): array {
    return ['id' => (int)$r['id'], 'body' => (int)$r['deleted'] ? '' : (string)$r['body'], 'deleted' => (bool)(int)$r['deleted'], 'at' => (string)$r['created_at'],
        'edited' => (string)($r['edited_at'] ?? ''), 'reply_to' => $r['reply_to'] ? (int)$r['reply_to'] : null, 'author' => hub_author($r)];
}
 
function hub_servers(array $u): array {
    return array_values(array_filter(all('SELECT * FROM hub_servers ORDER BY position, id'), fn($s) => hub_server_visible($u, $s)));
}
function hub_channels(array $u): array {
    $ok = array_flip(array_map(fn($s) => (int)$s['id'], hub_servers($u)));
    return array_values(array_filter(all('SELECT * FROM chat_channels ORDER BY server_id, position, id'), fn($c) => isset($ok[(int)$c['server_id']]) && hub_can_view($u, $c)));
}
function hub_channel(int $id, array $u): array {
    $c = one('SELECT * FROM chat_channels WHERE id=?', [$id]);
    $srv = $c ? one('SELECT * FROM hub_servers WHERE id=?', [(int)$c['server_id']]) : null;
    if (!$c || !$srv || !hub_server_visible($u, $srv) || !hub_can_view($u, $c)) fail('That channel does not exist.', 404);
    return $c;
}
 
function hub_listing(array $l): array {
    $app = null;
    if (!empty($l['app_login'])) $app = (int)$l['user_id'];
    elseif (preg_match('/^\d+$/', (string)($l['discord_id'] ?? ''))) $app = (int)(one('SELECT id FROM users WHERE app_login IS NOT NULL AND hub_discord_id=? ORDER BY id LIMIT 1', [(string)$l['discord_id']])['id'] ?? 0) ?: null;
    $card = $app ? one('SELECT * FROM users WHERE id=?', [$app]) : null;
    return ['id' => (int)$l['id'], 'title' => (string)$l['title'], 'category' => (string)$l['category'], 'description' => (string)$l['description'], 'price' => (string)$l['price_text'],
        'status' => (string)$l['status'], 'at' => (string)($l['reposted_at'] ?: $l['created_at']), 'source' => (string)($l['source'] ?? ''),
        'seller' => $card ? hub_user_card($card) : ['id' => 0, 'name' => (string)($l['username'] ?? 'Unknown'), 'username' => (string)($l['username'] ?? ''), 'avatar' => null, 'roblox' => !empty($l['roblox_verified_at']) ? (string)$l['roblox_username'] : null],
        'seller_app' => $app, 'seller_discord' => preg_match('/^\d+$/', (string)($l['discord_id'] ?? '')) ? (string)$l['discord_id'] : ''];
}
const HUB_LISTING_SQL = 'SELECT l.*, u.username, u.discord_id, u.app_login, u.roblox_username, u.roblox_verified_at FROM listings l LEFT JOIN users u ON u.id=l.user_id';
const HUB_LISTING_CATS = ['help' => 'Help', 'commission' => 'Commissions', 'hiring' => 'Hiring', 'other' => 'Other'];
function hub_dm(int $id, array $u): array {
    $d = one('SELECT * FROM chat_dms WHERE id=?', [$id]);
    if (!$d || ((int)$d['user_a'] !== (int)$u['id'] && (int)$d['user_b'] !== (int)$u['id'])) fail('That conversation does not exist.', 404);
    return $d;
}
function hub_unread(int $uid, string $key, string $col, int $id): int {
    $last = (int)(one('SELECT last_id FROM chat_reads WHERE user_id=? AND k=?', [$uid, $key])['last_id'] ?? 0);
    return (int)one("SELECT COUNT(*) AS n FROM chat_messages WHERE $col=? AND id>? AND deleted=0 AND user_id<>?", [$id, $last, $uid])['n'];
}
function hub_mark_read(int $uid, string $key, int $lastId): void {
    if ($lastId <= 0) return;
    $cur = one('SELECT last_id FROM chat_reads WHERE user_id=? AND k=?', [$uid, $key]);
    if (!$cur) insert('chat_reads', ['user_id' => $uid, 'k' => $key, 'last_id' => $lastId]);
    elseif ((int)$cur['last_id'] < $lastId) q('UPDATE chat_reads SET last_id=? WHERE user_id=? AND k=?', [$lastId, $uid, $key]);
}
function hub_user_card(array $r): array {
    return ['id' => (int)$r['id'], 'name' => (string)(($r['hub_name'] ?? '') ?: $r['username']), 'username' => (string)$r['username'], 'avatar' => hub_avatar_of($r),
        'roblox' => !empty($r['roblox_verified_at']) ? (string)$r['roblox_username'] : null, 'status' => hub_presence($r), 'custom_status' => (string)($r['hub_custom_status'] ?? ''), 'roles' => hub_role_ids((int)$r['id'])] + hub_look($r);
}

if (str_starts_with($path, 'hub/')) {
    $hp = substr($path, 4);
    $b = body();

     
    if ($hp === 'qr/start' && $m === 'POST') {
        if (!rate('qr:' . ($_SERVER['REMOTE_ADDR'] ?? ''), 30, 600)) fail('Too many login codes. Wait a few minutes.', 429);
        q('DELETE FROM qr_logins WHERE expires_at < ?', [gmdate('Y-m-d H:i:s', time() - 3600)]);
        $tok = bin2hex(random_bytes(16)); $sec = bin2hex(random_bytes(16));
        insert('qr_logins', ['token_hash' => hash('sha256', $tok), 'secret_hash' => hash('sha256', $sec), 'status' => 'pending', 'device' => hub_device((string)($_SERVER['HTTP_USER_AGENT'] ?? '')),
            'ip' => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64), 'created_at' => now(), 'expires_at' => gmdate('Y-m-d H:i:s', time() + 120)]);
        json_out(['ok' => true, 'token' => $tok, 'secret' => $sec, 'url' => base_url() . '/hub?qr=' . $tok, 'expires_in' => 120]);
    }
    if ($hp === 'qr/status' && $m === 'GET') {
        $r = one('SELECT * FROM qr_logins WHERE token_hash=?', [hash('sha256', (string)($_GET['token'] ?? ''))]);
        if (!$r || !hash_equals((string)$r['secret_hash'], hash('sha256', (string)($_GET['secret'] ?? '')))) fail('Unknown code.', 404);
        if ($r['status'] === 'approved' && $r['user_id']) {
            q("UPDATE qr_logins SET status='used' WHERE id=? AND status='approved'", [$r['id']]);
            hub_login_user((int)$r['user_id']);    
            json_out(['ok' => true, 'status' => 'approved']);
        }
        $st = $r['status'] === 'pending' && $r['expires_at'] < now() ? 'expired' : (string)$r['status'];
        json_out(['ok' => true, 'status' => $st, 'scanned' => $r['status'] === 'scanned']);
    }
    if (preg_match('#^qr/(info|approve)$#', $hp, $mm)) {
        $c = hub_need_login();
        $r = one('SELECT * FROM qr_logins WHERE token_hash=?', [hash('sha256', (string)($_GET['token'] ?? $b['token'] ?? ''))]);
        if (!$r || !in_array($r['status'], ['pending', 'scanned'], true) || $r['expires_at'] < now()) fail('This login code has expired. Show a new one on the other device.', 410);
        if ($mm[1] === 'info') {
            q("UPDATE qr_logins SET status='scanned' WHERE id=? AND status='pending'", [$r['id']]);
            json_out(['ok' => true, 'device' => (string)$r['device'], 'created_at' => (string)$r['created_at']]);
        }
        hub_need_post($c);
        $yes = !empty($b['approve']);
        q('UPDATE qr_logins SET status=?, user_id=? WHERE id=?', [$yes ? 'approved' : 'denied', $yes ? (int)$c['user']['id'] : null, $r['id']]);
        if ($yes) audit((string)$c['user']['username'], 'hub.qr-login', (string)$r['device']);
        json_out(['ok' => true]);
    }

    if (preg_match('#^avatar/(\d+)$#', $hp, $mm) && $m === 'GET') {
        $a = one('SELECT mime, data FROM hub_avatars WHERE user_id=?', [(int)$mm[1]]);
        if (!$a) { http_response_code(404); exit; }
        header('Content-Type: ' . $a['mime']); header('Cache-Control: public, max-age=86400'); header('X-Content-Type-Options: nosniff');
        echo base64_decode((string)$a['data']); exit;
    }
    if (preg_match('#^server-icon/(\d+)$#', $hp, $mm) && $m === 'GET') {
        $a = one('SELECT mime, data FROM hub_server_icons WHERE server_id=?', [(int)$mm[1]]);
        if (!$a) { http_response_code(404); exit; }
        header('Content-Type: ' . $a['mime']); header('Cache-Control: public, max-age=86400'); header('X-Content-Type-Options: nosniff');
        echo base64_decode((string)$a['data']); exit;
    }
    if (preg_match('#^banner/(\d+)$#', $hp, $mm) && $m === 'GET') {
        $a = one('SELECT mime, data FROM hub_banners WHERE user_id=?', [(int)$mm[1]]);
        if (!$a) { http_response_code(404); exit; }
        header('Content-Type: ' . $a['mime']); header('Cache-Control: public, max-age=86400'); header('X-Content-Type-Options: nosniff');
        echo base64_decode((string)$a['data']); exit;
    }

     
    $ip = substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64);
    if ($hp === 'auth/check' && $m === 'POST') {
        $p = hub_username_problem(trim((string)($b['username'] ?? '')));
        json_out(['ok' => true, 'available' => $p === null, 'problem' => $p]);
    }
    if ($hp === 'auth/register' && $m === 'POST') {
        if (!rate('hubreg:' . $ip, 5, 3600)) fail('Too many new accounts from your network. Try again later.', 429);
        $name = trim((string)($b['username'] ?? '')); $pw = (string)($b['password'] ?? ''); $email = strtolower(trim((string)($b['email'] ?? '')));
        if ($p = hub_username_problem($name)) fail($p);
        if ($p = hub_password_problem($pw, $name)) fail($p);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) fail('Enter a real email address. You will get a code there.');
        if (one("SELECT id FROM users WHERE app_login IS NOT NULL AND LOWER(email)=?", [$email])) fail('That email already has an account. Sign in, or reset your password.');
        $id = insert('users', ['discord_id' => 'app-' . bin2hex(random_bytes(10)), 'username' => $name, 'app_login' => strtolower($name), 'password_hash' => password_hash($pw, PASSWORD_DEFAULT),
            'email' => $email, 'created_at' => now(), 'last_login_at' => now()]);
        hub_login_user($id);
        $sent = hub_send_code(one('SELECT * FROM users WHERE id=?', [$id]), 'verify');
        audit($name, 'hub.register', 'app account #' . $id . ($sent ? '' : ' (the code email failed)'));
        json_out(['ok' => true, 'email_sent' => $sent]);
    }
    if ($hp === 'auth/login' && $m === 'POST') {
        $login = strtolower(trim((string)($b['username'] ?? '')));
        if (!rate('hublogin:' . $ip, 20, 900) || !rate('hublogin:' . $login, 8, 900)) fail('Too many sign-in attempts. Wait 15 minutes and try again.', 429);
        $u = $login !== '' ? one('SELECT * FROM users WHERE app_login=? OR (app_login IS NOT NULL AND LOWER(email)=?) ORDER BY id LIMIT 1', [$login, $login]) : null;
        if (!$u || !password_verify((string)($b['password'] ?? ''), (string)$u['password_hash'])) fail('That username or password is not right.', 401);
        if ((int)$u['banned'] === 1) fail('This account is banned.', 403);
        if (password_needs_rehash((string)$u['password_hash'], PASSWORD_DEFAULT)) q('UPDATE users SET password_hash=? WHERE id=?', [password_hash((string)$b['password'], PASSWORD_DEFAULT), $u['id']]);
        if (!empty($u['totp_enabled_at'])) {
            $t = bin2hex(random_bytes(24));
            q('DELETE FROM hub_pending WHERE expires_at < ?', [now()]);
            insert('hub_pending', ['token_hash' => hash('sha256', $t), 'user_id' => (int)$u['id'], 'expires_at' => gmdate('Y-m-d H:i:s', time() + 300)]);
            json_out(['ok' => true, 'two_factor' => true, 'ticket' => $t]);
        }
        hub_login_user((int)$u['id']);
        json_out(['ok' => true]);
    }
    if ($hp === 'auth/2fa' && $m === 'POST') {
        $p = one('SELECT * FROM hub_pending WHERE token_hash=?', [hash('sha256', (string)($b['ticket'] ?? ''))]);
        if (!$p || $p['expires_at'] < now() || (int)$p['tries'] >= 5) fail('That sign-in took too long. Enter your username and password again.', 410);
        q('UPDATE hub_pending SET tries=tries+1 WHERE id=?', [$p['id']]);
        $u = one('SELECT * FROM users WHERE id=?', [(int)$p['user_id']]);
        if (!$u || !hub_second_factor_ok($u, (string)($b['code'] ?? ''))) fail('That code is not right. Use the 6 digit code from your authenticator app, or a backup code.', 401);
        q('DELETE FROM hub_pending WHERE id=?', [$p['id']]);
        hub_login_user((int)$u['id']);
        json_out(['ok' => true]);
    }
    if ($hp === 'auth/forgot' && $m === 'POST') {
        $login = strtolower(trim((string)($b['username'] ?? '')));
        if (!rate('hubforgot:' . $ip, 6, 3600)) fail('Too many requests. Try again later.', 429);
        $u = $login !== '' ? one('SELECT * FROM users WHERE (app_login=? OR (app_login IS NOT NULL AND LOWER(email)=?)) AND email_verified_at IS NOT NULL ORDER BY id LIMIT 1', [$login, $login]) : null;
        if ($u) hub_send_code($u, 'reset');
        json_out(['ok' => true]);    
    }
    if ($hp === 'auth/reset' && $m === 'POST') {
        $login = strtolower(trim((string)($b['username'] ?? '')));
        if (!rate('hubreset:' . $ip, 10, 3600)) fail('Too many attempts. Try again later.', 429);
        $u = $login !== '' ? one('SELECT * FROM users WHERE app_login=? OR (app_login IS NOT NULL AND LOWER(email)=?) ORDER BY id LIMIT 1', [$login, $login]) : null;
        if (!$u || empty($u['reset_code_hash']) || $u['reset_code_expires'] < now() || !hash_equals((string)$u['reset_code_hash'], hub_code_hash((int)$u['id'], (string)($b['code'] ?? '')))) fail('That code is not right or has expired. Ask for a new one.', 401);
        if ($p = hub_password_problem((string)($b['password'] ?? ''), (string)$u['username'])) fail($p);
        q("UPDATE users SET password_hash=?, reset_code_hash=NULL, reset_code_expires=NULL WHERE id=?", [password_hash((string)$b['password'], PASSWORD_DEFAULT), $u['id']]);
        q("DELETE FROM sessions WHERE user_id=? AND kind='hub'", [$u['id']]);
        audit((string)$u['username'], 'hub.password-reset', '');
        if (!empty($u['totp_enabled_at'])) json_out(['ok' => true, 'signin' => true]);    
        hub_login_user((int)$u['id']);
        json_out(['ok' => true]);
    }
    if ($hp === 'config' && $m === 'GET') {
        header('Cache-Control: public, max-age=60');
        json_out(['ok' => true, 'app' => hub_cfg()]);
    }

    $c = hub_need_login(); $u = $c['user']; $uid = (int)$u['id']; $rank = staff_rank($u);
    $verified = !empty($u['email_verified_at']);
    if (!$verified && !in_array($hp, ['state', 'logout', 'email/send', 'email/verify', 'email/change'], true)) fail('Verify your email first.', 403);

    if ($hp === 'logout' && $m === 'POST') { hub_need_post($c); hub_logout(); json_out(['ok' => true]); }
    if ($hp === 'email/send' && $m === 'POST') {
        hub_need_post($c);
        if ($verified) json_out(['ok' => true]);
        if (!rate('hubmail:' . $uid, 5, 3600)) fail('You asked for a lot of codes. Wait a while and try again.', 429);
        if (!hub_send_code($u, 'verify')) fail('The email could not be sent right now. Staff have been told; try again in a few minutes, or ask a staff member to verify you.', 502);
        json_out(['ok' => true]);
    }
    if ($hp === 'email/verify' && $m === 'POST') {
        hub_need_post($c);
        if ($verified) json_out(['ok' => true]);
        if ((int)$u['email_code_tries'] >= 6 || empty($u['email_code_hash']) || $u['email_code_expires'] < now()) fail('That code expired. Send a new one.', 410);
        q('UPDATE users SET email_code_tries=email_code_tries+1 WHERE id=?', [$uid]);
        if (!hash_equals((string)$u['email_code_hash'], hub_code_hash($uid, (string)($b['code'] ?? '')))) fail('That code is not right. Check the email and try again.', 401);
        q('UPDATE users SET email_verified_at=?, email_code_hash=NULL, email_code_expires=NULL WHERE id=?', [now(), $uid]);
        json_out(['ok' => true]);
    }
    if ($hp === 'email/change' && $m === 'POST') {
        hub_need_post($c);
        $email = strtolower(trim((string)($b['email'] ?? '')));
        if (!password_verify((string)($b['password'] ?? ''), (string)$u['password_hash'])) fail('Your password is not right.', 401);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Enter a real email address.');
        if (one('SELECT id FROM users WHERE app_login IS NOT NULL AND LOWER(email)=? AND id<>?', [$email, $uid])) fail('That email already has an account.');
        q('UPDATE users SET email=?, email_verified_at=NULL WHERE id=?', [$email, $uid]);
        $sent = hub_send_code(one('SELECT * FROM users WHERE id=?', [$uid]), 'verify');
        json_out(['ok' => true, 'email_sent' => $sent]);
    }
    if ($hp === 'password' && $m === 'POST') {
        hub_need_post($c);
        if (!password_verify((string)($b['current'] ?? ''), (string)$u['password_hash'])) fail('Your current password is not right.', 401);
        if ($p = hub_password_problem((string)($b['password'] ?? ''), (string)$u['username'])) fail($p);
        q('UPDATE users SET password_hash=? WHERE id=?', [password_hash((string)$b['password'], PASSWORD_DEFAULT), $uid]);
        q("DELETE FROM sessions WHERE user_id=? AND kind='hub' AND id<>?", [$uid, $c['sid']]);
        json_out(['ok' => true]);
    }
     
    if ($hp === '2fa/setup' && $m === 'POST') {
        hub_need_post($c);
        if (!empty($u['totp_enabled_at'])) fail('Two-factor authentication is already on.', 409);
        $secret = b32_encode(random_bytes(20));
        q('UPDATE users SET totp_pending=? WHERE id=?', [enc($secret), $uid]);
        $issuer = rawurlencode(hub_cfg()['name']);
        json_out(['ok' => true, 'secret' => $secret, 'uri' => 'otpauth://totp/' . $issuer . ':' . rawurlencode((string)$u['username']) . '?secret=' . $secret . '&issuer=' . $issuer . '&digits=6&period=30']);
    }
    if ($hp === '2fa/enable' && $m === 'POST') {
        hub_need_post($c);
        $secret = dec((string)($u['totp_pending'] ?? ''));
        if ($secret === '') fail('Start again: press Set up two-factor.', 410);
        if (!totp_ok($secret, (string)($b['code'] ?? ''))) fail('That code is not right. Check the time on your phone and use the newest code.', 401);
        q('UPDATE users SET totp_secret=?, totp_pending=NULL, totp_enabled_at=? WHERE id=?', [enc($secret), now(), $uid]);
        audit((string)$u['username'], 'hub.2fa-on', '');
        json_out(['ok' => true, 'backup_codes' => hub_new_backup_codes($uid)]);
    }
    if (in_array($hp, ['2fa/disable', '2fa/backup'], true) && $m === 'POST') {
        hub_need_post($c);
        if (empty($u['totp_enabled_at'])) fail('Two-factor authentication is off.', 409);
        if (!hub_second_factor_ok($u, (string)($b['code'] ?? ''))) fail('That code is not right.', 401);
        if ($hp === '2fa/backup') json_out(['ok' => true, 'backup_codes' => hub_new_backup_codes($uid)]);
        if (!password_verify((string)($b['password'] ?? ''), (string)$u['password_hash'])) fail('Your password is not right.', 401);
        q('UPDATE users SET totp_secret=NULL, totp_enabled_at=NULL WHERE id=?', [$uid]); q('DELETE FROM hub_backup_codes WHERE user_id=?', [$uid]);
        audit((string)$u['username'], 'hub.2fa-off', '');
        json_out(['ok' => true]);
    }
     
    if ($hp === 'discord/link' && $m === 'GET') {
        [$cid, $sec] = discord_creds();
        if (!$cid || !$sec) {
            if (is_dev() && digits($_GET['dev_id'] ?? '') !== '') { q('UPDATE users SET hub_discord_id=? WHERE id=?', [digits($_GET['dev_id']), $uid]); header('Location: /hub?linked=1', true, 302); exit; }
            fail('Discord linking is not set up.', 503);
        }
        $state = bin2hex(random_bytes(16));
        set_cookie('axm_hlink', $state . '|' . $uid, 600);
        header('Location: https://discord.com/oauth2/authorize?' . http_build_query(['client_id' => $cid, 'redirect_uri' => base_url() . '/api/auth/callback', 'response_type' => 'code', 'scope' => 'identify', 'state' => $state, 'prompt' => 'none']), true, 302);
        exit;
    }
    if ($hp === 'discord/unlink' && $m === 'POST') { hub_need_post($c); q('UPDATE users SET hub_discord_id=NULL WHERE id=?', [$uid]); json_out(['ok' => true]); }
     
    if ($hp === 'roblox/start' && $m === 'POST') {
        hub_need_post($c);
        if (is_verified($u)) fail('Your Roblox account is already linked.', 409);
        if (!rate('rb:' . $uid, 10, 3600)) fail('Too many attempts. Try again in an hour.', 429);
        $rb = roblox_lookup(str($b['username'] ?? '', 40));
        if (!$rb) fail('We could not find that Roblox username. Check the spelling and try again.', 422);
        if (one('SELECT id FROM users WHERE roblox_id=? AND roblox_verified_at IS NOT NULL AND id<>? AND app_login IS NOT NULL', [$rb['id'], $uid])) fail('That Roblox account is already linked to another app account.', 409);
        $code = roblox_word_code();
        q('UPDATE users SET roblox_id=?, roblox_username=?, roblox_code=?, roblox_code_expires=? WHERE id=?', [$rb['id'], $rb['name'], $code, plus('+30 minutes'), $uid]);
        json_out(['ok' => true, 'username' => $rb['name'], 'code' => $code]);
    }
    if ($hp === 'roblox/verify' && $m === 'POST') {
        hub_need_post($c);
        if (is_verified($u)) json_out(['ok' => true]);
        if (empty($u['roblox_id']) || empty($u['roblox_code']) || ($u['roblox_code_expires'] ?? '') < now()) fail('Start again: enter your Roblox username to get a new code.', 410);
        if (!rate('rv:' . $uid, 12, 3600)) fail('Too many checks. Try again later.', 429);
        $desc = roblox_description((string)$u['roblox_id']);
        if ($desc === null) fail('We could not reach Roblox right now. Please try again in a moment.', 502);
        if (!roblox_code_found($desc, (string)$u['roblox_code'])) fail('We could not find the words in your Roblox About yet. Save them there and try again. If Roblox will not save them, press "Get new words", or use Sign in with Roblox.', 422);
        q('UPDATE users SET roblox_verified_at=?, roblox_code=NULL, roblox_code_expires=NULL WHERE id=?', [now(), $uid]);
        json_out(['ok' => true]);
    }

     
    if ($hp === 'state' && $m === 'GET') {
        if (($u['hub_seen'] ?? '') < gmdate('Y-m-d H:i:s', time() - 30)) q('UPDATE users SET hub_seen=? WHERE id=?', [now(), $uid]);
        $channels = array_map(fn($ch) => ['id' => (int)$ch['id'], 'server_id' => (int)$ch['server_id'], 'can_post' => hub_can_post($u, $ch), 'name' => (string)$ch['name'], 'topic' => (string)$ch['topic'], 'icon' => (string)($ch['icon'] ?? 'hash'), 'category' => (string)($ch['category'] ?? ''), 'staff_only' => (bool)(int)$ch['staff_only'],
            'read_only' => (bool)(int)$ch['read_only'], 'unread' => hub_unread($uid, 'c' . $ch['id'], 'channel_id', (int)$ch['id'])], hub_channels($u));
        $servers = hub_servers($u); $perms = [];
        foreach ($servers as $sv) $perms[(int)$sv['id']] = array_values(array_filter(array_keys(HUB_PERMS), fn($pp) => hub_has_perm($u, (int)$sv['id'], $pp)));
        $sids = array_map(fn($sv) => (int)$sv['id'], $servers);
        $roles = $sids ? array_map('hub_role_out', all('SELECT * FROM hub_roles WHERE server_id IN (' . implode(',', $sids) . ') ORDER BY server_id, position, id')) : [];
        $dms = [];
        foreach (all('SELECT * FROM chat_dms WHERE user_a=? OR user_b=? ORDER BY last_at DESC LIMIT 50', [$uid, $uid]) as $d) {
            $other = one('SELECT * FROM users WHERE id=?', [(int)$d['user_a'] === $uid ? (int)$d['user_b'] : (int)$d['user_a']]);
            if ($other) $dms[] = ['id' => (int)$d['id'], 'user' => hub_user_card($other), 'last_at' => (string)$d['last_at'], 'unread' => hub_unread($uid, 'd' . $d['id'], 'dm_id', (int)$d['id']),
                'online' => ($other['hub_seen'] ?? '') > gmdate('Y-m-d H:i:s', time() - 300)];
        }
        $online = array_values(array_filter(array_map('hub_user_card', all("SELECT * FROM users WHERE hub_seen > ? AND banned=0 AND app_login IS NOT NULL AND (hub_status IS NULL OR hub_status<>'invisible' OR id=?) ORDER BY username LIMIT 80", [gmdate('Y-m-d H:i:s', time() - 300), $uid])), fn($x) => true));
        $incoming = (int)one("SELECT COUNT(*) AS n FROM friends WHERE (user_a=? OR user_b=?) AND status='pending' AND requester<>?", [$uid, $uid, $uid])['n'];
        $t = $u['discord_id'] ? ticket_status((string)$u['discord_id']) : null;
        $muted = (string)($u['hub_muted_until'] ?? '') > now() ? (string)$u['hub_muted_until'] : '';
        $profile = ['name' => (string)(($u['hub_name'] ?? '') ?: $u['username']), 'display_name' => (string)($u['hub_name'] ?? ''), 'bio' => (string)($u['hub_bio'] ?? ''), 'pronouns' => (string)($u['hub_pronouns'] ?? ''),
            'banner' => (string)($u['hub_banner'] ?? ''), 'status' => (string)($u['hub_status'] ?? 'online'), 'custom_status' => (string)($u['hub_custom_status'] ?? ''), 'avatar' => hub_avatar_of($u), 'custom_avatar' => !empty($u['hub_avatar_at']), 'joined' => (string)$u['created_at']];
        $em = (string)$u['email']; $at = strpos($em, '@');
        $profile += ['login' => (string)($u['app_login'] ?? ''), 'email' => $at ? substr($em, 0, 2) . str_repeat('•', max(1, $at - 2)) . substr($em, $at) : $em, 'email_verified' => $verified,
            'two_factor' => !empty($u['totp_enabled_at']), 'backup_left' => (int)one('SELECT COUNT(*) AS n FROM hub_backup_codes WHERE user_id=? AND used_at IS NULL', [$uid])['n'],
            'discord_linked' => preg_match('/^\d+$/', (string)$u['discord_id']) === 1, 'effect' => (string)($u['hub_effect'] ?? ''), 'banner_img' => !empty($u['hub_banner_at']) ? '/api/hub/banner/' . $uid . '?v=' . strtotime((string)$u['hub_banner_at'] . ' UTC') : null] + hub_look($u);
        if (!$verified) json_out(['ok' => true, 'app' => hub_cfg(), 'csrf' => $c['csrf'], 'me' => $profile + ['id' => $uid, 'username' => (string)$u['username']], 'needs_email' => true]);
        json_out(['ok' => true, 'app' => hub_cfg(), 'me' => array_merge(public_user($u), ['rank' => $rank, 'muted_until' => $muted, 'roles' => hub_role_ids($uid)], $profile), 'prefs' => hub_prefs($u), 'friend_requests' => $incoming, 'csrf' => $c['csrf'], 'servers' => array_map('hub_server_out', $servers), 'roles' => $roles, 'perms' => (object)$perms, 'channels' => $channels, 'dms' => $dms, 'online' => $online,
            'ticket' => $t ? ['ref' => $t['ref'], 'status' => $t['status'], 'notes' => count($t['notes'])] : null,
            'staff_waiting' => $rank >= 1 ? (int)one("SELECT COUNT(*) AS n FROM tickets WHERE status='open'")['n'] : 0]);
    }

     
    if ($hp === 'messages' && $m === 'GET') {
        [$col, $key, $id] = isset($_GET['dm']) ? ['dm_id', 'd', (int)$_GET['dm']] : ['channel_id', 'c', (int)($_GET['channel'] ?? 0)];
        $col === 'dm_id' ? hub_dm($id, $u) : hub_channel($id, $u);
        $after = (int)($_GET['after'] ?? 0); $before = (int)($_GET['before'] ?? 0);
        if ($after > 0) $rows = all(HUB_MSG_SQL . " WHERE m.$col=? AND m.id>? ORDER BY m.id LIMIT 100", [$id, $after]);
        else $rows = array_reverse(all(HUB_MSG_SQL . " WHERE m.$col=?" . ($before > 0 ? ' AND m.id<?' : '') . ' ORDER BY m.id DESC LIMIT 50', $before > 0 ? [$id, $before] : [$id]));
         
        $changed = $after > 0 ? array_map('hub_msg', all(HUB_MSG_SQL . " WHERE m.$col=? AND m.id<=? AND (m.edited_at>? OR m.deleted=1) AND m.id>?", [$id, $after, gmdate('Y-m-d H:i:s', time() - 30), max(0, $after - 200)])) : [];
        $out = array_map('hub_msg', $rows);
        if ($out) hub_mark_read($uid, $key . $id, (int)end($out)['id']);
        json_out(['ok' => true, 'messages' => $out, 'changed' => $changed, 'more' => $after === 0 && count($rows) === 50]);
    }
    if ($hp === 'messages' && $m === 'POST') {
        hub_need_post($c);
        if (hub_cfg()['chat_rule'] === 'roblox' && !is_verified($u)) fail('Link your Roblox account first (Roblox tab) to chat. It keeps the chat free of spam accounts.', 403);
        if ((string)($u['hub_muted_until'] ?? '') > now()) fail('You are muted in the app until ' . $u['hub_muted_until'] . ' UTC.', 403);
        $text = trim(str((string)($b['body'] ?? ''), 2000, false));
        if ($text === '') fail('Write a message first.');
        if (!rate('hubmsg:' . $uid, 8, 10)) fail('Slow down a little.', 429);
        $row = ['user_id' => $uid, 'body' => $text, 'reply_to' => (int)($b['reply_to'] ?? 0) ?: null, 'created_at' => now(), 'channel_id' => 0, 'dm_id' => 0];
        if (!empty($b['dm'])) {
            $d = hub_dm((int)$b['dm'], $u); $row['dm_id'] = (int)$d['id'];
            if (hub_blocked((int)$d['user_a'], (int)$d['user_b'])) fail('You cannot message this member.', 403);
            q('UPDATE chat_dms SET last_at=? WHERE id=?', [now(), $d['id']]);
        } else {
            $ch = hub_channel((int)($b['channel'] ?? 0), $u);
            if (!hub_can_post($u, $ch)) fail((int)$ch['read_only'] ? 'Only staff can post in this channel.' : 'Your roles cannot post in this channel.', 403);
            $row['channel_id'] = (int)$ch['id'];
        }
        $id = insert('chat_messages', $row);
        hub_mark_read($uid, ($row['dm_id'] ? 'd' . $row['dm_id'] : 'c' . $row['channel_id']), $id);
        json_out(['ok' => true, 'message' => hub_msg(one(HUB_MSG_SQL . ' WHERE m.id=?', [$id]))]);
    }
    if (preg_match('#^messages/(\d+)/(edit|delete)$#', $hp, $mm) && $m === 'POST') {
        hub_need_post($c);
        $msg = one('SELECT * FROM chat_messages WHERE id=?', [(int)$mm[1]]);
        if (!$msg || (int)$msg['deleted']) fail('Message not found.', 404);
        $mine = (int)$msg['user_id'] === $uid;
        if ($mm[2] === 'edit') {
            if (!$mine) fail('You can only edit your own messages.', 403);
            $text = trim(str((string)($b['body'] ?? ''), 2000, false));
            if ($text === '') fail('A message cannot be empty. Delete it instead.');
            q('UPDATE chat_messages SET body=?, edited_at=? WHERE id=?', [$text, now(), $msg['id']]);
        } else {
            $mod = !$msg['dm_id'] && ($rank >= 1 || hub_has_perm($u, (int)(one('SELECT server_id FROM chat_channels WHERE id=?', [(int)$msg['channel_id']])['server_id'] ?? 0), 'manage_messages'));
            if (!$mine && !$mod) fail('You can only delete your own messages.', 403);
            q('UPDATE chat_messages SET deleted=1, edited_at=? WHERE id=?', [now(), $msg['id']]);
            if (!$mine) audit((string)$u['username'], 'hub.delete-message', '#' . $msg['id'] . ' by user ' . $msg['user_id']);
        }
        json_out(['ok' => true]);
    }
     
    if ($hp === 'dm' && $m === 'POST') {
        hub_need_post($c);
        $other = one('SELECT * FROM users WHERE id=? AND banned=0 AND app_login IS NOT NULL', [(int)($b['user_id'] ?? 0)]);
        if (!$other || (int)$other['id'] === $uid) fail('Pick someone else to message.');
        if (hub_blocked($uid, (int)$other['id'])) fail('You cannot message this member.', 403);
        if (hub_prefs($other)['dm_from'] === 'friends' && hub_relation($uid, (int)$other['id']) !== 'friends' && $rank < 1) fail(((string)(($other['hub_name'] ?? '') ?: $other['username'])) . ' only gets messages from friends. Send a friend request first.', 403);
        [$a, $z] = $uid < (int)$other['id'] ? [$uid, (int)$other['id']] : [(int)$other['id'], $uid];
        $d = one('SELECT * FROM chat_dms WHERE user_a=? AND user_b=?', [$a, $z]);
        $id = $d ? (int)$d['id'] : insert('chat_dms', ['user_a' => $a, 'user_b' => $z, 'last_at' => now(), 'created_at' => now()]);
        json_out(['ok' => true, 'dm' => $id, 'user' => hub_user_card($other)]);
    }
    if ($hp === 'users' && $m === 'GET') {
        $qq = trim((string)($_GET['q'] ?? ''));
        if (mb_strlen($qq) < 2) json_out(['ok' => true, 'users' => []]);
        $like = '%' . $qq . '%';
        json_out(['ok' => true, 'users' => array_map('hub_user_card', all('SELECT * FROM users WHERE banned=0 AND app_login IS NOT NULL AND id<>? AND (username LIKE ? OR hub_name LIKE ? OR roblox_username LIKE ?) ORDER BY username LIMIT 12', [$uid, $like, $like, $like]))]);
    }

     
    if ($hp === 'friends' && $m === 'GET') {
        $out = ['friends' => [], 'incoming' => [], 'outgoing' => [], 'blocked' => []];
        foreach (all('SELECT * FROM friends WHERE user_a=? OR user_b=? ORDER BY updated_at DESC', [$uid, $uid]) as $f) {
            $o = one('SELECT * FROM users WHERE id=?', [(int)$f['user_a'] === $uid ? (int)$f['user_b'] : (int)$f['user_a']]);
            if (!$o) continue;
            $k = $f['status'] === 'accepted' ? 'friends' : ((int)$f['requester'] === $uid ? 'outgoing' : 'incoming');
            $out[$k][] = hub_user_card($o) + ['since' => (string)$f['updated_at']];
        }
        foreach (all('SELECT u.* FROM blocks b JOIN users u ON u.id=b.blocked_id WHERE b.user_id=? ORDER BY b.created_at DESC', [$uid]) as $o) $out['blocked'][] = hub_user_card($o);
        json_out(['ok' => true] + $out);
    }
    if ($hp === 'friends' && $m === 'POST') {
        hub_need_post($c);
        $do = (string)($b['action'] ?? '');
        $other = !empty($b['user_id']) ? one('SELECT * FROM users WHERE id=? AND banned=0', [(int)$b['user_id']])
            : (trim((string)($b['username'] ?? '')) !== '' ? one('SELECT * FROM users WHERE banned=0 AND app_login IS NOT NULL AND (app_login=LOWER(?) OR LOWER(hub_name)=LOWER(?)) ORDER BY id LIMIT 1', [trim((string)$b['username']), trim((string)$b['username'])]) : null);
        if (!$other) fail($do === 'request' ? 'Nobody has that name. Check the spelling: it is their Discord username or app display name.' : 'Member not found.', 404);
        $oid = (int)$other['id']; [$a, $z] = hub_pair($uid, $oid);
        $oname = (string)(($other['hub_name'] ?? '') ?: $other['username']);
        if ($oid === $uid) fail('That is you!');
        $f = hub_friendship($uid, $oid);
        switch ($do) {
            case 'request':
                if (hub_blocked($uid, $oid)) fail('You cannot add this member.', 403);
                if ($f && $f['status'] === 'accepted') fail('You are already friends with ' . $oname . '.', 409);
                if ($f && (int)$f['requester'] === $oid) { q("UPDATE friends SET status='accepted', updated_at=? WHERE id=?", [now(), $f['id']]); json_out(['ok' => true, 'result' => 'friends', 'message' => 'You and ' . $oname . ' are now friends.']); }
                if ($f) fail('You already sent ' . $oname . ' a friend request.', 409);
                if (hub_prefs($other)['fr_from'] === 'nobody') fail($oname . ' is not accepting friend requests.', 403);
                if (!rate('hubfr:' . $uid, 30, 3600)) fail('You sent a lot of friend requests. Try again later.', 429);
                insert('friends', ['user_a' => $a, 'user_b' => $z, 'requester' => $uid, 'status' => 'pending', 'created_at' => now(), 'updated_at' => now()]);
                json_out(['ok' => true, 'result' => 'outgoing', 'message' => 'Friend request sent to ' . $oname . '.']);
            case 'accept':
                if (!$f || $f['status'] !== 'pending' || (int)$f['requester'] === $uid) fail('There is no request to accept.', 404);
                q("UPDATE friends SET status='accepted', updated_at=? WHERE id=?", [now(), $f['id']]);
                json_out(['ok' => true, 'result' => 'friends', 'message' => 'You and ' . $oname . ' are now friends.']);
            case 'decline': case 'cancel': case 'remove':
                if ($f) q('DELETE FROM friends WHERE id=?', [$f['id']]);
                json_out(['ok' => true, 'result' => 'none']);
            case 'block':
                if ($f) q('DELETE FROM friends WHERE id=?', [$f['id']]);
                if (!one('SELECT 1 AS x FROM blocks WHERE user_id=? AND blocked_id=?', [$uid, $oid])) insert('blocks', ['user_id' => $uid, 'blocked_id' => $oid, 'created_at' => now()]);
                json_out(['ok' => true, 'result' => 'blocked', 'message' => $oname . ' is blocked. They cannot message you or send friend requests.']);
            case 'unblock':
                q('DELETE FROM blocks WHERE user_id=? AND blocked_id=?', [$uid, $oid]);
                json_out(['ok' => true, 'result' => 'none']);
        }
        fail('Unknown action.');
    }

     
    if ($hp === 'profile' && $m === 'GET') {
        $o = one('SELECT u.*, s.role AS staff_role FROM users u LEFT JOIN staff s ON s.discord_id=u.discord_id WHERE u.id=?', [(int)($_GET['id'] ?? 0)]);
        if (!$o) fail('Member not found.', 404);
        $oid = (int)$o['id'];
        $mine = array_map(fn($r) => (int)$r['x'], all("SELECT CASE WHEN user_a=? THEN user_b ELSE user_a END AS x FROM friends WHERE (user_a=? OR user_b=?) AND status='accepted'", [$uid, $uid, $uid]));
        $theirs = array_map(fn($r) => (int)$r['x'], all("SELECT CASE WHEN user_a=? THEN user_b ELSE user_a END AS x FROM friends WHERE (user_a=? OR user_b=?) AND status='accepted'", [$oid, $oid, $oid]));
        $owner = (string)setting('owner_discord_id');
        json_out(['ok' => true, 'profile' => hub_user_card($o) + ['bio' => (string)($o['hub_bio'] ?? ''), 'pronouns' => (string)($o['hub_pronouns'] ?? ''), 'banner' => (string)($o['hub_banner'] ?? ''),
            'effect' => (string)($o['hub_effect'] ?? ''), 'banner_img' => !empty($o['hub_banner_at']) ? '/api/hub/banner/' . $oid . '?v=' . strtotime((string)$o['hub_banner_at'] . ' UTC') : null,
            'joined' => (string)$o['created_at'], 'staff' => $owner !== '' && $owner === (string)$o['discord_id'] ? 'owner' : (string)($o['staff_role'] ?? ''),
            'relation' => $oid === $uid ? 'self' : hub_relation($uid, $oid), 'mutual' => count(array_intersect($mine, $theirs))]]);
    }
    if ($hp === 'profile' && $m === 'POST') {
        hub_need_post($c);
        $banner = (string)($b['banner'] ?? '');
        $pick = fn(string $k) => in_array($b[$k] ?? '', HUB_COSMETICS[$k], true) ? (string)$b[$k] : null;
        q('UPDATE users SET hub_effect=?, hub_deco=?, hub_plate=?, hub_namestyle=? WHERE id=?', [$pick('effect'), $pick('deco'), $pick('plate'), $pick('namestyle'), $uid]);
        q('UPDATE users SET hub_name=?, hub_bio=?, hub_pronouns=?, hub_banner=?, hub_custom_status=?, hub_status=? WHERE id=?', [
            str($b['display_name'] ?? '', 32) ?: null, str($b['bio'] ?? '', 190, false) ?: null, str($b['pronouns'] ?? '', 30) ?: null,
            preg_match('/^#[0-9a-f]{6}$/i', $banner) ? strtolower($banner) : null, str($b['custom_status'] ?? '', 80) ?: null,
            in_array($b['status'] ?? '', HUB_STATUSES, true) ? $b['status'] : (string)($u['hub_status'] ?? 'online'), $uid]);
        json_out(['ok' => true]);
    }
    if ($hp === 'status' && $m === 'POST') {
        hub_need_post($c);
        if (!in_array($b['status'] ?? '', HUB_STATUSES, true)) fail('Pick a status.');
        q('UPDATE users SET hub_status=?, hub_custom_status=? WHERE id=?', [$b['status'], array_key_exists('custom_status', $b) ? (str($b['custom_status'], 80) ?: null) : ($u['hub_custom_status'] ?? null), $uid]);
        json_out(['ok' => true]);
    }
    if ($hp === 'gifs' && $m === 'GET') {
        if (!rate('hubgif:' . $uid, 60, 60)) fail('Slow down a little, then search again.', 429);
        if (!hub_gif_conf()) fail('GIF search is not turned on yet. Staff can turn it on in the App panel.', 503);
        $r = hub_gif_search((string)($_GET['q'] ?? ''), (int)($_GET['page'] ?? 1), $uid);
        if ($r === null) fail('GIF search is not answering right now. Try again in a moment.', 502);
        json_out(['ok' => true] + $r);
    }
     
    if (in_array($hp, ['avatar', 'banner'], true) && $m === 'POST') {
        hub_need_post($c);
        $tbl = $hp === 'avatar' ? 'hub_avatars' : 'hub_banners'; $col = $hp === 'avatar' ? 'hub_avatar_at' : 'hub_banner_at';
        if (!empty($b['reset'])) { q("DELETE FROM $tbl WHERE user_id=?", [$uid]); q("UPDATE users SET $col=NULL WHERE id=?", [$uid]); json_out(['ok' => true]); }
        if (!rate('hubav:' . $uid, 10, 3600)) fail('Too many uploads. Try again later.', 429);
        if (!empty($b['gif_url'])) {
             
            $raw = hub_gif_fetch((string)$b['gif_url']);
            if ($raw === null) fail('That GIF could not be used. Pick another one.');
            $info = @getimagesizefromstring($raw);
            if (!$info || !in_array($info['mime'], ['image/gif', 'image/webp'], true) || $info[0] < 16 || $info[1] < 16) fail('That GIF could not be used. Pick another one.');
            q("DELETE FROM $tbl WHERE user_id=?", [$uid]);
            insert($tbl, ['user_id' => $uid, 'mime' => $info['mime'], 'data' => base64_encode($raw), 'updated_at' => now()]);
            q("UPDATE users SET $col=? WHERE id=?", [now(), $uid]);
            json_out(['ok' => true]);
        }
        if (!preg_match('#^data:(image/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$#', (string)($b['data'] ?? ''), $mm)) fail('Pick a PNG, JPG, GIF or WEBP picture.');
        $raw = base64_decode($mm[2], true);
        if ($raw === false || strlen($raw) > 1048576) fail('The picture must be smaller than 1 MB.');
        $info = @getimagesizefromstring($raw);
        if (!$info || $info[0] < 16 || $info[1] < 16 || $info['mime'] !== $mm[1]) fail('That file is not a picture we can use.');
        q("DELETE FROM $tbl WHERE user_id=?", [$uid]);
        insert($tbl, ['user_id' => $uid, 'mime' => $mm[1], 'data' => base64_encode($raw), 'updated_at' => now()]);
        q("UPDATE users SET $col=? WHERE id=?", [now(), $uid]);
        json_out(['ok' => true]);
    }
     
    if ($hp === 'prefs' && $m === 'POST') {
        hub_need_post($c);
        $p = hub_prefs($u);
        if (in_array($b['dm_from'] ?? '', ['everyone', 'friends'], true)) $p['dm_from'] = $b['dm_from'];
        if (in_array($b['fr_from'] ?? '', ['everyone', 'nobody'], true)) $p['fr_from'] = $b['fr_from'];
        if (in_array($b['theme'] ?? '', ['shadow', 'blossom'], true)) $p['theme'] = $b['theme'];
        if (array_key_exists('compact', $b)) $p['compact'] = (bool)$b['compact'];
        if (array_key_exists('notify', $b)) $p['notify'] = (bool)$b['notify'];
        if (in_array((int)($b['font'] ?? 0), [90, 100, 110, 120], true)) $p['font'] = (int)$b['font'];
        q('UPDATE users SET hub_prefs=? WHERE id=?', [json_encode($p), $uid]);
        json_out(['ok' => true, 'prefs' => $p]);
    }
    if ($hp === 'sessions' && $m === 'GET') {
        json_out(['ok' => true, 'count' => (int)one('SELECT COUNT(*) AS n FROM sessions WHERE user_id=? AND expires_at>?', [$uid, now()])['n']]);
    }
    if ($hp === 'sessions/others' && $m === 'POST') {
        hub_need_post($c);
        q('DELETE FROM sessions WHERE user_id=? AND id<>?', [$uid, $c['sid']]);
        audit((string)$u['username'], 'hub.logout-others', '');
        json_out(['ok' => true]);
    }
     
    if ($hp === 'channels' && $m === 'POST') {
        hub_need_post($c);
        if ($rank < 2) fail('Only admins can manage channels.', 403);
        $id = (int)($b['id'] ?? 0);
        if (!empty($b['delete'])) { q('DELETE FROM chat_channels WHERE id=?', [$id]); audit((string)$u['username'], 'hub.channel-delete', '#' . $id); json_out(['ok' => true]); }
        $name = strtolower(trim((string)preg_replace('/[^a-z0-9]+/i', '-', (string)($b['name'] ?? '')), '-'));
        if ($name === '') fail('Give the channel a name.');
        $row = ['name' => substr($name, 0, 40), 'topic' => str($b['topic'] ?? '', 200), 'staff_only' => !empty($b['staff_only']) ? 1 : 0, 'read_only' => !empty($b['read_only']) ? 1 : 0,
            'icon' => isset(hub_icons()[$b['icon'] ?? '']) ? (string)$b['icon'] : 'hash', 'category' => str($b['category'] ?? '', 40)];
        if ($id) update('chat_channels', $id, $row);
        else {
            $sid = (int)($b['server'] ?? 0);
            if (!one('SELECT id FROM hub_servers WHERE id=?', [$sid])) fail('Pick a server for the channel.');
            $id = insert('chat_channels', $row + ['server_id' => $sid, 'position' => (int)one('SELECT COALESCE(MAX(position),0)+1 AS p FROM chat_channels WHERE server_id=?', [$sid])['p'], 'created_at' => now()]);
        }
        audit((string)$u['username'], 'hub.channel-save', '#' . $row['name']);
        json_out(['ok' => true, 'id' => $id]);
    }

     
    if ($hp === 'market' && $m === 'GET') {
        $where = "l.status='active'"; $args = [];
        if (isset(HUB_LISTING_CATS[$_GET['cat'] ?? ''])) { $where .= ' AND l.category=?'; $args[] = (string)$_GET['cat']; }
        $qq = trim((string)($_GET['q'] ?? ''));
        if ($qq !== '') { $where .= ' AND (l.title LIKE ? OR l.description LIKE ?)'; array_push($args, '%' . $qq . '%', '%' . $qq . '%'); }
        $mine = array_map(fn($l) => hub_listing($l) + ['position' => $l['status'] === 'pending' ? (int)one("SELECT COUNT(*) AS n FROM listings WHERE status='pending' AND id<=?", [$l['id']])['n'] : 0],
            all(HUB_LISTING_SQL . " WHERE l.user_id=? AND l.status<>'removed' ORDER BY l.id DESC LIMIT 20", [$uid]));
        json_out(['ok' => true, 'cats' => HUB_LISTING_CATS, 'listings' => array_map('hub_listing', all(HUB_LISTING_SQL . ' WHERE ' . $where . ' ORDER BY COALESCE(l.reposted_at, l.created_at) DESC, l.id DESC LIMIT 120', $args)),
            'mine' => $mine, 'can_post' => is_verified($u)]);
    }
    if ($hp === 'market' && $m === 'POST') {
        hub_need_post($c);
        if (!is_verified($u)) fail('Link your Roblox account first (Roblox tab). Every seller is verified, so buyers know who they deal with.', 403);
        if ((int)one("SELECT COUNT(*) AS n FROM listings WHERE user_id=? AND status='pending'", [$uid])['n'] >= 3) fail('You already have 3 posts waiting for review. Wait until they are checked.', 429);
        if (!rate('ls:' . $uid, 5, 86400)) fail('You have reached the daily limit of 5 posts.', 429);
        $title = str($b['title'] ?? '', 120); $desc = str($b['description'] ?? '', 3000, false); $price = str($b['price'] ?? '', 60);
        if ($title === '' || mb_strlen(trim($desc)) < 20 || $price === '') fail('Add a title, a price and a description (at least 20 characters).');
        $id = insert('listings', ['user_id' => $uid, 'title' => $title, 'category' => isset(HUB_LISTING_CATS[$b['category'] ?? '']) ? (string)$b['category'] : 'other', 'description' => $desc, 'price_text' => $price, 'source' => 'app', 'notified' => 1, 'created_at' => now()]);
        audit((string)$u['username'], 'hub.listing', '#' . $id);
        json_out(['ok' => true, 'id' => $id, 'position' => (int)one("SELECT COUNT(*) AS n FROM listings WHERE status='pending' AND id<=?", [$id])['n']]);
    }
    if (preg_match('#^market/(\d+)/remove$#', $hp, $mm) && $m === 'POST') {
        hub_need_post($c);
        $l = one('SELECT * FROM listings WHERE id=?', [(int)$mm[1]]);
        if (!$l || ((int)$l['user_id'] !== $uid && $rank < 1)) fail('Post not found.', 404);
        q("UPDATE listings SET status='removed' WHERE id=?", [$l['id']]);
        audit((string)$u['username'], 'hub.listing-remove', '#' . $l['id']);
        json_out(['ok' => true]);
    }

     
    if ($hp === 'tickets' && $m === 'GET') {
        $did = (string)$u['discord_id'];
        json_out(['ok' => true, 'current' => $did !== '' ? ticket_status($did) : null, 'types' => array_intersect_key(TICKET_TYPES, array_flip(HUB_TICKET_TYPES)),
            'past' => $did !== '' ? all("SELECT ref,category,subject,status,created_at,closed_at FROM tickets WHERE discord_user_id=? ORDER BY id DESC LIMIT 15", [$did]) : []]);
    }
    if ($hp === 'tickets' && $m === 'POST') {
        hub_need_post($c);
        $did = (string)$u['discord_id'];
        if (!preg_match('/^\d+$/', $did)) fail('Link your Discord account first (Settings > Connections). Staff talk to you about tickets in your Discord DMs.', 403);
        if (one("SELECT id FROM tickets WHERE discord_user_id=? AND status<>'closed'", [$did])) fail('You already have an open ticket. You can see it above.', 409);
        if (!rate('hubticket:' . $uid, 3, 3600)) fail('You opened several tickets in the last hour. Please wait a little.', 429);
        $cat = in_array($b['category'] ?? '', HUB_TICKET_TYPES, true) ? (string)$b['category'] : 'support';
        $subject = str($b['subject'] ?? '', 100); $details = str($b['details'] ?? '', 3000, false);
        if ($subject === '' || mb_strlen(trim($details)) < 10) fail('Add a short title and describe what you need (at least 10 characters).');
        if ($cat === 'scam') {
            $sus = str($b['suspects'] ?? '', 500, false);
            if (trim($sus) === '') fail('Say who scammed you: their Discord ID or Roblox username.');
            $details = 'What happened: ' . $details . "\nSuspects: " . $sus . (trim((string)($b['evidence'] ?? '')) !== '' ? "\nEvidence: " . str($b['evidence'], 1000, false) : '');
        }
        $id = insert('tickets', ['guild_id' => main_guild(), 'discord_user_id' => $did, 'discord_username' => str((string)$u['username'], 80), 'channel_id' => '', 'category' => $cat,
            'subject' => $subject, 'details' => $details, 'evidence_flag' => 0, 'priority' => 0, 'source' => 'app', 'staff_notified' => 0, 'created_at' => now()]);
        $ref = 'TK-' . str_pad((string)$id, 4, '0', STR_PAD_LEFT);
        q('UPDATE tickets SET ref=? WHERE id=?', [$ref, $id]);
        ticket_say($id, 'user', (string)$u['username'], $details);
        json_out(['ok' => true, 'ref' => $ref]);
    }
    if ($hp === 'tickets/close' && $m === 'POST') {
        hub_need_post($c);
        $t = one("SELECT * FROM tickets WHERE discord_user_id=? AND status<>'closed' ORDER BY id DESC LIMIT 1", [(string)$u['discord_id']]);
        if (!$t) fail('You have no open ticket.', 404);
        q("UPDATE tickets SET status='closed', closed_by=?, closed_at=?, transcript=? WHERE id=?", [(string)$u['username'] . ' (user, in the app)', now(), ticket_transcript((int)$t['id']), $t['id']]);
        json_out(['ok' => true]);
    }

     
    if ($hp === 'roblox/thumb' && $m === 'GET') {
        $rid = digits($_GET['id'] ?? '', 20);
        if ($rid === '') fail('Missing id.');
        $key = 'rbx_thumb_' . $rid;
        $cached = json_decode((string)setting($key), true);
        if (is_array($cached) && ($cached['at'] ?? 0) > time() - 86400) json_out(['ok' => true, 'url' => $cached['url']]);
        $j = http_json('GET', 'https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' . $rid . '&size=150x150&format=Png&isCircular=false', []);
        $url = (string)($j['data'][0]['imageUrl'] ?? '');
        if ($url !== '') set_setting($key, json_encode(['url' => $url, 'at' => time()]));
        json_out(['ok' => true, 'url' => $url ?: null]);
    }
     
    if ($hp === 'roblox/unlink' && $m === 'POST') {
        hub_need_post($c);
        q('UPDATE users SET roblox_id=NULL, roblox_username=NULL, roblox_verified_at=NULL, roblox_code=NULL, roblox_code_expires=NULL WHERE id=?', [$uid]);
        audit((string)$u['username'], 'roblox.unlinked', 'user ' . $uid . ' (in the app)');
        json_out(['ok' => true]);
    }
    if ($hp === 'lookup' && $m === 'GET') {
        if ($rank < 1) fail('Only staff can look members up.', 403);
        $qq = trim((string)($_GET['q'] ?? ''));
        if (mb_strlen($qq) < 2) json_out(['ok' => true, 'results' => []]);
        $like = '%' . $qq . '%';
        $rows = ctype_digit($qq) ? all('SELECT * FROM users WHERE discord_id=? OR roblox_id=? LIMIT 20', [$qq, $qq]) : all('SELECT * FROM users WHERE username LIKE ? OR roblox_username LIKE ? ORDER BY username LIMIT 20', [$like, $like]);
        $out = [];
        foreach ($rows as $r) {
            $scams = (int)one("SELECT COUNT(*) AS n FROM reports WHERE status='verified' AND ((scammer_discord_id<>'' AND scammer_discord_id=?) OR (scammer_roblox_id IS NOT NULL AND scammer_roblox_id=?))", [(string)$r['discord_id'], (string)($r['roblox_id'] ?? '-')])['n'];
            $out[] = hub_user_card($r) + ['discord_id' => (string)$r['discord_id'], 'roblox_id' => is_verified($r) ? (string)$r['roblox_id'] : null, 'verified' => is_verified($r),
                'banned' => (bool)(int)$r['banned'], 'joined' => (string)$r['created_at'], 'staff' => staff_role($r), 'confirmed_scams' => $scams,
                'tickets' => (int)one('SELECT COUNT(*) AS n FROM tickets WHERE discord_user_id=?', [(string)$r['discord_id']])['n']];
        }
        json_out(['ok' => true, 'results' => $out]);
    }
    fail('Not found.', 404);
}
