<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$timeActions=['clockStatus','clockIn','clockOut','management','forceClockOut','adjustTime','setBoardAccess'];
if(in_array($action,$timeActions,true)){
    $access=boardAccess((string)($body['boardId']??''));
    if($access['id']!==$workspace['id'])fail('Board not found in this workspace.',404);
    $board=$access['board'];
}
if($action==='clockStatus'){
    $active=query('SELECT s.*,b.name AS boardName FROM time_sessions s JOIN boards b ON b.id=s.board_id WHERE s.user_id=? AND s.ended_at IS NULL',[$user['id']])->fetch();
    $history=query('SELECT * FROM time_sessions WHERE board_id=? AND user_id=? ORDER BY started_at DESC LIMIT 100',[$board['id'],$user['id']])->fetchAll();
    $events=query('SELECT e.action,e.reason,e.created,e.session_id AS sessionId,CASE WHEN e.action="policy_updated" THEN "System" ELSE u.name END AS editor FROM time_events e JOIN users u ON u.id=e.editor_id JOIN time_sessions s ON s.id=e.session_id WHERE e.board_id=? AND s.user_id=? ORDER BY e.id DESC LIMIT 100',[$board['id'],$user['id']])->fetchAll();
    reply(['active'=>$active?timeRecord($active):null,'sessions'=>array_map('timeRecord',$history),'events'=>$events,'serverNow'=>time(),'eligibleTasks'=>eligibleTaskClocks($board['id'],$user['id'])]);
}
if($action==='clockIn'){
    $db->exec('BEGIN IMMEDIATE');boardAccess($board['id']);
    if(query('SELECT 1 FROM time_sessions WHERE user_id=? AND ended_at IS NULL',[$user['id']])->fetchColumn()){$db->exec('ROLLBACK');fail('You are already clocked in. End your current shift first.',409);}
    $taskId=(string)($body['taskId']??'');$allowed=null;foreach(eligibleTaskClocks($board['id'],$user['id']) as $candidate)if($candidate['id']===$taskId)$allowed=$candidate;
    if(!$allowed){$db->exec('ROLLBACK');fail('Choose your assigned hourly task with current clock-in approval from the workspace owner, Studio Director, or Studio Manager.',403);}
    $id=bin2hex(random_bytes(16));$now=time();query('INSERT INTO time_sessions(id,workspace_id,board_id,user_id,started_at,task_id,task_title,hourly_rate_cents,planned_minutes) VALUES(?,?,?,?,?,?,?,?,?)',[$id,$workspace['id'],$board['id'],$user['id'],$now,$taskId,$allowed['title'],$allowed['hourlyRateCents'],$allowed['plannedMinutes']]);
    $shift=query('SELECT * FROM time_sessions WHERE id=?',[$id])->fetch();timeEvent([],$shift,'clock_in','Clocked in to an approved assigned task');audit('Clocked in to task '.$allowed['title']);$db->exec('COMMIT');reply(['ok'=>true],201);
}
if($action==='clockOut'){
    $db->exec('BEGIN IMMEDIATE');$shift=query('SELECT * FROM time_sessions WHERE board_id=? AND user_id=? AND ended_at IS NULL',[$board['id'],$user['id']])->fetch();
    if(!$shift){$db->exec('ROLLBACK');fail('There is no active shift on this board.',409);}
    $end=max(time(),(int)$shift['started_at']);query('UPDATE time_sessions SET ended_at=?,revision=revision+1 WHERE id=?',[$end,$shift['id']]);$after=array_merge($shift,['ended_at'=>$end,'revision'=>(int)$shift['revision']+1]);timeEvent($shift,$after,'clock_out','Clocked out by account holder');audit('Clocked out of '.$board['name']);$db->exec('COMMIT');reply(['ok'=>true]);
}
if(in_array($action,['management','forceClockOut','adjustTime','setBoardAccess'],true)&&!$access['canAdminTime'])fail('Only the workspace owner, Studio Director, or Studio Manager can access board management.',403);
if($action==='management'){
    $sessions=query('SELECT s.*,u.name,u.email FROM time_sessions s JOIN users u ON u.id=s.user_id WHERE s.board_id=? ORDER BY (s.ended_at IS NULL) DESC,s.started_at DESC LIMIT 500',[$board['id']])->fetchAll();
    $events=query('SELECT e.id,e.session_id AS sessionId,e.action,e.reason,e.created,e.before_json AS beforeJson,e.after_json AS afterJson,CASE WHEN e.action="policy_updated" THEN "System" ELSE u.name END AS editor,t.name AS member FROM time_events e JOIN users u ON u.id=e.editor_id JOIN time_sessions s ON s.id=e.session_id JOIN users t ON t.id=s.user_id WHERE e.board_id=? ORDER BY e.id DESC LIMIT 200',[$board['id']])->fetchAll();
    $members=teamMembers($workspace['id']);foreach($members as &$member)$member['blocked']=(bool)query('SELECT 1 FROM board_blocks WHERE board_id=? AND user_id=?',[$board['id'],$member['id']])->fetchColumn();
    reply(['sessions'=>array_map('timeRecord',$sessions),'events'=>$events,'members'=>$members,'serverNow'=>time(),'canManageWorkspace'=>$access['canManage']]);
}
if(in_array($action,['forceClockOut','adjustTime','setBoardAccess'],true)){
    $reason=trim((string)($body['reason']??''));if($reason===''||strlen($reason)>1000)fail('Add a reason for this management change (up to 1,000 characters).');
    $db->exec('BEGIN IMMEDIATE');$current=boardAccess($board['id']);if(!$current['canAdminTime']){$db->exec('ROLLBACK');fail('Your management permission has changed.',403);}
    if($action==='setBoardAccess'){
        $targetId=(string)($body['userId']??'');$members=teamMembers($workspace['id']);$target=null;foreach($members as $member)if($member['id']===$targetId)$target=$member;
        if(!$target||$target['role']==='workspace_owner'||$targetId===$user['id']){$db->exec('ROLLBACK');fail('The workspace creator and your own access cannot be changed here.',403);}
        if(!$current['canManage']&&in_array($target['role'],['studio_director','studio_manager','studio_owner'],true)){$db->exec('ROLLBACK');fail('Only the workspace owner can change leadership access.',403);}
        if(!is_bool($body['blocked']??null)){$db->exec('ROLLBACK');fail('Choose remove or restore access.');}
        if($body['blocked']){query('INSERT INTO board_blocks(board_id,user_id,reason,changed_by,created) VALUES(?,?,?,?,?) ON CONFLICT(board_id,user_id) DO UPDATE SET reason=excluded.reason,changed_by=excluded.changed_by,created=excluded.created',[$board['id'],$targetId,$reason,$user['id'],time()]);closeMemberShifts($workspace['id'],$targetId,$reason,$board['id']);}
        else query('DELETE FROM board_blocks WHERE board_id=? AND user_id=?',[$board['id'],$targetId]);
        audit(($body['blocked']?'Removed':'Restored').' board access for '.$target['name'].' / '.$reason);$db->exec('COMMIT');reply(['ok'=>true]);
    }
    $shift=query('SELECT * FROM time_sessions WHERE id=? AND board_id=?',[$body['sessionId']??'',$board['id']])->fetch();
    if(!$shift){$db->exec('ROLLBACK');fail('Time entry not found.',404);}
    if((int)($body['revision']??0)!==(int)$shift['revision']){$db->exec('ROLLBACK');fail('This entry changed. Refresh before editing it.',409);}
    if($action==='forceClockOut'){
        if($shift['ended_at']!==null){$db->exec('ROLLBACK');fail('This shift is already closed.',409);}
        $start=(int)$shift['started_at'];$end=max(time(),$start);
    }else{
        $start=$body['startedAt']??null;$end=$body['endedAt']??null;
        if(!is_int($start)||$start<=0||$start>time()||($end!==null&&(!is_int($end)||$end<$start||$end>time()))){$db->exec('ROLLBACK');fail('Use valid past times, with clock-out after clock-in.');}
        if($shift['ended_at']!==null&&$end===null){$db->exec('ROLLBACK');fail('A closed shift cannot be reopened. Enter its corrected end time.');}
        $overlap=query('SELECT 1 FROM time_sessions WHERE user_id=? AND id<>? AND started_at<? AND COALESCE(ended_at,?)>? LIMIT 1',[$shift['user_id'],$shift['id'],$end??time()+1,time()+1,$start])->fetchColumn();
        if($overlap){$db->exec('ROLLBACK');fail('The corrected time overlaps another recorded shift.',409);}
    }
    query('UPDATE time_sessions SET started_at=?,ended_at=?,revision=revision+1 WHERE id=?',[$start,$end,$shift['id']]);$after=array_merge($shift,['started_at'=>$start,'ended_at'=>$end,'revision'=>(int)$shift['revision']+1]);timeEvent($shift,$after,$action==='forceClockOut'?'forced_clock_out':'adjusted',$reason);audit(($action==='forceClockOut'?'Forced clock-out':'Adjusted time').' / '.$reason);$db->exec('COMMIT');reply(['ok'=>true]);
}
