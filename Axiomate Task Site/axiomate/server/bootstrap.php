<?php
declare(strict_types=1);
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
function reply(array $value, int $status = 200): never {
    http_response_code($status);
    echo json_encode($value, JSON_THROW_ON_ERROR);
    exit;
}
function fail(string $message, int $status = 400): never { reply(['error' => $message], $status); }
function query(string $sql, array $params = []): PDOStatement {
    global $db;
    $statement = $db->prepare($sql);
    $statement->execute($params);
    return $statement;
}
function audit(string $message, ?string $workspaceId = null, ?string $boardId = null): void {
    global $user, $workspace, $board;
    $boardId ??= $board['id'] ?? null;
    $workspaceId ??= $workspace['id'] ?? null;
    query('INSERT INTO audit(actor,message,created,account_id,workspace_id,board_id) VALUES(?,?,?,?,?,?)', [$user['name'], $message, gmdate('c'), $user['id'], $workspaceId, $boardId]);
}
function rate(string $key, int $limit): void {
    $now = time();
    query('DELETE FROM attempts WHERE expires < ?', [$now]);
    query('INSERT INTO attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1', [$key, $now + 900]);
    if (query('SELECT count FROM attempts WHERE key=?', [$key])->fetchColumn() > $limit) fail('Too many attempts. Try again in 15 minutes.', 429);
}
function requireAccount(): void {
    global $user;
    if (!$user) fail('Please sign in.', 401);
    if ($user['status'] !== 'approved') fail('This account is disabled. Contact support.', 403);
}
function requirePlan(): void {
    global $user;
    requireAccount();
    if ($user['role'] === 'owner') return;
    if (!isset(PLANS[$user['plan']])) fail('Choose a plan to open your workspace.', 403);
}
const PLANS = [
    'starter' => ['name' => 'Starter', 'taskLimit' => 50],
    'pro' => ['name' => 'Pro', 'taskLimit' => 500],
    'business' => ['name' => 'Business', 'taskLimit' => 5000],
];
$path = getenv('AXIOMATE_DATA_DIR') ?: dirname(__DIR__, 2) . '/axiomate-private';
if (!is_dir($path) && !mkdir($path, 0700, true)) throw new RuntimeException('Cannot create private storage');
$db = new PDO('sqlite:' . $path . '/workspace.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$db->exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
require __DIR__ . '/migrate.php';

require __DIR__ . '/ownership.php';

require __DIR__ . '/collaboration.php';

require __DIR__ . '/boards.php';

require __DIR__ . '/pricing.php';

require __DIR__ . '/task-clock.php';
