(() => {
  function normalizeYaw(yaw) {
    let value = Number.isFinite(yaw) ? yaw : 0;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }

  function relativeMove(input, yaw) {
    const drive = Number(Boolean(input?.forward)) - Number(Boolean(input?.back));
    const strafe = Number(Boolean(input?.right)) - Number(Boolean(input?.left));
    let moveX = Math.sin(yaw) * drive + Math.cos(yaw) * strafe;
    let moveZ = Math.cos(yaw) * drive - Math.sin(yaw) * strafe;
    const length = Math.hypot(moveX, moveZ);
    if (length > 1) {
      moveX /= length;
      moveZ /= length;
    }
    return { moveX, moveZ };
  }

  function stepArrowControls(input, yaw) {
    const nextYaw = normalizeYaw(yaw);
    const move = relativeMove(input, nextYaw);
    return Object.freeze({
      yaw: nextYaw,
      moveX: move.moveX,
      moveZ: move.moveZ,
    });
  }

  function modelYawForFacing(yaw) {
    return normalizeYaw((Number.isFinite(yaw) ? yaw : 0) + Math.PI);
  }

  globalThis.TripleObbyControls = Object.freeze({
    ...(globalThis.TripleObbyControls || {}),
    stepArrowControls,
    modelYawForFacing,
  });
})();