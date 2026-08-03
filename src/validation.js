(function () {
  const form = document.getElementById('applicationForm');
  if (!form) {
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  const clearBtn = document.getElementById('clearBtn');
  const validationOutput = document.getElementById('validationOutput');

  const fieldNodes = {
    sku: document.getElementById('sku'),
    weightKg: document.getElementById('weightKg'),
    lengthCm: document.getElementById('lengthCm'),
    widthCm: document.getElementById('widthCm'),
    heightCm: document.getElementById('heightCm'),
    stockQuantity: document.getElementById('stockQuantity'),
    minStockThreshold: document.getElementById('minStockThreshold'),
    unitCostUSD: document.getElementById('unitCostUSD'),
    quantity: document.getElementById('quantity'),
    declaredValueUSD: document.getElementById('declaredValueUSD'),
    distanceKm: document.getElementById('distanceKm'),
    baseRateUSD: document.getElementById('baseRateUSD'),
    ratePerKgUSD: document.getElementById('ratePerKgUSD'),
    ratePerKmUSD: document.getElementById('ratePerKmUSD'),
    avgDeliveryDays: document.getElementById('avgDeliveryDays'),
    onTimeRate: document.getElementById('onTimeRate'),
    maxWeightKg: document.getElementById('maxWeightKg')
  };

  const operatesInInputs = Array.from(document.querySelectorAll('input[name="operatesIn"]'));
  const operatesInFieldset = document.getElementById('operatesInFieldset');

  const inputFields = Object.keys(fieldNodes);
  const touched = {};

  function normalize(value) {
    return value.trim();
  }

  function getErrorNode(fieldName) {
    return document.getElementById(fieldName + 'Error');
  }

  function markValid(node, errorNode) {
    if (node) {
      node.classList.remove('border-red-500', 'focus-visible:ring-red-200');
      node.classList.add('border-emerald-500');
      node.removeAttribute('aria-invalid');
    }
    if (errorNode) {
      errorNode.textContent = '';
      errorNode.classList.add('hidden');
    }
  }

  function markInvalid(node, errorNode, message) {
    if (node) {
      node.classList.remove('border-emerald-500');
      node.classList.add('border-red-500', 'focus-visible:ring-red-200');
      node.setAttribute('aria-invalid', 'true');
    }
    if (errorNode) {
      errorNode.textContent = message;
      errorNode.classList.remove('hidden');
    }
  }

  function markGroupValid(groupNode, errorNode) {
    groupNode.classList.remove('border-red-400', 'bg-red-50/40');
    groupNode.classList.add('border-emerald-300');
    if (errorNode) {
      errorNode.textContent = '';
      errorNode.classList.add('hidden');
    }
  }

  function markGroupInvalid(groupNode, errorNode, message) {
    groupNode.classList.remove('border-emerald-300');
    groupNode.classList.add('border-red-400', 'bg-red-50/40');
    if (errorNode) {
      errorNode.textContent = message;
      errorNode.classList.remove('hidden');
    }
  }

  function toNumber(node) {
    const value = normalize(node.value);
    if (value === '') {
      return Number.NaN;
    }

    return Number(value);
  }

  function validateSku(showError) {
    const node = fieldNodes.sku;
    const value = normalize(node.value);
    const valid = value.length > 0;
    const error = getErrorNode('sku');

    if (valid || !showError) {
      markValid(node, error);
    } else {
      markInvalid(node, error, 'SKU must not be empty.');
    }
    return valid;
  }

  function validateRangeField(fieldName, minExclusive, maxInclusive, message) {
    return function (showError) {
      const node = fieldNodes[fieldName];
      const value = toNumber(node);
      const valid = Number.isFinite(value) && value > minExclusive && value <= maxInclusive;
      const error = getErrorNode(fieldName);

      if (valid || !showError) {
        markValid(node, error);
      } else {
        markInvalid(node, error, message);
      }

      return valid;
    };
  }

  function validateMinField(fieldName, minInclusive, message) {
    return function (showError) {
      const node = fieldNodes[fieldName];
      const value = toNumber(node);
      const valid = Number.isFinite(value) && value >= minInclusive;
      const error = getErrorNode(fieldName);

      if (valid || !showError) {
        markValid(node, error);
      } else {
        markInvalid(node, error, message);
      }

      return valid;
    };
  }

  function validateBetweenField(fieldName, minInclusive, maxInclusive, message) {
    return function (showError) {
      const node = fieldNodes[fieldName];
      const value = toNumber(node);
      const valid = Number.isFinite(value) && value >= minInclusive && value <= maxInclusive;
      const error = getErrorNode(fieldName);

      if (valid || !showError) {
        markValid(node, error);
      } else {
        markInvalid(node, error, message);
      }

      return valid;
    };
  }

  const validateWeightKg = validateRangeField(
    'weightKg',
    0,
    100,
    'weightKg must be greater than 0 and less than or equal to 100.'
  );

  const validateLengthCm = validateRangeField(
    'lengthCm',
    0,
    200,
    'lengthCm must be greater than 0 and less than or equal to 200.'
  );

  const validateWidthCm = validateRangeField(
    'widthCm',
    0,
    200,
    'widthCm must be greater than 0 and less than or equal to 200.'
  );

  const validateHeightCm = validateRangeField(
    'heightCm',
    0,
    200,
    'heightCm must be greater than 0 and less than or equal to 200.'
  );

  const validateStockQuantity = validateMinField('stockQuantity', 0, 'stockQuantity must be greater than or equal to 0.');
  const validateMinStockThreshold = validateMinField('minStockThreshold', 0, 'minStockThreshold must be greater than or equal to 0.');
  const validateUnitCostUSD = validateRangeField('unitCostUSD', 0, Number.POSITIVE_INFINITY, 'unitCostUSD must be greater than 0.');

  const validateQuantity = validateRangeField('quantity', 0, Number.POSITIVE_INFINITY, 'quantity must be greater than 0.');
  const validateDeclaredValueUSD = validateRangeField('declaredValueUSD', 0, Number.POSITIVE_INFINITY, 'declaredValueUSD must be greater than 0.');
  const validateDistanceKm = validateMinField('distanceKm', 0, 'distanceKm must be greater than or equal to 0.');

  const validateBaseRateUSD = validateMinField('baseRateUSD', 0, 'baseRateUSD must be greater than or equal to 0.');
  const validateRatePerKgUSD = validateMinField('ratePerKgUSD', 0, 'ratePerKgUSD must be greater than or equal to 0.');
  const validateRatePerKmUSD = validateMinField('ratePerKmUSD', 0, 'ratePerKmUSD must be greater than or equal to 0.');
  const validateAvgDeliveryDays = validateRangeField('avgDeliveryDays', 0, Number.POSITIVE_INFINITY, 'avgDeliveryDays must be greater than 0.');
  const validateOnTimeRate = validateBetweenField('onTimeRate', 0, 100, 'onTimeRate must be between 0 and 100.');
  const validateMaxWeightKg = validateRangeField('maxWeightKg', 0, Number.POSITIVE_INFINITY, 'maxWeightKg must be greater than 0.');

  function validateOperatesIn(showError) {
    const valid = operatesInInputs.some(function (input) {
      return input.checked;
    });
    const error = getErrorNode('operatesIn');

    if (valid || !showError) {
      markGroupValid(operatesInFieldset, error);
    } else {
      markGroupInvalid(operatesInFieldset, error, 'operatesIn must contain at least one country.');
    }

    return valid;
  }

  function validateAll(showErrors) {
    const allValid = [
      validateSku(showErrors || touched.sku),
      validateWeightKg(showErrors || touched.weightKg),
      validateLengthCm(showErrors || touched.lengthCm),
      validateWidthCm(showErrors || touched.widthCm),
      validateHeightCm(showErrors || touched.heightCm),
      validateStockQuantity(showErrors || touched.stockQuantity),
      validateMinStockThreshold(showErrors || touched.minStockThreshold),
      validateUnitCostUSD(showErrors || touched.unitCostUSD),
      validateQuantity(showErrors || touched.quantity),
      validateDeclaredValueUSD(showErrors || touched.declaredValueUSD),
      validateDistanceKm(showErrors || touched.distanceKm),
      validateBaseRateUSD(showErrors || touched.baseRateUSD),
      validateRatePerKgUSD(showErrors || touched.ratePerKgUSD),
      validateRatePerKmUSD(showErrors || touched.ratePerKmUSD),
      validateAvgDeliveryDays(showErrors || touched.avgDeliveryDays),
      validateOnTimeRate(showErrors || touched.onTimeRate),
      validateMaxWeightKg(showErrors || touched.maxWeightKg),
      validateOperatesIn(showErrors || touched.operatesIn)
    ].every(Boolean);

    if (submitBtn) {
      submitBtn.setAttribute('aria-disabled', allValid ? 'false' : 'true');
    }

    return allValid;
  }

  function validateProduct() {
    const errors = [];

    const sku = normalize(fieldNodes.sku.value);
    const weightKg = toNumber(fieldNodes.weightKg);
    const lengthCm = toNumber(fieldNodes.lengthCm);
    const widthCm = toNumber(fieldNodes.widthCm);
    const heightCm = toNumber(fieldNodes.heightCm);
    const stockQuantity = toNumber(fieldNodes.stockQuantity);
    const minStockThreshold = toNumber(fieldNodes.minStockThreshold);
    const unitCostUSD = toNumber(fieldNodes.unitCostUSD);

    if (sku.length === 0) {
      errors.push('sku must not be empty');
    }
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 100) {
      errors.push('weightKg must be > 0 and <= 100');
    }
    if (!Number.isFinite(lengthCm) || lengthCm <= 0 || lengthCm > 200) {
      errors.push('dimensions.lengthCm must be > 0 and <= 200');
    }
    if (!Number.isFinite(widthCm) || widthCm <= 0 || widthCm > 200) {
      errors.push('dimensions.widthCm must be > 0 and <= 200');
    }
    if (!Number.isFinite(heightCm) || heightCm <= 0 || heightCm > 200) {
      errors.push('dimensions.heightCm must be > 0 and <= 200');
    }
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      errors.push('stockQuantity must be >= 0');
    }
    if (!Number.isFinite(minStockThreshold) || minStockThreshold < 0) {
      errors.push('minStockThreshold must be >= 0');
    }
    if (!Number.isFinite(unitCostUSD) || unitCostUSD <= 0) {
      errors.push('unitCostUSD must be > 0');
    }

    return { valid: errors.length === 0, errors };
  }

  function validateShipment() {
    const errors = [];

    const quantity = toNumber(fieldNodes.quantity);
    const declaredValueUSD = toNumber(fieldNodes.declaredValueUSD);
    const distanceKm = toNumber(fieldNodes.distanceKm);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push('quantity must be > 0');
    }
    if (!Number.isFinite(declaredValueUSD) || declaredValueUSD <= 0) {
      errors.push('declaredValueUSD must be > 0');
    }
    if (!Number.isFinite(distanceKm) || distanceKm < 0) {
      errors.push('distanceKm must be >= 0');
    }

    return { valid: errors.length === 0, errors };
  }

  function validateCarrier() {
    const errors = [];

    const baseRateUSD = toNumber(fieldNodes.baseRateUSD);
    const ratePerKgUSD = toNumber(fieldNodes.ratePerKgUSD);
    const ratePerKmUSD = toNumber(fieldNodes.ratePerKmUSD);
    const avgDeliveryDays = toNumber(fieldNodes.avgDeliveryDays);
    const onTimeRate = toNumber(fieldNodes.onTimeRate);
    const maxWeightKg = toNumber(fieldNodes.maxWeightKg);
    const operatesInCount = operatesInInputs.filter(function (input) {
      return input.checked;
    }).length;

    if (!Number.isFinite(baseRateUSD) || baseRateUSD < 0) {
      errors.push('baseRateUSD must be >= 0');
    }
    if (!Number.isFinite(ratePerKgUSD) || ratePerKgUSD < 0) {
      errors.push('ratePerKgUSD must be >= 0');
    }
    if (!Number.isFinite(ratePerKmUSD) || ratePerKmUSD < 0) {
      errors.push('ratePerKmUSD must be >= 0');
    }
    if (!Number.isFinite(avgDeliveryDays) || avgDeliveryDays <= 0) {
      errors.push('avgDeliveryDays must be > 0');
    }
    if (!Number.isFinite(onTimeRate) || onTimeRate < 0 || onTimeRate > 100) {
      errors.push('onTimeRate must be between 0 and 100');
    }
    if (!Number.isFinite(maxWeightKg) || maxWeightKg <= 0) {
      errors.push('maxWeightKg must be > 0');
    }
    if (operatesInCount < 1) {
      errors.push('operatesIn must contain at least 1 country');
    }

    return { valid: errors.length === 0, errors };
  }

  function renderValidationResult() {
    if (!validationOutput) {
      return;
    }

    const productValidation = validateProduct();
    const shipmentValidation = validateShipment();
    const carrierValidation = validateCarrier();

    const payload = {
      productValidation,
      shipmentValidation,
      carrierValidation
    };

    validationOutput.textContent = JSON.stringify(payload, null, 2);
  }

  function setTouched(name) {
    touched[name] = true;
  }

  inputFields.forEach(function (fieldName) {
    const node = fieldNodes[fieldName];
    node.addEventListener('input', function () {
      setTouched(fieldName);
      validateAll(false);
      renderValidationResult();
    });
    node.addEventListener('blur', function () {
      setTouched(fieldName);
      validateAll(false);
      renderValidationResult();
    });
  });

  operatesInInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      setTouched('operatesIn');
      validateAll(false);
      renderValidationResult();
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    inputFields.forEach(function (name) {
      touched[name] = true;
    });
    touched.operatesIn = true;

    const valid = validateAll(true);
    renderValidationResult();

    const firstInvalid = form.querySelector('[aria-invalid="true"], .border-red-500, .border-red-400');
    if (!valid && firstInvalid && typeof firstInvalid.focus === 'function') {
      firstInvalid.focus();
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
        if (validationOutput) {
          validationOutput.textContent = JSON.stringify(
            {
              message: 'Run validation to see results'
            },
            null,
            2
          );
        }
      }, 0);
    });
  }

  validateAll(false);
  renderValidationResult();
})();
