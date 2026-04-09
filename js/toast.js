window.showToast = (function () {
  let container = null;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type) {
    const c = getContainer();
    const toast = document.createElement('div');
    toast.className = 'toast toast--' + (type || 'info');
    toast.textContent = message;

    c.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('toast--visible');
    });

    setTimeout(function () {
      toast.classList.remove('toast--visible');
      toast.addEventListener('transitionend', function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, { once: true });
    }, 3000);
  }

  return showToast;
})();
