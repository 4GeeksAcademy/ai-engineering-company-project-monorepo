export type Lang = "en" | "es";

export const translations = {
  en: {
    meta: {
      homeTitle: "HealthCore | Outpatient Healthcare Services",
      homeDescription:
        "HealthCore offers same-day outpatient care, specialist consultations, and preventive health services across US and UK clinics.",
      applicationTitle: "HealthCore | Patient Enquiry Form",
      applicationDescription:
        "Submit your HealthCore patient enquiry with structured details so our front desk can contact you within one business day.",
    },
    nav: {
      home: "Home",
      application: "Application",
      services: "Services",
      locations: "Locations",
      contact: "Contact",
      utilities: "Utilities",
      tracker: "Talent pipeline",
      menu: "Menu",
      closeMenu: "Close",
    },
    hero: {
      headline: "Healthcare that fits your life",
      subheadline:
        "12 outpatient clinics across the US and UK offering same-day appointments, extended hours, and bilingual care — so you can get the attention you need, when you need it.",
      cta: "Request an appointment",
    },
    services: {
      title: "Our services",
      columns: [
        {
          title: "Primary Care & Chronic Disease",
          items: [
            "Same-day appointments with primary care physicians",
            "Ongoing management of diabetes, hypertension, and asthma",
          ],
        },
        {
          title: "Specialist Consultations",
          items: [
            "Cardiology, endocrinology, pulmonology, and women's health",
            "Referrals coordinated within the HealthCore network",
          ],
        },
        {
          title: "Preventive Health & Wellbeing",
          items: [
            "Screenings, vaccinations, and annual check-ups",
            "Mental health counselling and psychiatry referrals",
          ],
        },
      ],
    },
    benefits: {
      title: "Why HealthCore",
      items: [
        "Same-day appointments at most locations",
        "Extended hours — weekdays until 7pm or 8pm, Saturdays available",
        "Bilingual staff in English and Spanish at US locations",
        "12 clinics across Texas, Florida, Georgia, and the United Kingdom",
      ],
    },
    locations: { title: "Our US locations", clinic: "Clinic", city: "City", state: "State", phone: "Phone", hours: "Hours" },
    contact: {
      title: "Contact us",
      general: "General enquiries",
      austin: "Austin HQ",
      miami: "Miami",
      uk: "UK (London)",
      cta: "Request an appointment",
    },
    footer: {
      rights: "© 2025 HealthCore. All rights reserved.",
      linkedin: "LinkedIn",
      facebook: "Facebook",
      instagram: "Instagram",
    },
    form: {
      title: "Patient enquiry form",
      intro:
        "Complete this form and our front desk team will contact you within 1 business day to confirm your appointment details.",
      partnership:
        "Are you a healthcare provider or organisation looking to partner with HealthCore? Contact our operations team at partnerships@healthcore.com",
      personalDetails: "Personal details",
      enquiryDetails: "Enquiry details",
      insurance: "Insurance",
      healthConcern: "Health concern",
      firstName: "First name *",
      lastName: "Last name *",
      dob: "Date of birth *",
      email: "Email address *",
      phone: "Phone number *",
      preferredLanguage: "Preferred language *",
      preferredClinic: "Preferred clinic *",
      preferredDate: "Preferred date *",
      preferredTime: "Preferred time of day *",
      serviceType: "Service needed *",
      newPatient: "Is this your first visit to HealthCore? *",
      hasInsurance: "Do you have health insurance? *",
      insuranceProvider: "Insurance provider *",
      memberId: "Member ID *",
      patientId: "Patient ID (optional)",
      healthConcernLabel: "Brief description of your health concern *",
      consent: "I consent to HealthCore contacting me *",
      selectOne: "Select one",
      yes: "Yes",
      no: "No",
      submit: "Submit enquiry",
      clear: "Clear form",
      morning: "Morning (7am–12pm)",
      afternoon: "Afternoon (12pm–5pm)",
      evening: "Evening (5pm–8pm)",
      services: {
        primary: "Primary Care",
        chronic: "Chronic Disease Management",
        specialist: "Specialist Consultation",
        preventive: "Preventive Health",
        womens: "Women's Health",
        paediatric: "Paediatric Care",
        mental: "Mental Health",
      },
      successTitle: "Thank you for reaching out to HealthCore.",
      successBody:
        "We have received your enquiry. A member of our front desk team will contact you within 1 business day to confirm your appointment details and answer any questions.",
      successUrgent:
        "If you need urgent assistance, please call your preferred clinic directly using the numbers listed on our website.",
      successClosing: "We look forward to caring for you.",
      charsRemaining: (n: number) => `${n} characters remaining`,
    },
    errors: {
      first_name: "First name must contain only letters and be at least 2 characters",
      last_name: "Last name must contain only letters and be at least 2 characters",
      date_of_birth: "Enter a valid date of birth. Patient must be between 0 and 120 years old",
      email: "Enter a valid email address (example: name@provider.com)",
      phone: "Phone must include a country code (example: +1 305 555 0191)",
      preferred_language: "Select your preferred language",
      preferred_clinic: "Select the clinic you would like to visit",
      preferred_date: "Select a date at least 1 business day from today and no more than 60 days ahead",
      preferred_time: "Select your preferred time of day",
      service_type: "Select the type of care you are looking for",
      paediatric:
        "Paediatric Care is available for patients under 18. Please check the date of birth or select a different service.",
      new_patient: "Please indicate whether this is your first visit to HealthCore",
      has_insurance: "Please indicate whether you have health insurance",
      insurance_provider: "Please enter your insurance provider name",
      insurance_member_id: "Member ID must be between 6 and 20 alphanumeric characters",
      health_concern: (remaining: number) =>
        `Please describe your health concern in at least 20 characters (${remaining} characters remaining)`,
      contact_consent: "You must consent to being contacted before submitting this form",
      patient_id: "Patient ID must match format HC-XXXXXX (letters and numbers)",
      timeClinicWarning:
        "Evening requests are valid for this clinic, but slots may be limited because it closes before 8pm.",
    },
  },
  es: {
    meta: {
      homeTitle: "HealthCore | Servicios de salud ambulatorios",
      homeDescription:
        "HealthCore ofrece atencion ambulatoria el mismo dia, consultas especializadas y servicios preventivos en clinicas de EE. UU. y Reino Unido.",
      applicationTitle: "HealthCore | Formulario de consulta de paciente",
      applicationDescription:
        "Envia tu consulta de paciente a HealthCore con datos estructurados para que recepcion te contacte en un dia habil.",
    },
    nav: {
      home: "Inicio",
      application: "Formulario",
      services: "Servicios",
      locations: "Ubicaciones",
      contact: "Contacto",
      utilities: "Utilidades",
      tracker: "Pipeline de talento",
      menu: "Menu",
      closeMenu: "Cerrar",
    },
    hero: {
      headline: "Atencion medica que se adapta a tu vida",
      subheadline:
        "12 clinicas ambulatorias en EE. UU. y Reino Unido con citas el mismo dia, horario extendido y atencion bilingue para recibir la ayuda que necesitas, cuando la necesitas.",
      cta: "Solicitar una cita",
    },
    services: {
      title: "Nuestros servicios",
      columns: [
        {
          title: "Atencion primaria y enfermedades cronicas",
          items: [
            "Citas el mismo dia con medicos de atencion primaria",
            "Manejo continuo de diabetes, hipertension y asma",
          ],
        },
        {
          title: "Consultas especializadas",
          items: [
            "Cardiologia, endocrinologia, neumologia y salud de la mujer",
            "Referencias coordinadas dentro de la red HealthCore",
          ],
        },
        {
          title: "Salud preventiva y bienestar",
          items: [
            "Detecciones, vacunas y chequeos anuales",
            "Consejeria de salud mental y referencias de psiquiatria",
          ],
        },
      ],
    },
    benefits: {
      title: "Por que HealthCore",
      items: [
        "Citas el mismo dia en la mayoria de ubicaciones",
        "Horario extendido — entre semana hasta las 7pm u 8pm, sabados disponibles",
        "Personal bilingue en ingles y espanol en ubicaciones de EE. UU.",
        "12 clinicas en Texas, Florida, Georgia y Reino Unido",
      ],
    },
    locations: {
      title: "Nuestras ubicaciones en EE. UU.",
      clinic: "Clinica",
      city: "Ciudad",
      state: "Estado",
      phone: "Telefono",
      hours: "Horario",
    },
    contact: {
      title: "Contactanos",
      general: "Consultas generales",
      austin: "Sede Austin",
      miami: "Miami",
      uk: "Reino Unido (Londres)",
      cta: "Solicitar una cita",
    },
    footer: {
      rights: "© 2025 HealthCore. Todos los derechos reservados.",
      linkedin: "LinkedIn",
      facebook: "Facebook",
      instagram: "Instagram",
    },
    form: {
      title: "Formulario de consulta de paciente",
      intro:
        "Completa este formulario y nuestro equipo de recepcion te contactara dentro de 1 dia habil para confirmar los detalles de tu cita.",
      partnership:
        "Es una organizacion o proveedor de salud interesado en colaborar con HealthCore? Contacte a nuestro equipo de operaciones en partnerships@healthcore.com",
      personalDetails: "Datos personales",
      enquiryDetails: "Detalles de la consulta",
      insurance: "Seguro",
      healthConcern: "Motivo de consulta",
      firstName: "Nombre *",
      lastName: "Apellido *",
      dob: "Fecha de nacimiento *",
      email: "Correo electronico *",
      phone: "Telefono *",
      preferredLanguage: "Idioma preferido *",
      preferredClinic: "Clinica preferida *",
      preferredDate: "Fecha preferida *",
      preferredTime: "Horario preferido *",
      serviceType: "Servicio necesario *",
      newPatient: "Es tu primera visita a HealthCore? *",
      hasInsurance: "Tienes seguro medico? *",
      insuranceProvider: "Proveedor de seguro *",
      memberId: "ID de miembro *",
      patientId: "ID de paciente (opcional)",
      healthConcernLabel: "Breve descripcion de tu motivo de consulta *",
      consent: "Doy consentimiento para que HealthCore me contacte *",
      selectOne: "Selecciona una opcion",
      yes: "Si",
      no: "No",
      submit: "Enviar consulta",
      clear: "Limpiar formulario",
      morning: "Manana (7am–12pm)",
      afternoon: "Tarde (12pm–5pm)",
      evening: "Noche (5pm–8pm)",
      services: {
        primary: "Atencion primaria",
        chronic: "Manejo de enfermedad cronica",
        specialist: "Consulta especializada",
        preventive: "Salud preventiva",
        womens: "Salud de la mujer",
        paediatric: "Atencion pediatrica",
        mental: "Salud mental",
      },
      successTitle: "Gracias por contactar a HealthCore.",
      successBody:
        "Hemos recibido tu consulta. Un miembro de nuestro equipo de recepcion te contactara dentro de 1 dia habil para confirmar los detalles de tu cita y responder tus preguntas.",
      successUrgent:
        "Si necesitas asistencia urgente, llama directamente a tu clinica preferida usando los numeros en nuestro sitio web.",
      successClosing: "Esperamos poder cuidarte pronto.",
      charsRemaining: (n: number) => `${n} caracteres restantes`,
    },
    errors: {
      first_name: "El nombre debe contener solo letras y tener al menos 2 caracteres",
      last_name: "El apellido debe contener solo letras y tener al menos 2 caracteres",
      date_of_birth: "Ingresa una fecha de nacimiento valida. El paciente debe tener entre 0 y 120 anos",
      email: "Ingresa un correo valido (ejemplo: nombre@proveedor.com)",
      phone: "El telefono debe incluir codigo de pais (ejemplo: +34 612 345 678)",
      preferred_language: "Selecciona tu idioma preferido",
      preferred_clinic: "Selecciona la clinica que deseas visitar",
      preferred_date: "Selecciona una fecha con al menos 1 dia habil desde hoy y no mas de 60 dias",
      preferred_time: "Selecciona tu horario preferido",
      service_type: "Selecciona el tipo de atencion que buscas",
      paediatric:
        "La atencion pediatrica esta disponible para pacientes menores de 18 anos. Verifica la fecha de nacimiento o elige otro servicio.",
      new_patient: "Indica si es tu primera visita a HealthCore",
      has_insurance: "Indica si tienes seguro medico",
      insurance_provider: "Ingresa el nombre de tu proveedor de seguro",
      insurance_member_id: "El ID de miembro debe tener entre 6 y 20 caracteres alfanumericos",
      health_concern: (remaining: number) =>
        `Describe tu motivo de consulta con al menos 20 caracteres (${remaining} caracteres restantes)`,
      contact_consent: "Debes dar consentimiento para que podamos contactarte antes de enviar",
      patient_id: "El ID de paciente debe tener formato HC-XXXXXX (letras y numeros)",
      timeClinicWarning:
        "Las solicitudes en horario nocturno son validas para esta clinica, pero puede haber menos disponibilidad porque cierra antes de las 8pm.",
    },
  },
} as const;

export type TranslationKey = keyof typeof translations.en.errors;
