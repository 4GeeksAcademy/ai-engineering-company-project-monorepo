# Technical Context

## Arquitectura
El proyecto adopta una arquitectura de monorepo para organizar aplicaciones, librerías compartidas y automatizaciones bajo un único repositorio versionado.

## Stack principal
- React
- Next.js
- TypeScript
- Tailwind CSS

## Organización del código
- Las aplicaciones de interfaz viven en `/uis`.
- La lógica y contratos compartidos viven en `packages/shared/`.

## Principio técnico
Se prioriza reutilización de componentes y lógica de dominio compartida para mantener consistencia entre productos, reducir deuda técnica y facilitar escalabilidad del ecosistema TrackFlow.
