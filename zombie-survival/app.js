(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const mobile = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  document.body.classList.toggle('mobile', mobile);
  const ui = {
    game:$('game'), wave:$('wave'), left:$('zombiesLeft'), score:$('score'), kills:$('kills'),
    hpText:$('hpText'), hpBar:$('hpBar'), ammo:$('ammo'), weaponName:$('weaponName'), time:$('time'), best:$('best'),
    weaponBar:$('weaponBar'), msg:$('message'), damage:$('damageFlash'), cross:$('crosshair'),
    start:$('startOverlay'), pause:$('pauseOverlay'), over:$('gameOverOverlay'), overText:$('gameOverText')
  };
  if (!window.THREE) {
    ui.start.querySelector('.panel').innerHTML = '<h2>3D 엔진 로딩 실패</h2><p>인터넷 연결 후 새로고침해 주세요.</p>';
    return;
  }
  const W = [
    {id:'pistol',n:'권총',d:34,rate:.24,clip:12,res:84,p:1,spread:.006,range:85,reload:1.05,c:0x63eaff},
    {id:'smg',n:'기관단총',d:16,rate:.08,clip:30,res:180,p:1,spread:.035,range:64,reload:1.35,c:0xffd45d},
    {id:'shotgun',n:'산탄총',d:15,rate:.68,clip:6,res:48,p:8,spread:.11,range:44,reload:1.55,c:0xff8c63},
    {id:'rifle',n:'돌격소총',d:27,rate:.14,clip:24,res:144,p:1,spread:.017,range:98,reload:1.45,c:0x85ff8b},
    {id:'sniper',n:'저격총',d:118,rate:1.0,clip:5,res:30,p:1,spread:.002,range:150,reload:1.9,c:0xc891ff}
  ];
  const Z = {
    walker:{min:1,hp:54,sp:2.05,d:11,score:15,sc:1,c:0x7dff8c,atk:1.05},
    runner:{min:2,hp:36,sp:3.65,d:9,score:22,sc:.88,c:0xffd45d,atk:.78},
    crawler:{min:2,hp:28,sp:4.25,d:7,score:20,sc:.66,c:0x59dbff,atk:.62},
    tank:{min:3,hp:155,sp:1.38,d:21,score:46,sc:1.38,c:0xff657e,atk:1.25},
    spitter:{min:3,hp:68,sp:1.85,d:13,score:38,sc:1.03,c:0x68ffcf,atk:2.15,ranged:true},
    exploder:{min:4,hp:58,sp:2.9,d:28,score:42,sc:1.05,c:0xff8b3d,atk:99,boom:true},
    boss:{min:5,hp:420,sp:1.75,d:25,score:160,sc:1.82,c:0xc58cff,atk:.86,ranged:true,boss:true}
  };
  const bestKey='neon_deadline_3d_best_v4';
  let best=Number(localStorage.getItem(bestKey)||0);
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x06101a); scene.fog=new THREE.FogExp2(0x07111b,.018);
  const camera=new THREE.PerspectiveCamera(74,innerWidth/innerHeight,.1,180); camera.rotation.order='YXZ';
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.35:2));
  renderer.shadowMap.enabled=!mobile; renderer.outputColorSpace=THREE.SRGBColorSpace; ui.game.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0x9fc8ff,0x11151d,1.3));
  const sun=new THREE.DirectionalLight(0xd6e7ff,1.25); sun.position.set(15,26,10); sun.castShadow=!mobile; scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0x15212c,roughness:.95}));
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
  scene.add(new THREE.GridHelper(120,48,0x29566f,0x132a37));
  const obstacles=[];
  function box(x,z,sx,sy,sz){
    const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshStandardMaterial({color:0x2b3b4d,roughness:.86}));
    m.position.set(x,sy/2,z); m.castShadow=!mobile; m.receiveShadow=true; scene.add(m);
    obstacles.push({x,z,hx:sx/2+.5,hz:sz/2+.5});
  }
  [[-18,-14,5,4,5],[-7,-16,4,5,4],[7,-16,5,3,5],[19,-13,4,5,4],[-21,7,4,6,15],[21,6,4,6,15],[-7,12,6,3,6],[8,16,5,5,5],[0,0,8,2.5,8]].forEach(v=>box(...v));
  const player={pos:new THREE.Vector3(0,1.72,28),yaw:Math.PI,pitch:-.05,hp:100,max:100,speed:8.4,sprint:1.55,idx:0,cool:0,reload:0,reloadIdx:-1,inv:0,states:W.map(w=>({a:w.clip,r:w.res}))};
  const keys=new Set(), move={x:0,y:0}; let running=false,fireHeld=false,state='menu',locked=false,wave=0,score=0,kills=0,elapsed=0,nextWaveT=0;
  const zombies=[],shots=[],pickups=[]; const ray=new THREE.Raycaster();
  function msg(t,ms=1100){ui.msg.textContent=t;ui.msg.style.opacity=1;clearTimeout(msg.t);msg.t=setTimeout(()=>ui.msg.style.opacity=0,ms)}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
  function blocked(x,z,r=.7){return obstacles.some(o=>Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r)}
  function slide(pos,dx,dz,r=.7){const nx=clamp(pos.x+dx,-46,46),nz=clamp(pos.z+dz,-46,46);if(!blocked(nx,pos.z,r))pos.x=nx;if(!blocked(pos.x,nz,r))pos.z=nz}
  function buildZombie(type){
    const c=Z[type],g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.52*c.sc,1.1*c.sc,5,10),new THREE.MeshStandardMaterial({color:c.c,emissive:c.c,emissiveIntensity:.05}));
    const head=new THREE.Mesh(new THREE.SphereGeometry(.35*c.sc,12,12),new THREE.MeshStandardMaterial({color:0xcaffd0})); head.position.y=1.15*c.sc; g.add(body,head);
    const eyeMat=new THREE.MeshBasicMaterial({color:0xff364d}); for(const x of[-.12,.12]){const e=new THREE.Mesh(new THREE.SphereGeometry(.055*c.sc,6,6),eyeMat);e.position.set(x*c.sc,1.2*c.sc,.3*c.sc);g.add(e)}
    const a=Math.random()*Math.PI*2,d=27+Math.random()*13; g.position.set(Math.cos(a)*d,.9*c.sc,Math.sin(a)*d); scene.add(g);
    const z={g,type,c,hp:c.hp+wave*(c.boss?28:4),sp:c.sp+wave*.035,cd:0,rcd:1+Math.random(),alive:true}; g.traverse(o=>{if(o.isMesh)o.userData.z=z}); zombies.push(z);
  }
  function allowedTypes(){return Object.keys(Z).filter(k=>k!=='boss'&&Z[k].min<=wave)}
  function startWave(){wave++;const types=allowedTypes(),n=5+wave*2;for(let i=0;i<n;i++)buildZombie(types[Math.floor(Math.random()*types.length)]);if(wave%5===0)buildZombie('boss');msg(wave%5===0?`웨이브 ${wave} · 보스 출현!`:`웨이브 ${wave}`);uiUpdate()}
  function removeZombie(z){if(!z.alive)return;z.alive=false;const i=zombies.indexOf(z);if(i>=0)zombies.splice(i,1);scene.remove(z.g);kills++;score+=z.c.score;if(Math.random()<.13)drop(z.g.position.clone(),Math.random()<.55?'ammo':'hp');if(!zombies.length){nextWaveT=2;msg(`웨이브 ${wave} 클리어`)}}
  function drop(pos,type){const g=new THREE.Mesh(new THREE.BoxGeometry(.65,.65,.65),new THREE.MeshStandardMaterial({color:type==='hp'?0x68ff9c:0x60d7ff,emissive:type==='hp'?0x1c6a3a:0x1c4e6a,emissiveIntensity:.6}));g.position.copy(pos).setY(.7);scene.add(g);pickups.push({g,type,t:18,b:Math.random()*6})}
  function hitPlayer(n){if(player.inv>0||state!=='playing')return;player.hp=Math.max(0,player.hp-n);player.inv=.3;ui.damage.style.opacity=.8;setTimeout(()=>ui.damage.style.opacity=0,90);if(!player.hp)gameOver();uiUpdate()}
  function enemyShot(z){const m=new THREE.Mesh(new THREE.SphereGeometry(.18,8,8),new THREE.MeshBasicMaterial({color:z.c.c}));m.position.copy(z.g.position).setY(1.4);const v=player.pos.clone().sub(m.position).normalize().multiplyScalar(10);scene.add(m);shots.push({m,v,t:3,d:z.c.d*.75})}
  function select(i){player.idx=(i+W.length)%W.length;player.reload=0;uiUpdate()}
  function reload(){const w=W[player.idx],s=player.states[player.idx];if(player.reload||s.a===w.clip||s.r<=0)return;player.reload=w.reload;player.reloadIdx=player.idx;msg('재장전 중...')}
  function finishReload(){const i=player.reloadIdx,w=W[i],s=player.states[i],n=Math.min(w.clip-s.a,s.r);s.a+=n;s.r-=n;player.reloadIdx=-1;msg('재장전 완료')}
  function fire(){
    if(state!=='playing'||player.cool||player.reload)return;const w=W[player.idx],s=player.states[player.idx];if(s.a<=0){reload();return}s.a--;player.cool=w.rate;
    for(let p=0;p<w.p;p++){
      const dir=new THREE.Vector3();camera.getWorldDirection(dir);dir.x+=(Math.random()-.5)*w.spread;dir.y+=(Math.random()-.5)*w.spread;dir.z+=(Math.random()-.5)*w.spread;dir.normalize();ray.set(camera.position,dir);ray.far=w.range;
      const objs=[];zombies.forEach(z=>z.g.traverse(o=>{if(o.isMesh)objs.push(o)}));const h=ray.intersectObjects(objs,false)[0];if(h?.object?.userData?.z){const z=h.object.userData.z;z.hp-=w.d;ui.cross.classList.add('hit');setTimeout(()=>ui.cross.classList.remove('hit'),70);if(z.hp<=0)removeZombie(z)}
    }uiUpdate()
  }
  function gameOver(){state='gameover';best=Math.max(best,score);localStorage.setItem(bestKey,best);ui.overText.innerHTML=`점수 <b>${score}</b> · 처치 <b>${kills}</b> · 웨이브 <b>${wave}</b> · 생존 <b>${elapsed.toFixed(1)}초</b>`;ui.over.style.display='flex';document.exitPointerLock?.();resetMobileInputs()}
  function start(){zombies.splice(0).forEach(z=>scene.remove(z.g));shots.splice(0).forEach(s=>scene.remove(s.m));pickups.splice(0).forEach(p=>scene.remove(p.g));player.pos.set(0,1.72,28);player.yaw=Math.PI;player.pitch=-.05;player.hp=100;player.idx=0;player.cool=player.reload=player.inv=0;player.states=W.map(w=>({a:w.clip,r:w.res}));wave=score=kills=0;elapsed=0;nextWaveT=0;state='playing';ui.start.style.display=ui.over.style.display=ui.pause.style.display='none';startWave();if(!mobile)renderer.domElement.requestPointerLock?.();uiUpdate()}
  function pause(){if(state!=='playing')return;state='paused';ui.pause.style.display='flex';document.exitPointerLock?.();resetMobileInputs()}
  function resume(){if(state!=='paused')return;state='playing';ui.pause.style.display='none';if(!mobile)renderer.domElement.requestPointerLock?.()}
  function menu(){state='menu';ui.pause.style.display=ui.over.style.display='none';ui.start.style.display='flex';resetMobileInputs()}
  function uiUpdate(){const w=W[player.idx],s=player.states[player.idx];ui.wave.textContent=wave;ui.left.textContent=zombies.length;ui.score.textContent=score;ui.kills.textContent=kills;ui.hpText.textContent=`${Math.ceil(player.hp)} / ${player.max}`;ui.hpBar.style.width=`${player.hp}%`;ui.weaponName.textContent=w.n;ui.weaponName.style.color=`#${w.c.toString(16).padStart(6,'0')}`;ui.ammo.textContent=`${s.a} / ${s.r}`;ui.time.textContent=`${elapsed.toFixed(1)}초`;ui.best.textContent=`${best}점`;[...ui.weaponBar.children].forEach((b,i)=>{b.classList.toggle('active',i===player.idx);const e=b.querySelector('em');if(e)e.textContent=`${player.states[i].a}/${player.states[i].r}`})}
  W.forEach((w,i)=>{const b=document.createElement('button');b.className='weaponSlot';b.innerHTML=`<span>${i+1}</span><b>${w.n}</b><em>${w.clip}/${w.res}</em>`;b.onpointerdown=e=>{e.preventDefault();select(i)};ui.weaponBar.appendChild(b)});
  if(mobile)$('mobileUI').appendChild(ui.weaponBar);
  function update(dt){
    elapsed+=dt;player.cool=Math.max(0,player.cool-dt);player.inv=Math.max(0,player.inv-dt);const old=player.reload;player.reload=Math.max(0,player.reload-dt);if(old>0&&!player.reload)finishReload();
    let x=move.x,z=move.y;if(keys.has('KeyW'))z--;if(keys.has('KeyS'))z++;if(keys.has('KeyA'))x--;if(keys.has('KeyD'))x++;if(x||z){const l=Math.hypot(x,z)||1;x/=l;z/=l;const sn=Math.sin(player.yaw),cs=Math.cos(player.yaw),spd=player.speed*((running||keys.has('ShiftLeft')||keys.has('ShiftRight'))?player.sprint:1);slide(player.pos,(x*cs-z*sn)*spd*dt,(z*cs+x*sn)*spd*dt)}
    camera.position.copy(player.pos);camera.rotation.y=player.yaw;camera.rotation.x=player.pitch;if(fireHeld)fire();
    for(const zed of [...zombies]){const p=zed.g.position,dx=player.pos.x-p.x,dz=player.pos.z-p.z,d=Math.hypot(dx,dz),nx=dx/(d||1),nz=dz/(d||1);zed.cd-=dt;zed.rcd-=dt;
      if(zed.c.boom&&d<3){removeZombie(zed);hitPlayer(zed.c.d);continue}
      if(zed.c.ranged&&!zed.c.boss){if(d>13)slide(p,nx*zed.sp*dt,nz*zed.sp*dt,.5);else if(d<8)slide(p,-nx*zed.sp*.7*dt,-nz*zed.sp*.7*dt,.5);if(d<21&&zed.rcd<=0){enemyShot(zed);zed.rcd=zed.c.atk}}
      else{if(d>1.5)slide(p,nx*zed.sp*dt,nz*zed.sp*dt,.55);else if(zed.cd<=0){hitPlayer(zed.c.d);zed.cd=zed.c.atk}}
      if(zed.c.boss&&d<27&&zed.rcd<=0){enemyShot(zed);zed.rcd=1.7}zed.g.lookAt(player.pos.x,p.y,player.pos.z)}
    for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.t-=dt;s.m.position.addScaledVector(s.v,dt);if(dist(s.m.position,player.pos)<.8){hitPlayer(s.d);scene.remove(s.m);shots.splice(i,1)}else if(s.t<=0){scene.remove(s.m);shots.splice(i,1)}}
    for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.t-=dt;p.b+=dt*3;p.g.rotation.y+=dt*2;p.g.position.y=.7+Math.sin(p.b)*.15;if(dist(p.g.position,player.pos)<1.6){if(p.type==='hp')player.hp=Math.min(100,player.hp+28);else player.states.forEach((s,j)=>s.r=Math.min(W[j].res*2,s.r+Math.ceil(W[j].clip*.7)));scene.remove(p.g);pickups.splice(i,1);msg(p.type==='hp'?'체력 회복':'탄약 획득')}else if(p.t<=0){scene.remove(p.g);pickups.splice(i,1)}}
    if(!zombies.length&&nextWaveT>0){nextWaveT-=dt;if(nextWaveT<=0)startWave()}uiUpdate()
  }
  document.addEventListener('keydown',e=>{if(['KeyF','KeyR','KeyQ','KeyE','KeyP','Escape','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Digit1','Digit2','Digit3','Digit4','Digit5'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyF')fireHeld=true;if(e.code==='KeyR')reload();if(e.code==='KeyQ')select(player.idx-1);if(e.code==='KeyE')select(player.idx+1);if(/^Digit[1-5]$/.test(e.code))select(+e.code.slice(-1)-1);if((e.code==='KeyP'||e.code==='Escape')&&state==='playing')pause();else if((e.code==='KeyP'||e.code==='Escape')&&state==='paused')resume()});
  document.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyF')fireHeld=false});renderer.domElement.onclick=()=>{if(state==='playing'&&!mobile)renderer.domElement.requestPointerLock?.()};document.addEventListener('pointerlockchange',()=>locked=document.pointerLockElement===renderer.domElement);document.addEventListener('mousemove',e=>{if(!locked||state!=='playing')return;player.yaw-=e.movementX*.00255;player.pitch=clamp(player.pitch-e.movementY*.0021,-1.14,1.14)});
  let joyId=null,lookId=null,lx=0,ly=0;const joy=$('joystickBase'),knob=$('joystickKnob'),lookZone=$('lookZone'),fireBtn=$('fireBtn'),runBtn=$('sprintBtn');
  function resetJoy(){joyId=null;move.x=move.y=0;knob.style.transform='translate(0,0)'}
  joy.onpointerdown=e=>{joyId=e.pointerId;joy.setPointerCapture?.(e.pointerId);e.preventDefault()};joy.onpointermove=e=>{if(e.pointerId!==joyId)return;const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,max=r.width*.32,len=Math.hypot(dx,dy)||1,k=Math.min(1,max/len),x=dx*k,y=dy*k;move.x=x/max;move.y=y/max;knob.style.transform=`translate(${x}px,${y}px)`;e.preventDefault()};['pointerup','pointercancel','lostpointercapture'].forEach(v=>joy.addEventListener(v,resetJoy));
  lookZone.onpointerdown=e=>{if(state!=='playing')return;lookId=e.pointerId;lx=e.clientX;ly=e.clientY;lookZone.setPointerCapture?.(e.pointerId);e.preventDefault()};lookZone.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;player.yaw-=(e.clientX-lx)*.006;player.pitch=clamp(player.pitch-(e.clientY-ly)*.005,-1.1,1.1);lx=e.clientX;ly=e.clientY;e.preventDefault()});['pointerup','pointercancel','lostpointercapture'].forEach(v=>lookZone.addEventListener(v,e=>{if(e.pointerId===lookId)lookId=null}));
  fireBtn.addEventListener('pointerdown',e=>{fireHeld=true;fire();fireBtn.setPointerCapture?.(e.pointerId);e.preventDefault()});['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(v=>fireBtn.addEventListener(v,()=>fireHeld=false));$('reloadBtn').onpointerdown=e=>{reload();e.preventDefault()};runBtn.onpointerdown=e=>{running=true;runBtn.setPointerCapture?.(e.pointerId);e.preventDefault()};['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(v=>runBtn.addEventListener(v,()=>running=false));$('nextWeaponBtn').onpointerdown=e=>{select(player.idx+1);e.preventDefault()};$('pauseBtn').onpointerdown=e=>{pause();e.preventDefault()};
  $('fullscreenBtn').onpointerdown=async e=>{e.preventDefault();try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen?.({navigationUI:'hide'});try{await screen.orientation?.lock?.('landscape')}catch(_){}}else await document.exitFullscreen?.()}catch(_){msg('전체화면을 사용할 수 없습니다')}};
  function resetMobileInputs(){resetJoy();fireHeld=false;running=false;lookId=null}document.addEventListener('visibilitychange',()=>{if(document.hidden)resetMobileInputs()});addEventListener('blur',resetMobileInputs);
  $('startBtn').onclick=start;$('restartBtn').onclick=start;$('resumeBtn').onclick=resume;$('menuBtn').onclick=menu;$('pauseMenuBtn').onclick=menu;
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.35:2))});
  let last=performance.now();function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;if(state==='playing')update(dt);renderer.render(scene,camera);requestAnimationFrame(loop)}uiUpdate();requestAnimationFrame(loop);
  window.__ZOMBIE_GAME_INFO__={version:'4.0-mobile',attackKey:'F',weapons:W.map(x=>x.id),zombies:Object.keys(Z),mobile:true,mobileControls:'enhanced'};
})();
