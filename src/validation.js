(function () {
  const form = document.getElementById('applicationForm');
  if (!form) {
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  const clearBtn = document.getElementById('clearBtn');
  const commentsInput = document.getElementById('comments');
  const commentsCounter = document.getElementById('commentsCounter');

  const fieldNodes = {
    companyName: document.getElementById('companyName'),
    contactPerson: document.getElementById('contactPerson'),
    corporateEmail: document.getElementById('corporateEmail'),
    phone: document.getElementById('phone'),
    companyWebsite: document.getElementById('companyWebsite'),
    operatingCountry: document.getElementById('operatingCountry'),
    productType: document.getElementById('productType'),
    shippingVolume: document.getElementById('shippingVolume'),
    comments: commentsInput,
    privacyAccepted: document.getElementById('privacyAccepted')
  };

  const touched = {};
  const inputFields = [
    'companyName',
    'contactPerson',
    'corporateEmail',
    'phone',
    'companyWebsite',
    'operatingCountry',
    'productType',
    'shippingVolume',
    'comments',
    'privacyAccepted'
  ];

  const servicesInputs = Array.from(document.querySelectorAll('input[name="services"]'));
  const current3plInputs = Array.from(document.querySelectorAll('input[name="current3pl"]'));

  const groupNodes = {
    services: document.getElementById('servicesFieldset'),
    current3pl: document.getElementById('current3plFieldset'),
    privacyAccepted: document.getElementById('privacyGroup')
  };

  function normalize(value) {
    return value.trim();
  }

  function isValidEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(value);
  }

  function isValidPhone(value) {
    const phoneRegex = /^\+\d{1,3}\s[\d\s()-]{6,20}$/;
    return phoneRegex.test(value);
  }

  function isValidUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_error) {
      return false;
    }
  }

  function getErrorNode(fieldName) {
    return document.getElementById(fieldName + 'Error');
  }

  function markValid(node, groupNode, errorNode) {
    if (node) {
      node.classList.remove('border-red-500', 'focus-visible:ring-red-200');
      node.classList.add('border-emerald-500');
      node.removeAttribute('aria-invalid');
    }
    if (groupNode) {
      groupNode.classList.remove('border-red-400', 'bg-red-50/40');
      groupNode.classList.add('border-emerald-300');
    }
    if (errorNode) {
      errorNode.textContent = '';
      errorNode.classList.add('hidden');
    }
  }

  function markInvalid(node, groupNode, errorNode, message) {
    if (node) {
      node.classList.remove('border-emerald-500');
      node.classList.add('border-red-500', 'focus-visible:ring-red-200');
      node.setAttribute('aria-invalid', 'true');
    }
    if (groupNode) {
      groupNode.classList.remove('border-emerald-300');
      groupNode.classList.add('border-red-400', 'bg-red-50/40');
    }
    if (errorNode) {
      errorNode.textContent = message;
      errorNode.classList.remove('hidden');
    }
  }

  function validateCompanyName(showError) {
    const node = fieldNodes.companyName;
    const value = normalize(node.value);
    const valid = value.length >= 2;
    const error = getErrorNode('companyName');

    if (valid || !showError) {
      markValid(node, null, error);
    } else {
      markInvalid(node, null, error, 'Company name must be at least 2 characters long.');
    }
    return valid;
  }

  function validateContactPerson(showError) {
    const node = fieldNodes.contactPerson;
    const value = normalize(node.value);
    const words = value.split(/\s+/).filter(Boolean);
    const valid = words.length >= 2;
    const error = getErrorNode('contactPerson');

    if (valid || !showError) {
      markValid(node, null, error);
    } else {
      markInvalid(node, null, error, 'Contact person must include at least first and last name.');
    }
    return valid;
  }

  function validateCorporateEmail(showError) {
    const node = fieldNodes.corporateEmail;
    const value = normalize(node.value);
    const valid = isValidEmail(value);
    const error = getErrorNode('corporateEmail');

    if (valid || !showError) {
      markValid(node, null, error);
    } else {
      markInvalid(node, null, error, 'Please enter a valid corporate email address.');
    }
    return valid;
  }

  function validatePhone(showError) {
    const node = fieldNodes.phone;
    const value = normalize(node.value);
    const valid = isValidPhone(value);
    const error = getErrorNode('phone');

    if (valid || !showError) {
      markValid(node, null, error);
    } else {
      markInvalid(node, null, error, 'Phone format must be +[country code] [number], for example +52 5512345678.');
    }
    return valid;
  }

  function validateCompanyWebsite(showError) {
    const node = fieldNodes.companyWebsite;
    const value = normalize(node.value);
    const valid = value === '' || isValidUrl(value);
    const error = getErrorNode('companyWebsite');

    if (valid || !showError) {
      markValid(node, null, error);
    } else {
      markInvalid(node, null, error, 'Please enter a valid URL starting with http:// or https://.');
    }
    return valid;
  }

  function validateOperatingCountry(showError) {
    const node = fieldNodes.operatingCountry;
    const valid = node.value !== '';
    const error = getErrorNode('operatingCountry');

    if (valid || !showError) {
      markValid(node, null, error);
    } else {
      markInvalid(node, null, error, 'Please select your main operating country.');
    }
    return valid;
  }

  function validateProductType(showError) {
    const node = fieldNodes.productType;
    const valid = node.value !== '';
    const error = getErrorNode('productType');

    if (valid || !showError) {
      markValid(node, null, error);
    } else {
      markInvalid(node, null, error, 'Please select a product type.');
    }
    return valid;
  }

  function validateShippingVolume(showError) {
    const node = fieldNodes.shippingVolume;
    const valid = node.value !== '';
    const error = getErrorNode('shippingVolume');

    if (valid || !showError) {
      markValid(node, null, error);
    } else {
      markInvalid(node, null, error, 'Please select an estimated monthly shipping volume.');
    }
    return valid;
  }

  function validateServices(showError) {
    const valid = servicesInputs.some(function (input) {
      return input.checked;
    });
    const error = getErrorNode('services');

    if (valid || !showError) {
      markValid(null, groupNodes.services, error);
    } else {
      markInvalid(null, groupNodes.services, error, 'Select at least one service of interest.');
    }
    return valid;
  }

  function validateCurrent3pl(showError) {
    const valid = current3plInputs.some(function (input) {
      return input.checked;
    });
    const error = getErrorNode('current3pl');

    if (valid || !showError) {
      markValid(null, groupNodes.current3pl, error);
    } else {
      markInvalid(null, groupNodes.current3pl, error, 'Please choose one 3PL status option.');
    }
    return valid;
  }

  function validateComments(showError) {
    const value = fieldNodes.comments.value;
    const valid = value.length <= 500;
    const error = getErrorNode('comments');

    if (commentsCounter) {
      commentsCounter.textContent = value.length + ' / 500';
    }

    if (valid || !showError) {
      markValid(fieldNodes.comments, null, error);
    } else {
      markInvalid(fieldNodes.comments, null, error, 'Comments must be 500 characters or fewer.');
    }
    return valid;
  }

  function validatePrivacyAccepted(showError) {
    const node = fieldNodes.privacyAccepted;
    const valid = node.checked;
    const error = getErrorNode('privacyAccepted');

    if (valid || !showError) {
      markValid(null, groupNodes.privacyAccepted, error);
      node.removeAttribute('aria-invalid');
    } else {
      markInvalid(null, groupNodes.privacyAccepted, error, 'You must accept the privacy policy before submitting.');
      node.setAttribute('aria-invalid', 'true');
    }
    return valid;
  }

  function validateAll(showErrors) {
    const allValid = [
      validateCompanyName(showErrors || touched.companyName),
      validateContactPerson(showErrors || touched.contactPerson),
      validateCorporateEmail(showErrors || touched.corporateEmail),
      validatePhone(showErrors || touched.phone),
      validateCompanyWebsite(showErrors || touched.companyWebsite),
      validateOperatingCountry(showErrors || touched.operatingCountry),
      validateProductType(showErrors || touched.productType),
      validateShippingVolume(showErrors || touched.shippingVolume),
      validateServices(showErrors || touched.services),
      validateCurrent3pl(showErrors || touched.current3pl),
      validateComments(showErrors || touched.comments),
      validatePrivacyAccepted(showErrors || touched.privacyAccepted)
    ].every(Boolean);

    if (submitBtn) {
      submitBtn.disabled = !allValid;
    }
    return allValid;
  }

  function setTouched(name) {
    touched[name] = true;
  }

  fieldNodes.companyName.addEventListener('input', function () {
    setTouched('companyName');
    validateAll(false);
  });
  fieldNodes.companyName.addEventListener('blur', function () {
    setTouched('companyName');
    validateAll(false);
  });

  fieldNodes.contactPerson.addEventListener('input', function () {
    setTouched('contactPerson');
    validateAll(false);
  });
  fieldNodes.contactPerson.addEventListener('blur', function () {
    setTouched('contactPerson');
    validateAll(false);
  });

  fieldNodes.corporateEmail.addEventListener('input', function () {
    setTouched('corporateEmail');
    validateAll(false);
  });
  fieldNodes.corporateEmail.addEventListener('blur', function () {
    setTouched('corporateEmail');
    validateAll(false);
  });

  fieldNodes.phone.addEventListener('input', function () {
    setTouched('phone');
    validateAll(false);
  });
  fieldNodes.phone.addEventListener('blur', function () {
    setTouched('phone');
    validateAll(false);
  });

  fieldNodes.companyWebsite.addEventListener('input', function () {
    setTouched('companyWebsite');
    validateAll(false);
  });
  fieldNodes.companyWebsite.addEventListener('blur', function () {
    setTouched('companyWebsite');
    validateAll(false);
  });

  fieldNodes.operatingCountry.addEventListener('change', function () {
    setTouched('operatingCountry');
    validateAll(false);
  });
  fieldNodes.operatingCountry.addEventListener('blur', function () {
    setTouched('operatingCountry');
    validateAll(false);
  });

  fieldNodes.productType.addEventListener('change', function () {
    setTouched('productType');
    validateAll(false);
  });
  fieldNodes.productType.addEventListener('blur', function () {
    setTouched('productType');
    validateAll(false);
  });

  fieldNodes.shippingVolume.addEventListener('change', function () {
    setTouched('shippingVolume');
    validateAll(false);
  });
  fieldNodes.shippingVolume.addEventListener('blur', function () {
    setTouched('shippingVolume');
    validateAll(false);
  });

  servicesInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      setTouched('services');
      validateAll(false);
    });
  });

  current3plInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      setTouched('current3pl');
      validateAll(false);
    });
  });

  fieldNodes.comments.addEventListener('input', function () {
    setTouched('comments');
    validateAll(false);
  });
  fieldNodes.comments.addEventListener('blur', function () {
    setTouched('comments');
    validateAll(false);
  });

  fieldNodes.privacyAccepted.addEventListener('change', function () {
    setTouched('privacyAccepted');
    validateAll(false);
  });
  fieldNodes.privacyAccepted.addEventListener('blur', function () {
    setTouched('privacyAccepted');
    validateAll(false);
  });

  form.addEventListener('submit', function (event) {
    inputFields.forEach(function (name) {
      touched[name] = true;
    });
    touched.services = true;
    touched.current3pl = true;

    const valid = validateAll(true);
    if (!valid) {
      event.preventDefault();

      const firstInvalid = form.querySelector('[aria-invalid="true"], .border-red-500, .border-red-400');
      if (firstInvalid && typeof firstInvalid.focus === 'function') {
        firstInvalid.focus();
      }
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      window.setTimeout(function () {
        Object.keys(touched).forEach(function (key) {
          touched[key] = false;
        });

        form.querySelectorAll('[aria-invalid="true"]').forEach(function (node) {
          node.removeAttribute('aria-invalid');
        });

        form.querySelectorAll('.border-red-500, .focus-visible\\:ring-red-200, .border-emerald-500, .border-red-400, .bg-red-50/40, .border-emerald-300').forEach(function (node) {
          node.classList.remove('border-red-500', 'focus-visible:ring-red-200', 'border-emerald-500', 'border-red-400', 'bg-red-50/40', 'border-emerald-300');
        });
        form.querySelectorAll('[id$="Error"]').forEach(function (node) {
          node.textContent = '';
          node.classList.add('hidden');
        });

        validateAll(false);
      }, 0);
    });
  }

  validateAll(false);
})();
