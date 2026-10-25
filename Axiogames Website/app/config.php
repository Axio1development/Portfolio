<?php
 
if (getenv('AXM_DEV')) {
    return [
        'env' => 'dev', 'db_dsn' => 'sqlite:' . getenv('AXM_DB'), 'db_user' => null, 'db_pass' => null,
        'app_key' => 'dev-key-dev-key-dev-key-dev-key-0', 'base_url' => getenv('AXM_BASE') ?: 'http://localhost:8080',
        'setup_token' => 'devsetup', 'mail' => getenv('AXM_SMTP_PORT') ? 'smtp' : 'log', 'mail_from' => 'noreply@localhost',
        'roblox_users_api' => getenv('AXM_ROBLOX_API') ?: 'https://users.roblox.com',
        'smtp_host' => '127.0.0.1', 'smtp_port' => (int)(getenv('AXM_SMTP_PORT') ?: 465), 'smtp_secure' => 'none', 'smtp_user' => 'contact@axiomategames.com',
    ];
}
return require __DIR__ . '/secrets.php';
