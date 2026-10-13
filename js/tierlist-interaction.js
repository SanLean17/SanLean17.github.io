// One interaction controller for public DBD and Halloween Tierlists.
window.SanLeanTierlistInteraction = function ({pool, help, itemLabel = 'personaje'}) {
  const mobile = matchMedia('(max-width:760px)');
  const cards = new Set();
  const zones = [...document.querySelectorAll('.tier-dropzone')];
  let selected = null, dragged = null, pointer = null, frame = 0, lastTime = 0;

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
      : `Arrastrá cada ${itemLabel} hacia la categoría que quieras. Acercá el cursor a los bordes de la ventana para desplazarte mientras arrastrás.`;
  }
  function syncCard(card) {
    card.draggable = !mobile.matches;
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
  }
  function finishDrag() {
    stopScroll();
    dragged?.classList.remove('dragging');
    dragged = null;
    pointer = null;
    zones.forEach(zone => zone.classList.remove('drag-over'));
    document.documentElement.classList.remove('tier-drag-active');
  }
  function velocity() {
    if (!pointer || pointer.x < 0 || pointer.x > innerWidth || pointer.y < 0 || pointer.y > innerHeight) return 0;
    const edge = Math.min(120, innerHeight / 5);
    const direction = pointer.y < edge ? -1 : pointer.y > innerHeight - edge ? 1 : 0;
    const proximity = direction < 0 ? (edge - pointer.y) / edge : (pointer.y - (innerHeight - edge)) / edge;
    return direction * 720 * Math.max(0, proximity) ** 1.4;
  }
  function scrollFrame(now) {
    frame = 0;
    if (!dragged || mobile.matches) return;
    const speed = velocity();
    if (!speed) { lastTime = 0; return; }
    // Bound elapsed time so restoring a suspended tab cannot cause a jump.
    const elapsed = lastTime ? Math.min(now - lastTime, 32) : 16;
    lastTime = now;
    window.scrollBy({top:speed * elapsed / 1000, behavior:'instant'});
    frame = requestAnimationFrame(scrollFrame);
  }
  function trackPointer(event) {
    pointer = {x:event.clientX, y:event.clientY};
    if (!velocity()) stopScroll();
    else if (!frame) frame = requestAnimationFrame(scrollFrame);
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
  zones.forEach(zone => {
    zone.addEventListener('dragover', event => {
      if (!dragged || mobile.matches) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      zone.classList.add('drag-over');
      placeDragged(zone, event);
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', event => {
      if (!dragged || mobile.matches) return;
      event.preventDefault();
      placeDragged(zone, event);
    });
  });
  function updateDragPointer(event) {
    if (!dragged || mobile.matches) return;
    // Also receive drops over page gaps so releasing there immediately stops scrolling.
    event.preventDefault();
    trackPointer(event);
  }
  document.addEventListener('dragenter', updateDragPointer);
  document.addEventListener('dragover', updateDragPointer);
  document.addEventListener('drop', finishDrag);
  document.addEventListener('dragend', finishDrag);
  document.addEventListener('dragleave', event => {
    if (!event.relatedTarget && (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= innerWidth || event.clientY >= innerHeight)) {
      pointer = null;
      stopScroll();
    }
  });
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
      card.addEventListener('dragstart', event => {
        if (mobile.matches) { event.preventDefault(); return; }
        clearSelection();
        dragged = card;
        document.documentElement.classList.add('tier-drag-active');
        card.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', card.dataset.id || card.dataset.name);
        trackPointer(event);
      });
    }
  };
};
