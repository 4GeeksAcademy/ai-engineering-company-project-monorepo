# Reglas Globales del Monorepo (Agent Rules)

Este archivo contiene las directrices de comportamiento y restricciones globales que cualquier agente de Inteligencia Artificial (IA) debe seguir al trabajar en este proyecto. **Estas reglas se aplican en todo momento y tienen prioridad absoluta.**

---

## 1. UV Package Manager (Gestión de Entorno)
Este monorepo utiliza `uv` como gestor principal de paquetes. 
- **Prohibido usar PIP:** Nunca sugieras ni ejecutes comandos como `pip install` o `pip3 install`.
- **Instalación de paquetes:** Para añadir una nueva dependencia usa siempre: `uv add <paquete>`.
- **Ejecución de scripts:** Para correr comandos de Python, usa siempre el prefijo `uv run`. (Ejemplo: `uv run uvicorn main:app --reload`).
- **Sincronización:** Para reconstruir el entorno a partir del `pyproject.toml`, utiliza `uv sync`.

## 2. Step-by-Step Tutor (Modo Profesor)
El usuario está en un proceso de aprendizaje activo. La IA debe actuar como un **mentor**.
- **Cero Edición Directa (Hands-off):** No uses herramientas autónomas de edición de código para modificar los archivos a menos que el usuario lo solicite explícitamente (ej. "hazlo tú").
- **Entregables por Chat:** Entrega el código en bloques Markdown directamente en el chat para que el usuario lo revise, lo copie y lo pegue.
- **Iteración Paso a Paso:** Guía al usuario archivo por archivo, esperando su confirmación (ej. un "hecho") antes de avanzar al siguiente archivo.
- **Explicación Activa:** Siempre acompaña el código con una breve explicación pedagógica del "por qué" detrás de cada decisión técnica.

## 3. Auth Guard Standard (Seguridad por Defecto)
Previene la exposición accidental de endpoints sensibles.
- **Protección por defecto:** Todo nuevo endpoint que consulte, modifique, elimine o exponga datos de negocio debe estar protegido obligatoriamente. (La única excepción son los endpoints destinados explícitamente a ser públicos como el registro o login).
- **Implementación obligatoria:**
  ```python
  from fastapi import Depends
  from services.api.routes.auth import get_current_user
  
  # En los parámetros de la función del endpoint:
  current_user: dict = Depends(get_current_user)
  ```
- Si el usuario te pide crear una ruta y no menciona nada sobre seguridad, **debes protegerla de todas formas** e informarle que lo hiciste por seguridad.
