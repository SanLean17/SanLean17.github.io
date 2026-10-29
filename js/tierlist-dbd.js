document.addEventListener('DOMContentLoaded', () => {
const pool = document.getElementById('tierPool');
const tabs = document.querySelector('.tier-tabs');
const help = document.querySelector('.tier-help');
const rosters = {}, pending = {};
let currentType = 'killers';
const isPerk = type => type === 'killerPerks' || type === 'survivorPerks';

const interaction = SanLeanTierlistInteraction({pool, help});
function makeCard(src, id, type, name) {
  const card = document.createElement('div');
  card.className = 'tier-card';
  card.draggable = true;
  card.dataset.id = id;
  card.dataset.type = type;
  const img = document.createElement('img');
  img.src = src;
  img.alt = name || 'Personaje de Dead by Daylight';
  img.draggable = false;
  card.append(img);
  if (isPerk(type)) card.classList.add('tier-perk-card');
  if (name) card.dataset.name = name;
  interaction.register(card);
  return card;
}

function syncVisibility() {
  document.querySelectorAll('.tier-dropzone:not(#tierPool) .tier-card').forEach(card => {
    card.style.display = card.dataset.type === currentType ? '' : 'none';
  });
}
async function loadRoster(type) {
  if (!pending[type]) pending[type] = SanLeanDBDCatalog.load(type).then(items => {
    rosters[type] = items.filter(item => !item.emptySlot && item.key !== "slot_vacio")
      .map(item => makeCard(item.image, `${type}-${item.key}`, type, item.name));
  }).finally(() => { delete pending[type]; });
  return pending[type];
}
async function renderPool(type) {
  interaction.clearSelection();
  currentType = type;
  pool.replaceChildren();
  pool.classList.toggle('tier-perk-pool', isPerk(type));
  interaction.setItemLabel(isPerk(type) ? 'perk' : 'personaje');
  syncVisibility();
  if (!rosters[type]) {
    const status = document.createElement('p');
    status.className = 'tier-empty';
    status.setAttribute('role', 'status');
    status.textContent = 'Cargando catálogo…';
    pool.append(status);
    try { await loadRoster(type); }
    catch {
      if (currentType === type) {
        status.textContent = 'No se pudo cargar el catálogo. ';
        const retry = document.createElement('button');
        retry.className = 'tier-tab'; retry.textContent = 'REINTENTAR';
        retry.addEventListener('click', () => renderPool(type));
        status.append(retry);
      }
      return;
    }
    if (currentType !== type) return;
  }
  pool.replaceChildren(...rosters[type].filter(card => !card.closest('.tier-dropzone:not(#tierPool)')));
  [...pool.children].forEach(card => { card.style.display = ''; });
}
const reset = document.createElement('button');
reset.type = 'button'; reset.className = 'tier-reset';
reset.setAttribute('aria-label', 'Reiniciar Tierlist');
reset.setAttribute('data-tooltip', 'Reiniciar Tierlist');
reset.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8.1 8.1 0 1 0-2.4 5.8M20 4v7h-7"/></svg>';
tabs.append(reset);
reset.addEventListener('click', () => {
  interaction.clearSelection();
  Object.values(rosters).forEach(cards => cards.forEach(card => { card.remove(); card.style.display = ''; }));
  renderPool(currentType);
});
renderPool('killers');
document.querySelectorAll('.tier-tab[data-type]').forEach(button => button.addEventListener('click', () => {
  const type = button.dataset.type;
  if (type === currentType) return;
  tabs.querySelectorAll('[data-type]').forEach(tab => tab.classList.toggle('active', tab === button));
  renderPool(type);
}));
});
