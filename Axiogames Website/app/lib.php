<?php
 
declare(strict_types=1);

 
const DEPTS = ['Content' => 1, 'Appeals' => 2, 'Scam Investigation' => 3, 'Support' => 4, 'Moderation' => 5, 'Administration' => 6, 'Management' => 7, 'Leadership' => 8];
const MGMT_RANK = 7;

function cfg(string $k, $d = null) {
    static $c = null;
    if ($c === null) { $c = require __DIR__ . '/config.php'; }
    return $c[$k] ?? $d;
}
function is_dev(): bool { return cfg('env') === 'dev'; }
function now(): string { return gmdate('Y-m-d H:i:s'); }
function plus(string $spec): string { return gmdate('Y-m-d H:i:s', strtotime($spec)); }
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function is_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}
function base_url(): string { return rtrim((string)cfg('base_url', ''), '/'); }
 
function founder_id(): string {
    try { $o = (string)setting('owner_discord_id'); if ($o !== '') return $o; } catch (Throwable $e) {   }
    return (string)cfg('founder_id', '380353557578383361');
}
 
function align_founder(PDO $p): void {
    $fid = founder_id();
    $row = $p->query("SELECT id, discord_id FROM team_members WHERE source='founder' LIMIT 1")->fetch();
    if (!$row || $row['discord_id'] === $fid) return;
    $p->prepare("DELETE FROM team_members WHERE discord_id=? AND source<>'founder'")->execute([$fid]);
    $av = $p->prepare('SELECT avatar FROM users WHERE discord_id=?'); $av->execute([$fid]); $a = $av->fetch();
    $p->prepare('UPDATE team_members SET discord_id=?, avatar=?, updated_at=? WHERE id=?')->execute([$fid, $a ? $a['avatar'] : null, now(), $row['id']]);
}

 
function db(): PDO {
    static $p = null;
    if ($p) return $p;
    $p = new PDO((string)cfg('db_dsn'), cfg('db_user'), cfg('db_pass'), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    migrate($p);
    return $p;
}
function sqlite(): bool { return str_starts_with((string)cfg('db_dsn'), 'sqlite'); }
function q(string $sql, array $params = []): PDOStatement {
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}
function one(string $sql, array $params = []): ?array { $r = q($sql, $params)->fetch(); return $r ?: null; }
function all(string $sql, array $params = []): array { return q($sql, $params)->fetchAll(); }
function insert(string $table, array $row): int {
    $cols = array_keys($row);
    q('INSERT INTO ' . $table . ' (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')', array_values($row));
    return (int)db()->lastInsertId();
}
function update(string $table, int $id, array $row): void {
    $set = implode(',', array_map(fn($c) => "$c=?", array_keys($row)));
    q("UPDATE $table SET $set WHERE id=?", [...array_values($row), $id]);
}

function migrate(PDO $p): void {
    $ver = 41;
    try {
        $r = $p->query("SELECT v FROM settings WHERE k='schema'")->fetch();
        if ($r && (int)$r['v'] >= $ver) return;
    } catch (Throwable $e) {   }
    $lite = sqlite();
    $pk = $lite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY';
    $tail = $lite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    $long = $lite ? 'TEXT' : 'MEDIUMTEXT';
     
    foreach (['levels', 'afk'] as $tbl) {
        try { $p->query("SELECT guild_id FROM $tbl LIMIT 1"); } catch (Throwable $e) { try { $p->exec("DROP TABLE IF EXISTS $tbl"); } catch (Throwable $e2) {   } }
    }
    $t = [
    "settings (k VARCHAR(64) NOT NULL PRIMARY KEY, v TEXT)",
    "users (id $pk, discord_id VARCHAR(32) NOT NULL UNIQUE, username VARCHAR(80) NOT NULL, avatar VARCHAR(80), email VARCHAR(190), email_verified_at VARCHAR(19), seller_verified INT NOT NULL DEFAULT 0, banned INT NOT NULL DEFAULT 0, created_at VARCHAR(19) NOT NULL, last_login_at VARCHAR(19))",
    "staff (id $pk, discord_id VARCHAR(32) NOT NULL UNIQUE, role VARCHAR(16) NOT NULL, added_by VARCHAR(80), created_at VARCHAR(19) NOT NULL)",
    "sessions (id VARCHAR(64) NOT NULL PRIMARY KEY, user_id BIGINT NOT NULL, csrf VARCHAR(40) NOT NULL, created_at VARCHAR(19) NOT NULL, expires_at VARCHAR(19) NOT NULL)",
    "ratelimit (k VARCHAR(120) NOT NULL PRIMARY KEY, win BIGINT NOT NULL, cnt INT NOT NULL)",
    "reports (id $pk, ref VARCHAR(16), user_id BIGINT NOT NULL, scammer_name VARCHAR(80) NOT NULL, scammer_discord_id VARCHAR(32), platform VARCHAR(60), type VARCHAR(24) NOT NULL, description TEXT NOT NULL, evidence VARCHAR(1000), status VARCHAR(12) NOT NULL DEFAULT 'pending', public_summary VARCHAR(600), published INT NOT NULL DEFAULT 0, staff_note TEXT, reviewed_by VARCHAR(80), reviewed_at VARCHAR(19), published_at VARCHAR(19), created_at VARCHAR(19) NOT NULL)",
    "jobs (id $pk, title VARCHAR(120) NOT NULL, area VARCHAR(40) NOT NULL, description TEXT NOT NULL, status VARCHAR(10) NOT NULL DEFAULT 'open', created_at VARCHAR(19) NOT NULL)",
    "applications (id $pk, user_id BIGINT NOT NULL, job_id BIGINT, area VARCHAR(40) NOT NULL, portfolio VARCHAR(400), message TEXT NOT NULL, status VARCHAR(12) NOT NULL DEFAULT 'new', staff_note TEXT, reviewed_by VARCHAR(80), created_at VARCHAR(19) NOT NULL)",
    "listings (id $pk, user_id BIGINT, title VARCHAR(120) NOT NULL, category VARCHAR(24) NOT NULL, description TEXT NOT NULL, price_text VARCHAR(60), status VARCHAR(10) NOT NULL DEFAULT 'pending', created_at VARCHAR(19) NOT NULL)",
    "messages (id $pk, user_id BIGINT, name VARCHAR(80) NOT NULL, email VARCHAR(190) NOT NULL, topic VARCHAR(40), message TEXT NOT NULL, status VARCHAR(8) NOT NULL DEFAULT 'new', created_at VARCHAR(19) NOT NULL)",
    "api_keys (id $pk, name VARCHAR(60) NOT NULL, scope VARCHAR(16) NOT NULL, key_hash VARCHAR(64) NOT NULL UNIQUE, active INT NOT NULL DEFAULT 1, created_by VARCHAR(80), last_used_at VARCHAR(19), created_at VARCHAR(19) NOT NULL)",
    "bot_status (scope VARCHAR(16) NOT NULL PRIMARY KEY, info VARCHAR(400), last_seen VARCHAR(19) NOT NULL)",
    "tickets (id $pk, guild_id VARCHAR(32) NOT NULL DEFAULT '', ref VARCHAR(16), discord_user_id VARCHAR(32) NOT NULL, discord_username VARCHAR(80), channel_id VARCHAR(32), category VARCHAR(40), subject VARCHAR(200), status VARCHAR(10) NOT NULL DEFAULT 'open', claimed_by VARCHAR(80), transcript $long, closed_by VARCHAR(80), created_at VARCHAR(19) NOT NULL, closed_at VARCHAR(19))",
    "mod_actions (id $pk, guild_id VARCHAR(32), action VARCHAR(12) NOT NULL, target_id VARCHAR(32) NOT NULL, target_name VARCHAR(80), moderator_id VARCHAR(32), moderator_name VARCHAR(80), reason VARCHAR(500), duration_minutes INT, created_at VARCHAR(19) NOT NULL)",
    "announcements (id $pk, title VARCHAR(120) NOT NULL, body TEXT NOT NULL, kind VARCHAR(12) NOT NULL DEFAULT 'news', status VARCHAR(10) NOT NULL DEFAULT 'draft', posted_message_id VARCHAR(32), posted_at VARCHAR(19), created_by VARCHAR(80), created_at VARCHAR(19) NOT NULL)",
    "audit (id $pk, actor VARCHAR(80), action VARCHAR(60) NOT NULL, detail VARCHAR(300), created_at VARCHAR(19) NOT NULL)",
     
    "team_members (id $pk, discord_id VARCHAR(32) NOT NULL UNIQUE, name VARCHAR(80) NOT NULL, avatar VARCHAR(80), departments VARCHAR(300), titles VARCHAR(400), post_approver INT NOT NULL DEFAULT 0, visible INT NOT NULL DEFAULT 1, source VARCHAR(10) NOT NULL DEFAULT 'sync', updated_at VARCHAR(19) NOT NULL)",
    "role_map (id $pk, discord_role_id VARCHAR(32) NOT NULL UNIQUE, role_name VARCHAR(100), department VARCHAR(24), title VARCHAR(60), access VARCHAR(10) NOT NULL DEFAULT 'none', post_approver INT NOT NULL DEFAULT 0, show_team INT NOT NULL DEFAULT 1, created_at VARCHAR(19) NOT NULL)",
    "guild_roles (role_id VARCHAR(32) NOT NULL PRIMARY KEY, name VARCHAR(100), color INT NOT NULL DEFAULT 0, position INT NOT NULL DEFAULT 0, updated_at VARCHAR(19) NOT NULL)",
    "games (id $pk, slug VARCHAR(40) NOT NULL UNIQUE, name VARCHAR(80) NOT NULL, platform VARCHAR(12) NOT NULL DEFAULT 'roblox', status VARCHAR(16) NOT NULL DEFAULT 'planned', tagline VARCHAR(200), description TEXT, play_url VARCHAR(300), place_id VARCHAR(20), universe_id VARCHAR(20), sort INT NOT NULL DEFAULT 0, featured INT NOT NULL DEFAULT 0, playing BIGINT, visits BIGINT, favorites BIGINT, likes BIGINT, dislikes BIGINT, stats_at VARCHAR(19))",
     
    "bot_config (k VARCHAR(64) NOT NULL PRIMARY KEY, v VARCHAR(300))",
    "levels (guild_id VARCHAR(32) NOT NULL, user_id VARCHAR(32) NOT NULL, name VARCHAR(80), xp BIGINT NOT NULL DEFAULT 0, messages BIGINT NOT NULL DEFAULT 0, last_xp_at BIGINT NOT NULL DEFAULT 0, PRIMARY KEY (guild_id, user_id))",
    "afk (guild_id VARCHAR(32) NOT NULL, user_id VARCHAR(32) NOT NULL, reason VARCHAR(200), since VARCHAR(19) NOT NULL, PRIMARY KEY (guild_id, user_id))",
    "suggestions (id $pk, guild_id VARCHAR(32) NOT NULL DEFAULT '', user_id VARCHAR(32) NOT NULL, user_name VARCHAR(80), text VARCHAR(1500) NOT NULL, channel_id VARCHAR(32), message_id VARCHAR(32), status VARCHAR(12) NOT NULL DEFAULT 'open', staff_note VARCHAR(500), decided_by VARCHAR(80), notified INT NOT NULL DEFAULT 1, created_at VARCHAR(19) NOT NULL)",
    "rules (id $pk, guild_id VARCHAR(32) NOT NULL DEFAULT '', num INT NOT NULL DEFAULT 0, title VARCHAR(100) NOT NULL, body TEXT NOT NULL)",
    "bot_guilds (scope VARCHAR(16) NOT NULL, guild_id VARCHAR(32) NOT NULL, name VARCHAR(100), members INT, updated_at VARCHAR(19) NOT NULL, PRIMARY KEY (scope, guild_id))",
     
    "hub_backup_codes (id $pk, user_id BIGINT NOT NULL, code_hash VARCHAR(64) NOT NULL, used_at VARCHAR(19))",
    "hub_pending (id $pk, token_hash VARCHAR(64) NOT NULL UNIQUE, user_id BIGINT NOT NULL, tries INT NOT NULL DEFAULT 0, expires_at VARCHAR(19) NOT NULL)",
    "hub_banners (user_id BIGINT NOT NULL PRIMARY KEY, mime VARCHAR(20) NOT NULL, data $long, updated_at VARCHAR(19) NOT NULL)",
    "friends (id $pk, user_a BIGINT NOT NULL, user_b BIGINT NOT NULL, requester BIGINT NOT NULL, status VARCHAR(10) NOT NULL DEFAULT 'pending', created_at VARCHAR(19) NOT NULL, updated_at VARCHAR(19) NOT NULL)",
    "blocks (user_id BIGINT NOT NULL, blocked_id BIGINT NOT NULL, created_at VARCHAR(19) NOT NULL, PRIMARY KEY (user_id, blocked_id))",
    "hub_avatars (user_id BIGINT NOT NULL PRIMARY KEY, mime VARCHAR(20) NOT NULL, data $long, updated_at VARCHAR(19) NOT NULL)",
    "hub_servers (id $pk, name VARCHAR(40) NOT NULL, description VARCHAR(200), icon VARCHAR(30) NOT NULL DEFAULT 'brand', game_slug VARCHAR(40), accent VARCHAR(7), position INT NOT NULL DEFAULT 0, staff_only INT NOT NULL DEFAULT 0, icon_at VARCHAR(19), created_at VARCHAR(19) NOT NULL)",
    "hub_server_icons (server_id BIGINT NOT NULL PRIMARY KEY, mime VARCHAR(20) NOT NULL, data $long, updated_at VARCHAR(19) NOT NULL)",
    "hub_roles (id $pk, server_id BIGINT NOT NULL, name VARCHAR(40) NOT NULL, color VARCHAR(7), icon VARCHAR(30), position INT NOT NULL DEFAULT 0, hoist INT NOT NULL DEFAULT 0, perms VARCHAR(200) NOT NULL DEFAULT '', created_at VARCHAR(19) NOT NULL)",
    "hub_member_roles (role_id BIGINT NOT NULL, user_id BIGINT NOT NULL, server_id BIGINT NOT NULL, added_at VARCHAR(19) NOT NULL, PRIMARY KEY (role_id, user_id))",
    "qr_logins (id $pk, token_hash VARCHAR(64) NOT NULL UNIQUE, secret_hash VARCHAR(64) NOT NULL, status VARCHAR(10) NOT NULL DEFAULT 'pending', user_id BIGINT, device VARCHAR(160), ip VARCHAR(64), created_at VARCHAR(19) NOT NULL, expires_at VARCHAR(19) NOT NULL)",
    "chat_channels (id $pk, name VARCHAR(40) NOT NULL, topic VARCHAR(200), position INT NOT NULL DEFAULT 0, staff_only INT NOT NULL DEFAULT 0, read_only INT NOT NULL DEFAULT 0, created_at VARCHAR(19) NOT NULL)",
    "chat_messages (id $pk, channel_id BIGINT NOT NULL DEFAULT 0, dm_id BIGINT NOT NULL DEFAULT 0, user_id BIGINT NOT NULL, body TEXT NOT NULL, reply_to BIGINT, created_at VARCHAR(19) NOT NULL, edited_at VARCHAR(19), deleted INT NOT NULL DEFAULT 0)",
    "chat_dms (id $pk, user_a BIGINT NOT NULL, user_b BIGINT NOT NULL, last_at VARCHAR(19), created_at VARCHAR(19) NOT NULL)",
    "chat_reads (user_id BIGINT NOT NULL, k VARCHAR(24) NOT NULL, last_id BIGINT NOT NULL DEFAULT 0, PRIMARY KEY (user_id, k))",
    "pending_bans (id $pk, discord_id VARCHAR(32) NOT NULL, reason VARCHAR(500), by_name VARCHAR(80), source VARCHAR(40), status VARCHAR(10) NOT NULL DEFAULT 'waiting', result TEXT, created_at VARCHAR(19) NOT NULL, done_at VARCHAR(19))",
    "ticket_notes (id $pk, ticket_id BIGINT NOT NULL, body TEXT NOT NULL, author VARCHAR(80), created_at VARCHAR(19) NOT NULL, updated_at VARCHAR(19) NOT NULL)",
    "ticket_messages (id $pk, ticket_id BIGINT NOT NULL, author_type VARCHAR(8) NOT NULL, author_name VARCHAR(80), kind VARCHAR(10) NOT NULL DEFAULT 'message', content TEXT NOT NULL, delivered INT NOT NULL DEFAULT 1, created_at VARCHAR(19) NOT NULL)",
    "helper_kb (id $pk, title VARCHAR(120) NOT NULL, keywords VARCHAR(400), answer TEXT NOT NULL, link VARCHAR(300), enabled INT NOT NULL DEFAULT 1, created_at VARCHAR(19) NOT NULL)",
    "helper_log (id $pk, question VARCHAR(400) NOT NULL, user_id VARCHAR(32), answered INT NOT NULL DEFAULT 0, created_at VARCHAR(19) NOT NULL)",
     
    "giveaways (id $pk, guild_id VARCHAR(32) NOT NULL, kind VARCHAR(10) NOT NULL DEFAULT 'giveaway', title VARCHAR(200) NOT NULL, description TEXT, winners_count INT NOT NULL DEFAULT 1, channel_id VARCHAR(32), message_id VARCHAR(32), host_id VARCHAR(32), host_name VARCHAR(80), required_role_id VARCHAR(32), starts_at VARCHAR(19), ends_at VARCHAR(19), status VARCHAR(10) NOT NULL DEFAULT 'active', winners TEXT, past_winners TEXT, ended_at VARCHAR(19), created_at VARCHAR(19) NOT NULL)",
     
    "bot_channels (guild_id VARCHAR(32) NOT NULL, channel_id VARCHAR(32) NOT NULL, name VARCHAR(100), category VARCHAR(100), position INT NOT NULL DEFAULT 0, updated_at VARCHAR(19) NOT NULL, PRIMARY KEY (guild_id, channel_id))",
    "custom_messages (id $pk, guild_id VARCHAR(32) NOT NULL, channel_id VARCHAR(32) NOT NULL, payload $long NOT NULL, status VARCHAR(10) NOT NULL DEFAULT 'queued', error VARCHAR(300), message_id VARCHAR(32), created_by VARCHAR(80), created_at VARCHAR(19) NOT NULL, sent_at VARCHAR(19))",
     
    "muted_roles (guild_id VARCHAR(32) NOT NULL, user_id VARCHAR(32) NOT NULL, role_ids TEXT, muted_by VARCHAR(80), created_at VARCHAR(19) NOT NULL, PRIMARY KEY (guild_id, user_id))",
     
    "community_teams (id $pk, guild_id VARCHAR(32) NOT NULL, name VARCHAR(40) NOT NULL, owner_id VARCHAR(32) NOT NULL, member_ids TEXT, role_id VARCHAR(32), created_at VARCHAR(19) NOT NULL)",
    "community_vcs (guild_id VARCHAR(32) NOT NULL, channel_id VARCHAR(32) NOT NULL, owner_id VARCHAR(32) NOT NULL, team_only INT NOT NULL DEFAULT 0, locked INT NOT NULL DEFAULT 0, created_at VARCHAR(19) NOT NULL, PRIMARY KEY (guild_id, channel_id))",
     
    "subscriptions (id $pk, user_id BIGINT, discord_id VARCHAR(32), tier VARCHAR(12) NOT NULL, status VARCHAR(20) NOT NULL, stripe_customer VARCHAR(64), stripe_sub VARCHAR(64) NOT NULL UNIQUE, period_end VARCHAR(19), cancel_at_end INT NOT NULL DEFAULT 0, created_at VARCHAR(19) NOT NULL, updated_at VARCHAR(19) NOT NULL)",
     
    "msg_log (id $pk, guild_id VARCHAR(32) NOT NULL, channel_id VARCHAR(32) NOT NULL, channel_name VARCHAR(100), message_id VARCHAR(32) NOT NULL UNIQUE, author_id VARCHAR(32) NOT NULL, author_name VARCHAR(100), author_avatar VARCHAR(300), is_bot INT NOT NULL DEFAULT 0, content TEXT, attachments TEXT, links TEXT, has_image INT NOT NULL DEFAULT 0, has_link INT NOT NULL DEFAULT 0, has_file INT NOT NULL DEFAULT 0, reply_to VARCHAR(32), status VARCHAR(8) NOT NULL DEFAULT 'sent', created_at VARCHAR(19) NOT NULL, edited_at VARCHAR(19), deleted_at VARCHAR(19))",
    "msg_edits (id $pk, message_id VARCHAR(32) NOT NULL, before_content TEXT, after_content TEXT, at VARCHAR(19) NOT NULL)",
    "msg_images (id $pk, message_id VARCHAR(32) NOT NULL, attachment_id VARCHAR(32) NOT NULL, name VARCHAR(200), mime VARCHAR(40), size INT NOT NULL DEFAULT 0, data LONGTEXT, created_at VARCHAR(19) NOT NULL)",
     
    "breaks (id $pk, guild_id VARCHAR(32) NOT NULL, kind VARCHAR(8) NOT NULL, user_id VARCHAR(32) NOT NULL, user_name VARCHAR(80), reason VARCHAR(500), starts_at VARCHAR(19) NOT NULL, ends_at VARCHAR(19) NOT NULL, status VARCHAR(10) NOT NULL DEFAULT 'active', notified INT NOT NULL DEFAULT 0, channel_id VARCHAR(32), message_id VARCHAR(32), ended_by VARCHAR(80), ended_at VARCHAR(19), created_at VARCHAR(19) NOT NULL)",
    "dev_status (guild_id VARCHAR(32) NOT NULL, user_id VARCHAR(32) NOT NULL, user_name VARCHAR(80), status VARCHAR(10) NOT NULL DEFAULT 'closed', prev_status VARCHAR(10), updated_at VARCHAR(19) NOT NULL, PRIMARY KEY (guild_id, user_id))",
     
    "site_errors (id $pk, at VARCHAR(19) NOT NULL, path VARCHAR(160), scope VARCHAR(16), message VARCHAR(500))",
     
    "server_roles (guild_id VARCHAR(32) NOT NULL, role_id VARCHAR(32) NOT NULL, name VARCHAR(100), color INT NOT NULL DEFAULT 0, position INT NOT NULL DEFAULT 0, managed INT NOT NULL DEFAULT 0, updated_at VARCHAR(19) NOT NULL, PRIMARY KEY (guild_id, role_id))",
    "giveaway_entries (giveaway_id BIGINT NOT NULL, user_id VARCHAR(32) NOT NULL, user_name VARCHAR(80), created_at VARCHAR(19) NOT NULL, PRIMARY KEY (giveaway_id, user_id))",
    ];
    foreach ($t as $def) { $p->exec('CREATE TABLE IF NOT EXISTS ' . $def . $tail); }
    foreach ([
        'ALTER TABLE users ADD COLUMN roblox_id VARCHAR(20)', 'ALTER TABLE users ADD COLUMN roblox_username VARCHAR(40)', 'ALTER TABLE users ADD COLUMN roblox_verified_at VARCHAR(19)',
        'ALTER TABLE users ADD COLUMN roblox_code VARCHAR(24)', 'ALTER TABLE users MODIFY roblox_code VARCHAR(64)', 'ALTER TABLE users ADD COLUMN roblox_code_expires VARCHAR(19)',
        'ALTER TABLE reports ADD COLUMN scammer_roblox_id VARCHAR(20)', 'ALTER TABLE listings ADD COLUMN approved_by VARCHAR(80)',
        "ALTER TABLE staff ADD COLUMN source VARCHAR(8) NOT NULL DEFAULT 'manual'",
        'ALTER TABLE mod_actions ADD COLUMN cleared INT NOT NULL DEFAULT 0', 'ALTER TABLE users ADD COLUMN server_verified_at VARCHAR(19)',
        "ALTER TABLE tickets ADD COLUMN guild_id VARCHAR(32) NOT NULL DEFAULT ''", 'ALTER TABLE tickets ADD COLUMN reported_id VARCHAR(32)', 'ALTER TABLE tickets ADD COLUMN priority INT NOT NULL DEFAULT 0', 'ALTER TABLE games ADD COLUMN release_text VARCHAR(60)', 'ALTER TABLE tickets ADD COLUMN scam_result VARCHAR(12)', 'ALTER TABLE users ADD COLUMN hub_seen VARCHAR(19)', 'ALTER TABLE tickets ADD COLUMN source VARCHAR(10)', "ALTER TABLE chat_channels ADD COLUMN icon VARCHAR(20) NOT NULL DEFAULT 'hash'", "ALTER TABLE chat_channels ADD COLUMN category VARCHAR(40) NOT NULL DEFAULT ''", 'ALTER TABLE chat_channels ADD COLUMN server_id BIGINT NOT NULL DEFAULT 0', "ALTER TABLE chat_channels ADD COLUMN view_roles VARCHAR(500) NOT NULL DEFAULT ''", "ALTER TABLE chat_channels ADD COLUMN post_roles VARCHAR(500) NOT NULL DEFAULT ''", 'ALTER TABLE users ADD COLUMN hub_muted_until VARCHAR(19)', 'ALTER TABLE users ADD COLUMN hub_name VARCHAR(40)', 'ALTER TABLE users ADD COLUMN hub_bio VARCHAR(300)', 'ALTER TABLE users ADD COLUMN hub_pronouns VARCHAR(30)', 'ALTER TABLE users ADD COLUMN hub_banner VARCHAR(7)', "ALTER TABLE users ADD COLUMN hub_status VARCHAR(10) NOT NULL DEFAULT 'online'", 'ALTER TABLE users ADD COLUMN hub_custom_status VARCHAR(80)', 'ALTER TABLE users ADD COLUMN hub_avatar_at VARCHAR(19)', 'ALTER TABLE users ADD COLUMN hub_prefs TEXT', 'ALTER TABLE sessions ADD COLUMN kind VARCHAR(8)', 'ALTER TABLE users ADD COLUMN app_login VARCHAR(32)', 'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)', 'ALTER TABLE users ADD COLUMN email_code_hash VARCHAR(64)', 'ALTER TABLE users ADD COLUMN email_code_expires VARCHAR(19)', 'ALTER TABLE users ADD COLUMN email_code_tries INT NOT NULL DEFAULT 0', 'ALTER TABLE users ADD COLUMN reset_code_hash VARCHAR(64)', 'ALTER TABLE users ADD COLUMN reset_code_expires VARCHAR(19)', 'ALTER TABLE users ADD COLUMN totp_secret VARCHAR(255)', 'ALTER TABLE users ADD COLUMN totp_pending VARCHAR(255)', 'ALTER TABLE users ADD COLUMN totp_enabled_at VARCHAR(19)', 'ALTER TABLE users ADD COLUMN hub_discord_id VARCHAR(32)', 'ALTER TABLE users ADD COLUMN hub_effect VARCHAR(20)', 'ALTER TABLE users ADD COLUMN hub_deco VARCHAR(20)', 'ALTER TABLE users ADD COLUMN hub_plate VARCHAR(20)', 'ALTER TABLE users ADD COLUMN hub_namestyle VARCHAR(20)', 'ALTER TABLE users ADD COLUMN hub_banner_at VARCHAR(19)', 'ALTER TABLE tickets ADD COLUMN staff_notified INT NOT NULL DEFAULT 1', 'ALTER TABLE tickets ADD COLUMN scam_report_id BIGINT', 'ALTER TABLE listings ADD COLUMN reposted_at VARCHAR(19)','ALTER TABLE team_members ADD COLUMN role_id VARCHAR(32)', "ALTER TABLE rules ADD COLUMN audience VARCHAR(8) NOT NULL DEFAULT 'member'", 'ALTER TABLE rules ADD COLUMN punishment VARCHAR(500)', 'ALTER TABLE bot_config MODIFY v TEXT', 'ALTER TABLE jobs ADD COLUMN questions TEXT', 'ALTER TABLE jobs ADD COLUMN role_ids TEXT', 'ALTER TABLE applications ADD COLUMN answers TEXT', 'ALTER TABLE applications ADD COLUMN applicant_discord VARCHAR(32)', 'ALTER TABLE applications ADD COLUMN applicant_name VARCHAR(80)', 'ALTER TABLE applications ADD COLUMN applicant_avatar VARCHAR(80)', 'ALTER TABLE applications ADD COLUMN decided_at VARCHAR(19)', "ALTER TABLE applications ADD COLUMN notify_state VARCHAR(10) NOT NULL DEFAULT ''", 'ALTER TABLE applications ADD COLUMN notify_result TEXT', 'ALTER TABLE guild_roles ADD COLUMN on_team INT NOT NULL DEFAULT 0', 'ALTER TABLE guild_roles ADD COLUMN staff INT NOT NULL DEFAULT 0', 'ALTER TABLE guild_roles ADD COLUMN members INT NOT NULL DEFAULT 0', "ALTER TABLE tickets ADD COLUMN details TEXT", "ALTER TABLE tickets ADD COLUMN evidence_flag INT NOT NULL DEFAULT 0", "ALTER TABLE suggestions ADD COLUMN guild_id VARCHAR(32) NOT NULL DEFAULT ''", "ALTER TABLE rules ADD COLUMN guild_id VARCHAR(32) NOT NULL DEFAULT ''", "ALTER TABLE jobs ADD COLUMN guild_id VARCHAR(32) NOT NULL DEFAULT ''", 'ALTER TABLE api_keys ADD COLUMN key_hint VARCHAR(8)', 'ALTER TABLE games ADD COLUMN stats_hidden INT NOT NULL DEFAULT 0', 'ALTER TABLE team_members ADD COLUMN role_ids TEXT', 'ALTER TABLE listings ADD COLUMN posted_at VARCHAR(19)', 'ALTER TABLE listings ADD COLUMN notified INT NOT NULL DEFAULT 1', 'ALTER TABLE listings ADD COLUMN source VARCHAR(10)', "UPDATE listings SET posted_at=created_at WHERE posted_at IS NULL AND status<>'pending'",   "ALTER TABLE games ADD COLUMN platform VARCHAR(12) NOT NULL DEFAULT 'roblox'", "ALTER TABLE games ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'planned'", "ALTER TABLE games ADD COLUMN tagline VARCHAR(200)", "ALTER TABLE games ADD COLUMN description TEXT", "ALTER TABLE games ADD COLUMN play_url VARCHAR(300)", "ALTER TABLE games ADD COLUMN place_id VARCHAR(20)", "ALTER TABLE games ADD COLUMN universe_id VARCHAR(20)", "ALTER TABLE games ADD COLUMN sort INT NOT NULL DEFAULT 0", "ALTER TABLE games ADD COLUMN featured INT NOT NULL DEFAULT 0", "ALTER TABLE games ADD COLUMN playing BIGINT", "ALTER TABLE games ADD COLUMN visits BIGINT", "ALTER TABLE games ADD COLUMN favorites BIGINT", "ALTER TABLE games ADD COLUMN likes BIGINT", "ALTER TABLE games ADD COLUMN dislikes BIGINT", "ALTER TABLE games ADD COLUMN stats_at VARCHAR(19)",
    ] as $alter) { try { $p->exec($alter); } catch (Throwable $e) {   } }
    foreach (['friends(user_a)', 'friends(user_b)', 'chat_messages(channel_id)', 'chat_messages(dm_id)', 'chat_dms(user_a)', 'chat_dms(user_b)', 'msg_log(author_id)', 'msg_log(guild_id,created_at)', 'msg_edits(message_id)', 'msg_images(message_id)', 'reports(status)', 'applications(status)', 'tickets(status)', 'mod_actions(target_id)', 'messages(status)', 'sessions(expires_at)', 'users(roblox_id)', 'giveaways(status)'] as $ix) {
        $name = 'ix_' . preg_replace('/[^a-z_]/', '_', $ix);
        try { $p->exec("CREATE INDEX $name ON $ix"); } catch (Throwable $e) {   }
    }
    foreach (['CREATE INDEX ix_chan_server ON chat_channels(server_id)', 'CREATE INDEX ix_hmr_user ON hub_member_roles(user_id)', 'CREATE INDEX ix_hroles_server ON hub_roles(server_id)', 'CREATE UNIQUE INDEX ux_app_login ON users(app_login)', 'CREATE INDEX ix_backup_user ON hub_backup_codes(user_id)'] as $ix) { try { $p->exec($ix); } catch (Throwable $e) {   } }
     
    if ((int)$p->query('SELECT COUNT(*) FROM games')->fetchColumn() === 0) {
        $g = $p->prepare('INSERT INTO games (slug,name,platform,status,tagline,description,sort,featured) VALUES (?,?,?,?,?,?,?,?)');
        $g->execute(['beyond-lock', 'Beyond Lock', 'roblox', 'in_development', 'Now part of Axiomate Games and being finished.', 'Axiomate Games has acquired Beyond Lock and is finishing its development, with a focus on smooth performance and fun that works for everyone.', 1, 1]);
        $g->execute(['curseborn', 'CurseBorn', 'roblox', 'planned', 'A Jujutsu Kaisen-inspired Roblox game.', 'CurseBorn is planned to follow Beyond Lock. It is not in development yet.', 2, 0]);
    }
     
    try {
        if (!(int)$p->query('SELECT COUNT(*) FROM chat_channels')->fetchColumn()) {
            $ch = $p->prepare('INSERT INTO chat_channels (name,topic,position,staff_only,read_only,created_at) VALUES (?,?,?,?,?,?)');
            foreach ([['announcements', 'News from the team', 1, 0, 1], ['general', 'Talk about anything', 2, 0, 0], ['games', 'Beyond Lock, CurseBorn, Endless Arise and more', 3, 0, 0],
                      ['trading', 'Trades and deals. Never share your login, and report scammers in a ticket', 4, 0, 0], ['help', 'Ask the community for help', 5, 0, 0], ['staff-chat', 'Staff only', 6, 1, 0]] as $r)
                $ch->execute([$r[0], $r[1], $r[2], $r[3], $r[4], gmdate('Y-m-d H:i:s')]);
        }
    } catch (Throwable $e) {   }
     
    try {
        foreach (['announcements' => ['megaphone', 'Information'], 'general' => ['chat', 'Community'], 'games' => ['gamepad', 'Community'], 'trading' => ['swap', 'Community'], 'help' => ['help', 'Community'], 'staff-chat' => ['shield', 'Staff']] as $n => [$ic, $cat])
            $p->prepare("UPDATE chat_channels SET icon=?, category=? WHERE name=? AND (icon='hash' OR icon='' OR icon IS NULL) AND (category='' OR category IS NULL)")->execute([$ic, $cat, $n]);
    } catch (Throwable $e) {   }
     
    try {
        foreach (['name', 'tagline', 'description'] as $col) $p->exec("UPDATE games SET $col=REPLACE($col, 'Locked Ego', 'Beyond Lock') WHERE $col LIKE '%Locked Ego%'");
        foreach (['title', 'keywords', 'answer'] as $col) $p->exec("UPDATE helper_kb SET $col=REPLACE(REPLACE($col, 'Locked Ego', 'Beyond Lock'), 'locked ego', 'beyond lock') WHERE LOWER($col) LIKE '%locked ego%'");
        foreach (['name', 'description'] as $col) $p->exec("UPDATE hub_servers SET $col=REPLACE($col, 'Locked Ego', 'Beyond Lock') WHERE game_slug='beyond-lock' AND $col LIKE '%Locked Ego%'");
    } catch (Throwable $e) {   }
     
    try {
        $rel = $p->prepare("UPDATE games SET release_text=? WHERE slug=? AND (release_text IS NULL OR release_text='')");
        foreach (['beyond-lock' => 'Early 2027', 'curseborn' => '2027 or 2028'] as $slug => $when) $rel->execute([$when, $slug]);
        if (!(int)$p->query("SELECT COUNT(*) FROM games WHERE slug='endless-arise'")->fetchColumn())
            $p->prepare('INSERT INTO games (slug,name,platform,status,tagline,description,sort,featured,release_text) VALUES (?,?,?,?,?,?,?,?,?)')
                ->execute(['endless-arise', 'Endless Arise', 'roblox', 'planned', 'A Solo Leveling-inspired Roblox game.', 'Endless Arise is planned to follow CurseBorn. It is not in development yet.', 3, 0, '2028']);
    } catch (Throwable $e) {   }
     
    try {
        if (!(int)$p->query('SELECT COUNT(*) FROM hub_servers')->fetchColumn()) {
            $t = gmdate('Y-m-d H:i:s');
            $p->prepare('INSERT INTO hub_servers (name,description,icon,position,created_at) VALUES (?,?,?,?,?)')->execute(['Axiomate Games', 'The studio: news, the community and help.', 'brand', 1, $t]);
            $main = (int)$p->lastInsertId();
            $p->prepare('UPDATE chat_channels SET server_id=? WHERE server_id=0')->execute([$main]);
            $icons = ['beyond-lock' => 'ball', 'curseborn' => 'skull', 'endless-arise' => 'gate'];
            $pos = 2;
            foreach ($p->query('SELECT slug, name FROM games ORDER BY sort, id')->fetchAll(PDO::FETCH_ASSOC) as $g) {
                $p->prepare('INSERT INTO hub_servers (name,description,icon,game_slug,position,created_at) VALUES (?,?,?,?,?,?)')->execute([substr((string)$g['name'], 0, 40), 'Everything about ' . $g['name'] . '.', $icons[$g['slug']] ?? 'gamepad', $g['slug'], $pos++, $t]);
                $sid = (int)$p->lastInsertId();
                $ch = $p->prepare('INSERT INTO chat_channels (server_id,name,topic,icon,category,position,staff_only,read_only,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
                foreach ([['announcements', 'News about ' . $g['name'], 'megaphone', 'Information', 1, 1], ['sneak-peeks', 'First looks from the developers', 'image', 'Information', 2, 1],
                          ['general', 'Talk about ' . $g['name'], 'chat', 'Community', 3, 0], ['suggestions', 'Ideas for the game', 'star', 'Community', 4, 0]] as [$n, $topic, $ic, $cat, $po, $ro])
                    $ch->execute([$sid, $n, $topic, $ic, $cat, $po, 0, $ro, $t]);
            }
            foreach ($p->query('SELECT id FROM hub_servers')->fetchAll(PDO::FETCH_COLUMN) as $sid)
                $p->prepare('INSERT INTO hub_roles (server_id,name,color,icon,position,hoist,perms,created_at) VALUES (?,?,?,?,?,?,?,?)')->execute([(int)$sid, 'Moderator', '#8b5cf6', 'shield', 1, 1, 'manage_messages,announce', $t]);
        }
    } catch (Throwable $e) {   }
    if ((int)$p->query('SELECT COUNT(*) FROM helper_kb')->fetchColumn() === 0) {
        $k = $p->prepare('INSERT INTO helper_kb (title,keywords,answer,link,created_at) VALUES (?,?,?,?,?)');
        foreach ([
            ['How do I verify?', 'verify verified verification access unlock roblox link connect discord', 'Sign in with Discord on the website, link your Roblox account with the code on the Account page, then run /verify in the server. The Axio Verification Bot gives you access to the rest of the server.', '/account'],
            ['How do I report a scammer?', 'scam scammer report scammed scamming reporting', 'You need to be verified first. Then open the Scam Logs page and send a report with the scammer\'s Roblox username and your evidence. Staff review every report. Only confirmed scammers are published.', '/scam-logs'],
            ['How do I check my scam report?', 'report status check scam report-status reportstatus progress', 'Run /report-status in the server or sign in on the website and open your account. Reports show as under review, confirmed or not confirmed.', '/account'],
            ['How do I open a ticket?', 'ticket support help staff contact open', 'Run /ticket, press the Open a ticket button in the ticket channel, or simply DM the Axio Ticket Bot. Fill in the short form and submit it. The conversation then happens in your DMs with the bot, and staff reply from the website. Keep your DMs open.', null],
            ['How do I contact the studio?', 'contact email mail business press reach message', 'Sign in on the website and use the Contact page. Replies depend on the topic and can take longer on busy days.', '/contact'],
            ['Where can I find jobs?', 'job jobs apply application hiring staff position work join team', 'Open positions are listed on the Jobs page. You need to be verified to apply.', '/others/jobs'],
            ['How does the marketplace work?', 'marketplace sell service services offer commission paid post listing approve', 'Verified members can offer paid services in the Marketplace in the Axiomate app. Every post is reviewed by a post approver before it goes live.', '/hub?section=market'],
            ['What is Beyond Lock?', 'beyond lock game roblox featured play release', 'Beyond Lock is our featured Roblox game. We acquired it and are finishing development with a focus on smooth performance and fun for everyone.', '/games'],
            ['What is CurseBorn?', 'curseborn jjk jujutsu kaisen game', 'CurseBorn is a planned Jujutsu Kaisen-inspired Roblox game. It is not in development yet.', '/games'],
            ['Is there a Steam game?', 'steam pc release platform', 'Steam is coming soon. Nothing is announced yet. Watch the Games page and announcements.', '/games'],
            ['Who runs the studio?', 'founder owner axio who team staff leadership', 'Axiomate Games was founded by Axio. You can meet the rest of the team on the Team page.', '/team'],
        ] as $r) $k->execute([$r[0], $r[1], $r[2], $r[3], now()]);
    }
     
    $fix = $p->prepare('UPDATE helper_kb SET answer=? WHERE answer=?');
    $fix->execute(['Run /report-status in the server or sign in on the website and open your account. Reports show as under review, confirmed or not confirmed.', 'Run /reportstatus in the server or sign in on the website and open your account. Reports show as under review, confirmed or not confirmed.']);
    $fix->execute(['Run /ticket, press the Open a ticket button in the ticket channel, or simply DM the Axio Ticket Bot. Fill in the short form and submit it. The conversation then happens in your DMs with the bot, and staff reply from the website. Keep your DMs open.', 'Use /ticket in the server with a short reference describing what you need, or press the button in the ticket channel. A private channel opens and staff will join it.']);
     
    align_founder($p);
    $f = $p->prepare('SELECT 1 FROM team_members WHERE discord_id=?'); $f->execute([founder_id()]);
    if (!$f->fetch()) {
        $p->prepare("INSERT INTO team_members (discord_id,name,departments,titles,visible,source,updated_at) VALUES (?,?,?,?,1,'founder',?)")->execute([founder_id(), 'Axio', 'Leadership', 'Founder', now()]);
    }
    $st = $p->prepare("SELECT 1 FROM settings WHERE k='schema'"); $st->execute();
    if ($st->fetch()) { $p->prepare("UPDATE settings SET v=? WHERE k='schema'")->execute([(string)$ver]); }
    else { $p->prepare("INSERT INTO settings (k,v) VALUES ('schema',?)")->execute([(string)$ver]); }
}

 
function setting(string $k): ?string { $r = one('SELECT v FROM settings WHERE k=?', [$k]); return $r ? $r['v'] : null; }
function set_setting(string $k, string $v): void {
    if (one('SELECT 1 AS x FROM settings WHERE k=?', [$k])) q('UPDATE settings SET v=? WHERE k=?', [$v, $k]);
    else q('INSERT INTO settings (k,v) VALUES (?,?)', [$k, $v]);
}
function enc_key(): string { return hash('sha256', (string)cfg('app_key'), true); }

 
const BOT_CONFIG_KEYS = [  
    'counting.channel' => 'Counting channel ID', 'suggest.channel' => 'Suggestions channel ID', 'level.channel' => 'Level-up message channel ID (blank = same channel)',
'mod.log_channel' => 'Moderation log channel ID', 'mod.mute_role' => 'Muted role ID (blank = the role named Muted). Getting it removes all other roles until it is taken off',
    'ticket.channel' => 'Ticket panel channel ID', 'ticket.staff_channel' => 'Staff channel ID (new tickets and replies are announced here with a link to the panel)',
    'verify.channel' => 'Verification channel ID', 'verify.role' => 'Verified role ID (given on /verify)', 'verify.role2' => 'Second verified role ID (also given on /verify, optional)', 'verify.unverified_role' => 'Unverified role ID (removed on /verify, given on join)',
    'helper.channel' => 'Helper channel ID', 'break.channel' => 'Staff break requests channel ID (the Moderation Bot posts /break request here)', 'dev.break_channel' => 'Developer break requests channel ID (the Development Bot posts /break request here)', 'dev.status_channel' => 'Working status board channel ID (the Development Bot keeps the board here)', 'dev.role' => 'Developer role ID (who can use the Development Bot; blank = staff)', 'market.channel' => 'Marketplace channel ID (the Axiomate Bot posts approved /post listings here)', 'welcome.channel' => 'Welcome channel ID (the Verification Bot welcomes new members here; write the message on the Welcome message page)', 'boost.channel' => 'Booster channel ID (a thank-you is posted here when someone boosts the server; also set with /booster-channel)', 'rules.channel' => 'Rules channel ID (the message builder posts member rules here)', 'rules.staff_channel' => 'Staff rules channel ID (the message builder posts staff rules here)', 'vc.category' => 'Category ID for member voice channels made with /vc create (blank = a "Member VCs" category is made)',
];
 
function bcfg_all(string $guild): array {
    $o = []; $pre = 'g' . $guild . ':';
    foreach (all('SELECT k,v FROM bot_config WHERE k LIKE ?', [$pre . '%']) as $r) $o[substr($r['k'], strlen($pre))] = (string)$r['v'];
    return $o;
}
 
function known_servers(): array {
    $out = [];
    foreach (all('SELECT scope, guild_id, name, members, updated_at FROM bot_guilds ORDER BY name') as $g) {
        $id = (string)$g['guild_id'];
        $out[$id] ??= ['name' => '', 'members' => null, 'seen' => '', 'bots' => []];
        if ($g['name'] && !$out[$id]['name']) $out[$id]['name'] = (string)$g['name'];
        if ($g['members'] !== null) $out[$id]['members'] = max((int)$out[$id]['members'], (int)$g['members']);
        $out[$id]['seen'] = max($out[$id]['seen'], (string)$g['updated_at']);
        $out[$id]['bots'][] = (string)$g['scope'];
    }
    foreach (all("SELECT k FROM bot_config WHERE k LIKE 'g%:%'") as $r)
        if (preg_match('/^g(\d+):/', (string)$r['k'], $mm) && !isset($out[$mm[1]])) $out[$mm[1]] = ['name' => '', 'members' => null, 'seen' => '', 'bots' => []];
    $home = (string)setting('home_guild_id');
    if ($home !== '' && !isset($out[$home])) $out[$home] = ['name' => '', 'members' => null, 'seen' => '', 'bots' => []];
    uasort($out, fn($a, $b) => strcasecmp($a['name'] ?: 'zzz', $b['name'] ?: 'zzz'));
    return $out;
}
 
function log_site_error(Throwable $e, string $scope = ''): void {
    try {
        $path = substr((string)parse_url((string)($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH), 0, 160);
        $msg = substr(get_class($e) . ': ' . $e->getMessage() . ' @ ' . basename($e->getFile()) . ':' . $e->getLine(), 0, 500);
        q('INSERT INTO site_errors (at,path,scope,message) VALUES (?,?,?,?)', [now(), $path, substr($scope, 0, 16), $msg]);
        if (random_int(1, 50) === 1) q('DELETE FROM site_errors WHERE at<?', [plus('-14 days')]);
    } catch (Throwable $x) {   }
}
 
function find_links(string $text): array {
    preg_match_all('#\bhttps?://[^\s<>"\'`]+#i', $text, $m);
    return array_values(array_unique(array_map(fn($u) => rtrim($u, '.,;:!?)]}*_~|'), $m[0] ?? [])));
}
 
function msglog_prune(): void {
    $days = (int)(setting('msglog_days') ?: 0);
    if ($days <= 0) return;
    $cut = plus('-' . $days . ' days');
    $old = array_column(all('SELECT message_id FROM msg_log WHERE created_at<? LIMIT 2000', [$cut]), 'message_id');
    if (!$old) return;
    $in = implode(',', array_fill(0, count($old), '?'));
    foreach (['msg_images', 'msg_edits', 'msg_log'] as $t) q("DELETE FROM $t WHERE message_id IN ($in)", $old);
}
 
function is_post_approver(string $discordId): bool {
    if ($discordId === '') return false;
    if ((string)setting('owner_discord_id') === $discordId) return true;
    if ((int)(one('SELECT post_approver FROM team_members WHERE discord_id=?', [$discordId])['post_approver'] ?? 0) === 1) return true;
    return in_array(one('SELECT role FROM staff WHERE discord_id=?', [$discordId])['role'] ?? '', ['admin', 'owner'], true);
}
 
const SUB_DEFAULTS = [
    ['key' => 'basic', 'name' => 'Axio Basic', 'price' => '3.99', 'color' => '#8a94a6', 'popular' => false,
        'benefits' => ['Higher priority (tickets)', 'Repost perks (5 hours)', 'Marketplace perks (10 hours → 5 hours)']],
    ['key' => 'bronze', 'name' => 'Axio Bronze', 'price' => '7.99', 'color' => '#cd7f32', 'popular' => true,
        'benefits' => ['Marketplace perks (cooldown: 5 hours → 4 hours)', 'Higher priority (tickets)', 'Repost perks (4 hours)']],
    ['key' => 'silver', 'name' => 'Axio Silver', 'price' => '11.99', 'color' => '#c0c7d1', 'popular' => false,
        'benefits' => ['Higher priority (tickets)', 'Marketplace (4 hours → 2 hours)', 'Repost perks (2 hours)']],
    ['key' => 'gold', 'name' => 'Axio Gold', 'price' => '19.99', 'color' => '#f2c14e', 'popular' => false,
        'benefits' => ['Higher priority (tickets)', 'Repost perks (1 hour)', 'Marketplace (2 hours → 1 hour)']],
];
 
function stripe_key(): string { return dec(setting('stripe_secret')); }
function stripe_ready(): bool { return str_starts_with(stripe_key(), 'sk_'); }
function stripe_price(string $tier): string { return (string)setting('stripe_price_' . $tier); }
function stripe_api(string $method, string $path, array $params = []): array {
    $base = is_dev() && getenv('AXM_STRIPE_BASE') ? getenv('AXM_STRIPE_BASE') : 'https://api.stripe.com';
    $url = $base . '/v1/' . $path . ($method === 'GET' && $params ? '?' . http_build_query($params) : '');
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_USERPWD => stripe_key() . ':',
        CURLOPT_HTTPHEADER => ['Stripe-Version: 2024-06-20']] + ($method !== 'GET' ? [CURLOPT_POSTFIELDS => http_build_query($params)] : []));
    $res = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    $j = is_string($res) ? json_decode($res, true) : null;
    if ($code < 200 || $code >= 300 || !is_array($j)) throw new RuntimeException('Stripe: ' . ($j['error']['message'] ?? ($err ?: 'request failed (' . $code . ')')));
    return $j;
}
 
function stripe_signed(string $payload, string $header, string $secret, int $tolerance = 300): bool {
    $t = 0; $sigs = [];
    foreach (explode(',', $header) as $part) { [$k, $v] = array_pad(explode('=', trim($part), 2), 2, ''); if ($k === 't') $t = (int)$v; if ($k === 'v1') $sigs[] = $v; }
    if (!$t || !$sigs || abs(time() - $t) > $tolerance || $secret === '') return false;
    $want = hash_hmac('sha256', $t . '.' . $payload, $secret);
    foreach ($sigs as $s) if (hash_equals($want, $s)) return true;
    return false;
}
 
function tier_of_price(string $price): string {
    foreach (SUB_DEFAULTS as $d) if ($price !== '' && stripe_price($d['key']) === $price) return $d['key'];
    return '';
}
 

function expire_trials(): void {
    q("UPDATE subscriptions SET status='ended', updated_at=? WHERE stripe_sub LIKE 'manual:%' AND status='trialing' AND period_end < ?", [now(), now()]);
}
function is_gift(array $s): bool { return str_starts_with((string)$s['stripe_sub'], 'manual:'); }
 
function give_trial(string $discordId, string $tier, int $days, string $by): array {
    expire_trials();
    if (!in_array($tier, array_column(SUB_DEFAULTS, 'key'), true)) throw new InvalidArgumentException('Pick a tier.');
    if ($days < 1 || $days > 31) throw new InvalidArgumentException('A free trial is 1 to 31 days.');
    $u = one('SELECT id FROM users WHERE discord_id=?', [$discordId]);
    $paid = one("SELECT tier FROM subscriptions WHERE discord_id=? AND stripe_sub NOT LIKE 'manual:%' AND status IN ('active','trialing','past_due')", [$discordId]);
    if ($paid) throw new InvalidArgumentException('They already have a paid subscription.');
    q("UPDATE subscriptions SET status='ended', updated_at=? WHERE discord_id=? AND stripe_sub LIKE 'manual:%' AND status='trialing'", [now(), $discordId]);
    $id = insert('subscriptions', ['user_id' => $u ? (int)$u['id'] : null, 'discord_id' => $discordId, 'tier' => $tier, 'status' => 'trialing', 'stripe_customer' => '',
        'stripe_sub' => 'manual:' . bin2hex(random_bytes(8)), 'period_end' => gmdate('Y-m-d H:i:s', time() + $days * 86400), 'cancel_at_end' => 1, 'created_at' => now(), 'updated_at' => now()]);
    audit($by, 'subscriptions.trial', $discordId . ' ' . $tier . ' ' . $days . ' days');
    return one('SELECT * FROM subscriptions WHERE id=?', [$id]);
}
function end_trial(string $discordId, string $by): bool {
    $n = one("SELECT COUNT(*) AS n FROM subscriptions WHERE discord_id=? AND stripe_sub LIKE 'manual:%' AND status='trialing'", [$discordId])['n'] ?? 0;
    q("UPDATE subscriptions SET status='ended', updated_at=? WHERE discord_id=? AND stripe_sub LIKE 'manual:%' AND status='trialing'", [now(), $discordId]);
    if ($n) audit($by, 'subscriptions.trial-end', $discordId);
    return (int)$n > 0;
}
 
function current_sub(int $userId, string $discordId = ''): ?array {
    expire_trials();
    return one("SELECT * FROM subscriptions WHERE (user_id=? OR (discord_id<>'' AND discord_id=?)) AND status IN ('active','trialing','past_due') ORDER BY id DESC LIMIT 1", [$userId, $discordId]) ?: null;
}
 
const PERK_PRIORITY = ['Normal', 'High', 'Higher', 'Highest'];
 
const PERK_TIER_PRESETS = ['basic' => ['market' => '5', 'repost' => '5', 'priority' => 1], 'bronze' => ['market' => '4', 'repost' => '4', 'priority' => 1],
    'silver' => ['market' => '2', 'repost' => '2', 'priority' => 2], 'gold' => ['market' => '1', 'repost' => '1', 'priority' => 3]];
function main_guild(): string { return (string)(setting('main_guild_id') ?: setting('home_guild_id')); }
function perk_hours($v): ?float { $v = trim((string)$v); return $v === '' || !is_numeric($v) ? null : max(0.0, min(720.0, (float)$v)); }
function role_perk_rules(): array { $r = json_decode((string)setting('role_perks'), true); return is_array($r) ? array_values(array_filter($r, 'is_array')) : []; }
 
function perk_defaults(): array {
    return ['market' => setting('perk_market_h') === null ? 10.0 : (perk_hours(setting('perk_market_h')) ?? 0.0), 'repost' => perk_hours(setting('perk_repost_h'))];
}
 
function member_perks(array $roleIds): array {
    $d = perk_defaults();
    $out = ['market_h' => $d['market'], 'repost_h' => $d['repost'], 'priority' => 0, 'roles' => []];
    $have = array_flip(array_map('strval', $roleIds));
    foreach (role_perk_rules() as $r) {
        if (!isset($have[(string)($r['role_id'] ?? '')])) continue;
        $out['roles'][] = (string)($r['name'] ?? '');
        $m = perk_hours($r['market'] ?? ''); if ($m !== null && $m < $out['market_h']) $out['market_h'] = $m;
        $rp = perk_hours($r['repost'] ?? ''); if ($rp !== null && ($out['repost_h'] === null || $rp < $out['repost_h'])) $out['repost_h'] = $rp;
        $out['priority'] = max($out['priority'], max(0, min(3, (int)($r['priority'] ?? 0))));
    }
    $out['priority_label'] = PERK_PRIORITY[$out['priority']];
    return $out;
}
function hours_text(float $h): string {
    if ($h <= 0) return 'no wait';
    if ($h < 1) return round($h * 60) . ' minutes';
    $t = rtrim(rtrim(number_format($h, 2, '.', ''), '0'), '.');
    return $t . ($t === '1' ? ' hour' : ' hours');
}
function sub_tiers(): array {
    $saved = json_decode((string)setting('sub_tiers'), true) ?: [];
    $out = [];
    foreach (SUB_DEFAULTS as $d) {
        $s = is_array($saved[$d['key']] ?? null) ? $saved[$d['key']] : [];
        $benefits = array_values(array_filter(array_map('trim', is_array($s['benefits'] ?? null) ? $s['benefits'] : [])));
        $out[] = ['key' => $d['key'], 'name' => (string)($s['name'] ?? '') ?: $d['name'], 'price' => (string)($s['price'] ?? '') ?: $d['price'], 'color' => $d['color'],
            'benefits' => $benefits ?: ($saved ? [] : $d['benefits']),
            'popular' => $saved ? !empty($s['popular']) : $d['popular'], 'visible' => !array_key_exists('visible', $s) || !empty($s['visible'])];
    }
    return $out;
}
function bcfg_set(string $guild, string $k, string $v): void {
    $k = 'g' . $guild . ':' . $k;
    if (one('SELECT 1 AS x FROM bot_config WHERE k=?', [$k])) q('UPDATE bot_config SET v=? WHERE k=?', [$v, $k]);
    else q('INSERT INTO bot_config (k,v) VALUES (?,?)', [$k, $v]);
}
 
function guild_label(?string $id): string {
    if (!$id) return 'All servers';
    $r = one('SELECT name FROM bot_guilds WHERE guild_id=? LIMIT 1', [$id]);
    return $r && $r['name'] ? $r['name'] : $id;
}
 
function ticket_say(int $ticketId, string $type, string $name, string $content, string $kind = 'message', int $delivered = 1): int {
    return insert('ticket_messages', ['ticket_id' => $ticketId, 'author_type' => $type, 'author_name' => str($name, 80), 'kind' => $kind, 'content' => str($content, 3500, false), 'delivered' => $delivered, 'created_at' => now()]);
}
const SCAM_TYPES = ['fake-trade' => 'Fake trade', 'phishing' => 'Phishing link', 'impersonation' => 'Impersonation', 'payment' => 'Payment scam', 'other' => 'Other'];
const TICKET_TYPES = ['support' => 'General', 'scam' => 'User report', 'staff' => 'Staff report', 'rules' => 'Rules / appeal', 'marketplace' => 'Marketplace help', 'jobs' => 'Jobs and applications', 'other' => 'Something else'];
 
const HUB_DEFAULTS = ['name' => 'Axiomate Hub', 'server' => 'Axiomate Games', 'accent' => '#8b5cf6', 'home_icon' => 'blossom-tree', 'server_icon' => 'brand',
    'login_title' => 'Welcome back!', 'login_text' => 'Chat with the community, open and track tickets, and link your Roblox account.', 'chat_rule' => 'roblox'];
function hub_icons(): array {
    static $i = null;
    if ($i === null) $i = json_decode((string)@file_get_contents(__DIR__ . '/../hub/icons.json'), true) ?: [];
    return $i;
}
function hub_cfg(): array {
    $saved = json_decode((string)setting('hub_config'), true);
    return array_merge(HUB_DEFAULTS, is_array($saved) ? array_intersect_key($saved, HUB_DEFAULTS) : []);
}
 

const HUB_COOKIE = 'axm_h';
const HUB_RESERVED = ['admin', 'administrator', 'owner', 'staff', 'mod', 'moderator', 'support', 'system', 'axiomate', 'axiomategames', 'axio', 'official', 'help', 'root', 'null', 'undefined', 'everyone', 'here', 'discord', 'roblox'];
function hub_login_user(int $uid): void {
    q('DELETE FROM sessions WHERE expires_at < ?', [now()]);
    $tok = bin2hex(random_bytes(32));
    q("INSERT INTO sessions (id,user_id,csrf,created_at,expires_at,kind) VALUES (?,?,?,?,?,'hub')", [hash('sha256', $tok), $uid, bin2hex(random_bytes(16)), now(), plus('+30 days')]);
    q('UPDATE users SET last_login_at=? WHERE id=?', [now(), $uid]);
    set_cookie(HUB_COOKIE, $tok, 30 * 86400);
}
function hub_auth(): ?array {
    static $c = false;
    if ($c !== false) return $c;
    $c = null;
    $tok = $_COOKIE[HUB_COOKIE] ?? '';
    if (!is_string($tok) || !preg_match('/^[a-f0-9]{64}$/', $tok)) return null;
    $r = one("SELECT s.id AS sid, s.csrf, s.expires_at, u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.kind='hub'", [hash('sha256', $tok)]);
    if (!$r || $r['expires_at'] < now() || (int)$r['banned'] === 1) return null;
    $u = $r; unset($u['sid'], $u['csrf'], $u['expires_at']);
     
    if (!preg_match('/^\d+$/', (string)$u['discord_id']) && !empty($u['hub_discord_id'])) $u['discord_id'] = (string)$u['hub_discord_id'];
    return $c = ['user' => $u, 'csrf' => $r['csrf'], 'sid' => $r['sid']];
}
function hub_logout(): void {
    $c = hub_auth();
    if ($c) q('DELETE FROM sessions WHERE id=?', [$c['sid']]);
    set_cookie(HUB_COOKIE, '', 0);
}
function hub_username_problem(string $name, bool $allowReserved = false): ?string {
    if (!preg_match('/^[A-Za-z0-9_.]{3,20}$/', $name)) return 'Usernames are 3 to 20 letters, numbers, underscores or dots.';
    if (str_starts_with($name, '.') || str_ends_with($name, '.') || str_contains($name, '..')) return 'A username cannot start or end with a dot, or have two dots in a row.';
    if (!$allowReserved && in_array(strtolower($name), HUB_RESERVED, true)) return 'That username is reserved. Pick another one.';
    if (one('SELECT id FROM users WHERE app_login=?', [strtolower($name)])) return 'That username is already taken. Usernames can only be used once.';
    return null;
}
function hub_password_problem(string $pw, string $user = ''): ?string {
    if (strlen($pw) < 8) return 'Passwords need at least 8 characters.';
    if (strlen($pw) > 128) return 'That password is too long.';
    if (!preg_match('/[A-Za-z]/', $pw) || !preg_match('/\d/', $pw)) return 'Use at least one letter and one number.';
    if ($user !== '' && stripos($pw, $user) !== false) return 'Your password cannot contain your username.';
    if (in_array(strtolower($pw), ['password1', 'password123', '12345678a', 'qwerty123', 'abc12345', 'iloveyou1', 'letmein1'], true)) return 'That password is too common.';
    return null;
}
function hub_code_hash(int $uid, string $code): string { return hash('sha256', $uid . ':' . preg_replace('/\D/', '', $code)); }
 
function hub_send_code(array $u, string $kind): bool {
    $code = (string)random_int(100000, 999999);
    if ($kind === 'verify') q('UPDATE users SET email_code_hash=?, email_code_expires=?, email_code_tries=0 WHERE id=?', [hub_code_hash((int)$u['id'], $code), gmdate('Y-m-d H:i:s', time() + 900), $u['id']]);
    else q('UPDATE users SET reset_code_hash=?, reset_code_expires=? WHERE id=?', [hub_code_hash((int)$u['id'], $code), gmdate('Y-m-d H:i:s', time() + 900), $u['id']]);
    $name = hub_cfg()['name'];
    $text = $kind === 'verify'
        ? "Hi {$u['username']},\n\nYour $name verification code is: $code\n\nIt works for 15 minutes. If you did not make an account, you can ignore this email."
        : "Hi {$u['username']},\n\nYour $name password reset code is: $code\n\nIt works for 15 minutes. If you did not ask for this, ignore this email; your password stays the same.";
    return send_mail((string)$u['email'], ($kind === 'verify' ? 'Verify your email' : 'Reset your password') . ' · ' . $name, $text);
}
 
function b32_encode(string $bin): string {
    $map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; $bits = ''; $out = '';
    foreach (str_split($bin) as $ch) $bits .= str_pad(decbin(ord($ch)), 8, '0', STR_PAD_LEFT);
    foreach (str_split($bits, 5) as $chunk) $out .= $map[bindec(str_pad($chunk, 5, '0'))];
    return $out;
}
function b32_decode(string $s): string {
    $map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; $bits = ''; $out = '';
    foreach (str_split(strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $s))) as $ch) $bits .= str_pad(decbin(strpos($map, $ch)), 5, '0', STR_PAD_LEFT);
    foreach (str_split($bits, 8) as $byte) if (strlen($byte) === 8) $out .= chr(bindec($byte));
    return $out;
}
function totp_at(string $secret, int $step): string {
    $h = hash_hmac('sha1', pack('N*', 0) . pack('N*', $step), b32_decode($secret), true);
    $o = ord($h[19]) & 0xf;
    $n = ((ord($h[$o]) & 0x7f) << 24 | (ord($h[$o + 1]) & 0xff) << 16 | (ord($h[$o + 2]) & 0xff) << 8 | (ord($h[$o + 3]) & 0xff)) % 1000000;
    return str_pad((string)$n, 6, '0', STR_PAD_LEFT);
}
function totp_ok(string $secret, string $code): bool {
    $code = preg_replace('/\D/', '', $code);
    if (strlen($code) !== 6 || $secret === '') return false;
    $now = intdiv(time(), 30);
    foreach ([-1, 0, 1] as $d) if (hash_equals(totp_at($secret, $now + $d), $code)) return true;
    return false;
}
 
