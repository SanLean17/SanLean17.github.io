// One interaction controller for public DBD and Halloween Tierlists.
window.SanLeanTierlistInteraction = function ({pool, help, itemLabel = 'personaje'}) {
  const mobile = matchMedia('(max-width:760px)');
  const cards = new Set();
  const zones = [...document.querySelectorAll('.tier-dropzone')];
  let selected = null, dragged = null, pointer = null, frame = 0, lastTime = 0;
  let pendingDrag = null, preview = null, activePointer = null, offset = null, carry = 0, wheelPaused = false;

  const placement = document.createElement('div');
  placement.className = 'tier-perk-placement';
  placement.hidden = true;
  placement.setAttribute('role', 'region');
  placement.setAttribute('aria-label', 'Ubicar elemento en la Tierlist');
  const selectedName = document.createElement('p');
  selectedName.setAttribute('aria-live', 'polite');
  const destinations = document.createElement('div');
  placement.append(selectedName, destinations);
  const destinationButtons = zones.map(zone => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tier-tab';
    button.textContent = zone === pool ? 'DISPONIBLES' : zone.dataset.tier;
    button.setAttribute('aria-label', zone === pool ? 'Devolver a disponibles' : `Mover a ${zone.dataset.tier}`);
    button.addEventListener('click', () => {
      if (!mobile.matches || !selected || selected.parentElement === zone) return;
      const card = selected;
      zone.append(card);
      clearSelection();
      card.focus({preventScroll:true});
    });
    destinations.append(button);
    return {zone, button};
  });
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'tier-tab';
  cancel.textContent = 'CANCELAR';
  function cancelSelection() {
    const card = selected;
    clearSelection();
    card?.focus({preventScroll:true});
  }
  cancel.addEventListener('click', cancelSelection);
  destinations.append(cancel);
  document.body.append(placement);

  function clearSelection() {
    if (selected) {
      selected.classList.remove('tier-selected');
      selected.setAttribute('aria-pressed', 'false');
    }
    selected = null;
    placement.hidden = true;
  }
  function select(card) {
    if (!mobile.matches) return;
    const wasSelected = selected === card;
    clearSelection();
    if (wasSelected) return;
    selected = card;
    card.classList.add('tier-selected');
    card.setAttribute('aria-pressed', 'true');
    selectedName.textContent = `${card.dataset.name || card.querySelector('img').alt} — elegí una fila`;
    destinationButtons.forEach(({zone, button}) => { button.hidden = zone === card.parentElement; });
    placement.hidden = false;
  }
  function updateHelp() {
    help.textContent = mobile.matches
      ? `Tocá cada ${itemLabel} y elegí una fila. Podés moverlo a otra fila o devolverlo a disponibles.`
      : `Arrastrá cada ${itemLabel} hacia la categoría que quieras. Usá la rueda del mouse o mové el cursor hacia arriba o abajo para desplazarte mientras arrastrás.`;
  }
  function syncCard(card) {
    // Mouse dragging uses pointer capture, so the browser keeps delivering wheel events.
    card.draggable = false;
    card.tabIndex = mobile.matches ? 0 : -1;
    if (mobile.matches) {
      card.setAttribute('role', 'button');
      card.setAttribute('aria-pressed', 'false');
      card.setAttribute('aria-label', card.dataset.name || card.querySelector('img').alt);
    } else {
      card.removeAttribute('role');
      card.removeAttribute('aria-pressed');
      card.removeAttribute('aria-label');
    }
  }
  function stopScroll() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    carry = 0;
  }
  function finishDrag() {
    stopScroll();
    dragged?.classList.remove('dragging');
    dragged = null;
    pointer = null;
    pendingDrag = null;
    preview?.remove();
    preview = null;
    wheelPaused = false;
    const id = activePointer;
    activePointer = null;
    if (id !== null && document.body.hasPointerCapture(id)) document.body.releasePointerCapture(id);
    zones.forEach(zone => zone.classList.remove('drag-over'));
    document.documentElement.classList.remove('tier-drag-active');
  }
  function velocity() {
    if (!pointer || pointer.x < 0 || pointer.x > innerWidth || pointer.y < 0 || pointer.y > innerHeight) return 0;
    const center = innerHeight / 2, quiet = innerHeight * .08;
    const distance = pointer.y - center;
    if (Math.abs(distance) <= quiet) return 0;
    const proximity = Math.min(1, (Math.abs(distance) - quiet) / (center - quiet));
    return Math.sign(distance) * 1000 * proximity ** 1.5;
  }
  function scrollFrame(now) {
    frame = 0;
    if (!dragged || mobile.matches || wheelPaused) return;
    const speed = velocity();
    if (!speed) { lastTime = 0; carry = 0; return; }
    const elapsed = lastTime ? Math.min(now - lastTime, 32) : 16;
    lastTime = now;
    carry += speed * elapsed / 1000;
    const pixels = Math.trunc(carry);
    if (pixels) { window.scrollBy({top:pixels, behavior:'instant'}); carry -= pixels; updateTarget(); }
    frame = requestAnimationFrame(scrollFrame);
  }
  function trackPointer(event) {
    pointer = {x:event.clientX, y:event.clientY};
    if (preview) { preview.style.left = (pointer.x - offset.x) + 'px'; preview.style.top = (pointer.y - offset.y) + 'px'; }
    updateTarget();
    if (!velocity() || wheelPaused) stopScroll();
    else if (!frame) frame = requestAnimationFrame(scrollFrame);
  }
  function targetZone() {
    if (!pointer) return null;
    const zone = document.elementFromPoint(pointer.x, pointer.y)?.closest('.tier-dropzone');
    return zones.includes(zone) ? zone : null;
  }
  function updateTarget() {
    const current = targetZone();
    zones.forEach(zone => zone.classList.toggle('drag-over', zone === current));
  }

  function getAfter(zone, x, y) {
    const candidates = [...zone.querySelectorAll('.tier-card:not(.dragging)')].filter(card => getComputedStyle(card).display !== 'none');
    let best = null, bestDist = Infinity;
    for (const card of candidates) {
      const rect = card.getBoundingClientRect(), cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const distance = Math.hypot(x - cx, (y - cy) * 2);
      if (distance < bestDist && (y < cy || (Math.abs(y - cy) < rect.height / 2 && x < cx))) {
        bestDist = distance;
        best = card;
      }
    }
    return best;
  }
  function placeDragged(zone, event) {
    const after = getAfter(zone, event.clientX, event.clientY);
    if (after) zone.insertBefore(dragged, after); else zone.append(dragged);
  }
  document.addEventListener('pointermove', event => {
    if (mobile.matches || event.pointerId !== activePointer) return;
    if (pendingDrag && !dragged) {
      if (Math.hypot(event.clientX - pendingDrag.x, event.clientY - pendingDrag.y) < 6) return;
      dragged = pendingDrag.card;
      const rect = dragged.getBoundingClientRect();
      offset = {x:pendingDrag.x - rect.left, y:pendingDrag.y - rect.top};
      preview = dragged.cloneNode(true);
      preview.removeAttribute('id');
      preview.removeAttribute('role');
      preview.removeAttribute('aria-pressed');
      preview.classList.add('tier-drag-preview');
      preview.setAttribute('aria-hidden', 'true');
      preview.tabIndex = -1;
      preview.style.setProperty('width', rect.width + 'px', 'important');
      preview.style.setProperty('height', rect.height + 'px', 'important');
      document.body.append(preview);
      document.documentElement.classList.add('tier-drag-active');
      dragged.classList.add('dragging');
      clearSelection();
    }
    if (!dragged) return;
    event.preventDefault();
    wheelPaused = false;
    trackPointer(event);
  });
  document.addEventListener('pointerup', event => {
    if (event.pointerId !== activePointer) return;
    if (dragged) {
      pointer = {x:event.clientX, y:event.clientY};
      const zone = targetZone();
      if (zone) placeDragged(zone, event);
    }
    finishDrag();
  });
  document.addEventListener('pointercancel', event => { if (event.pointerId === activePointer) finishDrag(); });
  document.body.addEventListener('lostpointercapture', event => { if (event.pointerId === activePointer) finishDrag(); });
  // Keep native wheel scrolling. It takes precedence until the next mouse movement.
  document.addEventListener('wheel', () => { if (dragged) { wheelPaused = true; stopScroll(); } }, {passive:true});
  window.addEventListener('scroll', () => { if (dragged) updateTarget(); }, {passive:true});
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { cancelSelection(); finishDrag(); }
  });
  window.addEventListener('blur', finishDrag);
  window.addEventListener('pagehide', finishDrag);
  document.addEventListener('visibilitychange', () => { if (document.hidden) finishDrag(); });
  mobile.addEventListener('change', () => {
    clearSelection();
    finishDrag();
    cards.forEach(syncCard);
    updateHelp();
  });
  updateHelp();
  return {
    clearSelection,
    setItemLabel(label) { itemLabel = label; updateHelp(); },
    register(card) {
      cards.add(card);
      syncCard(card);
      card.addEventListener('click', () => select(card));
      card.addEventListener('keydown', event => {
        if (mobile.matches && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          select(card);
          if (selected) destinationButtons.find(({button}) => !button.hidden).button.focus();
        }
      });
      card.addEventListener('dragstart', event => event.preventDefault());
      card.addEventListener('pointerdown', event => {
        if (mobile.matches || event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary) return;
        finishDrag();
        activePointer = event.pointerId;
        pendingDrag = {card, x:event.clientX, y:event.clientY};
        document.body.setPointerCapture(activePointer);
        event.preventDefault();
      });
    }
  };
};
