<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if(in_array($action,['authorizeTaskClock','revokeTaskClock'],true)){
    if(!$workspace['canAdminTime'])fail('Only the workspace owner, Studio Director, or Studio Manager can authorize clock-ins.',403);
    $note=trim((string)($body['note']??''));if(strlen($note)>1000)fail('Keep the approval note under 1,000 characters.');
    if($action==='revokeTaskClock'&&$note==='')fail('Give a reason for revoking clock-in approval.');
    $db->exec('BEGIN IMMEDIATE');
    $access=workspaceAccess($workspace['id']);if(!$access['canAdminTime']){$db->exec('ROLLBACK');fail('Your management permission has changed.',403);}
    $task=query('SELECT payload,board_id,revision FROM tasks WHERE id=? AND workspace_id=?',[$body['taskId']??'',$workspace['id']])->fetch();
    if(!$task){$db->exec('ROLLBACK');fail('Task not found.',404);}
    boardAccess($task['board_id']);$payload=json_decode($task['payload'],true);
    if((int)($body['revision']??0)!==(int)$task['revision']){$db->exec('ROLLBACK');fail('This task changed. Refresh before approving its hours and rate.',409);}
    if($action==='revokeTaskClock'){invalidateTaskClock($body['taskId'],$note);audit('Revoked clock-in approval: '.$payload['title'].' / '.$note,null,$task['board_id']);$db->exec('COMMIT');reply(['ok'=>true]);}
    $assignee=(string)($payload['assigneeId']??'');$active=false;foreach(teamMembers($workspace['id']) as $member)if($member['id']===$assignee)$active=true;
    if(!$active||($payload['pricingMode']??'fixed')!=='hourly'||(int)($payload['plannedMinutes']??0)<=0||!in_array($payload['status'],['Backlog','In progress'],true)){$db->exec('ROLLBACK');fail('Assign an open hourly task with planned hours before approving clock-in.');}
    if(query('SELECT 1 FROM board_blocks WHERE board_id=? AND user_id=?',[$task['board_id'],$assignee])->fetchColumn()){$db->exec('ROLLBACK');fail('The assigned person has no board access.',403);}
    if(query('SELECT 1 FROM task_offers WHERE task_id=? AND status="pending"',[$body['taskId']])->fetchColumn()){$db->exec('ROLLBACK');fail('Resolve the pending hours/rate proposal before approving clock-in.',409);}
    query('INSERT INTO task_clock_approvals(task_id,workspace_id,board_id,assignee_id,approved_by,planned_minutes,hourly_rate_cents,active,note,approved_at,revoked_at) VALUES(?,?,?,?,?,?,?,1,?,?,NULL) ON CONFLICT(task_id) DO UPDATE SET assignee_id=excluded.assignee_id,approved_by=excluded.approved_by,planned_minutes=excluded.planned_minutes,hourly_rate_cents=excluded.hourly_rate_cents,active=1,note=excluded.note,approved_at=excluded.approved_at,revoked_at=NULL',[$body['taskId'],$workspace['id'],$task['board_id'],$assignee,$user['id'],$payload['plannedMinutes'],$payload['hourlyRateCents'],$note,gmdate('c')]);
    audit('Approved task clock-in: '.$payload['title'].' / '.$payload['plannedMinutes'].' planned minutes at '.$payload['hourlyRateCents'].' cents per hour',null,$task['board_id']);$db->exec('COMMIT');reply(['ok'=>true]);
}
