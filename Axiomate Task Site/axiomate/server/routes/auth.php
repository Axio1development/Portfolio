<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if ($action === 'state') reply(['user' => $user ?: null, 'csrf' => $_SESSION['csrf'], 'plans' => PLANS, 'ownerConfigured' => (bool) query('SELECT 1 FROM users WHERE id=? AND role="owner"', [SITE_OWNER_ACCOUNT_ID])->fetchColumn()]);
if (in_array($action, ['register', 'login'], true)) {
    rate('auth:' . ($_SERVER['REMOTE_ADDR'] ?? 'local'), 30);
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) fail('Enter a valid email address.');
    if (strlen($password) < 12 || strlen($password) > 200) fail('Use a password between 12 and 200 characters.');
    if ($action === 'login') {
        $record = query('SELECT * FROM users WHERE email=?', [$email])->fetch();
        $valid = password_verify($password, $record['password'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
        if (!$record || !$valid) fail('Email or password is incorrect.', 401);
        if ($record['status'] !== 'approved') fail('This account is disabled. Contact support.', 403);
        $id = $record['id'];
    } else {
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '' || strlen($name) > 80) fail('Enter your name (up to 80 characters).');
        if (query('SELECT 1 FROM users WHERE email=?', [$email])->fetchColumn()) fail('This email already has an account. Sign in instead.', 409);
        $id = bin2hex(random_bytes(16));
        try {
            query('INSERT INTO users(id,name,email,password,role,status,created,plan) VALUES(?,?,?,?,?,?,?,?)', [$id, $name, $email, password_hash($password, PASSWORD_DEFAULT), 'member', 'approved', gmdate('c'), '']);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') fail('This email already has an account.', 409);
            throw $e;
        }
    }
    session_regenerate_id(true);
    $_SESSION['uid'] = $id;
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    reply(['ok' => true], $action === 'register' ? 201 : 200);
}
if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    setcookie('axiomate_session', '', ['expires' => time() - 3600, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
    reply(['ok' => true]);
}
requireAccount();
if ($action === 'choosePlan') {
    if ($user['role'] === 'owner') fail('Your owner account already has unlimited access.');
    $plan = (string) ($body['plan'] ?? '');
    if (!isset(PLANS[$plan])) fail('Choose a valid plan.');
    $count = query('SELECT COUNT(*) FROM tasks WHERE account_id=?', [$user['id']])->fetchColumn();
    if ($count > PLANS[$plan]['taskLimit']) fail('Remove some tasks before switching to this plan.');
    query('UPDATE users SET plan=? WHERE id=?', [$plan, $user['id']]);
    audit('Selected the ' . PLANS[$plan]['name'] . ' plan');
    reply(['ok' => true]);
}
if ($action === 'password') {
    rate('password:' . $user['id'], 10);
    $hash = query('SELECT password FROM users WHERE id=?', [$user['id']])->fetchColumn();
    if (!password_verify((string) ($body['currentPassword'] ?? ''), $hash)) fail('Current password is incorrect.');
    $next = (string) ($body['newPassword'] ?? '');
    if (strlen($next) < 12 || strlen($next) > 200) fail('Use 12 to 200 characters.');
    query('UPDATE users SET password=? WHERE id=?', [password_hash($next, PASSWORD_DEFAULT), $user['id']]);
    session_regenerate_id(true);
    reply(['ok' => true]);
}
