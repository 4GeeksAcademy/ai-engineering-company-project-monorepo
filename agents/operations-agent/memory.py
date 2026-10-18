"""
memory.py — Motor de Memoria en Capas (Tiered Memory) para Agentes de IA

Implementa los patrones estándar de arquitectura de memoria para agentes:
1. Memory Taxonomy (Taxonomía de Memoria):
   - Working Memory (Corto plazo): Diálogo activo de la sesión actual.
   - Episodic Memory (Largo plazo): Hechos, preferencias y decisiones persistentes.
   - Semantic Memory (Conocimiento): Reglas y políticas estáticas de la empresa.
2. Explicit Memory Interface (Interfaz Explícita):
   - Métodos delimitados de lectura (recall) y escritura (remember).
   - Política de desalojo/olvido explícito (forget/evict) para evitar crecimiento infinito.
   - Persistencia local en disco (JSON).
"""

from datetime import datetime, timezone
from enum import Enum
import json
import os
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MemoryCategory(str, Enum):
    USER_PREFERENCE = "user_preference"       # Ej: transportista preferido, almacén habitual
    OPERATIONAL_NOTE = "operational_note"     # Ej: producto con problemas de embalaje
    BUSINESS_RULE = "business_rule"           # Ej: política de envíos frágiles
    DECISION_RECORD = "decision_record"       # Ej: orden de reposición aprobada previamente


class MemoryEntry(BaseModel):
    """Estructura de un recuerdo persistente en la memoria episódica."""
    key: str = Field(..., description="Identificador único del hecho o preferencia")
    value: Any = Field(..., description="Dato o contenido almacenado")
    category: MemoryCategory = Field(..., description="Categoría temática del recuerdo")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    access_count: int = Field(default=0, description="Contador de accesos para medir relevancia")


