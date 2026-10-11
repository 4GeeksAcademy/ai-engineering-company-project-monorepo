const cityOptions = {
  Colombia: {
    es: [
      { value: 'Medellín', label: 'Medellín' },
      { value: 'Bogotá', label: 'Bogotá' },
      { value: 'Cali', label: 'Cali' }
    ],
    en: [
      { value: 'Medellín', label: 'Medellin' },
      { value: 'Bogotá', label: 'Bogota' },
      { value: 'Cali', label: 'Cali' }
    ]
  },
  'Estados Unidos': {
    es: [
      { value: 'Miami', label: 'Miami' },
      { value: 'Orlando', label: 'Orlando' }
    ],
    en: [
      { value: 'Miami', label: 'Miami' },
      { value: 'Orlando', label: 'Orlando' }
    ]
  }
};

const locationOptions = {
  'Colombia|Medellín': {
    es: ['Brasaland El Poblado', 'Brasaland Laureles', 'Brasaland Envigado', 'Brasaland Sabaneta'],
    en: ['Brasaland El Poblado', 'Brasaland Laureles', 'Brasaland Envigado', 'Brasaland Sabaneta']
  },
  'Colombia|Bogotá': {
    es: ['Brasaland Usaquén', 'Brasaland Chapinero', 'Brasaland Zona Rosa'],
    en: ['Brasaland Usaquen', 'Brasaland Chapinero', 'Brasaland Zona Rosa']
  },
  'Colombia|Cali': {
    es: ['Brasaland Granada', 'Brasaland Ciudad Jardín', 'Brasaland Unicentro'],
    en: ['Brasaland Granada', 'Brasaland Ciudad Jardin', 'Brasaland Unicentro']
  },
  'Estados Unidos|Miami': {
    es: ['Brasaland Brickell', 'Brasaland Coral Gables'],
    en: ['Brasaland Brickell', 'Brasaland Coral Gables']
  },
  'Estados Unidos|Orlando': {
    es: ['Brasaland Downtown', 'Brasaland International Drive'],
    en: ['Brasaland Downtown', 'Brasaland International Drive']
  }
};

const form = document.getElementById('formulario-brasa-points');

