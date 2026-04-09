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
        bgTab: 'color',
      },
      computed: {
        bgStyle: function () {
          if (!this.presentation) return {};
          const bg = this.presentation.config.background;
          if (bg.type === 'color') return { background: bg.value };
          if (bg.type === 'gradient') return { background: bg.value };
          return {};
        },
      },
      methods: {
        goBack: function () {
          Router.navigate('#dashboard');
        },
        goPlay: function () {
          Router.navigate('#player/' + this.presentation.id);
        },
        save: function () {
          const self = this;
          self.saveStatus = 'Saving…';
          self.presentation.updatedAt = new Date().toISOString();
          DB.put(DB.STORES.PRESENTATIONS, self.presentation).then(function () {
            self.saveStatus = 'Saved';
            if (self.saveTimer) clearTimeout(self.saveTimer);
            self.saveTimer = setTimeout(function () {
              self.saveStatus = '';
            }, 1500);
          }).catch(function (err) {
            self.saveStatus = 'Error saving';
            console.error('Auto-save failed:', err);
          });
        },
        onFieldChange: function () {
          this.save();
        },
        setBgTab: function (tab) {
          this.bgTab = tab;
          this.presentation.config.background = { type: tab, value: tab === 'color' ? '#1a1a2e' : '' };
          this.save();
        },
        onBgColorChange: function (e) {
          this.presentation.config.background = { type: 'color', value: e.target.value };
          this.save();
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
            self.bgTab = record.config.background ? record.config.background.type : 'color';
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
                  <div class="form-field">
                    <label class="form-label">Title</label>
                    <input class="form-input" type="text" v-model="presentation.title" @input="onFieldChange" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">Subtitle</label>
                    <input class="form-input" type="text" v-model="presentation.subtitle" @input="onFieldChange" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">Client</label>
                    <input class="form-input" type="text" v-model="presentation.client" @input="onFieldChange" />
                  </div>
                </div>

                <div class="editor-section">
                  <p class="editor-section-label">Appearance</p>
                  <div class="form-field">
                    <label class="form-label">Background</label>
                    <div class="segmented">
                      <button :class="['seg-btn', bgTab === 'color' ? 'seg-btn--active' : '']" @click="setBgTab('color')">Color</button>
                      <button :class="['seg-btn', bgTab === 'gradient' ? 'seg-btn--active' : '']" @click="setBgTab('gradient')">Gradient</button>
                    </div>
                    <div v-if="bgTab === 'color'" class="form-color-row">
                      <input type="color" class="form-color" :value="presentation.config.background.value" @input="onBgColorChange" />
                      <span class="form-color-label">{{ presentation.config.background.value }}</span>
                    </div>
                    <div v-if="bgTab === 'gradient'" class="form-color-row">
                      <span class="editor-placeholder-text">Gradient builder coming in a later story</span>
                    </div>
                  </div>
                  <div class="form-field">
                    <label class="form-label">Font color</label>
                    <div class="form-color-row">
                      <input type="color" class="form-color" v-model="presentation.config.fontColor" @input="onFieldChange" />
                      <span class="form-color-label">{{ presentation.config.fontColor }}</span>
                    </div>
                  </div>
                  <div class="form-field">
                    <label class="form-label">Accent color</label>
                    <div class="form-color-row">
                      <input type="color" class="form-color" v-model="presentation.config.accentColor" @input="onFieldChange" />
                      <span class="form-color-label">{{ presentation.config.accentColor }}</span>
                    </div>
                  </div>
                  <div class="form-field">
                    <label class="form-label">Transition</label>
                    <select class="form-select" v-model="presentation.config.transition" @change="onFieldChange">
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="none">None</option>
                    </select>
                  </div>
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
