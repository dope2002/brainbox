const storageKey = 'brainbox:swipe-guide:v1';
const stepDuration = 1450;

function guideFrame(elapsed) {
  if (elapsed >= stepDuration * 2) return null;
  const forward = elapsed < stepDuration;
  const time = elapsed % stepDuration;
  const progress = Math.max(0, Math.min(1, (time - 240) / 720));
  const travel = progress * progress * (3 - 2 * progress);
  return {
    index: forward ? 0 : 1,
    direction: forward ? -1 : 1,
    travel
  };
}

module.exports = { storageKey, guideFrame };
