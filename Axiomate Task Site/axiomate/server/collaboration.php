<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
const TEAM_ROLES = ['developer', 'tester', 'voice_actor', 'studio_director', 'studio_owner', 'studio_manager'];
function workspaceAccess(string $id): array {
    global $user;
    requireAccount();
    $item = query('SELECT * FROM workspaces WHERE id=?', [$id])->fetch();
    if (!$item) fail('Workspace not found.', 404);
    if ($item['account_id'] === $user['id']) { $item['canAdminTime'] = true; $item['canManage'] = true; $item['canReview'] = true; $item['memberRole'] = 'workspace_owner'; return $item; }
    $member = query('SELECT role FROM workspace_members WHERE workspace_id=? AND user_id=? AND status="active"', [$id, $user['id']])->fetch();
    if (!$member) fail('Workspace not found.', 404);
    $item['canAdminTime'] = in_array($member['role'],['studio_director','studio_manager'],true); $item['canManage'] = false; $item['canReview'] = in_array($member['role'],['studio_director','studio_manager'],true); $item['memberRole'] = $member['role'];
    return $item;
}
function requireManager(array $workspace): void { if (!$workspace['canManage']) fail('Only the workspace owner can manage this.', 403); }
function teamMembers(string $id): array {
    $owner = query('SELECT u.id,u.name,u.email,"workspace_owner" AS role FROM users u JOIN workspaces w ON w.account_id=u.id WHERE w.id=?', [$id])->fetch();
    $others = query('SELECT u.id,u.name,u.email,m.role FROM users u JOIN workspace_members m ON m.user_id=u.id WHERE m.workspace_id=? AND m.status="active" ORDER BY u.name', [$id])->fetchAll();
    return array_merge([$owner], $others);
}
function uploadLimit(): int {
    $parse = function(string $value): int { $unit = strtolower(substr($value,-1)); return (int)$value * match($unit){'g'=>1073741824,'m'=>1048576,'k'=>1024,default=>1}; };
    return min(25*1048576, $parse(ini_get('upload_max_filesize')) ?: 25*1048576, $parse(ini_get('post_max_size')) ?: 30*1048576);
}
function taskSubmissions(string $workspaceId): array {
    return query('SELECT s.id,s.task_id AS taskId,s.user_id AS userId,s.filename,s.bytes,s.note,s.created,s.review_status AS reviewStatus,s.review_note AS reviewNote,s.reviewed_at AS reviewedAt,r.name AS reviewedBy,u.name AS submittedBy FROM submissions s JOIN users u ON u.id=s.user_id LEFT JOIN users r ON r.id=s.reviewer_id WHERE s.workspace_id=? AND (s.task_id IN (SELECT t.id FROM tasks t WHERE t.board_id IS NULL OR NOT EXISTS(SELECT 1 FROM board_blocks b WHERE b.board_id=t.board_id AND b.user_id=?))) ORDER BY s.rowid DESC', [$workspaceId, $GLOBALS['user']['id']])->fetchAll();
}