class TieredMemoryEngine:
    """
    Motor de Memoria en Capas.
    Gestiona el ciclo de vida de la memoria del agente sin saturar la ventana de contexto.
    """

    def __init__(
        self,
        persistence_path: Optional[str] = None,
        max_working_memory_turns: int = 6,
        max_episodic_entries: int = 50,
    ):
        self.persistence_path = persistence_path
        self.max_working_memory_turns = max_working_memory_turns
        self.max_episodic_entries = max_episodic_entries

        # Capa 1: Memoria de Corto Plazo (Working Memory) - Volátil por sesión
        self.working_memory: List[Dict[str, str]] = []

        # Capa 2: Memoria de Largo Plazo (Episódica) - Persistente entre sesiones
        self.episodic_memory: Dict[str, MemoryEntry] = {}

        # Capa 3: Memoria Semántica (Políticas inmutables de la empresa)
        self.semantic_memory: Dict[str, str] = {
            "fragile_policy": "Los artículos frágiles exigen transporte especializado y embalaje reforzado.",
            "warehouse_hubs": "Zaragoza centraliza envíos a Europa; Los Ángeles cubre Norteamérica.",
            "sla_delivery": "El SLA estándar de entrega es de 48 horas en península y 72 horas internacional.",
        }

        # Cargar memoria persistente previa si existe archivo en disco
        if self.persistence_path and os.path.exists(self.persistence_path):
            self.load_from_disk()

    # ─────────────────────────────────────────────────────────────
    # CAPA 1: OPERACIONES DE MEMORIA DE CORTO PLAZO (WORKING MEMORY)
    # ─────────────────────────────────────────────────────────────

    def add_working_turn(self, role: str, content: str) -> None:
        """Añade un turno (user/assistant) a la memoria de trabajo activa."""
        self.working_memory.append({"role": role, "content": content})
        # Si supera el límite de turnos de la sesión, descarta los más antiguos (FIFO)
        if len(self.working_memory) > self.max_working_memory_turns:
            self.working_memory = self.working_memory[-self.max_working_memory_turns:]

    def get_working_context(self) -> List[Dict[str, str]]:
        """Devuelve los turnos de la conversación activa."""
        return list(self.working_memory)

    def clear_session(self) -> None:
        """
        Simula el fin de una sesión o el inicio de una nueva conversación.
        Limpia la memoria de corto plazo, pero CONSERVA la memoria de largo plazo.
        """
        self.working_memory.clear()

    # ─────────────────────────────────────────────────────────────
    # CAPA 2: OPERACIONES DE MEMORIA DE LARGO PLAZO (EPISODIC MEMORY)
    # ─────────────────────────────────────────────────────────────

    def remember(
        self,
        key: str,
        value: Any,
        category: MemoryCategory = MemoryCategory.USER_PREFERENCE,
    ) -> MemoryEntry:
        """
        Escritura explícita en memoria a largo plazo.
        Si la clave ya existe, la actualiza; si no, crea un nuevo registro.
        """
        clean_key = key.strip().lower()

        # Control de crecimiento descontrolado (eviction del recuerdo menos consultado)
        if clean_key not in self.episodic_memory and len(self.episodic_memory) >= self.max_episodic_entries:
            self._evict_least_relevant()

        now = datetime.now(timezone.utc).isoformat()
        if clean_key in self.episodic_memory:
            entry = self.episodic_memory[clean_key]
            entry.value = value
            entry.category = category
            entry.updated_at = now
        else:
            entry = MemoryEntry(
                key=clean_key,
                value=value,
                category=category,
                created_at=now,
                updated_at=now,
            )
            self.episodic_memory[clean_key] = entry

        if self.persistence_path:
            self.save_to_disk()

        return entry

    def recall(
        self,
        query: Optional[str] = None,
        category: Optional[MemoryCategory] = None,
    ) -> List[MemoryEntry]:
        """
        Lectura explícita y acotada de la memoria episódica.
        Solo devuelve recuerdos que coincidan con la categoría o palabras clave,
        evitando volcar toda la base de datos en el contexto del modelo.
        """
        results: List[MemoryEntry] = []

        for entry in self.episodic_memory.values():
            # Filtro por categoría
            if category and entry.category != category:
                continue

            # Filtro por coincidencia semántica/texto en clave o valor
            if query:
                q_lower = query.lower()
                matches_key = q_lower in entry.key
                matches_val = q_lower in str(entry.value).lower()
                if not (matches_key or matches_val):
                    continue

            # Incrementa contador de uso para medir relevancia
            entry.access_count += 1
            results.append(entry)

        return results

    def forget(self, key: str) -> bool:
        """
        Olvido / desalojo explícito de un dato (ej: cuando una preferencia caduca).
        """
        clean_key = key.strip().lower()
        if clean_key in self.episodic_memory:
            del self.episodic_memory[clean_key]
            if self.persistence_path:
                self.save_to_disk()
            return True
        return False

    def _evict_least_relevant(self) -> None:
        """Desaloja el recuerdo con menor número de accesos cuando se alcanza el límite."""
        if not self.episodic_memory:
            return
        least_accessed_key = min(
            self.episodic_memory.keys(),
            key=lambda k: self.episodic_memory[k].access_count,
        )
        del self.episodic_memory[least_accessed_key]

    # ─────────────────────────────────────────────────────────────
    # CAPA 3: MEMORIA SEMÁNTICA (POLÍTICAS EMPRESARIALES)
    # ─────────────────────────────────────────────────────────────

    def get_semantic_policy(self, topic: str) -> Optional[str]:
        """Consulta una regla o política inmutable de la empresa."""
        return self.semantic_memory.get(topic.strip().lower())

    # ─────────────────────────────────────────────────────────────
    # PERSISTENCIA EN DISCO (JSON)
    # ─────────────────────────────────────────────────────────────

    def save_to_disk(self) -> None:
        """Guarda la memoria episódica a un archivo JSON local."""
        if not self.persistence_path:
            return
        os.makedirs(os.path.dirname(os.path.abspath(self.persistence_path)), exist_ok=True)
        data = {k: v.model_dump() for k, v in self.episodic_memory.items()}
        with open(self.persistence_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def load_from_disk(self) -> None:
        """Carga la memoria episódica desde el archivo JSON local."""
        if not self.persistence_path or not os.path.exists(self.persistence_path):
            return
        with open(self.persistence_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            self.episodic_memory = {k: MemoryEntry(**v) for k, v in data.items()}
