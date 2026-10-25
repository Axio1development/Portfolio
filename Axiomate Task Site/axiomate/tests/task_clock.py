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
        if action in ['workspace','saveTask','deleteTask','reviewSubmission','setMemberRole','boards','createBoard','createColumn','management','clockStatus','clockIn','clockOut','forceClockOut','adjustTime','setBoardAccess','authorizeTaskClock','revokeTaskClock','proposeTerms','respondToTerms'] and self.workspace_id:
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



def upload(client, workspace_id, task_id, filename='voice.wav', content=b'RIFF-test-audio', status=201):
    boundary='----axiomate'+uuid.uuid4().hex
    fields={'workspaceId':workspace_id,'taskId':task_id,'note':'Ready for review'}
    parts=[]
    for key,value in fields.items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode()+content+b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode())
    req=urllib.request.Request(client.base+'uploadSubmission',b''.join(parts),{'Content-Type':'multipart/form-data; boundary='+boundary,'X-CSRF-Token':client.csrf})
    try:response=client.op.open(req)
    except urllib.error.HTTPError as error:response=error
    result=json.load(response)
    assert response.code==status,(response.code,result)
    return result

def download(client,submission_id,status=200):
    try:response=client.op.open(client.base+'download&id='+submission_id)
    except urllib.error.HTTPError as error:response=error
    assert response.code==status,(response.code,response.read())
    if status==200:
        assert response.headers['Content-Type']=='application/octet-stream'
        assert 'attachment' in response.headers['Content-Disposition']
    return response.read()


