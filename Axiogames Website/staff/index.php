<?php
declare(strict_types=1);
require __DIR__ . '/../app/lib.php';

set_exception_handler(function (Throwable $e) {
    error_log('[axm-staff] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    echo '<!doctype html><meta charset="utf-8"><title>Error</title><p style="font:16px system-ui;padding:2rem">Something went wrong. Please try again.</p>';
    exit;
});
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

const RANK = ['moderator' => 1, 'admin' => 2, 'owner' => 3];
const BOTS = ['ticket' => 'Axio Ticket Bot', 'moderation' => 'Axio Moderation Bot', 'community' => 'Axio Community Bot', 'verification' => 'Axio Verification Bot', 'helper' => 'Axio Helper Bot', 'development' => 'Axio Development Bot', 'roblox' => 'Axio Roblox Group Bot', 'axiomate' => 'Axiomate Bot (all in one)'];
const PAGES = [  
    'dashboard' => ['Dashboard', 1, ''], 'reports' => ['Scam reports', 1, ''], 'messages' => ['Messages', 1, ''], 'tickets' => ['Tickets', 1, ''],
    'modlog' => ['Moderation log', 1, ''], 'users' => ['Users', 1, ''],
    'applications' => ['Applications', 1, 'mgmt'], 'jobs' => ['Jobs', 1, 'mgmt'], 'games' => ['Games', 1, 'mgmt'],
    'marketplace' => ['Marketplace', 1, 'approver'], 'builder' => ['Message builder', 2, ''], 'welcome' => ['Welcome message', 2, ''], 'development' => ['Development', 1, ''], 'subscriptions' => ['Subscriptions', 2, ''], 'perks' => ['Role perks', 2, ''], 'msglog' => ['Message log', 1, ''], 'suggestions' => ['Suggestions', 1, ''],
    'rules' => ['Edit rules (message builder)', 2, ''], 'helper' => ['Helper answers', 2, ''], 'audit' => ['Audit log', 2, ''],
    'roster' => ['Roster & roles', 3, ''], 'botcfg' => ['Bot settings', 2, ''], 'staff' => ['Staff', 3, ''], 'bots' => ['Bots', 3, ''], 'settings' => ['Settings', 3, ''],
];
const LOCKED_PAGES = ['dashboard' => 1, 'settings' => 3];  
 
const BOT_COMMANDS = [
    'ban' => ['Moderation', 2, 'Ban a member'], 'unban' => ['Moderation', 2, 'Lift a ban'], 'softban' => ['Moderation', 2, 'Softban a member'],
    'kick' => ['Moderation', 1, 'Kick a member'], 'timeout' => ['Moderation', 1, 'Time a member out'], 'untimeout' => ['Moderation', 1, 'End a timeout'],
    'warn' => ['Moderation', 1, 'Warn a member'], 'warnings' => ['Moderation', 1, 'See warnings'], 'clear-warnings' => ['Moderation', 1, 'Clear warnings'],
    'purge' => ['Moderation', 1, 'Delete messages'], 'purge-user' => ['Moderation', 1, "Delete a member's messages"], 'nick' => ['Moderation', 1, 'Change nicknames'],
    'modlogs' => ['Moderation', 1, 'See moderation history'], 'case' => ['Moderation', 1, 'Look up or edit a case'], 'scamcheck' => ['Moderation', 1, 'Check the scam log'],
    'role add' => ['Moderation', 2, 'Give a role'], 'role remove' => ['Moderation', 2, 'Take a role'],
    'trial give' => ['Verification', 1, 'Give a member a free trial of a subscription tier'], 'trial end' => ['Verification', 1, "End a member's free trial"],
    'giveaway create' => ['Moderation', 1, 'Start a giveaway'], 'giveaway end' => ['Moderation', 1, 'End a giveaway'], 'giveaway reroll' => ['Moderation', 1, 'Reroll a giveaway'], 'giveaway edit' => ['Moderation', 1, 'Edit a giveaway'],
    'event create' => ['Moderation', 1, 'Announce an event'], 'event end' => ['Moderation', 1, 'End an event'], 'event reroll' => ['Moderation', 1, 'Reroll an event'], 'event edit' => ['Moderation', 1, 'Edit an event'],
    'counting-channel' => ['Community', 1, 'Set the counting channel'], 'level-channel' => ['Community', 2, 'Set the level-up channel'], 'welcome-channel' => ['Verification', 2, 'Set the welcome channel'], 'booster-channel' => ['Verification', 2, 'Set the booster channel'], 'break request' => ['Moderation', 1, 'Request a break (staff)'], 'welcome-test' => ['Verification', 2, 'Post a test welcome message'], 'level-roles list' => ['Community', 2, 'See level roles'], 'level-roles set' => ['Community', 2, 'Set a level role'], 'level-roles remove' => ['Community', 2, 'Remove a level role'], 'level-roles sync' => ['Community', 2, 'Give everyone their level role'], 'ticket-channel' => ['Ticket', 2, 'Post the ticket panel'],
    'verify-channel' => ['Verification', 2, 'Post the verification panel'], 'helperbot-channel' => ['Helper', 2, 'Set the helper channel'],
];
 
const CMD_PERMS = ['ban' => 'Ban Members', 'unban' => 'Ban Members', 'softban' => 'Ban Members', 'kick' => 'Kick Members',
    'timeout' => 'Timeout Members', 'untimeout' => 'Timeout Members', 'warn' => 'Timeout Members', 'warnings' => 'Timeout Members', 'clear-warnings' => 'Timeout Members',
    'modlogs' => 'Timeout Members', 'case' => 'Timeout Members', 'scamcheck' => 'Timeout Members', 'trial give' => 'Timeout Members', 'trial end' => 'Timeout Members',
    'purge' => 'Manage Messages', 'purge-user' => 'Manage Messages', 'nick' => 'Manage Nicknames', 'role add' => 'Manage Roles', 'role remove' => 'Manage Roles',
    'level-roles list' => 'Manage Roles', 'level-roles set' => 'Manage Roles', 'level-roles remove' => 'Manage Roles', 'level-roles sync' => 'Manage Roles',
    'giveaway create' => 'Manage Events', 'giveaway end' => 'Manage Events', 'giveaway reroll' => 'Manage Events', 'giveaway edit' => 'Manage Events',
    'event create' => 'Manage Events', 'event end' => 'Manage Events', 'event reroll' => 'Manage Events', 'event edit' => 'Manage Events',
    'counting-channel' => 'Manage Server', 'level-channel' => 'Manage Server', 'welcome-channel' => 'Manage Server', 'booster-channel' => 'Manage Server', 'welcome-test' => 'Manage Server', 'verify-channel' => 'Manage Server',
    'helperbot-channel' => 'Manage Server', 'ticket-channel' => 'Manage Server'];
function page_rank(string $slug): int { return LOCKED_PAGES[$slug] ?? (rank_map('page_ranks')[$slug] ?? PAGES[$slug][1]); }
 
const NAV_GROUPS = [
    'Overview' => ['dashboard', 'audit'],
    'Moderation' => ['reports', 'tickets', 'modlog', 'msglog', 'users'],
    'Community' => ['suggestions', 'builder', 'welcome', 'helper'],
    'Studio' => ['development', 'subscriptions', 'perks', 'applications', 'jobs', 'games', 'marketplace', 'messages'],
    'Server & bots' => ['roster', 'botcfg', 'bots', 'staff', 'settings'],
];
const TICKET_LABELS = ['support' => 'General', 'general' => 'General', 'scam' => 'User report', 'staff' => 'Staff report', 'rules' => 'Rules / appeal', 'marketplace' => 'Marketplace', 'jobs' => 'Jobs', 'other' => 'Other'];
 
function ago(?string $utc): string {
    if (!$utc) return '<span class="pnl__muted">-</span>';
    $t = strtotime($utc . ' UTC'); if (!$t) return h($utc);
    $d = time() - $t; $abs = abs($d);
    if ($abs < 60) $txt = 'just now';
    elseif ($abs < 86400 * 30) { $txt = $abs < 3600 ? intdiv($abs, 60) . ' min' : ($abs < 86400 ? intdiv($abs, 3600) . ' h' : intdiv($abs, 86400) . ' d'); $txt = $d >= 0 ? $txt . ' ago' : 'in ' . $txt; }
    else $txt = gmdate('j M Y', $t);
    return '<time datetime="' . h(gmdate('c', $t)) . '" title="' . h($utc) . ' UTC">' . h($txt) . '</time>';
}
 
function waiting_counts(array $u): array {
    static $cache = null;
    if ($cache !== null) return $cache;
    $n = fn(string $sql) => (int)(one($sql)['n'] ?? 0);
    $tickets = 0; $unanswered = 0;
    foreach (all("SELECT t.*, (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id=t.id AND m.author_type='user' AND m.id > COALESCE((SELECT MAX(s.id) FROM ticket_messages s WHERE s.ticket_id=t.id AND s.author_type='staff'),0)) AS waiting FROM tickets t WHERE t.status<>'closed'") as $t) {
        if (!can_see_ticket($t, $u)) continue;    
        $tickets++; if ((int)$t['waiting'] > 0) $unanswered++;
    }
    return $cache = ['reports' => $n("SELECT COUNT(*) n FROM reports WHERE status='pending'"), 'messages' => $n("SELECT COUNT(*) n FROM messages WHERE status='new'"),
        'tickets' => $tickets, 'tickets_unanswered' => $unanswered, 'applications' => $n("SELECT COUNT(*) n FROM applications WHERE status IN ('new','reviewing')"),
        'marketplace' => $n("SELECT COUNT(*) n FROM listings WHERE status='pending'"), 'suggestions' => $n("SELECT COUNT(*) n FROM suggestions WHERE status='open'")];
}
 
function bot_online(string $scope, ?string $lastSeen): bool {
    return $lastSeen !== null && $lastSeen !== '' && strtotime($lastSeen . ' UTC') > time() - ($scope === 'roblox' ? 900 : 180);
}
function allowed(string $slug, array $u): bool {
    if (!isset(PAGES[$slug])) return false;
    $gate = PAGES[$slug][2];
    $rank = staff_rank($u);
    if ($rank < 1 || $rank < page_rank($slug)) return false;
    if ($rank >= 3) return true;
     
    if ($gate === 'mgmt') return member_caps($u)['dept'] >= MGMT_RANK || $rank >= 2;
    if ($gate === 'approver') return member_caps($u)['approver'] || $rank >= 2;
    return true;
}
const STATUS_REPORT = ['pending', 'verified', 'rejected'];

function redirect(string $to): never { header('Location: ' . $to, true, 303); exit; }
function url(string $p = ''): string { return '/staff' . ($p === '' ? '' : '/' . ltrim($p, '/')); }
function msg_param(): string { return isset($_GET['m']) ? str($_GET['m'], 120) : ''; }
function post_guard(array $c): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') return;
    $given = (string)($_POST['_csrf'] ?? '');
    if (!hash_equals($c['csrf'], $given)) { http_response_code(403); exit('Session expired. Go back, refresh and try again.'); }
}
function field(string $k, int $max): string { return str($_POST[$k] ?? '', $max); }
function badge(string $s): string {
    $cls = in_array($s, ['verified', 'accepted', 'active', 'open', 'online', 'published'], true) ? 'ok' : (in_array($s, ['rejected', 'removed', 'closed', 'offline', 'banned'], true) ? 'bad' : 'warn');
    return '<span class="pb pb--' . $cls . '">' . h($s) . '</span>';
}
function csrf_input(array $c): string { return '<input type="hidden" name="_csrf" value="' . h($c['csrf']) . '">'; }
function opts(array $list, string $sel): string { $o = ''; foreach ($list as $v) $o .= '<option' . ($v === $sel ? ' selected' : '') . '>' . h($v) . '</option>'; return $o; }
function nl(string $s): string { return nl2br(h($s)); }
function linkify(string $s): string {
    $out = '';
    foreach (preg_split('/\s+/', trim($s)) ?: [] as $w) {
        if (preg_match('#^https?://[^\s<>"]+$#i', $w)) $out .= '<a href="' . h($w) . '" target="_blank" rel="noopener noreferrer nofollow">' . h($w) . '</a> ';
        else $out .= h($w) . ' ';
    }
    return $out;
}

function layout(string $title, string $html, ?array $c = null, string $active = ''): never {
    $nav = '';
    if ($c && staff_rank($c['user']) >= 1) {
        $w = waiting_counts($c['user']);
        $count = ['reports' => $w['reports'], 'messages' => $w['messages'], 'tickets' => $w['tickets_unanswered'], 'applications' => $w['applications'], 'marketplace' => $w['marketplace'], 'suggestions' => $w['suggestions']];
        foreach (NAV_GROUPS as $group => $slugs) {
            $links = '';
            foreach ($slugs as $slug) {
                if (!isset(PAGES[$slug]) || !allowed($slug, $c['user'])) continue;
                $badge = !empty($count[$slug]) ? '<b class="pnl__count" title="Waiting for staff">' . (int)$count[$slug] . '</b>' : '';
                $links .= '<a href="' . url($slug === 'dashboard' ? '' : $slug) . '"' . ($active === $slug ? ' aria-current="page"' : '') . '><span>' . h(PAGES[$slug][0]) . '</span>' . $badge . '</a>';
            }
            if ($links !== '') $nav .= '<p class="pnl__navhead">' . h($group) . '</p>' . $links;
        }
    }
    $m = msg_param();
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . h($title) . ' | Staff | Axiomate Games</title><meta name="robots" content="noindex,nofollow">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap">
<link rel="stylesheet" href="/assets/style.css?v=55"><link rel="stylesheet" href="/assets/staff.css?v=23"><script src="/assets/theme.js?v=3"></script><link rel="stylesheet" href="/assets/shadow.css?v=4"><script src="/assets/panel.js?v=1" defer></script></head><body class="pnl">
<header class="header"><div class="header__inner"><a class="brand" href="/staff"><svg class="brand__mark" aria-hidden="true"><use href="/assets/icons.svg#logo"/></svg><span><span class="brand__name">Axiomate</span><span class="brand__sub">Staff panel</span></span></a>
<div class="pnl__who"><a class="btn btn--ghost btn--sm pnl__site" href="/home">&larr; Back to website</a>' . ($c ? '<span>' . h($c['user']['username']) . ' &middot; ' . h((string)staff_role($c['user'])) . '</span><a class="btn btn--ghost btn--sm" href="/staff/logout">Sign out</a>' : '') . '<button class="theme-toggle" type="button" data-theme-toggle aria-label="Toggle light and dark mode"><span class="theme-toggle__i" aria-hidden="true"></span></button></div></div></header>
<div class="pnl__wrap">' . ($nav ? '<nav class="pnl__nav" aria-label="Staff"><a class="pnl__nav-site" href="/home">&larr; Back to website</a>' . $nav . '<a class="pnl__nav-site" href="/hub-admin">App panel &rarr;</a></nav>' : '') . '<main class="pnl__main" id="main">' . ($m ? '<p class="pnl__flash" role="status">' . h($m) . '</p>' : '') . $html . '</main></div></body></html>';
    exit;
}
function card_page(string $title, string $inner): never { layout($title, '<div class="pnl__card">' . $inner . '</div>'); }

