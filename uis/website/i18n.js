/* =========================================================================
 * TrackFlow website — i18n (EN / ES) + mobile navigation
 * -------------------------------------------------------------------------
 * - Toggles the site language between English and Spanish (decision D7).
 * - Persists the user's choice in localStorage and restores it on load.
 * - Switches text flagged as data-i18n (textContent) and data-i18n-html
 *   (innerHTML for rich inline markup) and updates <html lang> and
 *   <title> so both search engines and assistive technology see a
 *   coherent, active language. ARIA/labels (aria-label, alt, etc.) are
 *   intentionally left untouched: elements already include both languages
 *   in each attribute, so accessibility metadata is never empty.
 * ========================================================================= */
(function () {
  'use strict';

  var STORAGE_KEY = 'trackflow-lang';

  var translations = {
    en: {
      'meta.title': 'TrackFlow — Last-Mile Delivery & Warehouse Management | United States & Spain',
      'meta.title.app': 'TrackFlow — Apply | Last-Mile Delivery & Warehouse Management',
      'meta.description': 'TrackFlow is a last-mile delivery and warehouse management company founded in 2009. We store, pick, pack, ship and return e-commerce orders across the United States and Spain.',
      'meta.description.app': 'Request information about TrackFlow\'s last-mile delivery and warehouse management services for your e-commerce brand across the United States and Spain.',
      'meta.og.title': 'TrackFlow — Last-Mile Delivery & Warehouse Management | United States & Spain',
      'meta.og.title.app': 'TrackFlow — Apply | Last-Mile Delivery & Warehouse Management',
      'meta.og.description': 'TrackFlow is a last-mile delivery and warehouse management company founded in 2009. We store, pick, pack, ship and return e-commerce orders across the United States and Spain.',
      'meta.og.description.app': 'Request information about TrackFlow\'s last-mile delivery and warehouse management services for your e-commerce brand across the United States and Spain.',
      'meta.og.locale': 'en_US',
      'skip.link': 'Skip to main content',
      'nav.services': 'Services',
      'nav.why': 'Why TrackFlow',
      'nav.locations': 'Locations',
      'nav.contact': 'Contact',
      'nav.apply': 'Apply now',
      'nav.toggle': 'Show or hide navigation',
      'nav.close': 'Hide navigation',
      'sidebar.tagline': '2 warehouses · 8 carriers · US & Spain',
      'hero.badge': 'Last-mile delivery & warehouse management since 2009',
      'hero.title': '<span class="block">Your e-commerce, delivered.</span><span class="block text-accent">We handle the logistics.</span>',
      'hero.subtitle': 'TrackFlow stores your inventory, picks and packs your orders, ships them through a network of 8 carriers across the United States and Spain, and manages your returns — so the entire journey from order to doorstep is our problem, not yours.',
      'hero.ctaPrimary': 'Start a conversation',
      'hero.ctaSecondary': 'Learn how we work',
      'stat.founded.label': 'Founded',
      'stat.founded.value': '2009',
      'stat.countries.label': 'Countries',
      'stat.countries.value': '2',
      'stat.warehouses.label': 'Warehouses',
      'stat.warehouses.value': '2',
      'stat.carriers.label': 'Carrier partners',
      'stat.carriers.value': '8',
      'stat.people.label': 'Team members',
      'stat.people.value': '130+',
      'stat.revenue.label': 'Annual revenue',
      'stat.revenue.value': '€9M',
      'services.eyebrow': 'What we do',
      'services.title': 'One logistics partner for the entire journey',
      'services.intro': 'From the moment an order is placed to the moment it is delivered or returned, TrackFlow takes care of the full operation for e-commerce brands.',
      'svc.store.title': 'Store',
      'svc.store.desc': 'Inventory held in our warehouses in Los Angeles and Zaragoza, positioned to serve both sides of the Atlantic.',
      'svc.pick.title': 'Pick & pack',
      'svc.pick.desc': 'Every day hundreds of orders are picked from the shelves, packed into boxes and handed off to carriers with care.',
      'svc.ship.title': 'Ship',
      'svc.ship.desc': 'A network of 8 carriers across both countries — UPS, FedEx and DHL in the US; MRW, SEUR and DHL in Spain — so each parcel travels with the right partner.',
      'svc.returns.title': 'Returns',
      'svc.returns.desc': 'Complete reverse logistics for the 18–25% of volume that comes back, with a dedicated team for every decision from approval to reconditioning.',
      'why.eyebrow': 'Why TrackFlow',
      'why.title': 'An experienced partner for growing e-commerce',
      'why.intro': "E-commerce brands are great at making and selling products — getting them to customers' doors is where TrackFlow steps in.",
      'why.since.title': 'Driving deliveries since 2009',
      'why.since.desc': 'Founded in Los Angeles, now moving parcels from warehouse shelves to customer doorsteps for more than fifteen years.',
      'why.dual.title': 'Two countries, one partner',
      'why.dual.desc': 'Operate in the United States and Spain with warehouses in Los Angeles and Zaragoza — a single partner for both markets and their regulatory environments.',
      'why.carriers.title': 'A network of 8 carriers',
      'why.carriers.desc': 'UPS, FedEx and DHL in the United States; MRW, SEUR and DHL in Spain, plus two local carriers — flexibility in how every parcel reaches its destination.',
      'why.returns.title': 'Returns under control',
      'why.returns.desc': 'Reverse logistics for 18–25% of volume depending on client and country, with a dedicated team handling every approval, collection and reconditioning decision.',
      'why.team.title': '130+ people on your operation',
      'why.team.desc': 'A skilled operations team distributed between Los Angeles and Zaragoza, backed by a technology office in Spain that keeps systems running around the clock.',
      'why.24.title': 'Built to run 24/7',
      'why.24.desc': "Customers don't stop expecting their parcels after 6pm. TrackFlow's operations are designed to keep moving when the business day ends.",
      'locations.eyebrow': 'Where we operate',
      'locations.title': 'Two markets, two warehouses',
      'locations.intro': 'Founded in Los Angeles in 2009, TrackFlow operates across the United States and Spain with warehouses in both countries.',
      'loc.us.title': 'United States',
      'loc.us.sub': 'Headquarters & West Coast warehouse',
      'loc.us.desc': 'Company headquarters and warehouse in Los Angeles, where the executive leadership and a large part of the operations team are based.',
      'loc.la.label': 'Warehouse:',
      'loc.la.value': 'Los Angeles, CA',
      'loc.es.title': 'Spain',
      'loc.es.sub': 'Technology office & European warehouse',
      'loc.es.desc': 'Second warehouse in Zaragoza, home to the technology office and most of the engineering team that keeps TrackFlow\'s systems running.',
      'loc.zgz.label': 'Warehouse:',
      'loc.zgz.value': 'Zaragoza, Spain',
      'contact.eyebrow': 'Get started',
      'contact.title': "Let's talk about your logistics",
      'contact.desc': 'Tell us about your e-commerce and how TrackFlow can take care of storing, picking, packing, shipping and returns for you.',
      'contact.cta': 'Apply now',
      'contact.or': 'Or reach us directly:',
      'contact.hours': 'Mon–Fri, 9:00–18:00 (US & Spain time zones)',
      'footer.tagline': 'Last-mile delivery and warehouse management for e-commerce brands, from warehouse shelf to customer doorstep in the United States and Spain.',
      'footer.navTitle': 'Site',
      'footer.contactTitle': 'Contact',
      'footer.address': '<span class="block font-medium text-text-on-ink">TrackFlow HQ</span><span class="block">1200 Alameda Street, Los Angeles, CA 90013</span><span class="block">United States</span>',
      'footer.rights': '© 2026 TrackFlow. All rights reserved.',
      'footer.made': 'Founded in Los Angeles, 2009. Serving the United States & Spain.',

      /* ---- application / request form (application.html) ---- */
      'app.eyebrow': 'Request information',
      'app.title': 'Tell us about your logistics',
      'app.intro': 'This form is for e-commerce businesses looking to outsource their logistics. Tell us about your operation and our commercial team will get in touch to schedule a call.',
      'form.warning.lowVolume': 'For volumes below 100 monthly shipments, our services may not be the most efficient solution. Are you sure you want to continue?',
      'form.err.summary': 'The form has {count} error(s). Please review the highlighted fields.',
      'form.fs.contact.legend': 'Contact details',
      'form.fs.business.legend': 'Business information',
      'form.fs.privacy.legend': 'Privacy',
      'form.optional': '(optional)',
      'form.company.label': 'Company name',
      'form.company.placeholder': 'Acme Corporation',
      'form.contact.label': 'Contact person',
      'form.contact.placeholder': 'Jane Doe',
      'form.email.label': 'Corporate email',
      'form.email.placeholder': 'name@company.com',
      'form.phone.label': 'Phone number',
      'form.phone.placeholder': '+1 213 555 0147',
      'form.website.label': 'Company website',
      'form.website.placeholder': 'https://www.company.com',
      'form.country.label': 'Main operating country',
      'form.product.label': 'Product type',
      'form.volume.label': 'Estimated monthly shipment volume',
      'form.services.label': 'Services of interest',
      'form.3pl.label': 'Do you currently work with another 3PL?',
      'form.comments.label': 'Comments or specific needs',
      'form.comments.placeholder': 'Tell us about your operation, volumes, regions…',
      'form.comments.countLabel': 'Characters:',
      'form.privacy.label': 'I have read and accept the privacy policy.',
      'form.select.placeholder': 'Select an option',
      'form.country.us': 'United States',
      'form.country.es': 'Spain',
      'form.country.both': 'Both',
      'form.country.other': 'Other',
      'form.product.fashion': 'Fashion',
      'form.product.electronics': 'Electronics',
      'form.product.cosmetics': 'Cosmetics',
      'form.product.food': 'Food & beverage',
      'form.product.other': 'Other',
      'form.volume.0': '0–100',
      'form.volume.101': '101–500',
      'form.volume.501': '501–2000',
      'form.volume.2000': '2000+',
      'form.volume.unsure': 'Not sure',
      'form.service.storage': 'Storage',
      'form.service.lastmile': 'Last-mile delivery',
      'form.service.reverse': 'Reverse logistics',
      'form.3pl.yes': 'Yes',
      'form.3pl.no': 'No',
      'form.3pl.evaluating': 'Evaluating options',
      'form.err.company': 'The company name must be at least 2 characters',
      'form.err.contact': "Enter the contact person's first and last name",
      'form.err.email': 'Enter a valid corporate email (e.g. name@company.com)',
      'form.err.phone': 'The phone number must include a country code (e.g. +1 213 555 0147)',
      'form.err.website': 'If you include a website, it must be a valid URL',
      'form.err.country': 'Select your main operating country',
      'form.err.product': 'Select the product type you handle',
      'form.err.volume': 'Select your estimated monthly shipment volume',
      'form.err.services': 'Select at least one service',
      'form.err.3pl': 'Indicate whether you currently work with another logistics provider',
      'form.err.comments': 'Comments cannot exceed 500 characters',
      'form.err.comments.dynamic': 'Comments cannot exceed 500 characters ({remaining} remaining)',
      'form.err.privacy': 'You must accept the privacy policy to continue',
      'form.submit': 'Send request',
      'form.reset': 'Clear form',
      'form.restart': 'Send another request',
      'form.success.title': 'Thank you for your interest in TrackFlow!',
      'form.success.body': 'We have received your request. Our commercial team will review your information and contact you within 24–48 hours to schedule a call and learn about your logistics needs in detail.',
      'form.success.contact': 'If you have an urgent question, write to us directly at <a href="mailto:contact@trackflowlogistics.com" class="font-medium text-brand underline decoration-edge underline-offset-4 transition hover:text-brand-strong">contact@trackflowlogistics.com</a>'
    },
    es: {
      'meta.title': 'TrackFlow — Logística de última milla y gestión de almacenes | Estados Unidos y España',
      'meta.title.app': 'TrackFlow — Solicita información | Logística de última milla y gestión de almacenes',
      'meta.description': 'TrackFlow es una empresa de logística de última milla y gestión de almacenes fundada en 2009. Almacenamos, preparamos, empaquetamos, enviamos y devolvemos pedidos de e-commerce entre Estados Unidos y España.',
      'meta.description.app': 'Solicita información sobre los servicios de logística de última milla y gestión de almacenes de TrackFlow para tu marca de e-commerce en Estados Unidos y España.',
      'meta.og.title': 'TrackFlow — Logística de última milla y gestión de almacenes | Estados Unidos y España',
      'meta.og.title.app': 'TrackFlow — Solicita información | Logística de última milla y gestión de almacenes',
      'meta.og.description': 'TrackFlow es una empresa de logística de última milla y gestión de almacenes fundada en 2009. Almacenamos, preparamos, empaquetamos, enviamos y devolvemos pedidos de e-commerce entre Estados Unidos y España.',
      'meta.og.description.app': 'Solicita información sobre los servicios de logística de última milla y gestión de almacenes de TrackFlow para tu marca de e-commerce en Estados Unidos y España.',
      'meta.og.locale': 'es_ES',
      'skip.link': 'Saltar al contenido principal',
      'nav.services': 'Servicios',
      'nav.why': 'Por qué TrackFlow',
      'nav.locations': 'Ubicaciones',
      'nav.contact': 'Contacto',
      'nav.apply': 'Solicita ahora',
      'nav.toggle': 'Mostrar u ocultar navegación',
      'nav.close': 'Ocultar navegación',
      'sidebar.tagline': '2 almacenes · 8 transportistas · EE. UU. y España',
      'hero.badge': 'Logística de última milla y gestión de almacenes desde 2009',
      'hero.title': '<span class="block">Tu e-commerce, entregado.</span><span class="block text-accent">La logística la hacemos nosotros.</span>',
      'hero.subtitle': 'TrackFlow almacena tu inventario, prepara y empaqueta tus pedidos, los envía a través de una red de 8 transportistas entre Estados Unidos y España, y gestiona tus devoluciones — para que todo el recorrido, del pedido a la puerta de tu cliente, sea nuestro problema, no el tuyo.',
      'hero.ctaPrimary': 'Inicia una conversación',
      'hero.ctaSecondary': 'Descubre cómo trabajamos',
      'stat.founded.label': 'Fundada',
      'stat.founded.value': '2009',
      'stat.countries.label': 'Países',
      'stat.countries.value': '2',
      'stat.warehouses.label': 'Almacenes',
      'stat.warehouses.value': '2',
      'stat.carriers.label': 'Transportistas',
      'stat.carriers.value': '8',
      'stat.people.label': 'Personas en el equipo',
      'stat.people.value': '130+',
      'stat.revenue.label': 'Facturación anual',
      'stat.revenue.value': '9M €',
      'services.eyebrow': 'Qué hacemos',
      'services.title': 'Un solo socio logístico para todo el recorrido',
      'services.intro': 'Desde que se hace un pedido hasta que se entrega o se devuelve, TrackFlow se encarga de toda la operación para las marcas de e-commerce.',
      'svc.store.title': 'Almacenamos',
      'svc.store.desc': 'Inventario en nuestros almacenes de Los Ángeles y Zaragoza, situados para servir a ambos lados del Atlántico.',
      'svc.pick.title': 'Preparamos y empaquetamos',
      'svc.pick.desc': 'Cada día, cientos de pedidos se recogen de las estanterías, se empaquetan y se entregan a los transportistas con cuidado.',
      'svc.ship.title': 'Enviamos',
      'svc.ship.desc': 'Una red de 8 transportistas en ambos países — UPS, FedEx y DHL en EE. UU.; MRW, SEUR y DHL en España — para que cada paquete viaje con el socio adecuado.',
      'svc.returns.title': 'Devoluciones',
      'svc.returns.desc': 'Logística inversa completa para el 18–25 % del volumen que regresa, con un equipo dedicado en cada decisión, de la aprobación al reacondicionamiento.',
      'why.eyebrow': 'Por qué TrackFlow',
      'why.title': 'Un socio con experiencia para e-commerce en crecimiento',
      'why.intro': 'Las marcas de e-commerce son buenas haciendo y vendiendo productos — que lleguen a la puerta del cliente es donde entra TrackFlow.',
      'why.since.title': 'Distribuyendo desde 2009',
      'why.since.desc': 'Fundada en Los Ángeles, hoy mueve paquetes de las estanterías del almacén a la puerta del cliente desde hace más de quince años.',
      'why.dual.title': 'Dos países, un solo socio',
      'why.dual.desc': 'Opera en Estados Unidos y España con almacenes en Los Ángeles y Zaragoza — un único socio para ambos mercados y sus entornos reguladores.',
      'why.carriers.title': 'Una red de 8 transportistas',
      'why.carriers.desc': 'UPS, FedEx y DHL en Estados Unidos; MRW, SEUR y DHL en España, más dos transportistas locales — flexibilidad en cómo cada paquete llega a su destino.',
      'why.returns.title': 'Devoluciones bajo control',
      'why.returns.desc': 'Logística inversa para el 18–25 % del volumen según cliente y país, con un equipo dedicado en cada decisión de aprobación, recogida y reacondicionamiento.',
      'why.team.title': 'Más de 130 personas en tu operación',
      'why.team.desc': 'Un equipo de operaciones con experiencia repartido entre Los Ángeles y Zaragoza, respaldado por una oficina de tecnología en España que mantiene los sistemas en marcha las 24 horas.',
      'why.24.title': 'Pensado para funcionar 24/7',
      'why.24.desc': 'Los clientes no dejan de esperar sus paquetes a las 18:00. Las operaciones de TrackFlow están diseñadas para seguir moviéndose cuando termina la jornada.',
      'locations.eyebrow': 'Dónde operamos',
      'locations.title': 'Dos mercados, dos almacenes',
      'locations.intro': 'Fundada en Los Ángeles en 2009, TrackFlow opera en Estados Unidos y España con almacenes en ambos países.',
      'loc.us.title': 'Estados Unidos',
      'loc.us.sub': 'Sede central y almacén en la costa oeste',
      'loc.us.desc': 'Sede central y almacén en Los Ángeles, donde están la dirección ejecutiva y gran parte del equipo de operaciones.',
      'loc.la.label': 'Almacén:',
      'loc.la.value': 'Los Ángeles, CA',
      'loc.es.title': 'España',
      'loc.es.sub': 'Oficina de tecnología y almacén en Europa',
      'loc.es.desc': 'Segundo almacén en Zaragoza, sede de la oficina de tecnología y de la mayor parte del equipo de ingeniería que mantiene los sistemas de TrackFlow.',
      'loc.zgz.label': 'Almacén:',
      'loc.zgz.value': 'Zaragoza, España',
      'contact.eyebrow': 'Empieza ahora',
      'contact.title': 'Hablemos de tu logística',
      'contact.desc': 'Cuéntanos tu e-commerce y cómo TrackFlow puede encargarse de almacenar, preparar, empaquetar, enviar y gestionar las devoluciones por ti.',
      'contact.cta': 'Solicita ahora',
      'contact.or': 'O contacta directamente con nosotros:',
      'contact.hours': 'Lun–Vie, 9:00–18:00 (husos de EE. UU. y España)',
      'footer.tagline': 'Logística de última milla y gestión de almacenes para marcas de e-commerce, de la estantería del almacén a la puerta del cliente en Estados Unidos y España.',
      'footer.navTitle': 'Sitio',
      'footer.contactTitle': 'Contacto',
      'footer.address': '<span class="block font-medium text-text-on-ink">Oficina central TrackFlow</span><span class="block">1200 Alameda Street, Los Ángeles, CA 90013</span><span class="block">Estados Unidos</span>',
      'footer.rights': '© 2026 TrackFlow. Todos los derechos reservados.',
      'footer.made': 'Fundada en Los Ángeles, 2009. Servimos a Estados Unidos y España.',

      /* ---- formulario de solicitud (application.html) ---- */
      'app.eyebrow': 'Solicita información',
      'app.title': 'Cuéntanos sobre tu logística',
      'app.intro': 'Este formulario está dirigido a empresas de e-commerce que buscan externalizar su logística. Cuéntanos tu operación y nuestro equipo comercial se pondrá en contacto para agendar una llamada.',
      'form.warning.lowVolume': 'Para volúmenes menores a 100 envíos mensuales, nuestros servicios podrían no ser la solución más eficiente. ¿Seguro que quieres continuar?',
      'form.err.summary': 'El formulario tiene {count} error(es). Revisa los campos resaltados.',
      'form.fs.contact.legend': 'Datos de contacto',
      'form.fs.business.legend': 'Información del negocio',
      'form.fs.privacy.legend': 'Privacidad',
      'form.optional': '(opcional)',
      'form.company.label': 'Nombre de la empresa',
      'form.company.placeholder': 'Acme Corporation',
      'form.contact.label': 'Persona de contacto',
      'form.contact.placeholder': 'Juan Pérez',
      'form.email.label': 'Email corporativo',
      'form.email.placeholder': 'nombre@empresa.com',
      'form.phone.label': 'Teléfono',
      'form.phone.placeholder': '+34 976 555 0147',
      'form.website.label': 'Sitio web de la empresa',
      'form.website.placeholder': 'https://www.empresa.com',
      'form.country.label': 'País de operación principal',
      'form.product.label': 'Tipo de producto',
      'form.volume.label': 'Volumen mensual estimado de envíos',
      'form.services.label': 'Servicios de interés',
      'form.3pl.label': '¿Actualmente trabajas con otro 3PL?',
      'form.comments.label': 'Comentarios o necesidades específicas',
      'form.comments.placeholder': 'Cuéntanos tu operación, volúmenes, regiones…',
      'form.comments.countLabel': 'Caracteres:',
      'form.privacy.label': 'He leído y acepto la política de privacidad.',
      'form.select.placeholder': 'Selecciona una opción',
      'form.country.us': 'Estados Unidos',
      'form.country.es': 'España',
      'form.country.both': 'Ambos',
      'form.country.other': 'Otro',
      'form.product.fashion': 'Moda',
      'form.product.electronics': 'Electrónica',
      'form.product.cosmetics': 'Cosmética',
      'form.product.food': 'Alimentación',
      'form.product.other': 'Otro',
      'form.volume.0': '0–100',
      'form.volume.101': '101–500',
      'form.volume.501': '501–2000',
      'form.volume.2000': '2000+',
      'form.volume.unsure': 'No estoy seguro',
      'form.service.storage': 'Almacenaje',
      'form.service.lastmile': 'Última milla',
      'form.service.reverse': 'Logística inversa',
      'form.3pl.yes': 'Sí',
      'form.3pl.no': 'No',
      'form.3pl.evaluating': 'Estoy evaluando opciones',
      'form.err.company': 'El nombre de la empresa debe tener al menos 2 caracteres',
      'form.err.contact': 'Ingresa nombre y apellido del contacto',
      'form.err.email': 'Ingresa un email corporativo válido (ejemplo: nombre@empresa.com)',
      'form.err.phone': 'El teléfono debe incluir código de país (ejemplo: +34 976 555 0147)',
      'form.err.website': 'Si incluyes sitio web, debe ser una URL válida',
      'form.err.country': 'Selecciona el país de operación principal',
      'form.err.product': 'Selecciona el tipo de producto que manejas',
      'form.err.volume': 'Selecciona el volumen mensual estimado',
      'form.err.services': 'Selecciona al menos un servicio',
      'form.err.3pl': 'Indica si actualmente trabajas con otro proveedor logístico',
      'form.err.comments': 'Los comentarios no pueden exceder 500 caracteres',
      'form.err.comments.dynamic': 'Los comentarios no pueden exceder 500 caracteres (quedan {remaining})',
      'form.err.privacy': 'Debes aceptar la política de privacidad para continuar',
      'form.submit': 'Enviar solicitud',
      'form.reset': 'Limpiar formulario',
      'form.restart': 'Enviar otra solicitud',
      'form.success.title': '¡Gracias por tu interés en TrackFlow!',
      'form.success.body': 'Hemos recibido tu solicitud. Nuestro equipo comercial revisará tu información y te contactará en las próximas 24-48 horas para agendar una llamada y conocer tus necesidades logísticas en detalle.',
      'form.success.contact': 'Si tienes alguna consulta urgente, escríbenos directamente a <a href="mailto:contact@trackflowlogistics.com" class="font-medium text-brand underline decoration-edge underline-offset-4 transition hover:text-brand-strong">contact@trackflowlogistics.com</a>'
    }
  };

  var currentLang = 'en';

  /* ---------- helpers ---------- */

  function dir() {
    return translations[currentLang] || translations.en;
  }

  function setLang(lang, syncStorage) {
    lang = (lang === 'es') ? 'es' : 'en';
    currentLang = lang;

    if (syncStorage !== false) {
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* storage unavailable */ }
    }

    // Update text flagged with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (key && dir()[key] !== undefined) {
        el.textContent = dir()[key];
      }
    });

    // Update rich markup flagged with data-i18n-html
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (key && dir()[key] !== undefined && el.innerHTML !== dir()[key]) {
        el.innerHTML = dir()[key];
      }
    });

    // Update placeholders flagged with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key && dir()[key] !== undefined) {
        el.setAttribute('placeholder', dir()[key]);
      }
    });

    // Update meta content flagged with data-i18n-content (description, OG, etc.)
    document.querySelectorAll('meta[data-i18n-content]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-content');
      if (key && dir()[key] !== undefined) {
        el.setAttribute('content', dir()[key]);
      }
    });

    // Update document language + title
    document.documentElement.setAttribute('lang', lang);
    var titleKey = 'meta.title';
    var titleEl = document.querySelector('title[data-i18n]');
    if (titleEl && titleEl.getAttribute('data-i18n')) {
      titleKey = titleEl.getAttribute('data-i18n');
    }
    if (dir()[titleKey]) {
      document.title = dir()[titleKey];
    }

    // Reflect selection state on EN / ES buttons
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      var active = btn.getAttribute('data-lang-btn') === lang;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // Notify other scripts (e.g. validation.js) so dynamic content stays coherent
    document.dispatchEvent(new CustomEvent('trackflow:langchange', { detail: { lang: lang } }));
  }

  /* ---------- public API (used by validation.js for dynamic messages) ---------- */
  window.TrackFlowI18N = {
    getLang: function () { return currentLang; },
    t: function (key) {
      return (dir()[key] !== undefined) ? dir()[key] : key;
    }
  };

  /* ---------- init ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* storage unavailable */ }

    setLang((saved === 'es' || saved === 'en') ? saved : 'en', false);

    // Language toggle
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLang(btn.getAttribute('data-lang-btn'), true);
      });
    });

    /* ---------- collapsible left sidebar ----------
     * Desktop (>= lg): the sidebar is a fixed rail that toggles between an
     * expanded state (icons + labels, w-64) and a collapsed icon-only rail
     * (w-16). The "rail" class on #sidebar drives the compact variant via
     * CSS ([.rail_&] variants). The main column reflows with lg:pl-64 / lg:pl-16.
     * Mobile/tablet (< lg): the sidebar opens as an overlay (hidden by default,
     * backdrop + close button + Escape). The rail compact mode is not used on
     * small screens.
     */
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    var sidebarToggle = document.getElementById('sidebar-toggle');
    var sidebarClose = document.getElementById('sidebar-close');
    var mainWrap = document.getElementById('main-wrap');
    var iconMenu = document.getElementById('icon-menu');
    var iconClose = document.getElementById('icon-close');

    function isMobileView() {
      // Sidebar behaves as an overlay below lg (tablet included);
      // it becomes a fixed push-down rail from lg (1024px) up.
      return window.matchMedia('(max-width: 1023px)').matches;
    }

    function setSidebar(open) {
      if (!sidebar) return;

      if (isMobileView()) {
        // Overlay behaviour: show/hide the whole panel + backdrop
        sidebar.classList.add('hidden');
        sidebar.classList.toggle('hidden', !open);
        sidebar.classList.toggle('flex', open);
        if (overlay) overlay.classList.toggle('hidden', !open);
      } else {
        // Desktop rail: toggle the compact "rail" variant instead of hiding
        sidebar.classList.remove('hidden');
        sidebar.classList.add('flex');
        sidebar.classList.toggle('rail', !open);
        if (overlay) overlay.classList.add('hidden');
      }

      if (sidebarToggle) {
        sidebarToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      if (iconMenu) iconMenu.classList.toggle('hidden', open);
      if (iconClose) iconClose.classList.toggle('hidden', !open);

      // Expand/collapse the content column on desktop (>= lg)
      if (mainWrap) {
        mainWrap.classList.toggle('lg:pl-64', open);
        mainWrap.classList.toggle('lg:pl-16', !open);
        mainWrap.classList.toggle('lg:pl-0', false);
      }
    }

    function isSidebarOpen() {
      return sidebarToggle ? sidebarToggle.getAttribute('aria-expanded') === 'true' : !sidebar.classList.contains('hidden');
    }

    if (sidebar && sidebarToggle) {
      // Defaults: hidden on mobile, visible on desktop (>= md)
      setSidebar(!isMobileView());

      sidebarToggle.addEventListener('click', function () {
        setSidebar(!isSidebarOpen());
      });
      if (sidebarClose) {
        sidebarClose.addEventListener('click', function () {
          setSidebar(false);
        });
      }
      if (overlay) {
        overlay.addEventListener('click', function () {
          setSidebar(false);
        });
      }

      // Close with Escape when the sidebar is open
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && isSidebarOpen()) {
          setSidebar(false);
        }
      });

      // Keep the backdrop/margins coherent on resize
      var resizeTimer = null;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          setSidebar(isSidebarOpen());
        }, 150);
      });
    }
  });
})();