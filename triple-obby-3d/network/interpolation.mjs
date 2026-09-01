function assertVector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || value.some(item => !Number.isFinite(item))) {
    throw new TypeError(`${label} must be a finite 3-vector`);
  }
  return [value[0], value[1], value[2]];
}

function normalizeAngle(angle) {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return normalized;
}

function cloneSample(sample) {
  if (!sample || !Number.isFinite(sample.sentAt) || !Number.isFinite(sample.yaw)) {
    throw new TypeError('sample requires finite sentAt and yaw');
  }
  return Object.freeze({
    ...sample,
    sentAt: sample.sentAt,
    position: Object.freeze(assertVector3(sample.position, 'position')),
    velocity: Object.freeze(assertVector3(sample.velocity ?? [0, 0, 0], 'velocity')),
    yaw: normalizeAngle(sample.yaw),
  });
}

export function pushSample(buffer, sample, maxSamples = 4) {
  if (!Array.isArray(buffer)) throw new TypeError('buffer must be an array');
  if (!Number.isInteger(maxSamples) || maxSamples < 2) throw new TypeError('maxSamples must be at least 2');
  const next = buffer.map(cloneSample);
  const normalized = cloneSample(sample);
  const existingIndex = next.findIndex(item => item.sentAt === normalized.sentAt);
  if (existingIndex >= 0) next[existingIndex] = normalized;
  else next.push(normalized);
  next.sort((a, b) => a.sentAt - b.sentAt);
  return Object.freeze(next.slice(-maxSamples));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpVector(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function lerpAngle(a, b, t) {
  const delta = normalizeAngle(b - a);
  return normalizeAngle(a + delta * t);
}

export function interpolatePlayer(buffer, renderAt) {
  if (!Array.isArray(buffer) || buffer.length === 0) return null;
  if (!Number.isFinite(renderAt)) throw new TypeError('renderAt must be finite');
  const samples = [...buffer].sort((a, b) => a.sentAt - b.sentAt).map(cloneSample);
  if (renderAt <= samples[0].sentAt) return samples[0];
  if (renderAt >= samples.at(-1).sentAt) return samples.at(-1);

  for (let index = 0; index < samples.length - 1; index += 1) {
    const from = samples[index];
    const to = samples[index + 1];
    if (renderAt < from.sentAt || renderAt > to.sentAt) continue;
    const span = to.sentAt - from.sentAt;
    const t = span === 0 ? 1 : (renderAt - from.sentAt) / span;
    return Object.freeze({
      sentAt: renderAt,
      position: Object.freeze(lerpVector(from.position, to.position, t)),
      velocity: Object.freeze(lerpVector(from.velocity, to.velocity, t)),
      yaw: lerpAngle(from.yaw, to.yaw, t),
    });
  }
  return samples.at(-1);
}
