# CONTEXT.md — HealthCore

## Hito 1: Sitio web público de tu empresa

_These instructions are [available in English](./CONTEXT-healthcore.en.md)._

> Este documento describe tu empresa y la situación específica para la que estás construyendo este hito. Léelo completo antes de escribir cualquier código. Todo lo que construyas debe reflejar este contexto.

---

## Tu empresa

**HealthCore** es una empresa de servicios de salud ambulatorios fundada en 2011 en Austin, Texas. Opera una red de 12 clínicas ambulatorias — 9 en Estados Unidos (Texas, Florida y Georgia) y 3 en el Reino Unido (Londres y Mánchester) — que ofrecen atención primaria, consultas con especialistas, manejo de enfermedades crónicas y programas de salud preventiva. Emplea aproximadamente a 200 personas y genera alrededor de 28 millones de dólares en ingresos anuales. La ventaja competitiva de HealthCore es la accesibilidad: citas el mismo día, horarios extendidos y personal bilingüe en las sedes de EE. UU.

---

## Tu departamento y el problema que debes resolver

Trabajas en el equipo de **HealthCore Digital**, la unidad interna de tecnología creada por la CEO Dra. Sandra Okonkwo para construir la infraestructura que necesitan los equipos clínicos y operativos. Este hito fue asignado por **Priya Nair**, directora de Experiencia del Paciente.

La presencia online actual de HealthCore es una sola página de marcador de posición de 2019 con un número de teléfono y sin certificado SSL. Pacientes en Texas y Florida reportan que su primera impresión de HealthCore en internet les hace cuestionar si la empresa es real. Mientras tanto, la recepción recibe consultas de pacientes por teléfono sin estructura, dedicando un promedio de 20 minutos por llamada solo para recopilar información básica antes de siquiera considerar una cita. Priya necesita un sitio web profesional bilingüe que presente los servicios y ubicaciones de HealthCore, y que capture datos estructurados de consultas de pacientes para que recepción pueda hacer seguimiento de forma eficiente.

---

## Tu stakeholder

**Priya Nair**, directora de Experiencia del Paciente

> Hola,
>
> Hemos estado perdiendo pacientes frente a la competencia no porque nuestra atención sea peor, sino porque la gente nos busca en Google y no encuentra nada creíble. Necesitamos un sitio web público real, y necesitamos que funcione en **inglés y español**: una gran parte de nuestra población de pacientes en Austin y Miami habla español, y ahora mismo no tenemos nada para ellos.
>
> El sitio debe tener dos partes. Primero, una landing page que presente quiénes somos, qué ofrecemos y dónde están nuestras clínicas. Segundo, un formulario de consulta para pacientes donde las personas puedan enviar su información para que nuestro equipo de recepción las llame y confirme una cita. Ahora mismo ese proceso ocurre totalmente por teléfono y sin ninguna estructura; nos está costando tiempo y pacientes.
>
> Usa exactamente el contenido y las especificaciones de campos de este documento. No inventes nombres de clínicas, números de teléfono ni servicios: usa lo que está aquí. Y por favor haz que se vea profesional. Este es nuestro debut digital.
>
> — Priya

---

## Alcance de idiomas

- El sitio web debe estar completamente disponible en **inglés y español**. Esto no es opcional: una parte significativa de la población de pacientes de HealthCore en Texas y Florida habla español.
- Implementa el cambio de idioma usando dos archivos HTML separados (`index.html` / `index.es.html` y `application.html` / `application.es.html`) o una sola página con un interruptor que cambie el contenido mediante atributos `data-lang` y JavaScript.
- Todas las etiquetas, mensajes de error, textos de placeholder, etiquetas de botones y mensajes de éxito deben estar completamente traducidos. No dejes ningún texto visible para el usuario en inglés cuando la página esté en modo español.

---

## Contenido de la landing page

Tu landing page debe incluir las siguientes secciones, en este orden:

