/* Public mobile navigation and viewport modes. Desktop keeps its existing DOM. */
document.addEventListener('DOMContentLoaded', () => {
  const media = matchMedia('(max-width:760px)'), body = document.body;
  const trigger = document.getElementById('menuToggle'), header = document.querySelector('.site-header');
  if (!trigger || !header) return;
  const page = location.pathname.split('/').pop() || 'index.html';
  const groups = [
    ['DEAD BY DAYLIGHT', [['RULETA KILLER','ruleta-killer.html'],['RULETA PERKS','ruleta-perks.html'],['PERKS DE KILLER','ruleta-perks-killer.html'],['PERKS DE SUPERVIVIENTE','ruleta-perks-superviviente.html'],['1VS1','1vs1.html']]],
    ['TIERLIST', [['DEAD BY DAYLIGHT','tierlist-dbd.html'],['HALLOWEEN','tierlist-halloween.html']]],
    ['SANLEAN', [['INICIO','index.html'],['HALLOWEEN','halloween.html'],['CRÉDITOS','creditos.html']]]
  ];
  const menu = document.createElement('nav');
  menu.id = 'publicMobileMenu'; menu.className = 'public-mobile-menu'; menu.hidden = true;
  menu.setAttribute('aria-label','Navegación móvil');
  const categories = document.createElement('div'), options = document.createElement('div');
  categories.className = 'public-mobile-groups'; options.className = 'public-mobile-options';
  menu.append(categories, options); header.after(menu);
  let selected = Math.max(0, groups.findIndex(g => g[1].some(l => l[1] === page)));
  function select(index) {
    selected = index;
    [...categories.children].forEach((b,i) => b.setAttribute('aria-pressed', String(i === index)));
    options.replaceChildren(...groups[index][1].map(([label,href]) => {
      const a = document.createElement('a'); a.textContent = label; a.href = href;
      if (href === page) a.setAttribute('aria-current','page'); return a;
    }));
  }
  groups.forEach(([label], i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.addEventListener('click', () => select(i)); categories.append(b);
  });
  select(selected);
  function close(focus = false) {
    menu.hidden = true; body.classList.remove('public-menu-open');
    trigger.classList.remove('is-open'); trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('aria-label','Abrir menú'); if (focus) trigger.focus();
  }
  window.addEventListener('click', e => {
    if (!media.matches) return;
    if (trigger.contains(e.target)) {
      e.preventDefault(); e.stopImmediatePropagation();
      const opening = menu.hidden; close();
      if (opening) {
        menu.style.top = `${header.offsetTop + header.offsetHeight}px`;
        menu.hidden = false; body.classList.add('public-menu-open');
        trigger.classList.add('is-open'); trigger.setAttribute('aria-expanded','true');
        trigger.setAttribute('aria-label','Cerrar menú');
      }
    } else if (!menu.contains(e.target)) close();
  }, true);
  document.addEventListener('keydown', e => {
    if (!media.matches || menu.hidden) return;
    if (e.key === 'Escape') { close(true); return; }
    if (e.key === 'Tab') {
      const nodes = [trigger,...menu.querySelectorAll('button,a')];
      if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); nodes.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); trigger.focus(); }
    }
  });
  const main = document.querySelector('main');
  const compact = ['ruleta-perks-killer.html','ruleta-perks-superviviente.html','halloween.html','creditos.html'].includes(page);
  body.classList.toggle('mobile-compact-page',compact);
  body.classList.toggle('mobile-credits-page',page === 'creditos.html');
  let stage = null;
  function sync() {
    body.classList.toggle('public-mobile',media.matches);
    if (media.matches && page === 'ruleta-killer.html' && !stage) {
      stage = document.createElement('section'); stage.className = 'mobile-killer-stage';
      main.prepend(stage);
      while(stage.nextElementSibling && !stage.nextElementSibling.matches('.config-section,.killer-perks-section')) stage.append(stage.nextElementSibling);
    } else if (!media.matches && stage) { stage.replaceWith(...stage.childNodes); stage = null; }
    if (!media.matches) close();
    trigger.setAttribute('aria-controls',media.matches ? menu.id : 'mainNav');
    document.getElementById('mainNav')?.classList.remove('nav-open');
  }
  const configs = [...document.querySelectorAll('.perk-gear-config')];
  function configMode() { body.classList.toggle('mobile-config-open',configs.some(c => c.classList.contains('gear-visible'))); }
  configs.forEach(c => new MutationObserver(configMode).observe(c,{attributes:true,attributeFilter:['class']}));
  media.addEventListener('change',sync); sync(); configMode();
});
