window.Renderer = (function () {
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
    return (
      '<div class="slide slide--cover" style="' + bgStyle(config) + '">' +
        '<div class="slide-cover-inner">' +
          '<h1 class="slide-cover-title" style="' + textStyle(config) + '">' + escape(content.title) + '</h1>' +
          (content.subtitle
            ? '<p class="slide-cover-subtitle" style="' + accentStyle(config) + '">' + escape(content.subtitle) + '</p>'
            : '') +
        '</div>' +
      '</div>'
    );
  }

  function renderTextBullets(content, config) {
    const bullets = (content.bullets || []).map(function (b) {
      return '<li class="slide-bullet"><span class="slide-bullet-marker" style="' + accentStyle(config) + '">&#9656;</span>' + escape(b) + '</li>';
    }).join('');
    return (
      '<div class="slide slide--text-bullets" style="' + bgStyle(config) + '">' +
        '<div class="slide-content">' +
          '<h2 class="slide-title" style="' + textStyle(config) + '">' + escape(content.title) + '</h2>' +
          '<ul class="slide-bullets" style="' + textStyle(config) + '">' + bullets + '</ul>' +
        '</div>' +
      '</div>'
    );
  }

  function renderImageText(content, config) {
    const pos = content.imagePosition === 'right' ? 'row-reverse' : 'row';
    return (
      '<div class="slide slide--image-text" style="' + bgStyle(config) + 'flex-direction:' + pos + ';">' +
        '<div class="slide-image-wrap">' +
          '<img class="slide-image" src="' + escape(content.imageUrl) + '" alt="" />' +
        '</div>' +
        '<div class="slide-content">' +
          '<h2 class="slide-title" style="' + textStyle(config) + '">' + escape(content.title) + '</h2>' +
          '<p class="slide-body" style="' + textStyle(config) + '">' + escape(content.body) + '</p>' +
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

  function renderSlide(slide, config) {
    if (!slide) return '<div class="slide"></div>';
    const c = slide.content || {};
    if (slide.type === 'cover') return renderCover(c, config);
    if (slide.type === 'text-bullets') return renderTextBullets(c, config);
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
