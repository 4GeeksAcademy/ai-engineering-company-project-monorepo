/**
 * HealthCore patient enquiry form validation.
 * Bilingual (EN/ES), real-time, blocks submission while any field is invalid.
 */
(function () {
  'use strict';

  var form = document.getElementById('enquiry-form');
  if (!form) return;

  var successBox = document.getElementById('form-success');
  var errorSummary = document.getElementById('form-error-summary');
  var counterEl = document.getElementById('health_concern-counter');
  var clinicWarning = document.getElementById('clinic-hours-warning');
  var patientIdWrapper = document.getElementById('patient-id-wrapper');

  var MESSAGES = {
    first_name: {
      en: 'First name must contain only letters and be at least 2 characters',
      es: 'El nombre debe contener solo letras y tener al menos 2 caracteres'
    },
    last_name: {
      en: 'Last name must contain only letters and be at least 2 characters',
      es: 'El apellido debe contener solo letras y tener al menos 2 caracteres'
    },
    date_of_birth: {
      en: 'Enter a valid date of birth. Patient must be between 0 and 120 years old',
      es: 'Introduce una fecha de nacimiento válida. El paciente debe tener entre 0 y 120 años'
    },
    email: {
      en: 'Enter a valid email address (example: name@provider.com)',
      es: 'Introduce un correo electrónico válido (ejemplo: nombre@proveedor.com)'
    },
    phone: {
      en: 'Enter a valid phone number using digits only (7 to 15 digits, example: 3055550191)',
      es: 'Introduce un número de teléfono válido usando solo dígitos (entre 7 y 15, ejemplo: 3055550191)'
    },
    phone_country_code: {
      en: 'Select your country calling code',
      es: 'Selecciona tu código de país'
    },
    preferred_language: { en: 'Select your preferred language', es: 'Selecciona tu idioma preferido' },
    preferred_clinic: {
      en: 'Select the clinic you would like to visit',
      es: 'Selecciona la clínica que deseas visitar'
    },
    preferred_date: {
      en: 'Select a date at least 1 business day from today and no more than 60 days ahead',
      es: 'Selecciona una fecha con al menos 1 día hábil de antelación y no más de 60 días'
    },
    preferred_time: { en: 'Select your preferred time of day', es: 'Selecciona tu franja horaria preferida' },
    service_type: {
      en: 'Select the type of care you are looking for',
      es: 'Selecciona el tipo de atención que necesitas'
    },
    service_type_paediatric: {
      en: 'Paediatric Care is available for patients under 18. Please check the date of birth or select a different service.',
      es: 'La atención pediátrica está disponible para pacientes menores de 18 años. Revisa la fecha de nacimiento o elige otro servicio.'
    },
    new_patient: {
      en: 'Please indicate whether this is your first visit to HealthCore',
      es: 'Indica si esta es tu primera visita a HealthCore'
    },
    patient_id: {
      en: 'Patient ID must follow the format HC- followed by 6 alphanumeric characters (example: HC-A3F291)',
      es: 'El ID de paciente debe seguir el formato HC- seguido de 6 caracteres alfanuméricos (ejemplo: HC-A3F291)'
    },
    health_concern: {
      en: 'Please describe your health concern in at least 20 characters ({n} characters remaining)',
      es: 'Describe tu problema de salud con al menos 20 caracteres (faltan {n} caracteres)'
    },
    health_concern_max: {
      en: 'Your description must not exceed 500 characters',
      es: 'La descripción no puede superar los 500 caracteres'
    },
    contact_consent: {
      en: 'You must consent to being contacted before submitting this form',
      es: 'Debes dar tu consentimiento para ser contactado antes de enviar este formulario'
    },
    evening_warning: {
      en: '{clinic} closes at {time}. Evening appointments may not be available at this location.',
      es: '{clinic} cierra a las {time}. Es posible que no haya citas por la noche en esta sede.'
    }
  };

  // Latest weekday closing time per clinic, used for the evening-slot warning.
  var CLINIC_CLOSING = {
    'HealthCore Austin Central': { hour: 20, label: '8pm', labelEs: '20:00' },
    'HealthCore Austin North': { hour: 19, label: '7pm', labelEs: '19:00' },
    'HealthCore San Antonio': { hour: 18, label: '6pm', labelEs: '18:00' },
    'HealthCore Miami': { hour: 20, label: '8pm', labelEs: '20:00' },
    'HealthCore Orlando': { hour: 18, label: '6pm', labelEs: '18:00' },
    'HealthCore Atlanta': { hour: 19, label: '7pm', labelEs: '19:00' }
  };

  var NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,50}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  var PHONE_RE = /^\d{7,15}$/;
  var PATIENT_ID_RE = /^HC-[A-Za-z0-9]{6}$/;

  var submitAttempted = false;

  function lang() {
    return document.documentElement.lang === 'es' ? 'es' : 'en';
  }

  function msg(key, replacements) {
    var entry = MESSAGES[key];
    var text = entry ? entry[lang()] : '';
    if (replacements) {
      Object.keys(replacements).forEach(function (token) {
        text = text.replace('{' + token + '}', replacements[token]);
      });
    }
    return text;
  }

  function field(name) {
    return form.elements[name];
  }

  function radioValue(name) {
    var checked = form.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : '';
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function parseDateInput(value) {
    if (!value) return null;
    var parts = value.split('-');
    if (parts.length !== 3) return null;
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(date.getTime()) ? null : date;
  }

  function nextBusinessDay(from) {
    var date = startOfDay(from);
    do {
      date.setDate(date.getDate() + 1);
    } while (date.getDay() === 0 || date.getDay() === 6);
    return date;
  }

  function ageInYears(birthDate, reference) {
    var age = reference.getFullYear() - birthDate.getFullYear();
    var monthDiff = reference.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birthDate.getDate())) age--;
    return age;
  }

  function errorNode(name) {
    return form.querySelector('[data-error-for="' + name + '"]');
  }

  function inputsFor(name) {
    var el = field(name);
    if (!el) return [];
    return el instanceof RadioNodeList || (el.length !== undefined && !el.tagName) ? Array.prototype.slice.call(el) : [el];
  }

  function setError(name, message) {
    var node = errorNode(name);
    var els = inputsFor(name);

    if (message) {
      if (node) {
        node.textContent = message;
        node.classList.remove('hidden');
      }
      els.forEach(function (el) {
        el.setAttribute('aria-invalid', 'true');
        if (el.type !== 'radio' && el.type !== 'checkbox') {
          el.classList.add('border-red-500');
          el.classList.remove('border-slate-300');
        }
      });
    } else {
      if (node) {
        node.textContent = '';
        node.classList.add('hidden');
      }
      els.forEach(function (el) {
        el.removeAttribute('aria-invalid');
        if (el.type !== 'radio' && el.type !== 'checkbox') {
          el.classList.remove('border-red-500');
          el.classList.add('border-slate-300');
        }
      });
    }
    return !message;
  }

  /* ------------------------------------------------------------------ */
  /* Individual validators — each returns an error key/message or ''     */
  /* ------------------------------------------------------------------ */

  var validators = {
    first_name: function () {
      return NAME_RE.test(field('first_name').value.trim()) ? '' : msg('first_name');
    },
    last_name: function () {
      return NAME_RE.test(field('last_name').value.trim()) ? '' : msg('last_name');
    },
    date_of_birth: function () {
      var date = parseDateInput(field('date_of_birth').value);
      if (!date) return msg('date_of_birth');
      var today = startOfDay(new Date());
      if (date > today) return msg('date_of_birth');
      var age = ageInYears(date, today);
      if (age < 0 || age > 120) return msg('date_of_birth');
      return '';
    },
    email: function () {
      return EMAIL_RE.test(field('email').value.trim()) ? '' : msg('email');
    },
    phone: function () {
      return PHONE_RE.test(field('phone').value.trim()) ? '' : msg('phone');
    },
    phone_country_code: function () {
      return field('phone_country_code').value ? '' : msg('phone_country_code');
    },
    preferred_language: function () {
      return field('preferred_language').value ? '' : msg('preferred_language');
    },
    preferred_clinic: function () {
      return field('preferred_clinic').value ? '' : msg('preferred_clinic');
    },
    preferred_date: function () {
      var date = parseDateInput(field('preferred_date').value);
      if (!date) return msg('preferred_date');
      var today = startOfDay(new Date());
      var earliest = nextBusinessDay(today);
      var latest = startOfDay(today);
      latest.setDate(latest.getDate() + 60);
      if (date < earliest || date > latest) return msg('preferred_date');
      return '';
    },
    preferred_time: function () {
      return field('preferred_time').value ? '' : msg('preferred_time');
    },
    service_type: function () {
      var value = field('service_type').value;
      if (!value) return msg('service_type');
      if (value === 'Paediatric Care') {
        var dob = parseDateInput(field('date_of_birth').value);
        if (dob && ageInYears(dob, startOfDay(new Date())) >= 18) return msg('service_type_paediatric');
      }
      return '';
    },
    new_patient: function () {
      return radioValue('new_patient') ? '' : msg('new_patient');
    },
    patient_id: function () {
      if (radioValue('new_patient') !== 'No') return '';
      var value = field('patient_id').value.trim();
      if (!value) return ''; // optional
      return PATIENT_ID_RE.test(value) ? '' : msg('patient_id');
    },
    health_concern: function () {
      var value = field('health_concern').value.trim();
      if (value.length > 500) return msg('health_concern_max');
      if (value.length < 20) return msg('health_concern', { n: 20 - value.length });
      return '';
    },
    contact_consent: function () {
      return field('contact_consent').checked ? '' : msg('contact_consent');
    }
  };

  var FIELD_ORDER = [
    'first_name',
    'last_name',
    'date_of_birth',
    'preferred_language',
    'email',
    'phone_country_code',
    'phone',
    'preferred_clinic',
    'preferred_date',
    'preferred_time',
    'service_type',
    'new_patient',
    'patient_id',
    'health_concern',
    'contact_consent'
  ];

  function validateField(name) {
    return setError(name, validators[name]());
  }

  function validateAll() {
    var firstInvalid = null;
    FIELD_ORDER.forEach(function (name) {
      if (!validateField(name) && !firstInvalid) firstInvalid = name;
    });
    return firstInvalid;
  }

  /* ------------------------------------------------------------------ */
  /* Conditional sections                                               */
  /* ------------------------------------------------------------------ */

  function syncPatientIdSection() {
    var returning = radioValue('new_patient') === 'No';
    patientIdWrapper.classList.toggle('hidden', !returning);
    if (!returning) {
      field('patient_id').value = '';
      setError('patient_id', '');
    }
  }

  function syncClinicWarning() {
    var clinic = field('preferred_clinic').value;
    var time = field('preferred_time').value;
    var closing = CLINIC_CLOSING[clinic];

    if (time === 'Evening' && closing && closing.hour < 20) {
      clinicWarning.textContent = msg('evening_warning', {
        clinic: clinic,
        time: lang() === 'es' ? closing.labelEs : closing.label
      });
      clinicWarning.classList.remove('hidden');
    } else {
      clinicWarning.textContent = '';
      clinicWarning.classList.add('hidden');
    }
  }

  function syncCharacterCounter() {
    var length = field('health_concern').value.length;
    counterEl.textContent = length + ' / 500';
    counterEl.classList.toggle('text-red-600', length > 500 || (length > 0 && length < 20));
    counterEl.classList.toggle('text-slate-500', !(length > 500 || (length > 0 && length < 20)));
  }

  /* ------------------------------------------------------------------ */
  /* Date input bounds                                                  */
  /* ------------------------------------------------------------------ */

  function toISODate(date) {
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() + '-' + month + '-' + day;
  }

  (function applyDateBounds() {
    var today = startOfDay(new Date());

    var dob = field('date_of_birth');
    var oldest = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    dob.max = toISODate(today);
    dob.min = toISODate(oldest);

    var preferred = field('preferred_date');
    var latest = startOfDay(today);
    latest.setDate(latest.getDate() + 60);
    preferred.min = toISODate(nextBusinessDay(today));
    preferred.max = toISODate(latest);
  })();

  /* ------------------------------------------------------------------ */
  /* Phone: digits only                                                 */
  /* ------------------------------------------------------------------ */

  (function enforceDigitsOnly() {
    var phone = field('phone');

    phone.addEventListener('input', function () {
      var digits = phone.value.replace(/\D/g, '');
      if (digits !== phone.value) {
        var caret = phone.selectionStart - (phone.value.length - digits.length);
        phone.value = digits;
        phone.setSelectionRange(caret, caret);
      }
    });

    phone.addEventListener('keypress', function (event) {
      if (event.key.length === 1 && !/\d/.test(event.key)) event.preventDefault();
    });

    phone.addEventListener('paste', function (event) {
      event.preventDefault();
      var pasted = (event.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      phone.value = (phone.value + pasted).slice(0, Number(phone.maxLength) || 15);
      phone.dispatchEvent(new Event('input', { bubbles: true }));
    });
  })();

  /* ------------------------------------------------------------------ */
  /* Wiring                                                             */
  /* ------------------------------------------------------------------ */

  FIELD_ORDER.forEach(function (name) {
    inputsFor(name).forEach(function (el) {
      var eventName = el.tagName === 'SELECT' || el.type === 'radio' || el.type === 'checkbox' || el.type === 'date' ? 'change' : 'input';

      el.addEventListener(eventName, function () {
        validateField(name);

        if (name === 'new_patient') syncPatientIdSection();
        if (name === 'preferred_clinic' || name === 'preferred_time') syncClinicWarning();
        if (name === 'health_concern') syncCharacterCounter();
        if (name === 'date_of_birth' && field('service_type').value) validateField('service_type');

        if (submitAttempted && !validateAll()) errorSummary.classList.add('hidden');
      });

      el.addEventListener('blur', function () {
        validateField(name);
      });
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    submitAttempted = true;

    var firstInvalid = validateAll();

    if (firstInvalid) {
      successBox.classList.add('hidden');
      errorSummary.classList.remove('hidden');
      errorSummary.focus();
      var target = inputsFor(firstInvalid)[0];
      if (target) target.focus();
      return;
    }

    errorSummary.classList.add('hidden');
    successBox.classList.remove('hidden');
    successBox.focus();
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

    form.reset();
    submitAttempted = false;
    resetFormState();
  });

  function resetFormState() {
    FIELD_ORDER.forEach(function (name) {
      setError(name, '');
    });
    syncPatientIdSection();
    syncClinicWarning();
    syncCharacterCounter();
  }

  form.addEventListener('reset', function () {
    submitAttempted = false;
    successBox.classList.add('hidden');
    errorSummary.classList.add('hidden');
    window.setTimeout(resetFormState, 0);
  });

  // Re-render any visible messages when the page language changes.
  document.addEventListener('languagechange', function () {
    syncClinicWarning();
    FIELD_ORDER.forEach(function (name) {
      var node = errorNode(name);
      if (node && !node.classList.contains('hidden')) validateField(name);
    });
  });

  resetFormState();
})();
