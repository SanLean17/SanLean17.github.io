document.addEventListener('DOMContentLoaded', function () {
  const splash = document.getElementById('splash');
  if (splash) {
    const skipSplash = new URLSearchParams(window.location.search).get('skipSplash') === '1';
    if (skipSplash) {
      splash.remove();
      document.body.classList.remove('no-scroll');
      if (window.history && window.history.replaceState) window.history.replaceState({}, '', 'index.html');
    } else {
      let dismissed = false;
      document.body.classList.add('no-scroll');
      const hideSplash = () => {
        if (dismissed) return;
        dismissed = true;
        splash.classList.add('splash-hidden');
        document.body.classList.remove('no-scroll');
        window.setTimeout(() => splash.remove(), 700);
      };
      splash.addEventListener('click', hideSplash);
      window.setTimeout(hideSplash, 4200);
    }
  }

  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', function () {
      const open = mainNav.classList.toggle('nav-open');
      menuToggle.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
    });
  }

  document.querySelectorAll('.has-dropdown > .nav-link').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (window.matchMedia('(max-width: 900px)').matches) {
        event.preventDefault();
        event.stopPropagation();
        link.parentElement.classList.toggle('dropdown-open');
        return;
      }
      if (link.textContent.trim().toUpperCase() === 'DEAD BY DAYLIGHT') {
        window.location.href = 'index.html?skipSplash=1';
      }
    });
  });

  const configSections = document.querySelectorAll('.config-section');
  if (configSections.length) {
    const topButton = document.createElement('button');
    topButton.type = 'button';
    topButton.className = 'back-to-top';
    topButton.setAttribute('aria-label', 'Volver arriba');
    topButton.innerHTML = '&#8593;';
    document.body.appendChild(topButton);
    const updateTopButton = function () {
      const configOpen = !!document.querySelector('.config-grid.open');
      topButton.classList.toggle('visible', configOpen && window.scrollY > 360);
    };
    window.addEventListener('scroll', updateTopButton, { passive: true });
    document.addEventListener('click', function () { window.setTimeout(updateTopButton, 0); });
    topButton.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    updateTopButton();
  }
});