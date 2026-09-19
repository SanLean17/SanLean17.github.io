document.addEventListener('DOMContentLoaded', function () {
  const splash = document.getElementById('splash');
  if (splash) {
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
      }
    });
  });
});
