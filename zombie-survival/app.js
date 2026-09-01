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
    {id:'pistol',n:'권총',d:34,rate:.24,clip:12,res:84,p:1,spread:.006,range:85,reload:1.05,c:0x63eaff,recoil:.06},
    {id:'smg',n:'기관단총',d:16,rate:.08,clip:30,res:180,p:1,spread:.035,range:64,reload:1.35,c:0xffd45d,recoil:.035},
    {id:'shotgun',n:'산탄총',d:15,rate:.68,clip:6,res:48,p:8,spread:.11,range:44,reload:1.55,c:0xff8c63,recoil:.14},
    {id:'rifle',n:'돌격소총',d:27,rate:.14,clip:24,res:144,p:1,spread:.017,range:98,reload:1.45,c:0x85ff8b,recoil:.055},
    {id:'sniper',n:'저격총',d:118,rate:1.0,clip:5,res:30,p:1,spread:.002,range:150,reload:1.9,c:0xc891ff,recoil:.19}
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
  const bestKey='neon_deadline_3d_best_v5';
  let best=Number(localStorage.getItem(bestKey)||0);

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x06101a);
  scene.fog=new THREE.FogExp2(0x07111b,.018);
  const camera=new THREE.PerspectiveCamera(74,innerWidth/innerHeight,.1,180);
  camera.rotation.order='YXZ';
  scene.add(camera);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.35:2));
  renderer.shadowMap.enabled=!mobile;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  ui.game.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x9fc8ff,0x11151d,1.3));
  const sun=new THREE.DirectionalLight(0xd6e7ff,1.25);
  sun.position.set(15,26,10); sun.castShadow=!mobile; scene.add(sun);
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

  const player={
    pos:new THREE.Vector3(0,1.72,28),yaw:Math.PI,pitch:-.05,hp:100,max:100,speed:8.4,sprint:1.55,
    idx:0,cool:0,reload:0,reloadIdx:-1,inv:0,states:W.map(w=>({a:w.clip,r:w.res})),cameraKick:0
  };
  const keys=new Set(), move={x:0,y:0};
  let running=false,fireHeld=false,state='menu',locked=false,wave=0,score=0,kills=0,elapsed=0,nextWaveT=0;
  const zombies=[],shots=[],pickups=[];
  const ray=new THREE.Raycaster();

  const weaponRig=new THREE.Group();
  weaponRig.position.set(.34,-.30,-.70);
  camera.add(weaponRig);
  const muzzleLight=new THREE.PointLight(0xffd47b,0,7,2);
  weaponRig.add(muzzleLight);
  const parts={body:null,slide:null,mag:null,pump:null,bolt:null,scope:null,muzzle:null};
  const anim={fire:0,action:0,flash:0,reloadTotal:0};

  function mat(color,metal=.55,rough=.34){return new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough});}
  function addPart(geo,material,key,x,y,z,rx=0,ry=0,rz=0){
    const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);
    m.userData.bp=m.position.clone();m.userData.br=m.rotation.clone();weaponRig.add(m);if(key)parts[key]=m;return m;
  }
  function resetPartRefs(){for(const k of Object.keys(parts))parts[k]=null;}
  function buildGun(){
    while(weaponRig.children.length>1)weaponRig.remove(weaponRig.children[1]);
    resetPartRefs();
    const w=W[player.idx], main=mat(w.c), dark=mat(0x202736,.72,.28), grip=mat(0x141a23,.15,.78), glow=new THREE.MeshBasicMaterial({color:w.c});
    let muzzleZ=-1;
    if(w.id==='pistol'){
      addPart(new THREE.BoxGeometry(.18,.14,.54),main,'body',0,0,-.32);
      addPart(new THREE.BoxGeometry(.16,.07,.34),dark,'slide',0,.065,-.39);
      addPart(new THREE.CylinderGeometry(.03,.038,.26,10),dark,null,0,.02,-.66,Math.PI/2);
      addPart(new THREE.BoxGeometry(.09,.20,.13),dark,'mag',0,-.18,-.24);
      addPart(new THREE.BoxGeometry(.12,.30,.14),grip,null,0,-.19,-.23,-.28);
      addPart(new THREE.BoxGeometry(.06,.05,.14),glow,null,0,.11,-.28);muzzleZ=-.81;
    }else if(w.id==='smg'){
      addPart(new THREE.BoxGeometry(.19,.17,.72),main,'body',0,0,-.42);
      addPart(new THREE.BoxGeometry(.14,.06,.30),dark,'slide',0,.075,-.38);
      addPart(new THREE.CylinderGeometry(.03,.04,.42,10),dark,null,0,.015,-.95,Math.PI/2);
      addPart(new THREE.BoxGeometry(.09,.34,.18),dark,'mag',0,-.17,-.46,.08);
      addPart(new THREE.BoxGeometry(.11,.28,.16),grip,null,0,-.20,-.25,-.28);
      addPart(new THREE.BoxGeometry(.14,.11,.16),glow,null,0,.10,-.18);muzzleZ=-1.18;
    }else if(w.id==='shotgun'){
      addPart(new THREE.BoxGeometry(.18,.16,.74),main,'body',0,0,-.40);
      addPart(new THREE.CylinderGeometry(.032,.042,.58,10),dark,null,0,.04,-.99,Math.PI/2);
      addPart(new THREE.CylinderGeometry(.028,.034,.46,10),dark,null,0,-.02,-.93,Math.PI/2);
      addPart(new THREE.BoxGeometry(.16,.09,.28),dark,'pump',0,-.01,-.77);
      addPart(new THREE.BoxGeometry(.12,.30,.14),grip,null,0,-.19,-.18,-.27);
      addPart(new THREE.BoxGeometry(.18,.28,.14),grip,null,0,-.07,.00,.68);muzzleZ=-1.31;
    }else if(w.id==='rifle'){
      addPart(new THREE.BoxGeometry(.20,.17,.88),main,'body',0,0,-.50);
      addPart(new THREE.BoxGeometry(.15,.06,.34),dark,'slide',0,.075,-.44);
      addPart(new THREE.CylinderGeometry(.03,.04,.54,10),dark,null,0,.015,-1.07,Math.PI/2);
      addPart(new THREE.BoxGeometry(.12,.33,.20),dark,'mag',0,-.16,-.52,.10);
      addPart(new THREE.BoxGeometry(.12,.31,.15),grip,null,0,-.20,-.27,-.27);
      addPart(new THREE.BoxGeometry(.18,.08,.22),glow,null,0,.10,-.25);muzzleZ=-1.34;
    }else{
      addPart(new THREE.BoxGeometry(.18,.16,1.02),main,'body',0,0,-.56);
      addPart(new THREE.CylinderGeometry(.032,.042,.82,12),dark,null,0,.015,-1.28,Math.PI/2);
      addPart(new THREE.BoxGeometry(.12,.07,.22),dark,'bolt',.045,.085,-.42);
      addPart(new THREE.BoxGeometry(.10,.28,.16),dark,'mag',0,-.17,-.56);
      addPart(new THREE.BoxGeometry(.12,.30,.14),grip,null,0,-.20,-.28,-.27);
      addPart(new THREE.BoxGeometry(.19,.29,.15),grip,null,0,-.08,.02,.72);
      addPart(new THREE.CylinderGeometry(.06,.06,.34,16),dark,'scope',0,.14,-.53,Math.PI/2);muzzleZ=-1.69;
    }
    muzzleLight.position.set(0,.01,muzzleZ);
    parts.muzzle=addPart(new THREE.SphereGeometry(.085,8,8),new THREE.MeshBasicMaterial({color:0xfff0a2,transparent:true,opacity:0}),null,0,.01,muzzleZ);
  }

  function resetPart(m){if(!m)return; m.position.copy(m.userData.bp);m.rotation.set(m.userData.br.x,m.userData.br.y,m.userData.br.z);}
  function updateWeaponAnim(dt){
    const w=W[player.idx];
    anim.fire=Math.max(0,anim.fire-dt*12);
    anim.action=Math.max(0,anim.action-dt*(w.id==='shotgun'||w.id==='sniper'?2.2:8));
    anim.flash=Math.max(0,anim.flash-dt*22);
    player.cameraKick=Math.max(0,player.cameraKick-dt*2.2);
    const fp=anim.fire>0?Math.sin((1-anim.fire)*Math.PI):0;
    const ap=anim.action>0?Math.sin((1-anim.action)*Math.PI):0;
    const rp=player.reload>0&&anim.reloadTotal>0?1-player.reload/anim.reloadTotal:0;
    const ra=player.reload>0?Math.sin(Math.max(0,Math.min(1,rp))*Math.PI):0;
    const mp=player.reload>0?Math.max(0,Math.sin(Math.max(0,Math.min(1,(rp-.10)/.80))*Math.PI)):0;

    weaponRig.position.set(.34-ra*.06,-.30+Math.sin(elapsed*7)*.008+ra*.09,-.70+fp*.07+player.cameraKick*.18+ra*.07);
    weaponRig.rotation.set(-.04-fp*.18-player.cameraKick*1.15+ra*.72,-.05+ra*.24,-.04-ra*.30);

    resetPart(parts.body);resetPart(parts.slide);resetPart(parts.mag);resetPart(parts.pump);resetPart(parts.bolt);resetPart(parts.scope);resetPart(parts.muzzle);
    if(parts.slide)parts.slide.position.z+=fp*(w.id==='pistol'?.10:.055);
    if(parts.pump&&w.id==='shotgun')parts.pump.position.z+=ap*.24;
    if(parts.bolt&&w.id==='sniper'){parts.bolt.position.z+=ap*.19;parts.bolt.position.y+=ap*.02;}
    if(parts.mag&&player.reload>0){parts.mag.position.y-=mp*.29;parts.mag.position.z+=mp*.08;parts.mag.rotation.x-=mp*.9;}
    if(parts.scope&&w.id==='sniper')parts.scope.rotation.x+=fp*.035;
    if(parts.body&&w.id==='shotgun')parts.body.rotation.x-=ap*.04;
    if(parts.muzzle){parts.muzzle.material.opacity=Math.min(1,anim.flash);parts.muzzle.scale.setScalar(1+anim.flash*.85);}
    muzzleLight.intensity=anim.flash*6;
  }

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

  function select(i){player.idx=(i+W.length)%W.length;player.reload=0;player.reloadIdx=-1;anim.reloadTotal=0;anim.fire=anim.action=anim.flash=0;buildGun();uiUpdate()}
  function reload(){
    const w=W[player.idx],s=player.states[player.idx];if(player.reload||s.a===w.clip||s.r<=0)return;
    player.reload=w.reload;player.reloadIdx=player.idx;anim.reloadTotal=w.reload;msg('재장전 중...');
  }
  function finishReload(){
    const i=player.reloadIdx;if(i<0)return;const w=W[i],s=player.states[i],n=Math.min(w.clip-s.a,s.r);s.a+=n;s.r-=n;player.reloadIdx=-1;anim.reloadTotal=0;msg('재장전 완료');
  }
  function fire(){
    if(state!=='playing'||player.cool||player.reload)return;const w=W[player.idx],s=player.states[player.idx];if(s.a<=0){reload();return}
    s.a--;player.cool=w.rate;anim.fire=1;anim.action=1;anim.flash=1;player.cameraKick=Math.min(.22,player.cameraKick+w.recoil);
    for(let p=0;p<w.p;p++){
      const dir=new THREE.Vector3();camera.getWorldDirection(dir);dir.x+=(Math.random()-.5)*w.spread;dir.y+=(Math.random()-.5)*w.spread;dir.z+=(Math.random()-.5)*w.spread;dir.normalize();ray.set(camera.position,dir);ray.far=w.range;
      const objs=[];zombies.forEach(z=>z.g.traverse(o=>{if(o.isMesh)objs.push(o)}));const h=ray.intersectObjects(objs,false)[0];if(h?.object?.userData?.z){const z=h.object.userData.z;z.hp-=w.d;ui.cross.classList.add('hit');setTimeout(()=>ui.cross.classList.remove('hit'),70);if(z.hp<=0)removeZombie(z)}
    }
    uiUpdate();
  }

  function gameOver(){state='gameover';best=Math.max(best,score);localStorage.setItem(bestKey,best);ui.overText.innerHTML=`점수 <b>${score}</b> · 처치 <b>${kills}</b> · 웨이브 <b>${wave}</b> · 생존 <b>${elapsed.toFixed(1)}초</b>`;ui.over.style.display='flex';document.exitPointerLock?.();resetMobileInputs()}
  function start(){
    zombies.splice(0).forEach(z=>scene.remove(z.g));shots.splice(0).forEach(s=>scene.remove(s.m));pickups.splice(0).forEach(p=>scene.remove(p.g));
    player.pos.set(0,1.72,28);player.yaw=Math.PI;player.pitch=-.05;player.hp=100;player.idx=0;player.cool=player.reload=player.inv=player.cameraKick=0;player.reloadIdx=-1;player.states=W.map(w=>({a:w.clip,r:w.res}));
    anim.fire=anim.action=anim.flash=anim.reloadTotal=0;wave=score=kills=0;elapsed=0;nextWaveT=0;state='playing';ui.start.style.display=ui.over.style.display=ui.pause.style.display='none';buildGun();startWave();if(!mobile)renderer.domElement.requestPointerLock?.();uiUpdate();
  }
  function pause(){if(state!=='playing')return;state='paused';ui.pause.style.display='flex';document.exitPointerLock?.();resetMobileInputs()}
  function resume(){if(state!=='paused')return;state='playing';ui.pause.style.display='none';if(!mobile)renderer.domElement.requestPointerLock?.()}
  function menu(){state='menu';ui.pause.style.display=ui.over.style.display='none';ui.start.style.display='flex';resetMobileInputs()}
  function uiUpdate(){const w=W[player.idx],s=player.states[player.idx];ui.wave.textContent=wave;ui.left.textContent=zombies.length;ui.score.textContent=score;ui.kills.textContent=kills;ui.hpText.textContent=`${Math.ceil(player.hp)} / ${player.max}`;ui.hpBar.style.width=`${player.hp}%`;ui.weaponName.textContent=w.n;ui.weaponName.style.color=`#${w.c.toString(16).padStart(6,'0')}`;ui.ammo.textContent=`${s.a} / ${s.r}`;ui.time.textContent=`${elapsed.toFixed(1)}초`;ui.best.textContent=`${best}점`;[...ui.weaponBar.children].forEach((b,i)=>{b.classList.toggle('active',i===player.idx);const e=b.querySelector('em');if(e)e.textContent=`${player.states[i].a}/${player.states[i].r}`})}

  W.forEach((w,i)=>{const b=document.createElement('button');b.className='weaponSlot';b.innerHTML=`<span>${i+1}</span><b>${w.n}</b><em>${w.clip}/${w.res}</em>`;b.onpointerdown=e=>{e.preventDefault();select(i)};ui.weaponBar.appendChild(b)});
  if(mobile)$('mobileUI').appendChild(ui.weaponBar);

  function update(dt){
    elapsed+=dt;player.cool=Math.max(0,player.cool-dt);player.inv=Math.max(0,player.inv-dt);const old=player.reload;player.reload=Math.max(0,player.reload-dt);if(old>0&&!player.reload)finishReload();
    let x=move.x,z=move.y;if(keys.has('KeyW'))z--;if(keys.has('KeyS'))z++;if(keys.has('KeyA'))x--;if(keys.has('KeyD'))x++;
    if(x||z){const l=Math.hypot(x,z)||1;x/=l;z/=l;const sn=Math.sin(player.yaw),cs=Math.cos(player.yaw),spd=player.speed*((running||keys.has('ShiftLeft')||keys.has('ShiftRight'))?player.sprint:1);slide(player.pos,(x*cs-z*sn)*spd*dt,(z*cs+x*sn)*spd*dt)}
    updateWeaponAnim(dt);
    camera.position.copy(player.pos);camera.rotation.y=player.yaw;camera.rotation.x=player.pitch-player.cameraKick;if(fireHeld)fire();
    for(const zed of [...zombies]){
      const p=zed.g.position,dx=player.pos.x-p.x,dz=player.pos.z-p.z,d=Math.hypot(dx,dz),nx=dx/(d||1),nz=dz/(d||1);zed.cd-=dt;zed.rcd-=dt;
      if(zed.c.boom&&d<3){removeZombie(zed);hitPlayer(zed.c.d);continue}
      if(zed.c.ranged&&!zed.c.boss){if(d>13)slide(p,nx*zed.sp*dt,nz*zed.sp*dt,.5);else if(d<8)slide(p,-nx*zed.sp*.7*dt,-nz*zed.sp*.7*dt,.5);if(d<21&&zed.rcd<=0){enemyShot(zed);zed.rcd=zed.c.atk}}
      else{if(d>1.5)slide(p,nx*zed.sp*dt,nz*zed.sp*dt,.55);else if(zed.cd<=0){hitPlayer(zed.c.d);zed.cd=zed.c.atk}}
      if(zed.c.boss&&d<27&&zed.rcd<=0){enemyShot(zed);zed.rcd=1.7}zed.g.lookAt(player.pos.x,p.y,player.pos.z)
    }
    for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.t-=dt;s.m.position.addScaledVector(s.v,dt);if(dist(s.m.position,player.pos)<.8){hitPlayer(s.d);scene.remove(s.m);shots.splice(i,1)}else if(s.t<=0){scene.remove(s.m);shots.splice(i,1)}}
    for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.t-=dt;p.b+=dt*3;p.g.rotation.y+=dt*2;p.g.position.y=.7+Math.sin(p.b)*.15;if(dist(p.g.position,player.pos)<1.6){if(p.type==='hp')player.hp=Math.min(100,player.hp+28);else player.states.forEach((s,j)=>s.r=Math.min(W[j].res*2,s.r+Math.ceil(W[j].clip*.7)));scene.remove(p.g);pickups.splice(i,1);msg(p.type==='hp'?'체력 회복':'탄약 획득')}else if(p.t<=0){scene.remove(p.g);pickups.splice(i,1)}}
    if(!zombies.length&&nextWaveT>0){nextWaveT-=dt;if(nextWaveT<=0)startWave()}uiUpdate();
  }

  document.addEventListener('keydown',e=>{if(['KeyF','KeyR','KeyQ','KeyE','KeyP','Escape','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Digit1','Digit2','Digit3','Digit4','Digit5'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyF')fireHeld=true;if(e.code==='KeyR')reload();if(e.code==='KeyQ')select(player.idx-1);if(e.code==='KeyE')select(player.idx+1);if(/^Digit[1-5]$/.test(e.code))select(+e.code.slice(-1)-1);if((e.code==='KeyP'||e.code==='Escape')&&state==='playing')pause();else if((e.code==='KeyP'||e.code==='Escape')&&state==='paused')resume()});
  document.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyF')fireHeld=false});
  renderer.domElement.onclick=()=>{if(state==='playing'&&!mobile)renderer.domElement.requestPointerLock?.()};
  document.addEventListener('pointerlockchange',()=>locked=document.pointerLockElement===renderer.domElement);
  document.addEventListener('mousemove',e=>{if(!locked||state!=='playing')return;player.yaw-=e.movementX*.00255;player.pitch=clamp(player.pitch-e.movementY*.0021,-1.14,1.14)});

  let joyId=null,lookId=null,lx=0,ly=0;const joy=$('joystickBase'),knob=$('joystickKnob'),lookZone=$('lookZone'),fireBtn=$('fireBtn'),runBtn=$('sprintBtn');
  function resetJoy(){joyId=null;move.x=move.y=0;knob.style.transform='translate(0,0)'}
  joy.onpointerdown=e=>{joyId=e.pointerId;joy.setPointerCapture?.(e.pointerId);e.preventDefault()};
  joy.onpointermove=e=>{if(e.pointerId!==joyId)return;const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,max=r.width*.32,len=Math.hypot(dx,dy)||1,k=Math.min(1,max/len),x=dx*k,y=dy*k;move.x=x/max;move.y=y/max;knob.style.transform=`translate(${x}px,${y}px)`;e.preventDefault()};
  ['pointerup','pointercancel','lostpointercapture'].forEach(v=>joy.addEventListener(v,resetJoy));
  lookZone.onpointerdown=e=>{if(state!=='playing')return;lookId=e.pointerId;lx=e.clientX;ly=e.clientY;lookZone.setPointerCapture?.(e.pointerId);e.preventDefault()};
  lookZone.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;player.yaw-=(e.clientX-lx)*.006;player.pitch=clamp(player.pitch-(e.clientY-ly)*.005,-1.1,1.1);lx=e.clientX;ly=e.clientY;e.preventDefault()});
  ['pointerup','pointercancel','lostpointercapture'].forEach(v=>lookZone.addEventListener(v,e=>{if(e.pointerId===lookId)lookId=null}));
  fireBtn.addEventListener('pointerdown',e=>{fireHeld=true;fire();fireBtn.setPointerCapture?.(e.pointerId);e.preventDefault()});
  ['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(v=>fireBtn.addEventListener(v,()=>fireHeld=false));
  $('reloadBtn').onpointerdown=e=>{reload();e.preventDefault()};
  runBtn.onpointerdown=e=>{running=true;runBtn.setPointerCapture?.(e.pointerId);e.preventDefault()};
  ['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(v=>runBtn.addEventListener(v,()=>running=false));
  $('nextWeaponBtn').onpointerdown=e=>{select(player.idx+1);e.preventDefault()};
  $('pauseBtn').onpointerdown=e=>{pause();e.preventDefault()};
  $('fullscreenBtn').onpointerdown=async e=>{e.preventDefault();try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen?.({navigationUI:'hide'});try{await screen.orientation?.lock?.('landscape')}catch(_){}}else await document.exitFullscreen?.()}catch(_){msg('전체화면을 사용할 수 없습니다')}};
  function resetMobileInputs(){resetJoy();fireHeld=false;running=false;lookId=null}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetMobileInputs()});addEventListener('blur',resetMobileInputs);
  $('startBtn').onclick=start;$('restartBtn').onclick=start;$('resumeBtn').onclick=resume;$('menuBtn').onclick=menu;$('pauseMenuBtn').onclick=menu;
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.35:2))});

  let last=performance.now();
  function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;if(state==='playing')update(dt);else updateWeaponAnim(dt);renderer.render(scene,camera);requestAnimationFrame(loop)}
  buildGun();uiUpdate();requestAnimationFrame(loop);
  window.__ZOMBIE_GAME_INFO__={version:'5.0-weapon-motion',attackKey:'F',weapons:W.map(x=>x.id),zombies:Object.keys(Z),mobile:true,mobileControls:'enhanced',fireMotion:true,reloadMotion:true};
})();
