(function (root) {
    const VALID_COUNTRIES = ["Colombia", "United States"];
    const VALID_CATEGORIES = [
        "proteins",
        "vegetables_and_fruit",
        "beverages_and_packaging",
        "imported_sauces_and_condiments",
    ];
    const ALLOWED_STATUSES = ["active", "preferred", "inactive"];
    const STATUS_ALIASES = {
        suspend: "inactive",
        suspended: "inactive",
    };
    const FIELD_NAMES = [
        "name",
        "country",
        "product_categories",
        "emergency_surcharge_pct",
        "status",
    ];

    function trim(value) {
        return String(value == null ? "" : value).trim();
    }

    function normalizeStatus(value) {
        const raw = trim(value);
        return STATUS_ALIASES[raw] || raw;
    }

    function validateName(value) {
        const name = trim(value);
        if (!name) {
            return "Legal or trade name is required.";
        }
        if (name.length < 2) {
            return "Legal or trade name must be at least 2 characters (you entered " + name.length + ").";
        }
        return "";
    }

    function validateCountry(value) {
        const country = trim(value);
        if (!country) {
            return "Country is required.";
        }
        if (VALID_COUNTRIES.indexOf(country) === -1) {
            return "Country must be exactly Colombia or United States.";
        }
        return "";
    }

    function readCategories(form) {
        return Array.prototype.map.call(
            form.querySelectorAll('input[name="product_categories"]:checked'),
            function (input) {
                return input.value;
            }
        );
    }

    function validateProductCategories(values) {
        const list = Array.isArray(values) ? values : [];
        if (list.length === 0) {
            return "Select at least one product category: proteins, vegetables_and_fruit, beverages_and_packaging, or imported_sauces_and_condiments.";
        }
        for (let i = 0; i < list.length; i += 1) {
            if (VALID_CATEGORIES.indexOf(list[i]) === -1) {
                return "Invalid category “" + list[i] + "”. Use only proteins, vegetables_and_fruit, beverages_and_packaging, or imported_sauces_and_condiments.";
            }
        }
        return "";
    }

    function validateEmergencySurchargePct(value) {
        const raw = trim(value);
        if (!raw) {
            return "Emergency surcharge is required.";
        }
        if (!/^-?\d+(\.\d+)?$/.test(raw)) {
            return "Emergency surcharge must be a number, not text.";
        }
        const amount = Number(raw);
        if (!Number.isFinite(amount)) {
            return "Emergency surcharge must be a number.";
        }
        if (amount < 0) {
            return "Emergency surcharge cannot be negative.";
        }
        if (!(amount > 0)) {
            return "Emergency surcharge must be greater than 0. Use 8 for protein emergency orders.";
        }
        return "";
    }

    function validateStatus(value) {
        const raw = trim(value);
        if (!raw) {
            return "Status is required.";
        }
        const status = normalizeStatus(raw);
        if (ALLOWED_STATUSES.indexOf(status) === -1) {
            return "Status must be active, preferred, or inactive. suspend/suspended is stored as inactive.";
        }
        return "";
    }

    function readFields(form) {
        const elements = form.elements;
        return {
            name: elements.name ? elements.name.value : "",
            country: elements.country ? elements.country.value : "",
            product_categories: readCategories(form),
            emergency_surcharge_pct: elements.emergency_surcharge_pct
                ? elements.emergency_surcharge_pct.value
                : "",
            status: elements.status ? elements.status.value : "",
        };
    }

    function validateApplication(fields) {
        return {
            name: validateName(fields.name),
            country: validateCountry(fields.country),
            product_categories: validateProductCategories(fields.product_categories),
            emergency_surcharge_pct: validateEmergencySurchargePct(fields.emergency_surcharge_pct),
            status: validateStatus(fields.status),
        };
    }

    function isValid(errors) {
        return FIELD_NAMES.every(function (key) {
            return !errors[key];
        });
    }

    function setControlInvalid(control, invalid) {
        if (!control) {
            return;
        }
        if (invalid) {
            control.setAttribute("aria-invalid", "true");
        } else {
            control.removeAttribute("aria-invalid");
        }
    }

    function setFieldError(form, field, message) {
        const errorEl = form.querySelector('[data-error-for="' + field + '"]');
        if (errorEl) {
            errorEl.textContent = message || "";
            errorEl.classList.toggle("hidden", !message);
            if (message) {
                errorEl.setAttribute("role", "alert");
            } else {
                errorEl.removeAttribute("role");
            }
        }

        const controls = form.querySelectorAll('[name="' + field + '"]');
        for (let i = 0; i < controls.length; i += 1) {
            setControlInvalid(controls[i], Boolean(message));
        }

        const group = form.querySelector('[data-field="' + field + '"]');
        if (group) {
            group.classList.toggle("has-error", Boolean(message));
            if (field === "product_categories") {
                setControlInvalid(group, Boolean(message));
            }
        }
    }

    function clearErrors(form) {
        FIELD_NAMES.forEach(function (field) {
            setFieldError(form, field, "");
        });
        const summary = document.getElementById("form-error-summary");
        if (summary) {
            summary.hidden = true;
            summary.textContent = "";
        }
    }

    function showErrors(form, errors) {
        const messages = [];
        FIELD_NAMES.forEach(function (field) {
            setFieldError(form, field, errors[field]);
            if (errors[field]) {
                messages.push(errors[field]);
            }
        });
        const summary = document.getElementById("form-error-summary");
        if (!summary) {
            return;
        }
        if (!messages.length) {
            summary.hidden = true;
            summary.textContent = "";
            return;
        }
        summary.hidden = false;
        summary.textContent = "";
        const heading = document.createElement("p");
        heading.className = "font-semibold";
        heading.textContent = "Submission blocked. Fix " + messages.length + " error(s):";
        const list = document.createElement("ul");
        list.className = "mt-2 list-disc space-y-1 pl-5 font-normal";
        messages.forEach(function (message) {
            const item = document.createElement("li");
            item.textContent = message;
            list.appendChild(item);
        });
        summary.appendChild(heading);
        summary.appendChild(list);
    }

    function setHidden(el, hide) {
        if (!el) {
            return;
        }
        el.hidden = hide;
        el.classList.toggle("hidden", hide);
    }

    function fillSuccessDetail(container, payload) {
        const rows = [
            ["name", payload.name],
            ["country", payload.country],
            ["product_categories", payload.product_categories.join(", ")],
            ["emergency_surcharge_pct", String(payload.emergency_surcharge_pct)],
            ["status", payload.status],
        ];
        container.textContent = "";
        rows.forEach(function (row) {
            const dt = document.createElement("dt");
            dt.className = "font-semibold";
            dt.textContent = row[0];
            const dd = document.createElement("dd");
            dd.className = "mb-2 break-words font-mono sm:mb-0";
            dd.textContent = row[1];
            container.appendChild(dt);
            container.appendChild(dd);
        });
    }

    function showSuccess(payload) {
        const success = document.getElementById("form-success");
        const form = document.getElementById("supplier-application");
        setHidden(form, true);
        if (!success) {
            return;
        }
        const detail = success.querySelector("[data-success-detail]");
        if (detail) {
            fillSuccessDetail(detail, payload);
        }
        setHidden(success, false);
        if (typeof success.scrollIntoView === "function") {
            success.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        success.focus();
    }

    function resetToForm() {
        const form = document.getElementById("supplier-application");
        const success = document.getElementById("form-success");
        setHidden(success, true);
        setHidden(form, false);
        if (form) {
            form.reset();
            clearErrors(form);
            const name = form.elements.name;
            if (name && typeof name.focus === "function") {
                name.focus();
            }
        }
    }

    function validateOne(form, field) {
        const errors = validateApplication(readFields(form));
        setFieldError(form, field, errors[field]);
        return !errors[field];
    }

    function fieldFromEvent(target) {
        if (!target || !target.name) {
            return "";
        }
        return FIELD_NAMES.indexOf(target.name) === -1 ? "" : target.name;
    }

    function mount() {
        const form = document.getElementById("supplier-application");
        if (!form) {
            return;
        }
        form.setAttribute("novalidate", "novalidate");
        const touched = {};

        form.addEventListener(
            "blur",
            function (event) {
                const field = fieldFromEvent(event.target);
                if (!field) {
                    return;
                }
                touched[field] = true;
                validateOne(form, field);
            },
            true
        );

        form.addEventListener("input", function (event) {
            const field = fieldFromEvent(event.target);
            if (!field) {
                return;
            }
            const value = event.target.type === "checkbox" ? "checked" : trim(event.target.value);
            if (!touched[field] && !value) {
                return;
            }
            validateOne(form, field);
        });

        form.addEventListener("change", function (event) {
            const field = fieldFromEvent(event.target);
            if (!field) {
                return;
            }
            touched[field] = true;
            validateOne(form, field);
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            FIELD_NAMES.forEach(function (field) {
                touched[field] = true;
            });
            const fields = readFields(form);
            const errors = validateApplication(fields);
            if (!isValid(errors)) {
                showErrors(form, errors);
                const firstInvalid = form.querySelector('[aria-invalid="true"]');
                if (firstInvalid && typeof firstInvalid.focus === "function") {
                    firstInvalid.focus();
                }
                return;
            }
            clearErrors(form);
            const summary = document.getElementById("form-error-summary");
            setHidden(summary, true);
            showSuccess({
                name: trim(fields.name),
                country: trim(fields.country),
                product_categories: fields.product_categories.slice(),
                emergency_surcharge_pct: Number(fields.emergency_surcharge_pct),
                status: normalizeStatus(fields.status),
            });
        });

        form.addEventListener("reset", function () {
            FIELD_NAMES.forEach(function (field) {
                delete touched[field];
            });
            window.setTimeout(function () {
                clearErrors(form);
                const name = form.elements.name;
                if (name && typeof name.focus === "function") {
                    name.focus();
                }
            }, 0);
        });

        const again = document.getElementById("submit-another");
        if (again) {
            again.addEventListener("click", function () {
                FIELD_NAMES.forEach(function (field) {
                    delete touched[field];
                });
                resetToForm();
            });
        }
    }

    root.BrasalandApplicationValidation = {
        FIELD_NAMES: FIELD_NAMES,
        VALID_COUNTRIES: VALID_COUNTRIES,
        VALID_CATEGORIES: VALID_CATEGORIES,
        ALLOWED_STATUSES: ALLOWED_STATUSES,
        validateApplication: validateApplication,
        normalizeStatus: normalizeStatus,
        isValid: isValid,
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
    } else {
        mount();
    }
})(window);
