(() => {
  const toast = document.querySelector('#stream-toast');
  let timer, token;
  function hide() { toast.classList.remove('is-visible'); toast.setAttribute('aria-hidden','true'); }
  const events = new EventSource('/toasts/events');
  events.addEventListener('toast', event => {
    const message = JSON.parse(event.data);
    clearTimeout(timer);
    if (!message || message.remainingMs <= 0) { token=null; hide(); return; }
    // Reconnection reuses the remaining lifetime rather than replaying 15 seconds.
    if (message.token !== token) {
      document.querySelector('#toast-heading').textContent = message.title;
      document.querySelector('#toast-text').textContent = message.text;
      document.querySelector('#toast-footer').textContent = message.footer || '';
      token = message.token;
    }
    toast.classList.add('is-visible'); toast.setAttribute('aria-hidden','false');
    timer = setTimeout(hide, Math.min(message.remainingMs,15000));
  });
  window.addEventListener('pagehide',()=>{clearTimeout(timer);events.close();});
})();
