(function () {
  var cv = document.getElementById('px');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height, GROUND = 88;

  function hash(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }

   
  var back = document.createElement('canvas'); back.width = W; back.height = H;
  var bg = back.getContext('2d');
  var treeLayer = document.createElement('canvas'); treeLayer.width = W; treeLayer.height = H;
  var s = treeLayer.getContext('2d');
  var mirrorAxis = null;
  function px(c, x, y, col) { if (mirrorAxis !== null) x = 2 * mirrorAxis - x; c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); }
  var combatPoses = { ready: 1, advance: 1, withdraw: 1, guard: 1, windup: 1, dash: 1, cut: 1, evade: 1, aerial: 1, stagger: 1, recover: 1 };
  function pixelLine(c, x0, y0, x1, y1, color, width) {
    var steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (var i = 0; i <= steps; i++) {
      var x = Math.round(x0 + (x1 - x0) * i / steps), y = Math.round(y0 + (y1 - y0) * i / steps);
      for (var w = 0; w < (width || 1); w++) px(c, x + w, y, color);
    }
  }

  var day = document.documentElement.getAttribute('data-theme') === 'light';
  var SKY = {
    night: ['#120c24', '#1a1233', '#241846', '#2f205a', '#3b2a6b', '#4b3480', '#6a4a98', '#8a6aa8'],
    day: ['#9ccdf2', '#aad6f6', '#b9def8', '#c9e6fa', '#dcedfb', '#f2eef2', '#ffe9d6', '#ffd9c0']
  };
  var stars = [];
  for (var k = 0; k < 40; k++) stars.push([Math.floor(hash(k, 1) * W), Math.floor(hash(k, 2) * 50), hash(k, 3) * 6]);

  function paintBack() {
    var sky = day ? SKY.day : SKY.night;
    for (var y = 0; y < GROUND; y++) {
      var f = y / GROUND * sky.length, b = Math.floor(f), fr = f - b;
      for (var x = 0; x < W; x++) {
        var i = b + ((fr > 0.8 && hash(x, y) < (fr - 0.8) * 5) ? 1 : 0);
        px(bg, x, y, sky[Math.min(i, sky.length - 1)]);
      }
    }
     
    for (var my = -11; my <= 11; my++) for (var mx = -11; mx <= 11; mx++) {
      var d2 = mx * mx + my * my;
      if (day) {
        if (d2 <= 56) px(bg, 166 + mx, 20 + my, d2 < 30 ? '#fff6c8' : '#ffe27a');
        else if (d2 <= 110 && hash(mx + 9, my + 4) < 0.35) px(bg, 166 + mx, 20 + my, '#fff0b8');
      } else if (d2 <= 64) {
        px(bg, 166 + mx, 20 + my, (mx + 3) * (mx + 3) + (my - 2) * (my - 2) < 20 && hash(mx, my) > 0.4 ? '#f1e3b8' : '#fff5d6');
      }
    }
    if (day) {  
      [[120, 14, 9], [24, 12, 7], [98, 30, 6]].forEach(function (c) {
        for (var cy = -2; cy <= 2; cy++) for (var cx = -c[2]; cx <= c[2]; cx++) {
          if ((cx * cx) / (c[2] * c[2]) + (cy * cy) / 5 <= 1) px(bg, c[0] + cx, c[1] + cy, cy < 0 ? '#ffffff' : '#e9f3fb');
        }
      });
    }
    var G1 = day ? ['#7fcf8a', '#58a96a', '#4a9460', '#8a6f5a', '#79604d'] : ['#5fb87a', '#3f8a5c', '#2f6b4f', '#3a2a45', '#2a1f35'];
    for (var gy = GROUND; gy < H; gy++) for (var gx = 0; gx < W; gx++) {
      var col = gy === GROUND ? G1[0] : gy === GROUND + 1 ? G1[1] : gy < GROUND + 5 ? G1[2] : (hash(gx, gy) < 0.1 ? G1[3] : G1[4]);
      px(bg, gx, gy, col);
    }
    for (var gr = 0; gr < 60; gr++) { var gx2 = Math.floor(hash(gr, 9) * W); px(bg, gx2, GROUND - 1, G1[0]); if (hash(gr, 8) < 0.4) px(bg, gx2, GROUND - 2, day ? '#a6e6ae' : '#8be0a0'); }
  }
  paintBack();
  window.addEventListener('axm-theme', function (e) { day = e.detail === 'light'; paintBack(); frame(displayTime || 0); });

   
  var TX = 48;
  function trunk() {
    for (var y = 56; y <= GROUND; y++) {
      var hw = 2 + Math.floor((y - 56) / 30 * 3) + (y > GROUND - 4 ? 2 : 0);
      for (var x = TX - hw; x <= TX + hw; x++) {
        var c = x >= TX + hw - 1 ? '#1c1c1c' : x <= TX - hw + 1 ? '#5c5c5c' : '#3a3a3a';
        if (hash(x, y) < 0.08) c = '#111111';
        px(s, x, y, c);
      }
    }
  }
  function limb(x0, y0, x1, y1, w) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (var i = 0; i <= n; i++) {
      var x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
      for (var d = 0; d < w; d++) px(s, x + d, y, d === w - 1 ? '#1c1c1c' : '#3a3a3a');
    }
  }
  trunk();
  limb(TX, 60, 30, 44, 3); limb(TX, 60, 66, 44, 3); limb(TX, 58, TX, 36, 3);
  limb(TX, 50, 38, 34, 2); limb(TX, 50, 58, 32, 2); limb(30, 44, 22, 38, 2); limb(66, 44, 74, 38, 2);

  var blobs = [[48, 36, 22], [30, 44, 15], [66, 44, 15], [38, 24, 14], [58, 25, 14], [48, 18, 11], [22, 36, 10], [75, 37, 10], [48, 48, 12]];
  var pal = ['#ffffff', '#e8e8e8', '#cfcfcf', '#b3b3b3', '#8a8a8a'];    
  var inCan = {};
  function inside(x, y) {
    for (var i = 0; i < blobs.length; i++) { var b = blobs[i], dx = x - b[0], dy = y - b[1]; if (dx * dx + dy * dy <= b[2] * b[2]) return b; }
    return null;
  }
  for (var cy = 0; cy < GROUND; cy++) for (var cx = 0; cx < 100; cx++) { if (inside(cx, cy)) inCan[cx + ',' + cy] = 1; }
  for (var cy2 = 0; cy2 < GROUND; cy2++) for (var cx2 = 0; cx2 < 100; cx2++) {
    var b = inside(cx2, cy2); if (!b) continue;
    var below = !inCan[cx2 + ',' + (cy2 + 1)];
    var edge = below || !inCan[(cx2 + 1) + ',' + cy2] || !inCan[(cx2 - 1) + ',' + cy2] || !inCan[cx2 + ',' + (cy2 - 1)];
    if (edge && hash(cx2, cy2) < 0.18) continue;
    var shade = (-(cx2 - b[0]) * 0.6 - (cy2 - b[1]) * 0.8) / b[2];
    var idx = Math.round(2 - shade * 1.6 + (hash(cx2, cy2 + 5) - 0.5) * 1.6);
    if (below) idx += 1;
    px(s, cx2, cy2, pal[Math.max(0, Math.min(4, idx))]);
  }
   
  for (var p = 0; p < 40; p++) px(s, TX - 22 + Math.floor(hash(p, 4) * 44), GROUND - (hash(p, 6) < 0.3 ? 1 : 0), pal[1 + Math.floor(hash(p, 7) * 3)]);

   
  var C = { F: '#3d332c', f: '#7a675a', k: '#14121a', K: '#2c2936', s: '#e8b48a', S: '#b9835e', w: '#f2f2f5', c: '#c9ced8', x: '#2a2733', E: '#c9a8ff' };
  var rows = [
    '..kFFFFFk..',
    '.FfffffffF.',
    'FfFfffffFfF',
    'FFFFFFFFFFF',
    'FkkkkkkkkkF',
    'FkkEkkkEkkF',
    '.FkssssskF.',
    '..ksssssk..',
    '...ssSss...',
    '....cwc....',
    '.kKkkwkkKk.',
    '.kkkkwkkkk.',
    '.kkkkwkkkk.',
    '..kkkwkkk..',
    '..kxxcxxk..',
    '..kkkkkkk..',
    '.kkkkkkkkk.',
    '.kKkkkkkKk.',
    '.kkkkkkkkk.',
    '.kkkkkkkkk.',
    '..kkk.kkk..',
    '...kk.kk...',
    '...kk.kk...',
    '...kk.kk...',
    '...kk.kk...',
    '..KKK.KKK..'
  ];
  var legsA = ['..kkk.kkk..', '..kk...kk..', '.kk.....kk.', '.kk.....kk.', '.kk.....kk.', '.KKK...KKK.'];
  var legsB = ['..kkk.kkk..', '...kkkkk...', '....kkk....', '....kkk....', '....kkk....', '...KKKKK...'];
  var SPR_W = 11;
  var BLADE = { edge: '#ffffff', body: '#b9c6ff', mark: '#3a3fb0', glow: 'rgba(150,110,255,.35)' };
  var EMBER = { edge: '#fff1c9', body: '#ffb347', mark: '#b8450e', glow: 'rgba(255,120,40,.35)' };
  function blade(c, hx, hy, ang, len, t, pal) {
    var P = pal || BLADE;
    var ca = Math.cos(ang), sa = Math.sin(ang), vert = Math.abs(sa) > Math.abs(ca);
    for (var i = -3; i <= len; i++) {
      var x = Math.round(hx + ca * i), y = Math.round(hy + sa * i);
      if (i < 0) { px(c, x, y, C.k); continue; }
      if (i === 1) { var gx = Math.round(-sa * 2), gy = Math.round(ca * 2); px(c, x + gx, y + gy, C.k); px(c, x, y, C.k); px(c, x - gx, y - gy, C.k); continue; }
      if (i < 3) { px(c, x, y, C.k); continue; }
      var taper = len - i < 3;
      var glow = P.glow;
      px(c, vert ? x + 2 : x, vert ? y : y + 2, glow); px(c, vert ? x - 2 : x, vert ? y : y - 2, glow);
      var col = (i % 5 === 3) ? P.mark : P.body;
      px(c, x, y, col);
      if (!taper) { px(c, vert ? x + 1 : x, vert ? y : y + 1, (i % 5 === 3) ? P.mark : P.edge); px(c, vert ? x - 1 : x, vert ? y : y - 1, P.edge); }
    }
    if (t !== undefined && Math.sin(t / 150) > 0.5) {
      var tx = Math.round(hx + ca * len), ty = Math.round(hy + sa * len);
      px(c, tx, ty, '#ffffff'); px(c, tx + 1, ty, '#fff'); px(c, tx - 1, ty, '#fff'); px(c, tx, ty - 1, '#fff'); px(c, tx, ty + 1, '#fff');
      px(c, tx + 2, ty, 'rgba(255,255,255,.6)'); px(c, tx - 2, ty, 'rgba(255,255,255,.6)'); px(c, tx, ty - 2, 'rgba(255,255,255,.6)'); px(c, tx, ty + 2, 'rgba(255,255,255,.6)');
    }
  }
   
   
  function drawCombat(c, rival, pose, ox, oy, ang, t, wf) {
    var colors = rival ? RC : C, source = rival ? rRows : rows;
    var stepping = pose === 'advance' || pose === 'withdraw';
    var low = pose === 'evade' ? 7 : pose === 'windup' ? 3 : pose === 'ready' || stepping ? 0 : 2;
    var lean = pose === 'stagger' ? -3 : pose === 'evade' ? -2 : pose === 'cut' ? 2 : 0;
    if (pose === 'aerial') { low = 0; lean = 3; }
    var cloth = rival ? RC.t : C.k, rim = rival ? '#91b9e2' : '#7659bc';
    for (var r = 0; r < 20; r++) for (var q = 0; q < 11; q++) {
      var ch = source[r][q]; if (ch === '.' || (r > 9 && (q === 0 || q === 10))) continue;
      var shift = Math.round(lean * (1 - r / 25)), down = Math.round(low * (1 - r / 24));
      var color = colors[ch];
      if ((ch === 'k' || ch === 't') && q === 2 && r > 9) color = rim;
      px(c, ox + q + shift, oy + r + down, color);
    }
    var hipX = ox + 5, hipY = oy + 18 + Math.round(low / 4);
    var stride = stepping ? (wf ? 4 : 2) : pose === 'cut' || pose === 'evade' ? 5 : pose === 'ready' ? 3 : 4;
    var footY = oy + 25, backY = stepping && wf ? footY - 2 : footY;
    pixelLine(c, hipX - 1, hipY, hipX - 4, hipY + 3, cloth, 3);
    pixelLine(c, hipX - 4, hipY + 3, hipX - stride, backY, cloth, 2);
    pixelLine(c, hipX + 1, hipY, hipX + 5, hipY + 3, cloth, 3);
    pixelLine(c, hipX + 5, hipY + 3, hipX + stride, footY, cloth, 2);
    pixelLine(c, hipX - stride - 2, backY, hipX - stride + 1, backY, rim);
    pixelLine(c, hipX + stride, footY, hipX + stride + 3, footY, rim);
     
    for (var tail = 0; tail < 5; tail++) {
      var length = 1 + Math.floor(tail / 2) + (stepping ? 1 : 0);
      pixelLine(c, ox + 2, oy + 16 + tail, ox - length, oy + 16 + tail, tail === 4 ? rim : cloth);
    }
    var shoulderY = oy + 11 + Math.round(low / 2), shoulderX = ox + 8 + Math.round(lean / 2);
    var handX = shoulderX + Math.round(Math.cos(ang) * 6), handY = shoulderY + Math.round(Math.sin(ang) * 6);
    var second = pose === 'windup' ? -1.8 : pose === 'evade' ? .1 : -1.2;
    var backX = ox + 2, backHandY = shoulderY + 3;
    pixelLine(c, ox + 2, shoulderY, ox - 1, shoulderY + 3, cloth, 2);
    pixelLine(c, ox - 1, shoulderY + 3, backX, backHandY, cloth, 2);
    if (!rival) blade(c, backX, backHandY, second, 7, undefined, BLADE);
    pixelLine(c, shoulderX, shoulderY, shoulderX + 3, shoulderY + 2, rim, 2);
    pixelLine(c, shoulderX + 3, shoulderY + 2, handX, handY, cloth, 2);
    px(c, handX, handY, rival ? RC.s : C.s);
    blade(c, handX, handY, ang, rival ? 13 : 10, undefined, rival ? ICE : BLADE);
  }
   
  var RC = { W: '#ffffff', w: '#c8d6f0', s: '#9bb3d6', S: '#6a82ae', E: '#9bb3d6', e: '#c58bff', m: '#a35bff', c: '#f6f9ff', z: '#2fa39a', k: '#16151d', i: '#e6edf8', p: '#7d93bd', P: '#5a6e98', t: '#2b2a3b', f: '#f6f9ff', b: '#232230', g: '#3a74c4' };
  var ICE = { edge: '#ffffff', body: '#9fd8ff', mark: '#3a74c4', glow: 'rgba(120,190,255,.38)' };
  var rRows = [
    '.W...W..W..',
    '.WW.WWW.WW.',
    '.WwWWWWWwW.',
    'EWwWWwWWwWE',
    'EwWSSmSSWwE',
    'EskeSsSeksE',
    '..SsssssS..',
    '...ssSss...',
    'czczczczczc',
    'ccccccccccc',
    'cczzczczzcc',
    'pkkkkkkkkkp',
    'piiiiiiiiip',
    'pkkkkkkkkkp',
    '.piiiiiiip.',
    '..bbbbbbb..',
    '..ttttttt..',
    '.ptttttttp.',
    '.pttttttPp.',
    '.pptttttpp.',
    '..ttt.ttt..',
    '..ttt.ttt..',
    '..fff.fff..',
    '..bbb.bbb..',
    '.bbbb.bbbb.',
    '.bbbb.bbbb.'
  ];
  var rLegsA = ['..ttt.ttt..', '..tt...tt..', '.ff.....ff.', '.bb.....bb.', '.bb.....bb.', 'bbb.....bbb'];
  var rLegsB = ['..ttt.ttt..', '...ttttt...', '....fff....', '....bbb....', '....bbb....', '...bbbbb...'];
  var R_H = rRows.length, DAGGER = 16;
  function contactFx(hit) {
    var k = hit.k, power = hit.power, x = hit.x, y = hit.y;
     
    if (k < .25) {
      pixelLine(ctx,x-5,y+3,x+5,y-3,'#e9e2ff');
      pixelLine(ctx,x-3,y-5,x+3,y+5,'#9fd8ff');
      px(ctx,x,y,'#ffffff');
    }
    for (var i = 0; i < 14; i++) {
      var angle = hash(i,12)*Math.PI*2, distance = k*(7+hash(i,4)*14)*power;
      var dx = Math.cos(angle)*distance, dy = Math.sin(angle)*distance*.65+k*k*5;
      var color = k < .25 ? '#eae4ff' : 'rgba(160,164,255,' + (1-k).toFixed(2) + ')';
      pixelLine(ctx,x+dx*.8,y+dy*.8,x+dx,y+dy,color);
    }
     
    for (var d = 0; d < 8; d++) {
      var side = d%2 ? 1 : -1, travel = k*(4+hash(d,5)*12)*power;
      var dustY = GROUND-Math.sin(k*Math.PI)*(1+hash(d,6)*4);
      px(ctx,Math.round(x+side*travel),Math.round(dustY),'rgba(175,161,199,' + ((1-k)*.5).toFixed(2) + ')');
    }
  }
   
   
  var L = 14, IGX = 90, RPOP = 196;
  function cl(v,a,b) { return Math.max(a,Math.min(b,v)); }
  function lerp(a,b,k) { return a+(b-a)*cl(k,0,1); }
  function plan(T) {
    var S={x:140,face:-1,pose:'ready',ang:-.7,lift:0,u:0,portal:0,rise:0,kneel:0,dis:0,shock:-1,R:null,spark:-1,flash:0,ghost:0,arc:null,popFx:-1,snow:0,hit:null,hold:null,motion:0,velocity:0};
    function rival(x,pose,ang) { S.R={x:x,lift:0,pose:pose,ang:ang,face:-1,fade:0}; }
    function k(start,duration) { var p=cl((T-start)/duration,0,1); return p*p*(3-2*p); }
    if(T<1.5) return S;
    if(T<2.8) { S.x=lerp(140,126,k(1.5,1.3)); S.face=1; S.pose='advance'; rival(lerp(196,164,k(1.5,1.3)),'advance',-.7); }
    else if(T<3.7) { S.x=lerp(126,134,k(2.8,.9)); S.pose='advance'; rival(164,'ready',-.7); }
    else if(T<4.15) { S.x=134; S.pose='guard'; S.ang=-.6; rival(164,'windup',lerp(-.7,-1.8,k(3.7,.45))); }
    else if(T<4.33) { S.x=134; S.pose='guard'; S.ang=-.6; rival(lerp(164,157,k(4.15,.18)),'cut',lerp(-1.8,-.59,k(4.15,.18))); }
    else if(T<4.41) { S.x=134; S.pose='guard'; S.ang=-.59; rival(157,'cut',-.59); S.hold=4330; }
    else if(T<5.15) { S.x=lerp(134,132,k(4.41,.74)); S.pose='withdraw'; rival(lerp(157,164,k(4.41,.74)),'withdraw',lerp(-.59,-.7,k(4.41,.74))); }
    else if(T<5.8) { S.x=132; S.pose='guard'; rival(164,'ready',-.7); }
    else if(T<6.18) { S.x=132; S.pose='guard'; rival(164,'windup',lerp(-.7,-1.4,k(5.8,.38))); }
    else if(T<6.38) { S.x=132; S.pose='evade'; S.ang=.2; rival(lerp(164,153,k(6.18,.2)),'cut',lerp(-1.4,-.55,k(6.18,.2))); }
    else if(T<6.7) { S.x=132; S.pose='evade'; S.ang=.2; rival(153,'cut',-.55); }
    else if(T<6.86) { S.x=132; S.pose='windup'; S.ang=-1.3; rival(lerp(153,157,k(6.7,.16)),'recover',lerp(-.55,.7,k(6.7,.16))); }
    else if(T<7.03) { S.x=lerp(132,144,k(6.86,.17)); S.pose='cut'; S.ang=lerp(-1.3,0,k(6.86,.17)); rival(157,'recover',.7); }
    else if(T<7.11) { S.x=144; S.pose='cut'; S.ang=0; rival(157,'stagger',.7); S.hold=7030; }
    else if(T<7.65) { S.x=144; S.pose='recover'; S.ang=lerp(0,-.7,k(7.11,.54)); rival(lerp(157,174,k(7.11,.54)),'stagger',.7); }
    else if(T<8.45) { S.x=144; S.pose='guard'; rival(174,'recover',lerp(.7,-.7,k(7.65,.8))); }
    else if(T<10) { S.x=144; S.pose='ready'; rival(lerp(174,202,k(8.45,1.55)),'withdraw',-.7); if(T>9.4) S.R.face=1; }
    else if(T<11.2) { S.x=lerp(144,140,k(10,1.2)); S.pose='withdraw'; }
    if(T>=4.33 && T<4.62) S.hit={x:145.5,y:68,k:(T-4.33)/.29,power:.45};
    if(T>=7.03 && T<7.34) S.hit={x:157,y:74,k:(T-7.03)/.31,power:.6};
    S.snow=T<2.8?cl((T-1.5)/1.3,0,.3):T<8.45?.3:cl((10-T)/1.55,0,.3);
    return S;
  }

  function frame(t) {
    var S=plan((t/1000)%L);
    if(S.hold!==null) t=Math.floor(t/(L*1000))*L*1000+S.hold;
    ctx.imageSmoothingEnabled=false;
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(back,0,0); ctx.drawImage(treeLayer,0,0);
    if(!day) stars.forEach(function(st){if(Math.sin(t/900+st[2])>.4) px(ctx,st[0],st[1],'#e6dcf2');});
    var X=Math.round(S.x), wf=Math.floor(X/3)%2;
     
    function shadow(x) { for(var i=-7;i<=7;i++) px(ctx,x+i,GROUND+1,'rgba(4,3,12,.45)'); }
    if(S.R) {
      var RX=Math.round(S.R.x); shadow(RX);
      mirrorAxis=S.R.face===-1?RX:null;
      drawCombat(ctx,true,S.R.pose,RX-5,GROUND-R_H,S.R.ang,t,Math.floor(RX/3)%2);
      mirrorAxis=null;
      for(var f=0;f<5;f++) {
        var phase=(t/100+f*7)%25;
        px(ctx,RX+Math.round(Math.sin(f*2+t/500)*5),GROUND-2-phase,'rgba(155,205,255,.35)');
      }
    }
    shadow(X);
    mirrorAxis=S.face===1?X:null;
    drawCombat(ctx,false,S.pose,X-5,GROUND-rows.length,S.ang,t,wf);
    mirrorAxis=null;
    if(S.hit) contactFx(S.hit);
     
    for(var i=0;i<petals.length;i++) {
      var p=petals[i],age=((t/1000+p.t0)*p.v)%(GROUND-p.y0);
      var y=p.y0+age,x=p.x0+age*.5+Math.sin(age/6+p.ph)*4;
      px(ctx,x,y,pal[p.c]);
    }
  }

  var petals = [];
  for (var i = 0; i < 26; i++) petals.push({ t0: hash(i,1)*12, x0: 20+hash(i,2)*60, y0: 22+hash(i,3)*28, v: 5+hash(i,4)*7, ph: hash(i,5)*6, c: 1+Math.floor(hash(i,6)*3), big: hash(i,7)<.4 });

  var fz = /[?&]scene=([\d.]+)/.exec(location.search);  
  var displayTime = fz ? parseFloat(fz[1]) * 1000 : 0;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var sceneVisible = true, animationHandle = 0, lastTick = null, lastDraw = -34, userPaused = false;
  var pauseButton = document.querySelector('.scene-toggle');
  function updatePauseControl() {
    if (!pauseButton) return;
    pauseButton.disabled = reducedMotion.matches || !!fz;
    pauseButton.textContent = reducedMotion.matches ? 'Reduced motion enabled' : fz ? 'Preview frame' : userPaused ? 'Play animation' : 'Pause animation';
    pauseButton.setAttribute('aria-pressed', userPaused || reducedMotion.matches || fz ? 'true' : 'false');
  }
  function tick(now) {
    animationHandle = 0;
    if (docHidden() || !sceneVisible || reducedMotion.matches || userPaused || fz) return;
    if (lastTick !== null) displayTime += Math.min(50, now-lastTick);
    lastTick = now;
    if (displayTime-lastDraw >= 1000/30) { frame(displayTime); lastDraw=displayTime; }
    animationHandle=requestAnimationFrame(tick);
  }
  function docHidden() { return document.hidden; }
  function syncAnimation() {
    if (animationHandle) cancelAnimationFrame(animationHandle);
    animationHandle=0; lastTick=null;
    updatePauseControl();
    if (reducedMotion.matches) { displayTime=0; lastDraw=-34; frame(0); return; }
    if (!docHidden() && sceneVisible && !fz && !userPaused) animationHandle=requestAnimationFrame(tick);
  }
  frame(displayTime);
  document.addEventListener('visibilitychange',syncAnimation);
  if (pauseButton) pauseButton.addEventListener('click',function () { userPaused=!userPaused; syncAnimation(); });
  reducedMotion.addEventListener('change',syncAnimation);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { sceneVisible=entries[0].isIntersecting; syncAnimation(); },{threshold:0}).observe(cv);
  }
  syncAnimation();
})();
