"""Check the upgrade from the original shared-board schema without losing records."""
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
php = shutil.which('php')
args = [php]
if os.name == 'nt':
    args += ['-d', f'extension_dir={Path(php).parent / "ext"}', '-d', 'extension=pdo_sqlite']
with tempfile.TemporaryDirectory(prefix='axiomate-boards-upgrade-') as directory:
    db=sqlite3.connect(Path(directory)/'workspace.sqlite')
    db.executescript('CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,email TEXT UNIQUE,password TEXT,role TEXT,status TEXT,created TEXT,plan TEXT); CREATE TABLE workspaces(id TEXT PRIMARY KEY,account_id TEXT,name TEXT,description TEXT,created TEXT); CREATE TABLE tasks(id TEXT PRIMARY KEY,payload TEXT,revision INTEGER,updated TEXT,account_id TEXT,workspace_id TEXT); CREATE TABLE audit(id INTEGER PRIMARY KEY,actor TEXT,message TEXT,created TEXT,account_id TEXT,workspace_id TEXT); PRAGMA user_version=4;')
    uid='a'*32;wid='b'*32;empty='c'*32
    db.execute('INSERT INTO users VALUES(?,?,?,?,?,?,?,?)',(uid,'Legacy owner','legacy@example.test','retained-hash','member','approved','2026-10-24','starter'))
    db.execute('INSERT INTO workspaces VALUES(?,?,?,?,?)',(wid,uid,'Existing project','','2026-10-24'))
    db.execute('INSERT INTO workspaces VALUES(?,?,?,?,?)',(empty,uid,'Empty workspace','','2026-10-24'))
    import json
    for i,status in enumerate(['Backlog','Done']):
        payload={'id':str(i),'title':'Retained '+status,'status':status,'due':'2026-11-01'}
        db.execute('INSERT INTO tasks VALUES(?,?,7,?,?,?)',(str(i),json.dumps(payload),'2026-10-24',uid,wid))
    db.commit()
    runner=Path(directory)/'run.php';runner.write_text('<?php require $argv[1];',encoding='utf8')
    for _ in range(2):
        result=subprocess.run(args+[str(runner),str(root/'server/bootstrap.php')],env=dict(os.environ,AXIOMATE_DATA_DIR=directory),capture_output=True,text=True)
        assert result.returncode==0,result.stderr
    assert db.execute('PRAGMA user_version').fetchone()[0]==8
    assert db.execute('SELECT COUNT(*) FROM boards').fetchone()[0]==1
    assert db.execute('SELECT COUNT(*) FROM boards WHERE workspace_id=?',(empty,)).fetchone()[0]==0
    assert db.execute('SELECT COUNT(*) FROM board_columns').fetchone()[0]==4
    for payload,revision,board_id,column_id,price in db.execute('SELECT payload,revision,board_id,column_id,price_cents FROM tasks'):
        task=json.loads(payload);assert revision==7 and task['boardId']==board_id and task['columnId']==column_id and price==0
        assert db.execute('SELECT name FROM board_columns WHERE id=?',(column_id,)).fetchone()[0]==task['status']
    assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
    db.close()
print('PASS: populated workspace imports, empty workspace stays without preset boards, tasks/revisions/status retained, valid column links, and idempotent upgrade.')
