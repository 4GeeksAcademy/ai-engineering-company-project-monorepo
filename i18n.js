(function () {
  const STORAGE_KEY = "nexova-lang";
  const DEFAULT_LANG = "es";

  const translations = {
    es: {
      common: {
        skip: "Saltar al contenido principal",
        brand: "Nexova",
        navHome: "Inicio",
        navServices: "Servicios",
        navTalent: "Talento",
        navContact: "Contacto",
        mainNavAria: "Navegación principal",
        footerRights: "© 2025 Nexova. Todos los derechos reservados.",
        footerSocialAria: "Redes sociales"
      },
      index: {
        title: "Nexova | Consultora de recursos humanos y adquisición de talento",
        description:
          "Nexova ayuda a empresas de tecnología, retail y servicios financieros a encontrar, formar y desarrollar talento con soluciones de headhunting, outsourcing y formación corporativa.",
        heroBadge: "Consultora de RRHH con presencia en Valencia y Miami",
        heroTitle: "Construimos equipos excepcionales para empresas en crecimiento",
        heroSubtitle:
          "Consultora de recursos humanos y adquisición de talento con más de 10 años ayudando a empresas de tecnología, retail y servicios financieros a encontrar y desarrollar el mejor talento.",
        heroCta: "Únete a nuestro banco de talento",
        heroSecondary: "Habla con nuestro equipo",
        statProcessLabel: "Procesos",
        statPresenceLabel: "Presencia",
        statSectorsLabel: "Sectores",
        summaryExpLabel: "Experiencia",
        summaryExpText:
          "Apoyando decisiones críticas de talento en compañías medianas con ambición de crecimiento.",
        summaryCoverLabel: "Cobertura",
        summaryCoverText: "Operación coordinada desde Valencia y Miami para procesos con alcance regional.",
        summarySectorsLabel: "Sectores clave",
        summarySectorsText:
          "Soluciones alineadas con operaciones, atención al cliente y liderazgo en entornos exigentes.",
        servicesLabel: "Servicios",
        servicesTitle: "Soluciones de talento diseñadas para crecer con tu empresa",
        service1Title: "Headhunting Ejecutivo",
        service1Text:
          "búsqueda y selección de perfiles ejecutivos y mandos medios; proceso personalizado con garantía de reemplazo.",
        service2Title: "Outsourcing de Atención al Cliente",
        service2Text:
          "equipos especializados para empresas tecnológicas; formación continua y supervisión dedicada.",
        service3Title: "Formación Corporativa",
        service3Text:
          "programas de soft skills y liderazgo; cursos presenciales y en línea adaptados a cada organización.",
        whyLabel: "Por qué Nexova",
        whyTitle: "Experiencia sectorial y ejecución cuidada en cada proceso",
        whySubtitle:
          "Trabajamos junto a equipos de marketing, operaciones y liderazgo para construir procesos de talento claros, medibles y sostenibles.",
        whyCard1Title: "Años de experiencia en el mercado latinoamericano",
        whyCard1Text: "12 años de experiencia en el mercado latinoamericano",
        whyCard2Title: "Presencia regional",
        whyCard2Text: "Presencia regional: España y Estados Unidos",
        whyCard3Title: "Procesos exitosos completados",
        whyCard3Text: "+500 procesos exitosos de selección completados",
        whyCard4Title: "Sectores de especialización",
        whyCard4Text: "Especialización sectorial en tecnología, retail y finanzas",
        contactLabel: "Contacto",
        contactTitle: "Conversemos sobre tu próximo reto de talento",
        contactSubtitle:
          "Acompañamos a empresas medianas que necesitan contratar mejor, escalar su atención al cliente o desarrollar capacidades de liderazgo.",
        contactEmailLabel: "Email",
        contactValenciaLabel: "Valencia",
        contactMiamiLabel: "Miami",
        contactCta: "¡Comparte tu perfil con nosotros!",
        summaryAsideAria: "Resumen de Nexova"
      },
      application: {
        title: "Nexova Talento | Registro de profesionales",
        description:
          "Regístrate en el banco de talento de Nexova y comparte tu experiencia, sector de interés, nivel de inglés y disponibilidad profesional.",
        talentBadge: "Banco de talento",
        talentTitle: "Comparte tu perfil con Nexova",
        talentSubtitle:
          "Queremos conocer tu experiencia, tu disponibilidad y el tipo de oportunidades que te interesan para poder contactarte cuando haya un encaje real.",
        talentListLabel: "Qué vamos a pedirte",
        talentList1: "Datos de contacto claros y actualizados.",
        talentList2: "Experiencia profesional, sector de interés y nivel de inglés.",
        talentList3: "Disponibilidad para valorar oportunidades actuales o futuras.",
        companyNote: "¿Eres una empresa buscando talento? Escríbenos a contacto@nexova.com",
        timeLabel: "Tiempo estimado",
        timeValue: "3 minutos",
        formatLabel: "Formato",
        formatValue: "Registro sin CV adjunto",
        formLabel: "Formulario",
        formTitle: "Registro de talento profesional",
        formSubtitle:
          "Completa tus datos para incorporarte al banco de talento de Nexova. Revisaremos tu perfil y te contactaremos si existe afinidad con nuestras oportunidades.",
        successTitle: "¡Gracias por tu interés en Nexova!",
        successBody1:
          "Hemos recibido tu información. Nuestro equipo de selección la revisará y te contactaremos en caso de que tu perfil encaje con alguna de nuestras oportunidades actuales o futuras.",
        successBody2:
          "Mientras tanto, síguenos en LinkedIn para estar al día de nuestras vacantes y contenido sobre desarrollo profesional.",
        labelFullName: "Nombre completo",
        labelEmail: "Email",
        labelPhone: "Teléfono",
        labelCountry: "País de residencia",
        labelExperience: "Años de experiencia",
        labelSector: "Sector de interés",
        labelEnglishLevel: "Nivel de inglés",
        labelLinkedin: "LinkedIn (URL perfil)",
        labelAvailability: "Disponibilidad",
        labelComments: "Comentarios adicionales",
        labelDataPolicy: "Acepto política de datos",
        formNote: "Este formulario es solo para profesionales interesados en oportunidades laborales.",
        resetButton: "Limpiar formulario",
        submitButton: "Enviar aplicación",
        phonePlaceholder: "+34 612 345 678",
        linkedinPlaceholder: "https://linkedin.com/in/tu-perfil",
        countryOptionEmpty: "Selecciona una opción",
        countryOptionEs: "España",
        countryOptionUs: "Estados Unidos",
        countryOptionOther: "Otro",
        sectorOptionEmpty: "Selecciona una opción",
        sectorOptionTech: "Tecnología",
        sectorOptionRetail: "Retail",
        sectorOptionFin: "Servicios Financieros",
        sectorOptionConsult: "Consultoría",
        sectorOptionOther: "Otro",
        englishOptionEmpty: "Selecciona una opción",
        englishOptionBasic: "Básico",
        englishOptionIntermediate: "Intermedio",
        englishOptionAdvanced: "Avanzado",
        englishOptionNative: "Nativo",
        availabilityImmediate: "Inmediata",
        availability1month: "1 mes",
        availability2to3: "2-3 meses",
        availabilityExploring: "Solo explorando",
        companyNoteAria: "Aviso para empresas"
      },
      validation: {
        fullName: "El nombre debe contener al menos nombre y apellido",
        email: "Ingresa un email válido (ejemplo: nombre@empresa.com)",
        phone: "El teléfono debe incluir código de país (ejemplo: +34 612 345 678)",
        country: "Selecciona tu país de residencia",
        experience: "Los años de experiencia deben estar entre 0 y 50",
        sector: "Selecciona el sector de tu interés",
        englishLevel: "Indica tu nivel de inglés",
        availability: "Selecciona tu disponibilidad",
        linkedin: "Si incluyes LinkedIn, debe ser una URL válida",
        commentsLimit: "Los comentarios no pueden exceder 500 caracteres (quedan {remaining})",
        commentsCounter: "{remaining} caracteres disponibles",
        dataPolicy: "Debes aceptar la política de tratamiento de datos para continuar"
      }
    },
    en: {
      common: {
        skip: "Skip to main content",
        brand: "Nexova",
        navHome: "Home",
        navServices: "Services",
        navTalent: "Talent",
        navContact: "Contact",
        mainNavAria: "Main navigation",
        footerRights: "© 2025 Nexova. All rights reserved.",
        footerSocialAria: "Social media"
      },
      index: {
        title: "Nexova | Human resources and talent acquisition consulting",
        description:
          "Nexova helps technology, retail, and financial services companies find, train, and develop talent through headhunting, outsourcing, and corporate training solutions.",
        heroBadge: "HR consulting firm with presence in Valencia and Miami",
        heroTitle: "We build exceptional teams for growing companies",
        heroSubtitle:
          "Human resources consulting and talent acquisition firm with over 10 years helping technology, retail, and financial services companies find and develop the best talent.",
        heroCta: "Join our talent pool",
        heroSecondary: "Talk to our team",
        statProcessLabel: "Processes",
        statPresenceLabel: "Presence",
        statSectorsLabel: "Sectors",
        summaryExpLabel: "Experience",
        summaryExpText: "Supporting critical talent decisions for ambitious mid-sized companies.",
        summaryCoverLabel: "Coverage",
        summaryCoverText: "Coordinated operation from Valencia and Miami for regional hiring processes.",
        summarySectorsLabel: "Key sectors",
        summarySectorsText: "Solutions aligned with operations, customer support, and leadership in demanding environments.",
        servicesLabel: "Services",
        servicesTitle: "Talent solutions designed to scale with your company",
        service1Title: "Executive Headhunting",
        service1Text:
          "Search and selection of executive and mid-management profiles; personalized process with replacement guarantee.",
        service2Title: "Customer Support Outsourcing",
        service2Text: "Specialized teams for technology companies; continuous training and dedicated supervision.",
        service3Title: "Corporate Training",
        service3Text: "Soft skills and leadership programs; in-person and online courses adapted to each organization.",
        whyLabel: "Why Nexova",
        whyTitle: "Sector expertise and careful execution in every process",
        whySubtitle:
          "We work alongside marketing, operations, and leadership teams to build clear, measurable, and sustainable talent processes.",
        whyCard1Title: "Years of experience in the Latin American market",
        whyCard1Text: "12 years of experience in the Latin American market",
        whyCard2Title: "Regional presence",
        whyCard2Text: "Regional presence: Spain and United States",
        whyCard3Title: "Successful processes completed",
        whyCard3Text: "+500 successful selection processes completed",
        whyCard4Title: "Sector specialization",
        whyCard4Text: "Sector specialization in technology, retail, and finance",
        contactLabel: "Contact",
        contactTitle: "Let us talk about your next talent challenge",
        contactSubtitle:
          "We support mid-sized companies that need to hire better, scale customer support teams, or strengthen leadership capabilities.",
        contactEmailLabel: "Email",
        contactValenciaLabel: "Valencia",
        contactMiamiLabel: "Miami",
        contactCta: "Share your profile with us!",
        summaryAsideAria: "Nexova summary"
      },
      application: {
        title: "Nexova Talent | Professional registration",
        description:
          "Join Nexova's talent pool and share your experience, sector of interest, English level, and availability.",
        talentBadge: "Talent pool",
        talentTitle: "Share your profile with Nexova",
        talentSubtitle:
          "We want to know your experience, your availability, and the kind of opportunities you are interested in so we can contact you when there is a real match.",
        talentListLabel: "What we need from you",
        talentList1: "Clear and up-to-date contact information.",
        talentList2: "Professional experience, sector of interest, and English level.",
        talentList3: "Availability for current or future opportunities.",
        companyNote: "Are you a company looking for talent? Write to us at contacto@nexova.com",
        timeLabel: "Estimated time",
        timeValue: "3 minutes",
        formatLabel: "Format",
        formatValue: "Registration without CV upload",
        formLabel: "Form",
        formTitle: "Professional talent registration",
        formSubtitle:
          "Complete your information to join Nexova's talent pool. We will review your profile and contact you if there is a fit with our opportunities.",
        successTitle: "Thank you for your interest in Nexova!",
        successBody1:
          "We have received your information. Our selection team will review it and contact you if your profile matches any of our current or future opportunities.",
        successBody2:
          "In the meantime, follow us on LinkedIn to stay updated on our vacancies and professional development content.",
        labelFullName: "Full name",
        labelEmail: "Email",
        labelPhone: "Phone",
        labelCountry: "Country of residence",
        labelExperience: "Years of experience",
        labelSector: "Sector of interest",
        labelEnglishLevel: "English level",
        labelLinkedin: "LinkedIn (profile URL)",
        labelAvailability: "Availability",
        labelComments: "Additional comments",
        labelDataPolicy: "I accept the data policy",
        formNote: "This form is only for professionals interested in job opportunities.",
        resetButton: "Clear form",
        submitButton: "Submit application",
        phonePlaceholder: "+34 612 345 678",
        linkedinPlaceholder: "https://linkedin.com/in/your-profile",
        countryOptionEmpty: "Select an option",
        countryOptionEs: "Spain",
        countryOptionUs: "United States",
        countryOptionOther: "Other",
        sectorOptionEmpty: "Select an option",
        sectorOptionTech: "Technology",
        sectorOptionRetail: "Retail",
        sectorOptionFin: "Financial Services",
        sectorOptionConsult: "Consulting",
        sectorOptionOther: "Other",
        englishOptionEmpty: "Select an option",
        englishOptionBasic: "Basic",
        englishOptionIntermediate: "Intermediate",
        englishOptionAdvanced: "Advanced",
        englishOptionNative: "Native",
        availabilityImmediate: "Immediate",
        availability1month: "1 month",
        availability2to3: "2-3 months",
        availabilityExploring: "Just exploring",
        companyNoteAria: "Company notice"
      },
      validation: {
        fullName: "Name must contain at least first and last name",
        email: "Enter a valid email (example: name@company.com)",
        phone: "Phone must include country code (example: +34 612 345 678)",
        country: "Select your country of residence",
        experience: "Years of experience must be between 0 and 50",
        sector: "Select your sector of interest",
        englishLevel: "Indicate your English level",
        availability: "Select your availability",
        linkedin: "If you include LinkedIn, it must be a valid URL",
        commentsLimit: "Comments cannot exceed 500 characters ({remaining} remaining)",
        commentsCounter: "{remaining} characters available",
        dataPolicy: "You must accept the data processing policy to continue"
      }
    }
  };

  const getPage = () => (window.location.pathname.includes("application") ? "application" : "index");

  const resolveLanguage = () => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && translations[stored]) {
      return stored;
    }
    return DEFAULT_LANG;
  };

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  };

  const setInputPlaceholder = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute("placeholder", value);
    }
  };

  const t = (key, params) => {
    const lang = resolveLanguage();
    const segments = key.split(".");
    let current = translations[lang];
    for (const segment of segments) {
      current = current && current[segment];
    }
    if (typeof current !== "string") {
      return key;
    }

    if (!params) {
      return current;
    }

    return current.replace(/\{(\w+)\}/g, (_, token) => {
      if (params[token] === undefined || params[token] === null) {
        return `{${token}}`;
      }
      return String(params[token]);
    });
  };

  const applyCommon = (lang) => {
    const locale = translations[lang];
    document.documentElement.lang = lang;

    setText("skip-link", locale.common.skip);
    setText("nav-home", locale.common.navHome);
    setText("nav-services", locale.common.navServices);
    setText("nav-talent", locale.common.navTalent);
    setText("nav-contact", locale.common.navContact);
    setText("footer-rights", locale.common.footerRights);

    const mainNav = document.getElementById("main-nav");
    if (mainNav) {
      mainNav.setAttribute("aria-label", locale.common.mainNavAria);
    }

    const footerNav = document.getElementById("footer-social-nav");
    if (footerNav) {
      footerNav.setAttribute("aria-label", locale.common.footerSocialAria);
    }
  };

  const applyIndex = (lang) => {
    const locale = translations[lang].index;
    document.title = locale.title;

    const meta = document.getElementById("page-description");
    if (meta) {
      meta.setAttribute("content", locale.description);
    }

    setText("hero-badge", locale.heroBadge);
    setText("hero-title", locale.heroTitle);
    setText("hero-subtitle", locale.heroSubtitle);
    setText("hero-cta-text", locale.heroCta);
    setText("hero-secondary-text", locale.heroSecondary);
    setText("stat-process-label", locale.statProcessLabel);
    setText("stat-presence-label", locale.statPresenceLabel);
    setText("stat-sectors-label", locale.statSectorsLabel);
    setText("summary-exp-label", locale.summaryExpLabel);
    setText("summary-exp-text", locale.summaryExpText);
    setText("summary-cover-label", locale.summaryCoverLabel);
    setText("summary-cover-text", locale.summaryCoverText);
    setText("summary-sectors-label", locale.summarySectorsLabel);
    setText("summary-sectors-text", locale.summarySectorsText);
    setText("services-label", locale.servicesLabel);
    setText("services-title", locale.servicesTitle);
    setText("service-1-title", locale.service1Title);
    setText("service-1-text", locale.service1Text);
    setText("service-2-title", locale.service2Title);
    setText("service-2-text", locale.service2Text);
    setText("service-3-title", locale.service3Title);
    setText("service-3-text", locale.service3Text);
    setText("why-label", locale.whyLabel);
    setText("why-title", locale.whyTitle);
    setText("why-subtitle", locale.whySubtitle);
    setText("why-card-1-title", locale.whyCard1Title);
    setText("why-card-1-text", locale.whyCard1Text);
    setText("why-card-2-title", locale.whyCard2Title);
    setText("why-card-2-text", locale.whyCard2Text);
    setText("why-card-3-title", locale.whyCard3Title);
    setText("why-card-3-text", locale.whyCard3Text);
    setText("why-card-4-title", locale.whyCard4Title);
    setText("why-card-4-text", locale.whyCard4Text);
    setText("contact-label", locale.contactLabel);
    setText("contact-title", locale.contactTitle);
    setText("contact-subtitle", locale.contactSubtitle);
    setText("contact-email-label", locale.contactEmailLabel);
    setText("contact-valencia-label", locale.contactValenciaLabel);
    setText("contact-miami-label", locale.contactMiamiLabel);
    setText("contact-cta-text", locale.contactCta);

    const summaryAside = document.getElementById("summary-aside");
    if (summaryAside) {
      summaryAside.setAttribute("aria-label", locale.summaryAsideAria);
    }
  };

  const applyApplication = (lang) => {
    const locale = translations[lang].application;
    document.title = locale.title;

    const meta = document.getElementById("page-description");
    if (meta) {
      meta.setAttribute("content", locale.description);
    }

    setText("talent-badge", locale.talentBadge);
    setText("talent-title", locale.talentTitle);
    setText("talent-subtitle", locale.talentSubtitle);
    setText("talent-list-label", locale.talentListLabel);
    setText("talent-list-1", locale.talentList1);
    setText("talent-list-2", locale.talentList2);
    setText("talent-list-3", locale.talentList3);
    setText("company-note", locale.companyNote);
    setText("time-label", locale.timeLabel);
    setText("time-value", locale.timeValue);
    setText("format-label", locale.formatLabel);
    setText("format-value", locale.formatValue);
    setText("form-label", locale.formLabel);
    setText("form-title", locale.formTitle);
    setText("form-subtitle", locale.formSubtitle);
    setText("success-title", locale.successTitle);
    setText("success-body-1", locale.successBody1);
    setText("success-body-2", locale.successBody2);
    setText("label-fullName", locale.labelFullName);
    setText("label-email", locale.labelEmail);
    setText("label-phone", locale.labelPhone);
    setText("label-country", locale.labelCountry);
    setText("label-experience", locale.labelExperience);
    setText("label-sector", locale.labelSector);
    setText("label-englishLevel", locale.labelEnglishLevel);
    setText("label-linkedin", locale.labelLinkedin);
    setText("label-availability", locale.labelAvailability);
    setText("label-comments", locale.labelComments);
    setText("label-dataPolicy", locale.labelDataPolicy);
    setText("availability-immediate", locale.availabilityImmediate);
    setText("availability-1month", locale.availability1month);
    setText("availability-2to3", locale.availability2to3);
    setText("availability-exploring", locale.availabilityExploring);
    setText("form-note", locale.formNote);
    setText("reset-button-text", locale.resetButton);
    setText("submit-button-text", locale.submitButton);

    setText("country-option-empty", locale.countryOptionEmpty);
    setText("country-option-es", locale.countryOptionEs);
    setText("country-option-us", locale.countryOptionUs);
    setText("country-option-other", locale.countryOptionOther);
    setText("sector-option-empty", locale.sectorOptionEmpty);
    setText("sector-option-tech", locale.sectorOptionTech);
    setText("sector-option-retail", locale.sectorOptionRetail);
    setText("sector-option-fin", locale.sectorOptionFin);
    setText("sector-option-consult", locale.sectorOptionConsult);
    setText("sector-option-other", locale.sectorOptionOther);
    setText("english-option-empty", locale.englishOptionEmpty);
    setText("english-option-basic", locale.englishOptionBasic);
    setText("english-option-intermediate", locale.englishOptionIntermediate);
    setText("english-option-advanced", locale.englishOptionAdvanced);
    setText("english-option-native", locale.englishOptionNative);

    setInputPlaceholder("phone", locale.phonePlaceholder);
    setInputPlaceholder("linkedin", locale.linkedinPlaceholder);

    const companyNoteAside = document.getElementById("company-note-aside");
    if (companyNoteAside) {
      companyNoteAside.setAttribute("aria-label", locale.companyNoteAria);
    }
  };

  const paintLanguageButtons = (lang) => {
    const buttons = document.querySelectorAll("[data-lang-option]");
    buttons.forEach((button) => {
      const active = button.getAttribute("data-lang-option") === lang;
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.classList.toggle("bg-night", active);
      button.classList.toggle("text-white", active);
      button.classList.toggle("text-night", !active);
    });
  };

  const applyTranslations = (lang) => {
    applyCommon(lang);
    if (getPage() === "index") {
      applyIndex(lang);
    } else {
      applyApplication(lang);
    }
    paintLanguageButtons(lang);
    window.dispatchEvent(new CustomEvent("nexova:langchange", { detail: { lang } }));
  };

  const setLang = (lang) => {
    if (!translations[lang]) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, lang);
    applyTranslations(lang);
  };

  document.addEventListener("DOMContentLoaded", () => {
    const lang = resolveLanguage();
    applyTranslations(lang);

    document.querySelectorAll("[data-lang-option]").forEach((button) => {
      button.addEventListener("click", () => {
        setLang(button.getAttribute("data-lang-option"));
      });
    });
  });

  window.NEXOVA_I18N = {
    t,
    getLang: resolveLanguage,
    setLang,
    applyTranslations
  };
})();
