(() => {
  let translations = {};
  let language = "en";

  try {
    const savedLanguage = localStorage.getItem("hc_lang");
    if (savedLanguage === "en" || savedLanguage === "es") language = savedLanguage;
  } catch {}

  function translateElement(element) {
    const dictionary = translations[language];
    const textKey = element.dataset.i18n;
    if (textKey && dictionary?.[textKey]) element.textContent = dictionary[textKey];

    for (const attribute of ["aria-label", "placeholder", "alt", "content"]) {
      const dataAttribute = attribute.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("");
      const key = element.dataset[`i18n${dataAttribute}`];
      if (key && dictionary?.[key]) element.setAttribute(attribute, dictionary[key]);
    }
  }

  function applyTranslations() {
    if (!translations[language]) return;
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n], [data-i18n-aria-label], [data-i18n-placeholder], [data-i18n-alt], [data-i18n-content]")
      .forEach(translateElement);
    document.dispatchEvent(new CustomEvent("healthcore:languagechange", { detail: { language } }));
  }

  function setLanguage(nextLanguage) {
    if (!translations[nextLanguage]) return;
    language = nextLanguage;
    try {
      localStorage.setItem("hc_lang", language);
    } catch {}
    applyTranslations();
  }

  window.HealthCoreI18n = {
    t(key) {
      return translations[language]?.[key] || key;
    },
    get language() {
      return language;
    }
  };

  fetch("js/translations.json")
    .then((response) => {
      if (!response.ok) throw new Error("Translation dictionary could not be loaded.");
      return response.json();
    })
    .then((dictionary) => {
      translations = dictionary;
      applyTranslations();
      const toggle = document.querySelector("#lang-toggle");
      if (toggle) {
        toggle.disabled = false;
        toggle.addEventListener("click", () => setLanguage(language === "en" ? "es" : "en"));
      }
    })
    .catch(() => {
      const toggle = document.querySelector("#lang-toggle");
      if (toggle) toggle.disabled = true;
    });
})();
