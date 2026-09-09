# CONTEXT.md — Nexova

## Hito 1: Sitio Web Público de tu Empresa

_These instructions are [available in English](./CONTEXT-nexova.en.md)._

> Este documento describe tu empresa y la situación concreta para la que estás construyendo este hito. Léelo completo antes de escribir ningún código. Todo lo que construyas debe reflejar este contexto.

---

## Tu empresa

**Nexova** es una consultora de recursos humanos y adquisición de talento fundada en 2011, con sede en Valencia, España, y una oficina de expansión en Miami, Florida. Opera en tres líneas de negocio: headhunting ejecutivo y de mandos medios, outsourcing de equipos de atención al cliente para empresas tecnológicas, y formación corporativa en soft skills y liderazgo. Tiene aproximadamente 120 empleados y genera 8 millones de dólares en facturación anual. Sus clientes son principalmente empresas medianas de tecnología, retail y servicios financieros.

---

## Tu departamento y el problema que debes resolver

Trabajas en el equipo de **Marketing y Comunicaciones**, liderado por Carmen Ruiz. El sitio web corporativo de Nexova fue construido en 2019 y no ha tenido actualizaciones significativas. Es lento, no es accesible, y no refleja el posicionamiento actual de la empresa. Además, no existe un sistema para capturar leads: las personas interesadas en oportunidades laborales o servicios deben enviar un email genérico a <info@nexova.com>. Carmen necesita un sitio web moderno que presente profesionalmente los servicios de Nexova y capture información de candidatos potenciales de forma estructurada.

---

## Tu stakeholder

**Carmen Ruiz**, Head of Marketing

> Hola,
>
> Necesito que construyas nuestro nuevo sitio web corporativo. Debe tener una landing page que presente quiénes somos, qué hacemos, y por qué las empresas nos eligen para gestionar su talento. También necesito una página separada con un formulario para que profesionales interesados en oportunidades laborales puedan registrarse. Actualmente recibimos CVs por email sin ninguna estructura y es un caos. Quiero capturar: datos de contacto, experiencia profesional, sector de interés, nivel de inglés, y disponibilidad. El sitio debe ser responsive, accesible, y estar optimizado para SEO. Usa Tailwind para el diseño y asegúrate de que las validaciones del formulario funcionen correctamente.

---

## Alcance de idioma

- El soporte multiidioma es **opcional pero altamente recomendado** por la operación de Nexova entre España y Miami.
- Debes escoger un **idioma base** para toda la experiencia del sitio y del formulario.
- Si implementas un segundo idioma, trátalo como una mejora (sin reducir la calidad/completitud del idioma base).

## Contenido de la landing page

Tu landing page debe incluir las siguientes secciones, en este orden:

### Header

- Logo o nombre "Nexova"
- Navegación: Inicio | Servicios | Talento | Contacto

### Hero

- **Titular:** "Construimos equipos excepcionales para empresas en crecimiento"
- **Subtítulo:** "Consultora de recursos humanos y adquisición de talento con más de 10 años ayudando a empresas de tecnología, retail y servicios financieros a encontrar y desarrollar el mejor talento."
- **Call to action:** Botón "Únete a nuestro banco de talento" que enlace al formulario

### Servicios (3 columnas)

1. **Headhunting Ejecutivo**
   - Búsqueda y selección de perfiles ejecutivos y mandos medios
   - Proceso personalizado con garantía de reemplazo
2. **Outsourcing de Atención al Cliente**
   - Equipos especializados para empresas tecnológicas
   - Formación continua y supervisión dedicada

3. **Formación Corporativa**
   - Programas de soft skills y liderazgo
   - Cursos presenciales y en línea adaptados a cada organización

### Por qué Nexova (2 columnas)

- **12 años de experiencia** en el mercado latinoamericano
- **Presencia regional:** España y Estados Unidos
- **+500 procesos exitosos** de selección completados
- **Especialización sectorial** en tecnología, retail y finanzas

### Contacto

- Email: <contacto@nexova.com>
- Valencia: +34 960 123 456
- Miami: +1 305 555 0191

### Footer

- © 2025 Nexova. Todos los derechos reservados.
- LinkedIn | Instagram

---

## Campos del formulario de registro de talento

Tu formulario debe capturar la siguiente información:

