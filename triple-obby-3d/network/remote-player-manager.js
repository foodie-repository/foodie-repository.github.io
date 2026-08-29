(() => {
  class RemotePlayerManager {
    constructor(THREE, root) {
      this.THREE = THREE;
      this.root = root;
      this.players = new Map();
      this.members = new Map();
    }

    colorFromMeta(meta) {
      if (meta?.avatar_color?.startsWith('hsl(')) return new this.THREE.Color(meta.avatar_color);
      let hash = 0;
      const seed = String(meta?.session_id || meta?.sessionId || 'player');
      for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
      return new this.THREE.Color().setHSL((hash % 360) / 360, 0.72, 0.58);
    }

    makeLabel(text) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(4,7,18,.72)';
      ctx.roundRect(8, 8, 240, 48, 18);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 25px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(text || 'Player').slice(0, 12), 128, 32);
      const texture = new this.THREE.CanvasTexture(canvas);
      texture.minFilter = this.THREE.LinearFilter;
      const material = new this.THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new this.THREE.Sprite(material);
      sprite.scale.set(3.2, 0.8, 1);
      sprite.position.y = 3.1;
      return sprite;
    }

    createAvatar(meta) {
      const color = this.colorFromMeta(meta);
      const group = new this.THREE.Group();
      const bodyMat = new this.THREE.MeshStandardMaterial({ color, roughness: 0.5 });
      const skin = new this.THREE.MeshStandardMaterial({ color: 0xffddb9, roughness: 0.65 });
      const dark = new this.THREE.MeshStandardMaterial({ color: 0x241d27, roughness: 0.8 });
      const body = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.9, 0.95, 0.6), bodyMat);
      body.position.y = 1.05;
      const head = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.72, 0.52, 0.62), skin);
      head.position.y = 1.85;
      const hair = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.74, 0.2, 0.64), dark);
      hair.position.y = 2.08;
      const leg1 = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.24, 0.8, 0.24), bodyMat.clone());
      const leg2 = leg1.clone();
      leg1.position.set(-0.18, 0.38, 0);
      leg2.position.set(0.18, 0.38, 0);
      for (const mesh of [body, head, hair, leg1, leg2]) mesh.castShadow = true;
      const label = this.makeLabel(meta?.nickname || 'Player');
      group.add(body, head, hair, leg1, leg2, label);
      group.userData.legs = [leg1, leg2];
      group.userData.samples = [];
      group.userData.lastPacketAt = 0;
      group.userData.animation = 'idle';
      this.root.add(group);
      return group;
    }

    syncMembers(members, localSessionId) {
      const remoteIds = new Set();
      for (const member of members || []) {
        const id = member.session_id || member.sessionId;
        if (!id || id === localSessionId) continue;
        remoteIds.add(id);
        this.members.set(id, member);
        if (!this.players.has(id)) this.players.set(id, this.createAvatar(member));
      }
      for (const [id, group] of this.players) {
        if (!remoteIds.has(id)) {
          this.root.remove(group);
          this.players.delete(id);
          this.members.delete(id);
        }
      }
    }

    pushState(message) {
      const id = message?.sessionId;
      if (!id) return;
      let group = this.players.get(id);
      if (!group) {
        const meta = this.members.get(id) || { session_id: id, nickname: 'Player' };
        group = this.createAvatar(meta);
        this.players.set(id, group);
      }
      const sample = {
        t: Number(message.sentAt) || Date.now(),
        position: [...message.position],
        yaw: Number(message.yaw) || 0,
        animation: message.animation || 'idle',
      };
      const samples = group.userData.samples;
      samples.push(sample);
      samples.sort((a, b) => a.t - b.t);
      if (samples.length > 4) samples.splice(0, samples.length - 4);
      group.userData.lastPacketAt = performance.now();
      group.userData.animation = sample.animation;
    }

    lerpAngle(a, b, t) {
      let delta = b - a;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      return a + delta * t;
    }

    update(nowMs) {
      const renderAt = Date.now() - 100;
      for (const group of this.players.values()) {
        const samples = group.userData.samples;
        if (samples.length === 0) continue;
        let from = samples[0];
        let to = samples.at(-1);
        for (let i = 0; i < samples.length - 1; i += 1) {
          if (renderAt >= samples[i].t && renderAt <= samples[i + 1].t) {
            from = samples[i];
            to = samples[i + 1];
            break;
          }
        }
        const span = Math.max(1, to.t - from.t);
        const t = Math.max(0, Math.min(1, (renderAt - from.t) / span));
        group.position.set(
          from.position[0] + (to.position[0] - from.position[0]) * t,
          from.position[1] + (to.position[1] - from.position[1]) * t,
          from.position[2] + (to.position[2] - from.position[2]) * t,
        );
        group.rotation.y = this.lerpAngle(from.yaw, to.yaw, t);
        const silentFor = nowMs - group.userData.lastPacketAt;
        group.visible = silentFor < 5000;
        const moving = group.userData.animation === 'run';
        const swing = nowMs * 0.012;
        const [leg1, leg2] = group.userData.legs;
        leg1.rotation.x = moving ? Math.sin(swing) * 0.5 : 0;
        leg2.rotation.x = moving ? -Math.sin(swing) * 0.5 : 0;
      }
    }

    clear() {
      for (const group of this.players.values()) this.root.remove(group);
      this.players.clear();
      this.members.clear();
    }
  }

  window.TripleObbyOnline = window.TripleObbyOnline || {};
  window.TripleObbyOnline.RemotePlayerManager = RemotePlayerManager;
})();
