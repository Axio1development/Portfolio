<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if(in_array($action,['proposeTerms','respondToTerms'],true)){
    $db->exec('BEGIN IMMEDIATE');
    $task=query('SELECT payload,board_id FROM tasks WHERE id=? AND workspace_id=?',[$body['taskId']??'',$workspace['id']])->fetch();
    if(!$task){$db->exec('ROLLBACK');fail('Task not found.',404);}
    boardAccess($task['board_id']);$payload=json_decode($task['payload'],true);$assigned=(string)($payload['assigneeId']??'');
    if(!$workspace['canManage']&&$assigned!==$user['id']){$db->exec('ROLLBACK');fail('Only the workspace owner and assigned individual can negotiate terms.',403);}
    if(($payload['pricingMode']??'fixed')!=='hourly'||$payload['status']==='Done'){$db->exec('ROLLBACK');fail('Negotiation is available on open hourly tasks.');}
    $active=false;foreach(teamMembers($workspace['id']) as $member)if($member['id']===$assigned)$active=true;
    if(!$active||$assigned===$workspace['account_id']){$db->exec('ROLLBACK');fail('Assign the task to another active collaborator before negotiating.');}
    if(query('SELECT 1 FROM board_blocks WHERE board_id=? AND user_id=?',[$task['board_id'],$assigned])->fetchColumn()){$db->exec('ROLLBACK');fail('The assigned person no longer has board access.',403);}
    if($action==='proposeTerms'){
        $minutes=$body['plannedMinutes']??null;$rate=$body['hourlyRateCents']??null;$message=trim((string)($body['message']??''));
        if(!is_int($minutes)||$minutes<=0||$minutes>600000||!is_int($rate)||$rate<0||$rate>100000000||strlen($message)>2000){$db->exec('ROLLBACK');fail('Enter positive planned hours, a non-negative hourly rate, and a note under 2,000 characters.');}
        query('UPDATE task_offers SET status="superseded",decided_by=?,decision_note="Replaced by a counteroffer",decided_at=? WHERE task_id=? AND status="pending"',[$user['id'],gmdate('c'),$body['taskId']]);
        $recipient=$workspace['canManage']?$assigned:$workspace['account_id'];$id=bin2hex(random_bytes(16));
        query('INSERT INTO task_offers(id,workspace_id,board_id,task_id,proposer_id,recipient_id,assignee_id,planned_minutes,hourly_rate_cents,base_minutes,base_rate_cents,message,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',[$id,$workspace['id'],$task['board_id'],$body['taskId'],$user['id'],$recipient,$assigned,$minutes,$rate,(int)($payload['plannedMinutes']??0),(int)($payload['hourlyRateCents']??0),$message,gmdate('c')]);
        audit('Proposed hourly terms for '.$payload['title'],null,$task['board_id']);$db->exec('COMMIT');reply(['ok'=>true],201);
    }
    $offer=query('SELECT * FROM task_offers WHERE id=? AND task_id=?',[$body['offerId']??'',$body['taskId']])->fetch();
    if(!$offer||$offer['recipient_id']!==$user['id']){$db->exec('ROLLBACK');fail('Only the recipient can accept or decline this proposal.',403);}
    if($offer['status']!=='pending'||$offer['assignee_id']!==$assigned||(int)$offer['base_minutes']!==(int)($payload['plannedMinutes']??0)||(int)$offer['base_rate_cents']!==(int)($payload['hourlyRateCents']??0)){$db->exec('ROLLBACK');fail('These terms have changed or this proposal is already resolved. Refresh the task.',409);}
    $decision=$body['decision']??'';$note=trim((string)($body['note']??''));if(!in_array($decision,['accepted','declined'],true)||strlen($note)>2000){$db->exec('ROLLBACK');fail('Choose accept or decline and use a note under 2,000 characters.');}
    $now=gmdate('c');
    if($decision==='accepted'){
        if((int)$payload['plannedMinutes']!==(int)$offer['planned_minutes']||(int)$payload['hourlyRateCents']!==(int)$offer['hourly_rate_cents'])invalidateTaskClock($body['taskId'],'New hourly terms accepted. Clock-in requires fresh approval.');
        $payload=array_merge($payload,taskPrice(['pricingMode'=>'hourly','plannedMinutes'=>(int)$offer['planned_minutes'],'hourlyRateCents'=>(int)$offer['hourly_rate_cents']]));
        query('UPDATE tasks SET payload=?,price_cents=?,revision=revision+1,updated=? WHERE id=?',[json_encode($payload,JSON_THROW_ON_ERROR),$payload['priceCents'],$now,$body['taskId']]);
    }
    query('UPDATE task_offers SET status=?,decision_note=?,decided_by=?,decided_at=? WHERE id=?',[$decision,$note,$user['id'],$now,$offer['id']]);
    audit(ucfirst($decision).' hourly proposal for '.$payload['title'],null,$task['board_id']);$db->exec('COMMIT');reply(['ok'=>true]);
}
