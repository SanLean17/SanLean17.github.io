document.addEventListener('DOMContentLoaded', () => {
const killerFiles=['K01_TheTrapper_Portrait.png','K02_TheWraith_Portrait.png','K03_TheHillbilly_Portrait.png','K04_TheNurse_Portrait.png','K05_TheHag_Portrait.png','K06_TheShape_Portrait.png','K07_TheDoctor_Portrait.png','K08_TheHuntress_Portrait.png','K09_TheCannibal_Portrait.png','K10_TheNightmare_Portrait.png','K11_ThePig_Portrait.png','K12_TheClown_Portrait.png','K13_TheSpirit_Portrait.png','K14_TheLegion_Portrait.png','K15_ThePlague_Portrait.png','K16_TheGhostface_Portrait.png','K17_TheDemogorgon_Portrait.png','K18_TheOni_Portrait.png','K19_TheDeathslinger_Portrait.png','K20_TheExecutioner_Portrait.png','K21_TheBlight_Portrait.png','K22_TheTwins_Portrait.png','K23_TheTrickster_Portrait.png','K24_TheNemesis_Portrait.png','K25_TheCenobite_Portrait.png','K26_TheArtist_Portrait.png','K27_TheOnryo_Portrait.png','K28_TheDredge_Portrait.png','K29_TheMasterMind_Portrait.png','K30_TheKnight_Portrait.png','K31_TheSkullMerchant_Portrait.png','K32_TheSingularity_Portrait.png','K33_TheXenomorph_Portrait.png','K34_TheYerkes_Portrait.png','K35_TheUnknown_Portrait.png','K36_TheLich_Portrait.png','K37_TheDracula_Portrait.png','K38_TheHoundmaster_Portrait.png','K39_TheGhoul_Portrait.png','K40_TheAnimatronic_Portrait.png','T_UI_K41_TheKrasue_Portrait.png','T_UI_K42_TheFirst_Portrait.png','T_UI_K43_TheSlasher_Portrait.png','T_UI_K44_TheJudgment_Portrait.png'];
const survivorFiles=['S01_DwightFairfield_Portrait.png','S02_MegThomas_Portrait.png','S03_ClaudetteMorel_Portrait.png','S04_JakePark_Portrait.png','S05_NeaKarlsson_Portrait.png','S06_LaurieStrode_Portrait.png','S07_AceVisconti_Portrait.png','S08_WilliamBillOverbeck_Portrait.png','S09_FengMin_Portrait.png','S10_DavidKing_Portrait.png','S11_QuentinSmith_Portrait.png','S12_DetectiveDavidTapp_Portrait.png','S13_KateDenson_Portrait.png','S14_AdamFrancis_Portrait.png','S15_JeffJohansen_Portrait.png','S16_JaneRomero_Portrait.png','S17_AshleyJWilliams_Portrait.png','S18_SteveHarrington_Portrait.png','T_UI_S19_NancyWheeler_Portrait.png','S20_YuiKimura_Portrait.png','S21_ZarinaKassir_Portrait.png','S22_CherylMason_Portrait.png','S23_FelixRichter_Portrait.png','S24_ElodieRakoto_Portrait.png','S25_YunJinLee_Portrait.png','S26_JillValentine_Portrait.png','S27_LeonSKennedy_Portrait.png','S28_MikaelaReid_Portrait.png','S29_JonahVasquez_Portrait.png','S30_YoichiAsakawa_Portrait.png','S31_HaddieKaur_Portrait.png','S32_AdaWong_Portrait.png','S33_RebeccaChambers_Portrait.png','S34_VittorioToscano_Portrait.png','S35_ThalitaLyra_Portrait.png','S36_RenatoLyra_Portrait.png','S37_GabrielSoma_Portrait.png','S38_NicolasCage_Portrait.png','S39_EllenRipley_Portrait.png','S40_AlanWake_Portrait.png','S41_SableWard_Portrait.png','S42_TheTroupe_Portrait.png','S43_LaraCroft_Portrait.png','S44_TrevorBelmont_Portrait.png','S45_TaurieCain_Portrait.png','S46_OrelaRose_Portrait.png','S47_RickGrimes_Portrait.png','S48_MichonneGrimes_Portrait.png','T_UI_S49_VeeBoonyasak_Portrait.png','T_UI_S50_DustinHenderson_Portrait.png','T_UI_S51_Eleven_Portrait.png','T_UI_S52_KwonTaeYoung_Portrait.png','T_UI_S53_ShaneWiigwaas_Portrait.webp','T_UI_S54_Aurora_Portrait.png'];
const pool = document.getElementById('tierPool');
const tabs = document.querySelector('.tier-tabs');
const help = document.querySelector('.tier-help');
const originalHelp = help.textContent;
const rosters = {}, pending = {};
let dragged = null, selected = null, currentType = 'killers';
const isPerk = type => type === 'killerPerks' || type === 'survivorPerks';

// Tapping a perk never captures a touch gesture: the collection remains scrollable.
const placement = document.createElement('div');
placement.className = 'tier-perk-placement';
placement.hidden = true;
placement.setAttribute('role', 'region');
placement.setAttribute('aria-label', 'Ubicar perk en la Tierlist');
const selectedName = document.createElement('p');
selectedName.setAttribute('aria-live', 'polite');
placement.append(selectedName);
const destinations = document.createElement('div');
placement.append(destinations);
const zones = [...document.querySelectorAll('.tier-dropzone')];
for (const zone of zones) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tier-tab';
  button.textContent = zone === pool ? 'DISPONIBLES' : zone.dataset.tier;
  button.setAttribute('aria-label', zone === pool ? 'Devolver a disponibles' : `Mover a ${zone.dataset.tier}`);
  button.addEventListener('click', () => {
    if (!selected) return;
    const card = selected;
    zone.append(card);
    clearSelection();
    card.focus({preventScroll:true});
  });
  destinations.append(button);
}
const cancel = document.createElement('button');
cancel.type = 'button';
cancel.className = 'tier-tab';
cancel.textContent = 'CANCELAR';
cancel.addEventListener('click', () => { const card = selected; clearSelection(); card?.focus({preventScroll:true}); });
destinations.append(cancel);
document.body.append(placement);
function clearSelection() {
  if (selected) { selected.classList.remove('selected-perk'); selected.setAttribute('aria-pressed', 'false'); }
  selected = null;
  placement.hidden = true;
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && selected) { const card = selected; clearSelection(); card.focus({preventScroll:true}); }
});
function selectPerk(card) {
  const wasSelected = card === selected;
  clearSelection();
  if (wasSelected) return;
  selected = card;
  card.classList.add('selected-perk');
  card.setAttribute('aria-pressed', 'true');
  selectedName.textContent = `${card.dataset.name} — elegí una fila`;
  placement.hidden = false;
}
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
  if (isPerk(type)) {
    card.classList.add('tier-perk-card');
    card.dataset.name = name;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', name);
    card.setAttribute('aria-pressed', 'false');
    card.addEventListener('click', () => selectPerk(card));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPerk(card); }
    });
  }
  card.addEventListener('dragstart', event => {
    clearSelection();
    dragged = card;
    card.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    zones.forEach(zone => zone.classList.remove('drag-over'));
    dragged = null;
  });
  return card;
}
function createRoster(type) {
  const files = type === 'killers' ? killerFiles : survivorFiles;
  const folder = type === 'killers' ? 'assets/killers/' : 'survivors/';
  return files.map((file, index) => makeCard(folder + file, type + '-' + index, type));
}
rosters.killers = createRoster('killers');
rosters.survivors = createRoster('survivors');
function syncVisibility() {
  document.querySelectorAll('.tier-dropzone:not(#tierPool) .tier-card').forEach(card => {
    card.style.display = card.dataset.type === currentType ? '' : 'none';
  });
}
async function loadPerks(type) {
  if (!pending[type]) pending[type] = (async () => {
    const role = type === 'killerPerks' ? 'killer' : 'survivor';
    const response = await fetch(`data/perks-${role}.json`);
    if (!response.ok) throw new Error('No se pudieron cargar las perks.');
    const items = await response.json();
    // Read the same source and image paths as the roulettes, without copying data.
    rosters[type] = items.filter(item => !item.emptySlot && item.key !== 'slot_vacio')
      .map(item => makeCard(item.image || `${role}/${item.key}.png`, `${type}-${item.key}`, type, item.name));
  })().finally(() => { delete pending[type]; });
  return pending[type];
}
async function renderPool(type) {
  clearSelection();
  currentType = type;
  pool.replaceChildren();
  pool.classList.toggle('tier-perk-pool', isPerk(type));
  help.textContent = isPerk(type) ? 'Arrastrá cada perk a una fila o tocala y elegí dónde ubicarla. Podés moverla después o devolverla a disponibles.' : originalHelp;
  syncVisibility();
  if (!rosters[type]) {
    const status = document.createElement('p');
    status.className = 'tier-empty';
    status.setAttribute('role', 'status');
    status.textContent = 'Cargando perks…';
    pool.append(status);
    try { await loadPerks(type); }
    catch {
      if (currentType === type) {
        status.textContent = 'No se pudieron cargar las perks. ';
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
function getAfter(zone, x, y) {
  const cards = [...zone.querySelectorAll('.tier-card:not(.dragging)')].filter(card => getComputedStyle(card).display !== 'none');
  let best = null, bestDist = Infinity;
  for (const card of cards) {
    const rect = card.getBoundingClientRect(), cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const distance = Math.hypot(x - cx, (y - cy) * 2);
    if (distance < bestDist && (y < cy || (Math.abs(y - cy) < rect.height / 2 && x < cx))) { bestDist = distance; best = card; }
  }
  return best;
}
zones.forEach(zone => {
  zone.addEventListener('dragover', event => {
    if (!dragged) return;
    event.preventDefault();
    zone.classList.add('drag-over');
    const after = getAfter(zone, event.clientX, event.clientY);
    if (after) zone.insertBefore(dragged, after); else zone.append(dragged);
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('drag-over'); });
});
const reset = document.createElement('button');
reset.type = 'button'; reset.className = 'tier-reset';
reset.setAttribute('aria-label', 'Reiniciar Tierlist');
reset.setAttribute('data-tooltip', 'Reiniciar Tierlist');
reset.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8.1 8.1 0 1 0-2.4 5.8M20 4v7h-7"/></svg>';
tabs.append(reset);
reset.addEventListener('click', () => {
  clearSelection();
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
