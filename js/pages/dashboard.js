window.DashboardPage = (function () {
  let vm = null;

  function mount(params, container) {
    container.innerHTML = '<div id="dashboard-root"></div>';

    vm = new Vue({
      el: '#dashboard-root',
      data: {
        presentations: [],
        loading: true,
      },
      computed: {
        sorted: function () {
          return this.presentations.slice().sort(function (a, b) {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
          });
        },
      },
      methods: {
        formatDate: function (iso) {
          if (!iso) return '—';
          const d = new Date(iso);
          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        },
        goEdit: function (id) {
          Router.navigate('#editor/' + id);
        },
        goPlay: function (id) {
          Router.navigate('#player/' + id);
        },
        newPresentation: function () {
          const now = new Date().toISOString();
          const record = {
            title: 'Untitled Presentation',
            subtitle: '',
            client: '',
            createdAt: now,
            updatedAt: now,
            config: {
              background: { type: 'color', value: '#1a1a2e' },
              logoAssetId: null,
              fontColor: '#ffffff',
              accentColor: '#6c63ff',
              transition: 'fade',
            },
          };
          DB.put(DB.STORES.PRESENTATIONS, record).then(function (id) {
            Router.navigate('#editor/' + id);
          }).catch(function (err) {
            console.error('Failed to create presentation:', err);
          });
        },
      },
      created: function () {
        const self = this;
        DB.getAll(DB.STORES.PRESENTATIONS).then(function (rows) {
          self.presentations = rows;
          self.loading = false;
        }).catch(function (err) {
          self.loading = false;
          console.error('Failed to load presentations:', err);
        });
      },
      template: `
        <div class="dashboard">
          <header class="dashboard-header">
            <h1 class="dashboard-title">PresentationForge</h1>
            <button class="btn-primary" @click="newPresentation">+ New Presentation</button>
          </header>
          <main class="dashboard-main">
            <div v-if="loading" class="dashboard-empty">Loading…</div>
            <div v-else-if="sorted.length === 0" class="dashboard-empty">
              <p>No presentations yet.</p>
              <button class="btn-primary" @click="newPresentation">Create your first one</button>
            </div>
            <div v-else class="card-grid">
              <div v-for="p in sorted" :key="p.id" class="card">
                <div class="card-thumb">
                  <span class="card-thumb-label">{{ p.title.charAt(0) }}</span>
                </div>
                <div class="card-body">
                  <h2 class="card-title">{{ p.title }}</h2>
                  <p class="card-meta">{{ p.client || 'No client' }} &middot; {{ formatDate(p.updatedAt) }}</p>
                </div>
                <div class="card-actions">
                  <button class="btn-ghost" @click="goEdit(p.id)">Edit</button>
                  <button class="btn-ghost" @click="goPlay(p.id)">Play</button>
                </div>
              </div>
            </div>
          </main>
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
