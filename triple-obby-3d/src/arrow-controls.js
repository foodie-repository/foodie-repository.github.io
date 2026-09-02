(() => {
  function normalizeYaw(yaw) {
    let value = Number.isFinite(yaw) ? yaw : 0;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }

  function stepArrowControls(input, yaw, dt, turnSpeed = 2.6) {
    const safeDt = Math.max(0, Number.isFinite(dt) ? dt : 0);
    const turn = Number(Boolean(input?.left)) - Number(Boolean(input?.right));
    const nextYaw = normalizeYaw(yaw + turn * turnSpeed * safeDt);
    const drive = Number(Boolean(input?.forward)) - Number(Boolean(input?.back));

    return Object.freeze({
      yaw: nextYaw,
      moveX: Math.sin(nextYaw) * drive,
      moveZ: Math.cos(nextYaw) * drive,
    });
  }

  // Three.js avatars are modeled with their visual front toward local -Z.
  // Gameplay yaw uses +Z as logical forward, so rendering needs a 180° offset.
  function modelYawForFacing(yaw) {
    return normalizeYaw((Number.isFinite(yaw) ? yaw : 0) + Math.PI);
  }

  globalThis.TripleObbyControls = Object.freeze({
    ...(globalThis.TripleObbyControls || {}),
    stepArrowControls,
    modelYawForFacing,
  });
})();