function hub_second_factor_ok(array $u, string $code): bool {
    if (totp_ok(dec((string)$u['totp_secret']), $code)) return true;
    $clean = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code));
    if (strlen($clean) !== 8) return false;
    $row = one('SELECT id FROM hub_backup_codes WHERE user_id=? AND code_hash=? AND used_at IS NULL', [(int)$u['id'], hash('sha256', (int)$u['id'] . ':' . $clean)]);
    if (!$row) return false;
    q('UPDATE hub_backup_codes SET used_at=? WHERE id=?', [now(), $row['id']]);
    return true;
}
function hub_new_backup_codes(int $uid): array {
    q('DELETE FROM hub_backup_codes WHERE user_id=?', [$uid]);
    $codes = [];
    $alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for ($i = 0; $i < 5; $i++) {
        $c = ''; for ($j = 0; $j < 8; $j++) $c .= $alpha[random_int(0, strlen($alpha) - 1)];
        insert('hub_backup_codes', ['user_id' => $uid, 'code_hash' => hash('sha256', $uid . ':' . $c)]);
        $codes[] = substr($c, 0, 4) . '-' . substr($c, 4);
    }
    return $codes;
}
 
function ticket_add_note(int $ticketId, string $text, string $by, bool $notify): int {
    $id = insert('ticket_notes', ['ticket_id' => $ticketId, 'body' => str($text, 2000, false), 'author' => str($by, 80), 'created_at' => now(), 'updated_at' => now()]);
    if ($notify) ticket_say($ticketId, 'system', $by, $text, 'note', 0);    
    return $id;
}
 

