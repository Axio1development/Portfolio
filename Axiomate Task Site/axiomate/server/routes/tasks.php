<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if ($action === 'workspace') {
    $tasks = query('SELECT payload,revision,board_id,column_id,price_cents,(SELECT COUNT(*) FROM task_offers o WHERE o.task_id=tasks.id AND o.status="pending") AS terms_pending FROM tasks WHERE workspace_id=? AND (board_id IS NULL OR NOT EXISTS(SELECT 1 FROM board_blocks b WHERE b.board_id=tasks.board_id AND b.user_id=?)) ORDER BY CASE WHEN json_extract(payload,"$.due") IS NULL OR json_extract(payload,"$.due")="" THEN 1 ELSE 0 END,json_extract(payload,"$.due"),id', [$workspace['id'],$user['id']])->fetchAll();
    reply([
        'tasks' => array_map(fn($task) => array_merge(json_decode($task['payload'], true), ['revision' => (int) $task['revision'], 'boardId'=>$task['board_id'], 'columnId'=>$task['column_id'], 'priceCents'=>(int)$task['price_cents'], 'termsPending'=>(bool)$task['terms_pending']]), $tasks),
        'activity' => query('SELECT actor,message,created FROM audit WHERE workspace_id=? AND (board_id IS NULL OR NOT EXISTS(SELECT 1 FROM board_blocks b WHERE b.board_id=audit.board_id AND b.user_id=?)) ORDER BY id DESC LIMIT 50', [$workspace['id'],$user['id']])->fetchAll(),
        'references'=>query('SELECT r.id,r.task_id AS taskId,r.title,r.url,r.mime,r.bytes,r.created,u.name AS addedBy FROM task_references r JOIN tasks t ON t.id=r.task_id JOIN users u ON u.id=r.user_id WHERE r.workspace_id=? AND NOT EXISTS(SELECT 1 FROM board_blocks b WHERE b.board_id=t.board_id AND b.user_id=?) ORDER BY r.rowid',[$workspace['id'],$user['id']])->fetchAll(),
        'clockApprovals'=>visibleClockApprovals($workspace['id']),
        'negotiations'=>visibleOffers($workspace['id']),
        'members' => teamMembers($workspace['id']), 'submissions' => taskSubmissions($workspace['id']), 'canManage' => $workspace['canManage'], 'canReview' => $workspace['canReview'], 'canAdminTime'=>$workspace['canAdminTime'], 'memberRole' => $workspace['memberRole'], 'uploadLimitBytes' => uploadLimit(),
    ]);
}
if ($action === 'saveTask') {
    $task = $body['task'] ?? [];
    if (!is_array($task)) fail('Invalid task.');
    $id = (string) ($task['id'] ?? '');
    if (!preg_match('/^[a-zA-Z0-9-]{16,40}$/', $id)) fail('Invalid task ID');
    $boardId=(string)($task['boardId']??'');$columnId=(string)($task['columnId']??'');
    $boardPermission=boardAccess($boardId);if($boardPermission['id']!==$workspace['id'])fail('Board not found in this workspace.',404);
    if(!query('SELECT 1 FROM board_columns WHERE id=? AND board_id=?',[$columnId,$boardId])->fetchColumn())fail('Choose a column on this board.');
    $terms=taskPrice($task);$price=$terms['priceCents'];
    $clean = array_merge(['id' => $id,'boardId'=>$boardId,'columnId'=>$columnId],$terms);
    foreach (['title' => 150, 'description' => 5000, 'assignee' => 80, 'due' => 10, 'checklist' => 5000] as $key => $max) {
        if (isset($task[$key]) && !is_string($task[$key])) fail('Invalid task field: ' . $key);
        $value = trim((string) ($task[$key] ?? ''));
        if (strlen($value) > $max) fail('Task field too long: ' . $key);
        $clean[$key] = $value;
    }
    if ($clean['title'] === '') fail('Task title is required.');
    if ($clean['due'] !== '' && (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $clean['due']) || !checkdate((int) substr($clean['due'], 5, 2), (int) substr($clean['due'], 8, 2), (int) substr($clean['due'], 0, 4)))) fail('Invalid due date.');
    if (!in_array($task['status'] ?? '', ['Backlog', 'In progress', 'In review', 'Done'], true) || !in_array($task['priority'] ?? '', ['Low', 'Medium', 'High'], true)) fail('Invalid task status or priority.');
    if (!is_array($task['checks'] ?? [])) fail('Invalid checklist.');
    $clean['status'] = $task['status'];
    $clean['priority'] = $task['priority'];
    $clean['checks'] = array_values(array_filter($task['checks'] ?? [], fn($item) => is_string($item) && strlen($item) <= 300));
    $clean['checks'] = array_values(array_intersect($clean['checks'],array_filter(explode("\n",$clean['checklist']))));
    $assigneeId = (string)($task['assigneeId'] ?? '');
    $clean['assigneeId'] = $assigneeId;
    if ($assigneeId !== '') {
        $assigned = array_values(array_filter(teamMembers($workspace['id']),fn($member)=>$member['id']===$assigneeId));
        if (!$assigned) fail('Choose a current workspace member.');
        $clean['assignee'] = $assigned[0]['name'];
    }
    $db->exec('BEGIN IMMEDIATE');
    $existing = query('SELECT revision,account_id,workspace_id,board_id,payload FROM tasks WHERE id=?', [$id])->fetch();
    if ($existing && $existing['workspace_id'] !== $workspace['id']) {
        $db->exec('ROLLBACK');
        fail('Task not found', 404);
    }
    if($existing && $existing['board_id']!==$boardId){$db->exec('ROLLBACK');fail('Tasks cannot be moved to another board through this form.',409);}
    $currentAccess=boardAccess($boardId);
    if(!$currentAccess['canManage']){
        if(!$existing){$db->exec('ROLLBACK');fail('Only the workspace owner can create tasks.',403);}
        $original=json_decode($existing['payload'],true);
        if(!$currentAccess['canAdminTime']&&$clean['status']!==$original['status']){$db->exec('ROLLBACK');fail('Only the Workspace Owner, Studio Director, or Studio Manager can change task status.',403);}
        if(!$currentAccess['canAdminTime']&&(($original['assigneeId']??'')!==$user['id']||$original['status']==='Done')){$db->exec('ROLLBACK');fail('Only the assigned person can update an open task checklist.',403);}
        foreach(['title','description','priority','due','checklist','assignee','assigneeId','boardId','columnId'] as $field)if(($clean[$field]??'')!==($original[$field]??'')){$db->exec('ROLLBACK');fail('Only the workspace owner can edit task assignments and details.',403);}
        if(($original['assigneeId']??'')!==$user['id']&&$clean['checks']!==($original['checks']??[])){$db->exec('ROLLBACK');fail('Only the assigned person can update task checklist items.',403);}
        if($price!==(int)($original['priceCents']??0)){$db->exec('ROLLBACK');fail('Only the workspace owner can change task prices.',403);}
        foreach(['pricingMode'=>'fixed','plannedMinutes'=>0,'hourlyRateCents'=>0] as $field=>$fallback)if(($terms[$field]??$fallback)!==($original[$field]??$fallback)){$db->exec('ROLLBACK');fail('Propose new terms instead of directly editing the hourly budget.',403);}
    }
    $revision = $existing ? (int) $existing['revision'] : null;
    $sponsor = query('SELECT role,plan FROM users WHERE id=?',[$workspace['account_id']])->fetch();
    $count = query('SELECT COUNT(*) FROM tasks WHERE account_id=?', [$workspace['account_id']])->fetchColumn();
    if ($sponsor['role'] !== 'owner' && $revision === null && $count >= (PLANS[$sponsor['plan']]['taskLimit'] ?? 0)) {
        $db->exec('ROLLBACK');
        fail('Your plan task limit has been reached.', 403);
    }
    if ($revision !== null && (int) ($task['revision'] ?? 0) !== $revision) {
        $db->exec('ROLLBACK');
        fail('This task changed. Reload the board before editing again.', 409);
    }
    if ($clean['status'] === 'Done' && query('SELECT review_status FROM submissions WHERE task_id=? ORDER BY rowid DESC LIMIT 1',[$id])->fetchColumn() === 'pending') {
        $db->exec('ROLLBACK'); fail('Approve the latest work submission using the review controls before completing this task.',409);
    }
    if($existing){
        $previous=json_decode($existing['payload'],true);$sameAssignee=($previous['assigneeId']??'')===($clean['assigneeId']??'');$changed=($previous['pricingMode']??'fixed')!==$terms['pricingMode']||(int)($previous['plannedMinutes']??0)!==$terms['plannedMinutes']||(int)($previous['hourlyRateCents']??0)!==$terms['hourlyRateCents'];
        if($sameAssignee&&$changed&&query('SELECT 1 FROM task_offers WHERE task_id=? AND assignee_id=? AND status="accepted"',[$id,$clean['assigneeId']])->fetchColumn()){$db->exec('ROLLBACK');fail('These terms were accepted. Send a new proposal to renegotiate them.',409);}
        if(!$sameAssignee||$changed||!in_array($clean['status'],['Backlog','In progress'],true))invalidateTaskClock($id,'Task assignment, hourly terms, or work status changed. New approval is required.');
        if(!$sameAssignee||$changed||$clean['status']==='Done')query('UPDATE task_offers SET status="cancelled",decision_note="Task terms, assignment, or completion changed",decided_at=? WHERE task_id=? AND status="pending"',[gmdate('c'),$id]);
    }
    $next = ($revision ?? 0) + 1;
    query('INSERT INTO tasks(id,payload,revision,updated,account_id,workspace_id,board_id,column_id,price_cents) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,updated=excluded.updated,column_id=excluded.column_id,price_cents=excluded.price_cents', [$id, json_encode($clean, JSON_THROW_ON_ERROR), $next, gmdate('c'), $workspace['account_id'], $workspace['id'],$boardId,$columnId,$price]);
    audit(($revision === null ? 'Created: ' : 'Updated: ') . $clean['title'],null,$boardId);
    $db->exec('COMMIT');
    reply(['ok' => true, 'revision' => $next]);
}
if ($action === 'deleteTask') {
    requireManager($workspace);
    $db->exec('BEGIN IMMEDIATE');
    $task = query('SELECT payload,revision FROM tasks WHERE id=? AND account_id=? AND workspace_id=?', [$body['id'] ?? '', $user['id'], $workspace['id']])->fetch();
    if (!$task) {
        $db->exec('ROLLBACK');
        fail('Task not found', 404);
    }
    if ((int) $task['revision'] !== (int) ($body['revision'] ?? 0)) {
        $db->exec('ROLLBACK');
        fail('Task changed. Refresh before deleting.', 409);
    }
    invalidateTaskClock($body['id'],'Task deleted. Active task time stopped.');
    $referenceFiles=query('SELECT id FROM task_references WHERE task_id=? AND url=""',[$body['id']])->fetchAll();
    $files = query('SELECT id FROM submissions WHERE task_id=?',[$body['id']])->fetchAll();
    query('DELETE FROM tasks WHERE id=? AND account_id=? AND workspace_id=?', [$body['id'], $user['id'], $workspace['id']]);
    audit('Deleted: ' . json_decode($task['payload'], true)['title']);
    $db->exec('COMMIT');
    foreach($referenceFiles as $file){$filename=$path.'/references/'.$file['id'];if(is_file($filename))unlink($filename);}
    foreach($files as $file) { $filename=$path.'/uploads/'.$file['id']; if(is_file($filename)) unlink($filename); }
    reply(['ok' => true]);
}
