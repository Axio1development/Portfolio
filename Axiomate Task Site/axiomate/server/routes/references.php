<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if($action==='referenceMedia'){
    $reference=query('SELECT r.*,t.board_id FROM task_references r JOIN tasks t ON t.id=r.task_id WHERE r.id=?',[$_GET['id']??''])->fetch();
    if(!$reference||$reference['url']!=='')fail('Reference not found.',404);
    workspaceAccess($reference['workspace_id']);boardAccess($reference['board_id']);
    $filename=$path.'/references/'.$reference['id'];if(!is_file($filename))fail('Reference not found.',404);
    $size=filesize($filename);$start=0;$end=$size-1;
    if(isset($_SERVER['HTTP_RANGE'])){
        if(!preg_match('/^bytes=(\d*)-(\d*)$/',$_SERVER['HTTP_RANGE'],$range)||($range[1]===''&&$range[2]==='')){header('Content-Range: bytes */'.$size);http_response_code(416);exit;}
        if($range[1]===''){$start=max(0,$size-(int)$range[2]);}else{$start=(int)$range[1];if($range[2]!=='')$end=min($end,(int)$range[2]);}
        if($start>$end||$start>=$size){header('Content-Range: bytes */'.$size);http_response_code(416);exit;}
        http_response_code(206);header("Content-Range: bytes $start-$end/$size");
    }
    session_write_close();header('Content-Type: '.$reference['mime']);header('Cache-Control: private, no-store');header('Accept-Ranges: bytes');header('Content-Length: '.($end-$start+1));header('Content-Disposition: inline');header("Content-Security-Policy: default-src 'none'; sandbox");
    $handle=fopen($filename,'rb');fseek($handle,$start);$remaining=$end-$start+1;
    while($remaining>0&&!feof($handle)){ $chunk=fread($handle,min(65536,$remaining));if($chunk===false||$chunk==='')break;echo $chunk;$remaining-=strlen($chunk); }fclose($handle);exit;
}
if(in_array($action,['uploadReference','addReference','deleteReference'],true)){
    $db->exec('BEGIN IMMEDIATE');$access=workspaceAccess($workspace['id']);
    if(!$access['canManage']&&!$access['canReview']&&!$access['canAdminTime']&&$access['memberRole']!=='studio_owner'){$db->exec('ROLLBACK');fail('Only workspace leadership can edit task references.',403);}
    if($action==='deleteReference'){
        $reference=query('SELECT r.*,t.board_id FROM task_references r JOIN tasks t ON t.id=r.task_id WHERE r.id=? AND r.workspace_id=?',[$body['id']??'',$workspace['id']])->fetch();
        if(!$reference){$db->exec('ROLLBACK');fail('Reference not found.',404);}boardAccess($reference['board_id']);
        query('DELETE FROM task_references WHERE id=?',[$reference['id']]);audit('Removed task reference: '.$reference['title'],null,$reference['board_id']);$db->exec('COMMIT');
        $filename=$path.'/references/'.$reference['id'];if($reference['url']===''&&is_file($filename))unlink($filename);reply(['ok'=>true]);
    }
    $task=query('SELECT payload,board_id FROM tasks WHERE id=? AND workspace_id=?',[$body['taskId']??'',$workspace['id']])->fetch();
    if(!$task){$db->exec('ROLLBACK');fail('Save the task before adding references.',404);}boardAccess($task['board_id']);
    if((int)query('SELECT COUNT(*) FROM task_references WHERE task_id=?',[$body['taskId']])->fetchColumn()>=20){$db->exec('ROLLBACK');fail('A task can have up to 20 references.',409);}
    $title=trim((string)($body['title']??''));$url='';$mime='';$size=0;$file=null;
    if($action==='addReference'){
        $url=trim((string)($body['url']??''));$parts=parse_url($url);
        if(strlen($url)>2000||!filter_var($url,FILTER_VALIDATE_URL)||!in_array(strtolower($parts['scheme']??''),['http','https'],true)||isset($parts['user'])||isset($parts['pass'])){$db->exec('ROLLBACK');fail('Enter a valid HTTP or HTTPS reference link.');}
        if($title==='')$title=$parts['host'];
    }else{
        $file=$_FILES['file']??null;
        if(!$file||$file['error']!==UPLOAD_ERR_OK||$file['size']<1||$file['size']>uploadLimit()){$db->exec('ROLLBACK');fail('Choose an image or video within the '.round(uploadLimit()/1048576).' MB upload limit.');}
        $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if(!in_array($mime,['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime'],true)){$db->exec('ROLLBACK');fail('Use JPG, PNG, GIF, WebP, MP4, WebM, or MOV. For other formats, add a reference link.');}
        if(str_starts_with($mime,'image/')&&!@getimagesize($file['tmp_name'])){$db->exec('ROLLBACK');fail('This image could not be read.');}
        if($title==='')$title=basename(str_replace('\\','/',(string)$file['name']));$size=(int)$file['size'];
    }
    if($title===''||strlen($title)>200){$db->exec('ROLLBACK');fail('Keep the reference title under 200 characters.');}
    $id=bin2hex(random_bytes(16));$destination=$path.'/references/'.$id;
    try{
        if($file){$directory=dirname($destination);if(!is_dir($directory)&&!mkdir($directory,0700,true))throw new RuntimeException('Cannot create reference storage');if(!move_uploaded_file($file['tmp_name'],$destination))throw new RuntimeException('Cannot save reference');chmod($destination,0600);}
        query('INSERT INTO task_references VALUES(?,?,?,?,?,?,?,?,?)',[$id,$workspace['id'],$body['taskId'],$user['id'],$title,$url,$mime,$size,gmdate('c')]);audit('Added task reference: '.$title,null,$task['board_id']);$db->exec('COMMIT');
    }catch(Throwable $e){if($db->inTransaction())$db->exec('ROLLBACK');if(is_file($destination))unlink($destination);throw $e;}
    reply(['ok'=>true,'id'=>$id],201);
}