function confirm_scam(array $t, string $discordId, string $robloxName, string $type, string $summary, bool $ban, bool $log, string $who): array {
    $done = [];
    $reporter = one('SELECT id FROM users WHERE discord_id=?', [(string)$t['discord_user_id']]);
    $rb = $robloxName !== '' ? roblox_lookup($robloxName) : null;
    if ($robloxName !== '' && !$rb) throw new InvalidArgumentException('No Roblox account is called "' . $robloxName . '". Check the username.');
    if ($log && !$rb) throw new InvalidArgumentException('The Scam Logs need the scammer\'s Roblox username.');
    if ($log && $summary === '') throw new InvalidArgumentException('Write a short public summary for the Scam Logs.');
    if ($ban && $discordId === '') throw new InvalidArgumentException('Banning needs the scammer\'s Discord user ID.');
    if (!$rb && $discordId === '') throw new InvalidArgumentException('Enter the scammer\'s Discord ID or Roblox username.');
    $rid = insert('reports', ['user_id' => $reporter ? (int)$reporter['id'] : 0, 'scammer_name' => $rb['name'] ?? ('Discord ' . $discordId), 'scammer_roblox_id' => $rb['id'] ?? null,
        'scammer_discord_id' => $discordId, 'platform' => 'Roblox', 'type' => $type, 'description' => str('From ticket ' . $t['ref'] . ': ' . $t['subject'] . "\n\n" . $t['details'], 4000, false),
        'status' => 'verified', 'public_summary' => $summary, 'published' => $log ? 1 : 0, 'staff_note' => 'Confirmed by ' . $who . ' on ticket ' . $t['ref'],
        'reviewed_by' => $who, 'reviewed_at' => now(), 'published_at' => $log ? now() : null, 'created_at' => now()]);
    q('UPDATE reports SET ref=? WHERE id=?', ['SL-' . str_pad((string)$rid, 4, '0', STR_PAD_LEFT), $rid]);
    if ($log) $done[] = 'added to the Scam Logs';
    if ($ban) {
        insert('pending_bans', ['discord_id' => $discordId, 'reason' => str('Scam confirmed in ticket ' . $t['ref'] . ($summary !== '' ? ': ' . $summary : ''), 500), 'by_name' => $who, 'source' => (string)$t['ref'], 'created_at' => now()]);
        $done[] = 'banned from our servers';
    }
    q("UPDATE tickets SET scam_result='scam', scam_report_id=? WHERE id=?", [$rid, (int)$t['id']]);
    audit($who, 'ticket.scam-confirmed', $t['ref'] . ' -> ' . ($rb['name'] ?? $discordId) . ($done ? ' (' . implode(', ', $done) . ')' : ''));
    return ['report_id' => $rid, 'done' => $done, 'name' => $rb['name'] ?? ''];
}
 
