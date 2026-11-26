// Keyboard and mouse. W/S pitch, A/D bank, Shift/Ctrl throttle, F flaps,
// C camera, P pause, R restart, M mute. The mouse steers too: holding the left
// button and moving it banks and pitches, for players who prefer it.
export function createInput() {
  const keys = new Set();
  const state = {
    pitch: 0,       // -1 nose up .. +1 nose down
    roll: 0,        // -1 left .. +1 right
    throttleUp: false,
    throttleDown: false,
    flapsToggle: false,
    cameraToggle: false,
    pauseToggle: false,
    restart: false,
    muteToggle: false,
    mouseSteer: false,
    mousePitch: 0,
    mouseRoll: 0,
  };
  let mouseDown = false;
  let lastX = 0;
  let lastY = 0;

  function refresh() {
    const up = keys.has('KeyW') || keys.has('ArrowUp');
    const down = keys.has('KeyS') || keys.has('ArrowDown');
    const left = keys.has('KeyA') || keys.has('ArrowLeft');
    const right = keys.has('KeyD') || keys.has('ArrowRight');
    state.pitch = (up ? -1 : 0) + (down ? 1 : 0);
    state.roll = (left ? -1 : 0) + (right ? 1 : 0);
    if (state.mouseSteer) {
      state.pitch = state.mousePitch;
      state.roll = state.mouseRoll;
    }
    state.throttleUp = keys.has('ShiftLeft') || keys.has('ShiftRight');
    state.throttleDown = keys.has('ControlLeft') || keys.has('ControlRight');
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'KeyF') state.flapsToggle = true;
    if (event.code === 'KeyC') state.cameraToggle = true;
    if (event.code === 'KeyP' || event.code === 'Escape') state.pauseToggle = true;
    if (event.code === 'KeyR') state.restart = true;
    if (event.code === 'KeyM') state.muteToggle = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    refresh();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    refresh();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    refresh();
  });

  window.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    mouseDown = true;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  window.addEventListener('mousemove', (event) => {
    if (!mouseDown) return;
    state.mouseSteer = true;
    state.mouseRoll = Math.max(-1, Math.min(1, (event.clientX - lastX) / 120));
    state.mousePitch = Math.max(-1, Math.min(1, (event.clientY - lastY) / 120));
    refresh();
  });
  window.addEventListener('mouseup', () => {
    mouseDown = false;
    state.mouseSteer = false;
    state.mousePitch = 0;
    state.mouseRoll = 0;
    refresh();
  });

  return {
    state,
    // One-shot flags are consumed by the game loop each frame.
    consume() {
      const out = {
        flapsToggle: state.flapsToggle,
        cameraToggle: state.cameraToggle,
        pauseToggle: state.pauseToggle,
        restart: state.restart,
        muteToggle: state.muteToggle,
      };
      state.flapsToggle = false;
      state.cameraToggle = false;
      state.pauseToggle = false;
      state.restart = false;
      state.muteToggle = false;
      return out;
    },
  };
}
