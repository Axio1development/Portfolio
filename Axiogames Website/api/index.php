<?php
declare(strict_types=1);
require __DIR__ . '/../app/lib.php';

set_exception_handler(function (Throwable $e) {
    error_log('[axm] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $k = (string)($_SERVER['HTTP_X_API_KEY'] ?? '');
    log_site_error($e, preg_match('/^axm_([a-z]+)_/', $k, $mm) ? $mm[1] . ' bot' : '');
     
    $why = !empty($GLOBALS['axm_bot_ok']) ? ' Reason: ' . substr(get_class($e) . ': ' . $e->getMessage() . ' (' . basename($e->getFile()) . ':' . $e->getLine() . ')', 0, 300) : '';
    fail('Something went wrong on our side. Please try again later.' . $why, 500);
});

$path = trim((string)parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
$path = preg_replace('#^api/?#', '', $path) ?? '';
$m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$me = auth();

function need_login(): array { $c = auth(); if (!$c) fail('Please sign in with Discord first.', 401); return $c; }
function need_post(array $c): void { check_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null); }
function need_verified(array $c): array {
    if (!is_verified($c['user'])) fail('Link your Roblox account on the Account page to verify yourself first.', 403);
    return $c['user'];
}
function redirect(string $to): never { header('Location: ' . $to, true, 302); exit; }

 
if ($path === 'auth/discord' && $m === 'GET') {
    $next = safe_next($_GET['next'] ?? null);
    [$cid, $sec] = discord_creds();
    if (!$cid || !$sec) {
        if (is_dev()) redirect('/api/auth/dev?id=1001&name=DevUser&next=' . rawurlencode($next));
        redirect('/account?error=not-configured');
    }
    $state = bin2hex(random_bytes(16));
    set_cookie('axm_oauth', $state . '|' . $next, 600);
    redirect('https://discord.com/oauth2/authorize?' . http_build_query([
        'client_id' => $cid, 'redirect_uri' => base_url() . '/api/auth/callback', 'response_type' => 'code', 'scope' => 'identify', 'state' => $state, 'prompt' => 'none',
    ]));
}
if ($path === 'auth/callback' && $m === 'GET' && !empty($_COOKIE['axm_hlink'])) {
     
    [$state, $huid] = array_pad(explode('|', (string)$_COOKIE['axm_hlink'], 2), 2, '');
    set_cookie('axm_hlink', '', 0);
    $code = (string)($_GET['code'] ?? '');
    $hc = hub_auth();
    if (!$hc || (int)$hc['user']['id'] !== (int)$huid || !$state || !hash_equals($state, (string)($_GET['state'] ?? '')) || !$code) redirect('/hub?linked=error');
    [$cid, $sec] = discord_creds();
    $tok = http_json('POST', 'https://discord.com/api/oauth2/token', [
        CURLOPT_POSTFIELDS => http_build_query(['client_id' => $cid, 'client_secret' => $sec, 'grant_type' => 'authorization_code', 'code' => $code, 'redirect_uri' => base_url() . '/api/auth/callback']),
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    ]);
    $du = $tok && !empty($tok['access_token']) ? http_json('GET', 'https://discord.com/api/users/@me', [CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $tok['access_token']]]) : null;
    if (!$du || !preg_match('/^\d{5,25}$/', (string)($du['id'] ?? ''))) redirect('/hub?linked=error');
    if (one('SELECT id FROM users WHERE hub_discord_id=? AND id<>?', [(string)$du['id'], (int)$huid])) redirect('/hub?linked=taken');
    q('UPDATE users SET hub_discord_id=? WHERE id=?', [(string)$du['id'], (int)$huid]);
    redirect('/hub?linked=1');
}
if ($path === 'auth/callback' && $m === 'GET') {
    $cookie = (string)($_COOKIE['axm_oauth'] ?? '');
    set_cookie('axm_oauth', '', 0);
    [$state, $next] = array_pad(explode('|', $cookie, 2), 2, '');
    $code = (string)($_GET['code'] ?? '');
    if (!$state || !hash_equals($state, (string)($_GET['state'] ?? '')) || !$code) redirect('/account?error=state');
    [$cid, $sec] = discord_creds();
    $tok = http_json('POST', 'https://discord.com/api/oauth2/token', [
        CURLOPT_POSTFIELDS => http_build_query(['client_id' => $cid, 'client_secret' => $sec, 'grant_type' => 'authorization_code', 'code' => $code, 'redirect_uri' => base_url() . '/api/auth/callback']),
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    ]);
    if (!$tok || empty($tok['access_token'])) redirect('/account?error=discord');
    $du = http_json('GET', 'https://discord.com/api/users/@me', [CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $tok['access_token']]]);
    if (!$du || empty($du['id']) || !preg_match('/^\d{5,25}$/', (string)$du['id'])) redirect('/account?error=discord');
    $name = str($du['global_name'] ?? $du['username'] ?? 'Discord user', 80);
    $uid = upsert_discord_user((string)$du['id'], $name ?: 'Discord user', isset($du['avatar']) ? str($du['avatar'], 80) : null);
    login_user($uid);
    redirect(safe_next($next));
}
if ($path === 'auth/dev' && $m === 'GET' && is_dev()) {
    $id = digits($_GET['id'] ?? '1001') ?: '1001';
    $uid = upsert_discord_user($id, str($_GET['name'] ?? 'DevUser', 80), isset($_GET['avatar']) ? str($_GET['avatar'], 80) : null);
    login_user($uid);
    redirect(safe_next($_GET['next'] ?? null));
}
if ($path === 'auth/logout' && $m === 'POST') { $c = need_login(); need_post($c); logout(); json_out(['ok' => true]); }

if ($path === 'me' && $m === 'GET') {
    json_out(['ok' => true, 'user' => $me ? public_user($me['user']) : null, 'csrf' => $me['csrf'] ?? null]);
}
if ($path === 'my' && $m === 'GET') {
    $c = need_login(); $uid = (int)$c['user']['id'];
    json_out(['ok' => true,
        'reports' => all('SELECT ref,scammer_name,scammer_roblox_id,type,status,published,created_at FROM reports WHERE user_id=? ORDER BY id DESC LIMIT 30', [$uid]),
        'applications' => array_map(fn($a) => $a + ['note' => in_array($a['status'], ['accepted', 'rejected'], true) ? (string)$a['staff_note'] : ''], all('SELECT a.id,a.area,a.status,a.created_at,a.decided_at,a.staff_note,j.title AS job FROM applications a LEFT JOIN jobs j ON j.id=a.job_id WHERE a.user_id=? ORDER BY a.id DESC LIMIT 30', [$uid])),
        'listings' => all('SELECT id,title,status,created_at FROM listings WHERE user_id=? ORDER BY id DESC LIMIT 30', [$uid]),
        'ticket' => $c['user']['discord_id'] ? ticket_status((string)$c['user']['discord_id']) : null,
    ]);
}

 
require __DIR__ . '/hub.php';

 
 

if ($path === 'roblox/oauth/start' && $m === 'GET') {
    $for = ($_GET['for'] ?? '') === 'hub' ? 'hub' : 'site';
    $back = $for === 'hub' ? '/hub?section=roblox&roblox=' : '/account?roblox=';
    $ctx = $for === 'hub' ? hub_auth() : auth();
    if (!$ctx) redirect($for === 'hub' ? '/hub' : '/api/auth/discord?next=/account');
    if (!roblox_oauth_on()) redirect($back . 'off');
    $state = bin2hex(random_bytes(16));
    set_cookie('axm_rbx', $state . '|' . $for . '|' . (int)$ctx['user']['id'], 600);
    redirect('https://apis.roblox.com/oauth/v1/authorize?' . http_build_query(['client_id' => roblox_creds()[0], 'redirect_uri' => base_url() . '/api/roblox/oauth/callback',
        'scope' => 'openid profile', 'response_type' => 'code', 'state' => $state, 'prompt' => 'consent select_account']));
}
if ($path === 'roblox/oauth/callback' && $m === 'GET') {
    [$state, $for, $cuid] = array_pad(explode('|', (string)($_COOKIE['axm_rbx'] ?? ''), 3), 3, '');
    set_cookie('axm_rbx', '', 0);
    $back = $for === 'hub' ? '/hub?section=roblox&roblox=' : '/account?roblox=';
    $ctx = $for === 'hub' ? hub_auth() : auth();
    if (!$ctx || (int)$ctx['user']['id'] !== (int)$cuid || $state === '' || !hash_equals($state, (string)($_GET['state'] ?? '')) || empty($_GET['code'])) redirect($back . (isset($_GET['error']) ? 'cancelled' : 'error'));
    [$rid0, $rsec] = roblox_creds();
    $tok = http_json('POST', 'https://apis.roblox.com/oauth/v1/token', [
        CURLOPT_POSTFIELDS => http_build_query(['client_id' => $rid0, 'client_secret' => $rsec, 'grant_type' => 'authorization_code', 'code' => (string)$_GET['code']]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    ]);
    $info = $tok && !empty($tok['access_token']) ? http_json('GET', 'https://apis.roblox.com/oauth/v1/userinfo', [CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $tok['access_token']]]) : null;
    $rid = digits((string)($info['sub'] ?? ''), 20);
    if ($rid === '') redirect($back . 'error');
    $rname = str((string)($info['preferred_username'] ?? $info['name'] ?? ''), 40) ?: (string)(roblox_lookup_id($rid)['name'] ?? $rid);
    $u = $ctx['user'];
    $taken = $for === 'hub' ? one('SELECT id FROM users WHERE roblox_id=? AND roblox_verified_at IS NOT NULL AND id<>? AND app_login IS NOT NULL', [$rid, $u['id']])
                            : one('SELECT id FROM users WHERE roblox_id=? AND roblox_verified_at IS NOT NULL AND id<>? AND app_login IS NULL', [$rid, $u['id']]);
    if ($taken) redirect($back . 'taken');
    q('UPDATE users SET roblox_id=?, roblox_username=?, roblox_verified_at=?, roblox_code=NULL, roblox_code_expires=NULL WHERE id=?', [$rid, $rname, now(), $u['id']]);
    audit((string)$u['username'], 'roblox.linked', 'user ' . $u['id'] . ' roblox ' . $rid . ' (Sign in with Roblox' . ($for === 'hub' ? ', app' : '') . ')');
    redirect($back . 'linked');
}
if ($path === 'roblox/start' && $m === 'POST') {
    $c = need_login(); need_post($c); $u = $c['user'];
    if (is_verified($u)) fail('Your Roblox account is already linked.', 409);
    if (!rate('rb:' . $u['id'], 10, 3600)) fail('Too many attempts. Try again in an hour.', 429);
    $rb = roblox_lookup(str(body()['username'] ?? '', 40));
    if (!$rb) fail('We could not find that Roblox username. Check the spelling and try again.', 422);
    if (one('SELECT id FROM users WHERE roblox_id=? AND roblox_verified_at IS NOT NULL AND id<>?', [$rb['id'], $u['id']])) fail('That Roblox account is already linked to another Discord account.', 409);
    $code = roblox_word_code();
    q('UPDATE users SET roblox_id=?, roblox_username=?, roblox_code=?, roblox_code_expires=? WHERE id=?', [$rb['id'], $rb['name'], $code, plus('+30 minutes'), $u['id']]);
    json_out(['ok' => true, 'username' => $rb['name'], 'code' => $code]);
}
if ($path === 'roblox/verify' && $m === 'POST') {
    $c = need_login(); need_post($c); $u = $c['user'];
    if (is_verified($u)) json_out(['ok' => true]);
    if (empty($u['roblox_id']) || empty($u['roblox_code']) || ($u['roblox_code_expires'] ?? '') < now()) fail('Start again: enter your Roblox username to get a new code.', 410);
    if (!rate('rv:' . $u['id'], 12, 3600)) fail('Too many checks. Try again later.', 429);
    $desc = roblox_description((string)$u['roblox_id']);
    if ($desc === null) fail('We could not reach Roblox right now. Please try again in a moment.', 502);
    if (!roblox_code_found($desc, (string)$u['roblox_code'])) fail('We could not find the words in your Roblox About yet. Save them there and try again. If Roblox will not save them, press "Get new words", or use Sign in with Roblox.', 422);
    if (one('SELECT id FROM users WHERE roblox_id=? AND roblox_verified_at IS NOT NULL AND id<>?', [$u['roblox_id'], $u['id']])) fail('That Roblox account is already linked to another Discord account.', 409);
    q('UPDATE users SET roblox_verified_at=?, roblox_code=NULL, roblox_code_expires=NULL WHERE id=?', [now(), $u['id']]);
    audit($u['username'], 'roblox.linked', 'user ' . $u['id'] . ' roblox ' . $u['roblox_id']);
    json_out(['ok' => true]);
}

 
if ($path === 'summary' && $m === 'GET') {
    header('Cache-Control: public, max-age=60');
    json_out(['ok' => true,
        'games' => (int)one("SELECT COUNT(*) n FROM games WHERE status IN ('in_development','live')")['n'],
        'team' => (int)one('SELECT COUNT(*) n FROM team_members WHERE visible=1')['n']]);
}
if ($path === 'team' && $m === 'GET') {
    header('Cache-Control: public, max-age=60');
     
    $rows = all('SELECT t.discord_id,t.name,COALESCE(t.avatar,u.avatar) AS avatar,t.departments,t.titles,t.source,t.role_id,t.role_ids FROM team_members t LEFT JOIN users u ON u.discord_id=t.discord_id WHERE t.visible=1');
     
    $info = []; $sectionOf = []; $cur = null;
    foreach (all('SELECT role_id,name,color,position FROM guild_roles ORDER BY position DESC') as $r) {
        $rid = (string)$r['role_id'];
        $info[$rid] = $r + ['divider' => divider_label((string)$r['name'])];
        if ($info[$rid]['divider'] !== null) { $cur = $rid; $sectionOf[$rid] = $rid; continue; }
        $sectionOf[$rid] = $cur ?? $rid;
    }
    $hex = fn($c) => $c ? sprintf('#%06x', (int)$c) : null;
    $out = []; $used = [];
    foreach ($rows as $r) {
        $held = array_values(array_unique(array_filter(array_merge(json_decode((string)$r['role_ids'], true) ?: [], [(string)$r['role_id']]), fn($x) => isset($info[(string)$x]))));
        usort($held, fn($a, $b) => (int)$info[$b]['position'] <=> (int)$info[$a]['position']);
        $real = array_values(array_filter($held, fn($x) => $info[$x]['divider'] === null));
        $top = $real[0] ?? ($held[0] ?? '');
        $section = $top !== '' ? $sectionOf[$top] : '';
         
        $inSection = array_values(array_filter($real, fn($x) => $sectionOf[$x] === $section));
        $tags = array_map(fn($x) => ['name' => (string)$info[$x]['name'], 'color' => $hex($info[$x]['color'])], $inSection ?: $real);
        $titles = array_values(array_filter(array_map('trim', explode('|', (string)$r['titles'])), fn($t) => $t !== '' && divider_label($t) === null));
        if ($section !== '') $used[$section] = true;
        $out[] = ['discord_id' => $r['discord_id'], 'name' => $r['name'], 'avatar' => avatar_url($r['discord_id'], $r['avatar']),
            'departments' => array_values(array_filter(array_map('trim', explode(',', (string)$r['departments'])))),
            'titles' => $tags ? array_column($tags, 'name') : $titles, 'tags' => $tags, 'founder' => $r['source'] === 'founder', 'rank' => dept_rank_of($r['departments']),
            'role_id' => $section, 'order' => $real ? (int)$info[$real[0]]['position'] : 0];
    }
    $teamRoles = [];
    foreach ($info as $rid => $r) if (isset($used[$rid])) $teamRoles[] = ['id' => (string)$rid, 'name' => $r['divider'] !== null && $r['divider'] !== '' ? $r['divider'] : (string)$r['name'], 'color' => $hex($r['color'])];
    usort($out, fn($a, $b) => [$b['founder'], $b['order'], $b['rank'], $a['name']] <=> [$a['founder'], $a['order'], $a['rank'], $b['name']]);
    json_out(['ok' => true, 'members' => $out, 'roles' => $teamRoles, 'departments' => array_keys(DEPTS)]);
}
 
