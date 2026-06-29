## Hito 1

Comando para correr la app:

```bash
npx http-server . -p 3000 -a 0.0.0.0
```

Estructura base creada:

```text
/
├── index.html (landing page)
├── application.html (formulario de aplicación/registro)
└── validation.js (lógica de validación del formulario)
```

Campos del formulario de aplicacion (3 pasos):

Paso 1 - Datos personales

- fullName (text, requerido)
- email (email, requerido)
- phone (tel, requerido)
- city (text, requerido)
- country (select, requerido)
- experienceYears (number, requerido)

Paso 2 - Enfoque en TrackFlow

- department (select, requerido)
- roleProfile (select, requerido)
- availabilityDate (date, requerido)
- englishLevel (select, requerido)
- workMode (radio: remote/hybrid/onsite, requerido)

Paso 3 - Experiencia, condiciones y cierre

- focusInventory (checkbox)
- focusTracking (checkbox)
- focusReturns (checkbox)
- focusCx (checkbox)
- focusCarrierOptimization (checkbox)
- focusExecutiveDashboard (checkbox)
- techStack (textarea, requerido)
- proposalSummary (textarea, requerido, max 400)
- portfolioUrl (url, requerido)
- cvUrl (url, requerido)
- salaryRange (select, requerido)
- shiftAvailability (select, requerido)
- additionalComments (textarea, opcional)
- acceptPolicy (checkbox, requerido)
- acceptUpdates (checkbox, opcional)

Reglas de validacion relevantes:

- Email debe tener formato valido.
- Telefono permite solo numeros y simbolos tipicos (+, -, espacios, parentesis) y una longitud de 7 a 15 digitos.
- En paso 3 se debe seleccionar al menos un reto prioritario.