| Campo                         | Tipo     | Validación                                                       | Obligatorio |
| ----------------------------- | -------- | ---------------------------------------------------------------- | ----------- |
| **Nombre completo**           | text     | Mínimo 2 palabras                                                | Sí          |
| **Email**                     | email    | Formato válido de email                                          | Sí          |
| **Teléfono**                  | tel      | Formato: +[código país] [número] (ej: +34 612 345 678)           | Sí          |
| **País de residencia**        | select   | España / Estados Unidos / Otro                                   | Sí          |
| **Años de experiencia**       | number   | Entre 0 y 50                                                     | Sí          |
| **Sector de interés**         | select   | Tecnología / Retail / Servicios Financieros / Consultoría / Otro | Sí          |
| **Nivel de inglés**           | select   | Básico / Intermedio / Avanzado / Nativo                          | Sí          |
| **Disponibilidad**            | radio    | Inmediata / 1 mes / 2-3 meses / Solo explorando                  | Sí          |
| **LinkedIn (URL del perfil)** | url      | Formato URL válido                                               | No          |
| **Comentarios adicionales**   | textarea | Máximo 500 caracteres                                            | No          |
| **Acepto política de datos**  | checkbox | Debe estar marcado para enviar                                   | Sí          |

---

## Validaciones específicas

1. **Email:** Debe validar que contenga @ y un dominio válido (ej: <usuario@dominio.com>)
2. **Teléfono:** Debe comenzar con + seguido del código de país
3. **Años de experiencia:** No puede ser negativo ni mayor a 50
4. **LinkedIn:** Si se proporciona, debe ser una URL válida (comenzar con http:// o https://)
5. **Comentarios:** Limitar a 500 caracteres con contador visible
6. **Política de datos:** El checkbox debe estar marcado; si no, mostrar error: "Debes aceptar la política de tratamiento de datos para continuar"

---

## Mensajes de error esperados

Cuando un campo no cumpla la validación, muestra estos mensajes específicos:

- **Nombre completo:** "El nombre debe contener al menos nombre y apellido"
- **Email:** "Ingresa un email válido (ejemplo: <nombre@empresa.com>)"
- **Teléfono:** "El teléfono debe incluir código de país (ejemplo: +34 612 345 678)"
- **País:** "Selecciona tu país de residencia"
- **Años de experiencia:** "Los años de experiencia deben estar entre 0 y 50"
- **Sector:** "Selecciona el sector de tu interés"
- **Nivel de inglés:** "Indica tu nivel de inglés"
- **Disponibilidad:** "Selecciona tu disponibilidad"
- **LinkedIn:** "Si incluyes LinkedIn, debe ser una URL válida"
- **Comentarios:** "Los comentarios no pueden exceder 500 caracteres (quedan X)"
- **Política de datos:** "Debes aceptar la política de tratamiento de datos para continuar"

---

## Mensaje de éxito

Cuando el formulario se valide correctamente (simular envío), mostrar:

> **¡Gracias por tu interés en Nexova!**
>
> Hemos recibido tu información. Nuestro equipo de selección la revisará y te contactaremos en caso de que tu perfil encaje con alguna de nuestras oportunidades actuales o futuras.
>
> Mientras tanto, síguenos en LinkedIn para estar al día de nuestras vacantes y contenido sobre desarrollo profesional.

---

## Restricción específica

El formulario está diseñado para **profesionales en búsqueda activa o pasiva de oportunidades laborales**, no para empresas que buscan contratar servicios de Nexova. Si un usuario pregunta sobre contratar servicios de headhunting o formación, el formulario debe incluir un mensaje visible que diga: "¿Eres una empresa buscando talento? Escríbenos a <contacto@nexova.com>"

---

## Schema.org markup requerido

Implementa el siguiente marcado Schema.org en tu landing page:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Nexova",
  "description": "Consultora de recursos humanos y adquisición de talento",
  "url": "https://nexova.com",
  "foundingDate": "2011",
  "address": [
    {
      "@type": "PostalAddress",
      "addressCountry": "ES",
      "addressLocality": "Valencia",
      "addressRegion": "Comunidad Valenciana"
    },
    {
      "@type": "PostalAddress",
      "addressCountry": "US",
      "addressLocality": "Miami",
      "addressRegion": "Florida"
    }
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+34-960-123-456",
    "contactType": "customer service",
    "availableLanguage": ["Spanish", "English"]
  },
  "sameAs": [
    "https://linkedin.com/company/nexova",
    "https://instagram.com/nexova"
  ]
}
```