if ($path === 'subscribe' && $m === 'POST') {
    $c = need_login(); need_post($c); $u = $c['user']; $b = body();
    $tier = (string)($b['tier'] ?? '');
    if (!in_array($tier, array_column(SUB_DEFAULTS, 'key'), true)) fail('Pick a subscription.');
    if (!stripe_ready() || stripe_price($tier) === '') fail('Subscriptions are not open yet. Please try again soon.', 503);
    if (($cur = current_sub((int)$u['id'], (string)$u['discord_id'])) && !is_gift($cur)) fail('You already have ' . (sub_tiers()[array_search($cur['tier'], array_column(SUB_DEFAULTS, 'key'))]['name'] ?? 'a subscription') . '. Use Manage subscription to change or cancel it.', 409);
    $had = one('SELECT stripe_customer FROM subscriptions WHERE user_id=? ORDER BY id DESC LIMIT 1', [$u['id']]);
    $meta = ['user_id' => (string)$u['id'], 'discord_id' => (string)$u['discord_id'], 'tier' => $tier];
    $p = ['mode' => 'subscription', 'line_items' => [['price' => stripe_price($tier), 'quantity' => 1]], 'client_reference_id' => (string)$u['id'],
        'success_url' => base_url() . '/subscriptions?welcome=1', 'cancel_url' => base_url() . '/subscriptions', 'allow_promotion_codes' => 'true',
        'metadata' => $meta, 'subscription_data' => ['metadata' => $meta]];
    if (!empty($had['stripe_customer'])) $p['customer'] = $had['stripe_customer'];
    elseif (filter_var((string)($u['email'] ?? ''), FILTER_VALIDATE_EMAIL)) $p['customer_email'] = $u['email'];
    try { $s = stripe_api('POST', 'checkout/sessions', $p); } catch (Throwable $e) { error_log('[axm] ' . $e->getMessage()); fail('Could not start the checkout. Please try again in a moment.', 502); }
    json_out(['ok' => true, 'url' => (string)$s['url']]);
}
if ($path === 'subscribe/manage' && $m === 'POST') {
    $c = need_login(); need_post($c); $u = $c['user'];
    $row = one("SELECT stripe_customer FROM subscriptions WHERE user_id=? AND stripe_customer<>'' AND stripe_customer IS NOT NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
    if (!$row || !stripe_ready()) fail('No subscription found for your account.', 404);
    try { $s = stripe_api('POST', 'billing_portal/sessions', ['customer' => $row['stripe_customer'], 'return_url' => base_url() . '/subscriptions']); } catch (Throwable $e) { error_log('[axm] ' . $e->getMessage()); fail('Could not open the billing page. Please try again in a moment.', 502); }
    json_out(['ok' => true, 'url' => (string)$s['url']]);
}
if ($path === 'stripe/webhook' && $m === 'POST') {
    $payload = (string)file_get_contents('php://input');
    if (!stripe_signed($payload, (string)($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? ''), dec(setting('stripe_webhook')))) fail('Bad signature.', 400);
    $ev = json_decode($payload, true); $o = $ev['data']['object'] ?? [];
    $type = (string)($ev['type'] ?? '');
    if (str_starts_with($type, 'customer.subscription.') && !empty($o['id'])) {
        $item = $o['items']['data'][0] ?? [];
        $tier = tier_of_price((string)($item['price']['id'] ?? '')) ?: (string)($o['metadata']['tier'] ?? '');
        $end = (int)($o['current_period_end'] ?? ($item['current_period_end'] ?? 0));
        $row = ['user_id' => ctype_digit((string)($o['metadata']['user_id'] ?? '')) ? (int)$o['metadata']['user_id'] : null, 'discord_id' => digits($o['metadata']['discord_id'] ?? ''),
            'tier' => $tier ?: 'basic', 'status' => $type === 'customer.subscription.deleted' ? 'canceled' : str((string)($o['status'] ?? 'active'), 20),
            'stripe_customer' => str((string)($o['customer'] ?? ''), 64), 'period_end' => $end ? gmdate('Y-m-d H:i:s', $end) : null, 'cancel_at_end' => !empty($o['cancel_at_period_end']) ? 1 : 0, 'updated_at' => now()];
        $ex = one('SELECT id,user_id,discord_id FROM subscriptions WHERE stripe_sub=?', [$o['id']]);
        if ($ex) { if (!$row['user_id']) { unset($row['user_id']); } if ($row['discord_id'] === '') unset($row['discord_id']); update('subscriptions', (int)$ex['id'], $row); }
        else insert('subscriptions', $row + ['stripe_sub' => str((string)$o['id'], 64), 'created_at' => now()]);
        if (in_array($row['status'], ['active', 'trialing'], true) && ($row['discord_id'] ?? '') !== '')
            q("UPDATE subscriptions SET status='ended', updated_at=? WHERE discord_id=? AND stripe_sub LIKE 'manual:%' AND status='trialing'", [now(), $row['discord_id']]);
    }
    json_out(['ok' => true]);
}
if ($path === 'subscriptions' && $m === 'GET') {
    header('Cache-Control: private, no-store');    
    json_out(['ok' => true, 'intro' => (string)setting('sub_intro'), 'currency' => (string)(setting('sub_currency') ?: 'USD'),
        'tiers' => array_values(array_map(fn($t) => ['key' => $t['key'], 'name' => $t['name'], 'price' => $t['price'], 'color' => $t['color'], 'benefits' => $t['benefits'], 'popular' => $t['popular'],
            'stripe' => stripe_ready() && stripe_price($t['key']) !== ''], array_filter(sub_tiers(), fn($t) => $t['visible']))),
        'mine' => (function () use ($me) { if (!$me) return null; $s = current_sub((int)$me['user']['id'], (string)$me['user']['discord_id']); return $s ? ['tier' => $s['tier'], 'status' => $s['status'], 'period_end' => $s['period_end'], 'cancel_at_end' => (bool)$s['cancel_at_end'], 'gift' => is_gift($s)] : null; })()]);
}
if ($path === 'games' && $m === 'GET') {
    header('Cache-Control: public, max-age=60');
    $games = all('SELECT slug,name,platform,status,tagline,description,release_text,play_url,featured,playing,visits,favorites,likes,dislikes,stats_at,stats_hidden FROM games ORDER BY sort,id');
     
    foreach ($games as &$g) { $g['icon'] = is_file(__DIR__ . '/../assets/games/' . $g['slug'] . '-256.jpg') ? base_url() . '/assets/games/' . $g['slug'] . '-256.jpg' : null; } unset($g);
    $grp = json_decode((string)setting('roblox_group'), true);
    json_out(['ok' => true, 'games' => $games, 'group' => is_array($grp) ? $grp : null]);
}

 
if ($path === 'contact' && $m === 'POST') {
    $c = need_login(); need_post($c); $u = $c['user']; $b = body();
    if (!empty($b['website'])) json_out(['ok' => true]);
    if (!rate('ct:' . $u['id'], 5, 3600) || !rate('ct:all', 300, 86400)) fail('Too many messages. Please try again later.', 429);
    $email = strtolower(str($b['email'] ?? '', 190)); $msg = str($b['message'] ?? '', 4000); $topic = str($b['topic'] ?? 'General question', 40);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($msg) < 10) fail('Add a valid email address and a message (at least 10 characters).');
    insert('messages', ['user_id' => $u['id'], 'name' => $u['username'], 'email' => $email, 'topic' => $topic, 'message' => $msg, 'created_at' => now()]);
    send_mail('contact@axiomategames.com', '[Website] ' . $topic . ' from ' . $u['username'], "From: {$u['username']} (Discord {$u['discord_id']})\nReply to: $email\nTopic: $topic\n\n$msg\n\nView it in the staff panel: " . base_url() . '/staff/messages', $email);
    json_out(['ok' => true]);
}

 
const REPORT_TYPES = ['fake-trade', 'phishing', 'impersonation', 'payment', 'other'];
if ($path === 'reports' && $m === 'POST') {
    $c = need_login(); need_post($c); $u = need_verified($c); $b = body();
    if (!empty($b['website'])) json_out(['ok' => true]);
    if (!rate('rp:' . $u['id'], 5, 86400)) fail('You have reached the daily report limit.', 429);
    $desc = str($b['description'] ?? '', 4000);
    $type = in_array($b['type'] ?? '', REPORT_TYPES, true) ? $b['type'] : 'other';
    if (mb_strlen($desc) < 20) fail('Describe what happened (at least 20 characters).');
    $rb = roblox_lookup(str($b['roblox_username'] ?? '', 40));
    if (!$rb) fail('We could not find that Roblox username. Check the spelling, or try again later.', 422);
    $id = insert('reports', ['user_id' => $u['id'], 'scammer_name' => $rb['name'], 'scammer_roblox_id' => $rb['id'], 'scammer_discord_id' => digits($b['discord_id'] ?? ''), 'platform' => 'Roblox', 'type' => $type, 'description' => $desc, 'evidence' => str($b['evidence'] ?? '', 1000), 'created_at' => now()]);
    $ref = 'SL-' . str_pad((string)$id, 4, '0', STR_PAD_LEFT);
    q('UPDATE reports SET ref=? WHERE id=?', [$ref, $id]);
    json_out(['ok' => true, 'ref' => $ref]);
}
if ($path === 'reports/public' && $m === 'GET') {
    header('Cache-Control: public, max-age=60');
    $rows = all("SELECT ref,scammer_name AS roblox_username,scammer_roblox_id AS roblox_id,type,public_summary,published_at FROM reports WHERE status='verified' AND published=1 AND scammer_roblox_id IS NOT NULL ORDER BY published_at DESC, id DESC LIMIT 500");
    json_out(['ok' => true, 'reports' => $rows]);
}

 
if ($path === 'jobs' && $m === 'GET') {
    $jobs = all("SELECT id,title,area,description,questions FROM jobs WHERE status='open' ORDER BY id DESC LIMIT 100");
    foreach ($jobs as &$j) { $j['questions'] = job_questions($j['questions']); } unset($j);
    json_out(['ok' => true, 'jobs' => $jobs]);
}
if ($path === 'applications' && $m === 'POST') {
    $c = need_login(); need_post($c); $u = $c['user']; $b = body();
    if (!empty($b['website'])) json_out(['ok' => true]);
     
    if (!is_verified($u)) fail('Verify your account first: link your Roblox account on your Account page, then apply.', 403);
    if (!rate('ap:' . $u['id'], 5, 86400)) fail('You have reached the daily application limit.', 429);
    $job = ctype_digit((string)($b['job_id'] ?? '')) ? one("SELECT id,area,title,questions FROM jobs WHERE id=? AND status='open'", [(int)$b['job_id']]) : null;
    if (!$job) fail('Choose one of the open positions.');
    if (one('SELECT id FROM applications WHERE user_id=? AND job_id=?', [$u['id'], $job['id']])) fail('You already applied for this position.', 409);
    $qs = job_questions($job['questions']);
    $answers = [];
    if ($qs) {
        foreach ($qs as $i => $q) {
            $a = str($b['a_' . $i] ?? '', $q['type'] === 'long' ? 2000 : 300);
            if ($q['required'] && $a === '') fail('Please answer: ' . $q['q']);
            $answers[] = ['q' => $q['q'], 'a' => $a];
        }
    } else {
        $msg = str($b['message'] ?? '', 4000);
        if (mb_strlen($msg) < 20) fail('Tell us a bit more about yourself (at least 20 characters).');
        $answers[] = ['q' => 'About you', 'a' => $msg];
    }
    $summary = implode("\n\n", array_map(fn($x) => $x['q'] . "\n" . ($x['a'] !== '' ? $x['a'] : '-'), $answers));
    insert('applications', ['user_id' => $u['id'], 'job_id' => $job['id'], 'area' => $job['area'], 'portfolio' => str($b['portfolio'] ?? '', 400), 'message' => mb_substr($summary, 0, 60000),
        'answers' => json_encode($answers, JSON_UNESCAPED_UNICODE), 'applicant_discord' => $u['discord_id'], 'applicant_name' => $u['username'], 'applicant_avatar' => $u['avatar'], 'created_at' => now()]);
    json_out(['ok' => true]);
}

 
const LISTING_CATS = ['help', 'commission', 'hiring', 'other'];    
if ($path === 'listings' && $m === 'GET') {
    json_out(['ok' => true,
         
        'approvers' => (int)one('SELECT COUNT(*) n FROM team_members WHERE post_approver=1')['n'] + (int)one("SELECT COUNT(*) n FROM staff WHERE role IN ('admin','owner')")['n'] + (setting('owner_discord_id') ? 1 : 0),
        'listings' => all("SELECT l.id,l.title,l.category,l.description,l.price_text,l.created_at,u.username AS seller,u.roblox_username AS seller_roblox, u.discord_id AS seller_discord, l.reposted_at FROM listings l LEFT JOIN users u ON u.id=l.user_id WHERE l.status='active' ORDER BY COALESCE(l.reposted_at, l.created_at) DESC, l.id DESC LIMIT 200")]);
}
if ($path === 'listings' && $m === 'POST') {
    $c = need_login(); need_post($c); $u = need_verified($c); $b = body();
    if (!empty($b['website'])) json_out(['ok' => true]);
    if (!rate('ls:' . $u['id'], 5, 86400)) fail('Daily post limit reached.', 429);
    $title = str($b['title'] ?? '', 120); $desc = str($b['description'] ?? '', 3000); $price = str($b['price_text'] ?? '', 60);
    if ($title === '' || mb_strlen($desc) < 20 || $price === '') fail('Add a title, a price and a description (at least 20 characters).');
    insert('listings', ['user_id' => $u['id'], 'title' => $title, 'category' => in_array($b['category'] ?? '', LISTING_CATS, true) ? $b['category'] : 'other', 'description' => $desc, 'price_text' => $price, 'created_at' => now()]);
    json_out(['ok' => true]);
}

 
const GW_SELECT = 'SELECT g.*, (SELECT COUNT(*) FROM giveaway_entries e WHERE e.giveaway_id=g.id) AS entries FROM giveaways g';
function gw_list(?string $json): array { $v = json_decode((string)$json, true); return is_array($v) ? $v : []; }
function gw_out(array $g, bool $public = false): array {
    $o = ['id' => (int)$g['id'], 'kind' => $g['kind'], 'title' => $g['title'], 'description' => (string)$g['description'], 'winners_count' => (int)$g['winners_count'],
        'host_name' => (string)$g['host_name'], 'starts_at' => $g['starts_at'], 'ends_at' => $g['ends_at'], 'status' => $g['status'], 'ended_at' => $g['ended_at'],
        'created_at' => $g['created_at'], 'entries' => (int)$g['entries']];
    $w = gw_list($g['winners']);
    if ($public) {
        $o['winners'] = array_map(fn($x) => (string)($x['name'] ?? ''), $w);
        $o['url'] = ($g['guild_id'] && $g['channel_id'] && $g['message_id']) ? 'https://discord.com/channels/' . $g['guild_id'] . '/' . $g['channel_id'] . '/' . $g['message_id'] : null;
        return $o;
    }
    return $o + ['guild_id' => $g['guild_id'], 'channel_id' => (string)$g['channel_id'], 'message_id' => (string)$g['message_id'], 'host_id' => (string)$g['host_id'],
        'required_role_id' => (string)$g['required_role_id'], 'winners' => $w, 'past_winners' => gw_list($g['past_winners'])];
}
 
