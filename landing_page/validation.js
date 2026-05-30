// validation.js - Nexova Talent Form Validation

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('talentForm');
  if (!form) return;

  const successModal = document.getElementById('success-modal');
  const successModalClose = document.getElementById('success-modal-close');
  const successModalBackdrop = document.getElementById('success-modal-backdrop');
  const comments = document.getElementById('comments');
  const commentsCounter = document.getElementById('comments-counter');
  const fullNameField = form.fullName;
  const emailField = form.email;
  const phoneField = form.phone;
  const countryField = form.country;
  const experienceField = form.experience;
  const sectorField = form.sector;
  const englishField = form.english;
  const availabilityFields = form.querySelectorAll('input[name="availability"]');

  function showError(id, message) {
    const el = document.getElementById('error-' + id);
    if (el) {
      el.textContent = message;
      el.classList.remove('hidden');
    }
  }

  function hideError(id) {
    const el = document.getElementById('error-' + id);
    if (el) {
      el.textContent = '';
      el.classList.add('hidden');
    }
  }

  function validateFullName() {
    const fullName = fullNameField.value.trim();
    if (!/^\w+\s+\w+/.test(fullName)) {
      showError('fullName', 'Name must contain at least first and last name');
      return false;
    }
    hideError('fullName');
    return true;
  }

  function validateEmail() {
    const email = emailField.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showError('email', 'Enter a valid email (example: name@company.com)');
      return false;
    }
    hideError('email');
    return true;
  }

  function validatePhone() {
    const phone = phoneField.value.trim();
    if (!/^\+\d{1,3}\s?\d{3,}$/.test(phone)) {
      showError('phone', 'Phone must include country code (example: +34 612 345 678)');
      return false;
    }
    hideError('phone');
    return true;
  }

  function validateCountry() {
    if (!countryField.value) {
      showError('country', 'Select your country of residence');
      return false;
    }
    hideError('country');
    return true;
  }

  function validateExperience() {
    const experience = Number(experienceField.value);
    if (isNaN(experience) || experience < 0 || experience > 50) {
      showError('experience', 'Years of experience must be between 0 and 50');
      return false;
    }
    hideError('experience');
    return true;
  }

  function validateSector() {
    if (!sectorField.value) {
      showError('sector', 'Select your sector of interest');
      return false;
    }
    hideError('sector');
    return true;
  }

  function validateEnglish() {
    if (!englishField.value) {
      showError('english', 'Indicate your English level');
      return false;
    }
    hideError('english');
    return true;
  }

  function validateAvailability() {
    if (!form.availability.value) {
      showError('availability', 'Select your availability');
      return false;
    }
    hideError('availability');
    return true;
  }

  fullNameField.addEventListener('input', validateFullName);
  fullNameField.addEventListener('blur', validateFullName);
  emailField.addEventListener('input', validateEmail);
  emailField.addEventListener('blur', validateEmail);
  phoneField.addEventListener('input', validatePhone);
  phoneField.addEventListener('blur', validatePhone);
  countryField.addEventListener('change', validateCountry);
  experienceField.addEventListener('input', validateExperience);
  experienceField.addEventListener('blur', validateExperience);
  sectorField.addEventListener('change', validateSector);
  englishField.addEventListener('change', validateEnglish);
  availabilityFields.forEach(function (field) {
    field.addEventListener('change', validateAvailability);
  });

  function openSuccessModal() {
    if (!successModal) return;
    successModal.classList.remove('hidden');
    successModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');
    if (successModalClose) successModalClose.focus();
  }

  function closeSuccessModal() {
    if (!successModal) return;
    successModal.classList.add('hidden');
    successModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
  }

  if (successModalClose) {
    successModalClose.addEventListener('click', closeSuccessModal);
  }

  if (successModalBackdrop) {
    successModalBackdrop.addEventListener('click', closeSuccessModal);
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeSuccessModal();
    }
  });

  // Character counter for comments
  if (comments && commentsCounter) {
    comments.addEventListener('input', function () {
      const remaining = 500 - comments.value.length;
      commentsCounter.textContent = `${remaining} characters remaining`;
      if (remaining < 0) {
        commentsCounter.classList.add('text-red-600');
      } else {
        commentsCounter.classList.remove('text-red-600');
      }
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true;

    if (!validateFullName()) valid = false;
    if (!validateEmail()) valid = false;
    if (!validatePhone()) valid = false;

    if (!validateCountry()) valid = false;
    if (!validateExperience()) valid = false;
    if (!validateSector()) valid = false;
    if (!validateEnglish()) valid = false;
    if (!validateAvailability()) valid = false;

    // LinkedIn: if provided, must be valid URL
    const linkedin = form.linkedin.value.trim();
    if (linkedin && !/^https?:\/\//.test(linkedin)) {
      showError('linkedin', 'If you include LinkedIn, it must be a valid URL');
      valid = false;
    } else {
      hideError('linkedin');
    }

    // Comments: max 500 chars
    if (comments && comments.value.length > 500) {
      showError('comments', `Comments cannot exceed 500 characters (${500 - comments.value.length} remaining)`);
      valid = false;
    } else {
      hideError('comments');
    }

    // Data policy: must be checked
    if (!form.policy.checked) {
      showError('policy', 'You must accept the data processing policy to continue');
      valid = false;
    } else {
      hideError('policy');
    }

    // If valid, show success message
    if (valid) {
      form.reset();
      if (commentsCounter) commentsCounter.textContent = '500 characters remaining';
      openSuccessModal();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      closeSuccessModal();
    }
  });
});
