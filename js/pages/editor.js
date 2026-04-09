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
        importJson: '',
        importStatus: null,
        importErrors: [],
        importing: false,
      },
      computed: {
        bgStyle: function () {
          if (!this.presentation) return {};
          const bg = this.presentation.config.background;
          if (bg.type === 'color') return { background: bg.value };
          if (bg.type === 'gradient') return { background: bg.value };
          return {};
        },
        importValid: function () {
          return this.importStatus === 'valid';
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
        onImportInput: function () {
          const self = this;
          self.importStatus = null;
          self.importErrors = [];
          if (!self.importJson.trim()) return;
          let parsed;
          try {
            parsed = JSON.parse(self.importJson);
          } catch (e) {
            self.importStatus = 'invalid';
            self.importErrors = [{ index: null, field: 'JSON', message: 'Invalid JSON: ' + e.message }];
            return;
          }
          const result = Validator.validateSlides(parsed);
          if (result.valid) {
            self.importStatus = 'valid';
            self.importErrors = [];
          } else {
            self.importStatus = 'invalid';
            self.importErrors = result.errors;
          }
        },
        clearImport: function () {
          this.importJson = '';
          this.importStatus = null;
          this.importErrors = [];
        },
        doImport: function () {
          const self = this;
          if (!self.importValid) return;
          self.importing = true;
          const parsed = JSON.parse(self.importJson);
          const presentationId = self.presentation.id;

          DB.getByIndex(DB.STORES.SLIDES, 'by_presentation', presentationId).then(function (existing) {
            return Promise.all(existing.map(function (s) {
              return DB.delete(DB.STORES.SLIDES, s.id);
            }));
          }).then(function () {
            return Promise.all(parsed.map(function (slide, index) {
              return DB.put(DB.STORES.SLIDES, {
                presentationId: presentationId,
                order: index,
                type: slide.type,
                content: slide.content,
              });
            }));
          }).then(function () {
            self.importing = false;
            self.clearImport();
          }).catch(function (err) {
            self.importing = false;
            console.error('Import failed:', err);
          });
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
                      <span class="editor-placeholder-text">Gradient builder coming soon</span>
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
                  <textarea
                    class="form-textarea"
                    placeholder="Paste slide JSON array here…"
                    v-model="importJson"
                    @input="onImportInput"
                    rows="8"
                  ></textarea>
                  <div v-if="importStatus === 'valid'" class="import-status import-status--valid">
                    &#10003; Valid — {{ JSON.parse(importJson).length }} slide(s) ready
                  </div>
                  <div v-if="importErrors.length > 0" class="import-error-list">
                    <div v-for="(e, i) in importErrors" :key="i" class="import-error-item">
                      <span class="import-error-loc">{{ e.index !== null ? 'Slide ' + e.index + ' · ' : '' }}{{ e.field }}</span>
                      <span class="import-error-msg">{{ e.message }}</span>
                    </div>
                  </div>
                  <div class="import-actions">
                    <button class="btn-primary" :disabled="!importValid || importing" @click="doImport">
                      {{ importing ? 'Importing…' : 'Import slides' }}
                    </button>
                    <button class="btn-ghost" v-if="importJson" @click="clearImport">Clear</button>
                  </div>
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
