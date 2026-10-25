<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
function boardAccess(string $id): array {
    global $user;
    $board=query('SELECT * FROM boards WHERE id=?',[$id])->fetch();
    if(!$board)fail('Board not found.',404);
    $access=workspaceAccess($board['workspace_id']);
    if(!$access['canManage'] && query('SELECT 1 FROM board_blocks WHERE board_id=? AND user_id=?',[$id,$user['id']])->fetchColumn())fail('Your access to this board has been removed.',403);
    return array_merge($access,['board'=>$board]);
}
function timeEvent(array $before,array $after,string $action,string $reason): void {
    global $user;
    query('INSERT INTO time_events(session_id,workspace_id,board_id,editor_id,action,before_json,after_json,reason,created) VALUES(?,?,?,?,?,?,?,?,?)',[$after['id'],$after['workspace_id'],$after['board_id'],$user['id'],$action,json_encode($before,JSON_THROW_ON_ERROR),json_encode($after,JSON_THROW_ON_ERROR),$reason,time()]);
}
function closeMemberShifts(string $workspaceId,string $userId,string $reason,?string $boardId=null): void {
    $sql='SELECT * FROM time_sessions WHERE workspace_id=? AND user_id=? AND ended_at IS NULL';$params=[$workspaceId,$userId];if($boardId){$sql.=' AND board_id=?';$params[]=$boardId;}
    $approvalSql='UPDATE task_clock_approvals SET active=0,revoked_at=? WHERE workspace_id=? AND assignee_id=? AND active=1';$approvalParams=[gmdate('c'),$workspaceId,$userId];if($boardId){$approvalSql.=' AND board_id=?';$approvalParams[]=$boardId;}query($approvalSql,$approvalParams);
    foreach(query($sql,$params)->fetchAll() as $shift){$end=max(time(),(int)$shift['started_at']);query('UPDATE time_sessions SET ended_at=?,revision=revision+1 WHERE id=?',[$end,$shift['id']]);$after=array_merge($shift,['ended_at'=>$end,'revision'=>(int)$shift['revision']+1]);timeEvent($shift,$after,'access_removed',$reason);}
}
