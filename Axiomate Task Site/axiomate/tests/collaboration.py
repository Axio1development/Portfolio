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
        if action in ['workspace','saveTask','deleteTask','reviewSubmission','setMemberRole','boards','createBoard','createColumn'] and self.workspace_id:
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

with tempfile.TemporaryDirectory(prefix='axiomate-collaboration-') as temp:
    env=dict(os.environ,AXIOMATE_DATA_DIR=temp)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    server=subprocess.Popen(php_args+['-S',f'127.0.0.1:{port}','-t',str(ROOT/'dist')],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        base=f'http://127.0.0.1:{port}/api.php?action='
        for _ in range(50):
            try:lead=Client(base);break
            except urllib.error.URLError:time.sleep(.1)
        def register(email,name):
            client=Client(base);client.call('register',{'name':name,'email':email,'password':'TestPassword123!'},201);client.state();return client
        lead=register('lead@example.test','Lead')
        lead.call('choosePlan',{'plan':'starter'});lead.state()
        workspace_id=lead.call('createWorkspace',{'name':'Game production'},201)['workspace']['id'];lead.workspace_id=workspace_id
        outsider=register('outside@example.test','Outsider')
        roles={}
        for role in ['developer','tester','voice_actor','studio_director','studio_owner','studio_manager']:
            email=role+'@example.test'
            member=register(email,role)
            invite=lead.call('createInvite',{'workspaceId':workspace_id,'email':email,'role':role},201)
            token=invite['token']
            with urllib.request.urlopen(base+'inviteInfo&token='+token) as response:
                assert json.load(response)['invitation']['role']==role
            outsider.call('acceptInvite',{'token':token},403)
            member.call('acceptInvite',{'token':token})
            member.workspace_id=workspace_id
            assert member.state()['user']['plan']==''
            assert member.call('workspace')['canManage'] is False
            assert member.call('workspaces')['workspaces'][0]['id']==workspace_id
            roles[role]=member
        dev=roles['developer'];tester=roles['tester'];voice=roles['voice_actor']
        dev_id=dev.state()['user']['id'];voice_id=voice.state()['user']['id']
        assert len(lead.call('team',{'workspaceId':workspace_id})['members'])==7
        dev.call('createInvite',{'workspaceId':workspace_id,'email':'a@example.test','role':'developer'},403)
        lead.call('createInvite',{'workspaceId':workspace_id,'email':'a@example.test','role':'owner'},400)
        task={'id':str(uuid.uuid4()),'title':'Record opening line','description':'Deliver the first take','status':'Backlog','priority':'High','due':'','assignee':'developer','assigneeId':dev_id,'checklist':'Record the line\nReview the take','checks':[]}
        lead.call('saveTask',{'task':task})
        task=lead.call('workspace')['tasks'][0]
        assert task['assigneeId']==dev_id
        tester.call('saveTask',{'task':task},403)
        dev.call('saveTask',{'task':dict(task,title='Changed by member')},403)
        dev.call('saveTask',{'task':dict(task,status='Done')},403)
        dev.call('deleteTask',{'id':task['id'],'revision':task['revision']},403)
        for role in ['developer','tester','voice_actor','studio_owner']:
            for status in ['Backlog','In progress','Done']:
                current=lead.call('workspace')['tasks'][0]
                member=roles[role];current.update(assigneeId=member.state()['user']['id'],assignee=role,status='In review' if status=='Backlog' else 'Backlog')
                lead.call('saveTask',{'task':current})
                current=lead.call('workspace')['tasks'][0]
                member.call('saveTask',{'task':dict(current,status=status)},403)
        current=lead.call('workspace')['tasks'][0];current.update(assigneeId=dev_id,assignee='developer',status='Backlog');lead.call('saveTask',{'task':current})
        for role in ['studio_director','studio_manager']:
            for status in ['In progress','Done','Backlog']:
                current=lead.call('workspace')['tasks'][0]
                roles[role].call('saveTask',{'task':dict(current,status=status)})
            current=lead.call('workspace')['tasks'][0]
            roles[role].call('saveTask',{'task':dict(current,title='Forbidden detail edit')},403)
            roles[role].call('saveTask',{'task':dict(current,checks=['Record the line'])},403)
        task=lead.call('workspace')['tasks'][0]
        dev.call('saveTask',{'task':dict(task,checks=['Record the line'])})
        upload(tester,workspace_id,task['id'],status=403)
        upload(dev,workspace_id,task['id'])
        result=lead.call('workspace');submitted=result['submissions'][0]
        assert submitted['userId']==dev_id and submitted['filename']=='voice.wav'
        assert result['tasks'][0]['status']=='In review'
        assert download(lead,submitted['id'])==b'RIFF-test-audio'
        download(outsider,submitted['id'],404)
        assert (Path(temp)/'uploads'/submitted['id']).read_bytes()==b'RIFF-test-audio'
        lead.call('saveTask',{'task':task},409)
        director=roles['studio_director'];studio_owner=roles['studio_owner']
        assert director.call('workspace')['canReview'] is True
        assert studio_owner.call('workspace')['canReview'] is False
        manager=roles['studio_manager'];assert manager.call('workspace')['canReview'] is True
        assert dev.call('workspace')['canReview'] is False
        dev.call('reviewSubmission',{'submissionId':submitted['id'],'decision':'approved'},403)
        outsider.call('reviewSubmission',{'workspaceId':workspace_id,'submissionId':submitted['id'],'decision':'approved'},404)
        director.call('reviewSubmission',{'submissionId':submitted['id'],'decision':'changes_requested','feedback':''},400)
        completed=lead.call('workspace')['tasks'][0];completed['status']='Done';lead.call('saveTask',{'task':completed},409)
        director.call('reviewSubmission',{'submissionId':submitted['id'],'decision':'changes_requested','feedback':'Please add more emphasis to the opening line.'})
        reviewed=dev.call('workspace');assert reviewed['tasks'][0]['status']=='In progress'
        assert reviewed['submissions'][0]['reviewStatus']=='changes_requested'
        assert reviewed['submissions'][0]['reviewNote']=='Please add more emphasis to the opening line.'
        assert reviewed['submissions'][0]['reviewedBy']=='studio_director'
        upload(dev,workspace_id,task['id'],filename='second-take.wav')
        older_pending=lead.call('workspace')['submissions'][0]['id']
        upload(dev,workspace_id,task['id'],filename='third-take.wav')
        director.call('reviewSubmission',{'submissionId':older_pending,'decision':'approved'},409)
        latest=lead.call('workspace')['submissions'][0]['id']
        studio_owner.call('reviewSubmission',{'submissionId':latest,'decision':'denied','feedback':'The recording contains background noise.'},403)
        manager.call('reviewSubmission',{'submissionId':latest,'decision':'denied','feedback':'The recording contains background noise.'})
        assert dev.call('workspace')['tasks'][0]['status']=='Backlog'
        upload(dev,workspace_id,task['id'],filename='clean-take.wav')
        latest=lead.call('workspace')['submissions'][0]['id']
        director_id=director.state()['user']['id']
        dev.call('setMemberRole',{'id':dev_id,'role':'studio_owner'},403)
        lead.call('setMemberRole',{'id':director_id,'role':'developer'})
        director.call('reviewSubmission',{'submissionId':latest,'decision':'approved'},403)
        lead.call('setMemberRole',{'id':director_id,'role':'studio_director'})
        director.call('reviewSubmission',{'submissionId':latest,'decision':'approved','feedback':'Approved. Ready to use.'})
        director.call('reviewSubmission',{'submissionId':latest,'decision':'approved'},409)
        assert lead.call('workspace')['tasks'][0]['status']=='Done'
        assert director.state()['user']['role']=='member'

        completed=lead.call('workspace')['tasks'][0]
        dev.call('saveTask',{'task':dict(completed,status='In progress')},403)
        completed['status']='In review';lead.call('saveTask',{'task':completed})
        result=lead.call('workspace')

        task=result['tasks'][0];task.update(assigneeId=voice_id,assignee='voice_actor')
        lead.call('saveTask',{'task':task})
        upload(dev,workspace_id,task['id'],status=403)
        upload(voice,workspace_id,task['id'],filename='take-two.wav')
        lead.call('removeMember',{'workspaceId':workspace_id,'id':voice_id})
        voice.call('workspace',status=404)
        download(voice,submitted['id'],404)
        upload(voice,workspace_id,task['id'],status=404)
        pending=lead.call('createInvite',{'workspaceId':workspace_id,'email':'outside@example.test','role':'tester'},201)
        pending_id=lead.call('team',{'workspaceId':workspace_id})['invitations'][0]['id']
        lead.call('revokeInvite',{'workspaceId':workspace_id,'id':pending_id})
        outsider.call('acceptInvite',{'token':pending['token']},404)
        pending=lead.call('createInvite',{'workspaceId':workspace_id,'email':'outside@example.test','role':'tester'},201)
        db=sqlite3.connect(Path(temp)/'workspace.sqlite');db.execute('UPDATE invitations SET expires=1 WHERE email=?',('outside@example.test',));db.commit();db.close()
        outsider.call('acceptInvite',{'token':pending['token']},404)
        result=lead.call('workspace');task=result['tasks'][0]
        lead.call('deleteTask',{'id':task['id'],'revision':task['revision']})
        download(lead,submitted['id'],404)
        assert not (Path(temp)/'uploads'/submitted['id']).exists()
        print('PASS: all six invitation ranks, owner/director/manager status permissions and reviews, required feedback, revision requests, denial, approval, rank changes, demotion enforcement, superseded-version protection, reviewer history, email binding, no-plan collaborator access, owner-only invitations, member assignment, assigned-only uploads, immutable submission attribution, private downloads, review status, stale edits, reassignment, revocation, expiry, and file cleanup.')
    finally:
        server.terminate();server.wait(timeout=5)
