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
        if action in ['workspace','saveTask','deleteTask','reviewSubmission','setMemberRole','boards','createBoard','createColumn','management','clockStatus','clockIn','clockOut','forceClockOut','adjustTime','setBoardAccess','authorizeTaskClock','revokeTaskClock'] and self.workspace_id:
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


with tempfile.TemporaryDirectory(prefix='axiomate-time-') as temp:
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
        lead=register('lead@example.test','Lead');lead.call('choosePlan',{'plan':'starter'});lead.state()
        wid=lead.call('createWorkspace',{'name':'Production'},201)['workspace']['id'];lead.workspace_id=wid
        assert lead.call('boards')['boards']==[]
        bid=lead.call('createBoard',{'name':'Game launch'},201)['id']
        assert lead.call('boards')['boards'][0]['columns']==[]
        col=lead.call('createColumn',{'boardId':bid,'name':'Development'},201)['id']
        second_col=lead.call('createColumn',{'boardId':bid,'name':'Voice work'},201)['id']
        other=lead.call('createBoard',{'name':'Another board'},201)['id']
        lead.call('createColumn',{'boardId':other,'name':'Planning'},201)
        roles={}
        for role in ['developer','studio_director','studio_manager','studio_owner']:
            member=register(role+'@example.test',role);invite=lead.call('createInvite',{'workspaceId':wid,'email':role+'@example.test','role':role},201)
            member.call('acceptInvite',{'token':invite['token']});member.workspace_id=wid;roles[role]=member
        dev=roles['developer'];manager=roles['studio_manager'];director=roles['studio_director'];studio_owner=roles['studio_owner'];dev_id=dev.state()['user']['id']
        dev.call('createColumn',{'boardId':bid,'name':'Unauthorized'},403)
        template={'title':'Late work','description':'','status':'Backlog','priority':'Medium','due':'2026-12-20','assignee':'developer','assigneeId':dev_id,'checklist':'','checks':[],'boardId':bid,'columnId':col,'priceCents':12500,'pricingMode':'hourly','plannedMinutes':60,'hourlyRateCents':12500}
        late=dict(template,id=str(uuid.uuid4()));early=dict(template,id=str(uuid.uuid4()),title='Early work',due='2026-11-01',priceCents=20000,hourlyRateCents=20000);no_due=dict(template,id=str(uuid.uuid4()),title='Unscheduled',due='',priceCents=0,pricingMode='fixed')
        for task in [late,early,no_due]:lead.call('saveTask',{'task':task})
        tasks=lead.call('workspace')['tasks'];assert [task['title'] for task in tasks]==['Early work','Late work','Unscheduled']
        assert next(board for board in lead.call('boards')['boards'] if board['id']==bid)['totalPriceCents']==32500
        dev.call('saveTask',{'task':dict(tasks[0],hourlyRateCents=1)},403)
        lead.call('deleteColumn',{'workspaceId':wid,'boardId':bid,'columnId':col},409)
        lead.call('renameColumn',{'workspaceId':wid,'boardId':bid,'columnId':second_col,'name':'Audio production'})
        dev.call('management',{'boardId':bid},403);studio_owner.call('management',{'boardId':bid},403)
        assert manager.call('workspace')['canAdminTime'] is True
        assert manager.call('workspace')['canReview'] is True
        assert director.call('workspace')['canAdminTime'] is True
        def authorize():
            current=next(item for item in lead.call('workspace')['tasks'] if item['id']==late['id'])
            lead.call('authorizeTaskClock',{'taskId':late['id'],'revision':current['revision']})
        authorize()
        dev.call('clockIn',{'boardId':bid,'taskId':late['id']},201);dev.call('clockIn',{'boardId':other,'taskId':late['id']},409)
        shift=dev.call('clockStatus',{'boardId':bid})['active'];assert shift['board_id']==bid
        db=sqlite3.connect(Path(temp)/'workspace.sqlite');old=int(time.time())-14*3600;db.execute('UPDATE time_sessions SET started_at=? WHERE id=?',(old,shift['id']));db.commit();db.close()
        shift=manager.call('management',{'boardId':bid})['sessions'][0];assert shift['started_at']==old
        manager.call('forceClockOut',{'boardId':bid,'sessionId':shift['id'],'revision':999,'reason':'Forgot to clock out'},409)
        dev.call('forceClockOut',{'boardId':bid,'sessionId':shift['id'],'revision':shift['revision'],'reason':'Attempt'},403)
        manager.call('forceClockOut',{'boardId':bid,'sessionId':shift['id'],'revision':shift['revision'],'reason':'Forgot to clock out overnight'})
        assert dev.call('clockStatus',{'boardId':bid})['active'] is None
        closed=manager.call('management',{'boardId':bid})['sessions'][0]
        correction={'boardId':bid,'sessionId':closed['id'],'revision':closed['revision'],'startedAt':old+3600,'endedAt':old+7200,'reason':'Correct forgotten overnight clock-out using confirmed work time'}
        director.call('adjustTime',dict(correction,reason=''),400)
        director.call('adjustTime',correction)
        director.call('adjustTime',correction,409)
        report=manager.call('management',{'boardId':bid});corrected=report['sessions'][0]
        assert corrected['ended_at']-corrected['started_at']==3600
        event=next(item for item in report['events'] if item['action']=='adjusted')
        assert json.loads(event['beforeJson'])['started_at']==old and json.loads(event['afterJson'])['started_at']==old+3600
        director.call('adjustTime',dict(correction,revision=corrected['revision'],startedAt=int(time.time())+500),400)
        dev.call('clockIn',{'boardId':bid,'taskId':late['id']},201)
        lead_id=lead.state()['user']['id'];manager.call('setBoardAccess',{'boardId':bid,'userId':lead_id,'blocked':True,'reason':'Not allowed'},403)
        manager.call('setBoardAccess',{'boardId':bid,'userId':director.state()['user']['id'],'blocked':True,'reason':'Not allowed'},403)
        upload(dev,wid,early['id'])
        file_id=lead.call('workspace')['submissions'][0]['id']
        assert download(dev,file_id)==b'RIFF-test-audio'
        manager.call('setBoardAccess',{'boardId':bid,'userId':dev_id,'blocked':True,'reason':'Removed from this production board'})
        download(dev,file_id,403)
        assert dev.call('workspace')['submissions']==[]
        assert bid not in [board['id'] for board in dev.call('boards')['boards']]
        assert dev.call('workspace')['tasks']==[]
        assert not any('Late work' in entry['message'] for entry in dev.call('workspace')['activity'])
        dev.call('clockStatus',{'boardId':bid},403)
        dev.call('saveTask',{'task':tasks[0]},403)
        report=manager.call('management',{'boardId':bid});assert all(shift['ended_at'] is not None for shift in report['sessions'])
        assert any(event['action']=='access_removed' for event in report['events'])
        assert other in [board['id'] for board in dev.call('boards')['boards']]
        manager.call('setBoardAccess',{'boardId':bid,'userId':dev_id,'blocked':False,'reason':'Access restored after review'})
        authorize()
        dev.call('clockIn',{'boardId':bid,'taskId':late['id']},201);dev.call('clockOut',{'boardId':bid});dev.call('clockOut',{'boardId':bid},409)
        dev.call('clockIn',{'boardId':bid,'taskId':late['id']},201)
        lead.call('removeMember',{'workspaceId':wid,'id':dev_id})
        db=sqlite3.connect(Path(temp)/'workspace.sqlite');assert db.execute('SELECT COUNT(*) FROM time_sessions WHERE user_id=? AND ended_at IS NULL',(dev_id,)).fetchone()[0]==0;db.close()
        dev.call('management',{'boardId':bid},404)
        print('PASS: user-created boards and columns, prices and totals, due-date ordering, empty-column protection, Studio Manager rank, management role isolation, persistent clock-in/out, duplicate shift prevention, overnight forced clock-out, audited corrections, stale/future edit rejection, board-access removal/restoration, task/activity isolation, leadership protection, and clock-out on workspace removal.')
    finally:server.terminate();server.wait(timeout=5)
