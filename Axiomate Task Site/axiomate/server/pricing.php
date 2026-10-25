<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
function taskPrice(array $task): array {
    $mode=$task['pricingMode']??'fixed';
    if(!in_array($mode,['fixed','hourly'],true))fail('Choose fixed or hourly pricing.');
    $minutes=$task['plannedMinutes']??0;$rate=$task['hourlyRateCents']??0;
    if(!is_int($minutes)||$minutes<0||$minutes>600000||!is_int($rate)||$rate<0||$rate>100000000)fail('Enter valid planned hours and an hourly rate.');
    if($mode==='hourly')$price=intdiv($minutes*$rate+30,60);
    else{$price=$task['priceCents']??0;if(!is_int($price)||$price<0||$price>100000000000)fail('Enter a valid non-negative task price.');$minutes=0;$rate=0;}
    return ['pricingMode'=>$mode,'plannedMinutes'=>$minutes,'hourlyRateCents'=>$rate,'priceCents'=>$price];
}
function visibleOffers(string $workspaceId): array {
    global $user;
    return query('SELECT o.id,o.task_id AS taskId,o.proposer_id AS proposerId,o.recipient_id AS recipientId,o.assignee_id AS assigneeId,o.planned_minutes AS plannedMinutes,o.hourly_rate_cents AS hourlyRateCents,o.message,o.status,o.decision_note AS decisionNote,o.created,o.decided_at AS decidedAt,p.name AS proposer,r.name AS recipient,d.name AS decidedBy FROM task_offers o JOIN users p ON p.id=o.proposer_id JOIN users r ON r.id=o.recipient_id LEFT JOIN users d ON d.id=o.decided_by JOIN workspaces w ON w.id=o.workspace_id WHERE o.workspace_id=? AND (w.account_id=? OR o.proposer_id=? OR o.assignee_id=?) AND NOT EXISTS(SELECT 1 FROM board_blocks b WHERE b.board_id=o.board_id AND b.user_id=?) ORDER BY o.rowid DESC',[$workspaceId,$user['id'],$user['id'],$user['id'],$user['id']])->fetchAll();
}
