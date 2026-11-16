/* =========================================================================
 * TrackFlow website — validation.js
 * -------------------------------------------------------------------------
 * Client-side, real-time validation for the application/request form
 * (application.html).
 *
 * Requirements covered (see milestone "ai-eng-milestone-web-fundamentals"
 * and CONTEXT-trackflow.es.md):
 *  - Validates every field of the B2B information-request form.
 *  - Specific, useful error messages per field (verbatim ES texts from the
 *    spec, with equivalent English translations via the i18n system).
 *  - Prevents submission while the form is invalid.
 *  - Success is shown only when the whole form is valid (no backend involved
 *    yet: the submission is simulated locally).
 *  - Coherent with native validation: the <form> uses novalidate, so the JS
 *    layer owns every validation message and there is no duplicate reporting.
 *  - Accessibility: fields get aria-invalid + aria-describedby pointing to
 *    their error paragraph; errors use role="alert"; a live region announces
 *    the field count on an invalid submit; focus moves to the first invalid
 *    field; the low-volume domain warning is announced via role="alert".
 * ========================================================================= */
(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var t = function (key) {
    return (window.TrackFlowI18N && window.TrackFlowI18N.t) ? window.TrackFlowI18N.t(key) : key;
  };

  var MAX_COMMENTS = 500;

  /* ---- element references ---- */
  var els = {
    company: document.getElementById('company'),
    contactPerson: document.getElementById('contactPerson'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    website: document.getElementById('website'),
    country: document.getElementById('country'),
    product: document.getElementById('product'),
    volume: document.getElementById('volume'),
    comments: document.getElementById('comments'),
    privacy: document.getElementById('privacy'),
    commentsCount: document.getElementById('comments-count'),
    errorSummary: document.getElementById('form-error-summary'),
    lowVolume: document.getElementById('low-volume-warning'),
    success: document.getElementById('form-success')
  };
  var services = Array.prototype.slice.call(document.querySelectorAll('input[name="services"]'));
  var threepl = Array.prototype.slice.call(document.querySelectorAll('input[name="current3pl"]'));

  /* ---- generic error helpers ---- */
  function setControlError(control, valid) {
    if (control) {
      control.setAttribute('aria-invalid', valid ? 'false' : 'true');
    }
  }

  // valid: boolean | null(null => hide without touching aria-invalid)
  function setError(errorId, message, valid, controls) {
    var err = document.getElementById(errorId);
    if (err) {
      if (valid === true) {
        err.classList.add('hidden');
      } else if (valid === false) {
        if (message !== undefined && message !== null && !err.hasAttribute('data-i18n')) {
          err.textContent = message;
        }
        err.classList.remove('hidden');
      } else {
        err.classList.add('hidden');
      }
    }
    if (controls && controls.length) {
      var i;
      for (i = 0; i < controls.length; i++) {
        if (valid === false || valid === true) {
          setControlError(controls[i], valid);
        }
      }
    } else if (controls && valid !== null) {
      setControlError(controls, valid);
    }
  }

  /* ---- per-field validators. Each returns true when valid. ---- */
  function validateCompany() {
    var v = els.company.value.trim();
    var ok = v.length >= 2;
    setError('err-company', null, ok, els.company);
    return ok;
  }

  function validateContactPerson() {
    var v = els.contactPerson.value.trim();
    var words = v.split(/\s+/).filter(function (w) { return w.length > 0; });
    var ok = words.length >= 2;
    setError('err-contact', null, ok, els.contactPerson);
    return ok;
  }

  function validateEmail() {
    var v = els.email.value.trim();
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    setError('err-email', null, ok, els.email);
    return ok;
  }

  function validatePhone() {
    // Must start with "+" followed by the country code and digits (e.g. +1 213 555 0147)
    var v = els.phone.value.trim();
    var ok = /^\+\d[\d\s().-]{5,}$/.test(v);
    setError('err-phone', null, ok, els.phone);
    return ok;
  }

  function validateWebsite() {
    var v = els.website.value.trim();
    var ok = true;
    if (v !== '') {
      try {
        var url = new URL(v);
        ok = url.protocol === 'http:' || url.protocol === 'https:';
      } catch (e) {
        ok = false;
      }
    }
    setError('err-website', null, ok, els.website);
    return ok;
  }

  function validateRequiredSelect(control, errorId) {
    var ok = control.value !== '';
    setError(errorId, null, ok, control);
    return ok;
  }

  function validateCountry() { return validateRequiredSelect(els.country, 'err-country'); }
  function validateProduct() { return validateRequiredSelect(els.product, 'err-product'); }
  function validateVolume() { return validateRequiredSelect(els.volume, 'err-volume'); }

  function validateServices() {
    var ok = services.some(function (c) { return c.checked; });
    setError('err-services', null, ok, services);
    return ok;
  }

  function validate3pl() {
    var ok = threepl.some(function (r) { return r.checked; });
    setError('err-3pl', null, ok, threepl);
    return ok;
  }

  function validateComments() {
    var v = els.comments.value;
    var ok = v.length <= MAX_COMMENTS;
    var message = null;
    if (!ok) {
      var left = MAX_COMMENTS - v.length;
      // Dynamic message: needs the current character count, so it cannot rely
      // on the static data-i18n default text.
      message = t('form.err.comments.dynamic').replace('{remaining}', String(left));
    }
    setError('err-comments', message, ok, els.comments);
    return ok;
  }

  function validatePrivacy() {
    var ok = els.privacy.checked;
    setError('err-privacy', null, ok, els.privacy);
    return ok;
  }

  var fieldValidators = [
    { validate: validateCompany },
    { validate: validateContactPerson },
    { validate: validateEmail },
    { validate: validatePhone },
    { validate: validateWebsite },
    { validate: validateCountry },
    { validate: validateProduct },
    { validate: validateVolume },
    { validate: validateServices },
    { validate: validate3pl },
    { validate: validateComments },
    { validate: validatePrivacy }
  ];

  function allValid() {
    var i, anyInvalid = false;
    for (i = 0; i < fieldValidators.length; i++) {
      if (!fieldValidators[i].validate()) anyInvalid = true;
    }
    return !anyInvalid;
  }

  /* ---- comment counter ---- */
  function updateCommentCounter() {
    if (els.commentsCount) {
      els.commentsCount.textContent = String(els.comments.value.length);
    }
  }

  /* ---- low-volume domain warning ---- */
  function updateLowVolumeWarning() {
    if (!els.lowVolume) return;
    if (els.volume.value === '0-100') {
      els.lowVolume.classList.remove('hidden');
    } else {
      els.lowVolume.classList.add('hidden');
    }
  }

  /* ---- error summary (only announced on a failed submit attempt) ---- */
  function updateErrorSummary(count) {
    if (!els.errorSummary) return;
    if (count > 0) {
      els.errorSummary.textContent = t('form.err.summary').replace('{count}', String(count));
      els.errorSummary.classList.remove('hidden');
    } else {
      els.errorSummary.classList.add('hidden');
    }
  }

  // Returns the first invalid control (in form order) so we can focus it.
  function firstInvalidControl() {
    var order = ['company', 'contactPerson', 'email', 'phone', 'website',
                 'country', 'product', 'volume', 'comments', 'privacy'];
    var i, check;
    for (i = 0; i < order.length; i++) {
      check = order[i];
      if (check === 'services' || check === 'current3pl') continue;
      if (els[check] && els[check].getAttribute('aria-invalid') === 'true') {
        return els[check];
      }
    }
    if (services.some(function (c) { return c.getAttribute('aria-invalid') === 'true'; })) return services[0];
    if (threepl.some(function (r) { return r.getAttribute('aria-invalid') === 'true'; })) return threepl[0];
    return null;
  }

  function countErrors() {
    var n = 0;
    var i;
    for (i = 0; i < fieldValidators.length; i++) {
      if (fieldValidators[i].validate() === false) n++;
    }
    return n;
  }

  /* ---- submit ---- */
  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var n = countErrors();

    if (n > 0) {
      updateErrorSummary(n);
      var first = firstInvalidControl();
      if (first) first.focus();
      return;
    }

    // All valid -> simulated local success (no backend yet).
    updateErrorSummary(0);
    form.classList.add('hidden');
    if (els.success) {
      els.success.classList.remove('hidden');
      els.success.focus();
    }
  });

  /* ---- real-time validation ---- */
  function wire(control, handler, eventNames) {
    if (!control) return;
    var names = eventNames || ['input', 'change'];
    var i;
    for (i = 0; i < names.length; i++) {
      control.addEventListener(names[i], handler);
    }
  }

  wire(els.company, validateCompany, ['input']);
  wire(els.contactPerson, validateContactPerson, ['input']);
  wire(els.email, validateEmail, ['input']);
  wire(els.phone, validatePhone, ['input']);
  wire(els.website, validateWebsite, ['input']);
  wire(els.country, function () { validateCountry(); }, ['change']);
  wire(els.product, function () { validateProduct(); }, ['change']);
  wire(els.volume, function () { validateVolume(); updateLowVolumeWarning(); }, ['change']);
  wire(els.comments, function () { updateCommentCounter(); validateComments(); }, ['input']);
  services.forEach(function (c) { c.addEventListener('change', validateServices); });
  threepl.forEach(function (r) { r.addEventListener('change', validate3pl); });
  wire(els.privacy, validatePrivacy, ['change']);

  /* ---- reset (secondary button) ---- */
  var resetBtn = document.getElementById('form-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      clearAllState();
      if (els.success) els.success.classList.add('hidden');
      form.classList.remove('hidden');
      focusFirstField();
    });
  }

  /* ---- restart from the success card ---- */
  var restartBtn = document.getElementById('form-restart');
  if (restartBtn) {
    restartBtn.addEventListener('click', function () {
      form.reset();
      clearAllState();
      form.classList.remove('hidden');
      if (els.success) els.success.classList.add('hidden');
      focusFirstField();
    });
  }

  /* ---- helpers used by reset/restart ---- */
  function clearAllState() {
    var i;
    // hide every error
    var errorIds = ['err-company', 'err-contact', 'err-email', 'err-phone', 'err-website',
                    'err-country', 'err-product', 'err-volume', 'err-services', 'err-3pl',
                    'err-comments', 'err-privacy'];
    for (i = 0; i < errorIds.length; i++) {
      var e = document.getElementById(errorIds[i]);
      if (e) e.classList.add('hidden');
    }
    // clear aria-invalid on all controls
    var controls = form.querySelectorAll('[aria-invalid]');
    for (i = 0; i < controls.length; i++) {
      controls[i].setAttribute('aria-invalid', 'false');
    }
    updateCommentCounter();
    updateLowVolumeWarning();
    updateErrorSummary(0);
  }

  function focusFirstField() {
    if (els.company) els.company.focus();
  }

  /* ---- keep dynamic content coherent when the language changes ---- */
  document.addEventListener('trackflow:langchange', function () {
    updateCommentCounter();
    updateLowVolumeWarning();
    // Re-apply current validity so aria-invalid and error visibility stay
    // consistent after the DOM text (and translated messages) is swapped.
    var i;
    for (i = 0; i < fieldValidators.length; i++) {
      fieldValidators[i].validate();
    }
  });

  /* ---------- init ---------- */
  clearAllState();
})();