$path = trim((string)parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
$seg = array_values(array_filter(explode('/', preg_replace('#^staff/?#', '', $path) ?? ''), 'strlen'));
$page = $seg[0] ?? 'dashboard';
$sub = $seg[1] ?? '';
$c = auth();

 
if ($page === 'setup') {
    $tok = (string)($_GET['token'] ?? $_POST['token'] ?? '');
    if ((string)cfg('setup_token') === '' || !hash_equals((string)cfg('setup_token'), $tok)) { http_response_code(404); card_page('Not found', '<h1>Not found</h1>'); }
     
    if (setting('owner_discord_id')) {
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
            $cid = field('client_id', 32); $sec = field('client_secret', 120);
            if (!preg_match('/^\d{5,25}$/', $cid) || strlen($sec) < 10) card_page('Fix Discord login', '<h1>Fix Discord login</h1><p class="pnl__flash">Check the Client ID and Client Secret and try again.</p><p><a href="?token=' . h($tok) . '">Back</a></p>');
            set_setting('discord_client_id', $cid); set_setting('discord_client_secret', enc($sec));
            audit('setup', 'settings.discord-login', 'client ' . $cid);
            redirect(url() . '?m=Discord+login+updated.+Sign+in+with+Discord.');
        }
        card_page('Fix Discord login', '<h1>Fix Discord login</h1><p>Use this when the Discord application behind "Sign in with Discord" was deleted. In the Discord developer portal, open your application, add this redirect under <b>OAuth2 &rarr; Redirects</b>, then copy its Client ID and Client Secret here.</p><p><code>' . h(base_url()) . '/api/auth/callback</code></p>' .
            '<form method="post" class="pnl__form"><input type="hidden" name="token" value="' . h($tok) . '"><label>Client ID<input name="client_id" inputmode="numeric" required></label><label>Client Secret<input name="client_secret" type="password" autocomplete="off" required></label><button class="btn btn--primary" type="submit"><span>Save</span></button></form>');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        $cid = field('client_id', 32); $sec = field('client_secret', 120); $own = preg_replace('/\D/', '', field('owner_id', 25));
        if (!preg_match('/^\d{5,25}$/', $cid) || strlen($sec) < 10 || !preg_match('/^\d{5,25}$/', (string)$own)) card_page('Setup', '<h1>Setup</h1><p class="pnl__flash">Check the three values and try again.</p><p><a href="?token=' . h($tok) . '">Back</a></p>');
        set_setting('discord_client_id', $cid); set_setting('discord_client_secret', enc($sec)); set_setting('owner_discord_id', (string)$own); align_founder(db());
        audit('setup', 'setup.completed', 'owner ' . $own);
        redirect(url() . '?m=Setup+complete.+Sign+in+with+Discord.');
    }
    card_page('Setup', '<h1>First-time setup</h1><p>Create an application at the Discord developer portal, add this redirect URI under OAuth2, then enter its details.</p><p><code>' . h(base_url()) . '/api/auth/callback</code></p>
<form method="post" class="pnl__form"><input type="hidden" name="token" value="' . h($tok) . '">
<label>Discord Client ID<input name="client_id" required inputmode="numeric" autocomplete="off"></label>
<label>Discord Client Secret<input name="client_secret" type="password" required autocomplete="off"></label>
<label>Your Discord user ID (becomes the owner)<input name="owner_id" required inputmode="numeric" autocomplete="off" value="' . h(founder_id()) . '"></label>
<button class="btn btn--primary" type="submit"><span>Save and finish</span></button></form>');
}

if ($page === 'logout') { if ($c) logout(); redirect(url() . '?m=Signed+out'); }

 
if (!$c) {
    $configured = (bool)setting('owner_discord_id');
    layout('Sign in', '<div class="pnl__card pnl__card--narrow"><h1>Staff sign in</h1><p>Sign in with the Discord account that has been given staff access.</p>' .
        ($configured || is_dev() ? '<p><a class="btn btn--primary" href="/api/auth/discord?next=/staff"><span>Sign in with Discord</span></a></p>' : '<p class="pnl__flash">Staff sign-in is not set up yet. The site owner needs to finish setup.</p>') . '</div>');
}
$role = staff_role($c['user']);
if (!$role) { http_response_code(403); layout('No access', '<div class="pnl__card pnl__card--narrow"><h1>No access</h1><p>This Discord account is not on the staff list.</p><p><a class="btn btn--ghost" href="/staff/logout"><span>Sign out</span></a></p></div>', $c); }
if (!isset(PAGES[$page])) { http_response_code(404); layout('Not found', '<div class="pnl__card"><h1>Not found</h1></div>', $c); }
if (!allowed($page, $c['user'])) { http_response_code(403); layout('No access', '<div class="pnl__card"><h1>No access</h1><p>Your role or department does not allow this section.</p></div>', $c, $page); }
post_guard($c);
$me = $c['user']; $who = $me['username']; $post = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST'; $act = (string)($_POST['_do'] ?? '');

function table(array $head, array $rows): string {
    if (!$rows) return '<p class="pnl__empty">Nothing here yet.</p>';
    $search = count($rows) > 8 ? '<input class="pnl__search" type="search" placeholder="Search this list (' . count($rows) . ')" aria-label="Search this list" data-table-search>' : '';
    $h = $search . '<div class="pnl__tablewrap"><table class="pnl__table"><thead><tr>' . implode('', array_map(fn($x) => '<th>' . h($x) . '</th>', $head)) . '</tr></thead><tbody>';
    foreach ($rows as $r) $h .= '<tr>' . implode('', array_map(fn($x) => '<td>' . $x . '</td>', $r)) . '</tr>';
    return $h . '</tbody></table></div>';
}
function filters(string $base, array $values, string $cur, string $key = 's'): string {
    $o = '<p class="pnl__filters"><a' . ($cur === '' ? ' class="on"' : '') . ' href="' . url($base) . '">All</a>';
    foreach ($values as $v) $o .= '<a' . ($cur === $v ? ' class="on"' : '') . ' href="' . url($base) . '?' . $key . '=' . h($v) . '">' . h($v) . '</a>';
    return $o . '</p>';
}

 
switch ($page) {

case 'dashboard':
    $w = waiting_counts($me);
    $n = fn(string $sql) => (int)(one($sql)['n'] ?? 0);
    $hour = (int)gmdate('G');
    $hello = '<div class="pnl__hello"><h1>Dashboard</h1><p>Signed in as <b>' . h($who) . '</b> · ' . h(ucfirst((string)$role)) . '. Times are shown as "ago"; hover one for the exact UTC time.</p></div>';
     
    $todo = [
        ['tickets', $w['tickets_unanswered'], 'ticket' . ($w['tickets_unanswered'] === 1 ? '' : 's') . ' waiting for a staff reply', 'tickets', 'bad'],
        ['reports', $w['reports'], 'scam report' . ($w['reports'] === 1 ? '' : 's') . ' to review', 'reports?s=pending', 'warn'],
        ['applications', $w['applications'], 'job application' . ($w['applications'] === 1 ? '' : 's') . ' to decide', 'applications', 'warn'],
        ['messages', $w['messages'], 'new contact message' . ($w['messages'] === 1 ? '' : 's'), 'messages', 'warn'],
        ['marketplace', $w['marketplace'], 'marketplace post' . ($w['marketplace'] === 1 ? '' : 's') . ' to approve', 'marketplace', 'warn'],
        ['suggestions', $w['suggestions'], 'open suggestion' . ($w['suggestions'] === 1 ? '' : 's'), 'suggestions', 'ok'],
    ];
    $att = '';
    foreach ($todo as [$slug, $num, $what, $href, $tone]) {
        if ($num < 1 || !allowed($slug, $me)) continue;
        $att .= '<a class="pnl__todo pnl__todo--' . $tone . '" href="' . url($href) . '"><b>' . $num . '</b><span>' . h($what) . '</span><i aria-hidden="true">&rarr;</i></a>';
    }
    $att = $att !== '' ? '<div class="pnl__todos">' . $att . '</div>' : '<p class="pnl__allclear">All caught up. Nothing is waiting for staff right now.</p>';
     
    $tiles = [
        ['Open tickets', $w['tickets'], 'tickets'], ['Pending reports', $w['reports'], 'reports?s=pending'], ['Verified members', $n('SELECT COUNT(*) n FROM users WHERE roblox_verified_at IS NOT NULL'), 'users'],
        ['Website accounts', $n('SELECT COUNT(*) n FROM users'), 'users'], ['On the Team page', $n('SELECT COUNT(*) n FROM team_members WHERE visible=1'), 'roster'],
        ['Cases this week', $n("SELECT COUNT(*) n FROM mod_actions WHERE created_at >= '" . plus('-7 days') . "'"), 'modlog'],
    ];
    $tl = '<div class="pnl__stats">';
    foreach ($tiles as [$l, $v, $href]) {
        $inner = '<b>' . number_format($v) . '</b><span>' . h($l) . '</span>';
        $tl .= allowed(explode('?', $href)[0], $me) ? '<a class="pnl__stat" href="' . url($href) . '">' . $inner . '</a>' : '<div class="pnl__stat">' . $inner . '</div>';
    }
    $tl .= '</div>';
     
    $bots = []; foreach (all('SELECT * FROM bot_status') as $b) $bots[$b['scope']] = $b;
    $bc = '<div class="pnl__bots">'; $up = 0;
    foreach (BOTS as $scope => $label) {
        $b = $bots[$scope] ?? null; $on = $b && bot_online($scope, $b['last_seen']); $up += $on ? 1 : 0;
        $info = (string)($b['info'] ?? '');
        $servers = preg_match('/in (\d+) servers?/', $info, $mm) ? (int)$mm[1] : null;
        $note = preg_match('/\.\s+(.+)$/', $info, $nn) ? $nn[1] : '';
        $bad = $note !== '' && preg_match('/fail|off|not set|missing|cannot/i', $note);
        $bc .= '<div class="pnl__bot' . ($on ? '' : ' pnl__bot--off') . '"><div class="pnl__bothead"><i class="pnl__dot' . ($on ? ' pnl__dot--on' : '') . '"></i><b>' . h($label) . '</b></div>'
            . '<small>' . ($on ? 'Online' : ($b ? 'Offline' : 'Never started')) . ($b ? ' · seen ' . ago($b['last_seen']) : '') . ($servers !== null && $on ? ' · ' . $servers . ' server' . ($servers === 1 ? '' : 's') : '') . '</small>'
            . ($note !== '' ? '<p class="' . ($bad ? 'pnl__botwarn' : 'pnl__botnote') . '">' . h($note) . '</p>' : '') . '</div>';
    }
    $bc .= '</div>';
     
    $act2 = '';
    foreach (all('SELECT * FROM audit ORDER BY id DESC LIMIT 8') as $a2) $act2 .= '<li><span><b>' . h($a2['actor']) . '</b> ' . h(str_replace(['.', '_'], ' ', $a2['action'])) . ($a2['detail'] !== '' ? ' <small>' . h(mb_substr($a2['detail'], 0, 80)) . '</small>' : '') . '</span>' . ago($a2['created_at']) . '</li>';
    $cases = '';
    foreach (all('SELECT * FROM mod_actions ORDER BY id DESC LIMIT 6') as $m2) $cases .= '<li><span>' . badge($m2['action']) . ' <b>' . h($m2['target_name'] ?: $m2['target_id']) . '</b> <small>by ' . h($m2['moderator_name'] ?: '?') . ' · ' . h(mb_substr((string)$m2['reason'], 0, 60)) . '</small></span>' . ago($m2['created_at']) . '</li>';
    $feeds = '<div class="pnl__cols"><section><h2>Recent activity</h2>' . ($act2 ? '<ul class="pnl__feed">' . $act2 . '</ul>' : '<p class="pnl__empty">No activity yet.</p>') . (allowed('audit', $me) ? '<p><a href="' . url('audit') . '">Full audit log</a></p>' : '') . '</section>'
        . '<section><h2>Recent cases</h2>' . ($cases ? '<ul class="pnl__feed">' . $cases . '</ul>' : '<p class="pnl__empty">No moderation cases yet.</p>') . (allowed('modlog', $me) ? '<p><a href="' . url('modlog') . '">Moderation log</a></p>' : '') . '</section></div>';
    layout('Dashboard', '<div class="pnl__card">' . $hello . '<h2>Needs attention</h2>' . $att . '<h2>At a glance</h2>' . $tl . '<h2>Bots <small class="pnl__muted">' . $up . ' of ' . count(BOTS) . ' online</small></h2>' . $bc . $feeds . '</div>', $c, $page);

case 'reports':
    if ($sub !== '' && ctype_digit($sub)) {
        $r = one('SELECT r.*, u.username, u.discord_id, u.roblox_username AS rep_roblox FROM reports r LEFT JOIN users u ON u.id=r.user_id WHERE r.id=?', [(int)$sub]);
        if (!$r) { http_response_code(404); layout('Not found', '<div class="pnl__card"><h1>Not found</h1></div>', $c, $page); }
        if ($post) {
            $status = in_array($_POST['status'] ?? '', STATUS_REPORT, true) ? $_POST['status'] : $r['status'];
            $summary = field('public_summary', 600); $pub = !empty($_POST['published']) ? 1 : 0;
            $rid = digits($_POST['scammer_roblox_id'] ?? '', 20); $rname = field('scammer_name', 40);
            if ($pub && ($status !== 'verified' || $summary === '' || $rid === '' || $rname === '')) redirect(url('reports/' . $r['id']) . '?m=To+publish:+set+status+to+verified,+confirm+the+Roblox+name+and+ID,+and+write+a+public+summary');
            $row = ['status' => $status, 'scammer_name' => $rname ?: $r['scammer_name'], 'scammer_roblox_id' => $rid ?: null, 'scammer_discord_id' => digits($_POST['scammer_discord_id'] ?? '', 25), 'public_summary' => $summary, 'published' => $pub, 'staff_note' => field('staff_note', 3000), 'reviewed_by' => $who, 'reviewed_at' => now()];
            if ($pub && !$r['published_at']) $row['published_at'] = now();
            update('reports', (int)$r['id'], $row);
            audit($who, 'report.update', $r['ref'] . ' -> ' . $status . ($pub ? ' (published)' : ''));
            redirect(url('reports/' . $r['id']) . '?m=Saved');
        }
        $h = '<p><a href="' . url('reports') . '">&larr; All reports</a></p><h1>' . h($r['ref']) . ' ' . badge($r['status']) . ($r['published'] ? ' ' . badge('published') : '') . '</h1>
<dl class="pnl__dl"><dt>Accused (Roblox)</dt><dd>' . h($r['scammer_name']) . ($r['scammer_roblox_id'] ? ' &middot; ID ' . h($r['scammer_roblox_id']) . ' &middot; <a href="https://www.roblox.com/users/' . h($r['scammer_roblox_id']) . '/profile" target="_blank" rel="noopener noreferrer">profile</a>' : '') . '</dd><dt>Type</dt><dd>' . h($r['type']) . '</dd>
<dt>Reported by</dt><dd>' . h($r['username'] ?? 'unknown') . ' (Discord ' . h($r['discord_id'] ?? '?') . ($r['rep_roblox'] ? ', Roblox ' . h($r['rep_roblox']) : '') . ')</dd><dt>Submitted</dt><dd>' . h($r['created_at']) . ' UTC</dd>
<dt>What happened</dt><dd>' . nl($r['description']) . '</dd><dt>Evidence</dt><dd>' . ($r['evidence'] ? linkify($r['evidence']) : '-') . '</dd></dl>
<h2>Review</h2><form method="post" class="pnl__form">' . csrf_input($c) . '
<label>Status<select name="status">' . opts(STATUS_REPORT, $r['status']) . '</select></label>
<label>Accused Roblox username<input name="scammer_name" value="' . h($r['scammer_name']) . '" maxlength="40"></label>
<label>Accused Roblox user ID<input name="scammer_roblox_id" value="' . h($r['scammer_roblox_id']) . '" inputmode="numeric"></label>
<label>Accused Discord ID (optional, lets the Axio Moderation Bot warn about them)<input name="scammer_discord_id" value="' . h($r['scammer_discord_id']) . '" inputmode="numeric"></label>
<label>Public summary (this is the only text shown on the website)<textarea name="public_summary" maxlength="600" rows="3">' . h($r['public_summary']) . '</textarea></label>
<label class="pnl__check"><input type="checkbox" name="published" value="1"' . ($r['published'] ? ' checked' : '') . '> Publish to the Scam Logs page (needs verified, Roblox name + ID, and a summary)</label>
<label>Internal staff note<textarea name="staff_note" rows="3">' . h($r['staff_note']) . '</textarea></label>
<button class="btn btn--primary" type="submit"><span>Save review</span></button></form>';
        layout($r['ref'], '<div class="pnl__card">' . $h . '</div>', $c, $page);
    }
    $s = in_array($_GET['s'] ?? '', STATUS_REPORT, true) ? $_GET['s'] : '';
    $rows = [];
    foreach (all('SELECT r.*, u.username FROM reports r LEFT JOIN users u ON u.id=r.user_id' . ($s ? ' WHERE r.status=?' : '') . ' ORDER BY r.id DESC LIMIT 200', $s ? [$s] : []) as $r)
        $rows[] = ['<a href="' . url('reports/' . $r['id']) . '">' . h($r['ref']) . '</a>', h($r['scammer_name']) . '<br><small>' . h($r['scammer_roblox_id']) . '</small>', h($r['type']), badge($r['status']) . ($r['published'] ? ' ' . badge('published') : ''), h($r['username'] ?? ''), ago($r['created_at'])];
    layout('Scam reports', '<div class="pnl__card"><h1>Scam reports</h1>' . filters('reports', STATUS_REPORT, $s) . table(['Ref', 'Accused', 'Type', 'Status', 'Reporter', 'Date'], $rows) . '</div>', $c, $page);

case 'users':
    if ($post) {
        if (RANK[$role] < 2) { http_response_code(403); exit('Admins only.'); }
        $id = (int)($_POST['id'] ?? 0); $u = one('SELECT * FROM users WHERE id=?', [$id]);
        if ($u && staff_role($u) === null) {
            if ($act === 'ban') { q('UPDATE users SET banned=1 WHERE id=?', [$id]); q('DELETE FROM sessions WHERE user_id=?', [$id]); }
            elseif ($act === 'unban') q('UPDATE users SET banned=0 WHERE id=?', [$id]);
            elseif ($act === 'unlink-roblox') q('UPDATE users SET roblox_id=NULL, roblox_username=NULL, roblox_verified_at=NULL, roblox_code=NULL, roblox_code_expires=NULL WHERE id=?', [$id]);
            audit($who, 'user.' . $act, $u['username'] . ' (' . $u['discord_id'] . ')');
        }
        redirect(url('users') . '?m=Updated' . (isset($_POST['q']) ? '&q=' . rawurlencode(field('q', 60)) : ''));
    }
    $qs = str($_GET['q'] ?? '', 60);
    $list = $qs !== '' ? all('SELECT * FROM users WHERE username LIKE ? OR discord_id=? OR roblox_username LIKE ? OR roblox_id=? ORDER BY id DESC LIMIT 100', ['%' . $qs . '%', $qs, '%' . $qs . '%', $qs]) : all('SELECT * FROM users ORDER BY id DESC LIMIT 100');
    $rows = [];
    foreach ($list as $u) {
        $btn = fn($do, $label, $conf = '') => '<button class="btn btn--ghost btn--sm" name="_do" value="' . $do . '"' . ($conf ? ' onclick="return confirm(\'' . $conf . '\')"' : '') . '>' . $label . '</button>';
        $ctl = RANK[$role] >= 2 && staff_role($u) === null ? '<form method="post" class="pnl__inline">' . csrf_input($c) . '<input type="hidden" name="id" value="' . $u['id'] . '"><input type="hidden" name="q" value="' . h($qs) . '">' .
            ($u['banned'] ? $btn('unban', 'Unban') : $btn('ban', 'Ban', 'Ban this user?')) . ($u['roblox_verified_at'] ? $btn('unlink-roblox', 'Unlink Roblox', 'Remove the Roblox link? They will need to verify again.') : '') . '</form>' : '';
        $rows[] = [h($u['username']), h($u['discord_id']), $u['roblox_verified_at'] ? badge('verified') . ' ' . h($u['roblox_username']) . ' <small>' . h($u['roblox_id']) . '</small>' . ($u['server_verified_at'] ? ' <small>in server</small>' : '') : badge('unverified'), $u['banned'] ? badge('banned') : '', ago($u['created_at']), $ctl];
    }
    layout('Users', '<div class="pnl__card"><h1>Users</h1><form class="pnl__inline" method="get"><input name="q" placeholder="Name, Discord ID, Roblox name or ID" value="' . h($qs) . '"><button class="btn btn--ghost btn--sm">Search</button></form>' . table(['User', 'Discord ID', 'Roblox', '', 'Joined', ''], $rows) . '</div>', $c, $page);

case 'marketplace':
    $isApprover = member_caps($me)['approver'];
    if ($post) {
        if (!$isApprover) { http_response_code(403); exit('Only post approvers can review marketplace posts.'); }
        $id = (int)($_POST['id'] ?? 0);
        if (in_array($act, ['listing-active', 'listing-removed', 'listing-pending'], true)) {
            q('UPDATE listings SET status=?, approved_by=?, notified=? WHERE id=?', [substr($act, 8), $who, $act === 'listing-pending' ? 1 : 0, $id]); audit($who, $act, '#' . $id);
        }
        redirect(url('marketplace') . '?m=Updated');
    }
    $noApprovers = (int)one('SELECT COUNT(*) n FROM team_members WHERE post_approver=1')['n'] === 0;
    $rows = [];
    foreach (all("SELECT l.*, u.username, u.roblox_username FROM listings l LEFT JOIN users u ON u.id=l.user_id ORDER BY (l.status='pending') DESC, l.id DESC LIMIT 150") as $l)
        $rows[] = [h($l['title']), h($l['category']), h($l['price_text']), h($l['username'] ?? '') . '<br><small>' . h($l['roblox_username']) . '</small>', nl($l['description']), badge($l['status']) . ($l['approved_by'] ? '<br><small>by ' . h($l['approved_by']) . '</small>' : ''),
            $isApprover ? '<form method="post" class="pnl__inline">' . csrf_input($c) . '<input type="hidden" name="id" value="' . $l['id'] . '"><button class="btn btn--primary btn--sm" name="_do" value="listing-active">Approve</button><button class="btn btn--ghost btn--sm" name="_do" value="listing-removed">Reject</button></form>' : ''];
    layout('Marketplace', '<div class="pnl__card"><h1>Marketplace posts</h1>' .
        ($noApprovers ? '<p class="pnl__flash">Nobody can approve posts yet, so new posts wait here. Anyone with a role named <b>Post Approver</b> in the studio home server becomes an approver automatically (within a few minutes, once the Axio Verification Bot syncs), or mark any role as Post Approver under Roster &amp; roles.</p>' : '') .
        (!$isApprover ? '<p>You can view posts, but only members with a Post Approver role can approve or reject them.</p>' : '') .
        table(['Title', 'Type', 'Price', 'Seller', 'Description', 'Status', ''], $rows) . '</div>', $c, $page);

case 'staff':
    if ($post) {
        if ($act === 'add') {
            $did = digits(field('discord_id', 25)); $r = in_array($_POST['role'] ?? '', ['moderator', 'admin'], true) ? $_POST['role'] : 'moderator';
            if (strlen($did) < 5) redirect(url('staff') . '?m=Enter+a+valid+Discord+ID');
            $ex = one('SELECT source FROM staff WHERE discord_id=?', [$did]);
            if ($ex) q("UPDATE staff SET role=?, source='manual' WHERE discord_id=?", [$r, $did]); else insert('staff', ['discord_id' => $did, 'role' => $r, 'added_by' => $who, 'source' => 'manual', 'created_at' => now()]);
            audit($who, 'staff.set', $did . ' = ' . $r);
        } elseif ($act === 'remove') { q('DELETE FROM staff WHERE id=?', [(int)($_POST['id'] ?? 0)]); audit($who, 'staff.remove', (string)(int)($_POST['id'] ?? 0)); }
        redirect(url('staff') . '?m=Saved');
    }
    $rows = [['<strong>' . h(setting('owner_discord_id')) . '</strong>', badge('owner'), 'owner', '(set in Settings)', '']];
    foreach (all('SELECT s.*, u.username FROM staff s LEFT JOIN users u ON u.discord_id=s.discord_id ORDER BY s.id') as $s)
        $rows[] = [h($s['discord_id']) . ($s['username'] ? ' &middot; ' . h($s['username']) : ''), h($s['role']), $s['source'] === 'sync' ? 'from Discord role' : 'manual', h($s['added_by']), '<form method="post" class="pnl__inline">' . csrf_input($c) . '<input type="hidden" name="id" value="' . $s['id'] . '"><button class="btn btn--ghost btn--sm" name="_do" value="remove" onclick="return confirm(\'Remove this staff login?\')">Remove</button></form>'];
    layout('Staff', '<div class="pnl__card"><h1>Staff logins</h1><p>The Axio Verification Bot gives and removes staff logins automatically from Discord roles (set up under Roster &amp; roles). You can also add someone manually here. Moderators handle reports, messages, tickets and the moderation log. Admins can also use users and announcements.</p>' . table(['Discord ID', 'Access', 'Source', 'Added by', ''], $rows) . '<h2>Add a staff login manually</h2><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="add"><label>Discord user ID<input name="discord_id" required inputmode="numeric"></label><label>Access<select name="role"><option>moderator</option><option>admin</option></select></label><button class="btn btn--primary" type="submit"><span>Save</span></button></form></div>', $c, $page);

case 'roster':
    if ($post) {
        if ($act === 'map-save') {
            $rid = digits($_POST['role_pick'] ?? '') ?: digits($_POST['role_manual'] ?? '');
            $dept = ($_POST['department'] ?? '') !== '' && isset(DEPTS[$_POST['department']]) ? $_POST['department'] : '';
            $access = in_array($_POST['access'] ?? '', ['none', 'moderator', 'admin'], true) ? $_POST['access'] : 'none';
            $appr = !empty($_POST['post_approver']) ? 1 : 0;
            if ($appr && $access === 'none') $access = 'moderator';
            if (strlen($rid) < 5) redirect(url('roster') . '?m=Pick+a+role+or+enter+its+ID');
            $gr = one('SELECT name FROM guild_roles WHERE role_id=?', [$rid]); $rname = $gr['name'] ?? field('role_name', 100);
            $row = ['role_name' => $rname, 'department' => $dept, 'title' => field('title', 60), 'access' => $access, 'post_approver' => $appr, 'show_team' => !empty($_POST['show_team']) ? 1 : 0];
            $ex = one('SELECT id FROM role_map WHERE discord_role_id=?', [$rid]);
            if ($ex) update('role_map', (int)$ex['id'], $row); else insert('role_map', $row + ['discord_role_id' => $rid, 'created_at' => now()]);
            audit($who, 'role.map', $rname . ' -> ' . ($dept ?: 'no dept') . ' / ' . $access . ($appr ? ' / approver' : ''));
        } elseif ($act === 'map-delete') { q('DELETE FROM role_map WHERE id=?', [(int)($_POST['id'] ?? 0)]); audit($who, 'role.unmap', (string)(int)($_POST['id'] ?? 0)); }
        elseif ($act === 'team-min') {
            $min = digits($_POST['min_role'] ?? '');
            set_setting('team_min_role', $min);
            audit($who, 'team.min_role', $min !== '' ? (one('SELECT name FROM guild_roles WHERE role_id=?', [$min])['name'] ?? $min) : 'automatic (Partner)');
        }
        redirect(url('roster') . '?m=Saved.+The+Axio+Verification+Bot+applies+it+on+its+next+sync');
    }
    $mapped = array_column(all('SELECT discord_role_id FROM role_map'), 'discord_role_id');
    $pick = '<option value="">Choose a role...</option>';
    foreach (all('SELECT * FROM guild_roles ORDER BY position DESC') as $g) $pick .= '<option value="' . h($g['role_id']) . '">' . h($g['name']) . (in_array($g['role_id'], $mapped, true) ? ' (mapped)' : '') . '</option>';
    $rows = [];
    foreach (all('SELECT * FROM role_map ORDER BY id') as $r)
        $rows[] = [h($r['role_name']) . '<br><small>' . h($r['discord_role_id']) . '</small>', h($r['department'] ?: '-'), h($r['title'] ?: '-'), h($r['access']), $r['post_approver'] ? badge('approver') : '-', $r['show_team'] ? badge('shown') : '-', '<form method="post" class="pnl__inline">' . csrf_input($c) . '<input type="hidden" name="id" value="' . $r['id'] . '"><button class="btn btn--ghost btn--sm" name="_do" value="map-delete" onclick="return confirm(\'Unmap this role?\')">Unmap</button></form>'];
     
    $hiddenIds = array_column(all('SELECT discord_role_id FROM role_map WHERE show_team=0'), 'discord_role_id');
    $minRole = (string)(setting('team_min_role') ?: '');
    $serverRows = []; $minPick = '<option value="">Automatic: the Partner role</option>';
    $roleName = [];
    foreach (all('SELECT * FROM guild_roles ORDER BY position DESC') as $g) {
        $roleName[$g['role_id']] = $g['name'];
        $dot = '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:.45rem;background:' . ($g['color'] ? sprintf('#%06x', (int)$g['color']) : '#888') . '"></span>';
        $onTeam = in_array($g['role_id'], $hiddenIds, true) ? badge('hidden') : ((int)$g['on_team'] === 1 ? badge('shown') : '-');
        $serverRows[] = [$dot . h($g['name']) . '<br><small>' . h($g['role_id']) . '</small>', (string)(int)$g['members'], (int)$g['staff'] === 1 ? badge('staff') : '-', $onTeam, in_array($g['role_id'], $mapped, true) ? badge('mapped') : '-'];
        $minPick .= '<option value="' . h($g['role_id']) . '"' . ($minRole === $g['role_id'] ? ' selected' : '') . '>' . h($g['name']) . '</option>';
    }
    $team = [];
    foreach (all('SELECT * FROM team_members ORDER BY visible DESC, name') as $t) $team[] = [h($t['name']) . '<br><small>' . h($t['discord_id']) . '</small>', h($roleName[$t['role_id'] ?? ''] ?? ($t['source'] === 'founder' ? 'Founder card' : '-')), h($t['departments'] ?: '-'), h(str_replace('|', ', ', (string)$t['titles']) ?: '-'), $t['post_approver'] ? badge('approver') : '-', $t['visible'] ? badge('shown') : badge('hidden'), h($t['source'])];
    $sync = one("SELECT MAX(last_seen) AS last_seen FROM bot_status WHERE scope IN ('verification','moderation')");
    $opts = '<option value="">None</option>'; foreach (array_keys(DEPTS) as $d) $opts .= '<option>' . h($d) . '</option>';
    layout('Roster & roles', '<div class="pnl__card"><h1>Roster &amp; roles</h1><p>The Axio Verification Bot keeps the Team page in step with your studio server. Every role from <b>Partner</b> up (and any role with staff permissions) is listed on the Team page automatically, with everyone who holds it, under their highest role. Changes show within seconds. Map a role below to choose its department, title, staff panel access or post approver status, or to hide it. Staff panel logins only come from mapped roles. Last bot contact: ' . (!empty($sync['last_seen']) ? ago($sync['last_seen']) : 'never') . '.</p>' .
        '<h2>Server roles</h2><p>Your studio server, top to bottom. <b>Members</b> is how many people hold the role.</p>' . table(['Role', 'Members', 'Staff permissions', 'On team page', 'Mapped'], $serverRows) .
        '<h2>Team page starts at</h2><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="team-min"><label>Show this role and every role above it<select name="min_role">' . $minPick . '</select></label><button class="btn btn--primary" type="submit"><span>Save</span></button></form>' .
        '<h2>Mapped roles</h2>' . table(['Discord role', 'Department', 'Title shown', 'Panel access', 'Post approver', 'On team page', ''], $rows) .
        '<h2>Map a role</h2><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="map-save">
<label>Discord role (filled in by the Axio Verification Bot)<select name="role_pick">' . $pick . '</select></label>
<label>...or role ID<input name="role_manual" inputmode="numeric" placeholder="Only if the role is not in the list"></label>
<label>Department<select name="department">' . $opts . '</select></label>
<label>Title shown on the team page (optional)<input name="title" maxlength="60" placeholder="Defaults to the role name"></label>
<label>Panel access<select name="access"><option value="none">None</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select></label>
<label class="pnl__check"><input type="checkbox" name="post_approver" value="1"> Post approver (can approve marketplace posts)</label>
<label class="pnl__check"><input type="checkbox" name="show_team" value="1" checked> Show on the Team page</label>
<button class="btn btn--primary" type="submit"><span>Save mapping</span></button></form>' .
        '<h2>Current roster</h2>' . table(['Member', 'Listed under', 'Departments', 'Titles', 'Approver', 'Team page', 'Source'], $team) . '</div>', $c, $page);

case 'games':
    $statuses = ['planned', 'in_development', 'live', 'coming_soon'];
    if ($post) {
        if ($act === 'group') {
            set_setting('roblox_group_id', digits($_POST['group_id'] ?? '', 20)); audit($who, 'games.group', digits($_POST['group_id'] ?? '', 20));
        } elseif ($act === 'save') {
            $id = (int)($_POST['id'] ?? 0); $name = field('name', 80);
            $play = field('play_url', 300); if ($play !== '' && !preg_match('#^https://#i', $play)) $play = '';
            $row = ['name' => $name, 'platform' => in_array($_POST['platform'] ?? '', ['roblox', 'steam'], true) ? $_POST['platform'] : 'roblox', 'status' => in_array($_POST['status'] ?? '', $statuses, true) ? $_POST['status'] : 'planned', 'tagline' => field('tagline', 200), 'description' => field('description', 3000), 'release_text' => field('release_text', 60), 'play_url' => $play, 'place_id' => digits($_POST['place_id'] ?? '', 20), 'universe_id' => digits($_POST['universe_id'] ?? '', 20), 'sort' => (int)($_POST['sort'] ?? 0), 'featured' => !empty($_POST['featured']) ? 1 : 0];
            if ($name === '') redirect(url('games') . '?m=Name+is+required');
            if ($row['featured']) q('UPDATE games SET featured=0 WHERE id<>?', [$id]);
            if ($id) update('games', $id, $row); else { $row['slug'] = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $name) ?? '', '-')) ?: 'game-' . time(); insert('games', $row); }
            audit($who, 'games.save', $name);
        }
        redirect(url('games') . '?m=Saved');
    }
    $edit = ctype_digit($sub) && $sub !== '' ? one('SELECT * FROM games WHERE id=?', [(int)$sub]) : null;
    $rows = [];
    foreach (all('SELECT * FROM games ORDER BY sort,id') as $g)
        $rows[] = [h($g['name']) . ($g['featured'] ? ' ' . badge('featured') : ''), h($g['platform']), h($g['status']) . ($g['release_text'] ? '<br><small>Release: ' . h($g['release_text']) . '</small>' : ''), $g['stats_at'] && !empty($g['stats_hidden']) ? '<span class="pb pb--warn">not public on Roblox</span><br><small>Roblox shares no numbers until the game is public · checked ' . h($g['stats_at']) . ' UTC</small>' : ($g['stats_at'] ? h(number_format((int)$g['playing'])) . ' playing &middot; ' . h(number_format((int)$g['visits'])) . ' visits<br><small>' . h($g['stats_at']) . ' UTC</small>' : '<small>no data yet</small>'), '<a href="' . url('games/' . $g['id']) . '">Edit</a>'];
    $grp = json_decode((string)setting('roblox_group'), true);
    layout('Games', '<div class="pnl__card"><h1>Games</h1><p>What the Games page and the home page show. The Axio Roblox Group Bot fills in the live numbers using the IDs below.</p>' . table(['Game', 'Platform', 'Status', 'Live data', ''], $rows) .
        '<h2>Roblox group</h2><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="group"><label>Roblox group ID<input name="group_id" value="' . h(setting('roblox_group_id')) . '" inputmode="numeric"></label>' . ($grp ? '<p>' . h($grp['name'] ?? '') . ': ' . h(number_format((int)($grp['members'] ?? 0))) . ' members (updated ' . h($grp['updated_at'] ?? '') . ' UTC)</p>' : '') . '<button class="btn btn--primary" type="submit"><span>Save group</span></button></form>' .
        '<h2>' . ($edit ? 'Edit game' : 'Add a game') . '</h2><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="save"><input type="hidden" name="id" value="' . (int)($edit['id'] ?? 0) . '">
<label>Name<input name="name" value="' . h($edit['name'] ?? '') . '" maxlength="80" required></label>
<label>Platform<select name="platform">' . opts(['roblox', 'steam'], $edit['platform'] ?? 'roblox') . '</select></label>
<label>Status<select name="status">' . opts($statuses, $edit['status'] ?? 'planned') . '</select></label>
<label>Tagline<input name="tagline" value="' . h($edit['tagline'] ?? '') . '" maxlength="200"></label><label>Estimated release <small>(e.g. Early 2027; shown on the website and in /games, empty hides it)</small><input name="release_text" value="' . h($edit['release_text'] ?? '') . '" maxlength="60"></label>
<label>Description<textarea name="description" rows="4" maxlength="3000">' . h($edit['description'] ?? '') . '</textarea></label>
<label>Play link (https only, leave blank until it is live)<input name="play_url" value="' . h($edit['play_url'] ?? '') . '" maxlength="300"></label>
<label>Roblox place ID (from the game URL)<input name="place_id" value="' . h($edit['place_id'] ?? '') . '" inputmode="numeric"></label>
<label>Roblox universe ID (optional, found automatically from the place ID)<input name="universe_id" value="' . h($edit['universe_id'] ?? '') . '" inputmode="numeric"></label>
<label>Order<input name="sort" value="' . h($edit['sort'] ?? '0') . '" inputmode="numeric"></label>
<label class="pnl__check"><input type="checkbox" name="featured" value="1"' . (($edit['featured'] ?? 0) ? ' checked' : '') . '> Featured game (shown on the home page)</label>
<button class="btn btn--primary" type="submit"><span>Save game</span></button>' . ($edit ? '<a class="btn btn--ghost" href="' . url('games') . '">Cancel</a>' : '') . '</form></div>', $c, $page);

case 'bots':
    $newKey = ''; $newScope = '';
    if ($post) {
        if ($act === 'create') {
            $scope = isset(BOTS[$_POST['scope'] ?? '']) ? $_POST['scope'] : 'ticket';
            $newKey = 'axm_' . $scope . '_' . bin2hex(random_bytes(24));
            insert('api_keys', ['name' => field('name', 60) ?: BOTS[$scope], 'scope' => $scope, 'key_hash' => hash('sha256', $newKey), 'key_hint' => substr($newKey, -4), 'created_by' => $who, 'created_at' => now()]);
            $newScope = $scope;
            audit($who, 'bot.key.create', $scope);
        } elseif ($act === 'revoke') { q('UPDATE api_keys SET active=0 WHERE id=?', [(int)($_POST['id'] ?? 0)]); audit($who, 'bot.key.revoke', (string)(int)($_POST['id'] ?? 0)); redirect(url('bots') . '?m=Key+revoked'); }
    }
    $rows = [];
    foreach (all('SELECT * FROM api_keys ORDER BY id DESC') as $k)
        $rows[] = [h($k['name']), h(BOTS[$k['scope']] ?? $k['scope']), ($k['key_hint'] ?? '') !== '' ? '<code>…' . h($k['key_hint']) . '</code>' : '<small>older key</small>', badge($k['active'] ? 'active' : 'revoked'), h($k['last_used_at'] ?: 'never'), $k['active'] ? '<form method="post" class="pnl__inline">' . csrf_input($c) . '<input type="hidden" name="id" value="' . $k['id'] . '"><button class="btn btn--ghost btn--sm" name="_do" value="revoke" onclick="return confirm(\'Revoke this key? The bot will stop working.\')">Revoke</button></form>' : ''];
    $scopeOpts = ''; foreach (BOTS as $s => $label) $scopeOpts .= '<option value="' . h($s) . '">' . h($label) . '</option>';
    $errRows = [];
    foreach (all('SELECT * FROM site_errors WHERE at>=? ORDER BY id DESC LIMIT 25', [plus('-3 days')]) as $er) $errRows[] = [ago($er['at']), h($er['scope'] ?: 'website'), h($er['path']), '<small>' . h($er['message']) . '</small>'];
    $errBox = '<div class="pnl__card"><h2>Website errors (last 3 days)</h2><p>When the website fails a request (a bot then logs "Something went wrong on our side"), the reason is recorded here.</p>' . table(['When', 'From', 'Address', 'Error'], $errRows) . '</div>';
    layout('Bots', '<div class="pnl__card"><h1>Bot API keys</h1><p>Each bot uses its own key, sent as the <code>X-Api-Key</code> header. Keys are shown once and stored only as a hash.</p>' .
        ($newKey ? '<div class="pnl__secret"><strong>New key for ' . h(BOTS[$newScope] ?? '') . ' (copy it now, it will not be shown again):</strong>' .
            '<div class="pnl__keyrow"><input id="newkey" readonly value="' . h($newKey) . '" onclick="this.select()"><button type="button" class="btn btn--primary btn--sm" onclick="var i=document.getElementById(\'newkey\');i.select();(navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.reject()).then(function(){this.textContent=\'Copied\'}.bind(this),function(){document.execCommand(\'copy\')})">Copy</button></div>' .
            '<p>In Pterodactyl set the variable <code>' . h(strtoupper($newScope)) . '_API_KEY</code> to exactly this value (no quotes or spaces), then restart. The bot logs the key\'s last 4 characters (<code>…' . h(substr($newKey, -4)) . '</code>) when it starts, so you can check it is the right one.</p></div>' : '') .
        table(['Name', 'Bot', 'Ends with', 'Status', 'Last used (UTC)', ''], $rows) . '<h2>Create a key</h2><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="create"><label>Name<input name="name" maxlength="60" placeholder="e.g. Axio Ticket Bot"></label><label>Bot<select name="scope">' . $scopeOpts . '</select></label><button class="btn btn--primary" type="submit"><span>Create key</span></button></form></div>' . $errBox, $c, $page);

case 'settings':
    if ($post) {
        if ($act === 'discord') {
            $cid = field('client_id', 32); $sec = field('client_secret', 120); $own = digits(field('owner_id', 25));
            if (!preg_match('/^\d{5,25}$/', $cid) || !preg_match('/^\d{5,25}$/', $own)) redirect(url('settings') . '?m=Check+the+Client+ID+and+owner+ID');
            set_setting('discord_client_id', $cid); if ($sec !== '') set_setting('discord_client_secret', enc($sec)); set_setting('owner_discord_id', $own);
            audit($who, 'settings.update', 'discord');
        } elseif ($act === 'roblox') {
            $rid = trim(field('roblox_client_id', 40)); $rsec = trim(field('roblox_client_secret', 200));
            if (!empty($_POST['roblox_off'])) { set_setting('roblox_client_id', ''); set_setting('roblox_client_secret', ''); }
            else { if ($rid !== '' && !preg_match('/^\d{5,30}$/', $rid)) redirect(url('settings') . '?m=The+Roblox+client+ID+is+a+long+number#roblox'); if ($rid !== '') set_setting('roblox_client_id', $rid); if ($rsec !== '') set_setting('roblox_client_secret', enc($rsec)); }
            audit($who, 'settings.update', 'roblox login');
            redirect(url('settings') . '?m=' . (roblox_oauth_on() ? 'Sign+in+with+Roblox+is+on' : 'Saved.+Sign+in+with+Roblox+needs+both+the+client+ID+and+secret') . '#roblox');
        } elseif ($act === 'smtp') {
            set_setting('smtp_host', field('smtp_host', 120) ?: 'smtp.hostinger.com'); set_setting('smtp_port', (string)((int)($_POST['smtp_port'] ?? 465) ?: 465)); set_setting('smtp_user', field('smtp_user', 190) ?: 'contact@axiomategames.com');
            $pw = field('smtp_pass', 200); if ($pw !== '') set_setting('smtp_pass', enc($pw));
            audit($who, 'settings.update', 'smtp');
        } elseif ($act === 'access') {
            $names = [1 => 'moderator', 2 => 'admin', 3 => 'owner'];
            $pages = []; foreach (PAGES as $slug => $p) { if (isset(LOCKED_PAGES[$slug])) continue; $v = (int)($_POST['page_' . $slug] ?? $p[1]); if (in_array($v, [1, 2, 3], true) && $v !== $p[1]) $pages[$slug] = $v; }
            $cmds = []; foreach (BOT_COMMANDS as $cmd => $d) { $v = (int)($_POST['cmd_' . str_replace(' ', '_', $cmd)] ?? $d[1]); if (in_array($v, [1, 2, 3], true) && $v !== $d[1]) $cmds[$cmd] = $v; }
            set_setting('page_ranks', json_encode((object)$pages)); set_setting('command_ranks', json_encode((object)$cmds));
            audit($who, 'settings.access', count($pages) . ' page(s), ' . count($cmds) . ' command(s) changed from the defaults');
            redirect(url('settings') . '?m=Access+saved.+The+bots+use+the+new+command+ranks+within+a+minute#access');
        } elseif ($act === 'smtp-test') {
            $ok = send_mail(setting('smtp_user') ?: 'contact@axiomategames.com', 'Axiomate Games email test', 'If you can read this, the website can send email through this mailbox.');
            redirect(url('settings') . '?m=' . ($ok ? 'Test+email+sent' : 'Test+email+FAILED.+Check+the+mailbox+password+and+host'));
        }
        redirect(url('settings') . '?m=Saved');
    }
    $env = getenv('AXM_SMTP_PASS') ? ' A password is also set in the AXM_SMTP_PASS environment variable, which takes priority.' : '';
     
    $rankSel = function (string $name, int $cur, int $default): string {
        $o = ''; foreach ([1 => 'Moderator and up', 2 => 'Admin and up', 3 => 'Owner only'] as $v => $l) $o .= '<option value="' . $v . '"' . ($v === $cur ? ' selected' : '') . '>' . $l . ($v === $default ? ' (default)' : '') . '</option>';
        return '<select name="' . h($name) . '">' . $o . '</select>';
    };
    $pr = rank_map('page_ranks'); $cr = rank_map('command_ranks'); $prow = []; $crow = [];
    foreach (PAGES as $slug => [$label, $min, $gate]) {
        $fixed = LOCKED_PAGES[$slug] ?? null;
        $prow[] = [h($label) . ($gate === 'mgmt' ? '<br><small>moderators also need Management or higher</small>' : ($gate === 'approver' ? '<br><small>moderators also need post approver</small>' : '')),
            $fixed ? ($fixed === 3 ? 'Owner only' : 'Everyone on staff') . ' <small>(fixed)</small>' : $rankSel('page_' . $slug, $pr[$slug] ?? $min, $min)];
    }
    foreach (BOT_COMMANDS as $cmd => [$bot, $def, $what]) $crow[] = ['<code>/' . h($cmd) . '</code><br><small>' . h($what) . '</small>', h('Axio ' . $bot . ' Bot'), isset(CMD_PERMS[$cmd]) ? 'Anyone with <b>' . h(CMD_PERMS[$cmd]) . '</b> in Discord' : $rankSel('cmd_' . str_replace(' ', '_', $cmd), $cr[$cmd] ?? $def, $def)];
    $access = '<h2 id="access">Access by rank</h2><p>Choose the lowest staff rank for each panel page and each bot command. Pages a rank cannot use disappear from their menu. '
        . '<p><b>Bot commands follow Discord permissions.</b> A staff command can be used by anyone who has its Discord permission (for example <b>Ban Members</b> for <code>/ban</code>), and <code>/help</code> lists it for them. To let other roles use a command, or to stop some, change it in Discord: <b>Server Settings &rarr; Integrations &rarr; the bot &rarr; the command</b>. Commands without a Discord permission (like <code>/break request</code>) use the staff rank below. '
        . 'Ranks: <b>Owner</b> (you and the Discord server owner), <b>Admin</b> (panel admins, or Administrator / Manage Server in Discord) and <b>Moderator</b> (panel moderators, or Kick / Timeout / Manage Messages in Discord).</p>'
        . '<p>Moderation commands also follow the <b>hierarchy</b>: nobody can use them on someone with the same or a higher staff rank, or whose highest Discord role is the same or higher. The owner can act on anyone.</p>'
        . '<form method="post" class="pnl__form pnl__form--wide">' . csrf_input($c) . '<input type="hidden" name="_do" value="access"><h3>Panel pages</h3>' . table(['Page', 'Who can open it'], $prow)
        . '<h3>Bot commands</h3>' . table(['Command', 'Bot', 'Who can use it'], $crow) . '<button class="btn btn--primary" type="submit"><span>Save access</span></button></form>';
    layout('Settings', '<div class="pnl__card"><h1>Settings</h1>' . $access . '<h2>Discord login</h2><p>Redirect URI to register in the Discord developer portal: <code>' . h(base_url()) . '/api/auth/callback</code></p><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="discord"><label>Discord Client ID<input name="client_id" value="' . h(setting('discord_client_id')) . '" required inputmode="numeric"></label><label>Discord Client Secret (leave blank to keep the current one)<input name="client_secret" type="password" autocomplete="off"></label><label>Owner Discord user ID<input name="owner_id" value="' . h(setting('owner_discord_id')) . '" required inputmode="numeric"></label><button class="btn btn--primary" type="submit"><span>Save</span></button></form>' .
        '<h2 id="roblox">Roblox login (Sign in with Roblox)</h2><p>Members link Roblox by signing in to Roblox, like Bloxlink, instead of editing their profile. ' . (roblox_oauth_on() ? '<b>On.</b>' : '<b>Off</b>: members use the words-in-profile check until this is set up.') . '</p>'
        . '<ol><li>Open <a href="https://create.roblox.com/dashboard/credentials?activeTab=OAuthTab" target="_blank" rel="noopener">create.roblox.com, Credentials, OAuth 2.0 Apps</a> and create an app.</li><li>Add the redirect URL <code>' . h(base_url()) . '/api/roblox/oauth/callback</code> and the scopes <code>openid</code> and <code>profile</code>.</li><li>Paste the client ID and secret here. The secret is stored encrypted and never shown again.</li></ol>'
        . '<form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="roblox"><label>Roblox client ID<input name="roblox_client_id" value="' . h((string)setting('roblox_client_id')) . '" inputmode="numeric"></label><label>Roblox client secret (leave blank to keep the current one)<input name="roblox_client_secret" type="password" autocomplete="new-password"></label>'
        . '<label class="pnl__check"><input type="checkbox" name="roblox_off" value="1"> Turn Sign in with Roblox off</label><button class="btn btn--primary" type="submit"><span>Save Roblox login</span></button></form>'
        . '<h2>Contact mailbox (email)</h2><p>The website sends email from this mailbox: contact form messages, and the codes for app accounts (verify email, reset password). The password is stored encrypted and never shown again.' . h($env) . '</p>' . (setting('mail_last_error') ? '<p><b>Last email problem:</b> ' . h((string)setting('mail_last_error')) . '</p>' : '') . '<form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="smtp"><label>Mail server<input name="smtp_host" value="' . h(setting('smtp_host') ?: 'smtp.hostinger.com') . '"></label><label>Port<input name="smtp_port" value="' . h(setting('smtp_port') ?: '465') . '" inputmode="numeric"></label><label>Mailbox<input name="smtp_user" value="' . h(setting('smtp_user') ?: 'contact@axiomategames.com') . '"></label><label>Mailbox password (leave blank to keep the current one)<input name="smtp_pass" type="password" autocomplete="new-password"></label><button class="btn btn--primary" type="submit"><span>Save email settings</span></button></form><form method="post" class="pnl__inline">' . csrf_input($c) . '<button class="btn btn--ghost btn--sm" name="_do" value="smtp-test">Send a test email</button></form></div>', $c, $page);

case 'messages':
    if ($post) {
        $id = (int)($_POST['id'] ?? 0);
        if ($act === 'delete') { q('DELETE FROM messages WHERE id=?', [$id]); audit($who, 'message.delete', (string)$id); }
        elseif (in_array($_POST['status'] ?? '', ['new', 'read', 'done'], true)) q('UPDATE messages SET status=? WHERE id=?', [$_POST['status'], $id]);
        redirect(url('messages') . '?m=Updated');
    }
    $rows = [];
    foreach (all('SELECT * FROM messages ORDER BY id DESC LIMIT 200') as $r)
        $rows[] = [badge($r['status']), h($r['name']) . '<br><a href="mailto:' . h($r['email']) . '">' . h($r['email']) . '</a>', h($r['topic']), nl($r['message']), ago($r['created_at']),
            '<form method="post" class="pnl__inline">' . csrf_input($c) . '<input type="hidden" name="id" value="' . $r['id'] . '"><select name="status">' . opts(['new', 'read', 'done'], $r['status']) . '</select><button class="btn btn--ghost btn--sm">Set</button><button class="btn btn--ghost btn--sm" name="_do" value="delete" onclick="return confirm(\'Delete this message?\')">Delete</button></form>'];
    layout('Messages', '<div class="pnl__card"><h1>Contact messages</h1>' . table(['Status', 'From', 'Topic', 'Message', 'Date', ''], $rows) . '</div>', $c, $page);

case 'tickets':
    if ($sub !== '' && ctype_digit($sub)) {
        $tid = (int)$sub;
        $t = one('SELECT * FROM tickets WHERE id=?', [$tid]);
        if (!$t || !can_see_ticket($t, $me)) { http_response_code(404); layout('Not found', '<div class="pnl__card"><h1>Not found</h1></div>', $c, $page); }
        $back = url('tickets/' . $tid);
        if ($post) {
            $closed = $t['status'] === 'closed';
            if ($act === 'claim' && !$closed) {
                q("UPDATE tickets SET status='claimed', claimed_by=? WHERE id=?", [$who, $tid]);
                ticket_say($tid, 'system', $who, $who . ' is now handling your ticket and will message you in your DMs.', 'claimed', 0);
                audit($who, 'ticket.claim', $t['ref']);
                redirect($back . '?m=Claimed');
            }
             
            if ($act === 'note-add') {
                $text = field('note_text', 2000);
                if ($text === '') redirect($back . '?m=Write+the+note+first');
                ticket_add_note($tid, $text, $who, isset($_POST['notify']) && !$closed);
                audit($who, 'ticket.note', $t['ref']);
                redirect($back . '?m=Note+added' . (isset($_POST['notify']) && !$closed ? '.+The+member+gets+a+DM+that+their+ticket+was+updated' : ''));
            }
            if ($act === 'note-edit' || $act === 'note-delete') {
                $nid = (int)($_POST['note_id'] ?? 0);
                if (!one('SELECT id FROM ticket_notes WHERE id=? AND ticket_id=?', [$nid, $tid])) redirect($back . '?m=Note+not+found');
                if ($act === 'note-delete') { q('DELETE FROM ticket_notes WHERE id=?', [$nid]); redirect($back . '?m=Note+deleted'); }
                $text = field('note_text', 2000);
                if ($text === '') redirect($back . '?m=A+note+cannot+be+empty');
                q('UPDATE ticket_notes SET body=?, author=?, updated_at=? WHERE id=?', [$text, $who, now(), $nid]);
                if (isset($_POST['notify']) && !$closed) ticket_say($tid, 'system', $who, $text, 'note', 0);
                redirect($back . '?m=Note+updated');
            }
             
            if ($act === 'type') {
                $new = (string)($_POST['category'] ?? '');
                if (!isset(TICKET_TYPES[$new])) redirect($back . '?m=Pick+a+ticket+type');
                if ($new === 'staff' && staff_rank($me) < 2) redirect($back . '?m=Only+admins+can+make+a+ticket+a+staff+report');
                q('UPDATE tickets SET category=? WHERE id=?', [$new, $tid]);
                audit($who, 'ticket.type', $t['ref'] . ': ' . $t['category'] . ' -> ' . $new);
                redirect($back . '?m=Type+changed+to+' . urlencode(TICKET_TYPES[$new]));
            }
             
            if ($act === 'scam-yes' && $t['category'] === 'scam' && !$t['scam_result']) {
                try {
                    $res = confirm_scam($t, digits($_POST['scammer_discord_id'] ?? ''), field('scammer_roblox', 20), in_array($_POST['scam_type'] ?? '', array_keys(SCAM_TYPES), true) ? $_POST['scam_type'] : 'other',
                        field('public_summary', 600), isset($_POST['ban']), isset($_POST['log']), $who);
                } catch (InvalidArgumentException $e) { redirect($back . '?m=' . urlencode($e->getMessage())); }
                $msg = field('member_note', 2000) ?: 'We confirmed the scam you reported.' . ($res['done'] ? ' The scammer was ' . implode(' and ', $res['done']) . '.' : '') . ' Thank you for reporting it.';
                ticket_add_note($tid, $msg, $who, !$closed);
                redirect($back . '?m=Scam+confirmed' . ($res['done'] ? ':+' . urlencode(implode(' and ', $res['done'])) : ''));
            }
            if ($act === 'scam-no' && $t['category'] === 'scam' && !$t['scam_result']) {
                q("UPDATE tickets SET scam_result='no-scam' WHERE id=?", [$tid]);
                ticket_add_note($tid, field('member_note', 2000) ?: 'We looked into your report and could not confirm a scam.', $who, !$closed);
                audit($who, 'ticket.no-scam', $t['ref']);
                redirect($back . '?m=Marked+as+no+scam');
            }
            if ($act === 'close' && !$closed) {
                $note = field('note', 1000);
                ticket_say($tid, 'system', $who, $note !== '' ? $note : 'Your ticket was closed. If you still need help, open a new one any time.', 'closed', 0);
                q("UPDATE tickets SET status='closed', closed_by=?, closed_at=?, transcript=? WHERE id=?", [$who, now(), ticket_transcript($tid), $tid]);
                audit($who, 'ticket.close', $t['ref']);
                redirect($back . '?m=Ticket+closed');
            }
            redirect($back);
        }
        $autolink = fn(string $s): string => preg_replace('#https?://[^\s<]+#i', '<a href="$0" target="_blank" rel="noopener noreferrer nofollow">$0</a>', nl2br(h($s)));
        $thread = '';
        foreach (all('SELECT * FROM ticket_messages WHERE ticket_id=? ORDER BY id', [$tid]) as $m) {
            $who2 = $m['author_type'] === 'staff' ? 'Staff: ' . $m['author_name'] : ($m['author_type'] === 'user' ? 'User: ' . $m['author_name'] : 'System');
            $state = $m['author_type'] === 'user' ? '' : ((int)$m['delivered'] === 0 ? ' <span class="pb pb--warn">waiting to send</span>' : ((int)$m['delivered'] === 2 ? ' <span class="pb pb--bad">could not DM the user</span>' : ' <span class="pb pb--ok">sent</span>'));
            $thread .= '<div class="pnl__msg pnl__msg--' . h($m['author_type']) . '"><div class="pnl__msghead"><b>' . h($who2) . '</b> <small>' . ago($m['created_at']) . ' UTC' . ($m['kind'] !== 'message' ? ' · ' . h($m['kind']) : '') . '</small>' . $state . '</div><div>' . $autolink($m['content']) . '</div></div>';
        }
        $det = trim((string)$t['details']);
        $meta = '<dl class="pnl__dl"><dt>Server</dt><dd>' . h(guild_label($t['guild_id'])) . '</dd><dt>User</dt><dd>' . h($t['discord_username']) . ' (' . h($t['discord_user_id']) . ') &middot; <a href="https://discord.com/users/' . h($t['discord_user_id']) . '" target="_blank" rel="noopener">Message on Discord</a></dd><dt>Type</dt><dd>' . h(TICKET_TYPES[$t['category']] ?? (TICKET_LABELS[$t['category']] ?? (string)$t['category'])) . '</dd><dt>Priority</dt><dd>' . h(PERK_PRIORITY[min(3, (int)($t['priority'] ?? 0))]) . '</dd>' . (($t['source'] ?? '') === 'app' ? '<dt>Opened in</dt><dd>The Axiomate Hub app (<a href="/hub-admin" target="_blank" rel="noopener">App panel</a>). They see your notes there and with /ticket-status.</dd>' : '') . ($t['category'] === 'staff' ? '<dt>Reported staff</dt><dd>' . h($t['reported_id'] ?: '-') . ' <span class="pb pb--bad">admins only</span></dd>' : '') . ($t['category'] === 'rules' && $t['reported_id'] ? '<dt>Hidden from</dt><dd>' . h($t['reported_id']) . ' <span class="pb pb--warn">the moderator who gave the punishment</span></dd>' : '') . '<dt>Reference</dt><dd>' . h($t['subject']) . '</dd>' .
            ((int)$t['evidence_flag'] === 1 ? '<dt>Evidence</dt><dd><span class="pb pb--bad">flagged sensitive / explicit</span></dd>' : '') .
            '<dt>Claimed by</dt><dd>' . h($t['claimed_by'] ?: '-') . '</dd><dt>Opened</dt><dd>' . h($t['created_at']) . ' UTC</dd><dt>Closed</dt><dd>' . h($t['closed_at'] ?: '-') . ' ' . h($t['closed_by'] ? 'by ' . $t['closed_by'] : '') . '</dd></dl>';
        if ($det !== '') $meta .= '<h2>Ticket details</h2><div class="pnl__msg">' . $autolink($det) . '</div>';
        $open = $t['status'] !== 'closed';
        $actions = '';
        if ($open) {
            $actions = (true ? '<h2>Talk to the member</h2><p>Staff talk to the member directly in Discord DMs from their own account. Their DMs had to be open to make the ticket.</p><p><a class="btn btn--primary" href="https://discord.com/users/' . h($t['discord_user_id']) . '" target="_blank" rel="noopener"><span>Open their Discord profile</span></a></p>' : '') .
                '<div class="pnl__inline">' . (!$t['claimed_by'] ? '<form method="post">' . csrf_input($c) . '<input type="hidden" name="_do" value="claim"><button class="btn btn--ghost" type="submit">Claim this ticket</button></form>' : '') . '</div>' .
                '<h2>Close ticket</h2><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="close"><label>Message to the user (optional)<textarea name="note" rows="2" maxlength="1000"></textarea></label><button class="btn btn--ghost" type="submit" onclick="return confirm(\'Close this ticket? The user is told in their DMs.\')">Close ticket</button></form>';
        }
         
        $typeOpts = ''; foreach (TICKET_TYPES as $k => $l) $typeOpts .= '<option value="' . h($k) . '"' . ($k === $t['category'] || ($k === 'support' && $t['category'] === 'general') ? ' selected' : '') . '>' . h($l) . '</option>';
        $typeForm = '<form method="post" class="pnl__inline">' . csrf_input($c) . '<input type="hidden" name="_do" value="type"><label>Ticket type <select name="category">' . $typeOpts . '</select></label> <button class="btn btn--ghost btn--sm" type="submit">Change type</button></form>';
        $scamBox = '';
        if ($t['category'] === 'scam') {
            if ($t['scam_result'] === 'scam') {
                $rep = $t['scam_report_id'] ? one('SELECT * FROM reports WHERE id=?', [(int)$t['scam_report_id']]) : null;
                $ban = $rep && $rep['scammer_discord_id'] ? one('SELECT * FROM pending_bans WHERE source=? AND discord_id=? ORDER BY id DESC LIMIT 1', [$t['ref'], $rep['scammer_discord_id']]) : null;
                $scamBox = '<h2>Scam decision</h2><p>' . badge('verified') . ' <b>Scam confirmed</b>' . ($rep ? ': ' . h($rep['scammer_name']) . ' &middot; <a href="' . url('reports/' . $rep['id']) . '">' . h($rep['ref']) . '</a>' . ($rep['published'] ? ' (on the Scam Logs)' : ' (not published)') : '') . '</p>' .
                    ($ban ? '<p><b>Ban:</b> ' . ($ban['status'] === 'waiting' ? 'waiting for the bot (within a minute)' : nl((string)$ban['result'])) . '</p>' : '');
            } elseif ($t['scam_result'] === 'no-scam') {
                $scamBox = '<h2>Scam decision</h2><p>' . badge('closed') . ' Marked as <b>no scam</b>.</p>';
            } else {
                $sus = preg_match('/^Suspects:\s*(.+)$/mi', (string)$t['details'], $sm) ? trim($sm[1]) : '';
                $typeSel = ''; foreach (SCAM_TYPES as $k => $l) $typeSel .= '<option value="' . h($k) . '">' . h($l) . '</option>';
                $scamBox = '<h2>Scam decision</h2><p>Did a scam happen?' . ($sus !== '' ? ' The member named these suspects: <b>' . h($sus) . '</b>.' : '') . '</p>' .
                    '<form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="scam-yes"><h3>Yes, a scam happened</h3>' .
                    '<div class="wl__row"><label>Scammer\'s Discord user ID <small>(to ban them)</small><input name="scammer_discord_id" inputmode="numeric" placeholder="e.g. 123456789012345678"></label><label>Scammer\'s Roblox username <small>(for the Scam Logs)</small><input name="scammer_roblox" maxlength="20"></label></div>' .
                    '<div class="wl__row"><label>Type of scam<select name="scam_type">' . $typeSel . '</select></label></div>' .
                    '<label>Public summary <small>(shown on the Scam Logs)</small><textarea name="public_summary" rows="2" maxlength="600" placeholder="e.g. Took items in a trade and never sent the Robux."></textarea></label>' .
                    '<label class="pnl__check"><input type="checkbox" name="ban" checked> Ban them from every server the bot is in</label><label class="pnl__check"><input type="checkbox" name="log" checked> Add them to the Scam Logs</label>' .
                    '<label>Note for the member <small>(optional, otherwise a standard message)</small><textarea name="member_note" rows="2" maxlength="2000"></textarea></label>' .
                    '<button class="btn btn--primary" type="submit" onclick="return confirm(\'Confirm the scam? This bans and logs the scammer.\')"><span>Confirm scam</span></button></form>' .
                    '<form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="scam-no"><h3>No scam</h3><label>Note for the member <small>(optional)</small><textarea name="member_note" rows="2" maxlength="2000" placeholder="We looked into your report and could not confirm a scam."></textarea></label><button class="btn btn--ghost" type="submit">Mark as no scam</button></form>';
            }
        }
        $notesHtml = '';
        foreach (all('SELECT * FROM ticket_notes WHERE ticket_id=? ORDER BY id DESC', [$tid]) as $n)
            $notesHtml .= '<form method="post" class="pnl__form pnl__note">' . csrf_input($c) . '<input type="hidden" name="note_id" value="' . (int)$n['id'] . '"><small>' . h($n['author']) . ' · ' . ago($n['updated_at']) . ($n['updated_at'] !== $n['created_at'] ? ' (edited)' : '') . '</small><textarea name="note_text" rows="3" maxlength="2000">' . h($n['body']) . '</textarea>' .
                '<div class="pnl__inline"><button class="btn btn--ghost btn--sm" name="_do" value="note-edit">Save changes</button>' . ($open ? '<label class="pnl__check"><input type="checkbox" name="notify"> DM them about this change</label>' : '') . '<button class="btn btn--ghost btn--sm" name="_do" value="note-delete" onclick="return confirm(\'Delete this note?\')">Delete</button></div></form>';
        $notesBox = '<h2>Notes for the member</h2><p>Updates the member can see with <code>/ticket-status</code> and on their Account page on the website, for example what you are checking or what you need from them. Staff can also add one in Discord with <code>/ticket-note</code>.</p>' .
            '<form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="note-add"><label>New note<textarea name="note_text" rows="3" maxlength="2000" required placeholder="e.g. We are checking the logs and will message you soon."></textarea></label>' . ($open ? '<label class="pnl__check"><input type="checkbox" name="notify" checked> DM them that their ticket was updated</label>' : '') . '<button class="btn btn--primary" type="submit"><span>Add note</span></button></form>' .
            ($notesHtml ?: '<p class="pnl__empty">No notes yet.</p>');
        layout($t['ref'], '<div class="pnl__card"><p><a href="' . url('tickets') . '">&larr; All tickets</a></p><h1>' . h($t['ref']) . ' ' . badge($t['status']) . '</h1>' . $meta . $typeForm . $scamBox . $notesBox . '<h2>History</h2>' . ($thread ?: '<p class="pnl__empty">No messages yet.</p>') . ($open ? '' : ($t['transcript'] && !$thread ? '<pre class="pnl__pre">' . h($t['transcript']) . '</pre>' : '')) . $actions . '</div>', $c, $page);
    }
    $view = in_array($_GET['s'] ?? '', ['closed', 'all'], true) ? $_GET['s'] : 'open';
    $list = [];
    foreach (all("SELECT t.*, (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id=t.id AND m.author_type='user' AND m.id > COALESCE((SELECT MAX(s.id) FROM ticket_messages s WHERE s.ticket_id=t.id AND s.author_type='staff'),0)) AS waiting, (SELECT MAX(created_at) FROM ticket_messages m WHERE m.ticket_id=t.id) AS last_msg FROM tickets t ORDER BY t.id DESC LIMIT 300") as $t) {
        if (!can_see_ticket($t, $me)) continue;
        $closed = $t['status'] === 'closed';
        if (($view === 'open' && $closed) || ($view === 'closed' && !$closed)) continue;
        $list[] = $t;
    }
     
    usort($list, fn($x, $y) => [(int)($y['status'] !== 'closed' && $y['waiting'] > 0), $y['status'] !== 'closed' ? (int)$y['priority'] : 0, (string)$y['last_msg']] <=> [(int)($x['status'] !== 'closed' && $x['waiting'] > 0), $x['status'] !== 'closed' ? (int)$x['priority'] : 0, (string)$x['last_msg']]);
    $rows = [];
    foreach ($list as $t) {
        $waiting = $t['status'] !== 'closed' ? (int)$t['waiting'] : 0;
        $rows[] = ['<a href="' . url('tickets/' . $t['id']) . '">' . h($t['ref']) . '</a>' . (($t['source'] ?? '') === 'app' ? ' <span class="pb pb--warn" title="Opened in the Axiomate Hub app">App</span>' : ''), h($t['discord_username']) . '<br><small>' . h(guild_label($t['guild_id'])) . '</small>', h(TICKET_LABELS[$t['category']] ?? ucfirst((string)$t['category'])), h($t['subject']),
            badge($t['status']) . ($waiting > 0 ? ' <span class="pb pb--bad">' . $waiting . ' waiting</span>' : '') . ((int)$t['priority'] > 0 ? ' <span class="pb pb--warn">' . h(PERK_PRIORITY[min(3, (int)$t['priority'])]) . ' priority</span>' : ''), h($t['claimed_by'] ?: '-'), ago($t['last_msg'] ?: $t['created_at']), ago($t['created_at'])];
    }
    $w = waiting_counts($me);
    $tabs = '<div class="pnl__filters">';
    foreach (['open' => 'Open (' . $w['tickets'] . ')', 'closed' => 'Closed', 'all' => 'All'] as $k => $l) $tabs .= '<a href="' . url('tickets') . '?s=' . $k . '"' . ($view === $k ? ' class="on"' : '') . '>' . h($l) . '</a>';
    $tabs .= '</div>';
    layout('Tickets', '<div class="pnl__card"><h1>Tickets</h1><p>Members open tickets with /ticket or by DMing the bot. Open one to read it, then talk to the member in their own Discord DMs and keep notes they can see with /ticket-status. Tickets waiting for a reply are listed first, higher priority (Role perks) before lower. Staff reports are only shown to admins and the owner (never to the staff member reported), and appeals are hidden from the moderator who gave the punishment.</p>' . $tabs . table(['Ref', 'Member', 'Type', 'Subject', 'Status', 'Claimed by', 'Last message', 'Opened'], $rows) . '</div>', $c, $page);

case 'modlog':
    $t = preg_replace('/\D/', '', (string)($_GET['target'] ?? ''));
    $rows = [];
    foreach (all('SELECT * FROM mod_actions' . ($t ? ' WHERE target_id=?' : '') . ' ORDER BY id DESC LIMIT 300', $t ? [$t] : []) as $a)
        $rows[] = ['#' . $a['id'], h(guild_label($a['guild_id'])), badge($a['action']), '<a href="' . url('modlog') . '?target=' . h($a['target_id']) . '">' . h($a['target_name'] ?: $a['target_id']) . '</a>', h($a['moderator_name']), h($a['reason']), $a['duration_minutes'] ? h($a['duration_minutes']) . ' min' : '', ago($a['created_at'])];
    layout('Moderation log', '<div class="pnl__card"><h1>Moderation log</h1><form class="pnl__inline" method="get">' . '<input name="target" placeholder="Filter by Discord ID" value="' . h($t) . '"><button class="btn btn--ghost btn--sm">Filter</button></form>' . table(['Case', 'Server', 'Action', 'Target', 'Moderator', 'Reason', 'Length', 'When'], $rows) . '</div>', $c, $page);

case 'applications':
    if ($sub !== '' && ctype_digit($sub)) {
        $a = one('SELECT a.*, u.username, u.discord_id, u.email, u.avatar AS live_avatar, j.title AS job, j.role_ids, j.guild_id AS job_guild FROM applications a LEFT JOIN users u ON u.id=a.user_id LEFT JOIN jobs j ON j.id=a.job_id WHERE a.id=?', [(int)$sub]);
        if (!$a) { http_response_code(404); layout('Not found', '<div class="pnl__card"><h1>Not found</h1></div>', $c, $page); }
        if ($post) {
            $note = field('staff_note', 1500);
            if (in_array($act, ['accept', 'deny'], true)) {
                if (in_array($a['status'], ['accepted', 'rejected'], true)) redirect(url('applications/' . $a['id']) . '?m=This+application+was+already+decided');
                $st = $act === 'accept' ? 'accepted' : 'rejected';
                 
                update('applications', (int)$a['id'], ['status' => $st, 'staff_note' => $note, 'reviewed_by' => $who, 'decided_at' => now(), 'notify_state' => 'queued', 'notify_result' => null]);
                audit($who, 'application.' . $st, '#' . $a['id'] . ' ' . ($a['applicant_name'] ?: $a['username']));
                redirect(url('applications/' . $a['id']) . '?m=' . ($st === 'accepted' ? 'Accepted.+The+Axio+Verification+Bot+gives+the+roles+and+DMs+them+within+about+20+seconds' : 'Denied.+The+Axio+Verification+Bot+DMs+them+within+about+20+seconds'));
            }
            if ($act === 'retry' && in_array($a['notify_state'], ['problem', 'done'], true)) { update('applications', (int)$a['id'], ['notify_state' => 'queued']); redirect(url('applications/' . $a['id']) . '?m=Sent+to+the+bot+again'); }
            update('applications', (int)$a['id'], ['status' => in_array($a['status'], ['accepted', 'rejected'], true) ? $a['status'] : 'reviewing', 'staff_note' => $note, 'reviewed_by' => $who]);
            audit($who, 'application.note', '#' . $a['id']);
            redirect(url('applications/' . $a['id']) . '?m=Saved');
        }
        $did = (string)($a['applicant_discord'] ?: $a['discord_id']);
        $pic = avatar_url($did, $a['live_avatar'] ?: $a['applicant_avatar'], 128);
        $answers = json_decode((string)$a['answers'], true) ?: [['q' => 'Message', 'a' => (string)$a['message']]];
        $qa = ''; foreach ($answers as $x) $qa .= '<div class="pnl__qa"><b>' . h($x['q']) . '</b><div>' . ($x['a'] !== '' ? nl($x['a']) : '<small>No answer</small>') . '</div></div>';
        $roleNames = []; foreach (id_list($a['role_ids'] ?? '[]') as $rid) $roleNames[] = h(role_name(job_guild($a['job_guild'] ?? ''), $rid));
        $res = json_decode((string)$a['notify_result'], true);
        $delivery = ['' => '-', 'queued' => badge('waiting') . ' waiting for the Axio Verification Bot'][$a['notify_state']] ?? '';
        if (!$delivery && $res) $delivery = ($res['dm'] ? '<span class="pb pb--ok">DM sent</span>' : '<span class="pb pb--warn">could not DM</span>') . ($res['roles_given'] ? ' Roles given: ' . h(implode(', ', $res['roles_given'])) : '') . ($res['roles_failed'] ? ' <span class="pb pb--bad">could not give: ' . h(implode(', ', $res['roles_failed'])) . '</span>' : '') . ($res['error'] ? ' <small>' . h($res['error']) . '</small>' : '') .
            ' <form method="post" class="pnl__inline" style="display:inline-flex">' . csrf_input($c) . '<button class="btn btn--ghost btn--sm" name="_do" value="retry">Send again</button></form>';
        $decided = in_array($a['status'], ['accepted', 'rejected'], true);
        $actions = $decided ? '<p>Decided by ' . h($a['reviewed_by']) . ' on ' . h($a['decided_at'] ?? '') . ' UTC.</p>' :
            '<h2>Decision</h2><form method="post" class="pnl__form">' . csrf_input($c) . '<label>Message to the applicant (sent in their DMs and shown on their dashboard)<textarea name="staff_note" rows="3" maxlength="1500" placeholder="Optional">' . h($a['staff_note']) . '</textarea></label><div class="pnl__inline">' .
            '<button class="btn btn--primary" name="_do" value="accept" onclick="return confirm(\'Accept this application? The roles below are given right away.\')">Accept' . ($roleNames ? ' and give ' . count($roleNames) . ' role' . (count($roleNames) === 1 ? '' : 's') : '') . '</button>' .
            '<button class="btn btn--ghost" name="_do" value="deny" onclick="return confirm(\'Deny this application? They are told in their DMs.\')">Deny</button><button class="btn btn--ghost" name="_do" value="note">Save note only</button></div></form>';
        layout('Application', '<div class="pnl__card"><p><a href="' . url('applications') . '">&larr; All applications</a></p><h1>Application #' . $a['id'] . ' ' . badge($a['status']) . '</h1>' .
            '<div class="pnl__applicant"><img src="' . h($pic) . '" alt="" width="72" height="72"><div><b>' . h($a['applicant_name'] ?: $a['username']) . '</b><small>Discord ID ' . h($did) . '</small><small>&lt;@' . h($did) . '&gt;</small></div></div>' .
            '<dl class="pnl__dl"><dt>Position</dt><dd>' . h($a['job'] ?: 'General application') . '</dd><dt>Area</dt><dd>' . h($a['area']) . '</dd><dt>Submitted</dt><dd>' . h($a['created_at']) . ' UTC</dd><dt>Roles on accept</dt><dd>' . ($roleNames ? implode(', ', $roleNames) : 'None set on this job') . '</dd><dt>Bot delivery</dt><dd>' . $delivery . '</dd>' . ($a['staff_note'] ? '<dt>Message</dt><dd>' . nl($a['staff_note']) . '</dd>' : '') . '</dl>' .
            '<h2>Answers</h2>' . $qa . $actions . '</div>', $c, $page);
    }
    $rows = [];
    foreach (all('SELECT a.*, u.username, u.discord_id, u.avatar AS live_avatar, j.title AS job FROM applications a LEFT JOIN users u ON u.id=a.user_id LEFT JOIN jobs j ON j.id=a.job_id ORDER BY a.id DESC LIMIT 200') as $a) {
        $did = (string)($a['applicant_discord'] ?: $a['discord_id']);
        $who2 = '<span class="pnl__mini"><img src="' . h(avatar_url($did, $a['live_avatar'] ?: $a['applicant_avatar'], 64)) . '" alt="" width="28" height="28">' . h($a['applicant_name'] ?: $a['username']) . '</span><br><small>' . h($did) . '</small>';
        $rows[] = ['<a href="' . url('applications/' . $a['id']) . '">#' . $a['id'] . '</a>', $who2, h($a['job'] ?: 'General'), badge($a['status']) . ($a['notify_state'] === 'problem' ? ' <span class="pb pb--bad">delivery problem</span>' : ''), ago($a['created_at'])];
    }
    layout('Applications', '<div class="pnl__card"><h1>Job applications</h1><p>Open one to read the answers and accept or deny it. Accepting gives the job\'s roles automatically, and the applicant is told in their DMs either way. They can also see the result on their Account page.</p>' . table(['ID', 'Applicant', 'Position', 'Status', 'Date'], $rows) . '</div>', $c, $page);

case 'jobs':
    if ($post) {
        $id = (int)($_POST['id'] ?? 0);
        if ($act === 'save') {
            $qs = job_questions((string)($_POST['questions'] ?? '[]'));
            $roles = array_values(array_filter(array_map(fn($v) => digits($v), is_array($_POST['roles'] ?? null) ? $_POST['roles'] : [])));
            $jg = digits($_POST['guild_id'] ?? '');
            $okRoles = array_column(server_role_list(job_guild($jg)), 'role_id');
            $roles = array_values(array_filter($roles, fn($r) => in_array($r, $okRoles, true)));
            $row = ['guild_id' => $jg, 'title' => field('title', 120), 'area' => in_array($_POST['area'] ?? '', job_areas(job_guild($jg)), true) ? (string)$_POST['area'] : (job_areas(job_guild($jg))[0] ?? 'Other'), 'description' => field('description', 4000), 'status' => ($_POST['status'] ?? '') === 'closed' ? 'closed' : 'open',
                'questions' => json_encode($qs, JSON_UNESCAPED_UNICODE), 'role_ids' => json_encode($roles)];
            if ($row['title'] === '' || $row['description'] === '') redirect(url('jobs') . '?m=Title+and+description+are+required');
            if ($id) update('jobs', $id, $row); else insert('jobs', $row + ['created_at' => now()]);
            audit($who, 'job.save', $row['title']);
        } elseif ($act === 'delete') { q('DELETE FROM jobs WHERE id=?', [$id]); audit($who, 'job.delete', (string)$id); }
        redirect(url('jobs') . '?m=Saved');
    }
    $edit = ctype_digit($sub) && $sub !== '' ? one('SELECT * FROM jobs WHERE id=?', [(int)$sub]) : null;
    $rows = [];
    foreach (all('SELECT * FROM jobs ORDER BY id DESC') as $j)
        $rows[] = [h($j['title']), h(guild_label(job_guild($j['guild_id'] ?? ''))) . (($j['guild_id'] ?? '') === '' ? ' <small>(home)</small>' : ''), h($j['area']), badge($j['status']), (string)count(job_questions($j['questions'])), (string)count(id_list($j['role_ids'])), '<a href="' . url('jobs/' . $j['id']) . '">Edit</a>'];
    $chosen = id_list($edit['role_ids'] ?? '[]');
    $home = (string)setting('home_guild_id');
    $jobGuild = job_guild($edit['guild_id'] ?? '');
    $servers = []; foreach (all("SELECT guild_id, MAX(name) AS name FROM bot_guilds WHERE scope='verification' GROUP BY guild_id ORDER BY name") as $g) $servers[(string)$g['guild_id']] = (string)($g['name'] ?: $g['guild_id']);
    if ($home !== '' && !isset($servers[$home])) $servers = [$home => guild_label($home)] + $servers;
    if ($jobGuild !== '' && !isset($servers[$jobGuild])) $servers[$jobGuild] = guild_label($jobGuild);
    $srvSel = ''; foreach ($servers as $id => $name) { $id = (string)$id; $srvSel .= '<option value="' . h($id) . '"' . ($id === $jobGuild ? ' selected' : '') . '>' . h($name) . ($id === $home ? ' (studio home)' : '') . '</option>'; }
    $rolePick = '';
    $areaLists = [];
    foreach ($servers as $id => $name) {
        $id = (string)$id; $list = ''; $areaLists[$id] = job_areas($id);
        foreach (server_role_list($id) as $g) {
            $box = '<input type="checkbox" name="roles[]" value="' . h($g['role_id']) . '"' . ($id === $jobGuild && in_array($g['role_id'], $chosen, true) ? ' checked' : '') . '>';
            $div = divider_label((string)$g['name']);
            if ($div !== null) { $list .= '<label class="pnl__check pnl__rolehead">' . $box . '<b>' . h($div !== '' ? $div : 'Divider') . '</b> <small>divider role</small></label>'; continue; }
            $list .= '<label class="pnl__check">' . $box . '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' . ($g['color'] ? sprintf('#%06x', (int)$g['color']) : '#888') . '"></span> ' . h($g['name']) . '</label>';
        }
        $rolePick .= '<div class="pnl__roles" data-job-guild="' . h($id) . '" data-areas="' . h(json_encode($areaLists[$id], JSON_UNESCAPED_UNICODE)) . '"' . ($id === $jobGuild ? '' : ' hidden') . '>' . ($list ?: '<p class="pnl__empty">No roles from this server yet. They appear within a few minutes of the Axio Verification Bot (latest files) being in it.</p>') . '</div>';
    }
    $areaOpts = $areaLists[$jobGuild] ?? JOB_AREAS;
    if (($edit['area'] ?? '') !== '' && !in_array($edit['area'], $areaOpts, true)) $areaOpts[] = $edit['area'];
    if ($rolePick === '') $rolePick = '<p class="pnl__empty">No servers yet. They appear once the Axio Verification Bot is running.</p>';
    layout('Jobs', '<div class="pnl__card"><h1>Jobs</h1>' . table(['Title', 'Server', 'Area', 'Status', 'Questions', 'Roles on accept', ''], $rows) . '<h2>' . ($edit ? 'Edit job' : 'New job') . '</h2><form method="post" class="pnl__form" id="job-form">' . csrf_input($c) . '<input type="hidden" name="_do" value="save"><input type="hidden" name="id" value="' . (int)($edit['id'] ?? 0) . '"><label>Title<input name="title" value="' . h($edit['title'] ?? '') . '" maxlength="120" required></label><fieldset class="pnl__areas"><legend>Area <small>(the divider roles of the job\'s server)</small></legend><div id="job-area">' . implode('', array_map(fn($x, $n) => '<label class="pnl__area"><input type="radio" name="area" value="' . h($x) . '"' . (($edit['area'] ?? '') === $x || (($edit['area'] ?? '') === '' && $n === 0) ? ' checked' : '') . '><span>' . h($x) . '</span></label>', $areaOpts, array_keys($areaOpts))) . '</div></fieldset><label>Status<select name="status"><option value="open"' . (($edit['status'] ?? 'open') === 'open' ? ' selected' : '') . '>open</option><option value="closed"' . (($edit['status'] ?? '') === 'closed' ? ' selected' : '') . '>closed</option></select></label><label>Description<textarea name="description" rows="5" required>' . h($edit['description'] ?? '') . '</textarea></label>' .
        '<h2>Application questions</h2><p>Applicants answer these on the Jobs page. They must be signed in with Discord, so their Discord ID, name and picture are saved with the answers.</p><div id="jq" class="jq"></div><input type="hidden" name="questions" id="jq-data" value="' . h(json_encode(job_questions($edit['questions'] ?? '[]'), JSON_UNESCAPED_UNICODE)) . '">' .
        '<h2>Server and roles given when accepted</h2><p>Pick the server this job is for. Its divider roles (like <b>—— Bots ——</b>) become the Area choices and group the roles below. When you accept an application, the Axio Verification Bot gives the roles you tick here in that server (the applicant must be in it) and DMs them. Its own role must be above these roles.</p><label>Server<select name="guild_id" id="job-guild">' . $srvSel . '</select></label>' . $rolePick .
        '<script>(function(){var s=document.getElementById("job-guild"),a=document.getElementById("job-area");if(!s)return;function sync(first){document.querySelectorAll("[data-job-guild]").forEach(function(d){var on=d.getAttribute("data-job-guild")===s.value;d.hidden=!on;d.querySelectorAll("input").forEach(function(i){i.disabled=!on;});if(on&&a&&!first){var c=a.querySelector("input:checked"),cur=c?c.value:"",list=JSON.parse(d.getAttribute("data-areas")||"[]");a.innerHTML="";list.forEach(function(x,n){var l=document.createElement("label"),i=document.createElement("input"),t=document.createElement("span");l.className="pnl__area";i.type="radio";i.name="area";i.value=x;i.checked=x===cur||(list.indexOf(cur)<0&&n===0);t.textContent=x;l.appendChild(i);l.appendChild(t);a.appendChild(l);});}});}s.addEventListener("change",function(){sync(false);});sync(true);})();</script>' .
        '<button class="btn btn--primary" type="submit"><span>Save job</span></button>' . ($edit ? '<button class="btn btn--ghost" name="_do" value="delete" onclick="return confirm(\'Delete this job?\')">Delete</button><a class="btn btn--ghost" href="' . url('jobs') . '">Cancel</a>' : '') . '</form></div><script src="/assets/jobs-admin.js?v=1" defer></script>', $c, $page);

case 'builder':
    $guilds = all("SELECT guild_id,name FROM bot_guilds WHERE scope='community' ORDER BY name");
    $builderRules = fn() => array_map(fn($r) => ['id' => (int)$r['id'], 'guild_id' => (string)$r['guild_id'], 'num' => (int)$r['num'], 'title' => $r['title'], 'body' => $r['body'], 'punishment' => (string)$r['punishment'], 'audience' => $r['audience']], all('SELECT id,guild_id,num,title,body,punishment,audience FROM rules ORDER BY num,id'));
    if ($post && $act === 'rules_channel') {
        if (!allowed('botcfg', $me)) json_out(['ok' => false, 'error' => 'Your rank cannot change Bot settings.'], 403);
        $g = digits($_POST['guild_id'] ?? ''); $ch = digits($_POST['channel_id'] ?? ''); $aud = ($_POST['audience'] ?? '') === 'staff' ? 'staff' : 'member';
        if ($g === '' || $ch === '' || !one('SELECT 1 AS x FROM bot_channels WHERE guild_id=? AND channel_id=?', [$g, $ch])) json_out(['ok' => false, 'error' => 'Pick a channel the Axio Community Bot can post in.'], 422);
        bcfg_set($g, $aud === 'staff' ? 'rules.staff_channel' : 'rules.channel', $ch);
        audit($who, 'botcfg.rules_channel', guild_label($g) . ' #' . (one('SELECT name FROM bot_channels WHERE guild_id=? AND channel_id=?', [$g, $ch])['name'] ?? $ch) . ' (' . $aud . ' rules)');
        json_out(['ok' => true]);
    }
    if ($post && $act === 'rules_save') {
        if (!allowed('rules', $me)) json_out(['ok' => false, 'error' => 'Your rank cannot change the rules.'], 403);
        $in = json_decode((string)($_POST['rules'] ?? ''), true);
        $aud = ($_POST['audience'] ?? '') === 'staff' ? 'staff' : 'member';
        $g = digits($_POST['scope'] ?? '');
        if (!is_array($in) || count($in) > 60) json_out(['ok' => false, 'error' => 'Could not read the rules. Refresh the page and try again.'], 400);
         
        $offset = $g === '' ? 0 : (int)one("SELECT COUNT(*) AS n FROM rules WHERE audience=? AND guild_id=''", [$aud])['n'];
        $clean = []; $bad = [];
        foreach (array_values($in) as $i => $r) {
            if (!is_array($r)) continue;
            $row = ['title' => str($r['title'] ?? '', 100), 'body' => str($r['body'] ?? '', 1500), 'punishment' => punish_text(array_map('strval', (array)($r['punishment'] ?? []))),
                'guild_id' => $g, 'num' => $offset + $i + 1, 'audience' => $aud];
            if ($row['title'] === '' || $row['body'] === '' || $row['punishment'] === '') $bad[] = 'rule ' . ($i + 1) . ($row['title'] !== '' ? ' (' . $row['title'] . ')' : '');
            $clean[] = [(int)($r['id'] ?? 0), $row];
        }
        if ($bad) json_out(['ok' => false, 'error' => 'Every rule needs a title, its text and at least one punishment. Check ' . implode(', ', $bad) . '.'], 422);
         
        $visible = array_map('intval', array_column(all('SELECT id FROM rules WHERE audience=? AND guild_id=?', [$aud, $g]), 'id'));
        $keep = [];
        foreach ($clean as [$id, $row]) {
            if ($id && in_array($id, $visible, true)) { update('rules', $id, $row); $keep[] = $id; }
            else $keep[] = (int)insert('rules', $row);
        }
        foreach (array_diff($visible, $keep) as $gone) q('DELETE FROM rules WHERE id=?', [$gone]);
        if ($g === '') {    
            $n = count($clean); $by = [];
            foreach (all("SELECT id,guild_id FROM rules WHERE audience=? AND guild_id<>'' ORDER BY guild_id,num,id", [$aud]) as $r) $by[$r['guild_id']][] = (int)$r['id'];
            foreach ($by as $ids) foreach ($ids as $k => $rid) q('UPDATE rules SET num=? WHERE id=?', [$n + $k + 1, $rid]);
        }
        audit($who, 'rules.save', count($clean) . ' ' . $aud . ' rule' . (count($clean) === 1 ? '' : 's') . ' for ' . ($g !== '' ? guild_label($g) : 'every server'));
        json_out(['ok' => true, 'rules' => $builderRules()]);
    }
    if ($post && $act === 'send') {
        $gid = digits($_POST['guild_id'] ?? ''); $cid = digits($_POST['channel_id'] ?? '');
        $raw = json_decode((string)($_POST['payload'] ?? ''), true);
        if (!in_array($gid, array_column($guilds, 'guild_id'), true)) redirect(url('builder') . '?m=Pick+a+server+the+Axio+Community+Bot+is+in');
        if (!one('SELECT 1 AS x FROM bot_channels WHERE guild_id=? AND channel_id=?', [$gid, $cid])) redirect(url('builder') . '?m=Pick+a+channel');
        $msg = is_array($raw) ? clean_message($raw) : null;
        if (!$msg || ($msg['content'] === '' && !$msg['embeds'])) redirect(url('builder') . '?m=The+message+is+empty');
        if (message_chars($msg) > 6000) redirect(url('builder') . '?m=Discord+allows+at+most+6000+characters+across+all+embeds');
        $known = array_column(server_role_list($gid), 'role_id');
        if ($known) foreach ($msg['reactions'] ?? [] as $rr) if (!in_array($rr['role_id'], $known, true)) redirect(url('builder') . '?m=A+reaction+role+is+not+a+role+in+that+server.+Pick+it+again');
        $filled = fn($e) => trim((string)($e['title'] ?? '')) !== '' || trim((string)($e['description'] ?? '')) !== '';
        if (($_POST['kind'] ?? '') === 'rules' && (count($msg['embeds']) < 3 || !$filled($msg['embeds'][0]) || !$filled(end($msg['embeds'])))) redirect(url('builder') . '?m=A+rules+post+needs+a+beginning+embed,+the+rules,+and+an+ending+embed');
        $id = insert('custom_messages', ['guild_id' => $gid, 'channel_id' => $cid, 'payload' => json_encode($msg, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 'created_by' => $who, 'created_at' => now()]);
        audit($who, 'message.send', '#' . $id . ' to ' . guild_label($gid) . ' #' . (one('SELECT name FROM bot_channels WHERE guild_id=? AND channel_id=?', [$gid, $cid])['name'] ?? $cid));
        redirect(url('builder') . '?m=Queued.+The+Axio+Community+Bot+posts+it+within+about+30+seconds');
    }
    if ($post) redirect(url('builder'));
    $channels = [];
    foreach (all('SELECT guild_id,channel_id,name,category FROM bot_channels ORDER BY guild_id,position,name') as $ch) $channels[$ch['guild_id']][] = ['id' => $ch['channel_id'], 'name' => $ch['name'], 'category' => $ch['category']];
    $load = ctype_digit($sub) && $sub !== '' ? one('SELECT payload,guild_id,channel_id FROM custom_messages WHERE id=?', [(int)$sub]) : null;
    $boot = ['guilds' => array_map(fn($g) => ['id' => $g['guild_id'], 'name' => $g['name']], $guilds), 'channels' => $channels,
        'load' => $load ? ['message' => json_decode($load['payload'], true), 'guild_id' => $load['guild_id'], 'channel_id' => $load['channel_id']] : null,
        'bot' => ['name' => 'Axio Community Bot', 'avatar' => '/assets/brand/bots/community.png'],
        'roles' => (function () use ($guilds) { $o = []; foreach ($guilds as $g) $o[(string)$g['guild_id']] = array_map(fn($r) => ['id' => (string)$r['role_id'], 'name' => (string)$r['name'], 'color' => (int)$r['color']], array_values(array_filter(server_role_list((string)$g['guild_id']), fn($r) => divider_label((string)$r['name']) === null))); return $o; })(),
        'rules' => $builderRules(), 'ladder' => PUNISH_LADDER, 'canRules' => allowed('rules', $me), 'canBotcfg' => allowed('botcfg', $me), 'rulesChannels' => (function () use ($guilds) { $o = []; foreach ($guilds as $g) { $cfg = bcfg_all((string)$g['guild_id']); $o[(string)$g['guild_id']] = ['member' => (string)($cfg['rules.channel'] ?? ''), 'staff' => (string)($cfg['rules.staff_channel'] ?? '')]; } return $o; })(), 'openRules' => in_array($_GET['rules'] ?? '', ['member', 'staff'], true) ? $_GET['rules'] : ''];
    $rows = [];
    foreach (all('SELECT m.*, c.name AS channel_name FROM custom_messages m LEFT JOIN bot_channels c ON c.guild_id=m.guild_id AND c.channel_id=m.channel_id ORDER BY m.id DESC LIMIT 25') as $r) {
        $where = h(guild_label($r['guild_id'])) . '<br><small>#' . h($r['channel_name'] ?? $r['channel_id']) . '</small>';
        $state = ['queued' => badge('waiting'), 'sent' => '<span class="pb pb--ok">sent</span>', 'failed' => '<span class="pb pb--bad">failed</span>'][$r['status']] ?? badge($r['status']);
        $link = $r['message_id'] ? '<a href="https://discord.com/channels/' . h($r['guild_id']) . '/' . h($r['channel_id']) . '/' . h($r['message_id']) . '" target="_blank" rel="noopener">Open in Discord</a>' . ($r['error'] ? '<br><small>' . h($r['error']) . '</small>' : '') : ($r['error'] ? '<small>' . h($r['error']) . '</small>' : '-');
        $rows[] = ['#' . (int)$r['id'], $where, $state, $link, h($r['created_by']), ago($r['created_at']), '<a href="' . url('builder/' . $r['id']) . '">Load</a>'];
    }
    $note = $guilds ? '' : '<p class="pnl__flash">The Axio Community Bot has not reported any servers yet. Start it with the latest files and the server list appears here within a minute.</p>';
    layout('Message builder', '<div class="pnl__card"><h1>Message builder</h1><p>Write a message with embeds, see exactly how it will look, and the Axio Community Bot posts it in the channel you pick. You can also paste a Discohook link or JSON to import a message, or open yours in Discohook. Pick <b>Rules post</b> to write the member or staff rules (each with its punishments) right here: they are saved for /rule and the Helper Bot, and posted with a beginning and ending message.</p>' . $note .
        '<div id="mb" class="mb"></div><script type="application/json" id="mb-boot">' . json_encode($boot, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES) . '</script>' .
        '<form method="post" id="mb-form" hidden>' . csrf_input($c) . '<input type="hidden" name="_do" value="send"><input type="hidden" name="guild_id"><input type="hidden" name="channel_id"><input type="hidden" name="payload"><input type="hidden" name="kind"></form>' .
        '<h2>Recent messages</h2>' . table(['#', 'Where', 'Status', 'Result', 'By', 'Queued', ''], $rows) . '</div><script src="/assets/builder.js?v=11" defer></script>', $c, $page);

case 'suggestions':
    if ($post && $act === 'delete') {
        $id = (int)($_POST['id'] ?? 0); $s = one('SELECT id,message_id FROM suggestions WHERE id=?', [$id]);
        if ($s) {
             
            if ((string)$s['message_id'] !== '') q("UPDATE suggestions SET status='deleted', notified=0 WHERE id=?", [$id]); else q('DELETE FROM suggestions WHERE id=?', [$id]);
            audit($who, 'suggestion.delete', '#' . $id);
        }
        redirect(url('suggestions') . '?m=Deleted.+The+Axio+Community+Bot+removes+the+Discord+message+within+about+30+seconds');
    }
    if ($post && $act === 'decide') {
        $id = (int)($_POST['id'] ?? 0); $st = in_array($_POST['status'] ?? '', ['open', 'approved', 'considering', 'denied'], true) ? $_POST['status'] : 'open';
        if (one('SELECT id FROM suggestions WHERE id=?', [$id])) { q('UPDATE suggestions SET status=?, staff_note=?, decided_by=?, notified=0 WHERE id=?', [$st, field('note', 500), $who, $id]); audit($who, 'suggestion.' . $st, '#' . $id); }
        redirect(url('suggestions') . '?m=Saved.+The+community+bot+will+update+the+Discord+message');
    }
    $rows = [];
    foreach (all("SELECT * FROM suggestions WHERE status<>'deleted' ORDER BY id DESC LIMIT 200") as $s) {
        $f = '<form method="post" class="pnl__inline">' . csrf_input($c) . '<input type="hidden" name="_do" value="decide"><input type="hidden" name="id" value="' . $s['id'] . '"><select name="status">' . opts(['open', 'considering', 'approved', 'denied'], $s['status']) . '</select><input name="note" maxlength="500" placeholder="Note (optional)" value="' . h($s['staff_note'] ?? '') . '"><button class="btn btn--ghost btn--sm">Save</button></form>';
        $del = '<form method="post" onsubmit="return confirm(\'Delete suggestion #' . (int)$s['id'] . '? It is removed from the panel and its message in Discord is deleted.\')">' . csrf_input($c) . '<input type="hidden" name="_do" value="delete"><input type="hidden" name="id" value="' . $s['id'] . '"><button class="btn btn--ghost btn--sm pnl__danger">Delete</button></form>';
        $rows[] = ['#' . $s['id'], h(guild_label($s['guild_id'])), h($s['user_name']), nl($s['text']), badge($s['status']), $f, ago($s['created_at']), $del];
    }
    layout('Suggestions', '<div class="pnl__card"><h1>Suggestions</h1><p>Sent with /suggest in Discord. Changing a status updates the embed in Discord through the Axio Community Bot. Delete removes a suggestion from the panel and deletes its message in Discord.</p>' . table(['#', 'Server', 'From', 'Suggestion', 'Status', 'Decision', 'Date', ''], $rows) . '</div>', $c, $page);

case 'welcome':
     
    $servers = known_servers();
    $gsel = digits($_GET['g'] ?? ($_POST['g'] ?? ''));
    $home = (string)setting('home_guild_id');
    if ($gsel === '' || !isset($servers[$gsel])) $gsel = $servers ? ($home !== '' && isset($servers[$home]) ? $home : (string)array_key_first($servers)) : '';
    $keys = ['welcome.content' => 2000, 'welcome.title' => 256, 'welcome.text' => 2000, 'welcome.footer' => 300, 'welcome.image' => 300];
    if ($post && $act === 'save' && $gsel !== '') {
        foreach ($keys as $k => $max) bcfg_set($gsel, $k, str(str_replace("\r\n", "\n", (string)($_POST[str_replace('.', '_', $k)] ?? '')), $max));
        $img = (string)($_POST['welcome_image'] ?? '');
        if ($img !== '' && !preg_match('#^https://#i', $img)) bcfg_set($gsel, 'welcome.image', '');
        $col = (string)($_POST['welcome_color'] ?? '');
        bcfg_set($gsel, 'welcome.color', preg_match('/^#?[0-9a-f]{6}$/i', $col) ? ltrim(strtolower($col), '#') : '7c4dff');
        bcfg_set($gsel, 'welcome.thumb', isset($_POST['welcome_thumb']) ? '1' : '0');
        bcfg_set($gsel, 'welcome.enabled', isset($_POST['welcome_enabled']) ? '1' : '0');
        bcfg_set($gsel, 'welcome.channel', digits($_POST['welcome_channel'] ?? ''));
        audit($who, 'welcome.save', guild_label($gsel));
        redirect(url('welcome') . '?g=' . $gsel . '&m=Saved.+The+Axio+Verification+Bot+uses+it+within+a+minute');
    }
    $cur = $gsel !== '' ? bcfg_all($gsel) : [];
    $v = fn($k, $d = '') => h($cur[$k] ?? $d);
    $tabs = '';
    foreach ($servers as $id => $g) { $id = (string)$id; $tabs .= '<a href="' . url('welcome') . '?g=' . h($id) . '"' . ($id === $gsel ? ' class="on"' : '') . '>' . h($g['name'] ?: guild_label($id)) . '</a>'; }
    $chOpts = '<option value="">Not set (use /welcome-channel in Discord)</option>'; $have = false;
    foreach (all('SELECT channel_id,name,category FROM bot_channels WHERE guild_id=? ORDER BY position,name', [$gsel]) as $ch) {
        $sel = ($cur['welcome.channel'] ?? '') === $ch['channel_id']; $have = $have || $sel;
        $chOpts .= '<option value="' . h($ch['channel_id']) . '"' . ($sel ? ' selected' : '') . '>#' . h($ch['name']) . ($ch['category'] ? ' (' . h($ch['category']) . ')' : '') . '</option>';
    }
    if (!$have && ($cur['welcome.channel'] ?? '') !== '') $chOpts .= '<option value="' . $v('welcome.channel') . '" selected>Channel ' . $v('welcome.channel') . '</option>';
    $form = $gsel === '' ? '<p class="pnl__empty">No servers yet. They appear here once a bot has started and joined a server.</p>' :
        '<form method="post" class="pnl__form wl" id="wl-form">' . csrf_input($c) . '<input type="hidden" name="_do" value="save"><input type="hidden" name="g" value="' . h($gsel) . '">' .
        '<label class="pnl__check"><input type="checkbox" name="welcome_enabled"' . (($cur['welcome.enabled'] ?? '1') !== '0' ? ' checked' : '') . '> Welcome new members in this server</label>' .
        '<label>Welcome channel<select name="welcome_channel">' . $chOpts . '</select></label>' .
        '<label>Text above the embed <small>(optional, use {mention} to ping them)</small><input name="welcome_content" maxlength="2000" value="' . $v('welcome.content') . '" placeholder="e.g. Welcome {mention}!"></label>' .
        '<label>Title<input name="welcome_title" maxlength="256" value="' . $v('welcome.title') . '" placeholder="Welcome to {server}!"></label>' .
        '<label>Message<textarea name="welcome_text" rows="5" maxlength="2000" placeholder="Hey {mention}, welcome! You are member **#{count}**.&#10;Read the rules and verify to unlock the server.">' . $v('welcome.text') . '</textarea></label>' .
        '<div class="wl__row"><label>Colour<input type="color" name="welcome_color" value="#' . $v('welcome.color', '7c4dff') . '"></label><label class="pnl__check"><input type="checkbox" name="welcome_thumb"' . (($cur['welcome.thumb'] ?? '1') !== '0' ? ' checked' : '') . '> Show their profile picture</label></div>' .
        '<label>Large image <small>(optional, https:// link)</small><input name="welcome_image" maxlength="300" value="' . $v('welcome.image') . '" placeholder="https://"></label>' .
        '<label>Footer <small>(optional)</small><input name="welcome_footer" maxlength="300" value="' . $v('welcome.footer') . '" placeholder="e.g. axiomategames.com"></label>' .
        '<p class="pnl__hint">Placeholders: <code>{mention}</code> pings them, <code>{user}</code> their name, <code>{username}</code> their username, <code>{server}</code> the server name, <code>{count}</code> the member count. Supports **bold**, *italic* and new lines. Only the new member is pinged. Empty title or message uses the default shown in grey.</p>' .
        '<button class="btn btn--primary" type="submit"><span>Save welcome message</span></button></form>';
    $preview = $gsel === '' ? '' : '<div class="wl__preview"><p class="mb-ptitle">Preview</p><div class="dc" id="wl-preview"></div><p class="pnl__hint">Use <code>/welcome-test</code> in Discord to post it for yourself.</p></div>';
    $js = $gsel === '' ? '' : '<script>(function(){var f=document.getElementById("wl-form"),p=document.getElementById("wl-preview");if(!f||!p)return;var S=' . json_encode(['server' => $servers[$gsel]['name'] ?: guild_label($gsel), 'count' => (int)($servers[$gsel]['members'] ?? 0), 'me' => $me['username'], 'avatar' => avatar_url((string)($me['discord_id'] ?? ''), (string)($me['avatar'] ?? ''), 128)], JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES) . ';' .
        'function esc(s){return String(s).replace(/[&<>"\']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","\'":"&#39;"}[c];});}' .
        'function fill(t){return esc(t).replace(/\{mention\}/g,"<span class=\"dc-mention\">@"+esc(S.me)+"</span>").replace(/\{user\}/g,esc(S.me)).replace(/\{username\}/g,esc(S.me.toLowerCase())).replace(/\{server\}/g,esc(S.server)).replace(/\{count\}/g,S.count.toLocaleString()).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\*(.+?)\*/g,"<i>$1</i>").replace(/\n/g,"<br>");}' .
        'function val(n){return f.elements[n].value;}' .
        'function draw(){var on=f.elements.welcome_enabled.checked,t=val("welcome_title")||f.elements.welcome_title.placeholder,d=val("welcome_text")||f.elements.welcome_text.placeholder,c=val("welcome_content"),img=val("welcome_image"),ft=val("welcome_footer");' .
        'var h="<div class=\"dc-msg\"><img class=\"dc-avatar\" src=\"/assets/brand/bots/verification.png\" alt=\"\"><div class=\"dc-body\"><div class=\"dc-head\"><b>Axio Verification Bot</b><span class=\"dc-app\">APP</span><small>Today</small></div>"+(c?"<div class=\"dc-content\">"+fill(c)+"</div>":"")+"<div class=\"dc-embed\" style=\"border-left-color:"+val("welcome_color")+"\"><div class=\"dc-embed-grid\"><div class=\"dc-embed-main\"><div class=\"dc-title\">"+fill(t)+"</div><div class=\"dc-desc\">"+fill(d)+"</div>"+(/^https:\/\//i.test(img)?"<img class=\"dc-image\" src=\""+esc(img)+"\" alt=\"\">":"")+(ft?"<div class=\"dc-footer\">"+fill(ft)+"</div>":"")+"</div>"+(f.elements.welcome_thumb.checked&&S.avatar?"<img class=\"dc-thumb\" src=\""+esc(S.avatar)+"\" alt=\"\">":"")+"</div></div></div></div>";' .
        'p.innerHTML=h;p.style.opacity=on?1:.45;}f.addEventListener("input",draw);f.addEventListener("change",draw);draw();})();</script>';
    layout('Welcome message', '<div class="pnl__card"><h1>Welcome message</h1><p>The Axio Verification Bot posts this when someone joins. Each server has its own message and channel. You can also set the channel in Discord with <code>/welcome-channel</code> (or turn it off with <code>/welcome-channel off:True</code>).</p>' . ($tabs ? '<div class="pnl__filters">' . $tabs . '</div>' : '') . '<div class="wl__split">' . $form . $preview . '</div></div>' . $js, $c, $page);

case 'development':
     
    $servers = known_servers();
    $gsel = digits($_GET['g'] ?? ($_POST['g'] ?? ''));
    $home = (string)setting('home_guild_id');
    if ($gsel === '' || !isset($servers[$gsel])) $gsel = $servers ? ($home !== '' && isset($servers[$home]) ? $home : (string)array_key_first($servers)) : '';
    $isAdmin = RANK[$role] >= 2;
    if ($post && $act === 'end_break') {
        $bid = (int)($_POST['id'] ?? 0);
        q("UPDATE breaks SET status='ended', ended_by=?, ended_at=?, notified=0 WHERE id=? AND status='active'", [$who . ' (panel)', now(), $bid]);
        audit($who, 'break.end', '#' . $bid);
        redirect(url('development') . '?g=' . $gsel . '&m=Ended.+The+bot+updates+the+message+within+a+minute');
    }
    if ($post && $act === 'save' && $gsel !== '' && $isAdmin) {
        foreach (['dev.status_channel', 'dev.break_channel', 'break.channel', 'dev.role'] as $k) bcfg_set($gsel, $k, digits($_POST[str_replace('.', '_', $k)] ?? ''));
        foreach (['dev.board_title' => 256, 'dev.board_text' => 1500, 'dev.panel_title' => 256, 'dev.panel_text' => 1500, 'dev.open_label' => 40, 'dev.closed_label' => 40] as $k => $max)
            bcfg_set($gsel, $k, str(str_replace("\r\n", "\n", (string)($_POST[str_replace('.', '_', $k)] ?? '')), $max));
        $col = (string)($_POST['dev_board_color'] ?? '');
        bcfg_set($gsel, 'dev.board_color', preg_match('/^#?[0-9a-f]{6}$/i', $col) ? ltrim(strtolower($col), '#') : '2ecc71');
        audit($who, 'development.save', guild_label($gsel));
        redirect(url('development') . '?g=' . $gsel . '&m=Saved.+The+Development+Bot+uses+it+within+a+minute');
    }
    $cur = $gsel !== '' ? bcfg_all($gsel) : [];
    $v = fn($k, $d = '') => h($cur[$k] ?? $d);
    $tabs = ''; foreach ($servers as $id => $g) { $id = (string)$id; $tabs .= '<a href="' . url('development') . '?g=' . h($id) . '"' . ($id === $gsel ? ' class="on"' : '') . '>' . h($g['name'] ?: guild_label($id)) . '</a>'; }
    $chans = all('SELECT channel_id,name,category FROM bot_channels WHERE guild_id=? ORDER BY position,name', [$gsel]);
    $chSel = function (string $key) use ($chans, $cur) {
        $o = '<option value="">Not set</option>'; $has = false;
        foreach ($chans as $ch) { $sel = ($cur[$key] ?? '') === $ch['channel_id']; $has = $has || $sel; $o .= '<option value="' . h($ch['channel_id']) . '"' . ($sel ? ' selected' : '') . '>#' . h($ch['name']) . ($ch['category'] ? ' (' . h($ch['category']) . ')' : '') . '</option>'; }
        if (!$has && ($cur[$key] ?? '') !== '') $o .= '<option value="' . h($cur[$key]) . '" selected>Channel ' . h($cur[$key]) . '</option>';
        return '<select name="' . h(str_replace('.', '_', $key)) . '">' . $o . '</select>';
    };
    $roleSel = '<option value="">None (the Development divider is enough)</option>';
    foreach (server_role_list($gsel) as $r) if (divider_label((string)$r['name']) === null) $roleSel .= '<option value="' . h($r['role_id']) . '"' . (($cur['dev.role'] ?? '') === $r['role_id'] ? ' selected' : '') . '>@' . h($r['name']) . '</option>';
    $form = $gsel === '' ? '<p class="pnl__empty">No servers yet.</p>' : '<form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="save"><input type="hidden" name="g" value="' . h($gsel) . '">' .
        '<h2>Channels and who can use it</h2>' .
        '<label>Working status board channel ' . '<small>(the bot keeps one board message here)</small>' . $chSel('dev.status_channel') . '</label>' .
        '<label>Developer break requests channel' . $chSel('dev.break_channel') . '</label>' .
        '<label>Staff break requests channel <small>(Moderation Bot)</small>' . $chSel('break.channel') . '</label>' .
        '<label>Extra developer role <small>(optional. Everyone with the <b>Development</b> divider role, or a role under it like Scripters, can already use /working status and the developer /break request)</small><select name="dev_role">' . $roleSel . '</select></label>' .
        '<h2>The working status board</h2>' .
        '<label>Title<input name="dev_board_title" maxlength="256" value="' . $v('dev.board_title') . '" placeholder="Development team status"></label>' .
        '<label>Text above the list<textarea name="dev_board_text" rows="3" maxlength="1500" placeholder="Who is working right now. Developers update this with /working status.">' . $v('dev.board_text') . '</textarea></label>' .
        '<div class="wl__row"><label>Colour<input type="color" name="dev_board_color" value="#' . $v('dev.board_color', '2ecc71') . '"></label>' .
        '<label>Name for "open"<input name="dev_open_label" maxlength="40" value="' . $v('dev.open_label') . '" placeholder="Open"></label><label>Name for "not open"<input name="dev_closed_label" maxlength="40" value="' . $v('dev.closed_label') . '" placeholder="Not open"></label></div>' .
        '<h2>The /working status message</h2><p class="pnl__hint">Only the developer sees this, with the two buttons under it. Use {status} for their current status.</p>' .
        '<label>Title<input name="dev_panel_title" maxlength="256" value="' . $v('dev.panel_title') . '" placeholder="Your working status"></label>' .
        '<label>Text<textarea name="dev_panel_text" rows="3" maxlength="1500" placeholder="You are currently **{status}**. Pick Open when you are working and taking tasks, or Not open when you are away.">' . $v('dev.panel_text') . '</textarea></label>' .
        ($isAdmin ? '<button class="btn btn--primary" type="submit"><span>Save</span></button>' : '<p class="pnl__hint">Only admins can change these settings.</p>') . '</form>';
    $lab = ['open' => $cur['dev.open_label'] ?? '' ?: 'Open', 'closed' => $cur['dev.closed_label'] ?? '' ?: 'Not open', 'break' => 'On break'];
    $people = [];
    foreach (all('SELECT * FROM dev_status WHERE guild_id=? ORDER BY status, user_name', [$gsel]) as $r)
        $people[] = [h($r['user_name'] ?: $r['user_id']) . '<br><small>' . h($r['user_id']) . '</small>', badge($r['status'] === 'open' ? 'active' : ($r['status'] === 'break' ? 'waiting' : 'closed')) . ' ' . h($lab[$r['status']] ?? $r['status']), ago($r['updated_at'])];
    $brk = [];
    foreach (all('SELECT * FROM breaks WHERE guild_id=? AND (status=\'active\' OR created_at>=?) ORDER BY status=\'active\' DESC, id DESC LIMIT 100', [$gsel, plus('-30 days')]) as $r) {
        $end = $r['status'] === 'active' ? '<form method="post" class="pnl__inline" onsubmit="return confirm(\'End this break now?\')">' . csrf_input($c) . '<input type="hidden" name="_do" value="end_break"><input type="hidden" name="g" value="' . h($gsel) . '"><input type="hidden" name="id" value="' . (int)$r['id'] . '"><button class="btn btn--ghost btn--sm">End now</button></form>' : '<small>' . h($r['ended_by']) . '</small>';
        $brk[] = ['#' . (int)$r['id'], $r['kind'] === 'dev' ? 'Developer' : 'Staff', h($r['user_name'] ?: $r['user_id']), nl((string)$r['reason']), h(substr($r['starts_at'], 0, 16)) . ' to ' . h(substr($r['ends_at'], 0, 16)) . ' UTC', badge($r['status'] === 'active' ? 'active' : 'closed'), $end];
    }
    layout('Development', '<div class="pnl__card"><h1>Development</h1><p>The <b>Axio Development Bot</b> runs the working status board: developers use <code>/working status</code> and pick Open or Not open, and the board in the status channel updates. <code>/break request</code> (Development Bot for developers, Moderation Bot for staff) posts a break notice in the break channel; a developer on break shows as On break until they are back, then returns to their status from before.</p>' .
        ($tabs ? '<div class="pnl__filters">' . $tabs . '</div>' : '') . $form .
        '<h2>Working status</h2>' . table(['Developer', 'Status', 'Updated'], $people) .
        '<h2>Break requests (active and last 30 days)</h2>' . table(['#', 'Team', 'Who', 'Reason', 'When', 'Status', ''], $brk) . '</div>', $c, $page);

case 'msglog':
     
    if (ctype_digit((string)($_GET['img'] ?? ''))) {
        $im = one('SELECT mime,data,name FROM msg_images WHERE id=?', [(int)$_GET['img']]);
        if (!$im || !in_array($im['mime'], ['image/png', 'image/jpeg', 'image/gif', 'image/webp'], true)) { http_response_code(404); exit('Not found'); }
        header('Content-Type: ' . $im['mime']); header('Cache-Control: private, max-age=86400'); header('X-Content-Type-Options: nosniff');
        header('Content-Disposition: inline; filename="' . preg_replace('/[^A-Za-z0-9._-]/', '_', (string)$im['name']) . '"');
        echo base64_decode((string)$im['data']); exit;
    }
    if ($post && $act === 'settings' && RANK[$role] >= 2) {
        set_setting('msglog_days', (string)max(0, min(3650, (int)($_POST['days'] ?? 0))));
        foreach (known_servers() as $id => $g) {
            $id = (string)$id; bcfg_set($id, 'msglog.off', isset($_POST['on'][$id]) ? '0' : '1');
            bcfg_set($id, 'msglog.ignore', implode(',', array_filter(array_map('digits', explode(',', (string)($_POST['ignore'][$id] ?? ''))))));
        }
        audit($who, 'msglog.settings', (int)($_POST['days'] ?? 0) > 0 ? 'keep ' . (int)$_POST['days'] . ' days' : 'keep forever');
        redirect(url('msglog') . '?m=Saved.+The+Community+Bot+uses+it+within+a+minute');
    }
    $f = ['g' => digits($_GET['g'] ?? ''), 'user' => trim((string)($_GET['user'] ?? '')), 'mid' => digits($_GET['mid'] ?? ''), 'ch' => digits($_GET['ch'] ?? ''), 'q' => trim((string)($_GET['q'] ?? '')), 'type' => (string)($_GET['type'] ?? '')];
    $where = []; $args = [];
    if ($f['g'] !== '') { $where[] = 'guild_id=?'; $args[] = $f['g']; }
    if ($f['user'] !== '') { if (ctype_digit($f['user'])) { $where[] = 'author_id=?'; $args[] = $f['user']; } else { $where[] = 'author_name LIKE ?'; $args[] = '%' . $f['user'] . '%'; } }
    if ($f['mid'] !== '') { $where[] = 'message_id=?'; $args[] = $f['mid']; }
    if ($f['ch'] !== '') { $where[] = 'channel_id=?'; $args[] = $f['ch']; }
    if ($f['q'] !== '') { $where[] = 'content LIKE ?'; $args[] = '%' . $f['q'] . '%'; }
    $types = ['' => 'Everything', 'deleted' => 'Deleted', 'edited' => 'Edited', 'image' => 'With images', 'link' => 'With links', 'file' => 'With files'];
    if (in_array($f['type'], ['deleted', 'edited'], true)) { $where[] = 'status=?'; $args[] = $f['type']; }
    if ($f['type'] === 'image') $where[] = 'has_image=1';
    if ($f['type'] === 'link') $where[] = 'has_link=1';
    if ($f['type'] === 'file') $where[] = 'has_file=1';
    $pg = max(1, (int)($_GET['p'] ?? 1)); $per = 50;
    $sqlWhere = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $total = (int)one('SELECT COUNT(*) AS n FROM msg_log' . $sqlWhere, $args)['n'];
    $rows = all('SELECT * FROM msg_log' . $sqlWhere . ' ORDER BY id DESC LIMIT ' . $per . ' OFFSET ' . (($pg - 1) * $per), $args);
    $ids = array_column($rows, 'message_id');
    $imgs = []; $edits = [];
    if ($ids) {
        $in = implode(',', array_fill(0, count($ids), '?'));
        foreach (all("SELECT id,message_id,attachment_id,name,size FROM msg_images WHERE message_id IN ($in) ORDER BY id", $ids) as $r) $imgs[$r['message_id']][$r['attachment_id']] = $r;
        foreach (all("SELECT * FROM msg_edits WHERE message_id IN ($in) ORDER BY id", $ids) as $r) $edits[$r['message_id']][] = $r;
    }
    $q = fn(array $over) => url('msglog') . '?' . http_build_query(array_filter(array_merge($f, $over), fn($x) => $x !== '' && $x !== null));
    $linkify = function (string $text) use ($q) {
        $h = nl2br(h($text));
        $h = preg_replace_callback('#\bhttps?://[^\s<>"\']+#i', fn($m) => '<a href="' . $m[0] . '" target="_blank" rel="noopener noreferrer nofollow" class="ml__link">' . $m[0] . '</a>', $h);
        return preg_replace_callback('/&lt;@!?(\d{15,25})&gt;/', fn($m) => '<a href="' . h($q(['user' => $m[1], 'p' => ''])) . '" class="ml__mention">@' . $m[1] . '</a>', $h);
    };
    $kb = fn($n) => $n >= 1048576 ? round($n / 1048576, 1) . ' MB' : max(1, (int)round($n / 1024)) . ' KB';
    $cards = '';
    foreach ($rows as $r) {
        $st = $r['status'];
        $badge = $st === 'deleted' ? '<span class="pb pb--bad">deleted ' . h(substr((string)$r['deleted_at'], 0, 16)) . '</span>' : ($st === 'edited' ? '<span class="pb pb--warn">edited</span>' : '<span class="pb pb--ok">sent</span>');
        $body = (string)$r['content'] !== '' ? '<div class="ml__text">' . $linkify((string)$r['content']) . '</div>' : '';
        $att = '';
        foreach (json_decode((string)$r['attachments'], true) ?: [] as $a) {
            $copy = $imgs[$r['message_id']][$a['id']] ?? null;
            if (!empty($a['image']) && $copy) $att .= '<a class="ml__img" href="' . url('msglog') . '?img=' . (int)$copy['id'] . '" target="_blank" rel="noopener"><img src="' . url('msglog') . '?img=' . (int)$copy['id'] . '" alt="' . h($a['name']) . '" loading="lazy"></a>';
            else $att .= '<div class="ml__file">' . (!empty($a['image']) ? 'Image' : 'File') . ': <a href="' . h($a['url']) . '" target="_blank" rel="noopener noreferrer nofollow">' . h($a['name']) . '</a> <small>' . h($kb((int)$a['size'])) . (!empty($a['image']) ? ' · no copy kept (too big or still uploading); the Discord link stops working after a delete' : ' · Discord link, stops working after a delete') . '</small></div>';
        }
        $links = json_decode((string)$r['links'], true) ?: [];
        $linkList = $links ? '<div class="ml__links">Links: ' . implode(' ', array_map(fn($u) => '<a href="' . h($u) . '" target="_blank" rel="noopener noreferrer nofollow">' . h(mb_strimwidth($u, 0, 70, '…')) . '</a>', $links)) . '</div>' : '';
        $hist = '';
        foreach ($edits[$r['message_id']] ?? [] as $ed) $hist .= '<li><small>' . h(substr($ed['at'], 0, 16)) . ' UTC</small><div class="ml__before"><b>Before</b> ' . $linkify((string)$ed['before_content']) . '</div><div class="ml__after"><b>After</b> ' . $linkify((string)$ed['after_content']) . '</div></li>';
        $hist = $hist ? '<details class="ml__hist"><summary>Edit history (' . count($edits[$r['message_id']]) . ')</summary><ol>' . $hist . '</ol></details>' : '';
        $jump = 'https://discord.com/channels/' . h($r['guild_id']) . '/' . h($r['channel_id']) . '/' . h($r['message_id']);
        $av = (string)$r['author_avatar'] !== '' ? '<img class="ml__av" src="' . h($r['author_avatar']) . '" alt="" loading="lazy">' : '<span class="ml__av"></span>';
        $cards .= '<article class="ml__msg ml__msg--' . h($st) . '">' . $av . '<div class="ml__main"><div class="ml__head"><a href="' . h($q(['user' => $r['author_id'], 'p' => ''])) . '"><b>' . h($r['author_name'] ?: 'Unknown') . '</b></a> <small>' . h($r['author_id']) . ($r['is_bot'] ? ' · bot' : '') . '</small> ' . $badge .
            '<span class="ml__meta"><a href="' . h($q(['ch' => $r['channel_id'], 'p' => ''])) . '">#' . h($r['channel_name'] ?: $r['channel_id']) . '</a> · ' . h(guild_label($r['guild_id'])) . ' · ' . h(substr($r['created_at'], 0, 16)) . ' UTC · <a href="' . h($q(['mid' => $r['message_id'], 'p' => ''])) . '">' . h($r['message_id']) . '</a> · <a href="' . $jump . '" target="_blank" rel="noopener">Open in Discord</a></span></div>' .
            ($r['reply_to'] ? '<div class="ml__reply">Reply to <a href="' . h($q(['mid' => $r['reply_to'], 'p' => ''])) . '">' . h($r['reply_to']) . '</a></div>' : '') . $body . ($att ? '<div class="ml__atts">' . $att . '</div>' : '') . $linkList . $hist . '</div></article>';
    }
    $srv = '<option value="">All servers</option>'; foreach (known_servers() as $id => $g) { $id = (string)$id; $srv .= '<option value="' . h($id) . '"' . ($f['g'] === $id ? ' selected' : '') . '>' . h($g['name'] ?: guild_label($id)) . '</option>'; }
    $typeOpts = ''; foreach ($types as $k => $label) $typeOpts .= '<option value="' . h($k) . '"' . ($f['type'] === $k ? ' selected' : '') . '>' . h($label) . '</option>';
    $search = '<form method="get" class="ml__search"><label>Server<select name="g">' . $srv . '</select></label><label>User ID or name<input name="user" value="' . h($f['user']) . '" placeholder="e.g. 380353557578383361"></label>' .
        '<label>Message ID<input name="mid" value="' . h($f['mid']) . '" inputmode="numeric"></label><label>Text contains<input name="q" value="' . h($f['q']) . '"></label><label>Show<select name="type">' . $typeOpts . '</select></label>' .
        ($f['ch'] !== '' ? '<input type="hidden" name="ch" value="' . h($f['ch']) . '">' : '') . '<button class="btn btn--primary btn--sm" type="submit"><span>Search</span></button>' . (array_filter($f) ? '<a class="btn btn--ghost btn--sm" href="' . url('msglog') . '">Clear</a>' : '') . '</form>';
    $pages = (int)ceil($total / $per);
    $nav = $pages > 1 ? '<div class="pnl__filters">' . ($pg > 1 ? '<a href="' . h($q(['p' => $pg - 1])) . '">Newer</a>' : '') . '<a class="on">Page ' . $pg . ' of ' . $pages . '</a>' . ($pg < $pages ? '<a href="' . h($q(['p' => $pg + 1])) . '">Older</a>' : '') . '</div>' : '';
    $setForm = '';
    if (RANK[$role] >= 2) {
        $use = one('SELECT COUNT(*) AS n, COALESCE(SUM(size),0) AS b FROM msg_images');
        $usage = 'Stored now: ' . number_format((int)one('SELECT COUNT(*) AS n FROM msg_log')['n']) . ' messages and ' . number_format((int)$use['n']) . ' images (' . round(((int)$use['b'] * 1.34) / 1048576, 1) . ' MB of images).';
        $on = ''; foreach (known_servers() as $id => $g) { $id = (string)$id; $cfgS = bcfg_all($id); $on .= '<div class="ml__srv"><label class="pnl__check"><input type="checkbox" name="on[' . h($id) . ']"' . (($cfgS['msglog.off'] ?? '0') !== '1' ? ' checked' : '') . '> ' . h($g['name'] ?: guild_label($id)) . '</label><input name="ignore[' . h($id) . ']" value="' . h($cfgS['msglog.ignore'] ?? '') . '" placeholder="Ignored channel IDs, comma separated (optional)"></div>'; }
        $setForm = '<details class="ml__settings"><summary>Message log settings</summary><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="settings">' .
            '<label>Keep messages for (days, 0 = forever)<input type="number" name="days" min="0" max="3650" value="' . h(setting('msglog_days') ?: '0') . '"></label><p class="pnl__hint">Forever keeps every message, edit, link and image. Set a number of days only if the database gets too big; older entries and their images are then removed automatically. ' . $usage . '</p>' .
            '<fieldset class="pnl__ladder"><legend>Log messages in (tick a server; add channels to skip, like a staff-only channel)</legend>' . $on . '</fieldset>' .
            '<button class="btn btn--primary btn--sm" type="submit"><span>Save settings</span></button></form></details>';
    }
    layout('Message log', '<div class="pnl__card"><h1>Message log</h1><p>Every message the <b>Axio Community Bot</b> sees: sent, edited (with the text before and after) and deleted. Images are copied when they are sent, so you can still see them after a delete. Click a name, channel or message ID to see all of theirs. ' . ((int)(setting('msglog_days') ?: 0) > 0 ? 'Messages are kept for ' . (int)setting('msglog_days') . ' days.' : 'Everything is kept forever.') . '</p>' .
        $search . '<p class="pnl__hint">' . number_format($total) . ' message' . ($total === 1 ? '' : 's') . ($f['ch'] !== '' ? ' in this channel' : '') . '</p>' . ($cards ?: '<p class="pnl__empty">No messages found.</p>') . $nav . $setForm . '</div>', $c, $page);

case 'perks':
     
    $roleGuild = main_guild();
    $roleList = array_values(array_filter(server_role_list($roleGuild), fn($r) => divider_label((string)$r['name']) === null));
    $roleName = array_column($roleList, 'name', 'role_id');
    $hrs = function ($v, string $what) {
        $v = trim(str_replace(',', '.', (string)$v));
        if ($v !== '' && (!is_numeric($v) || (float)$v < 0 || (float)$v > 720)) redirect(url('perks') . '?m=' . urlencode($what . ' must be a number of hours from 0 to 720, or empty.'));
        return $v === '' ? '' : rtrim(rtrim(number_format((float)$v, 2, '.', ''), '0'), '.');
    };
    if ($post && $act === 'save') {
        set_setting('perk_market_h', $hrs($_POST['def_market'] ?? '', 'The marketplace cooldown for everyone'));
        set_setting('perk_repost_h', $hrs($_POST['def_repost'] ?? '', 'The repost cooldown for everyone'));
        $rules = []; $seen = [];
        foreach ((array)($_POST['role'] ?? []) as $n => $rid) {
            $rid = digits($rid);
            if ($rid === '' || isset($seen[$rid]) || isset($_POST['remove'][$n])) continue;
            $seen[$rid] = true;
            $rules[] = ['role_id' => $rid, 'name' => (string)($roleName[$rid] ?? str($_POST['name'][$n] ?? '', 100)), 'market' => $hrs($_POST['market'][$n] ?? '', 'A marketplace cooldown'),
                'repost' => $hrs($_POST['repost'][$n] ?? '', 'A repost cooldown'), 'priority' => max(0, min(3, (int)($_POST['priority'][$n] ?? 0)))];
        }
        set_setting('role_perks', json_encode($rules, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        audit($who, 'perks.save', count($rules) . ' roles');
        redirect(url('perks') . '?m=Saved.+The+bots+use+it+right+away');
    }
    if ($post && $act === 'from-tiers') {
         
        $rules = role_perk_rules(); $have = array_column($rules, 'role_id'); $added = 0;
        foreach (sub_tiers() as $t) {
            $rid = digits(setting('sub_role_' . $t['key']) ?? '');
            if ($rid === '' || in_array($rid, $have, true)) continue;
            $rules[] = ['role_id' => $rid, 'name' => (string)($roleName[$rid] ?? $t['name'])] + PERK_TIER_PRESETS[$t['key']]; $have[] = $rid; $added++;
        }
        set_setting('role_perks', json_encode($rules, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        redirect(url('perks') . '?m=' . ($added ? 'Added+' . $added . '+tier+role' . ($added === 1 ? '' : 's') . '.+Check+the+numbers+and+press+Save' : 'Nothing+to+add:+pick+a+Discord+role+for+each+tier+on+the+Subscriptions+page+first'));
    }
    $rules = role_perk_rules();
    $roleSel = function (string $n, string $sel, string $selName) use ($roleList) {
        $o = '<option value="">Pick a role</option>'; $found = false;
        foreach ($roleList as $r) { $on = $r['role_id'] === $sel; $found = $found || $on; $o .= '<option value="' . h($r['role_id']) . '"' . ($on ? ' selected' : '') . '>@' . h($r['name']) . '</option>'; }
        if ($sel !== '' && !$found) $o .= '<option value="' . h($sel) . '" selected>@' . h($selName ?: $sel) . ' (not found in the server)</option>';
        return '<select name="role[' . $n . ']" aria-label="Role">' . $o . '</select><input type="hidden" name="name[' . $n . ']" value="' . h($selName) . '">';
    };
    $prioSel = function (string $n, int $sel) { $o = ''; foreach (PERK_PRIORITY as $v => $l) $o .= '<option value="' . $v . '"' . ($v === $sel ? ' selected' : '') . '>' . h($l) . '</option>'; return '<select name="priority[' . $n . ']" aria-label="Ticket priority">' . $o . '</select>'; };
    $num = fn(string $field, string $n, string $v, string $ph) => '<input name="' . $field . '[' . $n . ']" inputmode="decimal" value="' . h($v) . '" placeholder="' . h($ph) . '" aria-label="Hours" style="max-width:6rem">';
    $d = perk_defaults();
    $defMarket = setting('perk_market_h') === null ? '10' : (string)setting('perk_market_h');
    $prows = [];
    foreach (array_merge($rules, array_fill(0, 3, [])) as $n => $r) {
        $n = (string)$n; $isNew = !$r;
        $prows[] = [$roleSel($n, (string)($r['role_id'] ?? ''), (string)($r['name'] ?? '')), $num('market', $n, (string)($r['market'] ?? ''), 'default'), $num('repost', $n, (string)($r['repost'] ?? ''), 'default'),
            $prioSel($n, (int)($r['priority'] ?? 0)), $isNew ? '' : '<input type="checkbox" name="remove[' . $n . ']" aria-label="Remove this role">'];
    }
    $tierRoles = array_filter(array_map(fn($t) => digits(setting('sub_role_' . $t['key']) ?? ''), sub_tiers()));
    layout('Role perks', '<div class="pnl__card"><h1>Role perks</h1><p>Settings by the roles members have in <b>' . h($roleGuild !== '' ? guild_label($roleGuild) : 'the main server') . '</b> (Bot settings: Main server). ' .
        'When a member has several of these roles, they get the best of each: the shortest cooldowns and the highest ticket priority. The Discord roles from <a href="' . url('subscriptions') . '">Subscriptions</a> work here like any other role, and so do roles you give by hand.</p>' .
        '<form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="save">' .
        '<h2>Everyone</h2><div class="wl__row"><label>Marketplace cooldown (hours) <small>(time between /post posts; empty or 0 = no wait)</small><input name="def_market" inputmode="decimal" value="' . h($defMarket) . '"></label>' .
        '<label>Repost cooldown (hours) <small>(empty = only the roles below can use /repost)</small><input name="def_repost" inputmode="decimal" value="' . h((string)setting('perk_repost_h')) . '" placeholder="not allowed"></label></div>' .
        '<h2>By role</h2><p class="pnl__hint">Post wait and repost wait are in hours; empty keeps the setting for everyone. /repost posts an approved marketplace post in the marketplace channel again and moves it to the top of the website\'s Marketplace. Tickets with a higher priority are listed first on the Tickets page and marked in the staff notice.</p>' .
        table(['Role', 'Post wait (h)', 'Repost wait (h)', 'Ticket priority', 'Remove'], $prows) .
        '<p class="pnl__hint">Now: everyone waits ' . h(hours_text($d['market'])) . ' between posts' . ($d['repost'] === null ? ' and cannot repost.' : ' and can repost every ' . h(hours_text($d['repost'])) . '.') . ' Save to add more empty rows.</p>' .
        '<button class="btn btn--primary" type="submit"><span>Save</span></button></form>' .
        '<form method="post" class="pnl__inline">' . csrf_input($c) . '<input type="hidden" name="_do" value="from-tiers"><button class="btn btn--ghost" type="submit"' . ($tierRoles ? '' : ' disabled title="Pick a Discord role for each tier on the Subscriptions page first"') . '>Fill from subscription tiers</button> <small>adds the tier roles with their benefits (Basic 5 h, Bronze 4 h, Silver 2 h, Gold 1 h)</small></form>' .
        (!$roleList ? '<p class="pnl__empty">No roles found for this server yet. The bot reports them when it starts.</p>' : '') . '</div>', $c, $page);

case 'subscriptions':
     
    if ($post && $act === 'save') {
        $data = [];
        foreach (SUB_DEFAULTS as $d) {
            $k = $d['key'];
            $price = preg_replace('/[^0-9.]/', '', (string)($_POST['price'][$k] ?? ''));
            $data[$k] = ['name' => str($_POST['name'][$k] ?? '', 40) ?: $d['name'], 'price' => $price !== '' ? number_format((float)$price, 2, '.', '') : $d['price'],
                'benefits' => array_slice(array_values(array_filter(array_map(fn($x) => str($x, 140), preg_split('/\R/', (string)($_POST['benefits'][$k] ?? '')) ?: []))), 0, 20),
                'popular' => isset($_POST['popular']) && $_POST['popular'] === $k, 'visible' => isset($_POST['visible'][$k])];
        }
        set_setting('sub_tiers', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        set_setting('sub_intro', str($_POST['intro'] ?? '', 600));
         
        $sk = trim((string)($_POST['stripe_secret'] ?? '')); $wh = trim((string)($_POST['stripe_webhook'] ?? ''));
        if ($sk !== '' && !preg_match('/^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/', $sk)) redirect(url('subscriptions') . '?m=The+Stripe+secret+key+starts+with+sk_live_+or+sk_test_');
        if ($wh !== '' && !preg_match('/^whsec_[A-Za-z0-9]{10,}$/', $wh)) redirect(url('subscriptions') . '?m=The+webhook+signing+secret+starts+with+whsec_');
        if ($sk !== '') set_setting('stripe_secret', enc($sk));
        if ($wh !== '') set_setting('stripe_webhook', enc($wh));
        if (isset($_POST['stripe_clear'])) { set_setting('stripe_secret', ''); set_setting('stripe_webhook', ''); }
        foreach (SUB_DEFAULTS as $d) {
            $pr = trim((string)($_POST['stripe_price'][$d['key']] ?? ''));
            if ($pr !== '' && !preg_match('/^price_[A-Za-z0-9]{6,}$/', $pr)) redirect(url('subscriptions') . '?m=Stripe+price+IDs+start+with+price_');
            set_setting('stripe_price_' . $d['key'], $pr);
            set_setting('sub_role_' . $d['key'], digits($_POST['sub_role'][$d['key']] ?? ''));
        }
        set_setting('sub_currency', in_array($_POST['currency'] ?? '', ['USD', 'EUR', 'GBP', 'CAD', 'AUD'], true) ? $_POST['currency'] : 'USD');
        audit($who, 'subscriptions.save', '');
        redirect(url('subscriptions') . '?m=Saved.+The+Subscriptions+page+shows+it+within+a+minute');
    }
    if ($post && in_array($act, ['trial-give', 'trial-end'], true)) {
        $did = digits($_POST['discord_id'] ?? '');
        if ($did === '') redirect(url('subscriptions') . '?m=Enter+the+member\'s+Discord+user+ID');
        if ($act === 'trial-end') { end_trial($did, $who); redirect(url('subscriptions') . '?m=Free+trial+ended.+The+bot+removes+the+role+within+2+minutes'); }
        try { give_trial($did, (string)($_POST['tier'] ?? ''), (int)($_POST['days'] ?? 7), $who); } catch (InvalidArgumentException $e) { redirect(url('subscriptions') . '?m=' . urlencode($e->getMessage())); }
        redirect(url('subscriptions') . '?m=Free+trial+given.+The+bot+gives+the+role+within+2+minutes');
    }
    expire_trials();
    $roleGuild = (string)(setting('main_guild_id') ?: setting('home_guild_id'));
    $roleList = array_values(array_filter(server_role_list($roleGuild), fn($r) => divider_label((string)$r['name']) === null));
    $roleOpts = function (string $sel) use ($roleList) { $o = '<option value="">No role</option>'; foreach ($roleList as $r) $o .= '<option value="' . h($r['role_id']) . '"' . ($r['role_id'] === $sel ? ' selected' : '') . '>@' . h($r['name']) . '</option>'; return $o; };
    $cards = '';
    foreach (sub_tiers() as $t) {
        $k = h($t['key']);
        $cards .= '<fieldset class="subtier" style="--tier:' . h($t['color']) . '"><legend>' . h($t['name']) . '</legend>' .
            '<div class="wl__row"><label>Name<input name="name[' . $k . ']" maxlength="40" value="' . h($t['name']) . '"></label><label>Price per month<input name="price[' . $k . ']" inputmode="decimal" value="' . h($t['price']) . '"></label></div>' .
            '<label>Benefits <small>(one per line)</small><textarea name="benefits[' . $k . ']" rows="5" placeholder="e.g. Supporter role in Discord&#10;Early access to new games">' . h(implode("\n", $t['benefits'])) . '</textarea></label>' .
            '<div class="wl__row"><label>Stripe price ID <small>(price_...)</small><input name="stripe_price[' . $k . ']" value="' . h(stripe_price($t['key'])) . '" placeholder="price_..."></label>' .
            '<label>Discord role for subscribers<select name="sub_role[' . $k . ']">' . $roleOpts(digits(setting('sub_role_' . $t['key']) ?? '')) . '</select></label></div>' .
            '<div class="wl__row"><label class="pnl__check"><input type="checkbox" name="visible[' . $k . ']"' . ($t['visible'] ? ' checked' : '') . '> Show on the website</label><label class="pnl__check"><input type="radio" name="popular" value="' . $k . '"' . ($t['popular'] ? ' checked' : '') . '> Most popular badge</label></div></fieldset>';
    }
    $cur = (string)(setting('sub_currency') ?: 'USD');
    $names = array_column(sub_tiers(), 'name', 'key'); $srows = [];
    foreach (all('SELECT s.*, u.username FROM subscriptions s LEFT JOIN users u ON u.id=s.user_id ORDER BY s.status IN (\'active\',\'trialing\') DESC, s.id DESC LIMIT 200') as $s)
        $srows[] = [h($s['username'] ?: 'Member') . '<br><small>' . h($s['discord_id']) . '</small>', h($names[$s['tier']] ?? $s['tier']), badge(in_array($s['status'], ['active', 'trialing'], true) ? 'active' : ($s['status'] === 'past_due' ? 'waiting' : 'closed')) . ' <small>' . (is_gift($s) ? ($s['status'] === 'trialing' ? 'free trial from staff' : 'free trial ended') : h($s['status']) . ($s['cancel_at_end'] ? ', cancels at period end' : '')) . '</small>' . (is_gift($s) && $s['status'] === 'trialing' ? '<form method="post" class="pnl__inline">' . csrf_input($c) . '<input type="hidden" name="_do" value="trial-end"><input type="hidden" name="discord_id" value="' . h($s['discord_id']) . '"><button class="btn btn--ghost btn--sm" type="submit">End trial</button></form>' : ''), h($s['period_end'] ? substr($s['period_end'], 0, 10) : '-'), ago($s['updated_at'])];
    $tierOpts = ''; foreach (sub_tiers() as $t) $tierOpts .= '<option value="' . h($t['key']) . '">' . h($t['name']) . '</option>';
    $trialForm = '<h2>Give a free trial</h2><p class="pnl__hint">There is no automatic free trial. Members ask a staff member, who can give one here or with <code>/trial give</code> in Discord. A trial needs no payment: the member gets the tier\'s Discord role and perks until it ends, then the bot takes the role away. If they subscribe during the trial, the paid subscription replaces it.</p>' .
        '<form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="trial-give"><div class="wl__row"><label>Member\'s Discord user ID<input name="discord_id" inputmode="numeric" required placeholder="e.g. 123456789012345678"></label><label>Tier<select name="tier">' . $tierOpts . '</select></label><label>Days<input type="number" name="days" min="1" max="31" value="7"></label></div><button class="btn btn--primary" type="submit"><span>Give free trial</span></button></form>';
    $subsTable = $trialForm . '<h2>Subscribers</h2>' . table(['Member', 'Tier', 'Status', 'Renews / ends', 'Updated'], $srows);
    layout('Subscriptions', '<div class="pnl__card"><h1>Subscriptions</h1><p>The four tiers on the website\'s <a href="/subscriptions" target="_blank" rel="noopener">Subscriptions</a> page. Members pay through <b>Stripe</b>: Subscribe opens Stripe Checkout, so the website never sees card details. Keep the prices here the same as the Stripe prices.</p>' .
        '<form method="post" class="pnl__form subs-form">' . csrf_input($c) . '<input type="hidden" name="_do" value="save">' .
        '<div class="wl__row"><label>Currency<select name="currency">' . opts(['USD', 'EUR', 'GBP', 'CAD', 'AUD'], $cur) . '</select></label></div>' .
        '<label>Text above the tiers <small>(optional)</small><textarea name="intro" rows="2" maxlength="600" placeholder="Support Axiomate Games and get perks in our games and Discord.">' . h(setting('sub_intro')) . '</textarea></label>' .
        '<h2>Stripe</h2><p class="pnl__hint">When Stripe is set up, Subscribe opens Stripe Checkout and the website learns who subscribed, so the bot gives the tier\'s Discord role and takes it away when they cancel. A tier without a Stripe price shows <i>Coming soon</i>.</p>' .
        '<div class="wl__row"><label>Secret key <small>' . (stripe_ready() ? '(saved: ' . h(substr(stripe_key(), 0, 8)) . '…' . h(substr(stripe_key(), -4)) . ')' : '(sk_live_… or sk_test_…)') . '</small><input name="stripe_secret" type="password" autocomplete="off" placeholder="' . (stripe_ready() ? 'leave empty to keep the saved key' : 'sk_live_...') . '"></label>' .
        '<label>Webhook signing secret <small>' . (dec(setting('stripe_webhook')) !== '' ? '(saved)' : '(whsec_…)') . '</small><input name="stripe_webhook" type="password" autocomplete="off" placeholder="' . (dec(setting('stripe_webhook')) !== '' ? 'leave empty to keep it' : 'whsec_...') . '"></label></div>' .
        '<p class="pnl__hint">In Stripe go to <b>Developers → Webhooks → Add endpoint</b>, use <code>' . h(base_url()) . '/api/stripe/webhook</code> and choose the events <code>customer.subscription.created</code>, <code>customer.subscription.updated</code> and <code>customer.subscription.deleted</code>. The Discord roles are given in ' . h($roleGuild !== '' ? guild_label($roleGuild) : 'the main server') . ' (Bot settings: Main server). Set what each role gets (cooldowns, ticket priority) on <a href="' . url('perks') . '">Role perks</a>.' . (stripe_ready() ? ' <label class="pnl__check" style="display:inline-flex"><input type="checkbox" name="stripe_clear"> Remove the saved Stripe keys</label>' : '') . '</p>' .
        '<div class="subtiers">' . $cards . '</div><label class="pnl__check"><input type="radio" name="popular" value=""> No Most popular badge</label>' .
        '<button class="btn btn--primary" type="submit"><span>Save subscriptions</span></button></form>' . $subsTable . '</div>', $c, $page);

case 'rules':
     
    redirect(url('builder') . '?rules=' . (($_GET['a'] ?? '') === 'staff' ? 'staff' : 'member'));

case 'helper':
    if ($post) {
        $id = (int)($_POST['id'] ?? 0);
        if ($act === 'save') {
            $link = field('link', 300);
            if ($link !== '' && !preg_match('#^(/[A-Za-z0-9/_\-\#?=&.]*|https://[^\s]+)$#', $link)) redirect(url('helper') . '?m=Link+must+be+a+site+path+like+/games+or+an+https+URL');
            $row = ['title' => field('title', 120), 'keywords' => field('keywords', 400), 'answer' => field('answer', 1500), 'link' => $link ?: null, 'enabled' => isset($_POST['enabled']) ? 1 : 0];
            if ($row['title'] === '' || $row['answer'] === '') redirect(url('helper') . '?m=Question+and+answer+are+required');
            if ($id) update('helper_kb', $id, $row); else insert('helper_kb', $row + ['created_at' => now()]);
            audit($who, 'helper.save', $row['title']);
        } elseif ($act === 'delete') { q('DELETE FROM helper_kb WHERE id=?', [$id]); audit($who, 'helper.delete', (string)$id); }
        elseif ($act === 'clearlog') { q('DELETE FROM helper_log WHERE answered=0'); audit($who, 'helper.clearlog', ''); }
        redirect(url('helper') . '?m=Saved');
    }
    $edit = ctype_digit($sub) && $sub !== '' ? one('SELECT * FROM helper_kb WHERE id=?', [(int)$sub]) : null;
    $rows = [];
    foreach (all('SELECT * FROM helper_kb ORDER BY id') as $r) $rows[] = [h($r['title']), h($r['keywords']), badge($r['enabled'] ? 'active' : 'revoked'), '<a href="' . url('helper/' . $r['id']) . '">Edit</a>'];
    $miss = [];
    foreach (all('SELECT question,created_at FROM helper_log WHERE answered=0 ORDER BY id DESC LIMIT 30') as $r) $miss[] = [h($r['question']), ago($r['created_at'])];
    layout('Helper answers', '<div class="pnl__card"><h1>Helper answers</h1><p>The Axio Helper Bot answers pings by matching the question against these entries, the server rules and the games. Add the keywords people are likely to use.</p>' . table(['Question / topic', 'Keywords', 'Status', ''], $rows) . '<h2>' . ($edit ? 'Edit answer' : 'New answer') . '</h2><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="save"><input type="hidden" name="id" value="' . (int)($edit['id'] ?? 0) . '"><label>Question / topic<input name="title" maxlength="120" required value="' . h($edit['title'] ?? '') . '"></label><label>Keywords (separate with spaces)<input name="keywords" maxlength="400" value="' . h($edit['keywords'] ?? '') . '"></label><label>Answer<textarea name="answer" rows="4" maxlength="1500" required>' . h($edit['answer'] ?? '') . '</textarea></label><label>Link (optional, e.g. /games)<input name="link" maxlength="300" value="' . h($edit['link'] ?? '') . '"></label><label class="pnl__check"><input type="checkbox" name="enabled" value="1"' . (($edit['enabled'] ?? 1) ? ' checked' : '') . '> Enabled</label><button class="btn btn--primary" type="submit"><span>Save answer</span></button>' . ($edit ? '<button class="btn btn--ghost" name="_do" value="delete" onclick="return confirm(\'Delete this answer?\')">Delete</button><a class="btn btn--ghost" href="' . url('helper') . '">Cancel</a>' : '') . '</form><h2>Questions the bot could not answer</h2><p>Add an answer above for anything that keeps showing up.</p>' . table(['Question', 'Asked (UTC)'], $miss) . ($miss ? '<form method="post" class="pnl__inline">' . csrf_input($c) . '<button class="btn btn--ghost btn--sm" name="_do" value="clearlog">Clear this list</button></form>' : '') . '</div>', $c, $page);

case 'botcfg':
    $servers = known_servers();
    $homeId = (string)setting('home_guild_id');
    $gsel = digits($_GET['g'] ?? ($_POST['g'] ?? ''));
    if ($gsel === '' || !isset($servers[$gsel])) $gsel = $servers ? ($homeId !== '' && isset($servers[$homeId]) ? $homeId : (string)array_key_first($servers)) : '';
    if ($post && $act === 'main' && RANK[$role] >= 3) {
        $mg = digits($_POST['main'] ?? ''); $inv = trim((string)($_POST['invite'] ?? ''));
        set_setting('main_guild_id', $mg);
        set_setting('main_invite', preg_match('#^https://(discord\.gg|discord\.com/invite)/[A-Za-z0-9-]+$#', $inv) ? $inv : '');
        audit($who, 'botcfg.main', $mg);
        redirect(url('botcfg') . '?m=Main+server+saved');
    }
    if ($post && $act === 'home' && RANK[$role] >= 3) {
        $nh = digits($_POST['home'] ?? '');
        set_setting('home_guild_id', $nh); audit($who, 'botcfg.home', $nh);
        redirect(url('botcfg') . '?m=Studio+home+server+saved.+The+Verification+Bot+syncs+it+within+a+minute');
    }
    if ($post && $act === 'save' && $gsel !== '') {
        foreach (BOT_CONFIG_KEYS as $k => $label) {
            $v = digits($_POST[str_replace('.', '_', $k)] ?? '', 25);
            bcfg_set($gsel, $k, $v);
        }
        if (isset($_POST['reset_count'])) { bcfg_set($gsel, 'counting.count', '0'); bcfg_set($gsel, 'counting.last_user', ''); }
        audit($who, 'botcfg.save', $gsel);
        redirect(url('botcfg') . '?g=' . $gsel . '&m=Saved.+Bots+pick+changes+up+within+a+minute');
    }
    $srows = [];
    $botNames = ['community' => 'Community', 'moderation' => 'Moderation', 'ticket' => 'Ticket', 'verification' => 'Verification', 'helper' => 'Helper', 'development' => 'Development', 'roblox' => 'Roblox', 'axiomate' => 'Axiomate Bot'];
    foreach ($servers as $id => $g) { $id = (string)$id; $srows[] = [h($g['name'] ?: guild_label($id)) . ($id === $homeId ? ' ' . badge('active') . ' <small>studio home</small>' : ''), h($id), $g['members'] !== null ? h($g['members']) : '-',
        $g['bots'] ? h(implode(', ', array_map(fn($s) => $botNames[$s] ?? $s, array_unique($g['bots'])))) : '<span class="pb pb--warn">no bot reporting</span>', '<a href="' . url('botcfg') . '?g=' . h($id) . '">Settings</a>']; }
    $homeOpts = '<option value="">None</option>'; foreach ($servers as $id => $g) { $id = (string)$id; $homeOpts .= '<option value="' . h($id) . '"' . ($id === $homeId ? ' selected' : '') . '>' . h($g['name'] ?: guild_label($id)) . '</option>'; }
    $homeForm = RANK[$role] >= 3 ? '<h2>Studio home server</h2><p>Only this server feeds the Team page, staff logins, role mapping and job roles. The Verification Bot reads it from here and switches to a new home server within a minute, so GUILD_ID on the bot host is not needed. Other servers the bots are in work on their own, with their own settings, and never change your roster.</p><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="home"><label>Home server<select name="home">' . $homeOpts . '</select></label><button class="btn btn--primary" type="submit"><span>Save home server</span></button></form>' : '';
    $mainId = (string)setting('main_guild_id');
    $mainOpts = '<option value="">Not set (anyone can use /post)</option>'; foreach ($servers as $id => $g) { $id = (string)$id; $mainOpts .= '<option value="' . h($id) . '"' . ($id === $mainId ? ' selected' : '') . '>' . h($g['name'] ?: guild_label($id)) . '</option>'; }
    $homeForm .= RANK[$role] >= 3 ? '<h2>Main server</h2><p>The community server (not the studio home server). Only its members can use <code>/post</code> for the marketplace, and approved posts are posted in its <b>Marketplace channel</b>. People who are not in it are shown the invite link below.</p><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="main"><label>Main server<select name="main">' . $mainOpts . '</select></label><label>Invite link <small>(optional, e.g. https://discord.gg/abc123)</small><input name="invite" value="' . h(setting('main_invite')) . '" placeholder="https://discord.gg/..."></label><button class="btn btn--primary" type="submit"><span>Save main server</span></button></form>' : '';
    $cur = $gsel !== '' ? bcfg_all($gsel) : []; $f = '';
    foreach (BOT_CONFIG_KEYS as $k => $label) $f .= '<label>' . h($label) . '<input name="' . h(str_replace('.', '_', $k)) . '" inputmode="numeric" autocomplete="off" value="' . h($cur[$k] ?? '') . '"></label>';
    $cnt = 'Counting: current number ' . h($cur['counting.count'] ?? '0') . ', best ' . h($cur['counting.best'] ?? '0');
    $form = $gsel === '' ? '<p class="pnl__empty">No servers yet. They appear here once a bot has started and joined a server.</p>' : '<h2>Settings for ' . h($servers[$gsel]['name'] ?: guild_label($gsel)) . '</h2><p>Channel and role IDs the bots use in this server. The setup commands in Discord (/counting-channel, /ticket-channel, /verify-channel, /helperbot-channel) fill these in for you. In Discord, turn on Developer Mode and right-click a channel or role to copy its ID.</p><form method="post" class="pnl__form">' . csrf_input($c) . '<input type="hidden" name="_do" value="save"><input type="hidden" name="g" value="' . h($gsel) . '">' . $f . '<p>' . $cnt . '</p><label class="pnl__check"><input type="checkbox" name="reset_count" value="1"> Reset the counting game to 0</label><button class="btn btn--primary" type="submit"><span>Save settings</span></button></form>';
    layout('Bot settings', '<div class="pnl__card"><h1>Bot settings</h1><p>The bots work in every server they are added to. Each server has its own channels, roles, levels, tickets and counting game.</p>' . table(['Server', 'ID', 'Members', 'Bots in it', ''], $srows) . $form . $homeForm . '</div>', $c, $page);

case 'audit':
    $rows = [];
    foreach (all('SELECT * FROM audit ORDER BY id DESC LIMIT 300') as $a) $rows[] = [h($a['created_at']), h($a['actor']), h($a['action']), h($a['detail'])];
    layout('Audit log', '<div class="pnl__card"><h1>Audit log</h1>' . table(['When (UTC)', 'Who', 'Action', 'Detail'], $rows) . '</div>', $c, $page);
}
