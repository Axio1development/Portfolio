<?php
 

declare(strict_types=1);
require __DIR__ . '/../app/lib.php';

header('X-Frame-Options: DENY');
header('Cache-Control: no-store');

function ha_url(string $p = ''): string { return '/hub-admin' . ($p === '' ? '' : '/' . ltrim($p, '/')); }
function ha_go(string $to): never { header('Location: ' . $to, true, 303); exit; }
function ha_ago(?string $utc): string {
    if (!$utc) return '<span class="mute">never</span>';
    $d = time() - (int)strtotime($utc . ' UTC');
    $t = $d < 60 ? 'just now' : ($d < 3600 ? intdiv($d, 60) . ' min ago' : ($d < 86400 ? intdiv($d, 3600) . ' h ago' : ($d < 86400 * 30 ? intdiv($d, 86400) . ' d ago' : gmdate('j M Y', time() - $d))));
    return '<span title="' . h($utc) . ' UTC">' . h($t) . '</span>';
}
function ha_icon(string $key, string $cls = 'ic'): string {
    $i = hub_icons()[$key] ?? hub_icons()['hash'] ?? null;
    if (!$i) return '';
    return '<svg class="' . h($cls) . '" viewBox="' . h($i['box'] ?? '0 0 24 24') . '"' . (!empty($i['color']) ? '' : ' fill="currentColor"') . ' aria-hidden="true">' . $i['svg'] . '</svg>';
}
function ha_table(array $head, array $rows, string $empty = 'Nothing here yet.'): string {
    if (!$rows) return '<p class="empty">' . h($empty) . '</p>';
    $o = '<div class="tw"><table><thead><tr>' . implode('', array_map(fn($x) => '<th>' . h($x) . '</th>', $head)) . '</tr></thead><tbody>';
    foreach ($rows as $r) $o .= '<tr>' . implode('', array_map(fn($x) => '<td>' . $x . '</td>', $r)) . '</tr>';
    return $o . '</tbody></table></div>';
}
 
function ha_server(): ?array {
    $id = (int)($_GET['server'] ?? $_POST['server_id'] ?? 0);
    return ($id ? one('SELECT * FROM hub_servers WHERE id=?', [$id]) : null) ?: (one('SELECT * FROM hub_servers ORDER BY position, id LIMIT 1') ?: null);
}
function ha_server_pick(string $page, ?array $cur): string {
    $o = '<form method="get" class="filter"><label class="inline">Server <select name="server" onchange="this.form.submit()">';
    foreach (all('SELECT id, name FROM hub_servers ORDER BY position, id') as $sv) $o .= '<option value="' . (int)$sv['id'] . '"' . ($cur && (int)$cur['id'] === (int)$sv['id'] ? ' selected' : '') . '>' . h($sv['name']) . '</option>';
    return $o . '</select></label><noscript><button class="btn btn--ghost" type="submit">Show</button></noscript></form>';
}
function ha_server_icon(array $sv): string {
    if ($sv['icon'] === 'upload' && $sv['icon_at']) return '<img class="srvic" src="/api/hub/server-icon/' . (int)$sv['id'] . '?v=' . strtotime((string)$sv['icon_at'] . ' UTC') . '" alt="">';
    if ($sv['icon'] === 'brand' || $sv['icon'] === '') return '<img class="srvic" src="/assets/brand/mark-256.png" alt="">';
    return '<span class="srvic">' . ha_icon((string)$sv['icon']) . '</span>';
}
function ha_icon_picker(string $name, string $sel, array $extra = []): string {
    $o = '<div class="picker">';
    foreach ($extra as $k => $html) $o .= '<label class="pick"><input type="radio" name="' . $name . '" value="' . h($k) . '"' . ($sel === $k ? ' checked' : '') . '>' . $html . '</label>';
    foreach (hub_icons() as $k => $i) if (empty($i['color'])) $o .= '<label class="pick" title="' . h($i['label']) . '"><input type="radio" name="' . $name . '" value="' . h($k) . '"' . ($sel === $k ? ' checked' : '') . '>' . ha_icon($k) . '<span>' . h($i['label']) . '</span></label>';
    return $o . '</div>';
}
function ha_role_boxes(string $name, int $serverId, array $sel): string {
    $roles = all('SELECT * FROM hub_roles WHERE server_id=? ORDER BY position, id', [$serverId]);
    if (!$roles) return '<p class="hint">This server has no roles yet. Make them on the Roles page.</p>';
    $o = '<div class="rolebox">';
    foreach ($roles as $r) $o .= '<label class="check"><input type="checkbox" name="' . $name . '[]" value="' . (int)$r['id'] . '"' . (in_array((int)$r['id'], $sel, true) ? ' checked' : '') . '><i class="sw" style="background:' . h($r['color'] ?: '#6b7280') . '"></i>' . h($r['name']) . '</label>';
    return $o . '</div>';
}
function ha_ids_in(string $key): string { return implode(',', array_values(array_unique(array_filter(array_map('intval', (array)($_POST[$key] ?? [])))))); }
function ha_csrf(array $c): string { return '<input type="hidden" name="_csrf" value="' . h($c['csrf']) . '">'; }

