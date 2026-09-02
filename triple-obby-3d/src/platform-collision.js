(() => {
  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function resultFrom(nextPos, velocityY) {
    return {
      x: finite(nextPos?.x),
      y: finite(nextPos?.y),
      z: finite(nextPos?.z),
      velocityY: finite(velocityY),
      grounded: false,
      hitTop: false,
      hitBottom: false,
      blockedX: false,
      blockedZ: false,
    };
  }

  function resolveSolidPlatformCollision(prevPos, nextPos, platform, options = {}) {
    const radius = Math.max(0, finite(options.radius, 0.38));
    const height = Math.max(0.01, finite(options.height, 1.8));
    const result = resultFrom(nextPos, options.velocityY);

    if (!platform || platform.active === false) return Object.freeze(result);

    const x = finite(platform.x);
    const y = finite(platform.y);
    const z = finite(platform.z);
    const w = Math.max(0.01, finite(platform.w, 1));
    const h = Math.max(0.01, finite(platform.h, 1));
    const d = Math.max(0.01, finite(platform.d, 1));
    const minX = x - w / 2;
    const maxX = x + w / 2;
    const minY = y - h / 2;
    const maxY = y + h / 2;
    const minZ = z - d / 2;
    const maxZ = z + d / 2;

    const overlapsXZ = result.x + radius > minX && result.x - radius < maxX
      && result.z + radius > minZ && result.z - radius < maxZ;

    if (overlapsXZ) {
      const prevBottom = finite(prevPos?.y);
      const prevTop = prevBottom + height;
      const nextBottom = result.y;
      const nextTop = result.y + height;

      if (result.velocityY <= 0 && prevBottom >= maxY && nextBottom <= maxY) {
        result.y = maxY;
        result.velocityY = 0;
        result.grounded = true;
        result.hitTop = true;
        return Object.freeze(result);
      }

      if (result.velocityY > 0 && prevTop <= minY && nextTop >= minY) {
        result.y = minY - height;
        result.velocityY = 0;
        result.hitBottom = true;
        return Object.freeze(result);
      }
    }

    const overlapsY = result.y + height > minY && result.y < maxY;
    if (!overlapsY) return Object.freeze(result);

    const expandedMinX = minX - radius;
    const expandedMaxX = maxX + radius;
    const expandedMinZ = minZ - radius;
    const expandedMaxZ = maxZ + radius;
    const insideXZ = result.x > expandedMinX && result.x < expandedMaxX
      && result.z > expandedMinZ && result.z < expandedMaxZ;
    if (!insideXZ) return Object.freeze(result);

    const prevX = finite(prevPos?.x, result.x);
    const prevZ = finite(prevPos?.z, result.z);
    if (prevX <= expandedMinX) {
      result.x = expandedMinX;
      result.blockedX = true;
    } else if (prevX >= expandedMaxX) {
      result.x = expandedMaxX;
      result.blockedX = true;
    } else if (prevZ <= expandedMinZ) {
      result.z = expandedMinZ;
      result.blockedZ = true;
    } else if (prevZ >= expandedMaxZ) {
      result.z = expandedMaxZ;
      result.blockedZ = true;
    } else {
      const nearest = [
        { axis: 'x', value: expandedMinX, depth: Math.abs(result.x - expandedMinX) },
        { axis: 'x', value: expandedMaxX, depth: Math.abs(expandedMaxX - result.x) },
        { axis: 'z', value: expandedMinZ, depth: Math.abs(result.z - expandedMinZ) },
        { axis: 'z', value: expandedMaxZ, depth: Math.abs(expandedMaxZ - result.z) },
      ].sort((a, b) => a.depth - b.depth)[0];
      if (nearest.axis === 'x') {
        result.x = nearest.value;
        result.blockedX = true;
      } else {
        result.z = nearest.value;
        result.blockedZ = true;
      }
    }

    return Object.freeze(result);
  }

  globalThis.TripleObbyPhysics = Object.freeze({
    ...(globalThis.TripleObbyPhysics || {}),
    resolveSolidPlatformCollision,
  });
})();
