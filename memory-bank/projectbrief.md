# Project Brief: Nexova — Consultoría de Recursos Humanos & Talento IA

## 🏢 Visión General de la Empresa

Nexova es una firma de consultoría de recursos humanos y adquisición de talento con sede principal en Valencia, España, y operaciones de expansión en Miami, Florida. 

Nexova opera tres líneas de negocio principales:
1. **Headhunting Ejecutivo:** Selección de perfiles clave y directivos para empresas tecnológicas y corporativas.
2. **Outsourcing de Equipos:** Provisión de equipos completos de soporte y desarrollo para startups y scale-ups.
3. **Formación Corporativa:** Programas de capacitación interna y upskilling técnico.

## 🎯 El Problema de Negocio

Actualmente, 40 consultores de selección en Nexova procesan todo el flujo operativo de forma manual:
- Lectura individual de cientos de Currículums Vitae (CVs).
- Puntuación manual de candidatos contra requisitos de vacantes.
- Matching manual entre perfiles y vacantes abiertas de clientes.
- Seguimiento disperso del estado de candidatos en las distintas etapas del proceso.

Esta operativa manual genera cuellos de botella en la escalabilidad del negocio y tiempos elevados de respuesta a clientes.

## 💡 La Solución & Objetivos del Proyecto

El objetivo de la plataforma **Nexova AI** es transformar la operativa interna mediante un monorepo unificado que albergue:
1. **Infraestructura de Inteligencia Artificial (Memory Bank & Agents Governance):** Garantizar que todos los asistentes de código y agentes operen con contexto persistente de negocio y reglas técnicas estrictas.
2. **Sitio Web Público (`./uis/website`):** Presencia digital corporativa optimizada para clientes y candidatos (Next.js + TypeScript).
3. **Backoffice de Selección (`./uis/backoffice`):** Panel administrativo interno para los 40 consultores de selección, con visualización de candidatos, filtrado, scoring automatizado y reportes.
4. **Motor de Lógica de Negocio (TypeScript):** Procesamiento puro e inmutable para filtrado, ordenamiento, scoring de candidatos y métricas de selección.

## 👥 Stakeholders Clave

- **Javier Almeida:** Gerente de Operaciones (Responsable del proyecto y cliente interno principal).
- **Equipo de Consultores de Selección (40 personas):** Usuarios finales del portal de Backoffice.
- **Equipo de Ingeniería de IA:** Desarrolladores a cargo de la arquitectura, agentes y frontend.
