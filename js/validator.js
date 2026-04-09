window.Validator = (function () {
  const VALID_TYPES = ['cover', 'text-bullets', 'image-text', 'fullscreen-image'];

  function err(index, field, message) {
    return { index: index, field: field, message: message };
  }

  function validateSlide(slide, index) {
    const errors = [];

    if (!slide || typeof slide !== 'object') {
      errors.push(err(index, 'type', 'Slide must be an object'));
      return errors;
    }

    if (!VALID_TYPES.includes(slide.type)) {
      errors.push(err(index, 'type', 'Must be one of: ' + VALID_TYPES.join(', ')));
      return errors;
    }

    const c = slide.content;

    if (!c || typeof c !== 'object') {
      errors.push(err(index, 'content', 'Must be an object'));
      return errors;
    }

    if (slide.type === 'cover') {
      if (!c.title || typeof c.title !== 'string' || c.title.trim() === '') {
        errors.push(err(index, 'content.title', 'Must be a non-empty string'));
      }
    }

    if (slide.type === 'text-bullets') {
      if (!c.title || typeof c.title !== 'string' || c.title.trim() === '') {
        errors.push(err(index, 'content.title', 'Must be a non-empty string'));
      }
      if (!Array.isArray(c.bullets) || c.bullets.length === 0) {
        errors.push(err(index, 'content.bullets', 'Must be a non-empty array'));
      }
    }

    if (slide.type === 'image-text') {
      if (!c.title || typeof c.title !== 'string' || c.title.trim() === '') {
        errors.push(err(index, 'content.title', 'Must be a non-empty string'));
      }
      if (!c.body || typeof c.body !== 'string' || c.body.trim() === '') {
        errors.push(err(index, 'content.body', 'Must be a non-empty string'));
      }
      if (!c.imageUrl || typeof c.imageUrl !== 'string' || c.imageUrl.trim() === '') {
        errors.push(err(index, 'content.imageUrl', 'Must be a non-empty string'));
      }
    }

    if (slide.type === 'fullscreen-image') {
      if (!c.imageUrl || typeof c.imageUrl !== 'string' || c.imageUrl.trim() === '') {
        errors.push(err(index, 'content.imageUrl', 'Must be a non-empty string'));
      }
    }

    return errors;
  }

  function validateSlides(parsed) {
    if (!Array.isArray(parsed)) {
      return { valid: false, errors: [err(null, 'root', 'Must be a JSON array')] };
    }

    if (parsed.length === 0) {
      return { valid: false, errors: [err(null, 'root', 'Array must contain at least one slide')] };
    }

    const errors = [];
    parsed.forEach(function (slide, index) {
      const slideErrors = validateSlide(slide, index);
      slideErrors.forEach(function (e) { errors.push(e); });
    });

    if (errors.length > 0) {
      return { valid: false, errors: errors };
    }

    return { valid: true, slides: parsed };
  }

  return { validateSlides: validateSlides };
})();
