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

  function stepJoystickControls(input, yaw, dt, turnSpeed = 2.6) {
    const active = Boolean(input?.active);
    if (!active) {
      return Object.freeze({ yaw: normalizeYaw(yaw), drive: 0, moveX: 0, moveZ: 0 });
    }

    const x = Math.max(-1, Math.min(1, Number(input?.x) || 0));
    const y = Math.max(-1, Math.min(1, Number(input?.y) || 0));
    const safeDt = Math.max(0, Number.isFinite(dt) ? dt : 0);
    const nextYaw = normalizeYaw(yaw - x * turnSpeed * safeDt);
    const drive = Math.abs(y) < 0.08 ? 0 : -y;

    return Object.freeze({
      yaw: nextYaw,
      drive,
      moveX: Math.sin(nextYaw) * drive,
      moveZ: Math.cos(nextYaw) * drive,
    });
  }

  globalThis.TripleObbyControls = Object.freeze({
    ...(globalThis.TripleObbyControls || {}),
    normalizeJoystickVector,
    stepJoystickControls,
  });
})();