with tempfile.TemporaryDirectory(prefix='axiomate-approved-clock-') as temp:
    env=dict(os.environ,AXIOMATE_DATA_DIR=temp)
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    server=subprocess.Popen(php_args+['-S',f'127.0.0.1:{port}','-t',str(ROOT/'dist')],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        base=f'http://127.0.0.1:{port}/api.php?action='
        for _ in range(50):
            try:lead=Client(base);break
            except urllib.error.URLError:time.sleep(.1)
        def register(email,name):
            client=Client(base);client.call('register',{'email':email,'name':name,'password':'TestPassword123!'},201);client.state();return client
        lead=register('lead@example.test','Lead');lead.call('choosePlan',{'plan':'starter'});lead.state();wid=lead.call('createWorkspace',{'name':'Approved work'},201)['workspace']['id'];lead.workspace_id=wid
        bid=lead.call('createBoard',{'name':'Production'},201)['id'];col=lead.call('createColumn',{'boardId':bid,'name':'Work'},201)['id']
        roles={}
        for role in ['developer','tester','studio_director','studio_manager','studio_owner']:
            person=register(role+'@example.test',role);token=lead.call('createInvite',{'workspaceId':wid,'email':role+'@example.test','role':role},201)['token'];person.call('acceptInvite',{'token':token});person.workspace_id=wid;roles[role]=person
        dev=roles['developer'];tester=roles['tester'];manager=roles['studio_manager'];director=roles['studio_director'];dev_id=dev.state()['user']['id']
        template={'title':'Approved environment work','description':'','status':'Backlog','priority':'Medium','due':'','assignee':'developer','assigneeId':dev_id,'checklist':'','checks':[],'boardId':bid,'columnId':col,'pricingMode':'hourly','plannedMinutes':480,'hourlyRateCents':2500}
        task=dict(template,id=str(uuid.uuid4()));second=dict(template,id=str(uuid.uuid4()),title='Another task')
        lead.call('saveTask',{'task':task});lead.call('saveTask',{'task':second})
        def current(task_id=task['id']):return next(item for item in lead.call('workspace')['tasks'] if item['id']==task_id)
        def approve(actor=lead,task_id=task['id']):return actor.call('authorizeTaskClock',{'taskId':task_id,'revision':current(task_id)['revision'],'note':'Approved for the planned scope'})
        assert dev.call('clockStatus',{'boardId':bid})['eligibleTasks']==[]
        dev.call('clockIn',{'boardId':bid,'taskId':task['id']},403)
        dev.call('authorizeTaskClock',{'taskId':task['id'],'revision':current()['revision']},403)
        roles['studio_owner'].call('authorizeTaskClock',{'taskId':task['id'],'revision':current()['revision']},403)
        director.call('authorizeTaskClock',{'taskId':task['id'],'revision':999},409)
        approve(manager);approve(director,second['id'])
        eligible=dev.call('clockStatus',{'boardId':bid})['eligibleTasks'];assert len(eligible)==2 and eligible[0]['hourlyRateCents']==2500
        tester.call('clockIn',{'boardId':bid,'taskId':task['id']},403)
        dev.call('clockIn',{'boardId':bid,'taskId':task['id'],'hourlyRateCents':999999},201)
        assert current()['status']=='Backlog', 'Clock-in must not change task status'
        shift=dev.call('clockStatus',{'boardId':bid})['active'];assert shift['task_id']==task['id'] and shift['hourly_rate_cents']==2500
        dev.call('clockIn',{'boardId':bid,'taskId':second['id']},409)
        another=Client(base);another.call('login',{'email':'developer@example.test','password':'TestPassword123!'});another.state();another.workspace_id=wid;another.call('clockIn',{'boardId':bid,'taskId':second['id']},409)
        db=sqlite3.connect(Path(temp)/'workspace.sqlite');start=int(time.time())-3600;db.execute('UPDATE time_sessions SET started_at=? WHERE id=?',(start,shift['id']));db.commit();db.close()
        status=dev.call('clockStatus',{'boardId':bid});assert 2500<=status['active']['trackedCents']<=2502
        dev.call('proposeTerms',{'taskId':task['id'],'plannedMinutes':480,'hourlyRateCents':3000},201)
        pending=next(item for item in lead.call('workspace')['negotiations'] if item['status']=='pending')
        manager.call('authorizeTaskClock',{'taskId':task['id'],'revision':current()['revision']},409)
        lead.call('respondToTerms',{'taskId':task['id'],'offerId':pending['id'],'decision':'accepted'})
        status=dev.call('clockStatus',{'boardId':bid});assert status['active'] is None
        old=next(item for item in status['sessions'] if item['id']==shift['id']);assert old['hourly_rate_cents']==2500 and old['ended_at'] is not None
        dev.call('clockIn',{'boardId':bid,'taskId':task['id']},403)
        approve(director);dev.call('clockIn',{'boardId':bid,'taskId':task['id']},201)
        assert dev.call('clockStatus',{'boardId':bid})['active']['hourly_rate_cents']==3000
        report=manager.call('management',{'boardId':bid});assert any(item['task_title']==task['title'] for item in report['sessions'])
        old=next(item for item in report['sessions'] if item['id']==shift['id'])
        manager.call('adjustTime',{'boardId':bid,'sessionId':old['id'],'revision':old['revision'],'startedAt':old['ended_at']-1800,'endedAt':old['ended_at'],'reason':'Correct confirmed work duration'})
        old=next(item for item in manager.call('management',{'boardId':bid})['sessions'] if item['id']==shift['id']);assert old['trackedCents']==1250 and old['hourly_rate_cents']==2500
        manager.call('revokeTaskClock',{'taskId':task['id'],'revision':current()['revision'],'note':'Scope paused pending instructions'})
        assert dev.call('clockStatus',{'boardId':bid})['active'] is None
        dev.call('clockIn',{'boardId':bid,'taskId':task['id']},403)
        approve(lead);dev.call('clockIn',{'boardId':bid,'taskId':task['id']},201)
        upload(dev,wid,task['id'])
        assert dev.call('clockStatus',{'boardId':bid})['active'] is None
        manager.call('authorizeTaskClock',{'taskId':task['id'],'revision':current()['revision']},400)
        file=lead.call('workspace')['submissions'][0]
        director.call('reviewSubmission',{'workspaceId':wid,'submissionId':file['id'],'decision':'changes_requested','feedback':'Revise the environment lighting'})
        approve(manager);dev.call('clockIn',{'boardId':bid,'taskId':task['id']},201)
        changed=dict(current(),assigneeId=tester.state()['user']['id'],assignee='tester');lead.call('saveTask',{'task':changed})
        assert dev.call('clockStatus',{'boardId':bid})['active'] is None
        tester.call('clockIn',{'boardId':bid,'taskId':task['id']},403)
        approve(lead);tester.call('clockIn',{'boardId':bid,'taskId':task['id']},201)
        completed=dict(current(),status='Done');lead.call('saveTask',{'task':completed})
        assert tester.call('clockStatus',{'boardId':bid})['active'] is None
        director.call('reviewSubmission',{'workspaceId':wid,'submissionId':file['id'],'decision':'approved'},409)
        lead.call('deleteTask',{'id':task['id'],'revision':current()['revision']})
        assert tester.call('clockStatus',{'boardId':bid})['active'] is None
        history=tester.call('clockStatus',{'boardId':bid})['sessions'][0];assert history['task_id'] is None and history['task_title']==task['title'] and history['hourly_rate_cents']==3000
        print('PASS: manager/director/owner task approval, contributor denial, no unapproved/unassigned clock-in, one active task across sessions, snapshot rate and live tracked amount, rate-change clock-out, fresh approval, immutable historical rate, corrected amount, revocation, submission stop, reassignment stop, and preserved deleted-task time history.')
    finally:server.terminate();server.wait(timeout=5)