### Encabezado

- Logo o nombre "HealthCore"
- Navegación: Inicio | Servicios | Ubicaciones | Contacto
- Selector de idioma: EN | ES

### Hero

- **Titular:** "Atención médica que se adapta a tu vida"
- **Subtitular:** "12 clínicas ambulatorias en EE. UU. y Reino Unido que ofrecen citas el mismo día, horarios extendidos y atención bilingüe, para que recibas la atención que necesitas, cuando la necesitas."
- **Llamado a la acción:** Botón "Solicitar una cita" que enlace al formulario de consulta

### Servicios (3 columnas)

1. **Atención Primaria y Enfermedades Crónicas**
   - Citas el mismo día con médicos de atención primaria
   - Manejo continuo de diabetes, hipertensión y asma

2. **Consultas con Especialistas**
   - Cardiología, endocrinología, neumología y salud de la mujer
   - Derivaciones coordinadas dentro de la red de HealthCore

3. **Salud Preventiva y Bienestar**
   - Chequeos, vacunación y revisiones anuales
   - Asesoramiento en salud mental y derivaciones a psiquiatría

### Por qué HealthCore (2 columnas)

- **Citas el mismo día** en la mayoría de las ubicaciones
- **Horarios extendidos** — entre semana hasta las 7pm u 8pm, sábados disponibles
- **Personal bilingüe** en inglés y español en ubicaciones de EE. UU.
- **12 clínicas** en Texas, Florida, Georgia y el Reino Unido

### Ubicaciones (solo EE. UU.; mostrar como tabla o cuadrícula de tarjetas)

| Nombre de la clínica      | Ciudad      | Estado | Teléfono       | Horario                       |
| ------------------------- | ----------- | ------ | -------------- | ----------------------------- |
| HealthCore Austin Central | Austin      | TX     | (512) 340-8800 | Lun–Vie 7am–8pm · Sáb 9am–3pm |
| HealthCore Austin North   | Austin      | TX     | (512) 340-8810 | Lun–Vie 8am–7pm               |
| HealthCore San Antonio    | San Antonio | TX     | (210) 720-4400 | Lun–Vie 8am–6pm · Sáb 9am–1pm |
| HealthCore Miami          | Miami       | FL     | (305) 510-7700 | Lun–Vie 7am–8pm · Sáb 9am–4pm |
| HealthCore Orlando        | Orlando     | FL     | (407) 892-6600 | Lun–Vie 8am–6pm               |
| HealthCore Atlanta        | Atlanta     | GA     | (404) 330-9900 | Lun–Vie 8am–7pm               |

> Las clínicas del Reino Unido atienden un mercado independiente y no se incluyen en este sitio web público.

### Contacto

- Consultas generales: info@healthcore.com
- Sede central de Austin: (512) 340-8800
- Miami: (305) 510-7700
- Reino Unido (Londres): +44 20 7946 0100

### Pie de página

- © 2025 HealthCore. Todos los derechos reservados.
- LinkedIn | Facebook | Instagram

---

## Campos del formulario de consulta para pacientes

El formulario (`application.html`) es un **formulario de consulta para pacientes**, no un formulario de reserva. Su propósito es recopilar suficiente información estructurada para que recepción pueda llamar al paciente y confirmar una cita. Todos los atributos `name` de los campos se especifican abajo y deben usarse exactamente como están escritos.

