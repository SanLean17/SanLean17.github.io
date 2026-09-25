/* Shared disclosure controller. Legacy click listeners must not toggle it again. */
(() => {
  const rootFor = target => target?.closest?.('.user-account-menu');
  const timers = new WeakMap();
  const touchOpen = new WeakMap();
  function setOpen(root, open) {
    if (!root) return;
    clearTimeout(timers.get(root));
    const trigger = root.querySelector('.user-account-trigger');
    const menu = root.querySelector('.user-account-dropdown');
    if (!trigger || !menu) return;
    trigger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  }
  document.addEventListener('pointerover', event => {
    const root = rootFor(event.target);
    if (event.pointerType !== 'touch' && root && !root.contains(event.relatedTarget)) setOpen(root, true);
  });
  document.addEventListener('pointerout', event => {
    const root = rootFor(event.target);
    if (!root || root.contains(event.relatedTarget)) return;
    timers.set(root, setTimeout(() => {
      if (!root.contains(document.activeElement)) setOpen(root, false);
    }, 120));
  });
  document.addEventListener('focusin', event => setOpen(rootFor(event.target), true));
  document.addEventListener('focusout', event => {
    const root = rootFor(event.target);
    if (root && !root.contains(event.relatedTarget)) setOpen(root, false);
  });
  document.addEventListener('pointerdown', event => {
    const trigger = event.target.closest?.('.user-account-trigger');
    if (trigger && event.pointerType === 'touch') touchOpen.set(trigger, trigger.getAttribute('aria-expanded') === 'true');
  }, true);
  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('.user-account-trigger');
    if (trigger) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const root = rootFor(trigger);
      // Touch remembers state before focus opens the disclosure; mouse keeps hover open.
      setOpen(root, touchOpen.has(trigger) ? !touchOpen.get(trigger) : event.detail > 0 || trigger.getAttribute('aria-expanded') !== 'true');
      touchOpen.delete(trigger);
      return;
    }
    document.querySelectorAll('.user-account-menu').forEach(root => {
      if (!root.contains(event.target)) setOpen(root, false);
    });
  }, true);
  document.addEventListener('keydown', event => {
    const root = rootFor(event.target);
    if (!root) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      root.querySelector('.user-account-trigger').focus();
      setOpen(root, false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(root, true);
      root.querySelector('.user-account-dropdown a, .user-account-dropdown button')?.focus();
    }
  });
})();
