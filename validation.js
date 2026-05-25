/**
 * Brasaland - Form Validation
 * Real-time validation for the job application form
 */

(function () {
    'use strict';

    const form = document.getElementById('application-form');
    if (!form) return;

    // Location data for cascading dropdowns
    const locationData = {
        colombia: {
            cities: ['Medellín', 'Bogotá', 'Cali', 'Barranquilla', 'Cartagena'],
            locations: {
                'Medellín': ['El Poblado', 'Laureles', 'Envigado', 'Sabaneta'],
                'Bogotá': ['Zona T', 'Usaquén', 'Chapinero'],
                'Cali': ['Granada', 'Ciudad Jardín'],
                'Barranquilla': ['Alto Prado'],
                'Cartagena': ['Bocagrande']
            }
        },
        usa: {
            cities: ['Miami', 'Fort Lauderdale', 'Orlando'],
            locations: {
                'Miami': ['Brickell', 'Doral', 'Coral Gables'],
                'Fort Lauderdale': ['Las Olas', 'Sunrise'],
                'Orlando': ['Downtown', 'International Drive']
            }
        }
    };

    // DOM elements
    const countrySelect = document.getElementById('country');
    const citySelect = document.getElementById('city');
    const locationSelect = document.getElementById('preferred-location');
    const motivationTextarea = document.getElementById('motivation');
    const motivationCount = document.getElementById('motivation-count');
    const successMessage = document.getElementById('success-message');

    // Cascading dropdown: Country → City
    countrySelect.addEventListener('change', function () {
        const country = this.value;
        citySelect.innerHTML = '<option value="">Selecciona una ciudad</option>';
        locationSelect.innerHTML = '<option value="">Primero selecciona una ciudad</option>';

        if (country && locationData[country]) {
            locationData[country].cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city.toLowerCase().replace(/\s+/g, '-');
                option.textContent = city;
                citySelect.appendChild(option);
            });
        }

        if (citySelect.dataset.validated) validateField(citySelect);
        if (locationSelect.dataset.validated) validateField(locationSelect);
    });

    // Cascading dropdown: City → Location
    citySelect.addEventListener('change', function () {
        const country = countrySelect.value;
        const cityValue = this.value;
        locationSelect.innerHTML = '<option value="">Selecciona un local</option>';

        if (country && cityValue && locationData[country]) {
            const cityName = this.options[this.selectedIndex].textContent;
            const locations = locationData[country].locations[cityName] || [];
            locations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc.toLowerCase().replace(/\s+/g, '-');
                option.textContent = loc;
                locationSelect.appendChild(option);
            });
        }

        if (locationSelect.dataset.validated) validateField(locationSelect);
    });

    // Character counter for motivation
    motivationTextarea.addEventListener('input', function () {
        const count = this.value.length;
        motivationCount.textContent = count;
    });

    // Validation rules
    const validators = {
        'full-name': (value) => {
            if (!value.trim()) return 'El nombre completo es obligatorio.';
            if (value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
            if (value.trim().length > 100) return 'El nombre no puede exceder 100 caracteres.';
            if (!/^[a-záéíóúñüA-ZÁÉÍÓÚÑÜ\s\-'.]+$/.test(value.trim())) return 'El nombre solo puede contener letras, espacios, guiones y apóstrofes.';
            if (value.trim().split(/\s+/).length < 2) return 'Por favor ingresa tu nombre y apellido.';
            return '';
        },
        'email': (value) => {
            if (!value.trim()) return 'El correo electrónico es obligatorio.';
            const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(value.trim())) return 'Ingresa un correo electrónico válido (ej: nombre@dominio.com).';
            return '';
        },
        'phone': (value) => {
            if (!value.trim()) return 'El número de teléfono es obligatorio.';
            const cleanPhone = value.replace(/[\s\-\(\)\.]/g, '');
            if (!/^\+?[0-9]{7,15}$/.test(cleanPhone)) return 'Ingresa un número de teléfono válido (7-15 dígitos, puede incluir +).';
            return '';
        },
        'birth-date': (value) => {
            if (!value) return 'La fecha de nacimiento es obligatoria.';
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 16) return 'Debes tener al menos 16 años para aplicar.';
            if (age > 80) return 'Por favor verifica la fecha de nacimiento ingresada.';
            return '';
        },
        'id-number': (value) => {
            if (!value.trim()) return 'El número de identificación es obligatorio.';
            if (value.trim().length < 5) return 'El número de identificación debe tener al menos 5 caracteres.';
            if (value.trim().length > 20) return 'El número de identificación no puede exceder 20 caracteres.';
            if (!/^[a-zA-Z0-9\-]+$/.test(value.trim())) return 'El número de identificación solo puede contener letras, números y guiones.';
            return '';
        },
        'country': (value) => {
            if (!value) return 'Selecciona un país.';
            return '';
        },
        'city': (value) => {
            if (!value) return 'Selecciona una ciudad.';
            return '';
        },
        'preferred-location': (value) => {
            if (!value) return 'Selecciona un local de preferencia.';
            return '';
        },
        'position': (value) => {
            if (!value) return 'Selecciona el puesto al que aplicas.';
            return '';
        },
        'experience': (value) => {
            if (!value) return 'Selecciona tu nivel de experiencia.';
            return '';
        },
        'contract-type': (value) => {
            if (!value) return 'Selecciona un tipo de contrato.';
            return '';
        },
        'start-date': (value) => {
            if (!value) return 'La fecha disponible para empezar es obligatoria.';
            const startDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (startDate < today) return 'La fecha de inicio no puede ser en el pasado.';
            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 6);
            if (startDate > maxDate) return 'La fecha de inicio no puede ser mayor a 6 meses desde hoy.';
            return '';
        },
        'motivation': (value) => {
            if (!value.trim()) return 'Este campo es obligatorio.';
            if (value.trim().length < 20) return 'Por favor escribe al menos 20 caracteres explicando tu motivación.';
            if (value.trim().length > 500) return 'El texto no puede exceder 500 caracteres.';
            return '';
        }
    };

    // Validate availability checkboxes
    function validateAvailability() {
        const checkboxes = form.querySelectorAll('input[name="availability"]');
        const checked = Array.from(checkboxes).some(cb => cb.checked);
        const errorEl = document.getElementById('availability-error');

        if (!checked) {
            showError(errorEl, 'Selecciona al menos una opción de disponibilidad.');
            return false;
        }
        hideError(errorEl);
        return true;
    }

    // Validate terms checkbox
    function validateTerms() {
        const termsCheckbox = document.getElementById('terms');
        const errorEl = document.getElementById('terms-error');

        if (!termsCheckbox.checked) {
            showError(errorEl, 'Debes aceptar la política de privacidad para continuar.');
            return false;
        }
        hideError(errorEl);
        return true;
    }

    // Show error message
    function showError(errorEl, message) {
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        }
        // Mark the input as invalid visually
        const input = errorEl ? errorEl.previousElementSibling || document.getElementById(errorEl.id.replace('-error', '')) : null;
        if (input && input.tagName !== 'DIV' && input.tagName !== 'P') {
            input.classList.add('border-brasa-red');
            input.classList.remove('border-brasa-brown/50');
        }
    }

    // Hide error message
    function hideError(errorEl) {
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.add('hidden');
        }
    }

    // Validate a single field
    function validateField(field) {
        const fieldName = field.id;
        const validator = validators[fieldName];
        if (!validator) return true;

        field.dataset.validated = 'true';
        const errorMessage = validator(field.value);
        const errorEl = document.getElementById(fieldName + '-error');

        if (errorMessage) {
            showError(errorEl, errorMessage);
            field.classList.add('border-brasa-red');
            field.classList.remove('border-brasa-brown/50');
            return false;
        } else {
            hideError(errorEl);
            field.classList.remove('border-brasa-red');
            field.classList.add('border-brasa-brown/50');
            // Add success indicator
            field.classList.add('border-green-600/50');
            return true;
        }
    }

    // Real-time validation on blur
    const fieldsToValidate = [
        'full-name', 'email', 'phone', 'birth-date', 'id-number',
        'country', 'city', 'preferred-location', 'position',
        'experience', 'contract-type', 'start-date', 'motivation'
    ];

    fieldsToValidate.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', () => validateField(field));
            // Also validate on change for selects
            if (field.tagName === 'SELECT') {
                field.addEventListener('change', () => validateField(field));
            }
            // Validate on input for text fields (debounced)
            if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
                let timeout;
                field.addEventListener('input', () => {
                    if (field.dataset.validated) {
                        clearTimeout(timeout);
                        timeout = setTimeout(() => validateField(field), 300);
                    }
                });
            }
        }
    });

    // Validate availability checkboxes on change
    const availabilityCheckboxes = form.querySelectorAll('input[name="availability"]');
    availabilityCheckboxes.forEach(cb => {
        cb.addEventListener('change', validateAvailability);
    });

    // Validate terms on change
    const termsCheckbox = document.getElementById('terms');
    termsCheckbox.addEventListener('change', validateTerms);

    // Form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        let isValid = true;

        // Validate all fields
        fieldsToValidate.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !validateField(field)) {
                isValid = false;
            }
        });

        // Validate checkboxes
        if (!validateAvailability()) isValid = false;
        if (!validateTerms()) isValid = false;

        if (!isValid) {
            // Scroll to first error
            const firstError = form.querySelector('.text-brasa-red:not(.hidden)[role="alert"]');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Form is valid — simulate submission
        form.classList.add('hidden');
        successMessage.classList.remove('hidden');
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Reset form — clear errors
    form.addEventListener('reset', function () {
        setTimeout(() => {
            // Clear all error messages
            form.querySelectorAll('[role="alert"]').forEach(el => {
                el.textContent = '';
                el.classList.add('hidden');
            });
            // Reset border styles
            form.querySelectorAll('input, select, textarea').forEach(el => {
                el.classList.remove('border-brasa-red', 'border-green-600/50');
                el.classList.add('border-brasa-brown/50');
                delete el.dataset.validated;
            });
            // Reset cascading selects
            citySelect.innerHTML = '<option value="">Primero selecciona un país</option>';
            locationSelect.innerHTML = '<option value="">Primero selecciona una ciudad</option>';
            // Reset counter
            motivationCount.textContent = '0';
        }, 10);
    });

})();
