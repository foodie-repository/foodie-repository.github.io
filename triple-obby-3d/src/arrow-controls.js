(() => {
  function normalizeYaw(yaw) {
    let value = Number.isFinite(yaw) ? yaw : 0;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }

  function stepArrowControls(input, yaw, dt, turnSpeed = 2.6) {
    const safeDt = Math.max(0, Number.isFinite(dt) ? dt : 0);
    const turn = Number(Boolean(input?.right)) - Number(Boolean(input?.left));
    const nextYaw = normalizeYaw(yaw + turn * turnSpeed * safeDt);
    const drive = Number(Boolean(input?.forward)) - Number(Boolean(input?.back));

    return Object.freeze({
      yaw: nextYaw,
      moveX: Math.sin(nextYaw) * drive,
      moveZ: Math.cos(nextYaw) * drive,
    });
  }

  globalThis.TripleObbyControls = Object.freeze({
    ...(globalThis.TripleObbyControls || {}),
    stepArrowControls,
  });
})();