function ticket_status(string $discordId): ?array {
    $t = one("SELECT * FROM tickets WHERE discord_user_id=? AND status<>'closed' ORDER BY id DESC LIMIT 1", [$discordId])
        ?: one("SELECT * FROM tickets WHERE discord_user_id=? AND status='closed' AND closed_at>? ORDER BY id DESC LIMIT 1", [$discordId, gmdate('Y-m-d H:i:s', time() - 7 * 86400)]);
    if (!$t) return null;
    $waiting = (int)one("SELECT COUNT(*) AS n FROM tickets WHERE status='open'")['n'];
    $pos = $t['status'] === 'open' ? (int)one("SELECT COUNT(*) AS n FROM tickets WHERE status='open' AND (priority > ? OR (priority = ? AND id <= ?))", [(int)$t['priority'], (int)$t['priority'], (int)$t['id']])['n'] : 0;
    $notes = array_map(fn($n) => ['id' => (int)$n['id'], 'text' => (string)$n['body'], 'by' => (string)$n['author'], 'at' => (string)$n['updated_at'], 'edited' => $n['updated_at'] !== $n['created_at']],
        all('SELECT * FROM ticket_notes WHERE ticket_id=? ORDER BY id DESC LIMIT 20', [(int)$t['id']]));
    return ['id' => (int)$t['id'], 'ref' => (string)$t['ref'], 'status' => (string)$t['status'], 'category' => (string)$t['category'], 'subject' => (string)$t['subject'],
        'type' => TICKET_TYPES[$t['category']] ?? ucfirst((string)$t['category']), 'scam_result' => (string)($t['scam_result'] ?? ''),
        'claimed_by' => (string)$t['claimed_by'], 'position' => $pos, 'waiting' => $waiting, 'priority' => PERK_PRIORITY[min(3, (int)$t['priority'])],
        'created_at' => (string)$t['created_at'], 'closed_at' => (string)$t['closed_at'], 'notes' => $notes];
}
function ticket_transcript(int $ticketId): string {
    $out = [];
    foreach (all('SELECT * FROM ticket_messages WHERE ticket_id=? ORDER BY id', [$ticketId]) as $m)
        $out[] = '[' . $m['created_at'] . '] ' . ($m['author_type'] === 'staff' ? 'Staff' : ($m['author_type'] === 'user' ? 'User' : 'System')) . ' ' . $m['author_name'] . ($m['kind'] !== 'message' ? ' (' . $m['kind'] . ')' : '') . ': ' . $m['content'];
    return implode("\n", $out);
}
 