function gw_draw(int $id, int $n, array $exclude): array {
    $pool = array_values(array_filter(all('SELECT user_id,user_name FROM giveaway_entries WHERE giveaway_id=?', [$id]), fn($e) => !in_array((string)$e['user_id'], $exclude, true)));
    for ($i = count($pool) - 1; $i > 0; $i--) { $j = random_int(0, $i); [$pool[$i], $pool[$j]] = [$pool[$j], $pool[$i]]; }
    return array_map(fn($e) => ['id' => (string)$e['user_id'], 'name' => (string)$e['user_name']], array_slice($pool, 0, max(0, $n)));
}
function gw_time($v): ?string { return is_string($v) && preg_match('/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/', $v) ? $v : null; }

 
if ($path === 'giveaways' && $m === 'GET') {
    header('Cache-Control: public, max-age=30');
    $home = (string)setting('home_guild_id');
    $rows = all(GW_SELECT . " WHERE (g.status='active' OR (g.status='ended' AND g.ended_at>=?))" . ($home !== '' ? ' AND g.guild_id=?' : '') . ' ORDER BY g.id DESC LIMIT 200', $home !== '' ? [plus('-7 days'), $home] : [plus('-7 days')]);
    json_out(['ok' => true, 'now' => now(), 'items' => array_map(fn($g) => gw_out($g, true), $rows)]);
}

 
if (str_starts_with($path, 'bot/')) {
    $key = (string)($_SERVER['HTTP_X_API_KEY'] ?? '');
    if (!preg_match('/^axm_(ticket|moderation|community|verification|helper|roblox|development|axiomate)_[a-f0-9]{48}$/', $key))
        fail($key === '' ? 'Invalid API key: no key was sent. Set the bot\'s _API_KEY variable.' : 'Invalid API key: it is not a whole key (it should be axm_<bot>_ followed by 48 letters and numbers, ' . (strlen($key) - (int)strpos($key, '_', 4) - 1) . ' found). Copy it again from the panel without spaces or quotes.', 401);
     
    $entryCall = (bool)preg_match('#^bot/giveaways/\d+(/enter)?$#', $path);
    if (!rate(($entryCall ? 'bote:' : 'bot:') . substr($key, 0, 24), $entryCall ? 3000 : 1200, 60)) fail('Slow down.', 429);
    $k = one('SELECT * FROM api_keys WHERE key_hash=? AND active=1', [hash('sha256', $key)]);
    if (!$k) {
        $old = one('SELECT active FROM api_keys WHERE key_hash=?', [hash('sha256', $key)]);
        fail($old ? 'Invalid API key: this key was revoked in the panel. Create a new one on the Bots page.' : 'Invalid API key: the website does not know this key (ending ' . substr($key, -4) . '). Check it matches a key on the panel\'s Bots page, or create a new one.', 401);
    }
    q('UPDATE api_keys SET last_used_at=? WHERE id=?', [now(), $k['id']]);
    $GLOBALS['axm_bot_ok'] = true;
    $keyScope = $scope = $k['scope']; $b = body(); $p = substr($path, 4);
    if ($keyScope === 'axiomate') {
        $mod = strtolower((string)($_SERVER['HTTP_X_BOT_MODULE'] ?? ''));
        $scope = in_array($mod, ['community', 'moderation', 'ticket', 'verification', 'helper', 'development'], true) ? $mod : 'axiomate';
    }
    $need = function (string ...$s) use ($scope, $keyScope) { if ($keyScope !== 'axiomate' && !in_array($scope, $s, true)) fail('This key cannot use that endpoint.', 403); };
     
    $gid = digits($_GET['guild_id'] ?? ($b['guild_id'] ?? ''));
    $needGuild = function () use ($gid) { if ($gid === '') fail('guild_id is required.'); return $gid; };
     
    $roleIds = fn($v) => array_values(array_filter(array_map(fn($x) => digits($x), is_array($v) ? $v : explode(',', (string)$v))));
    $perkOut = fn(array $pk) => ['market_h' => $pk['market_h'], 'repost_h' => $pk['repost_h'], 'priority' => $pk['priority'], 'priority_label' => $pk['priority_label'], 'roles' => $pk['roles']];
     
    if ($p === 'perks/config' && $m === 'GET') {
        $mg = (string)setting('main_guild_id');
        json_out(['ok' => true, 'guild_id' => main_guild(), 'main_guild_id' => $mg, 'main_name' => $mg !== '' ? guild_label($mg) : '', 'invite' => (string)setting('main_invite')]);
    }

    if ($p === 'heartbeat' && $m === 'POST') {
        $info = str($b['info'] ?? '', 400);
        if (one('SELECT 1 AS x FROM bot_status WHERE scope=?', [$scope])) q('UPDATE bot_status SET info=?,last_seen=? WHERE scope=?', [$info, now(), $scope]);
        else q('INSERT INTO bot_status (scope,info,last_seen) VALUES (?,?,?)', [$scope, $info, now()]);
        json_out(['ok' => true]);
    }
    if ($p === 'guilds' && $m === 'POST') {
        $list = is_array($b['guilds'] ?? null) ? array_slice($b['guilds'], 0, 500) : [];
         
        if (!$list) json_out(['ok' => true, 'guilds' => 0, 'kept' => true]);
        q('DELETE FROM bot_guilds WHERE scope=?', [$scope]);
        foreach ($list as $g) {
            $id = digits($g['id'] ?? ''); if (!$id) continue;
            q('INSERT INTO bot_guilds (scope,guild_id,name,members,updated_at) VALUES (?,?,?,?,?)', [$scope, $id, str($g['name'] ?? '', 100), is_numeric($g['members'] ?? null) ? (int)$g['members'] : null, now()]);
        }
        json_out(['ok' => true, 'guilds' => count($list)]);
    }
    if ($p === 'verify' && $m === 'GET') {
        $did = digits($_GET['discord_id'] ?? '');
        $u = $did ? one('SELECT * FROM users WHERE discord_id=?', [$did]) : null;
        json_out(['ok' => true, 'linked' => (bool)$u, 'verified' => $u ? is_verified($u) : false, 'roblox_id' => $u && is_verified($u) ? $u['roblox_id'] : null, 'roblox_username' => $u && is_verified($u) ? $u['roblox_username'] : null, 'banned' => $u ? (int)$u['banned'] === 1 : false]);
    }
    if ($p === 'report-status' && $m === 'GET') {
        $need('community');
        $did = digits($_GET['discord_id'] ?? '');
        $u = $did ? one('SELECT id FROM users WHERE discord_id=?', [$did]) : null;
        json_out(['ok' => true, 'reports' => $u ? all('SELECT ref,scammer_name,status,published,created_at FROM reports WHERE user_id=? ORDER BY id DESC LIMIT 10', [$u['id']]) : []]);
    }

    if ($p === 'tickets' && $m === 'POST') {
        $need('ticket');
        $did = digits($b['discord_user_id'] ?? '');
        if (!$did) fail('discord_user_id required');
        $needGuild();
        if (one("SELECT id FROM tickets WHERE discord_user_id=? AND status<>'closed'", [$did])) fail('You already have an open ticket.', 409);
        $uname = str($b['discord_username'] ?? '', 80); $subject = str($b['subject'] ?? '', 200); $details = str($b['details'] ?? '', 3000, false);
        $cat = str($b['category'] ?? 'general', 40);
        $reported = in_array($cat, ['staff', 'rules'], true) ? digits($b['reported_id'] ?? '') : '';
        if ($cat === 'staff' && $reported === '') fail('A staff report needs the Discord user ID of the staff member.');
        $pk = member_perks($roleIds($b['role_ids'] ?? []));
        $id = insert('tickets', ['priority' => $pk['priority'], 'reported_id' => $reported ?: null,'guild_id' => $gid, 'discord_user_id' => $did, 'discord_username' => $uname, 'channel_id' => digits($b['channel_id'] ?? ''), 'category' => str($b['category'] ?? 'general', 40), 'subject' => $subject, 'details' => $details, 'evidence_flag' => !empty($b['sensitive']) ? 1 : 0, 'created_at' => now()]);
        $ref = 'TK-' . str_pad((string)$id, 4, '0', STR_PAD_LEFT);
        q('UPDATE tickets SET ref=? WHERE id=?', [$ref, $id]);
        ticket_say($id, 'user', $uname, $details !== '' ? $details : $subject);
        json_out(['ok' => true, 'id' => $id, 'ref' => $ref, 'priority' => $pk['priority'], 'priority_label' => $pk['priority_label']]);
    }
    if ($p === 'tickets/case' && $m === 'GET') {
        $need('ticket'); $needGuild();
        $c = one('SELECT id,action,target_id,moderator_id,reason FROM mod_actions WHERE id=? AND guild_id=?', [(int)($_GET['case_id'] ?? 0), $gid]);
        if (!$c || $c['target_id'] !== digits($_GET['user_id'] ?? '')) fail('That case was not found for your account in this server.', 404);
        json_out(['ok' => true, 'case' => ['id' => (int)$c['id'], 'action' => $c['action'], 'moderator_id' => (string)$c['moderator_id'], 'reason' => (string)$c['reason']]]);
    }
    if ($p === 'tickets' && $m === 'GET') {
        $need('ticket'); $needGuild();
        json_out(['ok' => true, 'tickets' => all("SELECT id,ref,discord_user_id,channel_id,category,status,claimed_by,created_at FROM tickets WHERE status<>'closed' AND guild_id=? ORDER BY id DESC LIMIT 200", [$gid])]);
    }
     
    if ($p === 'tickets/status' && $m === 'GET') {
        $need('ticket');
        $did = digits($_GET['discord_user_id'] ?? '');
        json_out(['ok' => true, 'ticket' => $did !== '' ? ticket_status($did) : null]);
    }
     
    if ($p === 'tickets/note' && $m === 'POST') {
        $need('ticket');
        $ref = strtoupper(trim((string)($b['ticket'] ?? '')));
        $num = (int)preg_replace('/\D/', '', $ref);
        $t = $num ? one('SELECT * FROM tickets WHERE id=?', [$num]) : null;
        if (!$t) fail('No ticket ' . ($ref !== '' ? $ref : '') . ' found. Use the reference, like TK-0012.', 404);
        $text = str($b['text'] ?? '', 2000, false);
        if (trim($text) === '') fail('Write the note first.');
        $by = str($b['by'] ?? 'Staff', 80);
        ticket_add_note((int)$t['id'], $text, $by, !empty($b['notify']) && $t['status'] !== 'closed');
        audit($by, 'ticket.note', (string)$t['ref'] . ' (from Discord)');
        json_out(['ok' => true, 'ref' => (string)$t['ref'], 'user_id' => (string)$t['discord_user_id'], 'status' => (string)$t['status']]);
    }
     
    if ($p === 'tickets/mine' && $m === 'GET') {
        $need('ticket');
        $did = digits($_GET['discord_user_id'] ?? '');
        $t = $did ? one("SELECT id,ref,guild_id,category,status,claimed_by FROM tickets WHERE discord_user_id=? AND status<>'closed' ORDER BY id DESC LIMIT 1", [$did]) : null;
        json_out(['ok' => true, 'ticket' => $t]);
    }
     
     
    if ($p === 'tickets/unannounced' && $m === 'GET') {
        $need('ticket');
        json_out(['ok' => true, 'tickets' => all("SELECT id,ref,guild_id,discord_user_id,discord_username,category,subject,details FROM tickets WHERE staff_notified=0 ORDER BY id LIMIT 10")]);
    }
    if (preg_match('#^tickets/(\d+)/announced$#', $p, $mm) && $m === 'POST') {
        $need('ticket');
        q('UPDATE tickets SET staff_notified=1 WHERE id=?', [(int)$mm[1]]);
        json_out(['ok' => true]);
    }
    if ($p === 'tickets/outbox' && $m === 'GET') {
        $need('ticket');
        json_out(['ok' => true, 'messages' => all("SELECT m.id, m.ticket_id, m.kind, m.author_name, m.content, t.ref, t.guild_id, t.discord_user_id FROM ticket_messages m JOIN tickets t ON t.id=m.ticket_id WHERE m.delivered=0 ORDER BY m.id LIMIT 20")]);
    }
    if (preg_match('#^tickets/outbox/(\d+)/delivered$#', $p, $mm) && $m === 'POST') {
        $need('ticket');
        q('UPDATE ticket_messages SET delivered=? WHERE id=? AND delivered=0', [!empty($b['failed']) ? 2 : 1, (int)$mm[1]]);
        json_out(['ok' => true]);
    }
     
    if (preg_match('#^tickets/(\d+)/messages$#', $p, $mm) && $m === 'POST') {
        $need('ticket'); $needGuild(); $id = (int)$mm[1];
        $t = one('SELECT id,status FROM tickets WHERE id=? AND guild_id=?', [$id, $gid]);
        if (!$t) fail('Ticket not found.', 404);
        if ($t['status'] === 'closed') fail('That ticket is closed.', 409);
        $text = str($b['content'] ?? '', 3500, false);
        if (trim($text) === '') fail('content required');
        if (!rate('tkmsg:' . $id, 30, 60)) fail('Slow down.', 429);
        ticket_say($id, 'user', str($b['author_name'] ?? '', 80), $text);
        json_out(['ok' => true]);
    }
    if (preg_match('#^tickets/(\d+)/(claim|close)$#', $p, $mm) && $m === 'POST') {
        $need('ticket'); $id = (int)$mm[1]; $needGuild();
        if (!one('SELECT id FROM tickets WHERE id=? AND guild_id=?', [$id, $gid])) fail('Ticket not found.', 404);
        if ($mm[2] === 'claim') { q("UPDATE tickets SET status='claimed', claimed_by=? WHERE id=? AND status<>'closed'", [str($b['claimed_by'] ?? '', 80), $id]); }
        else {
            $tr = str($b['transcript'] ?? '', 500000, false);
            q("UPDATE tickets SET status='closed', closed_by=?, transcript=?, closed_at=? WHERE id=? AND status<>'closed'", [str($b['closed_by'] ?? '', 80), $tr !== '' ? $tr : ticket_transcript($id), now(), $id]);
        }
        json_out(['ok' => true]);
    }

     
    if ($p === 'bans/pending' && $m === 'GET') {
        $need('moderation');
        json_out(['ok' => true, 'bans' => all("SELECT id,discord_id,reason,by_name,source FROM pending_bans WHERE status='waiting' ORDER BY id LIMIT 20")]);
    }
    if (preg_match('#^bans/(\d+)/done$#', $p, $mm) && $m === 'POST') {
        $need('moderation');
        $ban = one('SELECT * FROM pending_bans WHERE id=?', [(int)$mm[1]]); if (!$ban) fail('Not found.', 404);
        $lines = [];
        foreach ((array)($b['results'] ?? []) as $r) {
            $g = digits($r['guild_id'] ?? ''); if ($g === '') continue;
            $lines[] = guild_label($g) . ': ' . (!empty($r['ok']) ? 'banned' : 'not banned (' . str((string)($r['error'] ?? 'error'), 120) . ')');
            if (!empty($r['ok'])) insert('mod_actions', ['guild_id' => $g, 'action' => 'ban', 'target_id' => $ban['discord_id'], 'target_name' => str($r['name'] ?? '', 80), 'moderator_id' => '', 'moderator_name' => (string)$ban['by_name'], 'reason' => (string)$ban['reason'], 'created_at' => now()]);
        }
        q("UPDATE pending_bans SET status='done', result=?, done_at=? WHERE id=?", [implode("\n", $lines) ?: 'The bot is in no servers.', now(), $ban['id']]);
        json_out(['ok' => true]);
    }
    if ($p === 'modactions' && $m === 'POST') {
        $need('moderation'); $needGuild();
        $act = (string)($b['action'] ?? '');
        if (!in_array($act, ['warn', 'timeout', 'untimeout', 'kick', 'ban', 'unban', 'softban', 'clearwarn', 'note'], true)) fail('Unknown action.');
        $tid = digits($b['target_id'] ?? '');
        if (!$tid) fail('target_id required');
        $id = insert('mod_actions', ['guild_id' => $gid, 'action' => $act, 'target_id' => $tid, 'target_name' => str($b['target_name'] ?? '', 80), 'moderator_id' => digits($b['moderator_id'] ?? ''), 'moderator_name' => str($b['moderator_name'] ?? '', 80), 'reason' => str($b['reason'] ?? '', 500), 'duration_minutes' => isset($b['duration_minutes']) ? (int)$b['duration_minutes'] : null, 'created_at' => now()]);
        json_out(['ok' => true, 'case' => $id]);
    }
    if ($p === 'modactions' && $m === 'GET') {
        $need('moderation'); $needGuild();
        $tid = digits($_GET['target_id'] ?? '');
        json_out(['ok' => true, 'actions' => $tid ? all('SELECT id,action,reason,moderator_name,duration_minutes,cleared,created_at FROM mod_actions WHERE target_id=? AND guild_id=? ORDER BY id DESC LIMIT 25', [$tid, $gid]) : []]);
    }
    if (preg_match('#^cases/(\d+)$#', $p, $mm)) {
        $need('moderation'); $needGuild();
        $case = one('SELECT * FROM mod_actions WHERE id=? AND guild_id=?', [(int)$mm[1], $gid]);  
        if (!$case) fail('Case not found.', 404);
        if ($m === 'POST') {
            $why = str($b['reason'] ?? '', 500);
            if ($why === '') fail('A reason is required.');
            q('UPDATE mod_actions SET reason=? WHERE id=?', [$why, $case['id']]);
            $case['reason'] = $why;
        }
        json_out(['ok' => true, 'case' => $case]);
    }
    if ($p === 'warnings' && $m === 'GET') {
        $need('moderation'); $needGuild();
        $tid = digits($_GET['target_id'] ?? '');
        json_out(['ok' => true, 'warnings' => $tid ? all("SELECT id,reason,moderator_name,cleared,created_at FROM mod_actions WHERE target_id=? AND guild_id=? AND action='warn' ORDER BY id DESC LIMIT 50", [$tid, $gid]) : []]);
    }
    if ($p === 'warnings/clear' && $m === 'POST') {
        $need('moderation'); $needGuild();
        $tid = digits($b['target_id'] ?? ''); $cid = (int)($b['case_id'] ?? 0);
        if (!$tid) fail('target_id required');
        $n = $cid
            ? q("UPDATE mod_actions SET cleared=1 WHERE id=? AND target_id=? AND guild_id=? AND action='warn' AND cleared=0", [$cid, $tid, $gid])->rowCount()
            : q("UPDATE mod_actions SET cleared=1 WHERE target_id=? AND guild_id=? AND action='warn' AND cleared=0", [$tid, $gid])->rowCount();
        if ($n === 0) fail($cid ? 'That warning was not found for this user, or is already cleared.' : 'This user has no active warnings.', 404);
        $id = insert('mod_actions', ['guild_id' => $gid, 'action' => 'clearwarn', 'target_id' => $tid, 'target_name' => str($b['target_name'] ?? '', 80), 'moderator_id' => digits($b['moderator_id'] ?? ''), 'moderator_name' => str($b['moderator_name'] ?? '', 80), 'reason' => $cid ? 'Cleared warning case #' . $cid : 'Cleared all warnings (' . $n . ')', 'created_at' => now()]);
        json_out(['ok' => true, 'cleared' => $n, 'case' => $id]);
    }
    if ($p === 'scamcheck' && $m === 'GET') {
        $need('moderation');
        $did = digits($_GET['discord_id'] ?? ''); $rid = digits($_GET['roblox_id'] ?? '', 20); $nm = strtolower(str($_GET['name'] ?? '', 80));
        if (!$rid && $did) { $lu = one('SELECT roblox_id FROM users WHERE discord_id=? AND roblox_verified_at IS NOT NULL', [$did]); $rid = (string)($lu['roblox_id'] ?? ''); }
        $rows = all("SELECT ref,scammer_name,scammer_roblox_id,type,public_summary FROM reports WHERE status='verified' AND published=1 AND ((scammer_discord_id<>'' AND scammer_discord_id=?) OR (scammer_roblox_id IS NOT NULL AND scammer_roblox_id=?) OR LOWER(scammer_name)=?) LIMIT 5", [$did ?: '-', $rid ?: '-', $nm ?: '-']);
        json_out(['ok' => true, 'matches' => $rows]);
    }

    if ($p === 'announcements/pending' && $m === 'GET') {
        $need('community');
        json_out(['ok' => true, 'announcements' => all("SELECT id,title,body,kind FROM announcements WHERE status='published' AND posted_at IS NULL ORDER BY id LIMIT 10")]);
    }
    if (preg_match('#^announcements/(\d+)/posted$#', $p, $mm) && $m === 'POST') {
        $need('community');
        q('UPDATE announcements SET posted_at=?, posted_message_id=? WHERE id=?', [now(), digits($b['message_id'] ?? ''), (int)$mm[1]]);
        json_out(['ok' => true]);
    }

     
     

    $homeGuild = function () use ($gid) {
        $h = (string)setting('home_guild_id');
        if ($h === '' && $gid !== '') { set_setting('home_guild_id', $gid); $h = $gid; }
        return $h;
    };
    if ($p === 'team/config' && $m === 'GET') {
        $need('verification', 'moderation');
        json_out(['ok' => true, 'home_guild_id' => (string)setting('home_guild_id'), 'founder_id' => founder_id(), 'min_role_id' => (string)(setting('team_min_role') ?: ''), 'role_ids' => array_column(all('SELECT discord_role_id FROM role_map'), 'discord_role_id')]);
    }
    if ($p === 'team/sync' && $m === 'POST') {
        $need('verification', 'moderation'); $needGuild();
        if ($homeGuild() !== $gid) fail('That server is not the studio home server, so it does not feed the team roster.', 409);
        $roles = is_array($b['roles'] ?? null) ? array_slice($b['roles'], 0, 500) : [];
        $members = is_array($b['members'] ?? null) ? array_slice($b['members'], 0, 1000) : [];
        if ((int)($b['fetched'] ?? 0) < 2) fail('Incomplete member list. Check the bot has the Server Members intent.', 422);
        q('DELETE FROM guild_roles');
        foreach ($roles as $r) {
            $rid = digits($r['id'] ?? ''); if (!$rid) continue;
            q('INSERT INTO guild_roles (role_id,name,color,position,on_team,staff,members,updated_at) VALUES (?,?,?,?,?,?,?,?)', [$rid, str($r['name'] ?? '', 100), (int)($r['color'] ?? 0), (int)($r['position'] ?? 0), !empty($r['team']) ? 1 : 0, !empty($r['staff']) ? 1 : 0, max(0, (int)($r['members'] ?? 0)), now()]);
        }
        $map = [];
        foreach (all('SELECT * FROM role_map') as $r) $map[$r['discord_role_id']] = $r;
         

         

        $info = []; $auto = []; $team = []; $apprRoles = [];
        foreach ($roles as $r) {
            $rid = digits($r['id'] ?? ''); if (!$rid || !empty($r['managed'])) continue;
            $info[$rid] = ['name' => str($r['name'] ?? '', 100), 'position' => (int)($r['position'] ?? 0)];
            $hidden = isset($map[$rid]) && (int)$map[$rid]['show_team'] !== 1;
            if (!empty($r['team']) && !$hidden) $team[$rid] = true;
            if (!empty($r['staff']) && !isset($map[$rid])) $auto[$rid] = true;
             
            if (preg_match('/post[\s\-_]*approv/i', (string)($r['name'] ?? ''))) $apprRoles[$rid] = true;
        }
        $seen = []; $staffSeen = []; $added = 0;
        foreach ($members as $mem) {
            $did = digits($mem['discord_id'] ?? ''); if (!$did) continue;
            $av = isset($mem['avatar']) && preg_match('/^(guild:\d{5,25}:)?[A-Za-z0-9_]{1,40}$/', (string)$mem['avatar']) ? (string)$mem['avatar'] : null;
             
            if ($did === founder_id()) { q("UPDATE team_members SET avatar=?, updated_at=? WHERE discord_id=? AND source='founder'", [$av, now(), $did]); $seen[] = $did; }
            $hit = []; $listed = []; $isAppr = false;
            foreach ((is_array($mem['roles'] ?? null) ? $mem['roles'] : []) as $rid) {
                $rid = digits($rid); if ($rid === '') continue;
                if (isset($apprRoles[$rid])) $isAppr = true;
                if (isset($map[$rid])) { $hit[] = $map[$rid]; if ((int)$map[$rid]['show_team'] === 1 && isset($info[$rid])) $listed[] = $rid; }
                elseif (isset($auto[$rid]) || isset($team[$rid])) $listed[] = $rid;
            }
            if (!$hit && !$listed && !$isAppr) continue;
            usort($listed, fn($x, $y) => $info[$y]['position'] <=> $info[$x]['position']);
            $top = $listed[0] ?? null;
            $depts = []; $titles = []; $access = 0; $appr = 0; $show = 0;
            foreach ($hit as $r) {
                if ($r['department'] && isset(DEPTS[$r['department']])) $depts[$r['department']] = DEPTS[$r['department']];
                if ((int)$r['show_team'] === 1) { $show = 1; $titles[] = $r['title'] ?: $r['role_name']; }
                $access = max($access, ['none' => 0, 'moderator' => 1, 'admin' => 2][$r['access']] ?? 0);
                if ((int)$r['post_approver'] === 1) $appr = 1;
            }
            if ($isAppr) $appr = 1;
            if ($top !== null) { $show = 1; if (!$titles) $titles[] = $info[$top]['name']; }
            arsort($depts);
            $name = str($mem['username'] ?? 'Member', 80) ?: 'Member';
            $seen[] = $did;
            $ex = one('SELECT id,source FROM team_members WHERE discord_id=?', [$did]);
            if ($ex && $ex['source'] === 'founder') {   }
            elseif ($ex) { q('UPDATE team_members SET name=?, avatar=?, departments=?, titles=?, post_approver=?, visible=?, role_id=?, role_ids=?, updated_at=? WHERE id=?', [$name, $av, implode(',', array_keys($depts)), implode('|', array_unique($titles)), $appr, $show, $top, json_encode(array_values($listed)), now(), $ex['id']]); }
            else { insert('team_members', ['discord_id' => $did, 'name' => $name, 'avatar' => $av, 'departments' => implode(',', array_keys($depts)), 'titles' => implode('|', array_unique($titles)), 'post_approver' => $appr, 'visible' => $show, 'role_id' => $top, 'role_ids' => json_encode(array_values($listed)), 'source' => 'sync', 'updated_at' => now()]); $added++; }
            if ($access > 0) {
                $role = $access >= 2 ? 'admin' : 'moderator'; $staffSeen[] = $did;
                $s = one('SELECT id,source FROM staff WHERE discord_id=?', [$did]);
                if (!$s) insert('staff', ['discord_id' => $did, 'role' => $role, 'added_by' => 'Axio Moderation Bot', 'source' => 'sync', 'created_at' => now()]);
                elseif ($s['source'] === 'sync') q('UPDATE staff SET role=? WHERE id=?', [$role, $s['id']]);
            }
        }
        $removed = 0;
        foreach (all("SELECT discord_id FROM team_members WHERE source='sync'") as $r) { if (!in_array($r['discord_id'], $seen, true)) { q('DELETE FROM team_members WHERE discord_id=?', [$r['discord_id']]); $removed++; } }
        foreach (all("SELECT discord_id FROM staff WHERE source='sync'") as $r) { if (!in_array($r['discord_id'], $staffSeen, true)) q('DELETE FROM staff WHERE discord_id=?', [$r['discord_id']]); }
        json_out(['ok' => true, 'members' => count(array_unique($seen)), 'added' => $added, 'removed' => $removed]);
    }

     
    if ($p === 'config' && $m === 'GET') {
        $needGuild();
        $mods = []; $admins = [];
        foreach (all("SELECT discord_role_id,access FROM role_map WHERE access<>'none'") as $r) { if ($r['access'] === 'admin') $admins[] = $r['discord_role_id']; else $mods[] = $r['discord_role_id']; }
        json_out(['ok' => true, 'config' => bcfg_all($gid), 'staff_roles' => ['moderator' => $mods, 'admin' => $admins], 'command_ranks' => (object)rank_map('command_ranks')]);
    }
    if ($p === 'config' && $m === 'POST') {
        $needGuild();
        $allowed = ['community' => ['counting.channel', 'counting.count', 'counting.last_user', 'counting.best', 'level.roles', 'level.channel'], 'ticket' => ['ticket.channel', 'ticket.staff_channel'], 'development' => ['dev.board_message'], 'verification' => ['welcome.channel', 'welcome.enabled', 'boost.channel', 'boost.enabled', 'verify.channel', 'verify.role', 'verify.role2', 'verify.role3', 'verify.unverified_role'], 'helper' => ['helper.channel']][$scope] ?? ($scope === 'axiomate' ? ['counting.channel', 'counting.count', 'counting.last_user', 'counting.best', 'level.roles', 'ticket.channel', 'ticket.staff_channel', 'dev.board_message', 'welcome.channel', 'welcome.enabled', 'verify.channel', 'verify.role', 'verify.role2', 'verify.role3', 'verify.unverified_role', 'helper.channel'] : []);
        $k = (string)($b['key'] ?? '');
        $items = is_array($b['values'] ?? null) ? $b['values'] : [$k => $b['value'] ?? ''];
        foreach ($items as $ik => $iv) {
            if (!in_array((string)$ik, $allowed, true)) fail('This bot cannot change that setting.', 403);
        }
        foreach ($items as $ik => $iv) bcfg_set($gid, (string)$ik, str(is_scalar($iv) ? (string)$iv : '', $ik === 'level.roles' ? 3000 : 300));  
        json_out(['ok' => true]);
    }

     
    if ($p === 'levels/xp' && $m === 'POST') {
        $need('community'); $needGuild();
        $uid = digits($b['user_id'] ?? ''); if (!$uid) fail('user_id required');
        $amt = max(1, min(50, (int)($b['amount'] ?? 15))); $t = time();
        $row = one('SELECT * FROM levels WHERE guild_id=? AND user_id=?', [$gid, $uid]);
        $name = str($b['name'] ?? '', 80);
        if (!$row) { q('INSERT INTO levels (guild_id,user_id,name,xp,messages,last_xp_at) VALUES (?,?,?,?,?,?)', [$gid, $uid, $name, $amt, 1, $t]); $before = 0; $after = $amt; }
        elseif ($t - (int)$row['last_xp_at'] < 50) json_out(['ok' => true, 'gained' => false]);
        else { $before = (int)$row['xp']; $after = $before + $amt; q('UPDATE levels SET xp=?, name=?, messages=messages+1, last_xp_at=? WHERE guild_id=? AND user_id=?', [$after, $name ?: $row['name'], $t, $gid, $uid]); }
        $lv = level_info($after);
        json_out(['ok' => true, 'gained' => true, 'xp' => $after, 'level' => $lv['level'], 'leveled_up' => $lv['level'] > level_info($before)['level']]);
    }
    if ($p === 'levels/user' && $m === 'GET') {
        $need('community'); $needGuild();
        $uid = digits($_GET['user_id'] ?? ''); $row = $uid ? one('SELECT * FROM levels WHERE guild_id=? AND user_id=?', [$gid, $uid]) : null;
        $xp = (int)($row['xp'] ?? 0); $lv = level_info($xp);
        $rank = $row ? 1 + (int)one('SELECT COUNT(*) n FROM levels WHERE guild_id=? AND xp>?', [$gid, $xp])['n'] : null;
        json_out(['ok' => true, 'xp' => $xp, 'level' => $lv['level'], 'into' => $lv['into'], 'need' => $lv['need'], 'messages' => (int)($row['messages'] ?? 0), 'rank' => $rank, 'total' => (int)one('SELECT COUNT(*) n FROM levels WHERE guild_id=?', [$gid])['n']]);
    }
    if ($p === 'levels/top' && $m === 'GET') {
        $need('community'); $needGuild();
        $lim = max(1, min(1000, (int)($_GET['limit'] ?? 10)));  
        foreach (all('SELECT user_id,name,xp FROM levels WHERE guild_id=? ORDER BY xp DESC LIMIT ' . $lim, [$gid]) as $r) $out[] = ['rank' => ++$i, 'user_id' => $r['user_id'], 'name' => $r['name'], 'xp' => (int)$r['xp'], 'level' => level_info((int)$r['xp'])['level']];
        json_out(['ok' => true, 'top' => $out]);
    }
    if ($p === 'profile' && $m === 'GET') {
        $need('community');
        $did = digits($_GET['discord_id'] ?? ''); if (!$did) fail('discord_id required');
        $u = one('SELECT roblox_id,roblox_username,roblox_verified_at FROM users WHERE discord_id=?', [$did]);
        $tm = one('SELECT departments,titles FROM team_members WHERE discord_id=? AND visible=1', [$did]);
        json_out(['ok' => true,
            'roblox' => $u && $u['roblox_verified_at'] ? ['id' => $u['roblox_id'], 'username' => $u['roblox_username']] : null,
            'team' => $tm ? ['departments' => array_values(array_filter(explode(',', (string)$tm['departments']))), 'titles' => array_values(array_filter(explode('|', (string)$tm['titles'])))] : null]);
    }
    if ($p === 'afk' && $m === 'GET') { $need('community'); $needGuild(); json_out(['ok' => true, 'afk' => all('SELECT user_id,reason,since FROM afk WHERE guild_id=?', [$gid])]); }
    if ($p === 'afk' && $m === 'POST') {
        $need('community'); $needGuild();
        $uid = digits($b['user_id'] ?? ''); if (!$uid) fail('user_id required');
        q('DELETE FROM afk WHERE guild_id=? AND user_id=?', [$gid, $uid]);
        if (($b['clear'] ?? false) !== true) q('INSERT INTO afk (guild_id,user_id,reason,since) VALUES (?,?,?,?)', [$gid, $uid, str($b['reason'] ?? '', 200) ?: 'AFK', now()]);
        json_out(['ok' => true]);
    }
    if ($p === 'suggestions' && $m === 'POST') {
        $need('community'); $needGuild();
        $text = str($b['text'] ?? '', 1500); if ($text === '') fail('text required');
        $id = insert('suggestions', ['guild_id' => $gid, 'user_id' => digits($b['user_id'] ?? ''), 'user_name' => str($b['user_name'] ?? '', 80), 'text' => $text, 'channel_id' => digits($b['channel_id'] ?? ''), 'message_id' => digits($b['message_id'] ?? ''), 'created_at' => now()]);
        json_out(['ok' => true, 'id' => $id]);
    }
    if ($p === 'suggestions/updates' && $m === 'GET') {
        $need('community');
        json_out(['ok' => true, 'suggestions' => all("SELECT id,user_name,text,channel_id,message_id,status,staff_note,decided_by FROM suggestions WHERE notified=0 AND message_id<>'' ORDER BY id LIMIT 10")]);
    }
    if (preg_match('#^suggestions/(\d+)/notified$#', $p, $mm) && $m === 'POST') {
        $need('community');
        q("DELETE FROM suggestions WHERE id=? AND status='deleted'", [(int)$mm[1]]);
        q('UPDATE suggestions SET notified=1 WHERE id=?', [(int)$mm[1]]);
        json_out(['ok' => true]);
    }
     
     
    if ($p === 'rules' && $m === 'GET') { $need('community', 'helper'); $needGuild(); json_out(['ok' => true, 'rules' => all("SELECT id,num,title,body,audience,punishment FROM rules WHERE guild_id='' OR guild_id=? ORDER BY audience DESC,num,id", [$gid])]); }

     
    if ($p === 'verified' && $m === 'POST') {
        $need('verification');
        $did = digits($b['discord_id'] ?? '');
        if ($did) q('UPDATE users SET server_verified_at=? WHERE discord_id=? AND roblox_verified_at IS NOT NULL', [now(), $did]);
        json_out(['ok' => true]);
    }

     
    if ($p === 'helper/search' && $m === 'GET') {
        $need('helper'); $needGuild();
        $res = helper_search(str($_GET['q'] ?? '', 400), $gid);
        $top = $res[0] ?? null;
        json_out(['ok' => true, 'confident' => (bool)($top && $top['score'] >= 0.34 && $top['strong'] >= 1), 'results' => $res]);
    }
    if ($p === 'helper/log' && $m === 'POST') {
        $need('helper');
        $qn = str($b['question'] ?? '', 400);
        if ($qn !== '') insert('helper_log', ['question' => $qn, 'user_id' => digits($b['user_id'] ?? ''), 'answered' => !empty($b['answered']) ? 1 : 0, 'created_at' => now()]);
        json_out(['ok' => true]);
    }

     
    if ($p === 'applications/outbox' && $m === 'GET') {
        $need('verification');
        $rows = all("SELECT a.id,a.status,a.staff_note,a.applicant_discord,u.discord_id,j.title,j.role_ids,j.guild_id FROM applications a LEFT JOIN users u ON u.id=a.user_id LEFT JOIN jobs j ON j.id=a.job_id WHERE a.notify_state='queued' ORDER BY a.id LIMIT 20");
        json_out(['ok' => true, 'home_guild_id' => (string)setting('home_guild_id'), 'decisions' => array_map(fn($r) => ['id' => (int)$r['id'], 'discord_id' => (string)($r['applicant_discord'] ?: $r['discord_id']),
            'guild_id' => job_guild($r['guild_id'] ?? ''), 'accepted' => $r['status'] === 'accepted', 'job' => (string)($r['title'] ?: 'a position'), 'note' => (string)$r['staff_note'], 'role_ids' => $r['status'] === 'accepted' ? id_list($r['role_ids']) : []], $rows)]);
    }
    if (preg_match('#^applications/(\d+)/delivered$#', $p, $mm) && $m === 'POST') {
        $need('verification');
        $res = ['dm' => !empty($b['dm']), 'roles_given' => array_slice(array_map(fn($x) => str($x, 100), is_array($b['roles_given'] ?? null) ? $b['roles_given'] : []), 0, 25),
            'roles_failed' => array_slice(array_map(fn($x) => str($x, 100), is_array($b['roles_failed'] ?? null) ? $b['roles_failed'] : []), 0, 25), 'error' => str($b['error'] ?? '', 300)];
        q("UPDATE applications SET notify_state=?, notify_result=? WHERE id=?", [($res['error'] === '' && !$res['roles_failed']) ? 'done' : 'problem', json_encode($res, JSON_UNESCAPED_UNICODE), (int)$mm[1]]);
        json_out(['ok' => true]);
    }

     
    $team_out = fn($t) => ['id' => (int)$t['id'], 'name' => $t['name'], 'owner_id' => $t['owner_id'], 'member_ids' => id_list($t['member_ids']), 'role_id' => (string)$t['role_id'], 'created_at' => $t['created_at']];
    if ($p === 'teams' && $m === 'GET') {
        $need('community'); $needGuild();
        json_out(['ok' => true, 'teams' => array_map($team_out, all('SELECT * FROM community_teams WHERE guild_id=? ORDER BY id', [$gid]))]);
    }
    if ($p === 'teams' && $m === 'POST') {
        $need('community'); $needGuild();
        $name = str($b['name'] ?? '', 40); $owner = digits($b['owner_id'] ?? '');
        if ($name === '' || !$owner) fail('name and owner_id are required');
        $id = insert('community_teams', ['guild_id' => $gid, 'name' => $name, 'owner_id' => $owner, 'member_ids' => json_encode(array_slice(array_values(array_unique(array_filter(array_map(fn($v) => digits($v), (array)($b['member_ids'] ?? []))))), 0, 4)), 'role_id' => digits($b['role_id'] ?? ''), 'created_at' => now()]);
        json_out(['ok' => true, 'team' => $team_out(one('SELECT * FROM community_teams WHERE id=?', [$id]))]);
    }
    if (preg_match('#^teams/(\d+)(/delete)?$#', $p, $mm) && $m === 'POST') {
        $need('community'); $needGuild();
        $t = one('SELECT * FROM community_teams WHERE id=? AND guild_id=?', [(int)$mm[1], $gid]); if (!$t) fail('Team not found.', 404);
        if (!empty($mm[2])) { q('DELETE FROM community_teams WHERE id=?', [$t['id']]); json_out(['ok' => true]); }
        $set = [];
        if (isset($b['name'])) $set['name'] = str($b['name'], 40);
        if (isset($b['member_ids'])) $set['member_ids'] = json_encode(array_slice(array_values(array_unique(array_filter(array_map(fn($v) => digits($v), (array)$b['member_ids'])))), 0, 4));
        if (isset($b['role_id'])) $set['role_id'] = digits($b['role_id']);
        if ($set) update('community_teams', (int)$t['id'], $set);
        json_out(['ok' => true, 'team' => $team_out(one('SELECT * FROM community_teams WHERE id=?', [$t['id']]))]);
    }
    if ($p === 'vcs' && $m === 'GET') {
        $need('community');
        $rows = $gid !== '' ? all('SELECT * FROM community_vcs WHERE guild_id=?', [$gid]) : all('SELECT * FROM community_vcs');
        json_out(['ok' => true, 'vcs' => array_map(fn($v) => ['guild_id' => $v['guild_id'], 'channel_id' => $v['channel_id'], 'owner_id' => $v['owner_id'], 'team_only' => (bool)$v['team_only'], 'locked' => (bool)$v['locked'], 'created_at' => $v['created_at']], $rows)]);
    }
    if ($p === 'vcs' && $m === 'POST') {
        $need('community'); $needGuild();
        $cid = digits($b['channel_id'] ?? ''); $owner = digits($b['owner_id'] ?? ''); if (!$cid || !$owner) fail('channel_id and owner_id are required');
        q('DELETE FROM community_vcs WHERE guild_id=? AND channel_id=?', [$gid, $cid]);
        q('INSERT INTO community_vcs (guild_id,channel_id,owner_id,team_only,locked,created_at) VALUES (?,?,?,?,?,?)', [$gid, $cid, $owner, !empty($b['team_only']) ? 1 : 0, !empty($b['locked']) ? 1 : 0, now()]);
        json_out(['ok' => true]);
    }
    if ($p === 'vcs/delete' && $m === 'POST') {
        $need('community'); $needGuild();
        q('DELETE FROM community_vcs WHERE guild_id=? AND channel_id=?', [$gid, digits($b['channel_id'] ?? '')]);
        json_out(['ok' => true]);
    }

     
    if ($p === 'msglog/batch' && $m === 'POST') {
        $need('community');
        $n = 0;
        foreach (array_slice(is_array($b['events'] ?? null) ? $b['events'] : [], 0, 200) as $e) {
            if (!is_array($e)) continue;
            $mid = digits($e['message_id'] ?? ''); if ($mid === '') continue;
            $at = is_string($e['at'] ?? null) && strtotime($e['at']) ? gmdate('Y-m-d H:i:s', strtotime($e['at'])) : now();
            $t = (string)($e['t'] ?? '');
            $row = one('SELECT id,content,status,links FROM msg_log WHERE message_id=?', [$mid]);
            if ($t === 'send' || ($t === 'edit' && !$row && !empty($e['author_id']))) {
                $content = str($e['content'] ?? '', 4000, false);
                $atts = []; $img = 0; $file = 0;
                foreach (array_slice(is_array($e['attachments'] ?? null) ? $e['attachments'] : [], 0, 10) as $a) {
                    if (!is_array($a)) continue;
                    $isImg = !empty($a['image']); $img = $img || $isImg; $file = $file || !$isImg;
                    $atts[] = ['id' => digits($a['id'] ?? ''), 'name' => str($a['name'] ?? 'file', 200), 'size' => (int)($a['size'] ?? 0), 'type' => str($a['type'] ?? '', 60), 'url' => str($a['url'] ?? '', 600), 'image' => $isImg];
                }
                $links = find_links($content . ' ' . implode(' ', array_map('strval', is_array($e['embed_urls'] ?? null) ? $e['embed_urls'] : [])));
                $data = ['guild_id' => digits($e['guild_id'] ?? ''), 'channel_id' => digits($e['channel_id'] ?? ''), 'channel_name' => str($e['channel_name'] ?? '', 100), 'author_id' => digits($e['author_id'] ?? ''),
                    'author_name' => str($e['author_name'] ?? '', 100), 'author_avatar' => str($e['author_avatar'] ?? '', 300), 'is_bot' => !empty($e['bot']) ? 1 : 0, 'content' => $content,
                    'attachments' => json_encode($atts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 'links' => json_encode($links, JSON_UNESCAPED_SLASHES), 'has_image' => $img ? 1 : 0, 'has_link' => $links ? 1 : 0, 'has_file' => $file ? 1 : 0,
                    'reply_to' => digits($e['reply_to'] ?? '') ?: null];
                if ($row) update('msg_log', (int)$row['id'], $data);
                else insert('msg_log', $data + ['message_id' => $mid, 'status' => $t === 'edit' ? 'edited' : 'sent', 'created_at' => $at, 'edited_at' => $t === 'edit' ? $at : null]);
                $n++;
            } elseif ($t === 'edit' && $row) {
                $new = str($e['content'] ?? '', 4000, false);
                if ($new !== (string)$row['content']) {
                    insert('msg_edits', ['message_id' => $mid, 'before_content' => (string)$row['content'], 'after_content' => $new, 'at' => $at]);
                     
                    $links = array_values(array_unique(array_merge(json_decode((string)$row['links'], true) ?: [], find_links($new))));
                    q("UPDATE msg_log SET content=?, links=?, has_link=?, status=CASE WHEN status='deleted' THEN status ELSE 'edited' END, edited_at=? WHERE id=?", [$new, json_encode($links, JSON_UNESCAPED_SLASHES), $links ? 1 : 0, $at, $row['id']]);
                    $n++;
                }
            } elseif ($t === 'delete') {
                if ($row) q("UPDATE msg_log SET status='deleted', deleted_at=? WHERE id=?", [$at, $row['id']]);
                else insert('msg_log', ['guild_id' => digits($e['guild_id'] ?? ''), 'channel_id' => digits($e['channel_id'] ?? ''), 'channel_name' => str($e['channel_name'] ?? '', 100), 'message_id' => $mid, 'author_id' => '0', 'author_name' => 'Unknown (sent before logging started)', 'content' => '', 'status' => 'deleted', 'created_at' => $at, 'deleted_at' => $at]);
                $n++;
            }
        }
        if (random_int(1, 60) === 1) msglog_prune();
        json_out(['ok' => true, 'saved' => $n]);
    }
    if ($p === 'msglog/image' && $m === 'POST') {
        $need('community');
        $mid = digits($b['message_id'] ?? ''); $aid = digits($b['attachment_id'] ?? '');
        $mime = (string)($b['mime'] ?? ''); $data = (string)($b['data'] ?? '');
        if ($mid === '' || $aid === '' || !in_array($mime, ['image/png', 'image/jpeg', 'image/gif', 'image/webp'], true)) fail('Only png, jpeg, gif or webp images.');
        $raw = base64_decode($data, true);
        if ($raw === false || strlen($raw) > 8 * 1024 * 1024) fail('The image is too big (8 MB at most).', 413);
        if (!one('SELECT 1 AS x FROM msg_images WHERE attachment_id=?', [$aid]))
            insert('msg_images', ['message_id' => $mid, 'attachment_id' => $aid, 'name' => str($b['name'] ?? 'image', 200), 'mime' => $mime, 'size' => strlen($raw), 'data' => $data, 'created_at' => now()]);
        json_out(['ok' => true]);
    }

     
    if ($p === 'subs/roles' && $m === 'GET') {
        $need('verification'); expire_trials();
        $roles = []; foreach (SUB_DEFAULTS as $d) { $r = digits(setting('sub_role_' . $d['key']) ?? ''); if ($r !== '') $roles[$d['key']] = $r; }
        $members = [];
        foreach (all("SELECT discord_id,tier FROM subscriptions WHERE discord_id<>'' AND status IN ('active','trialing','past_due') ORDER BY id") as $r) $members[(string)$r['discord_id']] = (string)$r['tier'];
        json_out(['ok' => true, 'guild_id' => (string)(setting('main_guild_id') ?: setting('home_guild_id')), 'roles' => $roles, 'members' => $members]);
    }
     
    if (preg_match('#^subs/trial(/end)?$#', $p, $mm) && $m === 'POST') {
        $need('verification');
        $did = digits($b['discord_id'] ?? ''); $by = str($b['by'] ?? 'Discord', 80);
        if ($did === '') fail('Pick a member.');
        if (!empty($mm[1])) json_out(['ok' => true, 'ended' => end_trial($did, $by)]);
        try { $s = give_trial($did, (string)($b['tier'] ?? ''), (int)($b['days'] ?? 7), $by); } catch (InvalidArgumentException $e) { fail($e->getMessage()); }
        $name = array_column(sub_tiers(), 'name', 'key')[$s['tier']] ?? $s['tier'];
        json_out(['ok' => true, 'tier' => $s['tier'], 'tier_name' => $name, 'ends' => strtotime($s['period_end'] . ' UTC'), 'role_id' => digits(setting('sub_role_' . $s['tier']) ?? '')]);
    }
     
    $listingOut = fn($l) => ['id' => (int)$l['id'], 'title' => (string)$l['title'], 'category' => (string)$l['category'], 'description' => (string)$l['description'], 'price' => (string)$l['price_text'],
        'status' => (string)$l['status'], 'created_at' => (string)$l['created_at'], 'seller' => (string)($l['username'] ?? ''), 'seller_roblox' => (string)($l['roblox_username'] ?? ''), 'seller_discord' => (string)($l['discord_id'] ?? ''), 'approved_by' => (string)($l['approved_by'] ?? '')];
    $listingSql = 'SELECT l.*, u.username, u.roblox_username, u.discord_id FROM listings l LEFT JOIN users u ON u.id=l.user_id';
    $queuePos = fn(int $id) => (int)one("SELECT COUNT(*) AS n FROM listings WHERE status='pending' AND id<=?", [$id])['n'];
     
    $nextPost = function (int $uid, array $pk): int {
        $last = one("SELECT MAX(created_at) AS t FROM listings WHERE user_id=? AND status<>'removed'", [$uid])['t'] ?? null;
        $next = $last ? (int)ceil(strtotime($last . ' UTC') + $pk['market_h'] * 3600) : 0;
        return $next > time() ? $next : 0;
    };
     
    if ($p === 'market/config' && $m === 'GET') {
        $need('community');
        $mg = (string)setting('main_guild_id');
        $out = ['ok' => true, 'main_guild_id' => $mg, 'main_name' => $mg !== '' ? guild_label($mg) : '', 'invite' => (string)setting('main_invite')];
         
        if (($did = digits($_GET['discord_id'] ?? '')) !== '') {
            $pk = member_perks($roleIds($_GET['roles'] ?? ''));
            $u = one('SELECT id FROM users WHERE discord_id=?', [$did]);
            $out += ['perks' => $perkOut($pk), 'next_post' => $u ? $nextPost((int)$u['id'], $pk) : 0];
        }
        json_out($out);
    }
    if ($p === 'market/post' && $m === 'POST') {
        $need('community');
        $u = one('SELECT * FROM users WHERE discord_id=?', [digits($b['discord_id'] ?? '')]);
        if (!$u || !is_verified($u)) fail('Verify first: sign in on axiomategames.com with Discord and link your Roblox account (Account page), then use /post again.', 403);
         
        $pk = member_perks($roleIds($b['role_ids'] ?? []));
        if (($next = $nextPost((int)$u['id'], $pk)) > 0) fail('You can post again <t:' . $next . ':R>. Your marketplace cooldown is ' . hours_text($pk['market_h']) . '.', 429);
        if (!rate('ls:' . $u['id'], 24, 86400)) fail('You have reached the daily limit of 24 posts.', 429);
        $title = str($b['title'] ?? '', 120); $desc = str($b['description'] ?? '', 3000); $price = str($b['price_text'] ?? '', 60);
        if ($title === '' || mb_strlen($desc) < 20 || $price === '') fail('Add a title, a price and a description (at least 20 characters).');
        $id = insert('listings', ['user_id' => $u['id'], 'title' => $title, 'category' => in_array($b['category'] ?? '', LISTING_CATS, true) ? $b['category'] : 'other', 'description' => $desc, 'price_text' => $price, 'source' => 'discord', 'notified' => 1, 'created_at' => now()]);
        json_out(['ok' => true, 'listing' => $listingOut(one($listingSql . ' WHERE l.id=?', [$id])), 'position' => $queuePos($id), 'waiting' => (int)one("SELECT COUNT(*) AS n FROM listings WHERE status='pending'")['n']]);
    }
    if ($p === 'market/queue' && $m === 'GET') {
        $need('community');
        $did = digits($_GET['discord_id'] ?? '');
        $appr = is_post_approver($did);
        $mine = array_map(fn($l) => $listingOut($l) + ['position' => $l['status'] === 'pending' ? $queuePos((int)$l['id']) : 0], all($listingSql . ' WHERE u.discord_id=? ORDER BY l.id DESC LIMIT 10', [$did]));
        json_out(['ok' => true, 'approver' => $appr, 'waiting' => (int)one("SELECT COUNT(*) AS n FROM listings WHERE status='pending'")['n'],
            'pending' => $appr ? array_map($listingOut, all($listingSql . " WHERE l.status='pending' ORDER BY l.id LIMIT 25")) : [], 'mine' => $mine]);
    }
    if (preg_match('#^market/(\d+)/(decide|posted|notified|repost)$#', $p, $mm) && $m === 'POST') {
        $need('community');
        $l = one($listingSql . ' WHERE l.id=?', [(int)$mm[1]]); if (!$l) fail('Post not found.', 404);
         
        if ($mm[2] === 'repost') {
            if ((string)$l['discord_id'] !== digits($b['discord_id'] ?? '')) fail('You can only repost your own posts.', 403);
            if ($l['status'] !== 'active') fail('Only approved posts can be reposted.', 409);
            $pk = member_perks($roleIds($b['role_ids'] ?? []));
            if ($pk['repost_h'] === null) fail('Reposting is a perk for supporters. See ' . base_url() . '/subscriptions', 403);
            if ($l['posted_at'] === null) fail('This post is already waiting to be posted.', 409);
            $since = $l['reposted_at'] ?: $l['posted_at'];
            $next = (int)ceil(strtotime($since . ' UTC') + $pk['repost_h'] * 3600);
            if ($next > time()) fail('You can repost this <t:' . $next . ':R>. You can repost every ' . hours_text($pk['repost_h']) . '.', 429);
            q('UPDATE listings SET posted_at=NULL, reposted_at=? WHERE id=?', [now(), $l['id']]);
            json_out(['ok' => true, 'every' => hours_text($pk['repost_h']), 'next' => time() + (int)ceil($pk['repost_h'] * 3600)]);
        }
        if ($mm[2] === 'decide') {
            if (!is_post_approver(digits($b['discord_id'] ?? ''))) fail('Only post approvers can review marketplace posts.', 403);
            if ($l['status'] !== 'pending') fail('This post was already reviewed (' . $l['status'] . ').', 409);
            $st = !empty($b['approve']) ? 'active' : 'removed';
            q('UPDATE listings SET status=?, approved_by=?, notified=0 WHERE id=?', [$st, str($b['by'] ?? 'Discord', 80), $l['id']]);
            audit(str($b['by'] ?? 'Discord', 80), 'listing-' . $st, '#' . $l['id'] . ' (from Discord)');
            json_out(['ok' => true, 'listing' => $listingOut(one($listingSql . ' WHERE l.id=?', [$l['id']]))]);
        }
        if ($mm[2] === 'posted') { q('UPDATE listings SET posted_at=? WHERE id=?', [now(), $l['id']]); json_out(['ok' => true]); }
        q('UPDATE listings SET notified=1 WHERE id=?', [$l['id']]); json_out(['ok' => true]);
    }
    if ($p === 'market/outbox' && $m === 'GET') {
        $need('community');
        json_out(['ok' => true, 'to_post' => array_map($listingOut, all($listingSql . " WHERE l.status='active' AND l.posted_at IS NULL ORDER BY l.id LIMIT 10")),
            'to_notify' => array_map($listingOut, all($listingSql . " WHERE l.status IN ('active','removed') AND l.notified=0 ORDER BY l.id LIMIT 10"))]);
    }

     
    $breakOut = fn($r) => ['id' => (int)$r['id'], 'guild_id' => (string)$r['guild_id'], 'kind' => $r['kind'], 'user_id' => (string)$r['user_id'], 'user_name' => (string)$r['user_name'], 'reason' => (string)$r['reason'],
        'starts_at' => $r['starts_at'], 'ends_at' => $r['ends_at'], 'ends_ts' => strtotime($r['ends_at'] . ' UTC'), 'status' => $r['status'], 'channel_id' => (string)$r['channel_id'], 'message_id' => (string)$r['message_id'], 'ended_by' => (string)$r['ended_by']];
    $breakKind = $scope === 'development' ? 'dev' : ($scope === 'axiomate' && (($b['kind'] ?? $_GET['kind'] ?? '') === 'dev') ? 'dev' : 'staff');
    $anyKind = $scope === 'axiomate';    
    if ($p === 'breaks' && $m === 'POST') {
        $need('moderation', 'development'); $needGuild();
        $uid = digits($b['user_id'] ?? ''); $secs = (int)($b['seconds'] ?? 0);
        if ($uid === '' || $secs < 60 || $secs > 90 * 86400) fail('A break needs a member and a length between 1 minute and 90 days.');
         
        $old = all("SELECT * FROM breaks WHERE guild_id=? AND kind=? AND user_id=? AND status='active'", [$gid, $breakKind, $uid]);
        foreach ($old as $o) q("UPDATE breaks SET status='ended', ended_by='a new request', ended_at=?, notified=0 WHERE id=?", [now(), $o['id']]);
        $id = insert('breaks', ['guild_id' => $gid, 'kind' => $breakKind, 'user_id' => $uid, 'user_name' => str($b['user_name'] ?? '', 80), 'reason' => str($b['reason'] ?? '', 500),
            'starts_at' => now(), 'ends_at' => gmdate('Y-m-d H:i:s', time() + $secs), 'channel_id' => digits($b['channel_id'] ?? ''), 'created_at' => now()]);
        if ($breakKind === 'dev') {
            $cur = one('SELECT status FROM dev_status WHERE guild_id=? AND user_id=?', [$gid, $uid]);
            $prev = $cur ? ($cur['status'] === 'break' ? (one('SELECT prev_status FROM dev_status WHERE guild_id=? AND user_id=?', [$gid, $uid])['prev_status'] ?: 'closed') : $cur['status']) : 'closed';
            q('DELETE FROM dev_status WHERE guild_id=? AND user_id=?', [$gid, $uid]);
            insert('dev_status', ['guild_id' => $gid, 'user_id' => $uid, 'user_name' => str($b['user_name'] ?? '', 80), 'status' => 'break', 'prev_status' => $prev, 'updated_at' => now()]);
        }
        json_out(['ok' => true, 'break' => $breakOut(one('SELECT * FROM breaks WHERE id=?', [$id])), 'replaced' => array_map($breakOut, array_map(fn($o) => one('SELECT * FROM breaks WHERE id=?', [$o['id']]), $old))]);
    }
    if (preg_match('#^breaks/(\d+)(/message|/end|/done)?$#', $p, $mm)) {
        $need('moderation', 'development');
        $r = $anyKind ? one('SELECT * FROM breaks WHERE id=?', [(int)$mm[1]]) : one('SELECT * FROM breaks WHERE id=? AND kind=?', [(int)$mm[1], $breakKind]); if (!$r) fail('Break not found.', 404);
        $act2 = $mm[2] ?? '';
        if ($act2 === '' && $m === 'GET') json_out(['ok' => true, 'break' => $breakOut($r)]);
        if ($act2 === '/message' && $m === 'POST') { q('UPDATE breaks SET message_id=?, channel_id=? WHERE id=?', [digits($b['message_id'] ?? ''), digits($b['channel_id'] ?? '') ?: $r['channel_id'], $r['id']]); json_out(['ok' => true]); }
        if ($act2 === '/end' && $m === 'POST') {
            if ($r['status'] === 'active') q("UPDATE breaks SET status='ended', ended_by=?, ended_at=?, notified=0 WHERE id=?", [str($b['by'] ?? '', 80) ?: 'early', now(), $r['id']]);
            json_out(['ok' => true, 'break' => $breakOut(one('SELECT * FROM breaks WHERE id=?', [$r['id']]))]);
        }
        if ($act2 === '/done' && $m === 'POST') {
             
            q('UPDATE breaks SET notified=1 WHERE id=?', [$r['id']]);
            if ($r['kind'] === 'dev' && !one("SELECT 1 AS x FROM breaks WHERE guild_id=? AND kind='dev' AND user_id=? AND status='active'", [$r['guild_id'], $r['user_id']]))
                q("UPDATE dev_status SET status=COALESCE(prev_status,'closed'), prev_status=NULL, updated_at=? WHERE guild_id=? AND user_id=? AND status='break'", [now(), $r['guild_id'], $r['user_id']]);
            json_out(['ok' => true]);
        }
    }
    if ($p === 'breaks/due' && $m === 'GET') {
        $need('moderation', 'development');
         
        q("UPDATE breaks SET status='ended', ended_by='time is up', ended_at=?, notified=0 WHERE kind=? AND status='active' AND ends_at<=?", [now(), $breakKind, now()]);
        json_out(['ok' => true, 'breaks' => array_map($breakOut, all("SELECT * FROM breaks WHERE kind=? AND status='ended' AND notified=0 ORDER BY id LIMIT 25", [$breakKind]))]);
    }

     
    if ($p === 'dev-status' && $m === 'GET') {
        $need('development'); $needGuild();
        $breaks = []; foreach (all("SELECT * FROM breaks WHERE guild_id=? AND kind='dev' AND status='active'", [$gid]) as $r) $breaks[(string)$r['user_id']] = $breakOut($r);
        json_out(['ok' => true, 'people' => array_map(fn($r) => ['user_id' => (string)$r['user_id'], 'user_name' => (string)$r['user_name'], 'status' => $r['status'], 'updated_at' => $r['updated_at'], 'break' => $breaks[(string)$r['user_id']] ?? null],
            all('SELECT * FROM dev_status WHERE guild_id=? ORDER BY user_name', [$gid]))]);
    }
    if ($p === 'dev-status' && $m === 'POST') {
        $need('development'); $needGuild();
        $uid = digits($b['user_id'] ?? ''); $st = in_array($b['status'] ?? '', ['open', 'closed'], true) ? $b['status'] : 'closed';
        if ($uid === '') fail('user_id is required.');
         
        $ended = [];
        foreach (all("SELECT * FROM breaks WHERE guild_id=? AND kind='dev' AND user_id=? AND status='active'", [$gid, $uid]) as $o) { q("UPDATE breaks SET status='ended', ended_by=?, ended_at=?, notified=0 WHERE id=?", [str($b['user_name'] ?? '', 80) ?: 'early', now(), $o['id']]); $ended[] = (int)$o['id']; }
        q('DELETE FROM dev_status WHERE guild_id=? AND user_id=?', [$gid, $uid]);
        insert('dev_status', ['guild_id' => $gid, 'user_id' => $uid, 'user_name' => str($b['user_name'] ?? '', 80), 'status' => $st, 'updated_at' => now()]);
        json_out(['ok' => true, 'status' => $st, 'ended_breaks' => $ended]);
    }

     
    if ($p === 'server-roles' && $m === 'POST') {
        $need('verification'); $needGuild();
        q('DELETE FROM server_roles WHERE guild_id=?', [$gid]);
        foreach (array_slice(is_array($b['roles'] ?? null) ? $b['roles'] : [], 0, 500) as $r) {
            $rid = digits($r['id'] ?? ''); if (!$rid) continue;
            q('INSERT INTO server_roles (guild_id,role_id,name,color,position,managed,updated_at) VALUES (?,?,?,?,?,?,?)', [$gid, $rid, str($r['name'] ?? '', 100), (int)($r['color'] ?? 0), (int)($r['position'] ?? 0), !empty($r['managed']) ? 1 : 0, now()]);
        }
        json_out(['ok' => true]);
    }

     
    if ($p === 'channels' && $m === 'POST') {
        $need('community'); $needGuild();
        q('DELETE FROM bot_channels WHERE guild_id=?', [$gid]);
        foreach (array_slice(is_array($b['channels'] ?? null) ? $b['channels'] : [], 0, 500) as $ch) {
            $cid = digits($ch['id'] ?? ''); if (!$cid) continue;
            q('INSERT INTO bot_channels (guild_id,channel_id,name,category,position,updated_at) VALUES (?,?,?,?,?,?)', [$gid, $cid, str($ch['name'] ?? '', 100), str($ch['category'] ?? '', 100), (int)($ch['position'] ?? 0), now()]);
        }
        json_out(['ok' => true]);
    }
    if ($p === 'messages/pending' && $m === 'GET') {
        $need('community');
        $rows = all("SELECT id,guild_id,channel_id,payload FROM custom_messages WHERE status='queued' ORDER BY id LIMIT 10");
        json_out(['ok' => true, 'messages' => array_map(fn($r) => ['id' => (int)$r['id'], 'guild_id' => $r['guild_id'], 'channel_id' => $r['channel_id'], 'message' => json_decode($r['payload'], true)], $rows)]);
    }
    if (preg_match('#^messages/(\d+)$#', $p, $mm) && $m === 'GET') {
        $need('community');
        $r = one("SELECT id,guild_id,payload FROM custom_messages WHERE id=? AND status='sent'", [(int)$mm[1]]);
        if (!$r) fail('Message not found.', 404);
        json_out(['ok' => true, 'guild_id' => $r['guild_id'], 'message' => json_decode($r['payload'], true)]);
    }
    if ($p === 'reaction-roles' && $m === 'GET') {
        $need('community');
        $out = [];
        foreach (all("SELECT guild_id,channel_id,message_id,payload FROM custom_messages WHERE status='sent' AND message_id<>'' AND payload LIKE '%\"reactions\"%' ORDER BY id DESC LIMIT 500") as $r) {
            $msg = json_decode((string)$r['payload'], true);
            if (empty($msg['reactions'])) continue;
            $out[] = ['guild_id' => (string)$r['guild_id'], 'channel_id' => (string)$r['channel_id'], 'message_id' => (string)$r['message_id'], 'unique' => !empty($msg['reaction_unique']), 'items' => $msg['reactions']];
        }
        json_out(['ok' => true, 'messages' => $out]);
    }
    if (preg_match('#^messages/(\d+)/result$#', $p, $mm) && $m === 'POST') {
        $need('community');
        if (!empty($b['ok'])) q("UPDATE custom_messages SET status='sent', message_id=?, sent_at=?, error=? WHERE id=?", [digits($b['message_id'] ?? ''), now(), ($b['error'] ?? '') !== '' ? str($b['error'], 300) : null, (int)$mm[1]]);
        else q("UPDATE custom_messages SET status='failed', error=?, sent_at=? WHERE id=?", [str($b['error'] ?? 'Unknown error', 300), now(), (int)$mm[1]]);
        json_out(['ok' => true]);
    }

     
    if ($p === 'mutes' && $m === 'GET') {
        $need('moderation'); $needGuild();
        $r = one('SELECT role_ids,muted_by,created_at FROM muted_roles WHERE guild_id=? AND user_id=?', [$gid, digits($_GET['user_id'] ?? '')]);
        json_out(['ok' => true, 'muted' => (bool)$r, 'role_ids' => $r ? id_list($r['role_ids']) : [], 'since' => $r['created_at'] ?? null]);
    }
    if ($p === 'mutes/save' && $m === 'POST') {
        $need('moderation'); $needGuild();
        $uid = digits($b['user_id'] ?? ''); if (!$uid) fail('user_id required');
        $ids = json_encode(array_values(array_unique(array_filter(array_map(fn($v) => digits($v), is_array($b['role_ids'] ?? null) ? $b['role_ids'] : [])))));
        if (one('SELECT 1 AS x FROM muted_roles WHERE guild_id=? AND user_id=?', [$gid, $uid])) q('UPDATE muted_roles SET role_ids=? WHERE guild_id=? AND user_id=?', [$ids, $gid, $uid]);
        else q('INSERT INTO muted_roles (guild_id,user_id,role_ids,muted_by,created_at) VALUES (?,?,?,?,?)', [$gid, $uid, $ids, str($b['by'] ?? '', 80), now()]);
        json_out(['ok' => true]);
    }
    if ($p === 'mutes/clear' && $m === 'POST') {
        $need('moderation'); $needGuild();
        q('DELETE FROM muted_roles WHERE guild_id=? AND user_id=?', [$gid, digits($b['user_id'] ?? '')]);
        json_out(['ok' => true]);
    }

     
    if ($p === 'giveaways' && $m === 'POST') {
        $need('moderation'); $needGuild();
        $kind = ($b['kind'] ?? '') === 'event' ? 'event' : 'giveaway';
        $title = str($b['title'] ?? '', 200); $ends = gw_time($b['ends_at'] ?? null);
        $wc = max($kind === 'event' ? 0 : 1, min(20, (int)($b['winners_count'] ?? 1)));
        if ($title === '') fail($kind === 'event' ? 'Give the event a title.' : 'Say what the prize is.');
        if ($kind === 'giveaway' && !$ends) fail('A giveaway needs an end time.');
        $id = insert('giveaways', ['guild_id' => $gid, 'kind' => $kind, 'title' => $title, 'description' => str($b['description'] ?? '', 1500), 'winners_count' => $wc,
            'channel_id' => digits($b['channel_id'] ?? ''), 'host_id' => digits($b['host_id'] ?? ''), 'host_name' => str($b['host_name'] ?? '', 80),
            'required_role_id' => digits($b['required_role_id'] ?? ''), 'starts_at' => gw_time($b['starts_at'] ?? null), 'ends_at' => $ends, 'status' => 'active', 'created_at' => now()]);
        json_out(['ok' => true, 'giveaway' => gw_out(one(GW_SELECT . ' WHERE g.id=?', [$id]))]);
    }
    if ($p === 'giveaways' && $m === 'GET') {
        $need('moderation'); $needGuild();
        $st = $_GET['status'] ?? 'all'; $kind = ($_GET['kind'] ?? '') === 'event' ? 'event' : 'giveaway';
        $where = 'g.guild_id=? AND g.kind=?' . (in_array($st, ['active', 'ended'], true) ? ' AND g.status=?' : '');
        $args = in_array($st, ['active', 'ended'], true) ? [$gid, $kind, $st] : [$gid, $kind];
        json_out(['ok' => true, 'giveaways' => array_map('gw_out', all(GW_SELECT . " WHERE $where ORDER BY g.id DESC LIMIT 25", $args))]);
    }
    if ($p === 'giveaways/due' && $m === 'GET') {
        $need('moderation');
        json_out(['ok' => true, 'giveaways' => array_map('gw_out', all(GW_SELECT . " WHERE g.status='active' AND g.ends_at IS NOT NULL AND g.ends_at<=? ORDER BY g.ends_at LIMIT 20", [now()]))]);
    }
    if (preg_match('#^giveaways/(\d+)(?:/(message|edit|enter|end|reroll))?$#', $p, $mm)) {
        $need('moderation');
        $id = (int)$mm[1]; $act = $mm[2] ?? '';
        $g = one(GW_SELECT . ' WHERE g.id=?', [$id]);
        if (!$g || ($gid !== '' && $g['guild_id'] !== $gid)) fail('There is no giveaway or event with that number in this server.', 404);
        $word = $g['kind'] === 'event' ? 'event' : 'giveaway';
        $reload = fn() => gw_out(one(GW_SELECT . ' WHERE g.id=?', [$id]));
        if ($act === '' && $m === 'GET') json_out(['ok' => true, 'giveaway' => gw_out($g)]);
        if ($m !== 'POST') fail('Not found.', 404);
        if ($act === 'message') {
            q('UPDATE giveaways SET message_id=?, channel_id=? WHERE id=?', [digits($b['message_id'] ?? ''), digits($b['channel_id'] ?? '') ?: $g['channel_id'], $id]);
            json_out(['ok' => true]);
        }
        if ($act === 'edit') {
            if ($g['status'] !== 'active') fail("This $word has already ended. Use reroll to pick new winners.", 409);
            $set = [];
            if (isset($b['title'])) { $t = str($b['title'], 200); if ($t !== '') $set['title'] = $t; }
            if (isset($b['description'])) $set['description'] = str($b['description'], 1500);
            if (isset($b['winners_count'])) $set['winners_count'] = max($word === 'event' ? 0 : 1, min(20, (int)$b['winners_count']));
            if (array_key_exists('ends_at', $b)) { $e = gw_time($b['ends_at']); if ($e || $word === 'event') $set['ends_at'] = $e; }
            if (array_key_exists('required_role_id', $b)) $set['required_role_id'] = digits($b['required_role_id'] ?? '');
            if (!$set) fail('Nothing to change. Pick at least one option to edit.');
            update('giveaways', $id, $set);
            json_out(['ok' => true, 'giveaway' => $reload()]);
        }
        if ($act === 'enter') {
            $uid = digits($b['user_id'] ?? ''); if (!$uid) fail('user_id required');
            if ($g['status'] !== 'active' || ($g['ends_at'] && $g['ends_at'] <= now())) fail("This $word has ended.", 409);
            $has = one('SELECT 1 AS x FROM giveaway_entries WHERE giveaway_id=? AND user_id=?', [$id, $uid]);
            if (!empty($b['leave'])) { q('DELETE FROM giveaway_entries WHERE giveaway_id=? AND user_id=?', [$id, $uid]); $entered = false; }
            else {
                if (!$has) { try { insert('giveaway_entries', ['giveaway_id' => $id, 'user_id' => $uid, 'user_name' => str($b['user_name'] ?? '', 80), 'created_at' => now()]); } catch (Throwable $e) {   } }
                $entered = true;
            }
            json_out(['ok' => true, 'entered' => $entered, 'already' => (bool)$has, 'entries' => (int)one('SELECT COUNT(*) n FROM giveaway_entries WHERE giveaway_id=?', [$id])['n']]);
        }
        if ($act === 'end') {
             
            if (q("UPDATE giveaways SET status='ended', ended_at=? WHERE id=? AND status='active'", [now(), $id])->rowCount() !== 1) fail("This $word has already ended.", 409);
            q('UPDATE giveaways SET winners=? WHERE id=?', [json_encode(gw_draw($id, (int)$g['winners_count'], [])), $id]);
            json_out(['ok' => true, 'giveaway' => $reload()]);
        }
        if ($act === 'reroll') {
            if ($g['status'] !== 'ended') fail("This $word is still running. End it first.", 409);
            $cur = gw_list($g['winners']); $past = gw_list($g['past_winners']);
            $skip = array_map(fn($x) => (string)$x['id'], array_merge($cur, $past));
            $replace = digits($b['replace_user_id'] ?? '');
            if ($replace !== '') {
                $old = array_values(array_filter($cur, fn($x) => (string)$x['id'] === $replace));
                if (!$old) fail("That member is not one of the current winners.", 404);
                $new = gw_draw($id, 1, $skip);
                $cur = array_values(array_filter($cur, fn($x) => (string)$x['id'] !== $replace));
                $cur = array_merge($cur, $new); $past = array_merge($past, $old);
            } else {
                $new = gw_draw($id, max(1, (int)$g['winners_count']), $skip);
                $past = array_merge($past, $cur); $cur = $new;
            }
            if (!$new) fail('There is nobody left to pick. Everyone who entered has already won.', 409);
            q('UPDATE giveaways SET winners=?, past_winners=? WHERE id=?', [json_encode($cur), json_encode($past), $id]);
            json_out(['ok' => true, 'giveaway' => $reload(), 'new' => $new]);
        }
        fail('Not found.', 404);
    }

     
    if ($p === 'roblox/config' && $m === 'GET') {
        $need('roblox');
        $g = json_decode((string)setting('roblox_group'), true);
        json_out(['ok' => true, 'group_id' => (string)(setting('roblox_group_id') ?: ''), 'games' => all("SELECT id,slug,place_id,universe_id FROM games WHERE platform='roblox' AND (place_id<>'' OR universe_id<>'')")]);
    }
    if ($p === 'roblox/stats' && $m === 'POST') {
        $need('roblox');
        $n = fn($v) => is_numeric($v) ? max(0, (int)$v) : null;
        foreach ((is_array($b['games'] ?? null) ? $b['games'] : []) as $g) {
            if (!ctype_digit((string)($g['id'] ?? ''))) continue;
             
            $uni = digits($g['universe_id'] ?? '', 20);
            if (!empty($g['hidden'])) {    
                q('UPDATE games SET playing=NULL,visits=NULL,favorites=NULL,likes=NULL,dislikes=NULL,stats_hidden=1,stats_at=?' . ($uni !== '' ? ',universe_id=?' : '') . ' WHERE id=?', array_merge([now()], $uni !== '' ? [$uni] : [], [(int)$g['id']]));
                continue;
            }
            q('UPDATE games SET stats_hidden=0, playing=?,visits=?,favorites=?,likes=?,dislikes=?,stats_at=?' . ($uni !== '' ? ',universe_id=?' : '') . ' WHERE id=?',
                array_merge([$n($g['playing'] ?? null), $n($g['visits'] ?? null), $n($g['favorites'] ?? null), $n($g['likes'] ?? null), $n($g['dislikes'] ?? null), now()], $uni !== '' ? [$uni] : [], [(int)$g['id']]));
        }
        if (is_array($b['group'] ?? null)) set_setting('roblox_group', json_encode(['id' => digits($b['group']['id'] ?? '', 20), 'name' => str($b['group']['name'] ?? '', 100), 'members' => $n($b['group']['members'] ?? null), 'updated_at' => now()]));
        json_out(['ok' => true]);
    }
    fail('Not found.', 404);
}

fail('Not found.', 404);
