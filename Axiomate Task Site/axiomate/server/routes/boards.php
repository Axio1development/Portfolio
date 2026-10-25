<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if ($action === 'boards') {
    $items=query('SELECT * FROM boards WHERE workspace_id=? ORDER BY created,id',[$workspace['id']])->fetchAll();
    $items=array_values(array_filter($items,fn($board)=>$workspace['canManage']||!query('SELECT 1 FROM board_blocks WHERE board_id=? AND user_id=?',[$board['id'],$user['id']])->fetchColumn()));
    foreach($items as &$item){$item['columns']=query('SELECT id,name,position FROM board_columns WHERE board_id=? ORDER BY position,id',[$item['id']])->fetchAll();$item['totalPriceCents']=(int)query('SELECT COALESCE(SUM(price_cents),0) FROM tasks WHERE board_id=?',[$item['id']])->fetchColumn();}
    reply(['boards'=>$items,'canAdminTime'=>$workspace['canAdminTime']]);
}
if(in_array($action,['createBoard','renameBoard','createColumn','renameColumn','deleteColumn'],true)){
    requireManager($workspace);
    $name=trim((string)($body['name']??''));
    if($action!=='deleteColumn'&&($name===''||strlen($name)>80))fail('Enter a name up to 80 characters.');
    if($action==='createBoard'){
        $id=bin2hex(random_bytes(16));$description=trim((string)($body['description']??''));if(strlen($description)>500)fail('Description is too long.');
        $db->exec('BEGIN IMMEDIATE');query('INSERT INTO boards(id,workspace_id,name,description,created) VALUES(?,?,?,?,?)',[$id,$workspace['id'],$name,$description,gmdate('c')]);
        query('UPDATE tasks SET board_id=? WHERE workspace_id=? AND board_id IS NULL',[$id,$workspace['id']]);
        audit('Created board: '.$name);$db->exec('COMMIT');reply(['id'=>$id],201);
    }
    $board=query('SELECT * FROM boards WHERE id=? AND workspace_id=?',[$body['boardId']??'',$workspace['id']])->fetch();if(!$board)fail('Board not found.',404);
    if($action==='renameBoard'){query('UPDATE boards SET name=? WHERE id=?',[$name,$board['id']]);reply(['ok'=>true]);}
    if($action==='createColumn'){
        $id=bin2hex(random_bytes(16));$db->exec('BEGIN IMMEDIATE');$position=(int)query('SELECT COALESCE(MAX(position),-1)+1 FROM board_columns WHERE board_id=?',[$board['id']])->fetchColumn();
        query('INSERT INTO board_columns(id,board_id,name,position) VALUES(?,?,?,?)',[$id,$board['id'],$name,$position]);
        foreach(query('SELECT id,payload FROM tasks WHERE board_id=? AND column_id IS NULL',[$board['id']])->fetchAll() as $task){$payload=json_decode($task['payload'],true);$payload['boardId']=$board['id'];$payload['columnId']=$id;$payload['priceCents']??=0;query('UPDATE tasks SET column_id=?,payload=? WHERE id=?',[$id,json_encode($payload,JSON_THROW_ON_ERROR),$task['id']]);}
        audit('Added task column: '.$name);$db->exec('COMMIT');reply(['id'=>$id],201);
    }
    $column=query('SELECT id FROM board_columns WHERE id=? AND board_id=?',[$body['columnId']??'',$board['id']])->fetch();if(!$column)fail('Column not found.',404);
    if($action==='deleteColumn'){if(query('SELECT 1 FROM tasks WHERE column_id=?',[$column['id']])->fetchColumn())fail('Move or remove the tasks before deleting this column.',409);query('DELETE FROM board_columns WHERE id=?',[$column['id']]);}
    else query('UPDATE board_columns SET name=? WHERE id=?',[$name,$column['id']]);
    reply(['ok'=>true]);
}