$c = auth();
$path = trim((string)parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
$page = explode('/', preg_replace('#^hub-admin/?#', '', $path) ?? '')[0] ?: 'overview';
if (!$c) ha_go('/api/auth/discord?next=' . rawurlencode('/hub-admin'));
$me = $c['user']; $rank = staff_rank($me); $admin = $rank >= 2; $who = (string)$me['username'];
if ($rank < 1) { http_response_code(403); }
$post = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
if ($post) { check_csrf($_POST['_csrf'] ?? null); }
$act = (string)($_POST['_do'] ?? '');
$flash = (string)($_GET['m'] ?? '');
$cfg = hub_cfg();

const HA_PAGES = ['overview' => ['Overview', 'home'], 'look' => ['Appearance', 'blossom'], 'servers' => ['Servers', 'gamepad'], 'channels' => ['Channels', 'hash'], 'roles' => ['Roles', 'crown'], 'messages' => ['Messages', 'chat'], 'members' => ['Members', 'people'], 'account' => ['Your app account', 'crown']];

function ha_layout(string $title, string $html, array $cfg, string $page, array $me): never {
    $nav = '';
    foreach (HA_PAGES as $slug => [$label, $ic]) if ($slug !== 'account' || staff_rank($me) >= 3) $nav .= '<a href="' . ha_url($slug === 'overview' ? '' : $slug) . '"' . ($slug === $page ? ' aria-current="page"' : '') . '>' . ha_icon($ic) . '<span>' . h($label) . '</span></a>';
    $flash = (string)($_GET['m'] ?? '');
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' . h($title) . ' · App panel</title>'
        . '<link rel="icon" href="/hub/icon-192.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        . '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=Inter:wght@400;500;600;700&display=swap"><link rel="stylesheet" href="/hub/admin.css?v=3">'
        . '<style>:root{--accent:' . h($cfg['accent']) . '}</style></head><body><div class="shell"><aside class="side"><div class="brand">' . ha_icon($cfg['home_icon'] ?: 'blossom-tree', 'brand__ic') . '<div><b>' . h($cfg['name']) . '</b><small>App panel</small></div></div>'
        . '<nav>' . $nav . '</nav><div class="side__foot"><a href="/hub" target="_blank" rel="noopener">' . ha_icon('chat') . '<span>Open the app</span></a><a href="/staff">' . ha_icon('shield') . '<span>Discord panel</span></a>'
        . '<div class="me">' . h((string)$me['username']) . '<small>' . h(staff_role($me) ?? 'member') . '</small></div></div></aside><main class="main"><h1>' . h($title) . '</h1>'
        . ($flash !== '' ? '<p class="flash" role="status">' . h($flash) . '</p>' : '') . $html . '</main></div></body></html>';
    exit;
}

if ($rank < 1) ha_layout('No access', '<p>The App panel is for staff. Ask an admin if you need access.</p>', $cfg, '', $me);
if ($page === 'account' && $rank < 3) ha_layout('Owner only', '<p>Only the owner can use this page.</p>', $cfg, '', $me);
if ($post && !$admin && !in_array($act, ['msg-delete', 'mute', 'unmute'], true)) ha_go(ha_url($page) . '?m=' . urlencode('Only admins can change this.'));

switch ($page) {
case 'overview':
    $since = fn(int $s) => gmdate('Y-m-d H:i:s', time() - $s);
    $stats = [['Online now', 'SELECT COUNT(*) AS n FROM users WHERE hub_seen > ?', [$since(300)]], ['Used the app this week', 'SELECT COUNT(*) AS n FROM users WHERE hub_seen > ?', [$since(7 * 86400)]],
        ['Messages today', 'SELECT COUNT(*) AS n FROM chat_messages WHERE dm_id=0 AND created_at > ?', [$since(86400)]], ['Direct messages today', 'SELECT COUNT(*) AS n FROM chat_messages WHERE dm_id<>0 AND created_at > ?', [$since(86400)]],
        ['Linked Roblox accounts', 'SELECT COUNT(*) AS n FROM users WHERE roblox_verified_at IS NOT NULL', []], ['Muted members', 'SELECT COUNT(*) AS n FROM users WHERE hub_muted_until > ?', [now()]],
        ['Open tickets from the app', "SELECT COUNT(*) AS n FROM tickets WHERE source='app' AND status<>'closed'", []]];
    $cards = '';
    foreach ($stats as [$l, $sql, $args]) $cards .= '<div class="stat"><b>' . number_format((int)one($sql, $args)['n']) . '</b><span>' . h($l) . '</span></div>';
    $active = all('SELECT c.name, c.icon, COUNT(m.id) AS n FROM chat_channels c LEFT JOIN chat_messages m ON m.channel_id=c.id AND m.dm_id=0 AND m.created_at > ? GROUP BY c.id, c.name, c.icon ORDER BY n DESC LIMIT 6', [$since(7 * 86400)]);
    $rows = array_map(fn($r) => ['<span class="chan">' . ha_icon((string)$r['icon']) . h($r['name']) . '</span>', number_format((int)$r['n'])], $active);
    ha_layout('Overview', '<p class="lead">Everything about the app. The Discord servers, the bot and the website are run from the <a href="/staff">Discord panel</a>; tickets opened in the app are handled there too (marked <b>App</b>).</p><div class="stats">' . $cards . '</div>'
        . '<section class="card"><h2>Busiest channels this week</h2>' . ha_table(['Channel', 'Messages'], $rows) . '</section>', $cfg, $page, $me);

case 'look':
    if ($post && $act === 'gifs') {
        $prov = in_array($_POST['gif_provider'] ?? '', ['klipy', 'giphy'], true) ? (string)$_POST['gif_provider'] : 'klipy';
        set_setting('gif_provider', $prov);
        $k = trim((string)($_POST['gif_key'] ?? ''));
        if (!empty($_POST['gif_off'])) set_setting('gif_key', '');
        elseif ($k !== '') set_setting('gif_key', enc(substr($k, 0, 200)));
        audit($who, 'app.gifs', $prov . (!empty($_POST['gif_off']) ? ' off' : ''));
        if (!empty($_POST['gif_off'])) ha_go(ha_url('look') . '?m=' . urlencode('GIF search is off.'));
        $test = hub_gif_conf() ? hub_gif_search('anime', 1, 0) : null;
        ha_go(ha_url('look') . '?m=' . urlencode(!hub_gif_conf() ? 'Saved. Add a key to turn GIF search on.' : ($test && $test['results'] ? 'Saved. GIF search works: ' . count($test['results']) . ' results for a test search.' : 'Saved, but the test search failed. Check the key.')));
    }
    if ($post && $act === 'save') {
        $col = (string)($_POST['accent'] ?? '');
        $new = ['name' => str($_POST['name'] ?? '', 40) ?: HUB_DEFAULTS['name'], 'server' => str($_POST['server'] ?? '', 40) ?: HUB_DEFAULTS['server'],
            'accent' => preg_match('/^#[0-9a-f]{6}$/i', $col) ? strtolower($col) : HUB_DEFAULTS['accent'],
            'home_icon' => isset(hub_icons()[$_POST['home_icon'] ?? '']) ? (string)$_POST['home_icon'] : 'blossom-tree',
            'server_icon' => ($_POST['server_icon'] ?? '') === 'brand' || isset(hub_icons()[$_POST['server_icon'] ?? '']) ? (string)$_POST['server_icon'] : 'brand',
            'login_title' => str($_POST['login_title'] ?? '', 60) ?: HUB_DEFAULTS['login_title'], 'login_text' => str($_POST['login_text'] ?? '', 200) ?: HUB_DEFAULTS['login_text'],
            'chat_rule' => ($_POST['chat_rule'] ?? '') === 'everyone' ? 'everyone' : 'roblox'];
        set_setting('hub_config', json_encode($new, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        audit($who, 'app.appearance', $new['name']);
        ha_go(ha_url('look') . '?m=' . urlencode('Saved. The app shows it within a minute.'));
    }
    $picker = function (string $name, string $sel, bool $brand = false): string {
        $o = '<div class="picker">' . ($brand ? '<label class="pick" title="Studio logo"><input type="radio" name="' . $name . '" value="brand"' . ($sel === 'brand' ? ' checked' : '') . '><img src="/assets/brand/mark-256.png" alt=""><span>Logo</span></label>' : '');
        foreach (hub_icons() as $k => $i) $o .= '<label class="pick" title="' . h($i['label']) . '"><input type="radio" name="' . $name . '" value="' . h($k) . '"' . ($sel === $k ? ' checked' : '') . '>' . ha_icon($k) . '<span>' . h($i['label']) . '</span></label>';
        return $o . '</div>';
    };
    ha_layout('Appearance', '<p class="lead">How the app looks and what it says. Changes show in the app within a minute.</p><form method="post" class="card form">' . ha_csrf($c) . '<input type="hidden" name="_do" value="save">'
        . '<div class="row2"><label>App name<input name="name" maxlength="40" value="' . h($cfg['name']) . '"></label><input type="hidden" name="server" value="' . h($cfg['server']) . '"><p class="hint">Server names and icons are on the <a href="' . ha_url('servers') . '">Servers</a> page.</p></div>'
        . '<div class="row2"><label>Accent colour<input type="color" name="accent" value="' . h($cfg['accent']) . '"></label><label>Who can chat<select name="chat_rule"><option value="roblox"' . ($cfg['chat_rule'] === 'roblox' ? ' selected' : '') . '>Members with a linked Roblox account (fewer spam accounts)</option><option value="everyone"' . ($cfg['chat_rule'] === 'everyone' ? ' selected' : '') . '>Everyone who signs in</option></select></label></div>'
        . '<label>Sign-in title<input name="login_title" maxlength="60" value="' . h($cfg['login_title']) . '"></label><label>Sign-in text<input name="login_text" maxlength="200" value="' . h($cfg['login_text']) . '"></label>'
        . '<h2>Home button</h2><p class="hint">The top button on the left, for direct messages.</p>' . $picker('home_icon', $cfg['home_icon'])
        . '<input type="hidden" name="server_icon" value="' . h($cfg['server_icon']) . '">'
        . '<button class="btn" type="submit">Save</button></form>'
        . '<form method="post" class="card form">' . ha_csrf($c) . '<input type="hidden" name="_do" value="gifs"><h2>GIF search</h2>'
        . '<p class="hint">Lets members search GIFs for their avatar and banner. ' . (hub_gif_conf() ? '<b>On</b> (' . h((string)setting('gif_provider') ?: 'klipy') . ').' : '<b>Off</b> until a key is saved.')
        . ' Get a free key from <a href="https://partner.klipy.com" target="_blank" rel="noopener">Klipy</a> (what Discord uses) or <a href="https://developers.giphy.com" target="_blank" rel="noopener">Giphy</a>. Tenor closed its API in 2026.</p>'
        . '<div class="row2"><label>Service<select name="gif_provider"><option value="klipy"' . (setting('gif_provider') !== 'giphy' ? ' selected' : '') . '>Klipy</option><option value="giphy"' . (setting('gif_provider') === 'giphy' ? ' selected' : '') . '>Giphy</option></select></label>'
        . '<label>API key <small>(stored encrypted; leave blank to keep the current one)</small><input name="gif_key" type="password" autocomplete="off"></label></div>'
        . '<label class="check"><input type="checkbox" name="gif_off" value="1"> Turn GIF search off</label><button class="btn" type="submit">Save and test</button></form>', $cfg, $page, $me);

case 'servers':
    if ($post) {
        $id = (int)($_POST['id'] ?? 0);
        if ($act === 'srv-save') {
            $name = str($_POST['name'] ?? '', 40);
            if ($name === '') ha_go(ha_url('servers') . '?m=' . urlencode('Give the server a name.'));
            $icon = (string)($_POST['icon'] ?? 'brand');
            if (!in_array($icon, ['brand', 'upload'], true) && !isset(hub_icons()[$icon])) $icon = 'brand';
            $game = (string)($_POST['game_slug'] ?? '');
            $col = (string)($_POST['accent'] ?? '');
            $row = ['name' => $name, 'description' => str($_POST['description'] ?? '', 200) ?: null, 'game_slug' => one('SELECT slug FROM games WHERE slug=?', [$game]) ? $game : null,
                'accent' => !empty($_POST['use_accent']) && preg_match('/^#[0-9a-f]{6}$/i', $col) ? strtolower($col) : null, 'staff_only' => isset($_POST['staff_only']) ? 1 : 0, 'icon' => $icon];
            if ($id) update('hub_servers', $id, $row);
            else $id = insert('hub_servers', $row + ['position' => (int)one('SELECT COALESCE(MAX(position),0)+1 AS p FROM hub_servers')['p'], 'created_at' => now()]);
             
            $f = $_FILES['icon_file'] ?? null;
            if ($f && ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                $raw = (string)@file_get_contents((string)$f['tmp_name']); $info = @getimagesizefromstring($raw);
                if (strlen($raw) > 1048576 || !$info || !in_array($info['mime'], ['image/png', 'image/jpeg', 'image/gif', 'image/webp'], true)) ha_go(ha_url('servers') . '?edit=' . $id . '&m=' . urlencode('Saved, but the picture must be a PNG, JPG, GIF or WEBP under 1 MB.'));
                q('DELETE FROM hub_server_icons WHERE server_id=?', [$id]);
                insert('hub_server_icons', ['server_id' => $id, 'mime' => $info['mime'], 'data' => base64_encode($raw), 'updated_at' => now()]);
                q("UPDATE hub_servers SET icon='upload', icon_at=? WHERE id=?", [now(), $id]);
            } elseif ($icon === 'upload' && !one('SELECT server_id FROM hub_server_icons WHERE server_id=?', [$id])) q("UPDATE hub_servers SET icon='brand' WHERE id=?", [$id]);
            audit($who, 'app.server-save', $name);
            ha_go(ha_url('servers') . '?m=' . urlencode('Server saved. The app shows it within a few seconds.'));
        }
        if ($act === 'srv-delete') {
            if ((int)one('SELECT COUNT(*) AS n FROM hub_servers')['n'] <= 1) ha_go(ha_url('servers') . '?m=' . urlencode('The app needs at least one server.'));
            foreach (all('SELECT id FROM chat_channels WHERE server_id=?', [$id]) as $ch) q('DELETE FROM chat_messages WHERE channel_id=? AND dm_id=0', [$ch['id']]);
            foreach (['chat_channels', 'hub_roles', 'hub_member_roles', 'hub_server_icons'] as $t) q("DELETE FROM $t WHERE server_id=?", [$id]);
            q('DELETE FROM hub_servers WHERE id=?', [$id]);
            audit($who, 'app.server-delete', '#' . $id);
            ha_go(ha_url('servers') . '?m=' . urlencode('Server deleted.'));
        }
        if ($act === 'srv-move') {
            $ids = array_map(fn($r) => (int)$r['id'], all('SELECT id FROM hub_servers ORDER BY position, id'));
            $i = array_search($id, $ids, true); $j = $i === false ? -1 : $i + (($_POST['dir'] ?? '') === 'up' ? -1 : 1);
            if ($i !== false && $j >= 0 && $j < count($ids)) { [$ids[$i], $ids[$j]] = [$ids[$j], $ids[$i]]; foreach ($ids as $n => $sid) q('UPDATE hub_servers SET position=? WHERE id=?', [$n + 1, $sid]); }
            ha_go(ha_url('servers'));
        }
    }
    $edit = isset($_GET['edit']) ? one('SELECT * FROM hub_servers WHERE id=?', [(int)$_GET['edit']]) : null;
    $games = all('SELECT slug, name FROM games ORDER BY sort, id');
    $gname = array_column($games, 'name', 'slug');
    $rows = [];
    foreach (all('SELECT s.*, (SELECT COUNT(*) FROM chat_channels c WHERE c.server_id=s.id) AS nch, (SELECT COUNT(*) FROM hub_roles r WHERE r.server_id=s.id) AS nro FROM hub_servers s ORDER BY s.position, s.id') as $sv) {
        $tools = $admin ? '<form method="post" class="tools">' . ha_csrf($c) . '<input type="hidden" name="id" value="' . (int)$sv['id'] . '"><input type="hidden" name="dir" value="down">'
            . '<button class="btn btn--ghost btn--sm" name="_do" value="srv-move" onclick="this.form.dir.value=\'up\'" title="Move up">&uarr;</button><button class="btn btn--ghost btn--sm" name="_do" value="srv-move" title="Move down">&darr;</button>'
            . '<a class="btn btn--ghost btn--sm" href="' . ha_url('servers') . '?edit=' . (int)$sv['id'] . '#form">Edit</a>'
            . '<button class="btn btn--ghost btn--sm" name="_do" value="srv-delete" onclick="return confirm(\'Delete ' . h($sv['name']) . ' with all its channels, messages and roles?\')">Delete</button></form>' : '';
        $rows[] = ['<span class="chan">' . ha_server_icon($sv) . '<b>' . h($sv['name']) . '</b></span><small>' . h((string)$sv['description']) . '</small>', h($gname[$sv['game_slug'] ?? ''] ?? '-'),
            '<a href="' . ha_url('channels') . '?server=' . (int)$sv['id'] . '">' . (int)$sv['nch'] . ' channel' . ((int)$sv['nch'] === 1 ? '' : 's') . '</a> · <a href="' . ha_url('roles') . '?server=' . (int)$sv['id'] . '">' . (int)$sv['nro'] . ' role' . ((int)$sv['nro'] === 1 ? '' : 's') . '</a>',
            $sv['staff_only'] ? '<span class="tag">Staff only</span>' : 'Everyone', $tools];
    }
    $gopts = '<option value="">No game (a community server)</option>';
    foreach ($games as $g) $gopts .= '<option value="' . h($g['slug']) . '"' . (($edit['game_slug'] ?? '') === $g['slug'] ? ' selected' : '') . '>' . h($g['name']) . '</option>';
    $cur = (string)($edit['icon'] ?? 'brand');
    $form = $admin ? '<form method="post" class="card form" id="form" enctype="multipart/form-data">' . ha_csrf($c) . '<input type="hidden" name="_do" value="srv-save"><input type="hidden" name="id" value="' . (int)($edit['id'] ?? 0) . '"><h2>' . ($edit ? 'Edit ' . h($edit['name']) : 'Add a server') . '</h2>'
        . '<div class="row2"><label>Name<input name="name" maxlength="40" required value="' . h($edit['name'] ?? '') . '" placeholder="e.g. Locked Ego"></label><label>Game <small>(links the server to a game on the website)</small><select name="game_slug">' . $gopts . '</select></label></div>'
        . '<label>Description <small>(shown at the top of the channel list)</small><input name="description" maxlength="200" value="' . h($edit['description'] ?? '') . '"></label>'
        . '<p class="hint">Icon: the studio logo, a picture you upload, or one of the app\'s icons.</p>'
        . ha_icon_picker('icon', $cur, ['brand' => '<img src="/assets/brand/mark-256.png" alt=""><span>Logo</span>', 'upload' => ($edit && $edit['icon_at'] ? ha_server_icon(['icon' => 'upload'] + $edit) : ha_icon('image')) . '<span>Picture</span>'])
        . '<label>Upload a picture <small>(PNG, JPG, GIF or WEBP, square, under 1 MB; picks "Picture")</small><input type="file" name="icon_file" accept="image/png,image/jpeg,image/gif,image/webp"></label>'
        . '<div class="row2"><label class="check"><input type="checkbox" name="use_accent"' . (!empty($edit['accent']) ? ' checked' : '') . '> Own accent colour</label><label>Accent colour<input type="color" name="accent" value="' . h($edit['accent'] ?? $cfg['accent']) . '"></label></div>'
        . '<label class="check"><input type="checkbox" name="staff_only"' . (!empty($edit['staff_only']) ? ' checked' : '') . '> Staff only (hidden from members, e.g. while a game is secret)</label>'
        . '<div class="actions"><button class="btn" type="submit">' . ($edit ? 'Save server' : 'Add server') . '</button>' . ($edit ? '<a class="btn btn--ghost" href="' . ha_url('servers') . '">Cancel</a>' : '') . '</div></form>' : '';
    ha_layout('Servers', '<p class="lead">The servers down the left of the app: one for the studio and one for each game. Each has its own channels and roles.</p><section class="card">' . ha_table(['Server', 'Game', 'Has', 'Who can see it', ''], $rows) . '</section>' . $form, $cfg, $page, $me);

case 'roles':
    $srv = ha_server();
    if (!$srv) ha_layout('Roles', '<p>Add a server first.</p>', $cfg, $page, $me);
    $sid = (int)$srv['id']; $back = ha_url('roles') . '?server=' . $sid;
    if ($post) {
        $id = (int)($_POST['id'] ?? 0);
        $role = $id ? one('SELECT * FROM hub_roles WHERE id=? AND server_id=?', [$id, $sid]) : null;
        if ($act === 'role-save') {
            $name = str($_POST['name'] ?? '', 40);
            if ($name === '') ha_go($back . '&m=' . urlencode('Give the role a name.'));
            $col = (string)($_POST['color'] ?? ''); $ic = (string)($_POST['icon'] ?? '');
            $row = ['name' => $name, 'color' => !empty($_POST['use_color']) && preg_match('/^#[0-9a-f]{6}$/i', $col) ? strtolower($col) : null, 'icon' => isset(hub_icons()[$ic]) ? $ic : null,
                'hoist' => isset($_POST['hoist']) ? 1 : 0, 'perms' => implode(',', array_values(array_intersect(array_keys(HUB_PERMS), (array)($_POST['perms'] ?? []))))];
            if ($role) update('hub_roles', $id, $row);
            else $id = insert('hub_roles', $row + ['server_id' => $sid, 'position' => (int)one('SELECT COALESCE(MAX(position),0)+1 AS p FROM hub_roles WHERE server_id=?', [$sid])['p'], 'created_at' => now()]);
            audit($who, 'app.role-save', $srv['name'] . ': ' . $name);
            ha_go($back . '&edit=' . $id . '&m=' . urlencode('Role saved.'));
        }
        if (!$role) ha_go($back . '&m=' . urlencode('Role not found.'));
        if ($act === 'role-delete') {
            q('DELETE FROM hub_member_roles WHERE role_id=?', [$id]); q('DELETE FROM hub_roles WHERE id=?', [$id]);
            foreach (all('SELECT id, view_roles, post_roles FROM chat_channels WHERE server_id=?', [$sid]) as $ch)
                q('UPDATE chat_channels SET view_roles=?, post_roles=? WHERE id=?', [implode(',', array_diff(hub_ids((string)$ch['view_roles']), [$id])), implode(',', array_diff(hub_ids((string)$ch['post_roles']), [$id])), $ch['id']]);
            audit($who, 'app.role-delete', $srv['name'] . ': ' . $role['name']);
            ha_go($back . '&m=' . urlencode('Role deleted.'));
        }
        if ($act === 'role-move') {
            $ids = array_map(fn($r) => (int)$r['id'], all('SELECT id FROM hub_roles WHERE server_id=? ORDER BY position, id', [$sid]));
            $i = array_search($id, $ids, true); $j = $i === false ? -1 : $i + (($_POST['dir'] ?? '') === 'up' ? -1 : 1);
            if ($i !== false && $j >= 0 && $j < count($ids)) { [$ids[$i], $ids[$j]] = [$ids[$j], $ids[$i]]; foreach ($ids as $n => $rid) q('UPDATE hub_roles SET position=? WHERE id=?', [$n + 1, $rid]); }
            ha_go($back);
        }
        if ($act === 'role-add') {
            $nm = strtolower(trim((string)($_POST['who'] ?? '')));
            $tu = $nm === '' ? null : one('SELECT * FROM users WHERE app_login IS NOT NULL AND (app_login=? OR LOWER(hub_name)=?) ORDER BY id LIMIT 1', [ltrim($nm, '@'), ltrim($nm, '@')]);
            if (!$tu) ha_go($back . '&edit=' . $id . '&m=' . urlencode('Nobody in the app has that username.'));
            if (!one('SELECT role_id FROM hub_member_roles WHERE role_id=? AND user_id=?', [$id, $tu['id']])) insert('hub_member_roles', ['role_id' => $id, 'user_id' => (int)$tu['id'], 'server_id' => $sid, 'added_at' => now()]);
            audit($who, 'app.role-give', $role['name'] . ' to ' . $tu['username']);
            ha_go($back . '&edit=' . $id . '&m=' . urlencode($tu['username'] . ' has the ' . $role['name'] . ' role.'));
        }
        if ($act === 'role-take') {
            q('DELETE FROM hub_member_roles WHERE role_id=? AND user_id=?', [$id, (int)($_POST['user_id'] ?? 0)]);
            audit($who, 'app.role-take', $role['name']);
            ha_go($back . '&edit=' . $id . '&m=' . urlencode('Role removed from the member.'));
        }
    }
    $edit = isset($_GET['edit']) ? one('SELECT * FROM hub_roles WHERE id=? AND server_id=?', [(int)$_GET['edit'], $sid]) : null;
    $rows = [];
    foreach (all('SELECT r.*, (SELECT COUNT(*) FROM hub_member_roles m WHERE m.role_id=r.id) AS n FROM hub_roles r WHERE r.server_id=? ORDER BY r.position, r.id', [$sid]) as $r) {
        $perm = array_map(fn($x) => '<span class="tag">' . h(HUB_PERMS[$x] ?? $x) . '</span>', array_filter(explode(',', (string)$r['perms'])));
        $tools = $admin ? '<form method="post" class="tools">' . ha_csrf($c) . '<input type="hidden" name="server_id" value="' . $sid . '"><input type="hidden" name="id" value="' . (int)$r['id'] . '"><input type="hidden" name="dir" value="down">'
            . '<button class="btn btn--ghost btn--sm" name="_do" value="role-move" onclick="this.form.dir.value=\'up\'" title="Higher">&uarr;</button><button class="btn btn--ghost btn--sm" name="_do" value="role-move" title="Lower">&darr;</button>'
            . '<a class="btn btn--ghost btn--sm" href="' . $back . '&edit=' . (int)$r['id'] . '#form">Edit</a><button class="btn btn--ghost btn--sm" name="_do" value="role-delete" onclick="return confirm(\'Delete the ' . h($r['name']) . ' role?\')">Delete</button></form>' : '';
        $rows[] = ['<span class="chan"><i class="sw" style="background:' . h($r['color'] ?: '#6b7280') . '"></i>' . ($r['icon'] ? ha_icon((string)$r['icon']) : '') . '<b' . ($r['color'] ? ' style="color:' . h($r['color']) . '"' : '') . '>' . h($r['name']) . '</b></span>' . ($r['hoist'] ? '<small>Shown separately in the member list</small>' : ''),
            $perm ? implode(' ', $perm) : '<span class="mute">None</span>', number_format((int)$r['n']), $tools];
    }
    $perms = '';
    foreach (HUB_PERMS as $k => $label) $perms .= '<label class="check"><input type="checkbox" name="perms[]" value="' . h($k) . '"' . (in_array($k, explode(',', (string)($edit['perms'] ?? '')), true) ? ' checked' : '') . '> ' . h($label) . '</label>';
    $form = $admin ? '<form method="post" class="card form" id="form">' . ha_csrf($c) . '<input type="hidden" name="_do" value="role-save"><input type="hidden" name="server_id" value="' . $sid . '"><input type="hidden" name="id" value="' . (int)($edit['id'] ?? 0) . '"><h2>' . ($edit ? 'Edit ' . h($edit['name']) : 'Add a role to ' . h($srv['name'])) . '</h2>'
        . '<div class="row2"><label>Name<input name="name" maxlength="40" required value="' . h($edit['name'] ?? '') . '" placeholder="e.g. Tester"></label><div><label class="check"><input type="checkbox" name="use_color"' . (!empty($edit['color']) || !$edit ? ' checked' : '') . '> Colour names with it</label><input type="color" name="color" value="' . h($edit['color'] ?? '#8b5cf6') . '"></div></div>'
        . '<label class="check"><input type="checkbox" name="hoist"' . (!empty($edit['hoist']) ? ' checked' : '') . '> Show members with this role separately in the member list</label>'
        . '<p class="hint">What the role can do in this server</p>' . $perms
        . '<p class="hint">Role icon (next to names)</p>' . ha_icon_picker('icon', (string)($edit['icon'] ?? ''), ['' => '<span class="none">None</span>'])
        . '<div class="actions"><button class="btn" type="submit">' . ($edit ? 'Save role' : 'Add role') . '</button>' . ($edit ? '<a class="btn btn--ghost" href="' . $back . '">Cancel</a>' : '') . '</div></form>' : '';
    $members = '';
    if ($edit) {
        $mr = [];
        foreach (all('SELECT u.id, u.username, u.app_login, u.hub_name FROM hub_member_roles m JOIN users u ON u.id=m.user_id WHERE m.role_id=? ORDER BY u.username LIMIT 300', [(int)$edit['id']]) as $u)
            $mr[] = ['<b>' . h((string)($u['hub_name'] ?: $u['username'])) . '</b><small>@' . h((string)$u['app_login']) . '</small>', $admin ? '<form method="post">' . ha_csrf($c) . '<input type="hidden" name="_do" value="role-take"><input type="hidden" name="server_id" value="' . $sid . '"><input type="hidden" name="id" value="' . (int)$edit['id'] . '"><input type="hidden" name="user_id" value="' . (int)$u['id'] . '"><button class="btn btn--ghost btn--sm">Remove</button></form>' : ''];
        $members = '<section class="card"><h2>Members with ' . h($edit['name']) . '</h2>' . ($admin ? '<form method="post" class="filter">' . ha_csrf($c) . '<input type="hidden" name="_do" value="role-add"><input type="hidden" name="server_id" value="' . $sid . '"><input type="hidden" name="id" value="' . (int)$edit['id'] . '"><input name="who" placeholder="App username, e.g. axio" required><button class="btn" type="submit">Give role</button></form>' : '')
            . ha_table(['Member', ''], $mr, 'Nobody has this role yet.') . '</section>';
    }
    ha_layout('Roles', '<p class="lead">Roles for one server. The highest role (top of the list) colours a member\'s name. Pick which roles can see or post in a channel on the <a href="' . ha_url('channels') . '?server=' . $sid . '">Channels</a> page. Staff can always do everything.</p>'
        . ha_server_pick('roles', $srv) . '<section class="card">' . ha_table(['Role', 'Can', 'Members', ''], $rows, 'No roles yet.') . '</section>' . $form . $members, $cfg, $page, $me);

case 'channels':
    $srv = ha_server();
    if (!$srv) ha_layout('Channels', '<p>Add a server first on the <a href="' . ha_url('servers') . '">Servers</a> page.</p>', $cfg, $page, $me);
    $sid = (int)$srv['id'];
    if ($post) {
        if ($act === 'save') {
            $id = (int)($_POST['id'] ?? 0);
            $name = strtolower(trim((string)preg_replace('/[^a-z0-9]+/i', '-', str($_POST['name'] ?? '', 40)), '-'));
            if ($name === '') ha_go(ha_url('channels') . '?m=' . urlencode('Give the channel a name.'));
            $row = ['name' => $name, 'topic' => str($_POST['topic'] ?? '', 200), 'icon' => isset(hub_icons()[$_POST['icon'] ?? '']) ? (string)$_POST['icon'] : 'hash', 'category' => str($_POST['category'] ?? '', 40),
                'staff_only' => isset($_POST['staff_only']) ? 1 : 0, 'read_only' => isset($_POST['read_only']) ? 1 : 0, 'view_roles' => ha_ids_in('view_roles'), 'post_roles' => ha_ids_in('post_roles'), 'server_id' => $sid];
            if ($id) update('chat_channels', $id, $row);
            else insert('chat_channels', $row + ['position' => (int)one('SELECT COALESCE(MAX(position),0)+1 AS p FROM chat_channels WHERE server_id=?', [$sid])['p'], 'created_at' => now()]);
            audit($who, 'app.channel-save', $srv['name'] . ' #' . $name);
            ha_go(ha_url('channels') . '?server=' . $sid . '&m=' . urlencode('Channel saved.'));
        }
        if ($act === 'delete') {
            $id = (int)($_POST['id'] ?? 0);
            q('DELETE FROM chat_channels WHERE id=?', [$id]); q('DELETE FROM chat_messages WHERE channel_id=? AND dm_id=0', [$id]);
            audit($who, 'app.channel-delete', '#' . $id);
            ha_go(ha_url('channels') . '?server=' . $sid . '&m=' . urlencode('Channel deleted.'));
        }
        if ($act === 'move') {
            $ids = array_map(fn($r) => (int)$r['id'], all('SELECT id FROM chat_channels WHERE server_id=? ORDER BY position, id', [$sid]));
            $i = array_search((int)($_POST['id'] ?? 0), $ids, true); $j = $i === false ? -1 : $i + (($_POST['dir'] ?? '') === 'up' ? -1 : 1);
            if ($i !== false && $j >= 0 && $j < count($ids)) { [$ids[$i], $ids[$j]] = [$ids[$j], $ids[$i]]; foreach ($ids as $n => $cid) q('UPDATE chat_channels SET position=? WHERE id=?', [$n + 1, $cid]); }
            ha_go(ha_url('channels') . '?server=' . $sid);
        }
    }
    $edit = isset($_GET['edit']) ? one('SELECT * FROM chat_channels WHERE id=? AND server_id=?', [(int)$_GET['edit'], $sid]) : null;
    $rname = array_column(all('SELECT id, name FROM hub_roles WHERE server_id=?', [$sid]), 'name', 'id');
    $who_txt = fn(string $csv) => implode(', ', array_map(fn($x) => h($rname[$x] ?? '?'), hub_ids($csv)));
    $rows = [];
    foreach (all('SELECT c.*, (SELECT COUNT(*) FROM chat_messages m WHERE m.channel_id=c.id AND m.dm_id=0 AND m.deleted=0) AS n FROM chat_channels c WHERE c.server_id=? ORDER BY c.position, c.id', [$sid]) as $ch) {
        $tools = $admin ? '<form method="post" class="tools">' . ha_csrf($c) . '<input type="hidden" name="server_id" value="' . $sid . '"><input type="hidden" name="id" value="' . (int)$ch['id'] . '">'
            . '<button class="btn btn--ghost btn--sm" name="_do" value="move" onclick="this.form.dir.value=\'up\'" title="Move up">&uarr;</button><input type="hidden" name="dir" value="down"><button class="btn btn--ghost btn--sm" name="_do" value="move" title="Move down">&darr;</button>'
            . '<a class="btn btn--ghost btn--sm" href="' . ha_url('channels') . '?server=' . $sid . '&edit=' . (int)$ch['id'] . '#form">Edit</a>'
            . '<button class="btn btn--ghost btn--sm" name="_do" value="delete" onclick="return confirm(\'Delete #' . h($ch['name']) . ' and all its messages?\')">Delete</button></form>' : '';
        $rows[] = ['<span class="chan">' . ha_icon((string)$ch['icon']) . '<b>' . h($ch['name']) . '</b></span><small>' . h($ch['topic']) . '</small>', h($ch['category'] ?: '-'),
            $ch['staff_only'] ? '<span class="tag">Staff only</span>' : ($ch['view_roles'] !== '' ? $who_txt((string)$ch['view_roles']) : 'Everyone'),
            ($ch['read_only'] ? '<span class="tag">Staff post</span> ' : '') . ($ch['post_roles'] !== '' ? $who_txt((string)$ch['post_roles']) : ($ch['read_only'] ? '' : 'Everyone')), number_format((int)$ch['n']), $tools];
    }
    $icons = '<div class="picker">';
    foreach (hub_icons() as $k => $i) if (empty($i['color'])) $icons .= '<label class="pick" title="' . h($i['label']) . '"><input type="radio" name="icon" value="' . h($k) . '"' . (($edit['icon'] ?? 'hash') === $k ? ' checked' : '') . '>' . ha_icon($k) . '<span>' . h($i['label']) . '</span></label>';
    $icons .= '</div>';
    $cats = array_column(all("SELECT DISTINCT category FROM chat_channels WHERE category<>'' AND server_id=? ORDER BY category", [$sid]), 'category');
    $form = $admin ? '<form method="post" class="card form" id="form">' . ha_csrf($c) . '<input type="hidden" name="_do" value="save"><input type="hidden" name="server_id" value="' . $sid . '"><input type="hidden" name="id" value="' . (int)($edit['id'] ?? 0) . '"><h2>' . ($edit ? 'Edit #' . h($edit['name']) : 'Add a channel to ' . h($srv['name'])) . '</h2>'
        . '<div class="row2"><label>Name<input name="name" maxlength="40" required value="' . h($edit['name'] ?? '') . '" placeholder="e.g. memes"></label><label>Category <small>(channels are grouped by it)</small><input name="category" maxlength="40" list="cats" value="' . h($edit['category'] ?? '') . '" placeholder="e.g. Community"></label></div>'
        . '<datalist id="cats">' . implode('', array_map(fn($x) => '<option value="' . h($x) . '">', $cats)) . '</datalist>'
        . '<label>Topic<input name="topic" maxlength="200" value="' . h($edit['topic'] ?? '') . '"></label><p class="hint">Icon</p>' . $icons
        . '<label class="check"><input type="checkbox" name="staff_only"' . (!empty($edit['staff_only']) ? ' checked' : '') . '> Staff only (hidden from members)</label><label class="check"><input type="checkbox" name="read_only"' . (!empty($edit['read_only']) ? ' checked' : '') . '> Only staff can post (announcements)</label>'
        . '<h3>Who can see it</h3><p class="hint">Tick roles to limit the channel to them. Nothing ticked: everyone can see it.</p>' . ha_role_boxes('view_roles', $sid, hub_ids((string)($edit['view_roles'] ?? '')))
        . '<h3>Who can post</h3><p class="hint">Tick roles to let only them post (they can also post in a staff-post channel). Nothing ticked: everyone who can see it.</p>' . ha_role_boxes('post_roles', $sid, hub_ids((string)($edit['post_roles'] ?? '')))
        . '<div class="actions"><button class="btn" type="submit">' . ($edit ? 'Save channel' : 'Add channel') . '</button>' . ($edit ? '<a class="btn btn--ghost" href="' . ha_url('channels') . '?server=' . $sid . '">Cancel</a>' : '') . '</div></form>' : '';
    ha_layout('Channels', '<p class="lead">The text channels of one server, in this order, grouped by category. Staff can always see and post everywhere.</p>' . ha_server_pick('channels', $srv) . '<section class="card">' . ha_table(['Channel', 'Category', 'Who can see', 'Who can post', 'Messages', ''], $rows) . '</section>' . $form, $cfg, $page, $me);

case 'messages':
    $fch = (int)($_GET['ch'] ?? ($_POST['ch'] ?? 0)); $fu = trim((string)($_GET['u'] ?? ($_POST['u'] ?? '')));
    if ($post && $act === 'msg-delete') {
        $mid = (int)($_POST['id'] ?? 0);
        q('UPDATE chat_messages SET deleted=1, edited_at=? WHERE id=? AND dm_id=0', [now(), $mid]);
        audit($who, 'app.delete-message', '#' . $mid);
        ha_go(ha_url('messages') . '?' . http_build_query(array_filter(['ch' => $fch ?: '', 'u' => $fu, 'm' => 'Message deleted.'])));
    }
    $where = 'm.dm_id=0'; $args = [];
    if ($fch) { $where .= ' AND m.channel_id=?'; $args[] = $fch; }
    if ($fu !== '') { $where .= ' AND (u.username LIKE ? OR u.discord_id=? OR u.roblox_username LIKE ?)'; array_push($args, '%' . $fu . '%', $fu, '%' . $fu . '%'); }
    $rows = [];
    foreach (all('SELECT m.*, u.username, u.discord_id, u.roblox_username, c.name AS ch, c.icon FROM chat_messages m JOIN users u ON u.id=m.user_id LEFT JOIN chat_channels c ON c.id=m.channel_id WHERE ' . $where . ' ORDER BY m.id DESC LIMIT 150', $args) as $r)
        $rows[] = ['<b>' . h($r['username']) . '</b><small>' . h($r['discord_id']) . ($r['roblox_username'] ? ' · ' . h($r['roblox_username']) : '') . '</small>', '<span class="chan">' . ha_icon((string)($r['icon'] ?? 'hash')) . h((string)$r['ch']) . '</span>', ha_ago($r['created_at']),
            (int)$r['deleted'] ? '<i class="mute">deleted</i>' : nl2br(h($r['body'])) . ($r['edited_at'] ? ' <small>(edited)</small>' : ''),
            (int)$r['deleted'] ? '' : '<form method="post">' . ha_csrf($c) . '<input type="hidden" name="_do" value="msg-delete"><input type="hidden" name="id" value="' . (int)$r['id'] . '"><input type="hidden" name="ch" value="' . $fch . '"><input type="hidden" name="u" value="' . h($fu) . '"><button class="btn btn--ghost btn--sm" onclick="return confirm(\'Delete this message for everyone?\')">Delete</button></form>'];
    $opts = '<option value="">All channels</option>';
    foreach (all('SELECT c.id, c.name, s.name AS sname FROM chat_channels c LEFT JOIN hub_servers s ON s.id=c.server_id ORDER BY s.position, c.position, c.id') as $ch) $opts .= '<option value="' . (int)$ch['id'] . '"' . ($fch === (int)$ch['id'] ? ' selected' : '') . '>' . h((string)$ch['sname']) . ' · #' . h($ch['name']) . '</option>';
    ha_layout('Messages', '<p class="lead">The latest messages in the app\'s channels. Direct messages are private and not shown here.</p><form method="get" class="filter"><select name="ch">' . $opts . '</select><input name="u" value="' . h($fu) . '" placeholder="Member name or Discord ID"><button class="btn btn--ghost" type="submit">Filter</button></form>'
        . '<section class="card">' . ha_table(['Member', 'Channel', 'When', 'Message', ''], $rows, 'No messages.') . '</section>', $cfg, $page, $me);

case 'account':
     
    $did = (string)$me['discord_id'];
    $acct = one('SELECT * FROM users WHERE app_login IS NOT NULL AND hub_discord_id=? ORDER BY id LIMIT 1', [$did]);
    if ($post && $act === 'create' && !$acct) {
        $name = trim((string)($_POST['username'] ?? '')); $email = strtolower(trim((string)($_POST['email'] ?? ''))); $pw = (string)($_POST['password'] ?? '');
        $err = hub_username_problem($name, true) ?? hub_password_problem($pw, $name);
        if (!$err && $pw !== (string)($_POST['password2'] ?? '')) $err = 'The two passwords are not the same.';
        if (!$err && (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190)) $err = 'Enter a real email address.';
        if (!$err && one('SELECT id FROM users WHERE app_login IS NOT NULL AND LOWER(email)=?', [$email])) $err = 'That email already has an app account.';
        if ($err) ha_go(ha_url('account') . '?m=' . urlencode($err));
        $id = insert('users', ['discord_id' => 'app-' . bin2hex(random_bytes(10)), 'username' => $name, 'app_login' => strtolower($name), 'password_hash' => password_hash($pw, PASSWORD_DEFAULT),
            'email' => $email, 'hub_discord_id' => $did, 'created_at' => now()]);
        audit($who, 'hub.owner-account', '@' . $name . ' (app account #' . $id . ')');
        ha_go(ha_url('account') . '?m=' . urlencode('Your app account @' . $name . ' is ready. Sign in to the app with it; you will verify your email the first time.'));
    }
    if ($acct) {
        $body = '<section class="card"><h2>@' . h($acct['app_login']) . '</h2><p class="hint">Your app account, linked to your Discord, so your owner rank works in the app.</p>'
            . ha_table(['', ''], [['Username', '@' . h($acct['app_login'])], ['Email', h((string)$acct['email']) . ($acct['email_verified_at'] ? ' <span class="tag">verified</span>' : ' <span class="tag tag--bad">verify it when you sign in</span>')],
                ['Two-factor', $acct['totp_enabled_at'] ? '<span class="tag">on</span>' : '<span class="tag tag--bad">off: turn it on in the app (Settings, Security)</span>'], ['Created', ha_ago($acct['created_at'])], ['Last sign-in', ha_ago($acct['last_login_at'])]])
            . '<div class="actions"><a class="btn" href="/hub" target="_blank" rel="noopener">Open the app</a></div><p class="hint">Forgot the password? Use "Forgot your password?" on the app sign-in screen.</p></section>';
    } else {
        $body = '<form method="post" class="card form">' . ha_csrf($c) . '<input type="hidden" name="_do" value="create"><h2>Make your app account</h2>'
            . '<p class="hint">App accounts are separate from Discord. As the owner you can take a reserved username like <b>axio</b>. It is linked to your Discord, so your owner rank works in the app.</p>'
            . '<div class="row2"><label>Username<input name="username" maxlength="20" required value="axio" autocomplete="username"></label><label>Email<input name="email" type="email" maxlength="190" required autocomplete="email"></label></div>'
            . '<div class="row2"><label>Password <small>(8+ characters, a letter and a number)</small><input name="password" type="password" required autocomplete="new-password"></label><label>Confirm password<input name="password2" type="password" required autocomplete="new-password"></label></div>'
            . '<button class="btn" type="submit">Create my app account</button></form>';
    }
    ha_layout('Your app account', '<p class="lead">Your own account for the app, to sign in with a username and password like everyone else.</p>' . $body, $cfg, $page, $me);

case 'members':
    if ($post && $act === 'verify-email') {
        $target = one('SELECT * FROM users WHERE id=? AND app_login IS NOT NULL AND email_verified_at IS NULL', [(int)($_POST['id'] ?? 0)]);
        if (!$target) ha_go(ha_url('members') . '?m=' . urlencode('That account is already verified, or does not exist.'));
        q('UPDATE users SET email_verified_at=?, email_code_hash=NULL, email_code_expires=NULL WHERE id=?', [now(), $target['id']]);
        audit($who, 'app.verify-email', (string)$target['username']);
        ha_go(ha_url('members') . '?m=' . urlencode($target['username'] . ' is verified and can use the app now.'));
    }
    if ($post && in_array($act, ['mute', 'unmute'], true)) {
        $uid = (int)($_POST['id'] ?? 0);
        $target = one('SELECT * FROM users WHERE id=?', [$uid]);
        if (!$target) ha_go(ha_url('members') . '?m=' . urlencode('Member not found.'));
        if ($act === 'mute' && staff_rank($target) >= $rank) ha_go(ha_url('members') . '?m=' . urlencode('You cannot mute someone with the same or a higher staff rank.'));
        $hours = max(1, min(24 * 30, (int)($_POST['hours'] ?? 24)));
        q('UPDATE users SET hub_muted_until=? WHERE id=?', [$act === 'mute' ? gmdate('Y-m-d H:i:s', time() + $hours * 3600) : null, $uid]);
        audit($who, 'app.' . $act, (string)$target['username'] . ($act === 'mute' ? ' for ' . $hours . ' h' : ''));
        ha_go(ha_url('members') . '?m=' . urlencode($act === 'mute' ? $target['username'] . ' is muted in the app for ' . $hours . ' hours.' : $target['username'] . ' can chat again.'));
    }
    $fq = trim((string)($_GET['q'] ?? ''));
    $args = []; $where = 'u.hub_seen IS NOT NULL';
    if ($fq !== '') { $where .= ' AND (u.username LIKE ? OR u.discord_id=? OR u.roblox_username LIKE ?)'; array_push($args, '%' . $fq . '%', $fq, '%' . $fq . '%'); }
    $rows = [];
    foreach (all('SELECT u.*, (SELECT COUNT(*) FROM chat_messages m WHERE m.user_id=u.id AND m.deleted=0) AS n FROM users u WHERE ' . $where . ' ORDER BY u.hub_seen DESC LIMIT 200', $args) as $u) {
        $muted = (string)($u['hub_muted_until'] ?? '') > now();
        $rows[] = ['<b>' . h($u['username']) . '</b><small>' . h($u['discord_id']) . '</small>', $u['roblox_verified_at'] ? h($u['roblox_username']) : '<span class="mute">not linked</span>',
            ha_ago($u['hub_seen']), number_format((int)$u['n']), $muted ? '<span class="tag tag--bad">Muted until ' . h(substr((string)$u['hub_muted_until'], 0, 16)) . ' UTC</span>' : (staff_role($u) ? '<span class="tag">' . h((string)staff_role($u)) . '</span>' : ''),
            '<form method="post" class="tools">' . ha_csrf($c) . '<input type="hidden" name="id" value="' . (int)$u['id'] . '">' . ($muted ? '<button class="btn btn--ghost btn--sm" name="_do" value="unmute">Unmute</button>'
                : '<select name="hours"><option value="1">1 hour</option><option value="24" selected>24 hours</option><option value="168">7 days</option><option value="720">30 days</option></select><button class="btn btn--ghost btn--sm" name="_do" value="mute">Mute</button>') . '</form>'];
    }
    $wrows = [];
    foreach (all('SELECT * FROM users WHERE app_login IS NOT NULL AND email_verified_at IS NULL ORDER BY created_at DESC LIMIT 50') as $u)
        $wrows[] = ['<b>' . h($u['username']) . '</b><small>@' . h($u['app_login']) . '</small>', h((string)$u['email']), ha_ago($u['created_at']),
            $admin ? '<form method="post" class="tools">' . ha_csrf($c) . '<input type="hidden" name="id" value="' . (int)$u['id'] . '"><button class="btn btn--ghost btn--sm" name="_do" value="verify-email">Mark email verified</button></form>' : ''];
    $waiting = $wrows ? '<section class="card"><h2>Waiting for email verification</h2><p class="lead">Only mark someone verified if you know the email is theirs.</p>' . ha_table(['Account', 'Email', 'Made', ''], $wrows, '') . '</section>' : '';
    ha_layout('Members', '<p class="lead">Everyone who has used the app, most recent first. A muted member can still read, but cannot post in channels or direct messages. Bans are done in the <a href="/staff/users">Discord panel</a>.</p>'
        . (setting('mail_last_error') ? '<p class="lead"><b>Last email problem:</b> ' . h((string)setting('mail_last_error')) . ' Set the mailbox in the <a href="/staff/settings">Discord panel settings</a>.</p>' : '')
        . $waiting
        . '<form method="get" class="filter"><input name="q" value="' . h($fq) . '" placeholder="Name, Discord ID or Roblox username"><button class="btn btn--ghost" type="submit">Search</button></form>'
        . '<section class="card">' . ha_table(['Member', 'Roblox', 'Last seen', 'Messages', '', ''], $rows, 'Nobody has used the app yet.') . '</section>', $cfg, $page, $me);

default:
    http_response_code(404);
    ha_layout('Not found', '<p>That page does not exist.</p>', $cfg, '', $me);
}
