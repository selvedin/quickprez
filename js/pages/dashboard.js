window.DashboardPage = (function () {
  let vm = null;

  function mount(params, container) {
    container.innerHTML = '<div id="dashboard-root"></div>';
    vm = new Vue({
      el: '#dashboard-root',
      template: '<div class="page-placeholder"><h1>Dashboard</h1></div>',
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
