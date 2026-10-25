<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if ($action === 'workspaces') {
    $items = query('SELECT w.id,w.name,w.description,w.created,w.account_id FROM workspaces w WHERE w.account_id=? OR EXISTS(SELECT 1 FROM workspace_members m WHERE m.workspace_id=w.id AND m.user_id=? AND m.status="active") ORDER BY w.created,w.id', [$user['id'],$user['id']])->fetchAll();
    foreach ($items as &$item) { $item['canManage'] = $item['account_id'] === $user['id']; unset($item['account_id']); }
    reply(['workspaces'=>$items]);
}
if ($action === 'createWorkspace') {
    requirePlan();
    $name = trim((string)($body['name'] ?? '')); $description = trim((string)($body['description'] ?? ''));
    if ($name === '' || strlen($name)>80) fail('Give your workspace a name (up to 80 characters).');
    if (strlen($description)>500) fail('Keep the description under 500 characters.');
    $id = bin2hex(random_bytes(16)); $created = gmdate('c');
    $db->exec('BEGIN IMMEDIATE');
    query('INSERT INTO workspaces(id,account_id,name,description,created) VALUES(?,?,?,?,?)',[$id,$user['id'],$name,$description,$created]);
    query('UPDATE tasks SET workspace_id=? WHERE account_id=? AND workspace_id IS NULL',[$id,$user['id']]);
    audit('Created workspace: '.$name,$id);
    $db->exec('COMMIT'); reply(['workspace'=>['id'=>$id,'name'=>$name,'description'=>$description,'created'=>$created,'canManage'=>true]],201);
}
$scopedActions = ['workspace','saveTask','deleteTask','renameWorkspace','team','createInvite','revokeInvite','removeMember','uploadSubmission','reviewSubmission','setMemberRole','boards','createBoard','renameBoard','createColumn','renameColumn','deleteColumn','clockStatus','clockIn','clockOut','management','forceClockOut','adjustTime','setBoardAccess','proposeTerms','respondToTerms','authorizeTaskClock','revokeTaskClock','uploadReference','addReference','deleteReference'];
if (in_array($action,$scopedActions,true)) $workspace = workspaceAccess((string)($body['workspaceId'] ?? ''));
if ($action === 'renameWorkspace') {
    requireManager($workspace);
    $name=trim((string)($body['name'] ?? '')); $description=trim((string)($body['description'] ?? ''));
    if ($name === '' || strlen($name)>80 || strlen($description)>500) fail('Enter a name up to 80 characters and a description up to 500 characters.');
    query('UPDATE workspaces SET name=?,description=? WHERE id=?',[$name,$description,$workspace['id']]);
    audit('Updated workspace: '.$name); reply(['ok'=>true]);
}
if ($action === 'team') {
    $invites = $workspace['canManage'] ? query('SELECT id,email,role,expires,created FROM invitations WHERE workspace_id=? AND accepted_by IS NULL AND revoked=0 AND expires>? ORDER BY created DESC',[$workspace['id'],time()])->fetchAll() : [];
    reply(['members'=>teamMembers($workspace['id']),'invitations'=>$invites,'canManage'=>$workspace['canManage']]);
}
if ($action === 'createInvite') {
    requireManager($workspace); rate('invite:'.$user['id'],30);
    $email=strtolower(trim((string)($body['email'] ?? ''))); $role=(string)($body['role'] ?? '');
    if (!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>254) fail('Enter a valid email address.');
    if (!in_array($role,TEAM_ROLES,true)) fail('Choose a valid workspace rank.');
    foreach(teamMembers($workspace['id']) as $member) if(strtolower($member['email'])===$email) fail('This person is already a workspace member.',409);
    $id=bin2hex(random_bytes(16)); $token=bin2hex(random_bytes(32)); $expires=time()+7*86400;
    $db->exec('BEGIN IMMEDIATE');
    query('UPDATE invitations SET revoked=1 WHERE workspace_id=? AND email=? AND accepted_by IS NULL',[$workspace['id'],$email]);
    query('INSERT INTO invitations(id,workspace_id,email,role,token_hash,expires,created) VALUES(?,?,?,?,?,?,?)',[$id,$workspace['id'],$email,$role,hash('sha256',$token),$expires,gmdate('c')]);
    audit('Invited '.$email.' as '.str_replace('_',' ',$role)); $db->exec('COMMIT');
    reply(['token'=>$token,'expires'=>$expires],201);
}
if ($action === 'revokeInvite') {
    requireManager($workspace);
    query('UPDATE invitations SET revoked=1 WHERE id=? AND workspace_id=?',[$body['id'] ?? '',$workspace['id']]);reply(['ok'=>true]);
}
if ($action === 'removeMember') {
    requireManager($workspace);
    $db->exec('BEGIN IMMEDIATE');closeMemberShifts($workspace['id'],(string)($body['id']??''),'Workspace access removed');
    query('UPDATE workspace_members SET status="revoked" WHERE workspace_id=? AND user_id=?',[$workspace['id'],$body['id'] ?? '']);
    audit('Removed a workspace member');$db->exec('COMMIT');reply(['ok'=>true]);
}

if ($action === 'setMemberRole') {
    requireManager($workspace);
    $role=(string)($body['role'] ?? '');
    if(!in_array($role,TEAM_ROLES,true)) fail('Choose a valid workspace rank.');
    $target=query('SELECT user_id FROM workspace_members WHERE workspace_id=? AND user_id=? AND status="active"',[$workspace['id'],$body['id']??''])->fetch();
    if(!$target)fail('Member not found. The workspace creator rank cannot be changed.',404);
    query('UPDATE workspace_members SET role=? WHERE workspace_id=? AND user_id=?',[$role,$workspace['id'],$target['user_id']]);
    audit('Changed a member rank to '.str_replace('_',' ',$role));
    reply(['ok'=>true]);
}
