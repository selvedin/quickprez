window.PlayerPage = (function () {
  let vm = null;

  function mount(params, container) {
    container.innerHTML = '<div id="player-root"></div>';
    vm = new Vue({
      el: '#player-root',
      template: '<div class="page-placeholder"><h1>Player — id: {{ id }}</h1></div>',
      data: { id: params.id },
    });
  }

  function unmount() {
    if (vm) {
      vm.$destroy();
      vm = null;
    }
  }

  return { mount: mount, unmount: unmount };
})();
