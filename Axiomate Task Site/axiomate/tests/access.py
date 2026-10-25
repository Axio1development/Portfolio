import http.cookiejar
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
php = shutil.which('php')
php_args = [php]
if os.name == 'nt':
    php_args += ['-d', f'extension_dir={Path(php).parent / "ext"}', '-d', 'extension=pdo_sqlite']

class Client:
    def __init__(self, base):
        self.base = base
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.csrf = ''
        self.workspace_id = ''
        self.state()
    def state(self):
        with self.op.open(self.base + 'state') as r:
            result = json.load(r)
        self.csrf = result['csrf']
        return result
    def call(self, action, data=None, status=200):
        data = dict(data or {})
        if action in ['workspace','saveTask','deleteTask','boards','createBoard','createColumn'] and self.workspace_id:
            data.setdefault('workspaceId',self.workspace_id)
        if action=='saveTask' and not data.get('task',{}).get('boardId'):
            workspace_id=data.get('workspaceId',self.workspace_id)
            boards=self.call('boards',{'workspaceId':workspace_id})['boards']
            board=boards[0] if boards else {'id':self.call('createBoard',{'workspaceId':workspace_id,'name':'Test board'},201)['id'],'columns':[]}
            column_id=board['columns'][0]['id'] if board['columns'] else self.call('createColumn',{'workspaceId':workspace_id,'boardId':board['id'],'name':'Work'},201)['id']
            data['task']=dict(data['task'],boardId=board['id'],columnId=column_id,priceCents=data['task'].get('priceCents',0))
        req = urllib.request.Request(self.base + action, json.dumps(data or {}).encode(), {'Content-Type': 'application/json', 'X-CSRF-Token': self.csrf})
        try:
            response = self.op.open(req)
        except urllib.error.HTTPError as error:
            response = error
        result = json.load(response)
        assert response.code == status, (action, response.code, result)
        return result