| Campo                                       | Tipo     | Atributo `name`       | Validación                                                                                                                                           | Obligatorio |
| ------------------------------------------- | -------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Nombre**                                  | text     | `first_name`          | 2–50 caracteres, solo letras                                                                                                                         | Sí          |
| **Apellido**                                | text     | `last_name`           | 2–50 caracteres, solo letras                                                                                                                         | Sí          |
| **Fecha de nacimiento**                     | date     | `date_of_birth`       | No puede ser una fecha futura · El paciente no puede tener más de 120 años                                                                           | Sí          |
| **Correo electrónico**                      | email    | `email`               | Formato de correo válido                                                                                                                             | Sí          |
| **Número de teléfono**                      | tel      | `phone`               | Debe comenzar con código de país (ej., +1 305 555 0191 o +34 612 345 678)                                                                            | Sí          |
| **Idioma preferido**                        | select   | `preferred_language`  | Opciones: English · Spanish                                                                                                                          | Sí          |
| **Clínica preferida**                       | select   | `preferred_clinic`    | Las opciones deben usar los nombres de clínicas de la tabla de Ubicaciones de arriba                                                                 | Sí          |
| **Fecha preferida**                         | date     | `preferred_date`      | Al menos 1 día hábil desde hoy · No más de 60 días hacia adelante                                                                                    | Sí          |
| **Franja horaria preferida**                | select   | `preferred_time`      | Opciones: Morning (7am–12pm) · Afternoon (12pm–5pm) · Evening (5pm–8pm)                                                                              | Sí          |
| **Servicio requerido**                      | select   | `service_type`        | Opciones: Primary Care · Chronic Disease Management · Specialist Consultation · Preventive Health · Women's Health · Paediatric Care · Mental Health | Sí          |
| **¿Es tu primera visita a HealthCore?**     | radio    | `new_patient`         | Opciones: Yes · No                                                                                                                                   | Sí          |
| **¿Tienes seguro médico?**                  | radio    | `has_insurance`       | Opciones: Yes · No                                                                                                                                   | Sí          |
| **Aseguradora**                             | text     | `insurance_provider`  | Obligatorio solo si `has_insurance` = Yes · Máximo 100 caracteres                                                                                    | Condicional |
| **ID de afiliado**                          | text     | `insurance_member_id` | Obligatorio solo si `has_insurance` = Yes · 6–20 caracteres alfanuméricos                                                                            | Condicional |
| **Descripción breve de tu consulta médica** | textarea | `health_concern`      | 20–500 caracteres · Contador de caracteres en vivo                                                                                                   | Sí          |
| **Consiento que HealthCore me contacte**    | checkbox | `contact_consent`     | Debe marcarse para enviar                                                                                                                            | Sí          |

---

## Validaciones específicas

1. **Nombre / Apellido:** Solo letras (incluyendo caracteres acentuados: á, é, í, ó, ú, ñ, ü). Sin números ni caracteres especiales.
2. **Fecha de nacimiento:** No puede ser una fecha futura. El paciente debe tener entre 0 y 120 años.
3. **Teléfono:** Debe comenzar con `+` seguido de código de país. Acepta formatos como `+1 305 555 0191` o `+34 612 345 678`.
4. **Fecha preferida:** Al menos 1 día hábil desde hoy. No más de 60 días en el futuro.
5. **Tipo de servicio + fecha de nacimiento (Paediatric Care):** Si el paciente selecciona "Paediatric Care", su fecha de nacimiento debe indicar que tiene menos de 18 años. Si no, muestra un error específico.
6. **Franja horaria preferida + horario de clínica:** Si el paciente selecciona "Evening (5pm–8pm)", solo son válidas clínicas que atienden después de las 5pm. Muestra una advertencia si la combinación es poco probable que esté disponible (por ejemplo, San Antonio cierra a las 6pm y Austin North a las 7pm).
7. **Campos de seguro:** Si `has_insurance` = Yes, `insurance_provider` y `insurance_member_id` pasan a ser obligatorios y deben validarse.
8. **Paciente recurrente:** Si `new_patient` = No, muestra un campo adicional opcional: **Patient ID** (`name="patient_id"`, formato `HC-` seguido de 6 caracteres alfanuméricos, por ejemplo, `HC-A3F291`).
9. **Consulta médica:** Mínimo 20 caracteres. Máximo 500. Muestra un contador de caracteres en vivo.
10. **Casilla de consentimiento:** Debe estar marcada para enviar. Si no está marcada, el formulario no se envía.

