(function () {
  const STORAGE_KEY = 'brasaland-language';
  const defaultLanguage = 'es';

  const translations = {
    es: {
      pageTitleHome: 'Brasaland | El sabor de la brasa, en cada bocado',
      pageTitleForm: 'Registro Brasa Points | Brasaland',
      metaDescriptionHome: 'Brasaland es una cadena de restaurantes de comida a la brasa con 14 ubicaciones en Colombia y Estados Unidos. Descubre Brasa Points y nuestras ubicaciones.',
      metaDescriptionForm: 'Regístrate en Brasa Points, el programa de fidelización digital de Brasaland para mayores de 18 años.',
      metaKeywords: 'Brasaland, restaurante a la brasa, Brasa Points, Medellín, Bogotá, Cali, Miami, Orlando',
      metaOgTitle: 'Brasaland | El sabor de la brasa, en cada bocado',
      metaOgDescription: 'Desde 2008 sirviendo las mejores carnes a la brasa en Colombia y Estados Unidos.',
      skipToContent: 'Saltar al contenido principal',
      skipToForm: 'Saltar al formulario',
      navigationAria: 'Principal',
      secondaryNavigationAria: 'Secundaria',
      socialAria: 'Redes sociales',
      navHome: 'Inicio',
      navLocations: 'Ubicaciones',
      navMenu: 'Menú',
      navContact: 'Contacto',
      heroEyebrow: '14 restaurantes entre Colombia y Estados Unidos',
      heroTitle: 'El sabor de la brasa, en cada bocado',
      heroSubtitle: 'Desde 2008 sirviendo las mejores carnes a la brasa en Colombia y Estados Unidos. 14 ubicaciones, una misma pasión por la calidad y el sabor.',
      heroCta: 'Únete a Brasa Points',
      heroSecondaryCta: 'Ver ubicaciones',
      orderNotice: '¿Quieres hacer un pedido? Llama a tu ubicación favorita o visítanos directamente. ¡Pronto tendremos pedidos en línea!',
      heroImageAlt: 'Parrilla con cortes de carne servidos en un restaurante Brasaland',
      storyImageAlt: 'Interior cálido de un restaurante familiar con servicio de mesa',
      storyEyebrow: 'Nuestra historia',
      storyTitle: 'Tradición familiar con escala internacional',
      storyBody: 'Fundada en Medellín en 2008, Brasaland comenzó como un sueño familiar: compartir el auténtico sabor de la carne a la brasa con calidad constante y servicio cálido. Hoy somos 14 restaurantes en dos países, pero mantenemos la misma receta de éxito: productos frescos, técnicas tradicionales, y pasión por cada plato que servimos.',
      uniqueEyebrow: 'Lo que nos hace únicos',
      uniqueTitle: 'Una operación sólida, una experiencia cercana',
      qualityTitle: 'Calidad consistente',
      qualityPoint1: 'Mismas recetas y estándares en todos los locales.',
      qualityPoint2: 'Ingredientes frescos seleccionados diariamente.',
      warmthTitle: 'Experiencia cálida',
      warmthPoint1: 'Servicio amable y atento.',
      warmthPoint2: 'Ambiente familiar en cada visita.',
      speedTitle: 'Rapidez',
      speedPoint1: 'Tu comida lista en minutos.',
      speedPoint2: 'Sin sacrificar sabor ni calidad.',
      colombiaLabel: 'Colombia',
      colombiaTitle: '10 restaurantes',
      colombiaBody: 'Presencia en Medellín, Bogotá y Cali con una operación diseñada para servir con rapidez y consistencia.',
      citiesLabel: 'Ciudades',
      hoursLabel: 'Horario',
      colombiaCities: 'Medellín, Bogotá y Cali',
      usLabel: 'Estados Unidos (Florida)',
      usTitle: '4 restaurantes',
      usBody: 'Un formato de expansión que mantiene la esencia de Brasaland en Miami y Orlando.',
      usCities: 'Miami y Orlando',
      menuEyebrow: 'Menú',
      menuTitle: 'Brasa, tradición y rapidez en un mismo menú',
      menuBody: 'Diseñamos una oferta enfocada en carnes a la brasa, acompañamientos clásicos, combos familiares y una operación capaz de responder con velocidad tanto en Colombia como en Florida.',
      menuCard1Title: 'Parrillas signature',
      menuCard1Body: 'Cortes seleccionados, pollo a la brasa y costillas con sabor constante en cada local.',
      menuCard2Title: 'Combos familiares',
      menuCard2Body: 'Opciones pensadas para compartir, con porciones generosas y servicio ágil.',
      menuCard3Title: 'Acompañamientos y bebidas',
      menuCard3Body: 'Patacones, papas, arepas y bebidas para complementar la experiencia Brasaland sin perder velocidad de servicio.',
      pointsTitle: 'Gana puntos con cada visita',
      pointsItem1: 'Acumula 1 punto por cada $10.000 COP o $5 USD.',
      pointsItem2: 'Canjea tus puntos por descuentos y platos gratis.',
      pointsItem3: 'Ofertas exclusivas para miembros.',
      pointsItem4: 'Registro 100% digital, ya no más tarjetas de papel.',
      pointsCardTitle: 'Regístrate hoy',
      pointsCardBody: 'Activa tu cuenta digital y empieza a acumular puntos en cualquiera de nuestras 14 ubicaciones.',
      pointsCardCta: 'Ir al formulario',
      contactEyebrow: 'Contacto',
      contactTitle: 'Conversemos',
      contactCta: 'Registrar cuenta Brasa Points',
      footerCopyright: '© 2025 Brasaland. Todos los derechos reservados.',
      footerInstagram: 'Instagram',
      footerFacebook: 'Facebook',
      backHome: 'Volver al inicio',
      helpLink: 'Ayuda',
      formHeroTitle: 'Activa tu cuenta digital',
      formHeroBody: 'Regístrate en el programa de fidelización diseñado para clientes mayores de 18 años que quieren acumular puntos con sus visitas.',
      formHeroItem1: 'Acumula 1 punto por cada $10.000 COP o $5 USD.',
      formHeroItem2: 'Recibe beneficios exclusivos y descuentos.',
      formHeroItem3: 'Utiliza tu cuenta en cualquiera de nuestras 14 ubicaciones.',
      formSectionEyebrow: 'Formulario de registro',
      formSectionTitle: 'Únete a Brasa Points',
      formSectionBody: 'Completa tu información para crear tu perfil de fidelización. Todos los campos marcados con * son obligatorios.',
      successTitle: '¡Bienvenido a Brasa Points!',
      successBody1: 'Tu registro ha sido exitoso. Recibirás un email de confirmación en los próximos minutos con los detalles de tu cuenta y cómo empezar a acumular puntos.',
      successBody2: '¡Ya puedes disfrutar de tus beneficios en cualquiera de nuestras 14 ubicaciones!',
      successAlert: '¡Bienvenido a Brasa Points!\n\nTu registro ha sido exitoso. Recibirás un email de confirmación en los próximos minutos con los detalles de tu cuenta y cómo empezar a acumular puntos.\n\n¡Ya puedes disfrutar de tus beneficios en cualquiera de nuestras 14 ubicaciones!',
      restrictionTitle: 'Registro no disponible',
      restrictionBody: 'El programa Brasa Points está diseñado para clientes mayores de 18 años que quieren acumular puntos con sus visitas. No es un formulario de reservas ni de pedidos en línea.',
      closeButton: 'Cerrar',
      closeModal: 'Cerrar ventana',
      labelFullName: 'Nombre completo *',
      labelEmail: 'Email *',
      labelPhone: 'Teléfono *',
      phonePlaceholder: '+57 300 123 4567',
      labelBirthDate: 'Fecha de nacimiento *',
      labelCountry: 'País *',
      labelCity: 'Ciudad *',
      labelLocation: 'Ubicación favorita de Brasaland',
      labelDiscovery: '¿Cómo nos conociste? *',
      labelPreferences: 'Preferencias alimentarias',
      preferenceNone: 'Sin restricciones',
      preferenceVegetarian: 'Vegetariano',
      preferenceGlutenFree: 'Sin gluten',
      preferenceOther: 'Otro',
      labelTerms: 'Acepto términos del programa Brasa Points *',
      labelOffers: 'Quiero recibir ofertas por email',
      submitButton: 'Completar registro',
      resetButton: 'Limpiar formulario'
    },
    en: {
      pageTitleHome: 'Brasaland | The flavor of the grill in every bite',
      pageTitleForm: 'Brasa Points Sign Up | Brasaland',
      metaDescriptionHome: 'Brasaland is a grilled-food restaurant chain with 14 locations across Colombia and the United States. Discover Brasa Points and explore our locations.',
      metaDescriptionForm: 'Join Brasa Points, Brasaland\'s digital loyalty program for customers 18 and older.',
      metaKeywords: 'Brasaland, grilled restaurant, Brasa Points, Medellin, Bogota, Cali, Miami, Orlando',
      metaOgTitle: 'Brasaland | The flavor of the grill in every bite',
      metaOgDescription: 'Serving the best grilled meats in Colombia and the United States since 2008.',
      skipToContent: 'Skip to main content',
      skipToForm: 'Skip to form',
      navigationAria: 'Primary',
      secondaryNavigationAria: 'Secondary',
      socialAria: 'Social media',
      navHome: 'Home',
      navLocations: 'Locations',
      navMenu: 'Menu',
      navContact: 'Contact',
      heroEyebrow: '14 restaurants across Colombia and the United States',
      heroTitle: 'The flavor of the grill in every bite',
      heroSubtitle: 'Since 2008, serving the best grilled meats in Colombia and the United States. Fourteen locations, one shared passion for quality and flavor.',
      heroCta: 'Join Brasa Points',
      heroSecondaryCta: 'View locations',
      orderNotice: 'Want to place an order? Call your favorite location or stop by. Online ordering is coming soon!',
      heroImageAlt: 'Grill platter with Brasaland-style meat cuts served at a restaurant',
      storyImageAlt: 'Warm family restaurant interior with table service',
      storyEyebrow: 'Our story',
      storyTitle: 'Family roots with international scale',
      storyBody: 'Founded in Medellin in 2008, Brasaland began as a family dream: sharing the authentic taste of grilled meat with consistent quality and warm service. Today we operate 14 restaurants in two countries, while keeping the same recipe for success: fresh products, traditional techniques, and passion in every dish we serve.',
      uniqueEyebrow: 'What makes us different',
      uniqueTitle: 'Strong operations, genuine hospitality',
      qualityTitle: 'Consistent quality',
      qualityPoint1: 'The same recipes and standards in every location.',
      qualityPoint2: 'Fresh ingredients selected every day.',
      warmthTitle: 'Warm experience',
      warmthPoint1: 'Friendly, attentive service.',
      warmthPoint2: 'A family atmosphere every time you visit.',
      speedTitle: 'Speed',
      speedPoint1: 'Your meal is ready in minutes.',
      speedPoint2: 'Without compromising flavor or quality.',
      colombiaLabel: 'Colombia',
      colombiaTitle: '10 restaurants',
      colombiaBody: 'Operations in Medellin, Bogota, and Cali built to deliver speed and consistency.',
      citiesLabel: 'Cities',
      hoursLabel: 'Hours',
      colombiaCities: 'Medellin, Bogota, and Cali',
      usLabel: 'United States (Florida)',
      usTitle: '4 restaurants',
      usBody: 'An expansion model that keeps the Brasaland identity alive in Miami and Orlando.',
      usCities: 'Miami and Orlando',
      menuEyebrow: 'Menu',
      menuTitle: 'Grill, tradition, and speed in one menu',
      menuBody: 'Our offering is built around grilled meats, classic sides, family combos, and an operation designed to serve quickly in both Colombia and Florida.',
      menuCard1Title: 'Signature grills',
      menuCard1Body: 'Selected cuts, grilled chicken, and ribs with dependable flavor at every location.',
      menuCard2Title: 'Family combos',
      menuCard2Body: 'Sharing options with generous portions and efficient service.',
      menuCard3Title: 'Sides and drinks',
      menuCard3Body: 'Plantains, fries, arepas, and drinks that complete the Brasaland experience without slowing service down.',
      pointsTitle: 'Earn points with every visit',
      pointsItem1: 'Earn 1 point for every COP 10,000 or USD 5 spent.',
      pointsItem2: 'Redeem your points for discounts and free meals.',
      pointsItem3: 'Exclusive offers for members.',
      pointsItem4: '100% digital sign-up, no more paper cards.',
      pointsCardTitle: 'Sign up today',
      pointsCardBody: 'Activate your digital account and start earning points at any of our 14 locations.',
      pointsCardCta: 'Go to the form',
      contactEyebrow: 'Contact',
      contactTitle: 'Let\'s talk',
      contactCta: 'Create your Brasa Points account',
      footerCopyright: '© 2025 Brasaland. All rights reserved.',
      footerInstagram: 'Instagram',
      footerFacebook: 'Facebook',
      backHome: 'Back to home',
      helpLink: 'Help',
      formHeroTitle: 'Activate your digital account',
      formHeroBody: 'Sign up for the loyalty program designed for customers 18 and older who want to earn points with their visits.',
      formHeroItem1: 'Earn 1 point for every COP 10,000 or USD 5 spent.',
      formHeroItem2: 'Receive exclusive member perks and discounts.',
      formHeroItem3: 'Use your account at any of our 14 locations.',
      formSectionEyebrow: 'Registration form',
      formSectionTitle: 'Join Brasa Points',
      formSectionBody: 'Complete your information to create your loyalty profile. All fields marked with * are required.',
      successTitle: 'Welcome to Brasa Points!',
      successBody1: 'Your registration was successful. You will receive a confirmation email within the next few minutes with the details of your account and how to start earning points.',
      successBody2: 'You can now enjoy your benefits at any of our 14 locations!',
      successAlert: 'Welcome to Brasa Points!\n\nYour registration was successful. You will receive a confirmation email within the next few minutes with the details of your account and how to start earning points.\n\nYou can now enjoy your benefits at any of our 14 locations!',
      restrictionTitle: 'Registration unavailable',
      restrictionBody: 'Brasa Points is designed for customers over 18 who want to earn points with their visits. This is not a reservations or online ordering form.',
      closeButton: 'Close',
      closeModal: 'Close dialog',
      labelFullName: 'Full name *',
      labelEmail: 'Email *',
      labelPhone: 'Phone *',
      phonePlaceholder: '+1 305 123 4567',
      labelBirthDate: 'Date of birth *',
      labelCountry: 'Country *',
      labelCity: 'City *',
      labelLocation: 'Favorite Brasaland location',
      labelDiscovery: 'How did you hear about us? *',
      labelPreferences: 'Dietary preferences',
      preferenceNone: 'No restrictions',
      preferenceVegetarian: 'Vegetarian',
      preferenceGlutenFree: 'Gluten-free',
      preferenceOther: 'Other',
      labelTerms: 'I accept the Brasa Points program terms *',
      labelOffers: 'I want to receive offers by email',
      submitButton: 'Complete registration',
      resetButton: 'Clear form'
    }
  };

  function getLanguage() {
    return localStorage.getItem(STORAGE_KEY) || defaultLanguage;
  }

  function getTranslations(language) {
    return translations[language] || translations[defaultLanguage];
  }

  function updateToggleState(language) {
    document.querySelectorAll('[data-language-toggle]').forEach((button) => {
      const active = button.dataset.languageToggle === language;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.classList.toggle('bg-brasaPrimary', active);
      button.classList.toggle('text-brasaCream', active);
      button.classList.toggle('text-brasaPrimary/70', !active);
    });
  }

  function translateDocument(language) {
    const bundle = getTranslations(language);
    document.documentElement.lang = language === 'en' ? 'en-US' : 'es';
    const page = document.body.dataset.page || (document.getElementById('formulario-brasa-points') ? 'form' : 'home');

    if (page === 'home') {
      document.title = bundle.pageTitleHome;
    } else if (page === 'form') {
      document.title = bundle.pageTitleForm;
    }

    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      if (bundle[key]) {
        element.textContent = bundle[key];
      }
    });

    document.querySelectorAll('[data-i18n-attr]').forEach((element) => {
      const definitions = element.dataset.i18nAttr.split(',');
      definitions.forEach((definition) => {
        const [attribute, key] = definition.split(':');
        if (bundle[key]) {
          element.setAttribute(attribute, bundle[key]);
        }
      });
    });

    const metaDescription = document.getElementById('meta-description');
    if (metaDescription) {
      metaDescription.content = page === 'home' ? bundle.metaDescriptionHome : bundle.metaDescriptionForm;
    }

    const metaKeywords = document.getElementById('meta-keywords');
    if (metaKeywords) {
      metaKeywords.content = bundle.metaKeywords;
    }

    const metaOgTitle = document.getElementById('meta-og-title');
    if (metaOgTitle) {
      metaOgTitle.content = bundle.metaOgTitle;
    }

    const metaOgDescription = document.getElementById('meta-og-description');
    if (metaOgDescription) {
      metaOgDescription.content = bundle.metaOgDescription;
    }

    updateToggleState(language);
    document.dispatchEvent(new CustomEvent('brasaland:languagechange', { detail: { language, bundle } }));
  }

  function setLanguage(language) {
    localStorage.setItem(STORAGE_KEY, language);
    translateDocument(language);
  }

  window.BrasalandI18n = {
    getLanguage,
    getTranslations,
    setLanguage,
    translateDocument
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-language-toggle]').forEach((button) => {
      button.addEventListener('click', () => setLanguage(button.dataset.languageToggle));
    });

    translateDocument(getLanguage());
  });
})();