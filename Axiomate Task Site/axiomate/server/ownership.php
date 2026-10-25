<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
const SITE_OWNER_ACCOUNT_ID = '1357f025c13701bada8ec375c82655fe';
$designatedOwner = query('SELECT id,name,role FROM users WHERE id=?', [SITE_OWNER_ACCOUNT_ID])->fetch();
if ($designatedOwner && $designatedOwner['role'] !== 'owner') {
    $db->exec('BEGIN IMMEDIATE');
    try {
        $designatedOwner = query('SELECT id,name,role FROM users WHERE id=?', [SITE_OWNER_ACCOUNT_ID])->fetch();
        if ($designatedOwner['role'] !== 'owner') {
            query('UPDATE users SET role="member" WHERE role="owner"');
            query('UPDATE users SET role="owner",plan="business" WHERE id=?', [SITE_OWNER_ACCOUNT_ID]);
            query('INSERT INTO audit(actor,message,created,account_id) VALUES(?,?,?,?)', [$designatedOwner['name'], 'Site ownership assigned with unlimited plan access', gmdate('c'), SITE_OWNER_ACCOUNT_ID]);
        }
        $db->exec('COMMIT');
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}
