window.EditorPage = (function () {
  let vm = null;

  function mount(params, container) {
    container.innerHTML = '<div id="editor-root"></div>';

    vm = new Vue({
      el: '#editor-root',
      data: {
        presentation: null,
        loading: true,
        notFound: false,
        saveStatus: '',
        saveTimer: null,
      },
      methods: {
        goBack: function () {
          Router.navigate('#dashboard');
        },
        goPlay: function () {
          Router.navigate('#player/' + this.presentation.id);
        },
      },
      created: function () {
        const self = this;
        const id = parseInt(params.id, 10);
        DB.get(DB.STORES.PRESENTATIONS, id).then(function (record) {
          if (!record) {
            self.notFound = true;
          } else {
            self.presentation = record;
          }
          self.loading = false;
        }).catch(function (err) {
          self.loading = false;
          self.notFound = true;
          console.error('Failed to load presentation:', err);
        });
      },
      beforeDestroy: function () {
        if (this.saveTimer) clearTimeout(this.saveTimer);
      },
      template: `
        <div class="editor" v-if="!loading">
          <div v-if="notFound" class="editor-not-found">
            <p>Presentation not found.</p>
            <button class="btn-primary" @click="goBack">Back to Dashboard</button>
          </div>
          <template v-else>
            <header class="editor-header">
              <button class="btn-ghost editor-back" @click="goBack">&#8592; Dashboard</button>
              <span class="editor-header-title">{{ presentation.title }}</span>
              <span class="editor-save-status">{{ saveStatus }}</span>
              <button class="btn-primary" @click="goPlay">&#9654; Play</button>
            </header>
            <div class="editor-body">
              <aside class="editor-panel">
                <div class="editor-section">
                  <p class="editor-section-label">Meta</p>
                  <p class="editor-placeholder-text">Config fields coming soon</p>
                </div>
                <div class="editor-section">
                  <p class="editor-section-label">Appearance</p>
                  <p class="editor-placeholder-text">Appearance fields coming soon</p>
                </div>
                <div class="editor-section">
                  <p class="editor-section-label">Import JSON</p>
                  <p class="editor-placeholder-text">JSON importer coming soon</p>
                </div>
              </aside>
              <main class="editor-workspace">
                <p class="editor-placeholder-text">Slides will appear here</p>
              </main>
            </div>
          </template>
        </div>
      `,
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