function xp_need(int $n): int { return 5 * $n * $n + 50 * $n + 100; }
function level_info(int $xp): array {
    $lvl = 0; $left = $xp;
    while ($left >= xp_need($lvl)) { $left -= xp_need($lvl); $lvl++; }
    return ['level' => $lvl, 'into' => $left, 'need' => xp_need($lvl)];
}
function tokens(string $s): array {
    static $stop = ['the', 'a', 'an', 'is', 'are', 'to', 'do', 'does', 'i', 'how', 'what', 'where', 'can', 'my', 'me', 'of', 'in', 'on', 'for', 'and', 'or', 'it', 'this', 'that', 'you', 'we', 'with', 'be', 'get', 'there', 'about', 'please', 'help', 'need', 'want', 'know', 'tell'];
    $out = [];
    foreach (preg_split('/[^a-z0-9]+/', strtolower($s), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $w) {
        if (in_array($w, $stop, true) || (strlen($w) < 2 && !ctype_digit($w))) continue;
        $out[] = strlen($w) > 3 ? rtrim($w, 's') : $w;
    }
    return array_values(array_unique($out));
}
 
function helper_search(string $question, string $guild = ''): array {
    $qt = tokens($question);
    if (!$qt) return [];
    $cands = [];
    foreach (all('SELECT title,keywords,answer,link FROM helper_kb WHERE enabled=1') as $r) $cands[] = ['source' => 'faq', 'title' => $r['title'], 'kw' => (string)$r['keywords'], 'text' => $r['answer'], 'link' => $r['link']];
    foreach (all("SELECT num,title,body,punishment FROM rules WHERE (guild_id='' OR guild_id=?) AND audience<>'staff' ORDER BY num", [$guild]) as $r) $cands[] = ['source' => 'rule', 'title' => 'Rule ' . $r['num'] . ': ' . $r['title'], 'kw' => 'rule rules ' . $r['num'], 'text' => $r['body'] . (trim((string)$r['punishment']) !== '' ? "\n\nPunishment: " . $r['punishment'] : ''), 'link' => null];
    foreach (all('SELECT name,tagline,description FROM games') as $r) $cands[] = ['source' => 'game', 'title' => $r['name'], 'kw' => $r['name'], 'text' => trim(($r['tagline'] ?? '') . ' ' . ($r['description'] ?? '')), 'link' => '/games'];
    $res = [];
    foreach ($cands as $c) {
        $kw = tokens($c['kw']); $ti = tokens($c['title']); $tx = tokens($c['text']); $sum = 0.0; $strong = 0;
        foreach ($qt as $t) {
            if (in_array($t, $kw, true)) { $sum += 3; $strong++; }
            elseif (in_array($t, $ti, true)) { $sum += 2; $strong++; }
            elseif (in_array($t, $tx, true)) $sum += 1;
        }
        $score = $sum / (3 * count($qt));
        if ($score > 0) $res[] = ['source' => $c['source'], 'title' => $c['title'], 'answer' => mb_substr($c['text'], 0, 900), 'link' => $c['link'], 'score' => round($score, 3), 'strong' => $strong];
    }
    usort($res, fn($a, $b) => $b['score'] <=> $a['score']);
    return array_slice($res, 0, 3);
}
function enc(string $s): string {
    $iv = random_bytes(12); $tag = '';
    $ct = openssl_encrypt($s, 'aes-256-gcm', enc_key(), OPENSSL_RAW_DATA, $iv, $tag);
    return base64_encode($iv . $tag . $ct);
}
function dec(?string $b): string {
    if (!$b) return '';
    $raw = base64_decode($b, true); if ($raw === false || strlen($raw) < 29) return '';
    $pt = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', enc_key(), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
    return $pt === false ? '' : $pt;
}

 
function json_out($data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(string $msg, int $code = 400): never { json_out(['ok' => false, 'error' => $msg], $code); }
function body(): array {
    static $b = null;
    if ($b !== null) return $b;
    $raw = file_get_contents('php://input', false, null, 0, 2000000);
    $j = json_decode($raw ?: '', true);
    return $b = is_array($j) ? $j : [];
}
function str($v, int $max, bool $trim = true): string {
    $s = is_scalar($v) ? (string)$v : '';
    $s = $trim ? trim($s) : $s;
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $s) ?? '';
    return mb_substr($s, 0, $max);
}
function digits($v, int $max = 25): string { return substr(preg_replace('/\D/', '', is_scalar($v) ? (string)$v : '') ?? '', 0, $max); }
function client_hash(): string { return hash_hmac('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? '0'), (string)cfg('app_key')); }
function rate(string $key, int $max, int $window): bool {
    $win = intdiv(time(), $window);
    $k = substr($key, 0, 100);
    $r = one('SELECT win,cnt FROM ratelimit WHERE k=?', [$k]);
    if (!$r || (int)$r['win'] !== $win) {
        if ($r) q('UPDATE ratelimit SET win=?,cnt=1 WHERE k=?', [$win, $k]); else q('INSERT INTO ratelimit (k,win,cnt) VALUES (?,?,1)', [$k, $win]);
        return true;
    }
    if ((int)$r['cnt'] >= $max) return false;
    q('UPDATE ratelimit SET cnt=cnt+1 WHERE k=?', [$k]);
    return true;
}
function audit(string $actor, string $action, string $detail = ''): void {
    insert('audit', ['actor' => mb_substr($actor, 0, 80), 'action' => $action, 'detail' => mb_substr($detail, 0, 300), 'created_at' => now()]);
}

 
const COOKIE = 'axm_s';
function set_cookie(string $name, string $val, int $ttl): void {
    setcookie($name, $val, ['expires' => $ttl ? time() + $ttl : 1, 'path' => '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
}
function login_user(int $uid): void {
    q('DELETE FROM sessions WHERE expires_at < ?', [now()]);
    $tok = bin2hex(random_bytes(32));
    q('INSERT INTO sessions (id,user_id,csrf,created_at,expires_at) VALUES (?,?,?,?,?)', [hash('sha256', $tok), $uid, bin2hex(random_bytes(16)), now(), plus('+30 days')]);
    set_cookie(COOKIE, $tok, 30 * 86400);
}
function auth(): ?array {
    static $c = false;
    if ($c !== false) return $c;
    $c = null;
    $tok = $_COOKIE[COOKIE] ?? '';
    if (!is_string($tok) || !preg_match('/^[a-f0-9]{64}$/', $tok)) return null;
    $r = one("SELECT s.id AS sid, s.csrf, s.expires_at, u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND (s.kind IS NULL OR s.kind<>'hub')", [hash('sha256', $tok)]);
    if (!$r || $r['expires_at'] < now() || (int)$r['banned'] === 1) return null;
    $u = $r; unset($u['sid'], $u['csrf'], $u['expires_at']);
    return $c = ['user' => $u, 'csrf' => $r['csrf'], 'sid' => $r['sid']];
}
function logout(): void {
    $c = auth();
    if ($c) q('DELETE FROM sessions WHERE id=?', [$c['sid']]);
    set_cookie(COOKIE, '', 0);
}
function check_csrf(?string $given): void {
    $c = auth();
    if (!$c || !is_string($given) || !hash_equals($c['csrf'], $given)) fail('Session expired. Refresh the page and try again.', 403);
}

 
 
 

function can_see_ticket(array $t, array $u): bool {
    $cat = $t['category'] ?? '';
    if ($cat !== 'staff' && $cat !== 'rules') return true;
    if ((string)($t['reported_id'] ?? '') !== '' && (string)$t['reported_id'] === (string)$u['discord_id']) return false;
    return $cat === 'rules' || staff_rank($u) >= 2;
}
 
 
function clean_message(array $in): array {
    $url = fn($v) => is_string($v) && preg_match('#^https?://\S{3,}$#i', $v) ? substr($v, 0, 2000) : null;
    $txt = fn($v, int $n) => is_scalar($v) ? mb_substr(trim((string)$v), 0, $n) : '';
    $out = ['content' => $txt($in['content'] ?? '', 2000), 'embeds' => [], 'allow_pings' => !empty($in['allow_pings']), 'buttons' => []];
    $clean = function ($e) use ($url, $txt): array {
        if (!is_array($e)) return [];
        $o = [];
        foreach (['title' => 256, 'description' => 4096] as $k => $n) { $v = $txt($e[$k] ?? '', $n); if ($v !== '') $o[$k] = $v; }
        if ($u = $url($e['url'] ?? null)) $o['url'] = $u;
        if (isset($e['color']) && is_numeric($e['color'])) $o['color'] = max(0, min(0xFFFFFF, (int)$e['color']));
        if (is_array($e['author'] ?? null) && ($n = $txt($e['author']['name'] ?? '', 256)) !== '') $o['author'] = array_filter(['name' => $n, 'url' => $url($e['author']['url'] ?? null), 'icon_url' => $url($e['author']['icon_url'] ?? null)]);
        if (is_array($e['footer'] ?? null) && ($n = $txt($e['footer']['text'] ?? '', 2048)) !== '') $o['footer'] = array_filter(['text' => $n, 'icon_url' => $url($e['footer']['icon_url'] ?? null)]);
        foreach (['image', 'thumbnail'] as $k) if (is_array($e[$k] ?? null) && ($u = $url($e[$k]['url'] ?? null))) $o[$k] = ['url' => $u];
        if (is_string($e['timestamp'] ?? null) && strtotime($e['timestamp'])) $o['timestamp'] = gmdate('Y-m-d\TH:i:s.000\Z', strtotime($e['timestamp']));
        $fields = [];
        foreach (array_slice(is_array($e['fields'] ?? null) ? $e['fields'] : [], 0, 25) as $f) {
            if (!is_array($f)) continue;
            $fn = $txt($f['name'] ?? '', 256); $fv = $txt($f['value'] ?? '', 1024);
            if ($fn === '' && $fv === '') continue;
            $fields[] = ['name' => $fn !== '' ? $fn : "\u{200B}", 'value' => $fv !== '' ? $fv : "\u{200B}", 'inline' => !empty($f['inline'])];
        }
        if ($fields) $o['fields'] = $fields;
        return $o;
    };
    foreach (array_slice(is_array($in['embeds'] ?? null) ? $in['embeds'] : [], 0, 10) as $e) { if ($o = $clean($e)) $out['embeds'][] = $o; }
     
    foreach (array_slice(is_array($in['buttons'] ?? null) ? $in['buttons'] : [], 0, 5) as $b) {
        if (!is_array($b) || ($label = $txt($b['label'] ?? '', 80)) === '') continue;
        $btn = ['label' => $label, 'emoji' => $txt($b['emoji'] ?? '', 32), 'style' => in_array($b['style'] ?? '', ['primary', 'secondary', 'success', 'danger'], true) ? $b['style'] : 'secondary'];
        if (($b['kind'] ?? '') === 'link') {
            if (!($u = $url($b['url'] ?? null))) continue;
            $out['buttons'][] = $btn + ['kind' => 'link', 'url' => $u];
        } else {
            $h = is_array($b['hidden'] ?? null) ? $b['hidden'] : [];
            $hidden = ['content' => $txt($h['content'] ?? '', 2000), 'embeds' => []];
            foreach (array_slice(is_array($h['embeds'] ?? null) ? $h['embeds'] : [], 0, 3) as $e) { if ($o = $clean($e)) $hidden['embeds'][] = $o; }
            if ($hidden['content'] === '' && !$hidden['embeds']) continue;
            $out['buttons'][] = $btn + ['kind' => 'reveal', 'hidden' => $hidden];
        }
    }
     
    $out['reactions'] = []; $seen = [];
    foreach (array_slice(is_array($in['reactions'] ?? null) ? $in['reactions'] : [], 0, 20) as $r) {
        if (!is_array($r)) continue;
        $e = trim((string)($r['emoji'] ?? '')); $rid = preg_replace('/\D/', '', (string)($r['role_id'] ?? ''));
        if ($rid === '' || $e === '') continue;
        if (preg_match('/^<?(a?):?([A-Za-z0-9_~]{2,32}):(\d{15,25})>?$/', $e, $mm)) $e = '<' . $mm[1] . ':' . $mm[2] . ':' . $mm[3] . '>';    
        elseif (mb_strlen($e) > 16 || preg_match('/[A-Za-z<>:]/', $e) || (preg_match('/[0-9#*]/', $e) && !str_contains($e, "\u{20E3}"))) continue;    
        $key = str_replace("\u{FE0F}", '', $e);
        if (isset($seen[$key])) continue;
        $seen[$key] = true;
        $out['reactions'][] = ['emoji' => $e, 'role_id' => $rid];
    }
    $out['reaction_unique'] = !empty($in['reaction_unique']) && $out['reactions'];
    if (!$out['reactions']) { unset($out['reactions'], $out['reaction_unique']); }
    return $out;
}
 
function message_chars(array $m): int {
    $n = 0;
    foreach ($m['embeds'] as $e) {
        $n += mb_strlen($e['title'] ?? '') + mb_strlen($e['description'] ?? '') + mb_strlen($e['author']['name'] ?? '') + mb_strlen($e['footer']['text'] ?? '');
        foreach ($e['fields'] ?? [] as $f) $n += mb_strlen($f['name']) + mb_strlen($f['value']);
    }
    return $n;
}
 
 
 
const PUNISH_LADDER = ['Verbal Warning', 'Command Warning', 'Timeout (1hr)', 'Timeout (12hr)', 'Timeout (24hr)', 'Kick/Softban', 'Temporary Ban (24hr)', 'Temporary Ban (1 week)', 'Permanent Ban'];
const PUNISH_SEP = ' → ';
function punish_steps(string $text): array {
    $parts = array_map(fn($x) => strtolower(trim($x)), preg_split('/\s*(?:-->|->|→)\s*/u', $text) ?: []);
    return array_values(array_filter(PUNISH_LADDER, fn($s) => in_array(strtolower($s), $parts, true)));
}
 
function job_guild(?string $gid): string { return (string)($gid ?: setting('home_guild_id')); }
 
function role_name(string $gid, string $rid): string {
    $r = one('SELECT name FROM server_roles WHERE guild_id=? AND role_id=?', [$gid, $rid]) ?: one('SELECT name FROM guild_roles WHERE role_id=?', [$rid]);
    return (string)($r['name'] ?? $rid);
}
 
function divider_label(string $name): ?string {
    $n = trim((string)preg_replace('/[\x{200B}-\x{200F}\x{2060}\x{FEFF}\x{3164}\x{2800}\x{00A0}]/u', ' ', $name));
    if (!preg_match('/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/us', $n, $m)) return null;
    $lines = '/[\-\x{2010}-\x{2015}\x{2500}-\x{257F}\x{25AC}\x{23AF}=_~\x{2022}\x{00B7}\x{22C5}*]/u';
    if (preg_match_all($lines, $m[1]) < 2 && preg_match_all($lines, $m[3]) < 2) return null;
    $label = trim($m[2]);
    return $label === '' ? '' : mb_substr($label, 0, 40);
}
 
const JOB_AREAS = ['Developer', 'Artist / Designer', 'Community / Moderation', 'Other'];
function job_areas(string $gid): array {
    $out = [];
    foreach (server_role_list($gid) as $r) { $l = divider_label((string)$r['name']); if ($l !== null && $l !== '' && !in_array($l, $out, true)) $out[] = $l; }
    return $out ?: JOB_AREAS;
}
 
function server_role_list(string $gid): array {
    $rows = all('SELECT role_id,name,color FROM server_roles WHERE guild_id=? AND managed=0 ORDER BY position DESC', [$gid]);
    if (!$rows && $gid !== '' && $gid === (string)setting('home_guild_id')) $rows = all('SELECT role_id,name,color FROM guild_roles ORDER BY position DESC');
    return $rows;
}
function punish_text(array $picked): string {
    return implode(PUNISH_SEP, array_values(array_filter(PUNISH_LADDER, fn($s) => in_array($s, $picked, true))));
}

function job_questions(?string $json): array {
    $out = [];
    foreach (array_slice(json_decode((string)$json, true) ?: [], 0, 20) as $x) {
        if (!is_array($x) || ($q = str($x['q'] ?? '', 200)) === '') continue;
        $out[] = ['q' => $q, 'type' => ($x['type'] ?? '') === 'long' ? 'long' : 'short', 'required' => !empty($x['required'])];
    }
    return $out;
}
function id_list(?string $json): array { return array_values(array_filter(array_map(fn($v) => digits($v), json_decode((string)$json, true) ?: []))); }
 
 
function rank_map(string $key): array {
    $out = [];
    foreach ((json_decode((string)setting($key), true) ?: []) as $k => $v) if (is_string($k) && in_array((int)$v, [1, 2, 3], true)) $out[$k] = (int)$v;
    return $out;
}
function is_verified(array $u): bool { return !empty($u['roblox_verified_at']) && !empty($u['roblox_id']); }
function staff_role(array $u): ?string {
    $owner = setting('owner_discord_id');
    if ($owner && hash_equals($owner, (string)$u['discord_id'])) return 'owner';
    $r = one('SELECT role FROM staff WHERE discord_id=?', [$u['discord_id']]);
    return $r ? $r['role'] : null;
}
function staff_rank(array $u): int { return ['moderator' => 1, 'admin' => 2, 'owner' => 3][staff_role($u) ?? ''] ?? 0; }
function dept_rank_of(?string $departments): int {
    $best = 0;
    foreach (explode(',', (string)$departments) as $d) { $best = max($best, DEPTS[trim($d)] ?? 0); }
    return $best;
}
 
function member_caps(array $u): array {
    if (staff_role($u) === 'owner') $dept = 99; else $dept = 0;
    $r = one('SELECT departments, post_approver FROM team_members WHERE discord_id=?', [$u['discord_id']]);
    if ($r) $dept = max($dept, dept_rank_of($r['departments']));
    return ['dept' => $dept, 'approver' => (bool)($r['post_approver'] ?? 0)];
}
function avatar_url(string $discordId, ?string $hash, int $size = 128): string {
     
    if ($hash && preg_match('/^guild:(\d+):(\w+)$/', $hash, $g)) return 'https://cdn.discordapp.com/guilds/' . $g[1] . '/users/' . $discordId . '/avatars/' . $g[2] . '.png?size=' . $size;
    if ($hash) return 'https://cdn.discordapp.com/avatars/' . $discordId . '/' . $hash . '.png?size=' . $size;
    return rtrim(base_url(), '/') . '/assets/brand/avatar.png';  
}
 




function roblox_creds(): array { return [(string)(setting('roblox_client_id') ?: ''), dec(setting('roblox_client_secret'))]; }
function roblox_oauth_on(): bool { [$id, $sec] = roblox_creds(); return $id !== '' && $sec !== ''; }
const ROBLOX_WORDS = ['apple', 'arrow', 'autumn', 'banana', 'beach', 'berry', 'bird', 'blossom', 'breeze', 'bridge', 'brook', 'butter', 'cactus', 'candle', 'canyon', 'castle', 'cedar',
    'cherry', 'cloud', 'clover', 'comet', 'coral', 'cotton', 'daisy', 'dawn', 'desert', 'dolphin', 'dragon', 'dream', 'eagle', 'ember', 'falcon', 'feather', 'fern', 'field', 'flame',
    'forest', 'fox', 'frost', 'garden', 'glacier', 'golden', 'grape', 'harbor', 'hazel', 'hill', 'honey', 'island', 'ivory', 'jade', 'jungle', 'kite', 'koala', 'lake', 'lantern',
    'lemon', 'lily', 'lotus', 'maple', 'meadow', 'melon', 'mint', 'misty', 'moon', 'mountain', 'ocean', 'olive', 'orange', 'orchid', 'otter', 'panda', 'peach', 'pearl', 'pebble',
    'pepper', 'pine', 'planet', 'plum', 'pond', 'pumpkin', 'rabbit', 'rain', 'river', 'robin', 'rose', 'ruby', 'sage', 'sail', 'shadow', 'silver', 'sky', 'snow', 'spark', 'spring',
    'star', 'stone', 'storm', 'summer', 'sun', 'sunset', 'swan', 'thunder', 'tiger', 'tulip', 'valley', 'violet', 'wave', 'willow', 'winter', 'wolf', 'yellow'];
function roblox_word_code(): string {
    $w = ROBLOX_WORDS; $out = [];
    while (count($out) < 3) { $x = $w[random_int(0, count($w) - 1)]; if (!in_array($x, $out, true)) $out[] = $x; }
    return implode(' ', $out);
}
 
function roblox_code_found(string $desc, string $code): bool {
    $n = fn(string $x) => ' ' . trim((string)preg_replace('/[^a-z0-9]+/', ' ', strtolower($x))) . ' ';
    return $code !== '' && str_contains($n($desc), $n($code));
}
function roblox_lookup_id(string $id): ?array {
    $j = http_json('GET', roblox_api() . '/v1/users/' . rawurlencode($id), [CURLOPT_HTTPHEADER => ['Accept: application/json']]);
    return $j && !empty($j['name']) ? ['id' => (string)$j['id'], 'name' => (string)$j['name']] : null;
}
function public_user(array $u): array {
    $pending = null;
    if (!is_verified($u) && !empty($u['roblox_code']) && ($u['roblox_code_expires'] ?? '') > now()) $pending = ['username' => $u['roblox_username'], 'code' => $u['roblox_code']];
    return [
        'roblox_oauth' => roblox_oauth_on(),
        'id' => (int)$u['id'], 'discord_id' => (string)$u['discord_id'], 'username' => $u['username'], 'avatar' => $u['avatar'] ? avatar_url($u['discord_id'], $u['avatar'], 64) : null,
        'discord_linked' => true,
        'roblox' => is_verified($u) ? ['id' => $u['roblox_id'], 'username' => $u['roblox_username']] : null,
        'roblox_pending' => $pending,
        'verified' => is_verified($u), 'staff' => staff_role($u),
    ];
}
function upsert_discord_user(string $did, string $name, ?string $avatar): int {
    $u = one('SELECT id FROM users WHERE discord_id=?', [$did]);
    if ($u) { q('UPDATE users SET username=?,avatar=?,last_login_at=? WHERE id=?', [$name, $avatar, now(), $u['id']]); $id = (int)$u['id']; }
    else $id = insert('users', ['discord_id' => $did, 'username' => $name, 'avatar' => $avatar, 'created_at' => now(), 'last_login_at' => now()]);
    if ($avatar) q('UPDATE team_members SET avatar=? WHERE discord_id=?', [$avatar, $did]);
    return $id;
}

 
function roblox_api(): string { return rtrim((string)cfg('roblox_users_api', 'https://users.roblox.com'), '/'); }
function roblox_lookup(string $name): ?array {
    $name = trim($name);
    if (!preg_match('/^[A-Za-z0-9_]{3,20}$/', $name)) return null;
    $j = http_json('POST', roblox_api() . '/v1/usernames/users', [CURLOPT_POSTFIELDS => json_encode(['usernames' => [$name], 'excludeBannedUsers' => false]), CURLOPT_HTTPHEADER => ['Content-Type: application/json']]);
    $u = $j['data'][0] ?? null;
    if (!$u || empty($u['id']) || !preg_match('/^\d{1,20}$/', (string)$u['id'])) return null;
    return ['id' => (string)$u['id'], 'name' => str($u['name'] ?? $name, 40)];
}
function roblox_description(string $id): ?string {
    $j = http_json('GET', roblox_api() . '/v1/users/' . rawurlencode($id), [CURLOPT_HTTPHEADER => ['Accept: application/json']]);
    return $j === null ? null : (string)($j['description'] ?? '');
}

 
const HUB_PERMS = ['manage_messages' => 'Delete other members\' messages in this server', 'announce' => 'Post in staff-post channels (announcements)', 'see_all' => 'See every channel in this server'];
 
function hub_roles_of(int $uid): array {
    static $cache = [];
    if (!isset($cache[$uid])) $cache[$uid] = all('SELECT r.* FROM hub_member_roles m JOIN hub_roles r ON r.id=m.role_id WHERE m.user_id=? ORDER BY r.position, r.id', [$uid]);
    return $cache[$uid];
}
function hub_role_ids(int $uid, int $serverId = 0): array {
    return array_values(array_map(fn($r) => (int)$r['id'], array_filter(hub_roles_of($uid), fn($r) => !$serverId || (int)$r['server_id'] === $serverId)));
}
function hub_has_perm(array $u, int $serverId, string $perm): bool {
    if (staff_rank($u) >= 1) return true;
    foreach (hub_roles_of((int)$u['id']) as $r) if ((int)$r['server_id'] === $serverId && in_array($perm, explode(',', (string)$r['perms']), true)) return true;
    return false;
}
function hub_ids(string $csv): array { return array_values(array_filter(array_map('intval', explode(',', $csv)))); }
function hub_server_visible(array $u, array $srv): bool { return !(int)$srv['staff_only'] || staff_rank($u) >= 1; }
 
function hub_can_view(array $u, array $ch): bool {
    if (staff_rank($u) >= 1) return true;
    if ((int)$ch['staff_only']) return false;
    $need = hub_ids((string)($ch['view_roles'] ?? ''));
    if (!$need || hub_has_perm($u, (int)$ch['server_id'], 'see_all')) return true;
    return (bool)array_intersect($need, hub_role_ids((int)$u['id'], (int)$ch['server_id']));
}
 
function hub_can_post(array $u, array $ch): bool {
    if (staff_rank($u) >= 1) return true;
    $mine = hub_role_ids((int)$u['id'], (int)$ch['server_id']);
    $need = hub_ids((string)($ch['post_roles'] ?? ''));
    if ($need && array_intersect($need, $mine)) return true;
    if ((int)$ch['read_only']) return hub_has_perm($u, (int)$ch['server_id'], 'announce');
    return !$need;
}
function hub_server_out(array $s): array {
    return ['id' => (int)$s['id'], 'name' => (string)$s['name'], 'description' => (string)($s['description'] ?? ''), 'icon' => (string)$s['icon'], 'accent' => (string)($s['accent'] ?? ''), 'game' => (string)($s['game_slug'] ?? ''),
        'icon_img' => $s['icon'] === 'upload' && $s['icon_at'] ? '/api/hub/server-icon/' . (int)$s['id'] . '?v=' . strtotime((string)$s['icon_at'] . ' UTC') : null, 'staff_only' => (bool)(int)$s['staff_only']];
}
function hub_role_out(array $r): array {
    return ['id' => (int)$r['id'], 'server_id' => (int)$r['server_id'], 'name' => (string)$r['name'], 'color' => (string)($r['color'] ?? ''), 'icon' => (string)($r['icon'] ?? ''), 'hoist' => (bool)(int)$r['hoist'], 'position' => (int)$r['position']];
}

 
function hub_gif_conf(): ?array {
    $prov = (string)(setting('gif_provider') ?: 'klipy');
    $key = dec(setting('gif_key'));
    return $key === '' || !in_array($prov, ['klipy', 'giphy'], true) ? null : ['provider' => $prov, 'key' => $key];
}
 
function hub_gif_search(string $q, int $page, int $uid): ?array {
    $g = hub_gif_conf();
    if (!$g) return null;
    $q = trim(mb_substr($q, 0, 60)); $page = max(1, min(20, $page)); $out = [];
    if ($g['provider'] === 'klipy') {
        $args = ['page' => $page, 'per_page' => 24, 'customer_id' => substr(hash('sha256', 'gif' . $uid . cfg('app_key')), 0, 24), 'locale' => 'en_US', 'rating' => 'pg-13'];
        if ($q !== '') $args['q'] = $q;
        $j = http_json('GET', 'https://api.klipy.com/api/v1/' . rawurlencode($g['key']) . '/gifs/' . ($q === '' ? 'trending' : 'search') . '?' . http_build_query($args), [CURLOPT_HTTPHEADER => ['Accept: application/json']]);
        if ($j === null) return null;
        $pick = function (array $f, array $sizes, string $fmt = 'gif'): ?array {
            foreach ($sizes as $sz) { $v = $f[$sz][$fmt] ?? null; if (is_array($v) && !empty($v['url'])) return $v; }
            return null;
        };
        foreach ((array)($j['data']['data'] ?? []) as $it) {
            $f = $it['file'] ?? $it['files'] ?? null;
            if (!is_array($f) || ($it['type'] ?? 'gif') === 'ad') continue;
            $prev = $pick($f, ['xs', 'sm', 'md'], 'webp') ?? $pick($f, ['xs', 'sm', 'md']);
            $av = $pick($f, ['sm', 'md', 'xs']); $bn = $pick($f, ['md', 'sm', 'hd']);
            if (!$prev || !$av || !$bn) continue;
            $out[] = ['id' => (string)($it['id'] ?? $it['slug'] ?? ''), 'title' => (string)($it['title'] ?? ''), 'preview' => (string)$prev['url'], 'avatar' => (string)$av['url'], 'banner' => (string)$bn['url'],
                'w' => (int)($prev['width'] ?? 0), 'h' => (int)($prev['height'] ?? 0)];
        }
        return ['provider' => 'klipy', 'results' => $out, 'next' => !empty($j['data']['has_next'])];
    }
    $args = ['api_key' => $g['key'], 'limit' => 24, 'offset' => ($page - 1) * 24, 'rating' => 'pg-13', 'bundle' => 'messaging_non_clips'];
    if ($q !== '') $args['q'] = $q;
    $j = http_json('GET', 'https://api.giphy.com/v1/gifs/' . ($q === '' ? 'trending' : 'search') . '?' . http_build_query($args), [CURLOPT_HTTPHEADER => ['Accept: application/json']]);
    if ($j === null) return null;
    foreach ((array)($j['data'] ?? []) as $it) {
        $im = (array)($it['images'] ?? []);
        $prev = $im['fixed_width_small'] ?? $im['fixed_width'] ?? null; $av = $im['fixed_width'] ?? null; $bn = $im['downsized'] ?? $im['fixed_width'] ?? null;
        if (empty($prev['url']) || empty($av['url']) || empty($bn['url'])) continue;
        $out[] = ['id' => (string)($it['id'] ?? ''), 'title' => (string)($it['title'] ?? ''), 'preview' => (string)($prev['webp'] ?? $prev['url']), 'avatar' => (string)$av['url'], 'banner' => (string)$bn['url'],
            'w' => (int)($prev['width'] ?? 0), 'h' => (int)($prev['height'] ?? 0)];
    }
    $pg = (array)($j['pagination'] ?? []);
    return ['provider' => 'giphy', 'results' => $out, 'next' => ((int)($pg['offset'] ?? 0) + (int)($pg['count'] ?? 0)) < (int)($pg['total_count'] ?? 0)];
}
 
function hub_gif_fetch(string $url): ?string {
    $host = strtolower((string)parse_url($url, PHP_URL_HOST));
    if (parse_url($url, PHP_URL_SCHEME) !== 'https' || !preg_match('/(^|\.)(klipy\.com|klipy\.co|giphy\.com)$/', $host)) return null;
    $buf = ''; $max = 3 * 1048576;
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_TIMEOUT => 15, CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_WRITEFUNCTION => function ($ch, $d) use (&$buf, $max) { $buf .= $d; return strlen($buf) > $max ? 0 : strlen($d); }]);
    $ok = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return $ok && $code === 200 && strlen($buf) <= $max ? $buf : null;
}

 
function smtp_conf(): ?array {
    $pass = (string)(getenv('AXM_SMTP_PASS') ?: cfg('smtp_pass', '') ?: dec(setting('smtp_pass')));
    if ($pass === '') return null;
    return [
        'host' => (string)(setting('smtp_host') ?: cfg('smtp_host', 'smtp.hostinger.com')),
        'port' => (int)(setting('smtp_port') ?: cfg('smtp_port', 465)),
        'user' => (string)(setting('smtp_user') ?: cfg('smtp_user', 'contact@axiomategames.com')),
        'secure' => (string)cfg('smtp_secure', 'ssl'), 'pass' => $pass,
    ];
}
function smtp_send(array $c, string $to, string $subject, string $text, ?string $replyTo = null): bool {
    $fp = @stream_socket_client(($c['secure'] === 'ssl' ? 'ssl://' : 'tcp://') . $c['host'] . ':' . $c['port'], $en, $es, 12);
    if (!$fp) { mail_error('cannot reach ' . $c['host'] . ':' . $c['port'] . ' (' . $es . ')'); return false; }
    stream_set_timeout($fp, 12);
    $read = function () use ($fp): string { $o = ''; while (($l = fgets($fp, 515)) !== false) { $o .= $l; if (strlen($l) < 4 || $l[3] === ' ') break; } return $o; };
    $cmd = function (string $line, string $expect) use ($fp, $read): bool { fwrite($fp, $line . "\r\n"); $r = $read(); if (str_starts_with($r, $expect)) return true; mail_error('the mail server said: ' . trim($r)); return false; };
    $clean = fn(string $s): string => trim(preg_replace('/[\r\n]+/', ' ', $s) ?? '');
    $ok = str_starts_with($read(), '220') && $cmd('EHLO axiomategames.com', '250')
        && $cmd('AUTH LOGIN', '334') && $cmd(base64_encode($c['user']), '334') && $cmd(base64_encode($c['pass']), '235')
        && $cmd('MAIL FROM:<' . $clean($c['user']) . '>', '250') && $cmd('RCPT TO:<' . $clean($to) . '>', '250') && $cmd('DATA', '354');
    if ($ok) {
        $headers = 'From: Axiomate Games <' . $clean($c['user']) . ">\r\nTo: <" . $clean($to) . ">\r\n" . ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL) ? 'Reply-To: <' . $clean($replyTo) . ">\r\n" : '') .
            'Subject: =?UTF-8?B?' . base64_encode($clean($subject)) . "?=\r\nDate: " . gmdate('r') . "\r\nMessage-ID: <" . bin2hex(random_bytes(12)) . '@axiomategames.com>' . "\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n";
        $data = $headers . "\r\n" . chunk_split(base64_encode($text));
        fwrite($fp, $data . "\r\n.\r\n");
        $r = $read(); $ok = str_starts_with($r, '250');
        if (!$ok) mail_error('the mail server refused the message: ' . trim($r));
    }
    @fwrite($fp, "QUIT\r\n"); @fclose($fp);
    return $ok;
}
 
function mail_error(string $why): void {
    $why = substr(preg_replace('/\s+/', ' ', $why) ?? '', 0, 300);
    try { set_setting('mail_last_error', gmdate('Y-m-d H:i') . ' UTC: ' . $why); } catch (Throwable $e) {   }
    error_log('axiomate mail: ' . $why);
}
 
function php_mail(string $to, string $subject, string $text, ?string $replyTo = null): bool {
    if (!function_exists('mail')) { mail_error('PHP mail() is turned off on this server'); return false; }
    $from = (string)(cfg('mail_from', '') ?: 'noreply@axiomategames.com');
    $clean = fn(string $v): string => trim(preg_replace('/[\r\n]+/', ' ', $v) ?? '');
    $headers = "From: Axiomate Games <" . $clean($from) . ">\r\n" . ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL) ? 'Reply-To: <' . $clean($replyTo) . ">\r\n" : '')
        . 'Message-ID: <' . bin2hex(random_bytes(12)) . "@axiomategames.com>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64";
    $ok = @mail($clean($to), '=?UTF-8?B?' . base64_encode($clean($subject)) . '?=', chunk_split(base64_encode($text)), $headers, '-f' . $from);
    if (!$ok) mail_error('PHP mail() did not accept the message');
    return $ok;
}
function send_mail(string $to, string $subject, string $text, ?string $replyTo = null): bool {
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    if (cfg('mail') === 'log') { file_put_contents(sys_get_temp_dir() . '/axm_mail.log', '[' . now() . "] TO $to | $subject\n$text\n\n", FILE_APPEND); return true; }
    $c = smtp_conf();
    if ($c && smtp_send($c, $to, $subject, $text, $replyTo)) return true;
    if (cfg('mail') === 'smtp') return false;
    if (!$c) mail_error('no mailbox password is saved (Discord panel, Settings, Contact mailbox), so the server mail was used');
    return php_mail($to, $subject, $text, $replyTo);
}

 
function discord_creds(): array { return [setting('discord_client_id') ?: '', dec(setting('discord_client_secret'))]; }
function safe_next(?string $n): string { return ($n && preg_match('#^/[A-Za-z0-9/_\-\#?=&.%]*$#', $n) && !str_starts_with($n, '//')) ? $n : '/account'; }
function http_json(string $method, string $url, array $opts): ?array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_CUSTOMREQUEST => $method] + $opts);
    $res = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($res === false || $code < 200 || $code >= 300) return null;
    $j = json_decode($res, true);
    return is_array($j) ? $j : null;
}
