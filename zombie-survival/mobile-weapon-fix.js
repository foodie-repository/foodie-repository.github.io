(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.__WEAPON_VIEWPORT_FIX__ = api;
    if (root.THREE) api.install(root.THREE, root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  function adjustWeaponPosition(x,y,z,width,height,coarse){
    if (!coarse) return {x,y,z};
    const aspect = Math.max(0.1, width / Math.max(1,height));
    if (aspect < 0.8) {
      return {x:x*0.40, y:y+0.035, z:z-0.18};
    }
    return {x:x*0.72, y:y+0.015, z:z-0.04};
  }

  function install(THREE, root){
    if (!THREE || !THREE.Object3D || THREE.Object3D.prototype.__weaponViewportFixInstalled) return;
    const proto = THREE.Object3D.prototype;
    const originalAdd = proto.add;
    proto.__weaponViewportFixInstalled = true;
    proto.add = function(){
      for (let i=0;i<arguments.length;i++) {
        const child = arguments[i];
        if (!this.isCamera || !child || !child.isGroup || child.userData.__weaponViewportFixed) continue;
        const px = child.position && child.position.x;
        const py = child.position && child.position.y;
        const pz = child.position && child.position.z;
        const looksLikeWeaponRig = Math.abs(px-.34)<.08 && Math.abs(py+.30)<.10 && Math.abs(pz+.70)<.16;
        if (!looksLikeWeaponRig) continue;
        const vector = child.position;
        const originalSet = vector.set.bind(vector);
        const coarse = !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in root);
        vector.set = function(x,y,z){
          const p = adjustWeaponPosition(x,y,z,root.innerWidth||390,root.innerHeight||844,coarse);
          return originalSet(p.x,p.y,p.z);
        };
        const adjusted = adjustWeaponPosition(px,py,pz,root.innerWidth||390,root.innerHeight||844,coarse);
        originalSet(adjusted.x,adjusted.y,adjusted.z);
        child.userData.__weaponViewportFixed = true;
      }
      return originalAdd.apply(this, arguments);
    };
  }
  return {adjustWeaponPosition, install};
});
