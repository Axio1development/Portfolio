<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
try {
    define('AXIOMATE_RUNTIME', true);
    require __DIR__ . '/_server/bootstrap.php';
    $method = $_SERVER['REQUEST_METHOD'];
    if (!in_array($method, ['GET', 'POST'], true)) fail('Method not allowed', 405);
    if ($method === 'POST') {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'])) fail('Invalid origin', 403);
        if (!str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') && !(in_array(($_GET['action'] ?? ''), ['uploadSubmission','uploadReference'],true) && str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data'))) fail('JSON required', 415);
    }
    ini_set('session.use_strict_mode', '1');
    session_name('axiomate_session');
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
    if (isset($_SESSION['last']) && time() - $_SESSION['last'] > 43200) $_SESSION = [];
    $_SESSION['last'] = time();
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    $action = $_GET['action'] ?? 'state';
    if ($method !== 'POST' && !in_array($action, ['state','inviteInfo','download','referenceMedia'], true)) fail('POST required', 405);
    $body = [];
    if ($method === 'POST') {
        if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) fail('Session expired. Refresh and try again.', 403);
        if (in_array($action,['uploadSubmission','uploadReference'],true)) {
            if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > uploadLimit()+1048576) fail('The upload is too large for this server.',413);
            $body = $_POST;
        } else {
        $raw = file_get_contents('php://input', false, null, 0, 65537);
        if (strlen($raw) > 65536) fail('Request too large', 413);
        try { $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); } catch (JsonException $e) { fail('Invalid JSON'); }
        if (!is_array($body)) fail('Invalid request');
        }
    }
    $user = isset($_SESSION['uid']) ? query('SELECT id,name,email,role,status,plan,created FROM users WHERE id=?', [$_SESSION['uid']])->fetch() : false;
    if (in_array($action,['inviteInfo','acceptInvite'],true)) require __DIR__ . '/_server/routes/invitations.php';
    require __DIR__ . '/_server/routes/auth.php';
    requireAccount();
    require __DIR__ . '/_server/routes/workspaces.php';
    require __DIR__ . '/_server/routes/boards.php';
    require __DIR__ . '/_server/routes/task-clock.php';
    require __DIR__ . '/_server/routes/time.php';
    require __DIR__ . '/_server/routes/submissions.php';
    require __DIR__ . '/_server/routes/negotiations.php';
    require __DIR__ . '/_server/routes/references.php';
    require __DIR__ . '/_server/routes/tasks.php';
    fail('Unknown action', 404);
} catch (Throwable $e) {
    error_log('Axiomate: ' . $e->getMessage());
    reply(['error' => 'The server could not complete this request. Please try again.'], 500);
}
