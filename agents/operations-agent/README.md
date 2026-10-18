# Agente de Operaciones: Memoria en Capas (Parte 1 de 2)

Este módulo implementa el **Agente de Operaciones de TrackFlow** equipado con una **Arquitectura de Memoria en Capas (*Tiered Memory*)** y una **Interfaz Explícita de Memoria (*Explicit Memory Interface*)**, resolviendo el problema de la amnesia en agentes de IA sin saturar la ventana de contexto.

---

## 🎯 Objetivo (Parte 1)

1. **Separación de capas temporales de memoria:**
   - **Memoria de Corto Plazo (Working Memory / Sesión):** Almacena el turno de conversación activo del usuario.
   - **Memoria de Largo Plazo (Episódica / Persistente):** Retiene preferencias del operador (transportista favorito, almacén preferido, alertas de inventario) entre sesiones independientes.
   - **Memoria de Conocimiento / Semántica:** Reglas estáticas de negocio y políticas de almacén.

2. **Evitar anti-patrones:**
   - ❌ **NO volcar todo el historial:** No pegamos conversaciones pasadas enteras en el prompt.
   - ✅ **Recuperación explícita acotada:** El agente busca solo los recuerdos relevantes para la consulta actual.

---

## 🏗️ Estructura del Módulo

```text
agents/operations-agent/
├── memory.py            # Motor de memoria en capas (Short-term + Long-term episódica)
├── agent.py             # Agente de operaciones con interfaz explícita de memoria
├── test_memory.py       # Pruebas multi-sesión validando persistencia y descarte
├── requirements.txt     # Dependencias del agente
└── README.md            # Documentación técnica
```

---

## 🚀 Instalación y Pruebas

```bash
pip install -r requirements.txt
python3 test_memory.py
```
