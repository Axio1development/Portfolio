<?php
if (!defined('AXIOMATE_RUNTIME') && PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$version = (int) $db->query('PRAGMA user_version')->fetchColumn();
if ($version < 1) {
    $db->exec('BEGIN IMMEDIATE');
    try {
        if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 1) {
            $db->exec('CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT "member",status TEXT NOT NULL DEFAULT "approved",created TEXT NOT NULL); CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,payload TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated TEXT NOT NULL); CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,message TEXT NOT NULL,created TEXT NOT NULL); CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);');
            $db->exec('ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT ""; ALTER TABLE tasks ADD COLUMN account_id TEXT NOT NULL DEFAULT ""; ALTER TABLE audit ADD COLUMN account_id TEXT NOT NULL DEFAULT "";');
            $db->exec('UPDATE tasks SET account_id=COALESCE((SELECT id FROM users WHERE role="owner" LIMIT 1),""); UPDATE audit SET account_id=COALESCE((SELECT id FROM users WHERE role="owner" LIMIT 1),""); UPDATE users SET role="member"; UPDATE users SET status="approved" WHERE status="pending"; CREATE INDEX tasks_account ON tasks(account_id); CREATE INDEX audit_account ON audit(account_id); PRAGMA user_version=1;');
        }
        $db->exec('COMMIT');
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}

if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 2) {
    $db->exec('BEGIN IMMEDIATE');
    try {
        if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 2) {
            $db->exec('CREATE TABLE workspaces(id TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,description TEXT NOT NULL DEFAULT "",created TEXT NOT NULL); CREATE INDEX workspaces_account ON workspaces(account_id); ALTER TABLE tasks ADD COLUMN workspace_id TEXT REFERENCES workspaces(id); CREATE INDEX tasks_workspace ON tasks(workspace_id); PRAGMA user_version=2;');
        }
        $db->exec('COMMIT');
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}

if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 3) {
    $db->exec('BEGIN IMMEDIATE');
    try {
        if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 3) {
            $db->exec('CREATE TABLE workspace_members(workspace_id TEXT NOT NULL REFERENCES workspaces(id),user_id TEXT NOT NULL REFERENCES users(id),role TEXT NOT NULL,status TEXT NOT NULL DEFAULT "active",joined TEXT NOT NULL,PRIMARY KEY(workspace_id,user_id)); CREATE TABLE invitations(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),email TEXT NOT NULL,role TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires INTEGER NOT NULL,created TEXT NOT NULL,accepted_by TEXT,revoked INTEGER NOT NULL DEFAULT 0); CREATE INDEX invitations_workspace ON invitations(workspace_id); CREATE TABLE submissions(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id),filename TEXT NOT NULL,bytes INTEGER NOT NULL,note TEXT NOT NULL DEFAULT "",created TEXT NOT NULL); CREATE INDEX submissions_task ON submissions(task_id); ALTER TABLE audit ADD COLUMN workspace_id TEXT REFERENCES workspaces(id); PRAGMA user_version=3;');
        }
        $db->exec('COMMIT');
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}

if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 4) {
    $db->exec('BEGIN IMMEDIATE');
    try {
        if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 4) {
            $db->exec('ALTER TABLE submissions ADD COLUMN review_status TEXT NOT NULL DEFAULT "pending"; ALTER TABLE submissions ADD COLUMN review_note TEXT NOT NULL DEFAULT ""; ALTER TABLE submissions ADD COLUMN reviewer_id TEXT REFERENCES users(id); ALTER TABLE submissions ADD COLUMN reviewed_at TEXT; CREATE TABLE submission_reviews(id TEXT PRIMARY KEY,submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,workspace_id TEXT NOT NULL REFERENCES workspaces(id),reviewer_id TEXT NOT NULL REFERENCES users(id),decision TEXT NOT NULL,feedback TEXT NOT NULL DEFAULT "",created TEXT NOT NULL); CREATE INDEX reviews_workspace ON submission_reviews(workspace_id); PRAGMA user_version=4;');
        }
        $db->exec('COMMIT');
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}

