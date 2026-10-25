<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if ($action === 'uploadSubmission') {
    $task = query('SELECT payload,revision,board_id FROM tasks WHERE id=? AND workspace_id=?',[$body['taskId'] ?? '',$workspace['id']])->fetch();
    if (!$task) fail('Task not found.',404);
    if($task['board_id'])boardAccess($task['board_id']);
    $payload = json_decode($task['payload'],true);
    if (($payload['assigneeId'] ?? '') !== $user['id']) fail('Only the assigned person can submit work for this task.',403);
    if ($payload['status']==='Done') fail('This task is completed. Ask the workspace owner to reopen it.');
    $file = $_FILES['file'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) fail('Choose a file within the server upload limit ('.round(uploadLimit()/1048576).' MB).',400);
    if ($file['size']<1 || $file['size']>uploadLimit()) fail('The file is empty or exceeds the upload limit.',413);
    $name = basename(str_replace('\\','/',str_replace(["\r","\n","\0"],'',(string)$file['name'])));
    if ($name==='' || strlen($name)>200) fail('Use a filename under 200 characters.');
    $note = trim((string)($body['note'] ?? '')); if(strlen($note)>2000) fail('Keep the submission note under 2,000 characters.');
    $id=bin2hex(random_bytes(16)); $directory=$path.'/uploads';
    if(!is_dir($directory)&&!mkdir($directory,0700,true)) throw new RuntimeException('Cannot create upload storage');
    $destination=$directory.'/'.$id;
    $db->exec('BEGIN IMMEDIATE');
    try {
        workspaceAccess($workspace['id']);
        $latest=query('SELECT payload FROM tasks WHERE id=? AND workspace_id=?',[$body['taskId'],$workspace['id']])->fetchColumn();
        $payload=$latest?json_decode($latest,true):null;
        if(!$payload||($payload['assigneeId']??'')!==$user['id']||$payload['status']==='Done') { $db->exec('ROLLBACK'); fail('The task changed. Refresh before submitting.',409); }
        if(!move_uploaded_file($file['tmp_name'],$destination)) throw new RuntimeException('Cannot save submission');
        chmod($destination,0600);
        query('INSERT INTO submissions(id,workspace_id,task_id,user_id,filename,bytes,note,created) VALUES(?,?,?,?,?,?,?,?)',[$id,$workspace['id'],$body['taskId'],$user['id'],$name,$file['size'],$note,gmdate('c')]);
        invalidateTaskClock($body['taskId'],'Work submitted for review. Task time stopped.');
        $payload['status']='In review';
        query('UPDATE tasks SET payload=?,revision=revision+1,updated=? WHERE id=?',[json_encode($payload,JSON_THROW_ON_ERROR),gmdate('c'),$body['taskId']]);
        audit('Submitted '.$name.' for '.$payload['title'],null,$payload['boardId']??null);
        $db->exec('COMMIT');
    } catch(Throwable $e) { if($db->inTransaction())$db->exec('ROLLBACK'); if(is_file($destination))unlink($destination); throw $e; }
    reply(['ok'=>true],201);
}
if ($action === 'download') {
    $submission=query('SELECT * FROM submissions WHERE id=?',[$_GET['id'] ?? ''])->fetch();
    if(!$submission) fail('File not found.',404);
    workspaceAccess($submission['workspace_id']);
    $boardId=query('SELECT board_id FROM tasks WHERE id=?',[$submission['task_id']])->fetchColumn();if($boardId)boardAccess($boardId);
    $filename=$path.'/uploads/'.$submission['id'];
    if(!is_file($filename))fail('File not found.',404);
    session_write_close();
    header('Content-Type: application/octet-stream');
    header('Content-Length: '.filesize($filename));
    header('Content-Disposition: attachment; filename="'.preg_replace('/[^a-zA-Z0-9._ -]/','_',$submission['filename']).'"; filename*=UTF-8\'\''.rawurlencode($submission['filename']));
    header('Cache-Control: private, no-store');
    readfile($filename);exit;
}

if ($action === 'reviewSubmission') {
    if (!$workspace['canReview']) fail('Only the Workspace Owner, Studio Director, or Studio Manager can review work.',403);
    $decision=(string)($body['decision']??''); $feedback=trim((string)($body['feedback']??''));
    if (!in_array($decision,['approved','denied','changes_requested'],true)) fail('Choose approve, deny, or request changes.');
    if(strlen($feedback)>4000)fail('Keep feedback under 4,000 characters.');
    if($decision!=='approved' && $feedback==='')fail('Explain what needs to change or why the work is denied.');
    $db->exec('BEGIN IMMEDIATE');
    $access=workspaceAccess($workspace['id']);
    if(!$access['canReview']){$db->exec('ROLLBACK');fail('Your review permission has changed.',403);}
    $submission=query('SELECT * FROM submissions WHERE id=? AND workspace_id=?',[$body['submissionId']??'',$workspace['id']])->fetch();
    if(!$submission){$db->exec('ROLLBACK');fail('Submission not found.',404);}
    $boardId=query('SELECT board_id FROM tasks WHERE id=?',[$submission['task_id']])->fetchColumn();if($boardId)boardAccess($boardId);
    $latest=query('SELECT id FROM submissions WHERE task_id=? ORDER BY rowid DESC LIMIT 1',[$submission['task_id']])->fetchColumn();
    if($latest!==$submission['id'] || $submission['review_status']!=='pending'){$db->exec('ROLLBACK');fail('This version is already reviewed or a newer version has been submitted. Refresh the task.',409);}
    $task=query('SELECT payload FROM tasks WHERE id=? AND workspace_id=?',[$submission['task_id'],$workspace['id']])->fetchColumn();
    if(!$task){$db->exec('ROLLBACK');fail('Task not found.',404);}
    $payload=json_decode($task,true);$payload['status']=match($decision){'approved'=>'Done','denied'=>'Backlog','changes_requested'=>'In progress'};
    invalidateTaskClock($submission['task_id'],'Work review decision recorded. Task time stopped; new approval is required for further work.');
    $now=gmdate('c');
    if($decision==='approved')query('UPDATE task_offers SET status="cancelled",decision_note="Task completed",decided_at=? WHERE task_id=? AND status="pending"',[$now,$submission['task_id']]);
    query('UPDATE submissions SET review_status=?,review_note=?,reviewer_id=?,reviewed_at=? WHERE id=?',[$decision,$feedback,$user['id'],$now,$submission['id']]);
    query('INSERT INTO submission_reviews(id,submission_id,workspace_id,reviewer_id,decision,feedback,created) VALUES(?,?,?,?,?,?,?)',[bin2hex(random_bytes(16)),$submission['id'],$workspace['id'],$user['id'],$decision,$feedback,$now]);
    query('UPDATE tasks SET payload=?,revision=revision+1,updated=? WHERE id=?',[json_encode($payload,JSON_THROW_ON_ERROR),$now,$submission['task_id']]);
    audit(ucfirst(str_replace('_',' ',$decision)).' work: '.$payload['title'].($feedback!==''?' / '.$feedback:''),null,$payload['boardId']??null);
    $db->exec('COMMIT');reply(['ok'=>true]);
}
