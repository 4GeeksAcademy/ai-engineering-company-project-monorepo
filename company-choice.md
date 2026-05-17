# Empresa Elegida y Justificación

He elegido Nexova Solutions. Tomo esta decisión porque sus problemas operativos representan casos de uso donde la Inteligencia Artificial no es solo un adorno analítico, sino el núcleo absoluto del producto y la ventaja competitiva de la consultora. Me interesa profundamente el enfoque B2B y cómo la IA puede resolver cuellos de botella reales y costosos, como el cribado manual de currículums o los incumplimientos de SLA en atención al cliente. A nivel técnico, la necesidad de construir sistemas de recomendación y arquitecturas RAG para hacer matching de talento me parece el reto más sólido para prepararme como AI Engineer.

### Departamentos de Mayor Interés
---
- **Operaciones de Selección**: Al ser el negocio principal, me fascina el reto técnico de procesar lenguaje natural (NLP). Pasar de que un consultor lea manualmente entre 30 y 80 CVs a tener un sistema de scoring automático y un RAG que cruce habilidades (ej. "ventas B2B y nivel C1 de inglés") es un impacto directo en la facturación.

- **Atención al Cliente** (servicio externalizado): Me interesa porque tienen un problema grave de tiempos de resolución (48h frente al SLA de 24h). Implementar un chatbot de primera línea que consulte una base de conocimiento semántica para resolver incidencias recurrentes es un problema clásico de automatización que quiero dominar.

### Reto de Automatización a Construir
---
El reto que más ganas tengo de desarrollar es el Pipeline de selección asistido por IA, específicamente el módulo de scoring y ranking automático de CVs conectado al sistema RAG sobre la base de datos de candidatos.

## Mi idea de Agente de IA
*(Agente de Pre-Cribado y Cualificación de Talento)*

- **Qué haría**: Este agente actuaría como el primer filtro inteligente de Nexova. Leerá automáticamente todos los currículums (PDFs) que lleguen para una vacante, los analizará semánticamente y los comparará contra el "briefing" o descripción del puesto que ha pedido el cliente.

- **Qué información necesitaría**: Necesitaría consumir los CVs de los candidatos, la descripción detallada de la oferta laboral (requisitos técnicos, idiomas, años de experiencia) y las reglas de evaluación configuradas por el consultor humano.

- **Qué produciría o desencadenaría**: El agente no tomará la decisión final, pero producirá un "shortlist" (una lista corta) con los 5 candidatos más afines, asignándoles una puntuación de compatibilidad (scoring) y un resumen de tres líneas explicando por qué encajan. Finalmente, desencadenará un correo electrónico automatizado a los candidatos descartados dándoles feedback general, y otro a los aprobados para invitarles a agendar una entrevista con el consultor humano.