if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 5) {
    $db->exec('BEGIN IMMEDIATE');
    try {
        if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 5) {
            $db->exec('CREATE TABLE boards(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),name TEXT NOT NULL,description TEXT NOT NULL DEFAULT "",created TEXT NOT NULL); CREATE INDEX boards_workspace ON boards(workspace_id); CREATE TABLE board_columns(id TEXT PRIMARY KEY,board_id TEXT NOT NULL REFERENCES boards(id),name TEXT NOT NULL,position INTEGER NOT NULL); CREATE INDEX columns_board ON board_columns(board_id); ALTER TABLE tasks ADD COLUMN board_id TEXT REFERENCES boards(id); ALTER TABLE tasks ADD COLUMN column_id TEXT REFERENCES board_columns(id); ALTER TABLE tasks ADD COLUMN price_cents INTEGER NOT NULL DEFAULT 0; CREATE INDEX tasks_board ON tasks(board_id); CREATE TABLE board_blocks(board_id TEXT NOT NULL REFERENCES boards(id),user_id TEXT NOT NULL REFERENCES users(id),reason TEXT NOT NULL,changed_by TEXT NOT NULL REFERENCES users(id),created INTEGER NOT NULL,PRIMARY KEY(board_id,user_id)); CREATE TABLE time_sessions(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),board_id TEXT NOT NULL REFERENCES boards(id),user_id TEXT NOT NULL REFERENCES users(id),started_at INTEGER NOT NULL,ended_at INTEGER,revision INTEGER NOT NULL DEFAULT 1); CREATE INDEX time_board ON time_sessions(board_id); ALTER TABLE audit ADD COLUMN board_id TEXT REFERENCES boards(id); CREATE UNIQUE INDEX one_active_shift ON time_sessions(user_id) WHERE ended_at IS NULL; CREATE TABLE time_events(id INTEGER PRIMARY KEY AUTOINCREMENT,session_id TEXT NOT NULL REFERENCES time_sessions(id),workspace_id TEXT NOT NULL REFERENCES workspaces(id),board_id TEXT NOT NULL REFERENCES boards(id),editor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,before_json TEXT NOT NULL,after_json TEXT NOT NULL,reason TEXT NOT NULL,created INTEGER NOT NULL);');
            foreach ($db->query('SELECT DISTINCT workspace_id FROM tasks WHERE workspace_id IS NOT NULL')->fetchAll() as $legacy) {
                $boardId=bin2hex(random_bytes(16)); $insert=$db->prepare('INSERT INTO boards(id,workspace_id,name,description,created) VALUES(?,?,?,?,?)');$insert->execute([$boardId,$legacy['workspace_id'],'Imported tasks','Your existing tasks, preserved from the previous board.',gmdate('c')]);
                $columns=[];foreach(['Backlog','In progress','In review','Done'] as $position=>$name){$columnId=bin2hex(random_bytes(16));$columns[$name]=$columnId;$insert=$db->prepare('INSERT INTO board_columns(id,board_id,name,position) VALUES(?,?,?,?)');$insert->execute([$columnId,$boardId,$name,$position]);}
                $read=$db->prepare('SELECT id,payload FROM tasks WHERE workspace_id=?');$read->execute([$legacy['workspace_id']]);
                foreach($read->fetchAll() as $task){$payload=json_decode($task['payload'],true);$payload['boardId']=$boardId;$payload['columnId']=$columns[$payload['status']??'Backlog']??$columns['Backlog'];$payload['priceCents']=0;$update=$db->prepare('UPDATE tasks SET board_id=?,column_id=?,payload=? WHERE id=?');$update->execute([$boardId,$payload['columnId'],json_encode($payload,JSON_THROW_ON_ERROR),$task['id']]);}
            }
            $db->exec('PRAGMA user_version=5;');
        }
        $db->exec('COMMIT');
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}

