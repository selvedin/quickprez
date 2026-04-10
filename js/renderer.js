window.Renderer = (function () {
  const FONT_SIZES = {
    sm: { coverTitle: '4rem',    coverSubtitle: '1.6rem', title: '2.8rem',  bullet: '1.4rem',  body: '1.2rem' },
    md: { coverTitle: '5.5rem',  coverSubtitle: '2rem',   title: '3.8rem',  bullet: '1.8rem',  body: '1.5rem' },
    lg: { coverTitle: '7rem',    coverSubtitle: '2.5rem', title: '5rem',    bullet: '2.2rem',  body: '1.8rem' },
    xl: { coverTitle: '9rem',    coverSubtitle: '3rem',   title: '6.5rem',  bullet: '2.8rem',  body: '2.2rem' },
  };

  function sizeFor(content) {
    return FONT_SIZES[content.fontSize] || FONT_SIZES['lg'];
  }

  function textAlignStyle(content) {
    const a = content.textAlign;
    if (a === 'center' || a === 'right') return 'text-align:' + a + ';';
    return 'text-align:left;';
  }

  function bulletJustifyStyle(content) {
    const a = content.textAlign;
    if (a === 'center') return 'justify-content:center;';
    if (a === 'right') return 'justify-content:flex-end;';
    return 'justify-content:flex-start;';
  }

  function bgStyle(config) {
    if (!config || !config.background) return '';
    const bg = config.background;
    if (bg.type === 'color') return 'background:' + bg.value + ';';
    if (bg.type === 'gradient') return 'background:' + bg.value + ';';
    return '';
  }

  function textStyle(config) {
    if (!config || !config.fontColor) return '';
    return 'color:' + config.fontColor + ';';
  }

  function accentStyle(config) {
    if (!config || !config.accentColor) return '';
    return 'color:' + config.accentColor + ';';
  }

  function escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCover(content, config) {
    const sz = sizeFor(content);
    const align = textAlignStyle(content);
    return (
      '<div class="slide slide--cover" style="' + bgStyle(config) + '">' +
        '<div class="slide-cover-inner">' +
          '<h1 class="slide-cover-title" style="font-size:' + sz.coverTitle + ';' + align + textStyle(config) + '">' + escape(content.title) + '</h1>' +
          (content.subtitle
            ? '<p class="slide-cover-subtitle" style="font-size:' + sz.coverSubtitle + ';' + align + accentStyle(config) + '">' + escape(content.subtitle) + '</p>'
            : '') +
        '</div>' +
      '</div>'
    );
  }

  function renderTextBullets(content, config, visibleCount) {
    const sz = sizeFor(content);
    const align = textAlignStyle(content);
    const justify = bulletJustifyStyle(content);
    const all = content.bullets || [];
    const count = (visibleCount === undefined) ? all.length : visibleCount;
    const bullets = all.map(function (b, i) {
      const hidden = i >= count ? 'visibility:hidden;' : '';
      return '<li class="slide-bullet" style="font-size:' + sz.bullet + ';' + justify + hidden + '"><span class="slide-bullet-marker" style="' + accentStyle(config) + '">&#9656;</span>' + escape(b) + '</li>';
    }).join('');
    return (
      '<div class="slide slide--text-bullets" style="' + bgStyle(config) + '">' +
        '<div class="slide-content">' +
          '<h2 class="slide-title" style="font-size:' + sz.title + ';' + align + textStyle(config) + '">' + escape(content.title) + '</h2>' +
          '<ul class="slide-bullets" style="' + textStyle(config) + '">' + bullets + '</ul>' +
        '</div>' +
      '</div>'
    );
  }

  function renderImageText(content, config) {
    const sz = sizeFor(content);
    const align = textAlignStyle(content);
    const pos = content.imagePosition === 'right' ? 'row-reverse' : 'row';
    return (
      '<div class="slide slide--image-text" style="' + bgStyle(config) + 'flex-direction:' + pos + ';">' +
        '<div class="slide-image-wrap">' +
          '<img class="slide-image" src="' + escape(content.imageUrl) + '" alt="" />' +
        '</div>' +
        '<div class="slide-content">' +
          '<h2 class="slide-title" style="font-size:' + sz.title + ';' + align + textStyle(config) + '">' + escape(content.title) + '</h2>' +
          '<p class="slide-body" style="font-size:' + sz.body + ';' + align + textStyle(config) + '">' + escape(content.body) + '</p>' +
        '</div>' +
      '</div>'
    );
  }

  function renderFullscreenImage(content, config) {
    return (
      '<div class="slide slide--fullscreen-image" style="' + bgStyle(config) + '">' +
        '<img class="slide-fullscreen-img" src="' + escape(content.imageUrl) + '" alt="" />' +
        (content.caption
          ? '<p class="slide-caption" style="' + accentStyle(config) + '">' + escape(content.caption) + '</p>'
          : '') +
      '</div>'
    );
  }

  function renderSlide(slide, config, visibleCount) {
    if (!slide) return '<div class="slide"></div>';
    const c = slide.content || {};
    if (slide.type === 'cover') return renderCover(c, config);
    if (slide.type === 'text-bullets') return renderTextBullets(c, config, visibleCount);
    if (slide.type === 'image-text') return renderImageText(c, config);
    if (slide.type === 'fullscreen-image') return renderFullscreenImage(c, config);
    return '<div class="slide"><p>Unknown slide type: ' + escape(slide.type) + '</p></div>';
  }

  return {
    renderSlide: renderSlide,
    renderCover: renderCover,
    renderTextBullets: renderTextBullets,
    renderImageText: renderImageText,
    renderFullscreenImage: renderFullscreenImage,
  };
})();
