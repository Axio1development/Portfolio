<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if ($action === 'inviteInfo') {
    $token = (string)($_GET['token'] ?? '');
    $invite = query('SELECT i.email,i.role,i.expires,i.accepted_by AS acceptedBy,i.revoked,w.name AS workspaceName,u.name AS invitedBy FROM invitations i JOIN workspaces w ON w.id=i.workspace_id JOIN users u ON u.id=w.account_id WHERE i.token_hash=?', [hash('sha256',$token)])->fetch();
    if (!$invite || $invite['revoked'] || $invite['expires'] < time()) fail('This invitation is expired or no longer available.',404);
    unset($invite['revoked']); reply(['invitation'=>$invite]);
}
if ($action === 'acceptInvite') {
    requireAccount();
    $db->exec('BEGIN IMMEDIATE');
    $invite = query('SELECT * FROM invitations WHERE token_hash=?', [hash('sha256',(string)($body['token'] ?? ''))])->fetch();
    if (!$invite || $invite['revoked'] || $invite['expires'] < time()) { $db->exec('ROLLBACK'); fail('This invitation is expired or no longer available.',404); }
    if (strtolower($user['email']) !== $invite['email']) { $db->exec('ROLLBACK'); fail('Sign in with the email address this invitation was sent to.',403); }
    if ($invite['accepted_by'] && $invite['accepted_by'] !== $user['id']) { $db->exec('ROLLBACK'); fail('This invitation has already been used.',409); }
    if (!$invite['accepted_by']) {
        query('INSERT INTO workspace_members(workspace_id,user_id,role,status,joined) VALUES(?,?,?,"active",?) ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=excluded.role,status="active",joined=excluded.joined', [$invite['workspace_id'],$user['id'],$invite['role'],gmdate('c')]);
        query('UPDATE invitations SET accepted_by=? WHERE id=?', [$user['id'],$invite['id']]);
        audit('Joined the workspace as '.str_replace('_',' ',$invite['role']),$invite['workspace_id']);
    }
    $db->exec('COMMIT'); reply(['workspaceId'=>$invite['workspace_id']]);
}