if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 6) {
    $db->exec('BEGIN IMMEDIATE');
    try {
        if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 6) {
            $db->exec('CREATE TABLE task_offers(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),board_id TEXT NOT NULL REFERENCES boards(id),task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,proposer_id TEXT NOT NULL REFERENCES users(id),recipient_id TEXT NOT NULL REFERENCES users(id),assignee_id TEXT NOT NULL REFERENCES users(id),planned_minutes INTEGER NOT NULL,hourly_rate_cents INTEGER NOT NULL,base_minutes INTEGER NOT NULL,base_rate_cents INTEGER NOT NULL,message TEXT NOT NULL DEFAULT "",status TEXT NOT NULL DEFAULT "pending",decision_note TEXT NOT NULL DEFAULT "",decided_by TEXT REFERENCES users(id),created TEXT NOT NULL,decided_at TEXT); CREATE INDEX offers_workspace ON task_offers(workspace_id); CREATE UNIQUE INDEX one_pending_offer ON task_offers(task_id) WHERE status="pending"; PRAGMA user_version=6;');
        }
        $db->exec('COMMIT');
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}

if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 7) {
    $db->exec('BEGIN IMMEDIATE');
    try {
        if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 7) {
            $db->exec('ALTER TABLE time_sessions ADD COLUMN task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL; ALTER TABLE time_sessions ADD COLUMN task_title TEXT NOT NULL DEFAULT ""; ALTER TABLE time_sessions ADD COLUMN hourly_rate_cents INTEGER; ALTER TABLE time_sessions ADD COLUMN planned_minutes INTEGER; CREATE INDEX time_task ON time_sessions(task_id); CREATE TABLE task_clock_approvals(task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,workspace_id TEXT NOT NULL REFERENCES workspaces(id),board_id TEXT NOT NULL REFERENCES boards(id),assignee_id TEXT NOT NULL REFERENCES users(id),approved_by TEXT NOT NULL REFERENCES users(id),planned_minutes INTEGER NOT NULL,hourly_rate_cents INTEGER NOT NULL,active INTEGER NOT NULL DEFAULT 1,note TEXT NOT NULL DEFAULT "",approved_at TEXT NOT NULL,revoked_at TEXT);');
            foreach($db->query('SELECT * FROM time_sessions WHERE ended_at IS NULL AND task_id IS NULL')->fetchAll() as $shift){
                $end=max(time(),(int)$shift['started_at']);$update=$db->prepare('UPDATE time_sessions SET ended_at=?,revision=revision+1 WHERE id=?');$update->execute([$end,$shift['id']]);
                $after=array_merge($shift,['ended_at'=>$end,'revision'=>(int)$shift['revision']+1]);$insert=$db->prepare('INSERT INTO time_events(session_id,workspace_id,board_id,editor_id,action,before_json,after_json,reason,created) VALUES(?,?,?,?,?,?,?,?,?)');$insert->execute([$shift['id'],$shift['workspace_id'],$shift['board_id'],$shift['user_id'],'policy_updated',json_encode($shift),json_encode($after),'System upgrade: task-specific clock approval is required. Previous board-only shift closed.',$end]);
            }
            $db->exec('PRAGMA user_version=7;');
        }
        $db->exec('COMMIT');
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}

if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 8) {
    $db->exec('BEGIN IMMEDIATE');
    try {
        if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 8) {
            $db->exec('CREATE TABLE task_references(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,url TEXT NOT NULL DEFAULT "",mime TEXT NOT NULL DEFAULT "",bytes INTEGER NOT NULL DEFAULT 0,created TEXT NOT NULL); CREATE INDEX references_task ON task_references(task_id); PRAGMA user_version=8;');
        }
        $db->exec('COMMIT');
    } catch(Throwable $e) {$db->exec('ROLLBACK');throw $e;}
}