---

## Mensajes de error esperados

Cuando un campo no pase la validación, muestra estos mensajes específicos:

- **Nombre:** "El nombre debe contener solo letras y tener al menos 2 caracteres"
- **Apellido:** "El apellido debe contener solo letras y tener al menos 2 caracteres"
- **Fecha de nacimiento:** "Ingresa una fecha de nacimiento válida. El paciente debe tener entre 0 y 120 años"
- **Email:** "Ingresa un correo electrónico válido (ejemplo: nombre@proveedor.com)"
- **Teléfono:** "El teléfono debe incluir un código de país (ejemplo: +1 305 555 0191)"
- **Idioma preferido:** "Selecciona tu idioma preferido"
- **Clínica preferida:** "Selecciona la clínica que te gustaría visitar"
- **Fecha preferida:** "Selecciona una fecha de al menos 1 día hábil desde hoy y no más de 60 días hacia adelante"
- **Franja horaria preferida:** "Selecciona tu franja horaria preferida"
- **Tipo de servicio:** "Selecciona el tipo de atención que estás buscando"
- **Tipo de servicio (Paediatric):** "Paediatric Care está disponible para pacientes menores de 18 años. Revisa la fecha de nacimiento o selecciona un servicio diferente."
- **Paciente nuevo:** "Indica si esta es tu primera visita a HealthCore"
- **Tiene seguro:** "Indica si tienes seguro médico"
- **Aseguradora:** "Ingresa el nombre de tu aseguradora"
- **ID de afiliado:** "El ID de afiliado debe tener entre 6 y 20 caracteres alfanuméricos"
- **Consulta médica:** "Describe tu consulta médica en al menos 20 caracteres (faltan X caracteres)"
- **Consentimiento:** "Debes dar tu consentimiento para ser contactado antes de enviar este formulario"

---

## Mensaje de éxito

Cuando el formulario valide correctamente (simular envío; no enviar datos a ningún lugar), muestra:

> **Gracias por contactar a HealthCore.**
>
> Hemos recibido tu consulta. Un miembro de nuestro equipo de recepción se pondrá en contacto contigo dentro de 1 día hábil para confirmar los detalles de tu cita y responder cualquier pregunta.
>
> Si necesitas asistencia urgente, llama directamente a tu clínica preferida usando los números listados en nuestro sitio web.
>
> Esperamos poder atenderte pronto.

---

## Restricción específica

El formulario de consulta está diseñado para **pacientes que buscan atención médica**, no para empresas ni proveedores de salud que quieran asociarse con HealthCore. El formulario debe incluir una nota visible que diga:

> "¿Eres un proveedor de salud u organización que busca asociarse con HealthCore? Contacta a nuestro equipo de operaciones en partnerships@healthcore.com"

---

## Marcado Schema.org requerido

Implementa los siguientes datos estructurados de Schema.org en tu landing page:

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalOrganization",
  "name": "HealthCore",
  "description": "Outpatient healthcare network offering primary care, specialist consultations, chronic disease management, and preventive health programmes.",
  "url": "https://www.healthcore.com",
  "foundingDate": "2011",
  "logo": "https://www.healthcore.com/logo.png",
  "availableLanguage": ["English", "Spanish"],
  "areaServed": ["US", "GB"],
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Austin",
    "addressRegion": "Texas",
    "addressCountry": "US"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-512-340-8800",
    "contactType": "patient services",
    "availableLanguage": ["English", "Spanish"]
  },
  "sameAs": [
    "https://linkedin.com/company/healthcore",
    "https://facebook.com/healthcore",
    "https://instagram.com/healthcore"
  ]
}
```

Además, incluye una entrada `MedicalClinic` para cada ubicación en EE. UU. listada en la tabla de Ubicaciones, con `name`, `telephone`, `openingHours` y `parentOrganization` referenciando a HealthCore.