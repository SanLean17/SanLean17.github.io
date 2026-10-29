'use strict';
(() => {
  const token = new URLSearchParams(location.hash.slice(1)).get('sanlean-loader');
  if (parent === window || location.origin !== 'http://127.0.0.1:4175' || !/^[0-9a-f]{32}$/.test(token || '')) return;
  const route = location.pathname;
  let ready = false, paired = false, announced = false, timer, request, generation = 0, stopped = false, parentOrigin = '*';
  const send = type => parent.postMessage({ type, token, route }, parentOrigin);
  async function heartbeat() {
    if (!ready || !paired || stopped || request) return;
    const version = generation, controller = request = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch('/health', { cache: 'no-store', signal: controller.signal });
      const health = await response.json();
      if (!response.ok || health.app !== 'sanlean-streamer-tools') throw Error('Disconnected');
      if (version !== generation || !ready || stopped) return;
      send(announced ? 'SANLEAN_OVERLAY_HEARTBEAT' : 'SANLEAN_OVERLAY_READY');
      announced = true;
    } catch { if (version === generation && !stopped) window.SanLeanOverlayLoader.waiting(); }
    finally {
      clearTimeout(timeout); if (request === controller) request = null;
      if (version === generation && ready && paired && !stopped) timer = setTimeout(heartbeat, 2000);
    }
  }
  window.SanLeanOverlayLoader = {
    ready() { if (ready || stopped) return; ready = true; heartbeat(); },
    waiting() {
      ready = false; announced = false; generation++;
      clearTimeout(timer); request?.abort(); request = null;
      if (paired && !stopped) send('SANLEAN_OVERLAY_WAITING');
    }
  };
  addEventListener('message', event => {
    const message = event.data;
    if (event.source !== parent || !['null', 'http://absolute'].includes(event.origin) || message?.type !== 'SANLEAN_LOADER_HELLO' || message.token !== token || message.route !== route || paired) return;
    parentOrigin = event.origin === 'null' ? '*' : event.origin;
    paired = true; heartbeat();
  });
  addEventListener('pagehide', () => { stopped = true; window.SanLeanOverlayLoader.waiting(); });
})();
