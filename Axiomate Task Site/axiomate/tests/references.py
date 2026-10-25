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
    php_args += ['-d', f'extension_dir={Path(php).parent / "ext"}', '-d', 'extension=pdo_sqlite','-d','extension=fileinfo']

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
        if action in ['workspace','saveTask','deleteTask','reviewSubmission','setMemberRole','boards','createBoard','createColumn','management','clockStatus','clockIn','clockOut','forceClockOut','adjustTime','setBoardAccess','authorizeTaskClock','revokeTaskClock','proposeTerms','respondToTerms','addReference','deleteReference'] and self.workspace_id:
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



def upload_reference(client,wid,tid,content,name='reference.png',status=201):
    boundary='----ref'+uuid.uuid4().hex
    parts=[]
    for key,value in {'workspaceId':wid,'taskId':tid,'title':'Visual direction'}.items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode()+content+b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode())
    req=urllib.request.Request(client.base+'uploadReference',b''.join(parts),{'Content-Type':'multipart/form-data; boundary='+boundary,'X-CSRF-Token':client.csrf})
    try:r=client.op.open(req)
    except urllib.error.HTTPError as e:r=e
    result=json.load(r);assert r.code==status,(r.code,result)
    return result

with tempfile.TemporaryDirectory(prefix='axiomate-references-') as temp:
    env=dict(os.environ,AXIOMATE_DATA_DIR=temp)
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    server=subprocess.Popen(php_args+['-S',f'127.0.0.1:{port}','-t',str(ROOT/'dist')],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        base=f'http://127.0.0.1:{port}/api.php?action='
        for _ in range(50):
            try:lead=Client(base);break
            except urllib.error.URLError:time.sleep(.1)
        def register(email):
            c=Client(base);c.call('register',{'email':email,'name':email.split('@')[0],'password':'TestPassword123!'},201);c.state();return c
        lead=register('lead@example.test');lead.call('choosePlan',{'plan':'starter'});lead.state()
        wid=lead.call('createWorkspace',{'name':'Reference studio'},201)['workspace']['id'];lead.workspace_id=wid
        bid=lead.call('createBoard',{'name':'Production'},201)['id'];col=lead.call('createColumn',{'boardId':bid,'name':'Art'},201)['id']
        tid=uuid.uuid4().hex
        task={'id':tid,'title':'Create character','description':'','status':'Backlog','priority':'Medium','due':'','assigneeId':'','boardId':bid,'columnId':col,'priceCents':0,'labels':[],'checklist':'','checks':[]}
        lead.call('saveTask',{'task':task},200)
        def join(email,role):
            token=lead.call('createInvite',{'workspaceId':wid,'email':email,'role':role},201)['token'];c=register(email);c.call('acceptInvite',{'token':token});c.workspace_id=wid;return c
        dev=join('dev@example.test','developer');manager=join('manager@example.test','studio_manager');outsider=register('outsider@example.test')
        import base64
        png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
        upload_reference(dev,wid,tid,png,status=403)
        image=upload_reference(lead,wid,tid,png)['id']
        link=manager.call('addReference',{'taskId':tid,'url':'https://example.com/video','title':'Animation example'},201)['id']
        lead.call('addReference',{'taskId':tid,'url':'javascript:alert(1)'},400)
        upload_reference(lead,wid,tid,b'<svg xmlns="http://www.w3.org/2000/svg"></svg>','image.svg',400)
        upload_reference(lead,wid,tid,b'<?php echo "bad"; ?>','photo.png',400)
        refs=dev.call('workspace')['references'];assert len(refs)==2 and any(r['mime']=='image/png' for r in refs)
        def media(c,rid,status=200,headers=None):
            req=urllib.request.Request(base+'referenceMedia&id='+rid,headers=headers or {})
            try:r=c.op.open(req)
            except urllib.error.HTTPError as e:r=e
            assert r.code==status,(r.code,r.read());return r
        r=media(dev,image);assert r.headers['Content-Type']=='image/png' and r.read()==png
        r=media(dev,image,206,{'Range':'bytes=0-7'});assert r.read()==png[:8] and r.headers['Content-Range']==f'bytes 0-7/{len(png)}'
        media(dev,image,416,{'Range':'bytes=99999-'})
        media(outsider,image,404)
        dev.call('deleteReference',{'id':image},403)
        manager.call('setBoardAccess',{'boardId':bid,'userId':dev.state()['user']['id'],'blocked':True,'reason':'Access removed'})
        assert dev.call('workspace')['references']==[];media(dev,image,403)
        manager.call('deleteReference',{'id':link})
        current=lead.call('workspace')['tasks'][0];assert current['status']=='Backlog' and current['revision']==1
        lead.call('deleteTask',{'id':tid,'revision':current['revision']})
        assert not (Path(temp)/'references'/image).exists()
        media(lead,image,404)
        print('PASS: private image references, leadership-only upload/link/removal, collaborator viewing, invalid URL/file rejection, partial media streaming, cross-account and revoked-board denial, isolated task state, and file cleanup.')
    finally:server.terminate();server.wait(timeout=5)