with tempfile.TemporaryDirectory(prefix='axiomate-test-') as temp:
    env = dict(os.environ, AXIOMATE_DATA_DIR=temp)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    server = subprocess.Popen(php_args + ['-S', f'127.0.0.1:{port}', '-t', str(ROOT / 'dist')], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        base = f'http://127.0.0.1:{port}/api.php?action='
        for attempt in range(50):
            try:
                a = Client(base)
                break
            except urllib.error.URLError:
                time.sleep(.1)
        a.call('register', {'name': 'Account A', 'email': 'a@example.test', 'password': 'TestPassword123!', 'role': 'owner'}, 201)
        first = a.state()['user']
        assert first['role'] == 'member' and first['status'] == 'approved' and first['plan'] == ''
        a.call('workspace', status=404)
        a.call('choosePlan', {'plan': 'invalid'}, 400)
        a.call('choosePlan', {'plan': 'starter'})
        a.state()
        assert a.call('workspaces')['workspaces'] == []
        a.call('createWorkspace',{'name':'   '},400)
        legacy_id=str(uuid.uuid4())
        legacy_db=sqlite3.connect(Path(temp)/'workspace.sqlite')
        legacy_db.execute('INSERT INTO tasks(id,payload,revision,updated,account_id) VALUES(?,?,1,?,?)',(legacy_id,json.dumps({'id':legacy_id,'title':'Retained legacy task'}),'2026-10-24',first['id']))
        legacy_db.commit();legacy_db.close()
        a.workspace_id = a.call('createWorkspace',{'name':'My launch','description':'User-created workspace'},201)['workspace']['id']
        assert a.call('workspace')['tasks'][0]['title']=='Retained legacy task'
        a.call('deleteTask',{'id':legacy_id,'revision':1})
        a.call('renameWorkspace',{'workspaceId':a.workspace_id,'name':'Launch project','description':'Updated'})
        assert a.call('workspaces')['workspaces'][0]['name']=='Launch project'
        b = Client(base)
        b.call('register', {'name': 'Account B', 'email': 'b@example.test', 'password': 'TestPassword123!'}, 201)
        second = b.state()['user']
        b.call('choosePlan', {'plan': 'business'})
        b.state()
        b.workspace_id = b.call('createWorkspace',{'name':'Other account'},201)['workspace']['id']
        b.call('renameWorkspace',{'workspaceId':a.workspace_id,'name':'Stolen'},404)
        b.call('workspace',{'workspaceId':a.workspace_id},404)
        task = {'id': str(uuid.uuid4()), 'title': 'Private task', 'description': '', 'status': 'Backlog', 'priority': 'High', 'due': '', 'assignee': '', 'checklist': 'First step', 'checks': ['First step']}
        a.call('saveTask', {'task': task})
        assert len(a.call('workspace')['tasks']) == 1
        original_workspace=a.workspace_id
        another=a.call('createWorkspace',{'name':'Second project'},201)['workspace']['id']
        assert a.call('workspace',{'workspaceId':another})['tasks']==[]
        a.call('saveTask',{'workspaceId':another,'task':task},404)
        a.call('deleteTask',{'workspaceId':another,'id':task['id'],'revision':1},404)
        a.workspace_id=original_workspace
        assert b.call('workspace')['tasks'] == []
        assert not any('Private task' in entry['message'] for entry in b.call('workspace')['activity'])
        b.call('saveTask', {'task': task}, 404)
        b.call('deleteTask', {'id': task['id'], 'revision': 1}, 404)
        a.call('saveTask', {'task': task}, 409)
        saved = a.call('workspace')['tasks'][0]
        saved['status'] = 'Done'
        a.call('saveTask', {'task': saved})
        a.call('deleteTask', {'id': task['id'], 'revision': 2})
        with sqlite3.connect(Path(temp) / 'workspace.sqlite') as db:
            for i in range(50):
                item = dict(task, id=str(uuid.uuid4()))
                db.execute('INSERT INTO tasks(id,payload,revision,updated,account_id,workspace_id) VALUES(?,?,1,?,?,?)', (item['id'], json.dumps(item), '2026-10-24', first['id'],a.workspace_id))
        db.close()
        a.call('saveTask', {'task': dict(task, id=str(uuid.uuid4()))}, 403)
        a.call('choosePlan', {'plan': 'pro'})
        a.call('saveTask', {'task': dict(task, id=str(uuid.uuid4()))})
        a.call('choosePlan', {'plan': 'starter'}, 400)
        a.call('setup', {'setupToken': 'obsolete'}, 404)
        a.call('member', {'id': second['id'], 'status': 'declined'}, 404)
        result = subprocess.run(php_args + [str(ROOT / 'tools/assign-owner.php'), '--id=' + first['id'], '--data=' + temp], capture_output=True, text=True)
        assert result.returncode == 0, result.stderr
        assert a.state()['user']['role'] == 'owner'
        assert b.state()['user']['role'] == 'member'
        a.call('password', {'currentPassword': 'TestPassword123!', 'newPassword': 'ChangedPassword123!'})
        a.call('logout')
        a.state()
        a.call('workspace', status=401)
        a.call('login', {'email': 'a@example.test', 'password': 'ChangedPassword123!'})
        assert a.state()['user']['id'] == first['id']
        owner_id='1357f025c13701bada8ec375c82655fe'
        with sqlite3.connect(Path(temp)/'workspace.sqlite') as owner_db:
            password_hash=owner_db.execute('SELECT password FROM users WHERE id=?',(first['id'],)).fetchone()[0]
            owner_db.execute('INSERT INTO users(id,name,email,password,role,status,created,plan) VALUES(?,?,?,?,?,?,?,?)',(owner_id,'Site owner','siteowner@example.test',password_hash,'member','approved','2026-10-24','starter'))
        owner_db.close()
        owner=Client(base)
        assert owner.state()['ownerConfigured'] is True
        owner.call('login',{'email':'siteowner@example.test','password':'ChangedPassword123!'})
        owner_record=owner.state()['user']
        assert owner_record['id']==owner_id and owner_record['role']=='owner'
        owner.workspace_id=owner.call('createWorkspace',{'name':'Owner workspace'},201)['workspace']['id']
        with sqlite3.connect(Path(temp)/'workspace.sqlite') as owner_db:
            for i in range(5000):
                item=dict(task,id=str(uuid.uuid4()))
                owner_db.execute('INSERT INTO tasks(id,payload,revision,updated,account_id,workspace_id) VALUES(?,?,1,?,?,?)',(item['id'],json.dumps(item),'2026-10-24',owner_id,owner.workspace_id))
        owner_db.close()
        owner.call('saveTask',{'task':dict(task,id=str(uuid.uuid4()))})
        assert len(owner.call('workspace')['tasks'])==5001
        owner.call('choosePlan',{'plan':'starter'},400)
        assert b.state()['user']['role']=='member'
        assert all(entry['title']!='Private task' for entry in b.call('workspace')['tasks'])
        a.csrf = 'bad'
        a.call('workspace', status=403)
        print('PASS: designated owner assignment, owner creation beyond 5,000 tasks, regular account limits retained, user-created workspaces, rename, cross-workspace isolation, registration, no automatic owner, plan selection, private tasks/activity, cross-account edit/delete denial, revisions, task limits, downgrade limits, obsolete setup removal, CLI owner assignment, password change, login/logout, CSRF.')
    finally:
        server.terminate()
        server.wait(timeout=5)

