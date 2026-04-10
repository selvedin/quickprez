window.DashboardPage = (function () {
  let vm = null;

  function mount(params, container) {
    container.innerHTML = '<div id="dashboard-root"></div>';

    vm = new Vue({
      el: '#dashboard-root',
      data: {
        presentations: [],
        loading: true,
        confirmDeleteId: null,
        promptModalOpen: false,
        promptTopic: '',
        promptSlides: '8',
        promptTone: 'professional',
        promptAudience: '',
        promptCopied: false,
      },
      computed: {
        tx: function () { return I18n.tx(); },
        languages: function () { return I18n.languages; },
        currentLang: function () { return I18n.state.lang; },
        sorted: function () {
          return this.presentations.slice().sort(function (a, b) {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
          });
        },
        generatedPrompt: function () {
          const tx = this.tx;
          const topic = this.promptTopic.trim() || '[' + tx.topicPlaceholder + ']';
          const slides = this.promptSlides.trim() || '8';
          const tone = tx.tones[this.promptTone] || this.promptTone;
          const audience = this.promptAudience.trim() || '[' + tx.audiencePlaceholder + ']';
          const lang = I18n.languages.find(function (l) { return l.code === I18n.state.lang; });
          const langName = lang ? lang.label : 'English';
          return 'Generate a presentation as a JSON array for the PresentationForge app.\n' +
            'The output must be a valid JSON array of slide objects. No markdown, no explanation — raw JSON only.\n\n' +
            'Each slide has this shape:\n' +
            '{\n  "type": "<slide-type>",\n  "content": { ... }\n}\n\n' +
            'Supported slide types and their required content fields:\n\n' +
            '1. "cover"\n   - title (string, required)\n   - subtitle (string, optional)\n\n' +
            '2. "text-bullets"\n   - title (string, required)\n   - bullets (array of strings, at least 1 item, required)\n\n' +
            '3. "image-text"\n   - title (string, required)\n   - body (string, required)\n   - imageUrl (string, required — use a real or placeholder image URL)\n   - imagePosition ("left" or "right", optional, default "left")\n\n' +
            '4. "fullscreen-image"\n   - imageUrl (string, required — use a real or placeholder image URL)\n   - caption (string, optional)\n\n' +
            'Rules:\n' +
            '- The array must contain at least 1 slide.\n' +
            '- Start with a "cover" slide.\n' +
            '- Use "text-bullets" for key points or sections.\n' +
            '- Use "image-text" when combining visuals with explanation.\n' +
            '- Use "fullscreen-image" for impact moments or visual breaks.\n' +
            '- All string values must be non-empty.\n' +
            '- Output only the raw JSON array, starting with [ and ending with ].\n' +
            '- Generate all slide content in ' + langName + '.\n\n' +
            'Topic: ' + topic + '\n' +
            'Number of slides: ' + slides + '\n' +
            'Tone: ' + tone + '\n' +
            'Audience: ' + audience;
        },
      },
      methods: {
        setLang: function (code) { I18n.setLang(code); },
        formatDate: function (iso) {
          if (!iso) return '—';
          const d = new Date(iso);
          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        },
        goEdit: function (id) { Router.navigate('#editor/' + id); },
        goPlay: function (id) { Router.navigate('#player/' + id); },
        newPresentation: function () {
          const self = this;
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
            showToast(self.tx.errorSaving, 'error');
            console.error(err);
          });
        },
        askDelete: function (id) { this.confirmDeleteId = id; },
        cancelDelete: function () { this.confirmDeleteId = null; },
        confirmDelete: function (id) {
          const self = this;
          DB.delete(DB.STORES.PRESENTATIONS, id).then(function () {
            return DB.getByIndex(DB.STORES.SLIDES, 'by_presentation', id);
          }).then(function (slides) {
            return Promise.all(slides.map(function (s) {
              return DB.delete(DB.STORES.SLIDES, s.id);
            }));
          }).then(function () {
            self.presentations = self.presentations.filter(function (p) { return p.id !== id; });
            self.confirmDeleteId = null;
          }).catch(function (err) {
            self.confirmDeleteId = null;
            showToast('Error', 'error');
            console.error(err);
          });
        },
        openPromptModal: function () {
          this.promptCopied = false;
          this.promptModalOpen = true;
        },
        closePromptModal: function () { this.promptModalOpen = false; },
        copyPrompt: function () {
          const self = this;
          navigator.clipboard.writeText(self.generatedPrompt).then(function () {
            self.promptCopied = true;
            setTimeout(function () { self.promptCopied = false; }, 2000);
          }).catch(function () {
            showToast('Failed to copy to clipboard', 'error');
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
          console.error(err);
        });
      },
      template: `
        <div class="dashboard">
          <header class="dashboard-header">
            <h1 class="dashboard-title">PresentationForge</h1>
            <div class="dashboard-header-actions">
              <select class="lang-select" :value="currentLang" @change="setLang($event.target.value)">
                <option v-for="l in languages" :key="l.code" :value="l.code">{{ l.label }}</option>
              </select>
              <button class="btn-ghost" @click="openPromptModal">&#10022; {{ tx.aiPrompt }}</button>
              <button class="btn-primary" @click="newPresentation">{{ tx.newPresentation }}</button>
            </div>
          </header>
          <main class="dashboard-main">
            <div v-if="loading" class="dashboard-empty">{{ tx.loading }}</div>
            <div v-else-if="sorted.length === 0" class="dashboard-empty">
              <p>{{ tx.noPresentations }}</p>
              <button class="btn-primary" @click="newPresentation">{{ tx.createFirst }}</button>
            </div>
            <div v-else class="card-grid">
              <div v-for="p in sorted" :key="p.id" class="card">
                <div class="card-thumb">
                  <span class="card-thumb-label">{{ p.title.charAt(0) }}</span>
                </div>
                <div class="card-body">
                  <h2 class="card-title">{{ p.title }}</h2>
                  <p class="card-meta">{{ p.client || tx.noClient }} &middot; {{ formatDate(p.updatedAt) }}</p>
                </div>
                <div v-if="confirmDeleteId === p.id" class="card-confirm">
                  <span class="card-confirm-text">{{ tx.deleteConfirm }}</span>
                  <button class="btn-danger" @click="confirmDelete(p.id)">{{ tx.delete }}</button>
                  <button class="btn-ghost" @click="cancelDelete">{{ tx.cancel }}</button>
                </div>
                <div v-else class="card-actions">
                  <button class="btn-ghost" @click="goEdit(p.id)">{{ tx.edit }}</button>
                  <button class="btn-ghost" @click="goPlay(p.id)">{{ tx.play }}</button>
                  <button class="btn-danger" style="margin-left:auto" @click="askDelete(p.id)">{{ tx.delete }}</button>
                </div>
              </div>
            </div>
          </main>

          <div v-if="promptModalOpen" class="json-modal-overlay" @click.self="closePromptModal">
            <div class="json-modal prompt-modal">
              <div class="json-modal-header">
                <span class="json-modal-title">{{ tx.promptModalTitle }}</span>
                <button class="btn-ghost json-modal-close" @click="closePromptModal">&#x2715;</button>
              </div>
              <div class="prompt-modal-body">
                <div class="prompt-fields">
                  <div class="form-field">
                    <label class="form-label">{{ tx.topicLabel }}</label>
                    <input class="form-input" v-model="promptTopic" :placeholder="tx.topicPlaceholder" />
                  </div>
                  <div class="prompt-fields-row">
                    <div class="form-field">
                      <label class="form-label">{{ tx.slidesLabel }}</label>
                      <input class="form-input" type="number" min="1" max="30" v-model="promptSlides" />
                    </div>
                    <div class="form-field">
                      <label class="form-label">{{ tx.toneLabel }}</label>
                      <select class="form-select" v-model="promptTone">
                        <option v-for="(label, key) in tx.tones" :key="key" :value="key">{{ label }}</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-field">
                    <label class="form-label">{{ tx.audienceLabel }}</label>
                    <input class="form-input" v-model="promptAudience" :placeholder="tx.audiencePlaceholder" />
                  </div>
                </div>
                <div class="prompt-output-wrap">
                  <label class="form-label">{{ tx.generatedPromptLabel }}</label>
                  <textarea class="prompt-output" readonly :value="generatedPrompt"></textarea>
                </div>
              </div>
              <div class="json-modal-footer">
                <button class="btn-ghost" @click="closePromptModal">{{ tx.close }}</button>
                <button class="btn-primary" @click="copyPrompt">
                  {{ promptCopied ? tx.copied : tx.copyPrompt }}
                </button>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  function unmount() {
    if (vm) { vm.$destroy(); vm = null; }
  }

  return { mount: mount, unmount: unmount };
})();
