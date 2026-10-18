"""
agent.py — Agente de Operaciones con Arquitectura de Memoria en Capas (Tiered Memory)

Demuestra cómo un agente utiliza una Interfaz Explícita de Memoria:
1. Recupera solo recuerdos relevantes antes de responder (evitando saturar el prompt).
2. Extrae y persiste nuevos hechos/preferencias en la memoria episódica a largo plazo.
3. Mantiene un buffer de conversación a corto plazo (working memory) para la sesión activa.
4. Mantiene el contexto persistente entre sesiones independientes.
"""

import os
import re
from typing import Any, Dict, List, Optional
from memory import TieredMemoryEngine, MemoryCategory, MemoryEntry


class OperationsAgent:
    """
    Agente de Operaciones de TrackFlow con Memoria en Capas.
    """

    def __init__(
        self,
        name: str = "TrackFlow OpsBot",
        persistence_path: Optional[str] = None,
    ):
        self.name = name
        # Inicializa el motor de memoria con persistencia opcional en disco
        self.memory = TieredMemoryEngine(persistence_path=persistence_path)

    # ─────────────────────────────────────────────────────────────
    # CICLO DE PROCESAMIENTO CON MEMORIA EXPLÍCITA
    # ─────────────────────────────────────────────────────────────

    def process_message(self, user_message: str) -> str:
        """
        Procesa el mensaje del usuario siguiendo el ciclo de vida de memoria:
        1. Retrieval: Recupera solo los recuerdos relevantes de largo plazo.
        2. Ingest: Extrae y almacena nuevas preferencias si el usuario las declara.
        3. Response: Genera respuesta informada por la memoria.
        4. Update: Guarda el turno en la memoria de trabajo de la sesión.
        """
        clean_msg = user_message.strip()

        # PASO 1: RECUPERACIÓN EXPLÍCITA DE LARGO PLAZO (Explicit Recall)
        # Busca recuerdos relevantes según palabras clave del mensaje
        relevant_memories = self._retrieve_relevant_memories(clean_msg)

        # PASO 2: DETECCIÓN Y ESCRITURA EN MEMORIA EPISÓDICA (Explicit Remember)
        # Si el usuario declara una preferencia o regla operativa, la persistimos
        saved_note = self._extract_and_persist_facts(clean_msg)

        # PASO 3: POLÍTICAS SEMÁNTICAS (Reglas inmutables de la empresa)
        semantic_context = self._retrieve_semantic_policy(clean_msg)

        # PASO 4: GENERACIÓN DE RESPUESTA INFORMADA POR LA MEMORIA
        response = self._generate_response(
            user_message=clean_msg,
            relevant_memories=relevant_memories,
            semantic_context=semantic_context,
            saved_note=saved_note,
        )

        # PASO 5: ACTUALIZACIÓN DE MEMORIA DE CORTO PLAZO (Working Memory)
        self.memory.add_working_turn("user", clean_msg)
        self.memory.add_working_turn("assistant", response)

        return response

    def new_session(self) -> None:
        """
        Inicia una nueva sesión conversacional.
        Limpia la memoria de trabajo a corto plazo, pero CONSERVA todos los recuerdos
        de largo plazo en la memoria episódica.
        """
        self.memory.clear_session()

    # ─────────────────────────────────────────────────────────────
    # MÉTODOS INTERNOS DE GESTIÓN DE MEMORIA
    # ─────────────────────────────────────────────────────────────

    def _retrieve_relevant_memories(self, message: str) -> List[MemoryEntry]:
        """
        Busca selectivamente en la memoria episódica basándose en términos clave.
        No vuelca toda la memoria al modelo.
        """
        terms = ["carrier", "transportista", "almacén", "warehouse", "embalaje", "producto", "sku", "preferencia", "envío", "envio", "logística", "logistica"]
        found: Dict[str, MemoryEntry] = {}

        msg_lower = message.lower()
        for term in terms:
            if term in msg_lower:
                for entry in self.memory.recall(query=term):
                    found[entry.key] = entry

        # Si el usuario habla de envíos o transporte, recupera siempre sus preferencias de transporte/almacén
        if any(w in msg_lower for w in ["envío", "envio", "transportista", "carrier", "pedir", "orden"]):
            for pref_key in ["preferred_carrier", "default_warehouse"]:
                for entry in self.memory.recall(query=pref_key):
                    found[entry.key] = entry

        # Si el usuario pregunta de forma general por sus preferencias o memoria
        if "qué recuerdas" in msg_lower or "mis preferencias" in msg_lower or "qué sabes" in msg_lower:
            for entry in self.memory.recall(category=MemoryCategory.USER_PREFERENCE):
                found[entry.key] = entry

        return list(found.values())

    def _extract_and_persist_facts(self, message: str) -> Optional[str]:
        """
        Detecta patrones donde el usuario comunica hechos o preferencias duraderas.
        Aplica escritura explícita a la Capa 2 (Episódica).
        """
        msg_lower = message.lower()

        # Patrón 1: Preferencia de transportista (Carrier)
        # Ej: "mi transportista preferido es SEUR Frío"
        carrier_match = re.search(r"(?:mi transportista preferido es|prefiero|usa siempre el transportista|transportista habitual:?)\s+([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\+\-]+)", message, re.IGNORECASE)
        if carrier_match:
            carrier_name = carrier_match.group(1).strip(" .!,")
            self.memory.remember(
                key="preferred_carrier",
                value=carrier_name,
                category=MemoryCategory.USER_PREFERENCE,
            )
            return f"He guardado en mi memoria persistente que tu transportista preferido es '{carrier_name}'."

        # Patrón 2: Preferencia de almacén
        # Ej: "mi almacén por defecto es Zaragoza"
        wh_match = re.search(r"(?:mi almacén por defecto es|almacén habitual:?|trabajo principalmente con el almacén de)\s+([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\+\-]+)", message, re.IGNORECASE)
        if wh_match:
            wh_name = wh_match.group(1).strip(" .!,")
            self.memory.remember(
                key="default_warehouse",
                value=wh_name,
                category=MemoryCategory.USER_PREFERENCE,
            )
            return f"He registrado en tu perfil de operaciones que tu almacén predeterminado es '{wh_name}'."

        # Patrón 3: Nota operativa sobre producto
        # Ej: "nota para TF-ELEC-001: requiere doble embalaje"
        note_match = re.search(r"nota para ([a-zA-Z0-9\-]+):\s*(.+)", message, re.IGNORECASE)
        if note_match:
            sku = note_match.group(1).strip().upper()
            note_content = note_match.group(2).strip()
            self.memory.remember(
                key=f"note_{sku}",
                value=note_content,
                category=MemoryCategory.OPERATIONAL_NOTE,
            )
            return f"He registrado una nota operativa para el producto {sku}: '{note_content}'."

        return None

    def _retrieve_semantic_policy(self, message: str) -> Optional[str]:
        """Consulta la memoria semántica de reglas fijas si el mensaje lo amerita."""
        msg_lower = message.lower()
        if "frágil" in msg_lower or "fragile" in msg_lower:
            return self.memory.get_semantic_policy("fragile_policy")
        if "sla" in msg_lower or "plazo" in msg_lower:
            return self.memory.get_semantic_policy("sla_delivery")
        return None

    def _generate_response(
        self,
        user_message: str,
        relevant_memories: List[MemoryEntry],
        semantic_context: Optional[str],
        saved_note: Optional[str],
    ) -> str:
        """
        Sintetiza la respuesta del agente utilizando el contexto delimitado de memoria.
        """
        parts = []

        if saved_note:
            parts.append(saved_note)

        # Si el usuario pregunta qué recuerda el agente
        if "qué recuerdas" in user_message.lower() or "mis preferencias" in user_message.lower():
            if relevant_memories:
                memory_lines = [f"- {m.key}: {m.value} (registrado: {m.created_at[:10]})" for m in relevant_memories]
                parts.append("Esto es lo que tengo guardado en mi memoria de largo plazo:")
                parts.extend(memory_lines)
            else:
                parts.append("Actualmente no tengo preferencias guardadas en mi memoria de largo plazo.")
            return "\n".join(parts)

        # Si el usuario pide recomendación o plan de envío
        if "envío" in user_message.lower() or "transportista" in user_message.lower() or "recomienda" in user_message.lower():
            carrier_pref = next((m for m in relevant_memories if m.key == "preferred_carrier"), None)
            wh_pref = next((m for m in relevant_memories if m.key == "default_warehouse"), None)

            context_cues = []
            if carrier_pref:
                context_cues.append(f"considerando tu preferencia por '{carrier_pref.value}'")
            if wh_pref:
                context_cues.append(f"priorizando el almacén de '{wh_pref.value}'")

            cue_text = f" ({', '.join(context_cues)})" if context_cues else ""
            parts.append(f"Para gestionar este envío{cue_text}, procedo a verificar disponibilidad en TrackFlow.")

            if semantic_context:
                parts.append(f"ℹ️ Política oficial de empresa: {semantic_context}")

            return "\n".join(parts)

        # Respuesta general si no coincidió con los casos anteriores
        if not parts:
            parts.append(f"Entendido: '{user_message}'. Estoy listo para ayudarte con las operaciones de TrackFlow.")
            if relevant_memories:
                summary = ", ".join([f"{m.key}='{m.value}'" for m in relevant_memories])
                parts.append(f"[Memoria relevante activa: {summary}]")

        return "\n".join(parts)
