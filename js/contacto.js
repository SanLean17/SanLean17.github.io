/* Public contact only. Enable delivery after provider consent and mailbox activation. */
(() => {
  const form = document.querySelector('#contactForm');
  if (!form) return;
  const email = form.elements.email, message = form.elements.message;
  const button = form.querySelector('button[type="submit"]');
  const status = document.querySelector('#contactStatus');
  const direct = document.querySelector('#contactDirect');
  let sending = false;
  function show(text, state) { status.textContent = text; status.dataset.state = state; }
  message.addEventListener('input', () => message.setCustomValidity(''));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    message.setCustomValidity(message.value.trim() ? '' : 'Escribí un mensaje.');
    if (!form.reportValidity()) return;
    direct.href = 'mailto:leandrosanchez10@gmail.com?subject=' + encodeURIComponent('Contacto — SanLean') + '&body=' + encodeURIComponent(message.value.trim());
    if (form.dataset.contactEnabled !== 'true') {
      show('El envío desde el formulario todavía no está habilitado. Usá el enlace de correo de abajo; tu mensaje está preparado allí.', 'error');
      return;
    }
    if (form.elements.website.value) { show('No se pudo enviar el mensaje. Usá el enlace de correo.', 'error'); return; }
    sending = true;
    button.disabled = true;
    email.readOnly = message.readOnly = true;
    form.setAttribute('aria-busy', 'true');
    button.textContent = 'ENVIANDO…';
    show('Enviando tu mensaje…', 'pending');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://formsubmit.co/ajax/leandrosanchez10@gmail.com', {
        method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json'},
        body:JSON.stringify({email:email.value.trim(), message:message.value.trim(), _subject:'Contacto — SanLean', _captcha:'false', _honey:''}),
        signal:controller.signal
      });
      const data = await response.json();
      if (!response.ok || ![true, 'true'].includes(data.success)) throw new Error('Delivery was not accepted');
      show('El servicio de correo recibió tu mensaje. Gracias por escribir a SanLean.', 'success');
      form.reset();
      direct.href = 'mailto:leandrosanchez10@gmail.com';
    } catch {
      show('No pudimos confirmar el envío. Tu texto sigue acá; podés intentar nuevamente o usar el enlace de correo.', 'error');
    } finally {
      clearTimeout(timeout);
      sending = false;
      button.disabled = false;
      email.readOnly = message.readOnly = false;
      form.removeAttribute('aria-busy');
      button.textContent = 'ENVIAR MENSAJE';
    }
  });
})();
