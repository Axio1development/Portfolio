<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
function invalidateTaskClock(string $taskId,string $reason): void {
    query('UPDATE task_clock_approvals SET active=0,revoked_at=? WHERE task_id=? AND active=1',[gmdate('c'),$taskId]);
    foreach(query('SELECT * FROM time_sessions WHERE task_id=? AND ended_at IS NULL',[$taskId])->fetchAll() as $shift){$end=max(time(),(int)$shift['started_at']);query('UPDATE time_sessions SET ended_at=?,revision=revision+1 WHERE id=?',[$end,$shift['id']]);timeEvent($shift,array_merge($shift,['ended_at'=>$end,'revision'=>(int)$shift['revision']+1]),'task_authorization_ended',$reason);}
}
function timeRecord(array $shift): array {
    $seconds=max(0,(int)($shift['ended_at']??time())-(int)$shift['started_at']);
    $shift['trackedCents']=$shift['hourly_rate_cents']===null?null:intdiv($seconds*(int)$shift['hourly_rate_cents']+1800,3600);
    return $shift;
}
function visibleClockApprovals(string $workspaceId): array {
    global $user;
    return query('SELECT a.task_id AS taskId,a.assignee_id AS assigneeId,a.planned_minutes AS plannedMinutes,a.hourly_rate_cents AS hourlyRateCents,a.active,a.note,a.approved_at AS approvedAt,a.revoked_at AS revokedAt,u.name AS approvedBy FROM task_clock_approvals a JOIN users u ON u.id=a.approved_by WHERE a.workspace_id=? AND NOT EXISTS(SELECT 1 FROM board_blocks b WHERE b.board_id=a.board_id AND b.user_id=?)',[$workspaceId,$user['id']])->fetchAll();
}

function eligibleTaskClocks(string $boardId,string $userId): array {
    $result=[];
    foreach(query('SELECT t.id,t.payload,a.approved_at AS approvedAt,u.name AS approvedBy FROM tasks t JOIN task_clock_approvals a ON a.task_id=t.id JOIN users u ON u.id=a.approved_by WHERE t.board_id=? AND a.active=1 AND a.assignee_id=? AND NOT EXISTS(SELECT 1 FROM task_offers o WHERE o.task_id=t.id AND o.status="pending") ORDER BY t.id',[$boardId,$userId])->fetchAll() as $row){
        $task=json_decode($row['payload'],true);$approval=query('SELECT assignee_id,planned_minutes,hourly_rate_cents FROM task_clock_approvals WHERE task_id=?',[$row['id']])->fetch();
        if(($task['assigneeId']??'')!==$userId||($task['pricingMode']??'fixed')!=='hourly'||!in_array($task['status'],['Backlog','In progress'],true)||(int)$approval['planned_minutes']!==(int)($task['plannedMinutes']??0)||(int)$approval['hourly_rate_cents']!==(int)($task['hourlyRateCents']??0))continue;
        $result[]=['id'=>$row['id'],'title'=>$task['title'],'plannedMinutes'=>(int)$approval['planned_minutes'],'hourlyRateCents'=>(int)$approval['hourly_rate_cents'],'approvedBy'=>$row['approvedBy'],'approvedAt'=>$row['approvedAt']];
    }
    return $result;
}
