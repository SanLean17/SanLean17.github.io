document.addEventListener('DOMContentLoaded', function () {
  // Splash (solo existe en index.html)
  var splash = document.getElementById('splash');
  if (splash) {
    var dismissed = false;
    function hideSplash() {
      if (dismissed) return;
      dismissed = true;
      splash.classList.add('splash-hidden');
      document.body.classList.remove('no-scroll');
      setTimeout(function () { splash.style.display = 'none'; }, 600);
    }
    splash.addEventListener('click', hideSplash);
    setTimeout(hideSplash, 5000);
    document.body.classList.add('no-scroll');
  }

  // Menú hamburguesa (mobile)
  var menuToggle = document.getElementById('menuToggle');
  var mainNav = document.getElementById('mainNav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', function () {
      mainNav.classList.toggle('nav-open');
    });
  }

  // Dropdowns del menú (desktop y mobile)
  document.querySelectorAll('.has-dropdown > .nav-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.stopPropagation();
      var parent = link.parentElement;
      var wasOpen = parent.classList.contains('dropdown-open');
      document.querySelectorAll('.has-dropdown').forEach(function (li) { li.classList.remove('dropdown-open'); });
      if (!wasOpen) parent.classList.add('dropdown-open');
    });
  });
  document.addEventListener('click', function () {
    document.querySelectorAll('.has-dropdown').forEach(function (li) { li.classList.remove('dropdown-open'); });
  });
});
