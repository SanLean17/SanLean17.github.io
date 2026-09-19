async function loadJSON(url) {
  const res = await fetch(url);
  return res.json();
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildReelItem(item, imgBase) {
  const div = document.createElement('div');
  div.className = 'reel-item';
  div.innerHTML = `<img src="${imgBase}/${item.key}.png" alt="${item.name}"><span>${item.name}</span>`;
  return div;
}

// Anima una tira horizontal (o vertical si vertical=true) y devuelve el item elegido
function spinTrack(trackEl, pool, imgBase, target, vertical, itemSize) {
  return new Promise(resolve => {
    const seq = [];
    for (let i = 0; i < 30; i++) seq.push(shuffled(pool)[0]);
    seq.push(target);

    trackEl.innerHTML = '';
    trackEl.style.transition = 'none';
    trackEl.style.transform = 'translate(0,0)';
    seq.forEach(it => trackEl.appendChild(buildReelItem(it, imgBase)));

    const gap = 12;
    const offset = (seq.length - 1) * (itemSize + gap) - (itemSize + gap) / 2;

    requestAnimationFrame(() => {
      trackEl.style.transition = 'transform 3s cubic-bezier(.12,.85,.15,1)';
      trackEl.style.transform = vertical
        ? `translateY(-${offset}px)`
        : `translateX(-${offset}px)`;
    });

    setTimeout(() => resolve(target), 3100);
  });
}

function pickEnabled(items, disabledSet) {
  const pool = items.filter(i => !disabledSet.has(i.key));
  return pool.length ? pool : items; // si deshabilitó todo, usa todas igual
}

function conflictsWith(key, chosenKeys, groups) {
  return groups.some(group => group.includes(key) && group.some(k => chosenKeys.includes(k)));
}

function pickBuildOf4(items, disabledSet, conflictGroups) {
  const pool = pickEnabled(items, disabledSet);
  let attempt = 0;
  while (attempt < 300) {
    attempt++;
    const shuffledPool = shuffled(pool);
    const chosen = [];
    for (const item of shuffledPool) {
      if (chosen.length >= 4) break;
      if (chosen.find(c => c.key === item.key)) continue;
      if (conflictsWith(item.key, chosen.map(c => c.key), conflictGroups)) continue;
      chosen.push(item);
    }
    if (chosen.length === 4) return chosen;
  }
  // fallback: si no encontró combinación sin conflictos, devuelve 4 al azar igual
  return shuffled(pool).slice(0, 4);
}

function initConfigGrid(gridEl, items, imgBase, disabledSet) {
  gridEl.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'config-item';
    div.innerHTML = `<img src="${imgBase}/${item.key}.png" alt="${item.name}"><div class="cfg-name">${item.name}</div>`;
    div.addEventListener('click', () => {
      if (disabledSet.has(item.key)) disabledSet.delete(item.key);
      else disabledSet.add(item.key);
      div.classList.toggle('disabled');
    });
    gridEl.appendChild(div);
  });
}

function initConfigToggle(headerEl, gridEl) {
  headerEl.addEventListener('click', () => {
    headerEl.classList.toggle('open');
    gridEl.classList.toggle('open');
  });
}
