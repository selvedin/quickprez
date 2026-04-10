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
        gradientColor1: '#1a1a2e',
        gradientColor2: '#6c63ff',
        gradientDirection: '135deg',
        importJson: '',
        importStatus: null,
        importErrors: [],
        importing: false,
        slides: [],
        selectedSlideId: null,
        confirmDeleteSlideId: null,
        dragSrcIndex: null,
        previewScale: 0.5,
        jsonModalOpen: false,
        jsonModalContent: '',
      },
      computed: {
        importValid: function () {
          return this.importStatus === 'valid';
        },
        selectedSlide: function () {
          const self = this;
          return self.slides.find(function (s) { return s.id === self.selectedSlideId; }) || null;
        },
        renderedSlide: function () {
          if (!this.selectedSlide || !this.presentation) return '';
          return Renderer.renderSlide(this.selectedSlide, this.presentation.config);
        },
      },
      watch: {
        loading: function (val) {
          if (!val) {
            const self = this;
            self.$nextTick(self.updatePreviewScale);
          }
        },
        slides: function () {
          const self = this;
          self.$nextTick(self.updatePreviewScale);
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
            self.saveTimer = setTimeout(function () { self.saveStatus = ''; }, 1500);
          }).catch(function (err) {
            self.saveStatus = 'Error saving';
            showToast('Auto-save failed', 'error');
            console.error(err);
          });
        },
        onFieldChange: function () { this.save(); },
        setBgTab: function (tab) {
          this.bgTab = tab;
          if (tab === 'color') {
            this.presentation.config.background = { type: 'color', value: '#1a1a2e' };
          } else {
            this.presentation.config.background = { type: 'gradient', value: this.buildGradientValue() };
          }
          this.save();
        },
        onBgColorChange: function (e) {
          this.presentation.config.background = { type: 'color', value: e.target.value };
          this.save();
        },
        buildGradientValue: function () {
          return 'linear-gradient(' + this.gradientDirection + ', ' + this.gradientColor1 + ', ' + this.gradientColor2 + ')';
        },
        onGradientChange: function () {
          this.presentation.config.background = { type: 'gradient', value: this.buildGradientValue() };
          this.save();
        },
        loadSlides: function () {
          const self = this;
          DB.getByIndex(DB.STORES.SLIDES, 'by_presentation', self.presentation.id).then(function (rows) {
            self.slides = rows.slice().sort(function (a, b) { return a.order - b.order; });
            self.importJson = JSON.stringify(self.slides.map(function (s) {
              return { type: s.type, content: s.content };
            }), null, 2);
            self.importStatus = 'valid';
            self.importErrors = [];
          }).catch(function (err) {
            showToast('Failed to load slides', 'error');
            console.error(err);
          });
        },
        selectSlide: function (id) {
          this.selectedSlideId = id;
          this.confirmDeleteSlideId = null;
        },
        askDeleteSlide: function (id) {
          this.confirmDeleteSlideId = id;
        },
        cancelDeleteSlide: function () {
          this.confirmDeleteSlideId = null;
        },
        confirmDeleteSlide: function (id) {
          const self = this;
          DB.delete(DB.STORES.SLIDES, id).then(function () {
            self.slides = self.slides.filter(function (s) { return s.id !== id; });
            if (self.selectedSlideId === id) self.selectedSlideId = null;
            self.confirmDeleteSlideId = null;
          }).catch(function (err) {
            showToast('Failed to delete slide', 'error');
            console.error(err);
          });
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
        openJsonModal: function () {
          this.jsonModalContent = this.importJson;
          this.jsonModalOpen = true;
          const self = this;
          self.$nextTick(function () {
            const ta = document.getElementById('json-modal-textarea');
            if (ta) ta.focus();
          });
        },
        closeJsonModal: function () {
          this.jsonModalOpen = false;
        },
        applyModalJson: function () {
          this.importJson = this.jsonModalContent;
          this.jsonModalOpen = false;
          this.onImportInput();
        },
        doImport: function () {
          const self = this;
          if (!self.importValid) return;
          self.importing = true;
          const parsed = JSON.parse(self.importJson);
          const presentationId = self.presentation.id;
          DB.getByIndex(DB.STORES.SLIDES, 'by_presentation', presentationId).then(function (existing) {
            return Promise.all(existing.map(function (s) { return DB.delete(DB.STORES.SLIDES, s.id); }));
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
            self.loadSlides();
            showToast('Slides imported successfully', 'success');
          }).catch(function (err) {
            self.importing = false;
            showToast('Import failed', 'error');
            console.error(err);
          });
        },
        typeLabel: function (type) {
          const labels = {
            'cover': 'Cover',
            'text-bullets': 'Bullets',
            'image-text': 'Image + Text',
            'fullscreen-image': 'Full Image',
          };
          return labels[type] || type;
        },
        onDragStart: function (e, index) {
          this.dragSrcIndex = index;
          e.dataTransfer.effectAllowed = 'move';
        },
        onDragOver: function (e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        },
        onDrop: function (e, targetIndex) {
          e.preventDefault();
          const self = this;
          if (self.dragSrcIndex === null || self.dragSrcIndex === targetIndex) return;
          const reordered = self.slides.slice();
          const moved = reordered.splice(self.dragSrcIndex, 1)[0];
          reordered.splice(targetIndex, 0, moved);
          reordered.forEach(function (s, i) { s.order = i; });
          self.slides = reordered;
          self.dragSrcIndex = null;
          Promise.all(reordered.map(function (s) {
            return DB.put(DB.STORES.SLIDES, s);
          })).catch(function (err) {
            showToast('Failed to save slide order', 'error');
            console.error(err);
          });
        },
        onDragEnd: function () {
          this.dragSrcIndex = null;
        },
        saveSlide: function (slide) {
          const self = this;
          DB.put(DB.STORES.SLIDES, slide).then(function () {
            self.syncImportJson();
          }).catch(function (err) {
            showToast('Failed to save slide', 'error');
            console.error(err);
          });
        },
        syncImportJson: function () {
          this.importJson = JSON.stringify(this.slides.map(function (s) {
            return { type: s.type, content: s.content };
          }), null, 2);
          this.importStatus = 'valid';
          this.importErrors = [];
        },
        updateBullet: function (slide, index, value) {
          Vue.set(slide.content.bullets, index, value);
          this.saveSlide(slide);
        },
        addBullet: function (slide) {
          slide.content.bullets.push('');
          this.saveSlide(slide);
        },
        removeBullet: function (slide, index) {
          slide.content.bullets.splice(index, 1);
          this.saveSlide(slide);
        },
        exportSlides: function () {
          const data = this.slides.map(function (s) {
            return { type: s.type, content: s.content };
          });
          const json = JSON.stringify(data, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = (this.presentation.title || 'slides') + '.json';
          a.click();
          URL.revokeObjectURL(url);
          showToast('Slides exported', 'success');
        },
        downloadTemplate: function () {
          const template = [
            { type: 'cover', content: { title: 'Presentation Title', subtitle: 'Subtitle or tagline' } },
            { type: 'text-bullets', content: { title: 'Section Title', bullets: ['First point', 'Second point', 'Third point'] } },
            { type: 'image-text', content: { title: 'Image & Text', body: 'Supporting copy goes here.', imageUrl: 'https://placekitten.com/800/600', imagePosition: 'left' } },
            { type: 'fullscreen-image', content: { imageUrl: 'https://placekitten.com/1280/720', caption: 'Optional caption' } },
          ];
          const json = JSON.stringify(template, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'slide-template.json';
          a.click();
          URL.revokeObjectURL(url);
          showToast('Template downloaded', 'info');
        },
        updatePreviewScale: function () {
          const frame = this.$refs.previewFrame;
          if (frame) {
            this.previewScale = frame.offsetWidth / 1280;
          }
        },
      },
      mounted: function () {
        const self = this;
        self._resizeHandler = function () { self.updatePreviewScale(); };
        window.addEventListener('resize', self._resizeHandler);
      },
      created: function () {
        const self = this;
        const id = parseInt(params.id, 10);
        DB.get(DB.STORES.PRESENTATIONS, id).then(function (record) {
          if (!record) {
            self.notFound = true;
            self.loading = false;
            return;
          }
          self.presentation = record;
          const bg = record.config.background;
          self.bgTab = bg ? bg.type : 'color';
          if (bg && bg.type === 'gradient' && bg.value) {
            const match = bg.value.match(/linear-gradient\(([^,]+),\s*(#[0-9a-fA-F]{3,8}),\s*(#[0-9a-fA-F]{3,8})\)/);
            if (match) {
              self.gradientDirection = match[1].trim();
              self.gradientColor1 = match[2].trim();
              self.gradientColor2 = match[3].trim();
            }
          }
          return DB.getByIndex(DB.STORES.SLIDES, 'by_presentation', id);
        }).then(function (rows) {
          if (rows && rows.length > 0) {
            self.slides = rows.slice().sort(function (a, b) { return a.order - b.order; });
            self.importJson = JSON.stringify(self.slides.map(function (s) {
              return { type: s.type, content: s.content };
            }), null, 2);
            self.importStatus = 'valid';
          }
          self.loading = false;
        }).catch(function (err) {
          self.loading = false;
          self.notFound = true;
          showToast('Failed to load presentation', 'error');
          console.error(err);
        });
      },
      beforeDestroy: function () {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
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
                    <div v-if="bgTab === 'gradient'" class="gradient-builder">
                      <div class="gradient-preview" :style="{ background: buildGradientValue() }"></div>
                      <div class="gradient-colors">
                        <div class="form-color-row">
                          <input type="color" class="form-color" v-model="gradientColor1" @input="onGradientChange" />
                          <span class="form-color-label">{{ gradientColor1 }}</span>
                        </div>
                        <div class="form-color-row">
                          <input type="color" class="form-color" v-model="gradientColor2" @input="onGradientChange" />
                          <span class="form-color-label">{{ gradientColor2 }}</span>
                        </div>
                      </div>
                      <div class="form-field" style="margin-top:0">
                        <label class="form-label">Direction</label>
                        <select class="form-select" v-model="gradientDirection" @change="onGradientChange">
                          <option value="to right">Left → Right</option>
                          <option value="to bottom">Top → Bottom</option>
                          <option value="135deg">Diagonal ↘</option>
                          <option value="45deg">Diagonal ↗</option>
                          <option value="to bottom right">Top-left → Bottom-right</option>
                        </select>
                      </div>
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
                    <button class="btn-ghost" @click="openJsonModal">&#9998; Edit</button>
                    <button class="btn-ghost" v-if="importJson" @click="clearImport">Clear</button>
                  </div>
                </div>

                <div class="editor-section">
                  <p class="editor-section-label">Export</p>
                  <div class="export-actions">
                    <button class="btn-ghost export-btn" :disabled="slides.length === 0" @click="exportSlides">
                      &#8659; Export slides JSON
                    </button>
                    <button class="btn-ghost export-btn" @click="downloadTemplate">
                      &#8659; Download template
                    </button>
                  </div>
                </div>

              </aside>

              <main class="editor-workspace">
                <div v-if="slides.length === 0" class="slide-list-empty">
                  <p>No slides yet.</p>
                  <p class="editor-placeholder-text">Import a JSON array using the panel on the left.</p>
                </div>
                <template v-else>
                  <div class="slide-thumbs">
                    <div
                      v-for="(slide, index) in slides"
                      :key="slide.id"
                      :class="['slide-row', selectedSlideId === slide.id ? 'slide-row--selected' : '', dragSrcIndex === index ? 'slide-row--dragging' : '']"
                      draggable="true"
                      @click="selectSlide(slide.id)"
                      @dragstart="onDragStart($event, index)"
                      @dragover="onDragOver($event)"
                      @drop="onDrop($event, index)"
                      @dragend="onDragEnd"
                    >
                      <span class="slide-row-handle">&#8942;&#8942;</span>
                      <span class="slide-row-index">{{ index + 1 }}</span>
                      <span class="slide-row-type">{{ typeLabel(slide.type) }}</span>
                      <span class="slide-row-title">{{ slide.content.title || slide.content.imageUrl || '—' }}</span>
                      <div class="slide-row-actions" @click.stop>
                        <template v-if="confirmDeleteSlideId === slide.id">
                          <button class="btn-danger" @click="confirmDeleteSlide(slide.id)">Delete</button>
                          <button class="btn-ghost" @click="cancelDeleteSlide">Cancel</button>
                        </template>
                        <button v-else class="btn-ghost slide-row-delete" @click="askDeleteSlide(slide.id)">&#x2715;</button>
                      </div>
                    </div>
                  </div>
                  <div v-if="selectedSlide" class="slide-content-editor">
                    <p class="slide-content-editor-label">{{ typeLabel(selectedSlide.type) }}</p>

                    <template v-if="selectedSlide.type === 'cover'">
                      <div class="form-field">
                        <label class="form-label">Title</label>
                        <input class="form-input" v-model="selectedSlide.content.title" @input="saveSlide(selectedSlide)" />
                      </div>
                      <div class="form-field">
                        <label class="form-label">Subtitle</label>
                        <input class="form-input" v-model="selectedSlide.content.subtitle" @input="saveSlide(selectedSlide)" />
                      </div>
                    </template>

                    <template v-if="selectedSlide.type === 'text-bullets'">
                      <div class="form-field">
                        <label class="form-label">Title</label>
                        <input class="form-input" v-model="selectedSlide.content.title" @input="saveSlide(selectedSlide)" />
                      </div>
                      <div class="form-field">
                        <label class="form-label">Bullets</label>
                        <div v-for="(bullet, bi) in selectedSlide.content.bullets" :key="bi" class="bullet-row">
                          <input class="form-input" :value="bullet" @input="updateBullet(selectedSlide, bi, $event.target.value)" />
                          <button class="btn-ghost bullet-remove" @click="removeBullet(selectedSlide, bi)">&#x2715;</button>
                        </div>
                        <button class="btn-ghost bullet-add" @click="addBullet(selectedSlide)">+ Add bullet</button>
                      </div>
                    </template>

                    <template v-if="selectedSlide.type === 'image-text'">
                      <div class="form-field">
                        <label class="form-label">Title</label>
                        <input class="form-input" v-model="selectedSlide.content.title" @input="saveSlide(selectedSlide)" />
                      </div>
                      <div class="form-field">
                        <label class="form-label">Body text</label>
                        <textarea class="form-textarea" rows="4" v-model="selectedSlide.content.body" @input="saveSlide(selectedSlide)"></textarea>
                      </div>
                      <div class="form-field">
                        <label class="form-label">Image URL</label>
                        <input class="form-input" v-model="selectedSlide.content.imageUrl" @input="saveSlide(selectedSlide)" />
                      </div>
                      <div class="form-field">
                        <label class="form-label">Image position</label>
                        <select class="form-select" v-model="selectedSlide.content.imagePosition" @change="saveSlide(selectedSlide)">
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </template>

                    <template v-if="selectedSlide.type === 'fullscreen-image'">
                      <div class="form-field">
                        <label class="form-label">Image URL</label>
                        <input class="form-input" v-model="selectedSlide.content.imageUrl" @input="saveSlide(selectedSlide)" />
                      </div>
                      <div class="form-field">
                        <label class="form-label">Caption</label>
                        <input class="form-input" v-model="selectedSlide.content.caption" @input="saveSlide(selectedSlide)" />
                      </div>
                    </template>
                  </div>

                  <div class="slide-preview-panel">
                    <div class="slide-preview-frame" ref="previewFrame">
                      <div v-if="selectedSlide"
                           class="slide-preview-scaler"
                           :style="{ transform: 'scale(' + previewScale + ')', width: '1280px', height: '720px' }"
                           v-html="renderedSlide">
                      </div>
                      <div v-else class="slide-preview-empty">
                        <p>Select a slide to preview</p>
                      </div>
                    </div>
                  </div>
                </template>
              </main>
            </div>
          </template>

          <div v-if="jsonModalOpen" class="json-modal-overlay" @click.self="closeJsonModal">
            <div class="json-modal">
              <div class="json-modal-header">
                <span class="json-modal-title">Edit JSON</span>
                <button class="btn-ghost json-modal-close" @click="closeJsonModal">&#x2715;</button>
              </div>
              <textarea
                id="json-modal-textarea"
                class="json-modal-textarea"
                v-model="jsonModalContent"
                spellcheck="false"
              ></textarea>
              <div class="json-modal-footer">
                <button class="btn-ghost" @click="closeJsonModal">Cancel</button>
                <button class="btn-primary" @click="applyModalJson">Apply</button>
              </div>
            </div>
          </div>
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
