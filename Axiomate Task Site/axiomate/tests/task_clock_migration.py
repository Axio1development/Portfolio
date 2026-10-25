"""Schema 6 board-only shifts close once without losing or repricing history."""
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import tempfile
import time

root = Path(__file__).resolve().parents[1]
php = shutil.which('php')
args = [php]
if os.name == 'nt':
    args += ['-d', f'extension_dir={Path(php).parent / "ext"}', '-d', 'extension=pdo_sqlite']
with tempfile.TemporaryDirectory(prefix='axiomate-clock-migration-') as directory:
    directory = Path(directory)
    legacy = directory / 'legacy.php'
    legacy.write_text((root/'server/migrate.php').read_text().split("if ((int) $db->query('PRAGMA user_version')->fetchColumn() < 7)")[0])
    runner = directory/'run.php'
    runner.write_text('<?php $db=new PDO("sqlite:".$argv[1]);$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE,PDO::FETCH_ASSOC);require $argv[2];')
    result = subprocess.run(args+[str(runner),str(directory/'workspace.sqlite'),str(legacy)],capture_output=True,text=True)
    assert result.returncode == 0, result.stderr
    db=sqlite3.connect(directory/'workspace.sqlite')
    assert db.execute('PRAGMA user_version').fetchone()[0]==6
    db.execute('INSERT INTO users(id,name,email,password,role,status,created) VALUES(?,?,?,?,?,?,?)',('member','Member','member@example.test','hash','member','approved','2026-10-24'))
    db.execute('INSERT INTO workspaces VALUES(?,?,?,?,?)',('workspace','member','Studio','','2026-10-24'))
    db.execute('INSERT INTO boards VALUES(?,?,?,?,?)',('board','workspace','Work','','2026-10-24'))
    started=int(time.time())-3600
    db.execute('INSERT INTO time_sessions VALUES(?,?,?,?,?,?,?)',('active','workspace','board','member',started,None,1))
    db.execute('INSERT INTO time_sessions VALUES(?,?,?,?,?,?,?)',('closed','workspace','board','member',started-7200,started-3600,3))
    db.commit()
    runner.write_text('<?php require $argv[1];')
    for _ in range(2):
        result=subprocess.run(args+[str(runner),str(root/'server/bootstrap.php')],env=dict(os.environ,AXIOMATE_DATA_DIR=str(directory)),capture_output=True,text=True)
        assert result.returncode==0, result.stderr
    assert db.execute('PRAGMA user_version').fetchone()[0]==8
    active=db.execute('SELECT started_at,ended_at,revision,task_id,hourly_rate_cents FROM time_sessions WHERE id="active"').fetchone()
    assert active[0]==started and active[1]>=started+3600 and active[2:]==(2,None,None)
    assert db.execute('SELECT started_at,ended_at,revision,hourly_rate_cents FROM time_sessions WHERE id="closed"').fetchone()==(started-7200,started-3600,3,None)
    events=db.execute('SELECT action,before_json,after_json FROM time_events').fetchall()
    assert len(events)==1 and events[0][0]=='policy_updated'
    assert json.loads(events[0][1])['ended_at'] is None and json.loads(events[0][2])['ended_at']==active[1]
    assert db.execute('SELECT COUNT(*) FROM task_clock_approvals').fetchone()[0]==0
    db.close()
print('PASS: schema 6 active shifts closed once, history and timestamps retained, no retroactive rate, policy audit preserved, idempotent schema 8 upgrade.')
