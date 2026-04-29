(function() {
    'use strict';

    // CONFIG: Define all field rules in one place
    const CONFIG = {
        name: {
            required: true,
            type: 'text',
            minLength: 2,
            customMessage: {
                required: 'El nombre es obligatorio.',
                minLength: 'El nombre debe tener al menos 2 caracteres.'
            }
        },
        email: {
            required: true,
            type: 'email',
            customMessage: {
                required: 'El correo electrónico es obligatorio.',
                invalid: 'Por favor, introduce un correo electrónico válido.'
            }
        },
        phone: {
            required: true,
            type: 'tel',
            pattern: /^\+?[0-9\s\-\(\)]{9,15}$/,
            customMessage: {
                required: 'El teléfono es obligatorio.',
                invalid: 'Por favor, introduce un número de teléfono válido (ej: +34 123 456 789).'
            }
        },
        department: {
            required: true,
            type: 'select',
            customMessage: {
                required: 'Debes seleccionar un departamento.'
            }
        },
        experience: {
            required: true,
            type: 'number',
            min: 0,
            max: 50,
            customMessage: {
                required: 'Los años de experiencia son obligatorios.',
                min: 'Los años de experiencia no pueden ser negativos.',
                max: 'Los años de experiencia no pueden exceder 50.'
            }
        },
        message: {
            required: true,
            type: 'text',
            minLength: 10,
            maxLength: 500,
            customMessage: {
                required: 'El mensaje es obligatorio.',
                minLength: 'El mensaje debe tener al menos 10 caracteres.',
                maxLength: 'El mensaje no puede exceder 500 caracteres.'
            }
        }
    };

    // VALIDATOR functions (pure functions, no side effects)
    function validateEmail(value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    }

    function validatePhone(value) {
        return CONFIG.phone.pattern.test(value);
    }

    function validateDate(value, min, max) {
        // Not used in this form, but implemented for completeness
        const date = new Date(value);
        if (isNaN(date.getTime())) return false;
        if (min && date < new Date(min)) return false;
        if (max && date > new Date(max)) return false;
        return true;
    }

    function validateLength(value, min, max) {
        const length = value.length;
        if (min !== undefined && length < min) return false;
        if (max !== undefined && length > max) return false;
        return true;
    }

    function validateRequired(value) {
        return value.trim() !== '';
    }

    function validateField(fieldId) {
        const config = CONFIG[fieldId];
        if (!config) return { valid: true, message: '' };

        const field = document.getElementById(fieldId);
        const value = field.value;

        // Check required
        if (config.required && !validateRequired(value)) {
            return { valid: false, message: config.customMessage.required };
        }

        // If not required and empty, valid
        if (!config.required && !value.trim()) {
            return { valid: true, message: '' };
        }

        // Type-specific validation
        switch (config.type) {
            case 'email':
                if (!validateEmail(value)) {
                    return { valid: false, message: config.customMessage.invalid };
                }
                break;
            case 'tel':
                if (!validatePhone(value)) {
                    return { valid: false, message: config.customMessage.invalid };
                }
                break;
            case 'number':
                const num = parseFloat(value);
                if (isNaN(num)) {
                    return { valid: false, message: 'Debe ser un número válido.' };
                }
                if (config.min !== undefined && num < config.min) {
                    return { valid: false, message: config.customMessage.min };
                }
                if (config.max !== undefined && num > config.max) {
                    return { valid: false, message: config.customMessage.max };
                }
                break;
            case 'select':
                if (!value) {
                    return { valid: false, message: config.customMessage.required };
                }
                break;
            case 'text':
                if (!validateLength(value, config.minLength, config.maxLength)) {
                    if (config.minLength && value.length < config.minLength) {
                        return { valid: false, message: config.customMessage.minLength };
                    }
                    if (config.maxLength && value.length > config.maxLength) {
                        return { valid: false, message: config.customMessage.maxLength };
                    }
                }
                break;
        }

        return { valid: true, message: '' };
    }

    // UI functions (handle DOM updates only)
    function showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + '-error');

        field.classList.remove('border-gray-300', 'bg-green-50', 'border-green-500');
        field.classList.add('border-red-500', 'bg-red-50');
        field.setAttribute('aria-invalid', 'true');

        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    function clearError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + '-error');

        field.classList.remove('border-red-500', 'bg-red-50', 'border-green-500', 'bg-green-50');
        field.classList.add('border-gray-300');
        field.removeAttribute('aria-invalid');

        errorElement.textContent = '';
        errorElement.classList.add('hidden');
    }

    function showSuccess() {
        const form = document.getElementById('application-form');
        const successMessage = document.getElementById('success-message');

        form.classList.add('hidden');
        successMessage.classList.remove('hidden');

        // Scroll to success message
        successMessage.scrollIntoView({ behavior: 'smooth' });
    }

    function hideSuccess() {
        const form = document.getElementById('application-form');
        const successMessage = document.getElementById('success-message');

        form.classList.remove('hidden');
        successMessage.classList.add('hidden');
    }

    function showErrorSummary(errors) {
        const errorSummary = document.getElementById('error-summary');
        const errorList = document.getElementById('error-list');

        errorList.innerHTML = '';
        errors.forEach(error => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#' + error.fieldId;
            link.textContent = error.message;
            link.className = 'underline hover:no-underline';
            link.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById(error.fieldId).focus();
            });
            li.appendChild(link);
            errorList.appendChild(li);
        });

        errorSummary.classList.remove('hidden');
        errorSummary.scrollIntoView({ behavior: 'smooth' });
    }

    function hideErrorSummary() {
        const errorSummary = document.getElementById('error-summary');
        errorSummary.classList.add('hidden');
    }

    // EVENT BINDING
    function initValidation() {
        const form = document.getElementById('application-form');
        const resetBtn = document.getElementById('reset-btn');
        const submitAnotherBtn = document.getElementById('submit-another');

        // Real-time validation: validate on 'blur' event for each field
        Object.keys(CONFIG).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            field.addEventListener('blur', function() {
                const result = validateField(fieldId);
                if (!result.valid) {
                    showError(fieldId, result.message);
                } else {
                    clearError(fieldId);
                }
            });

            // Live feedback: on 'input' event, if field was previously invalid, re-validate immediately
            field.addEventListener('input', function() {
                if (field.hasAttribute('aria-invalid')) {
                    const result = validateField(fieldId);
                    if (result.valid) {
                        clearError(fieldId);
                    }
                }
            });
        });

        // On submit: validate ALL fields, prevent default if any invalid, focus first invalid field, show error summary at top of form
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            hideErrorSummary();
            hideSuccess();

            const errors = [];
            let firstInvalidField = null;

            Object.keys(CONFIG).forEach(fieldId => {
                const result = validateField(fieldId);
                if (!result.valid) {
                    showError(fieldId, result.message);
                    errors.push({ fieldId, message: result.message });
                    if (!firstInvalidField) {
                        firstInvalidField = fieldId;
                    }
                } else {
                    clearError(fieldId);
                }
            });

            if (errors.length > 0) {
                showErrorSummary(errors);
                document.getElementById(firstInvalidField).focus();
            } else {
                // All valid, simulate form submission
                showSuccess();
            }
        });

        // Reset button: clears all fields and all error states
        resetBtn.addEventListener('click', function() {
            form.reset();
            Object.keys(CONFIG).forEach(fieldId => {
                clearError(fieldId);
            });
            hideErrorSummary();
            hideSuccess();
        });

        // Submit another button
        submitAnotherBtn.addEventListener('click', function() {
            form.reset();
            Object.keys(CONFIG).forEach(fieldId => {
                clearError(fieldId);
            });
            hideErrorSummary();
            hideSuccess();
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initValidation);
    } else {
        initValidation();
    }
})();