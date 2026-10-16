(() => {
  function normalizeYaw(yaw) {
    let value = Number.isFinite(yaw) ? yaw : 0;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }

  function normalizeJoystickVector(dx, dy, radius = 58) {
    const safeRadius = Math.max(1, Number.isFinite(radius) ? radius : 58);
    let x = (Number.isFinite(dx) ? dx : 0) / safeRadius;
    let y = (Number.isFinite(dy) ? dy : 0) / safeRadius;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return Object.freeze({ x, y });
  }

  function stepJoystickControls(input, yaw) {
    const nextYaw = normalizeYaw(yaw);
    if (!input?.active) {
      return Object.freeze({ yaw: nextYaw, drive: 0, moveX: 0, moveZ: 0 });
    }

    let strafe = Math.max(-1, Math.min(1, Number(input?.x) || 0));
    let drive = -(Math.max(-1, Math.min(1, Number(input?.y) || 0)));
    if (Math.abs(strafe) < 0.08) strafe = 0;
    if (Math.abs(drive) < 0.08) drive = 0;

    let moveX = Math.sin(nextYaw) * drive + Math.cos(nextYaw) * strafe;
    let moveZ = Math.cos(nextYaw) * drive - Math.sin(nextYaw) * strafe;
    const length = Math.hypot(moveX, moveZ);
    if (length > 1) {
      moveX /= length;
      moveZ /= length;
    }

    return Object.freeze({ yaw: nextYaw, drive, moveX, moveZ });
  }

  globalThis.TripleObbyControls = Object.freeze({
    ...(globalThis.TripleObbyControls || {}),
    normalizeJoystickVector,
    stepJoystickControls,
  });
})();