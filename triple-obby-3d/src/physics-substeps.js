(() => {
  function finite(value) {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function computePhysicsSubsteps(velocity, dt, maxDistance = 0.22, maxSteps = 24) {
    const safeDt = Math.max(0, finite(dt));
    const safeDistance = Math.max(0.05, finite(maxDistance) || 0.22);
    const vx = Math.abs(finite(velocity?.x));
    const vy = Math.abs(finite(velocity?.y));
    const vz = Math.abs(finite(velocity?.z));
    const maxTravel = Math.max(vx, vy, vz) * safeDt;
    return Math.max(1, Math.min(maxSteps, Math.ceil(maxTravel / safeDistance)));
  }

  globalThis.TripleObbyPhysics = Object.freeze({
    ...(globalThis.TripleObbyPhysics || {}),
    computePhysicsSubsteps,
  });
})();