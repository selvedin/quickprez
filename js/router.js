window.Router = (function () {
  const routes = [];
  let currentPage = null;
  let container = null;

  function register(pattern, pageModule) {
    routes.push({ pattern: pattern, module: pageModule });
  }

  function matchRoute(hash) {
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      const params = matchPattern(route.pattern, hash);
      if (params !== null) {
        return { module: route.module, params: params };
      }
    }
    return null;
  }

  function matchPattern(pattern, hash) {
    const patternParts = pattern.split('/');
    const hashParts = hash.split('/');
    if (patternParts.length !== hashParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = hashParts[i];
      } else if (patternParts[i] !== hashParts[i]) {
        return null;
      }
    }
    return params;
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  function resolve() {
    const hash = window.location.hash || '#dashboard';
    const match = matchRoute(hash);

    if (currentPage && typeof currentPage.unmount === 'function') {
      currentPage.unmount();
    }
    currentPage = null;

    if (!match) {
      container.innerHTML = '<div class="not-found">Page not found: ' + hash + '</div>';
      return;
    }

    currentPage = match.module;
    currentPage.mount(match.params, container);
  }

  function init(appContainer) {
    container = appContainer;
    window.addEventListener('hashchange', resolve);
    resolve();
  }

  return {
    register: register,
    navigate: navigate,
    init: init,
  };
})();
