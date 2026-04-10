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
        sorted: function () {
          return this.presentations.slice().sort(function (a, b) {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
          });
        },
        generatedPrompt: function () {
          const topic = this.promptTopic.trim() || '[DESCRIBE YOUR PRESENTATION TOPIC HERE]';
          const slides = this.promptSlides.trim() || '8';
          const tone = this.promptTone.trim() || '[e.g. professional, casual, technical, inspiring]';
          const audience = this.promptAudience.trim() || '[e.g. investors, developers, students, clients]';
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
            '- Output only the raw JSON array, starting with [ and ending with ].\n\n' +
            'Topic: ' + topic + '\n' +
            'Number of slides: ' + slides + '\n' +
            'Tone: ' + tone + '\n' +
            'Audience: ' + audience;
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
            showToast('Failed to create presentation', 'error');
            console.error(err);
          });
        },
        askDelete: function (id) {
          this.confirmDeleteId = id;
        },
        cancelDelete: function () {
          this.confirmDeleteId = null;
        },
        confirmDelete: function (id) {
          const self = this;
          DB.delete(DB.STORES.PRESENTATIONS, id).then(function () {
            return DB.getByIndex(DB.STORES.SLIDES, 'by_presentation', id);
          }).then(function (slides) {
            return Promise.all(slides.map(function (s) {
              return DB.delete(DB.STORES.SLIDES, s.id);
            }));
          }).then(function () {
            self.presentations = self.presentations.filter(function (p) {
              return p.id !== id;
            });
            self.confirmDeleteId = null;
          }).catch(function (err) {
            self.confirmDeleteId = null;
            showToast('Failed to delete presentation', 'error');
            console.error(err);
          });
        },
        openPromptModal: function () {
          this.promptCopied = false;
          this.promptModalOpen = true;
        },
        closePromptModal: function () {
          this.promptModalOpen = false;
        },
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
          showToast('Failed to load presentations', 'error');
          console.error(err);
        });
      },
      template: `
        <div class="dashboard">
          <header class="dashboard-header">
            <h1 class="dashboard-title">PresentationForge</h1>
            <div class="dashboard-header-actions">
              <button class="btn-ghost" @click="openPromptModal">&#10022; AI Prompt</button>
              <button class="btn-primary" @click="newPresentation">+ New Presentation</button>
            </div>
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
                <div v-if="confirmDeleteId === p.id" class="card-confirm">
                  <span class="card-confirm-text">Delete this presentation?</span>
                  <button class="btn-danger" @click="confirmDelete(p.id)">Delete</button>
                  <button class="btn-ghost" @click="cancelDelete">Cancel</button>
                </div>
                <div v-else class="card-actions">
                  <button class="btn-ghost" @click="goEdit(p.id)">Edit</button>
                  <button class="btn-ghost" @click="goPlay(p.id)">Play</button>
                  <button class="btn-danger" style="margin-left:auto" @click="askDelete(p.id)">Delete</button>
                </div>
              </div>
            </div>
          </main>

          <div v-if="promptModalOpen" class="json-modal-overlay" @click.self="closePromptModal">
            <div class="json-modal prompt-modal">
              <div class="json-modal-header">
                <span class="json-modal-title">AI Prompt Generator</span>
                <button class="btn-ghost json-modal-close" @click="closePromptModal">&#x2715;</button>
              </div>
              <div class="prompt-modal-body">
                <div class="prompt-fields">
                  <div class="form-field">
                    <label class="form-label">Topic</label>
                    <input class="form-input" v-model="promptTopic" placeholder="e.g. The future of renewable energy" />
                  </div>
                  <div class="prompt-fields-row">
                    <div class="form-field">
                      <label class="form-label">Slides</label>
                      <input class="form-input" type="number" min="1" max="30" v-model="promptSlides" />
                    </div>
                    <div class="form-field">
                      <label class="form-label">Tone</label>
                      <select class="form-select" v-model="promptTone">
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="technical">Technical</option>
                        <option value="inspiring">Inspiring</option>
                        <option value="educational">Educational</option>
                        <option value="persuasive">Persuasive</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-field">
                    <label class="form-label">Audience</label>
                    <input class="form-input" v-model="promptAudience" placeholder="e.g. investors, developers, students" />
                  </div>
                </div>
                <div class="prompt-output-wrap">
                  <label class="form-label">Generated prompt</label>
                  <textarea class="prompt-output" readonly :value="generatedPrompt"></textarea>
                </div>
              </div>
              <div class="json-modal-footer">
                <button class="btn-ghost" @click="closePromptModal">Close</button>
                <button class="btn-primary" @click="copyPrompt">
                  {{ promptCopied ? '&#10003; Copied!' : '&#128203; Copy prompt' }}
                </button>
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
