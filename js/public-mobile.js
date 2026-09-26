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
  let menuOpen = false, menuAnimation = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
  function setMenu(open, immediate = false) {
    menuOpen = open;
    menuAnimation?.cancel();
    menuAnimation = null;
    body.classList.toggle('public-menu-open', open);
    if (open) body.classList.add('public-menu-surface');
    trigger.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.inert = !open;
    if (open) {
      menu.style.top = `${header.offsetTop + header.offsetHeight}px`;
      menu.hidden = false;
    }
    if (immediate || reducedMotion.matches || menu.hidden) {
      menu.hidden = !open;
      body.classList.toggle('public-menu-surface', open);
      return;
    }
    const frames = [
      {transform:'translateY(-16px)', clipPath:'inset(0 0 100% 0)', opacity:0},
      {transform:'translateY(0)', clipPath:'inset(0 0 0 0)', opacity:1}
    ];
    const animation = menu.animate(open ? frames : [...frames].reverse(), {
      duration:220, easing:'cubic-bezier(.2,.7,.2,1)', fill:'both'
    });
    menuAnimation = animation;
    animation.finished.then(() => {
      if (menuAnimation !== animation) return;
      menu.hidden = !menuOpen;
      body.classList.toggle('public-menu-surface', menuOpen);
      animation.cancel();
      menuAnimation = null;
    }).catch(() => {});
  }
  function close(focus = false, immediate = false) {
    if (menuOpen || immediate) setMenu(false, immediate);
    if (focus) trigger.focus();
  }
  window.addEventListener('click', e => {
    if (!media.matches) return;
    if (trigger.contains(e.target)) {
      e.preventDefault(); e.stopImmediatePropagation();
      setMenu(!menuOpen);
    } else if (!menu.contains(e.target)) close();
    else if (e.target.closest('a')) close();
  }, true);
  document.addEventListener('keydown', e => {
    if (!media.matches || !menuOpen) return;
    if (e.key === 'Escape') { close(true); return; }
    if (e.key === 'Tab') {
      const nodes = [trigger,...menu.querySelectorAll('button,a')];
      if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); nodes.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); trigger.focus(); }
    }
  });
  const main = document.querySelector('main');
  const compact = ['ruleta-perks-killer.html','ruleta-perks-superviviente.html','halloween.html','creditos.html','1vs1.html'].includes(page);
  body.classList.toggle('mobile-compact-page',compact);
  body.classList.toggle('mobile-credits-page',page === 'creditos.html');
  body.classList.toggle('mobile-tierlist-page', page.startsWith('tierlist-'));
  // Spaces replace suppressed line breaks without changing desktop wrapping.
  const mobileSpaces = [...document.querySelectorAll('.splash-text br,main p br,.home-title br')]
    .map(br => ({br, space:document.createTextNode(' ')}));
  const gears = [...document.querySelectorAll('.perk-gear-btn,.killer-gear-btn')].map(button => {
    const original = [...button.childNodes];
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false'); svg.classList.add('mobile-gear-icon');
    const path = document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('fill','currentColor');
    path.setAttribute('d','M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.64l-1.92-3.32a.49.49 0 0 0-.61-.22l-2.39.96a7.1 7.1 0 0 0-1.62-.94l-.36-2.54A.49.49 0 0 0 13.9 2h-3.8a.49.49 0 0 0-.48.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.49.49 0 0 0-.61.22L2.72 8.48a.49.49 0 0 0 .12.64l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.64l1.92 3.32c.12.22.38.31.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.04.24.24.42.48.42h3.8c.24 0 .44-.18.48-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.23.09.49 0 .61-.22l1.92-3.32a.49.49 0 0 0-.12-.64l-2.02-1.58zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z');
    svg.append(path);
    return {button,original,svg};
  });
  let stage = null;
  function sync() {
    body.classList.toggle('public-mobile',media.matches);
    mobileSpaces.forEach(({br,space}) => {
      if (media.matches) br.before(space); else space.remove();
    });
    gears.forEach(({button,original,svg}) => button.replaceChildren(...(media.matches ? [svg] : original)));
    if (media.matches && page === 'ruleta-killer.html' && !stage) {
      stage = document.createElement('section'); stage.className = 'mobile-killer-stage';
      main.prepend(stage);
      while(stage.nextElementSibling && !stage.nextElementSibling.matches('.config-section,.killer-perks-section')) stage.append(stage.nextElementSibling);
    } else if (!media.matches && stage) { stage.replaceWith(...stage.childNodes); stage = null; }
    if (!media.matches) close(false, true);
    trigger.setAttribute('aria-controls',media.matches ? menu.id : 'mainNav');
    document.getElementById('mainNav')?.classList.remove('nav-open');
  }
  const configs = [...document.querySelectorAll('.perk-gear-config')];
  function configMode() { body.classList.toggle('mobile-config-open',configs.some(c => c.classList.contains('gear-visible'))); }
  configs.forEach(c => new MutationObserver(configMode).observe(c,{attributes:true,attributeFilter:['class']}));
  media.addEventListener('change',sync); sync(); configMode();
});
