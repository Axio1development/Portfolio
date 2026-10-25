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
        if action in ['workspace','saveTask','deleteTask','reviewSubmission','setMemberRole','boards','createBoard','createColumn','management','clockStatus','clockIn','clockOut','forceClockOut','adjustTime','setBoardAccess','proposeTerms','respondToTerms'] and self.workspace_id:
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



with tempfile.TemporaryDirectory(prefix='axiomate-hourly-') as temp:
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
        wid=lead.call('createWorkspace',{'name':'Hourly studio'},201)['workspace']['id'];lead.workspace_id=wid
        bid=lead.call('createBoard',{'name':'Production'},201)['id'];col=lead.call('createColumn',{'name':'Work','boardId':bid},201)['id']
        dev=register('dev@example.test','Developer');director=register('director@example.test','Director')
        for member,email,role in [(dev,'dev@example.test','developer'),(director,'director@example.test','studio_director')]:
            token=lead.call('createInvite',{'workspaceId':wid,'email':email,'role':role},201)['token'];member.call('acceptInvite',{'token':token});member.workspace_id=wid
        dev_id=dev.state()['user']['id'];director_id=director.state()['user']['id']
        task={'id':str(uuid.uuid4()),'title':'Build the environment','description':'','status':'Backlog','priority':'Medium','due':'','assignee':'Developer','assigneeId':dev_id,'checklist':'','checks':[],'boardId':bid,'columnId':col,'pricingMode':'hourly','plannedMinutes':480,'hourlyRateCents':2500,'priceCents':999999}
        lead.call('saveTask',{'task':task})
        def current():return next(item for item in lead.call('workspace')['tasks'] if item['id']==task['id'])
        assert current()['priceCents']==20000
        fixed=dict(task,id=str(uuid.uuid4()),title='Fixed deliverable',pricingMode='fixed',priceCents=1234)
        lead.call('saveTask',{'task':fixed})
        assert lead.call('boards')['boards'][0]['totalPriceCents']==21234
        dev.call('saveTask',{'task':dict(current(),plannedMinutes=240,hourlyRateCents=5000)},403)
        def propose(client,minutes,rate,message='Proposed scope and rate'):
            client.call('proposeTerms',{'taskId':task['id'],'plannedMinutes':minutes,'hourlyRateCents':rate,'message':message},201)
            return next(item for item in client.call('workspace')['negotiations'] if item['status']=='pending')
        def respond(client,offer,decision,status=200):return client.call('respondToTerms',{'taskId':task['id'],'offerId':offer['id'],'decision':decision,'note':'Reviewed terms'},status)
        dev.call('proposeTerms',{'taskId':task['id'],'plannedMinutes':0,'hourlyRateCents':2500},400)
        offer=propose(dev,600,3000)
        assert current()['priceCents']==20000
        assert director.call('workspace')['negotiations']==[]
        respond(dev,offer,'accepted',403);respond(director,offer,'accepted',403)
        respond(lead,offer,'declined');assert current()['priceCents']==20000
        offer=propose(dev,600,3000,'Need more time for testing')
        counter=propose(lead,540,2800,'Nine hours at 28 per hour')
        assert any(item['id']==offer['id'] and item['status']=='superseded' for item in dev.call('workspace')['negotiations'])
        respond(lead,counter,'accepted',403);respond(dev,counter,'accepted');respond(dev,counter,'accepted',409)
        assert current()['plannedMinutes']==540 and current()['hourlyRateCents']==2800 and current()['priceCents']==25200
        assert lead.call('boards')['boards'][0]['totalPriceCents']==26434
        lead.call('saveTask',{'task':dict(current(),hourlyRateCents=3000)},409)
        proposal=propose(lead,480,3200);respond(dev,proposal,'declined');assert current()['priceCents']==25200
        proposal=propose(dev,600,3500)
        changed=dict(current(),assigneeId=director_id,assignee='Director');lead.call('saveTask',{'task':changed})
        assert any(item['id']==proposal['id'] and item['status']=='cancelled' for item in lead.call('workspace')['negotiations'])
        assert director.call('workspace')['negotiations']==[]
        respond(lead,proposal,'accepted',409)
        proposal=propose(director,120,5000,'Focused two-hour delivery')
        lead.call('saveTask',{'task':dict(current(),title='Updated title, unchanged budget')})
        respond(lead,proposal,'accepted');assert current()['priceCents']==10000
        rounding=dict(task,id=str(uuid.uuid4()),title='Rounding check',plannedMinutes=15,hourlyRateCents=3)
        lead.call('saveTask',{'task':rounding});assert next(item for item in lead.call('workspace')['tasks'] if item['id']==rounding['id'])['priceCents']==1
        pending=propose(director,240,4000)
        completed=dict(current(),status='Done');lead.call('saveTask',{'task':completed})
        assert any(item['id']==pending['id'] and item['status']=='cancelled' for item in lead.call('workspace')['negotiations'])
        director.call('proposeTerms',{'taskId':task['id'],'plannedMinutes':60,'hourlyRateCents':5000},400)
        print('PASS: planned hours and hourly rates, server-calculated estimates, integer rounding, fixed-price compatibility, pending totals unchanged, two-way counteroffers, recipient-only acceptance, declines, agreed-terms protection, private negotiation history, reassignment cancellation, stale responses, unrelated edits, completion cancellation, and board total updates.')
    finally:server.terminate();server.wait(timeout=5)
