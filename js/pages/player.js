window.PlayerPage = (function () {
  let vm = null;

  function mount(params, container) {
    container.innerHTML = '<div id="player-root"></div>';

    vm = new Vue({
      el: '#player-root',
      data: {
        presentation: null,
        slides: [],
        currentIndex: 0,
        loading: true,
        notFound: false,
        controlsVisible: true,
        mouseTimer: null,
        transitionActive: false,
        slideHtml: '',
        visibleBullets: null,
      },
      computed: {
        tx: function () { return I18n.tx(); },
        currentSlide: function () {
          return this.slides[this.currentIndex] || null;
        },
        progress: function () {
          if (this.slides.length === 0) return 0;
          return ((this.currentIndex + 1) / this.slides.length) * 100;
        },
      },
      methods: {
        renderCurrent: function (vb) {
          const slide = this.currentSlide;
          const count = (vb === undefined) ? this.visibleBullets : vb;
          this.slideHtml = Renderer.renderSlide(slide, this.presentation.config, count === null ? undefined : count);
        },
        initSlide: function (index) {
          this.currentIndex = index;
          const slide = this.slides[index];
          if (slide && slide.type === 'text-bullets' && slide.content.bulletReveal) {
            this.visibleBullets = 0;
          } else {
            this.visibleBullets = null;
          }
          this.renderCurrent();
        },
        goNext: function () {
          const slide = this.currentSlide;
          if (slide && slide.type === 'text-bullets' && slide.content.bulletReveal) {
            const total = (slide.content.bullets || []).length;
            if (this.visibleBullets < total) {
              this.visibleBullets++;
              this.renderCurrent();
              return;
            }
          }
          if (this.currentIndex < this.slides.length - 1) {
            this.navigateTo(this.currentIndex + 1);
          }
        },
        goPrev: function () {
          if (this.currentIndex > 0) {
            this.navigateTo(this.currentIndex - 1);
          }
        },
        navigateTo: function (index) {
          const self = this;
          if (self.transitionActive) return;
          const transition = self.presentation && self.presentation.config && self.presentation.config.transition;

          if (transition === 'fade') {
            self.transitionActive = true;
            const el = document.querySelector('.player-slide-inner');
            if (el) el.style.opacity = '0';
            setTimeout(function () {
              self.initSlide(index);
              self.$nextTick(function () {
                const next = document.querySelector('.player-slide-inner');
                if (next) {
                  next.style.transition = 'none';
                  next.style.opacity = '0';
                  requestAnimationFrame(function () {
                    next.style.transition = 'opacity 300ms ease';
                    next.style.opacity = '1';
                  });
                }
                self.transitionActive = false;
              });
            }, 300);
          } else if (transition === 'slide') {
            self.transitionActive = true;
            const goingForward = index > self.currentIndex;
            const el = document.querySelector('.player-slide-inner');
            if (el) {
              el.style.transition = 'transform 300ms ease';
              el.style.transform = goingForward ? 'translateX(-100%)' : 'translateX(100%)';
            }
            setTimeout(function () {
              self.initSlide(index);
              self.$nextTick(function () {
                const next = document.querySelector('.player-slide-inner');
                if (next) {
                  next.style.transition = 'none';
                  next.style.transform = goingForward ? 'translateX(100%)' : 'translateX(-100%)';
                  requestAnimationFrame(function () {
                    next.style.transition = 'transform 300ms ease';
                    next.style.transform = 'translateX(0)';
                  });
                }
                self.transitionActive = false;
              });
            }, 300);
          } else {
            self.initSlide(index);
          }
        },
        exitPlayer: function () {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            Router.navigate('#editor/' + params.id);
          }
        },
        onMouseMove: function () {
          const self = this;
          self.controlsVisible = true;
          if (self.mouseTimer) clearTimeout(self.mouseTimer);
          self.mouseTimer = setTimeout(function () {
            self.controlsVisible = false;
          }, 2000);
        },
      },
      mounted: function () {
        const self = this;

        const id = parseInt(params.id, 10);
        DB.get(DB.STORES.PRESENTATIONS, id).then(function (record) {
          if (!record) {
            self.notFound = true;
            self.loading = false;
            return;
          }
          self.presentation = record;
          return DB.getByIndex(DB.STORES.SLIDES, 'by_presentation', id);
        }).then(function (rows) {
          if (rows) {
            self.slides = rows.slice().sort(function (a, b) { return a.order - b.order; });
            self.initSlide(0);
          }
          self.loading = false;
        }).catch(function (err) {
          self.loading = false;
          self.notFound = true;
          console.error('Failed to load player:', err);
        });

        self._keyHandler = function (e) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault();
            self.goNext();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            self.goPrev();
          } else if (e.key === 'Escape') {
            self.exitPlayer();
          }
        };
        document.addEventListener('keydown', self._keyHandler);

        self._fsHandler = function () {
          if (!document.fullscreenElement) {
            Router.navigate('#editor/' + params.id);
          }
        };
        document.addEventListener('fullscreenchange', self._fsHandler);

        self._mouseMoveHandler = function () { self.onMouseMove(); };
        container.addEventListener('mousemove', self._mouseMoveHandler);

        self.mouseTimer = setTimeout(function () {
          self.controlsVisible = false;
        }, 2000);

        container.requestFullscreen().catch(function (err) {
          console.error('Fullscreen request failed:', err);
        });
      },
      beforeDestroy: function () {
        if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
        if (this._fsHandler) document.removeEventListener('fullscreenchange', this._fsHandler);
        if (this._mouseMoveHandler) {
          const cont = document.getElementById('app');
          if (cont) cont.removeEventListener('mousemove', this._mouseMoveHandler);
        }
        if (this.mouseTimer) clearTimeout(this.mouseTimer);
      },
      template: `
        <div class="player">
          <div v-if="loading" class="player-loading">{{ tx.playerLoading }}</div>
          <div v-else-if="notFound" class="player-not-found">
            <p>{{ tx.playerNotFound }}</p>
          </div>
          <template v-else>
            <div class="player-stage">
              <div class="player-slide-inner" v-html="slideHtml"></div>
            </div>
            <div :class="['player-controls', controlsVisible ? '' : 'player-controls--hidden']">
              <button class="player-btn" @click="exitPlayer">{{ tx.exitPlayer }}</button>
              <button class="player-btn" :disabled="currentIndex === 0" @click="goPrev">&#8592;</button>
              <span class="player-counter">{{ currentIndex + 1 }} / {{ slides.length }}</span>
              <button class="player-btn" :disabled="currentIndex === slides.length - 1" @click="goNext">&#8594;</button>
            </div>
            <div class="player-progress">
              <div class="player-progress-bar" :style="{ width: progress + '%' }"></div>
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
