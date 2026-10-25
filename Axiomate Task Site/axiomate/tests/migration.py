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
with tempfile.TemporaryDirectory(prefix='axiomate-migration-') as directory:
    db = sqlite3.connect(Path(directory) / 'workspace.sqlite')
    db.executescript('CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,email TEXT UNIQUE,password TEXT,role TEXT,status TEXT,created TEXT); CREATE TABLE tasks(id TEXT PRIMARY KEY,payload TEXT,revision INTEGER,updated TEXT); CREATE TABLE audit(id INTEGER PRIMARY KEY,actor TEXT,message TEXT,created TEXT); CREATE TABLE attempts(key TEXT PRIMARY KEY,count INTEGER,expires INTEGER);')
    owner_id = 'a' * 32
    db.execute('INSERT INTO users VALUES(?,?,?,?,?,?,?)', (owner_id, 'Legacy owner', 'legacy@example.test', 'retained-hash', 'owner', 'approved', '2026-10-24'))
    db.execute('INSERT INTO users VALUES(?,?,?,?,?,?,?)', ('b'*32, 'Pending member', 'pending@example.test', 'another-hash', 'member', 'pending', '2026-10-24'))
    db.execute('INSERT INTO tasks VALUES(?,?,?,?)', ('legacy-task', '{"title":"Retained task"}', 3, '2026-10-24'))
    db.execute('INSERT INTO audit VALUES(1,?,?,?)', ('Legacy owner', 'Retained activity', '2026-10-24'))
    db.commit()
    runner = Path(directory) / 'run.php'
    runner.write_text('<?php require $argv[1];', encoding='utf8')
    for _ in range(2):
        result = subprocess.run(args+[str(runner),str(root/'server/bootstrap.php')],env=dict(os.environ,AXIOMATE_DATA_DIR=directory),capture_output=True,text=True)
        assert result.returncode == 0, result.stderr
    assert db.execute('PRAGMA user_version').fetchone()[0] == 8
    assert db.execute('SELECT password,role,plan FROM users WHERE id=?',(owner_id,)).fetchone() == ('retained-hash','member','')
    assert db.execute('SELECT status FROM users WHERE id=?',('b'*32,)).fetchone()[0] == 'approved'
    assert db.execute('SELECT revision,account_id FROM tasks').fetchone() == (3,owner_id)
    assert db.execute('SELECT account_id FROM audit').fetchone()[0] == owner_id
    assert db.execute('SELECT COUNT(*) FROM workspaces').fetchone()[0]==0
    assert db.execute('SELECT workspace_id FROM tasks').fetchone()[0] is None
    db.close()
print('PASS: legacy users, password hashes, tasks, revisions, activity, private account scope, and idempotent migration.')