if (form) {
  const successMessage = document.getElementById('success-message');
  const restrictionMessage = document.getElementById('restriction-message');
  const successModal = document.getElementById('success-modal');
  const restrictionModal = document.getElementById('restriction-modal');
  const countrySelect = document.getElementById('country');
  const citySelect = document.getElementById('city');
  const locationSelect = document.getElementById('location');
  const birthDateField = document.getElementById('birthDate');
  let activeModal = null;
  let skipNextResetCleanup = false;

  const fields = {
    fullName: document.getElementById('fullName'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    birthDate: birthDateField,
    country: countrySelect,
    city: citySelect,
    discovery: document.getElementById('discovery'),
    terms: document.getElementById('terms')
  };

  const errorMessages = {
    es: {
      fullName: 'Ingresa tu nombre completo (nombre y apellido)',
      email: 'Ingresa un email válido (ejemplo: nombre@correo.com)',
      phone: 'El teléfono debe incluir código de país (ejemplo: +57 300 123 4567 o +1 305 123 4567)',
      country: 'Selecciona tu país',
      city: 'Selecciona tu ciudad',
      discovery: 'Cuéntanos cómo conociste Brasaland',
      birthDate: 'Debes ser mayor de 18 años para registrarte en Brasa Points',
      terms: 'Debes aceptar los términos del programa Brasa Points para continuar'
    },
    en: {
      fullName: 'Enter your full name (first and last name)',
      email: 'Enter a valid email address (example: name@email.com)',
      phone: 'Phone number must include a country code (example: +57 300 123 4567 or +1 305 123 4567)',
      country: 'Select your country',
      city: 'Select your city',
      discovery: 'Tell us how you heard about Brasaland',
      birthDate: 'You must be over 18 to join Brasa Points',
      terms: 'You must accept the Brasa Points program terms to continue'
    }
  };

  const selectText = {
    es: {
      selectCountry: 'Selecciona tu país',
      selectCity: 'Selecciona tu ciudad',
      selectLocation: 'Selecciona una ubicación',
      selectDiscovery: 'Selecciona una opción',
      countryColombia: 'Colombia',
      countryUs: 'Estados Unidos',
      discoverySocial: 'Redes sociales',
      discoveryReferral: 'Recomendación',
      discoveryWalkBy: 'Pasando por el local',
      discoverySearch: 'Búsqueda en internet',
      discoveryOther: 'Otro'
    },
    en: {
      selectCountry: 'Select your country',
      selectCity: 'Select your city',
      selectLocation: 'Select a location',
      selectDiscovery: 'Select an option',
      countryColombia: 'Colombia',
      countryUs: 'United States',
      discoverySocial: 'Social media',
      discoveryReferral: 'Referral',
      discoveryWalkBy: 'Walked by the restaurant',
      discoverySearch: 'Online search',
      discoveryOther: 'Other'
    }
  };

  function getCurrentLanguage() {
    return window.BrasalandI18n ? window.BrasalandI18n.getLanguage() : 'es';
  }

  function getErrorMessage(fieldKey) {
    return errorMessages[getCurrentLanguage()][fieldKey];
  }

  function getTranslation(key, fallback) {
    if (!window.BrasalandI18n) {
      return fallback;
    }

    const bundle = window.BrasalandI18n.getTranslations(getCurrentLanguage());
    return bundle[key] || fallback;
  }

  function openModal(modal) {
    if (!modal) {
      return;
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    activeModal = modal;

    const firstFocusable = modal.querySelector('button');
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }

  function closeModal(modal) {
    if (!modal) {
      return;
    }

    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');

    if (activeModal === modal) {
      activeModal = null;
    }
  }

  function fillSelect(select, placeholder, options) {
    select.innerHTML = '';
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);

    options.forEach((optionItem) => {
      const option = document.createElement('option');
      if (typeof optionItem === 'string') {
        option.value = optionItem;
        option.textContent = optionItem;
      } else {
        option.value = optionItem.value;
        option.textContent = optionItem.label;
      }
      select.appendChild(option);
    });
  }

  function setFieldState(field, isValid, message) {
    const errorElement = document.getElementById(`${field.id}-error`);

    if (errorElement) {
      errorElement.classList.add('hidden');
      errorElement.textContent = '';
    }

    field.classList.remove('border-red-600', 'ring-4', 'ring-red-100', 'border-brasaAccent', 'ring-brasaAccent/20');
    field.setAttribute('aria-invalid', 'false');

    if (!isValid) {
      field.classList.add('border-red-600', 'ring-4', 'ring-red-100');
      field.setAttribute('aria-invalid', 'true');

      if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
      }

      return false;
    }

    if (field.type === 'checkbox' ? field.checked : field.value) {
      field.classList.add('border-brasaAccent', 'ring-4', 'ring-brasaAccent/20');
    }

    return true;
  }

  function isAdult(dateString) {
    if (!dateString) {
      return false;
    }

    const birthDate = new Date(`${dateString}T00:00:00`);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age >= 18;
  }

  function validateFullName() {
    const value = fields.fullName.value.trim().replace(/\s+/g, ' ');
    return setFieldState(fields.fullName, value.split(' ').filter(Boolean).length >= 2, getErrorMessage('fullName'));
  }

  function validateEmail() {
    const value = fields.email.value.trim();
    return setFieldState(fields.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), getErrorMessage('email'));
  }

  function validatePhone() {
    const value = fields.phone.value.trim();
    const country = fields.country.value;
    const formatOk = /^\+(57|1)\s?[0-9 ]{7,}$/.test(value);
    const countryOk =
      (country === 'Colombia' && value.startsWith('+57')) ||
      (country === 'Estados Unidos' && value.startsWith('+1')) ||
      (!country && /^\+(57|1)/.test(value));

    return setFieldState(fields.phone, formatOk && countryOk, getErrorMessage('phone'));
  }

  function validateCountry() {
    return setFieldState(fields.country, fields.country.value !== '', getErrorMessage('country'));
  }

  function validateCity() {
    return setFieldState(fields.city, fields.city.value !== '', getErrorMessage('city'));
  }

  function validateDiscovery() {
    return setFieldState(fields.discovery, fields.discovery.value !== '', getErrorMessage('discovery'));
  }

  function validateBirthDate() {
    const valid = isAdult(fields.birthDate.value);
    const language = getCurrentLanguage();

    if (restrictionMessage) {
      if (!valid && fields.birthDate.value) {
        const bundle = window.BrasalandI18n ? window.BrasalandI18n.getTranslations(language) : null;
        const title = bundle ? bundle.restrictionTitle : 'Registro no disponible';
        const body = bundle ? bundle.restrictionBody : 'El programa Brasa Points está diseñado para clientes mayores de 18 años que quieren acumular puntos con sus visitas. No es un formulario de reservas ni de pedidos en línea.';
        restrictionMessage.innerHTML = `<h3 class="text-base font-extrabold">${title}</h3><p class="mt-2 text-sm leading-6">${body}</p>`;
        openModal(restrictionModal);
      } else {
        closeModal(restrictionModal);
      }
    }

    return setFieldState(fields.birthDate, valid, getErrorMessage('birthDate'));
  }

  function validateTerms() {
    const errorElement = document.getElementById('terms-error');
    errorElement.classList.add('hidden');
    errorElement.textContent = '';
    fields.terms.setAttribute('aria-invalid', 'false');

    if (!fields.terms.checked) {
      fields.terms.setAttribute('aria-invalid', 'true');
      errorElement.textContent = getErrorMessage('terms');
      errorElement.classList.remove('hidden');
      return false;
    }

    return true;
  }

  function updateCities() {
    const country = countrySelect.value;
    const language = getCurrentLanguage();
    const cities = (cityOptions[country] && cityOptions[country][language]) || [];

    fillSelect(citySelect, selectText[language].selectCity, cities);
    citySelect.disabled = cities.length === 0;
    fillSelect(locationSelect, selectText[language].selectLocation, []);
    locationSelect.disabled = true;
  }

  function updateLocations() {
    const key = `${countrySelect.value}|${citySelect.value}`;
    const language = getCurrentLanguage();
    const locations = ((locationOptions[key] && locationOptions[key][language]) || []).map((label, index) => {
      const fallbackValue = (locationOptions[key].es || [])[index] || label;
      return { value: fallbackValue, label };
    });

    fillSelect(locationSelect, selectText[language].selectLocation, locations);
    locationSelect.disabled = locations.length === 0;
  }

  function updateStaticSelects() {
    const language = getCurrentLanguage();
    const currentCountry = countrySelect.value;
    const currentDiscovery = fields.discovery.value;

    fillSelect(countrySelect, selectText[language].selectCountry, [
      { value: 'Colombia', label: selectText[language].countryColombia },
      { value: 'Estados Unidos', label: selectText[language].countryUs }
    ]);
    countrySelect.value = currentCountry;

    fillSelect(fields.discovery, selectText[language].selectDiscovery, [
      { value: 'Redes sociales', label: selectText[language].discoverySocial },
      { value: 'Recomendación', label: selectText[language].discoveryReferral },
      { value: 'Pasando por el local', label: selectText[language].discoveryWalkBy },
      { value: 'Búsqueda en internet', label: selectText[language].discoverySearch },
      { value: 'Otro', label: selectText[language].discoveryOther }
    ]);
    fields.discovery.value = currentDiscovery;
  }

  function validateForm() {
    return [
      validateFullName(),
      validateEmail(),
      validatePhone(),
      validateCountry(),
      validateCity(),
      validateDiscovery(),
      validateBirthDate(),
      validateTerms()
    ].every(Boolean);
  }

  function resetVisualState() {
    Object.values(fields).forEach((field) => {
      field.classList.remove('border-red-600', 'ring-4', 'ring-red-100', 'border-brasaAccent', 'ring-brasaAccent/20');
      field.setAttribute('aria-invalid', 'false');
    });

    document.querySelectorAll('[id$="-error"]').forEach((element) => {
      element.textContent = '';
      element.classList.add('hidden');
    });

    if (restrictionMessage) {
      closeModal(restrictionModal);
    }

    closeModal(successModal);
  }

  const adultLimit = new Date();
  adultLimit.setFullYear(adultLimit.getFullYear() - 18);
  birthDateField.max = adultLimit.toISOString().split('T')[0];

  document.addEventListener('brasaland:languagechange', () => {
    const currentCity = citySelect.value;
    const currentLocation = locationSelect.value;

    updateStaticSelects();
    updateCities();
    citySelect.value = currentCity;
    updateLocations();
    locationSelect.value = currentLocation;
    validateBirthDate();
  });

  countrySelect.addEventListener('change', () => {
    updateCities();
    validateCountry();
    validatePhone();
  });

  citySelect.addEventListener('change', () => {
    updateLocations();
    validateCity();
  });

  fields.fullName.addEventListener('blur', validateFullName);
  fields.email.addEventListener('blur', validateEmail);
  fields.phone.addEventListener('blur', validatePhone);
  fields.birthDate.addEventListener('change', validateBirthDate);
  fields.discovery.addEventListener('change', validateDiscovery);
  fields.terms.addEventListener('change', validateTerms);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    closeModal(successModal);

    if (!validateForm()) {
      const firstInvalidField = form.querySelector('[aria-invalid="true"]');

      if (firstInvalidField) {
        firstInvalidField.focus();
      }

      return;
    }

    skipNextResetCleanup = true;
    form.reset();
    updateCities();
    resetVisualState();
    openModal(successModal);
  });

  form.addEventListener('reset', () => {
    window.requestAnimationFrame(() => {
      if (skipNextResetCleanup) {
        skipNextResetCleanup = false;
        return;
      }

      closeModal(successModal);
      updateCities();
      resetVisualState();
    });
  });

  document.querySelectorAll('[data-modal-close]').forEach((element) => {
    element.addEventListener('click', () => {
      const modal = document.getElementById(element.dataset.modalClose);
      closeModal(modal);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeModal) {
      closeModal(activeModal);
    }
  });

  updateStaticSelects();
  updateCities();
}