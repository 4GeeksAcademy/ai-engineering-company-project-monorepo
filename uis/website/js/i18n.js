/**
 * Minimal bilingual (EN/ES) switcher.
 * Any element with data-en / data-es swaps its text content.
 * Attributes are swapped via data-attr-en-<attr> / data-attr-es-<attr>.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'healthcore-lang';
  var SUPPORTED = ['en', 'es'];

  function getStoredLang() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) {
      /* localStorage unavailable (private mode) */
    }
    var browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return SUPPORTED.indexOf(browser) !== -1 ? browser : 'en';
  }

  function applyLang(lang) {
    var other = lang === 'en' ? 'es' : 'en';

    document.documentElement.lang = lang;

    document.querySelectorAll('[data-' + lang + ']').forEach(function (el) {
      el.textContent = el.getAttribute('data-' + lang);
    });

    ['placeholder', 'aria-label', 'title', 'content'].forEach(function (attr) {
      var selector = '[data-attr-' + lang + '-' + attr + ']';
      document.querySelectorAll(selector).forEach(function (el) {
        el.setAttribute(attr, el.getAttribute('data-attr-' + lang + '-' + attr));
      });
    });

    document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
      var isActive = btn.getAttribute('data-lang-toggle') === lang;
      btn.setAttribute('aria-pressed', String(isActive));
      btn.classList.toggle('bg-teal-700', isActive);
      btn.classList.toggle('text-white', isActive);
      btn.classList.toggle('text-slate-600', !isActive);
    });

    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* ignore */
    }

    document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: lang, other: other } }));
  }

  window.HealthCoreI18n = {
    current: function () {
      return document.documentElement.lang === 'es' ? 'es' : 'en';
    },
    set: applyLang
  };

  document.addEventListener('DOMContentLoaded', function () {
    applyLang(getStoredLang());

    document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyLang(btn.getAttribute('data-lang-toggle'));
      });
    });

    var navToggle = document.querySelector('[data-nav-toggle]');
    var navPanel = document.getElementById('primary-navigation');
    if (navToggle && navPanel) {
      navToggle.addEventListener('click', function () {
        var expanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', String(!expanded));
        navPanel.classList.toggle('hidden', expanded);
      });
    }
  });
})();
