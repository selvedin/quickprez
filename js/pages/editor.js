window.EditorPage = (function () {
  let vm = null;

  function mount(params, container) {
    container.innerHTML = '<div id="editor-root"></div>';
    vm = new Vue({
      el: '#editor-root',
      template: '<div class="page-placeholder"><h1>Editor — id: {{ id }}</h1></div>',
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
