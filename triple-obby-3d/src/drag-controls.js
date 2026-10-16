(() => {
  function normalizeYaw(yaw) {
    let value = Number.isFinite(yaw) ? yaw : 0;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }

  function applyDragYaw(yaw, deltaX, sensitivity = 0.004) {
    const safeDelta = Number.isFinite(deltaX) ? deltaX : 0;
    const safeSensitivity = Number.isFinite(sensitivity) ? sensitivity : 0.004;
    return normalizeYaw(yaw - safeDelta * safeSensitivity);
  }

  globalThis.TripleObbyControls = Object.freeze({
    ...(globalThis.TripleObbyControls || {}),
    applyDragYaw,
  });
})();