"""
services/agent/memory.py
Almacén de memoria persistente para el agente de Nexova Solutions.
- Separado del RAG (*_knowledge sigue siendo solo lectura).
- Organizado por línea de negocio (outsourcing, headhunting, training, general).
- Soporta Redis con fallback automático a JSON local para entornos sin Docker.
- Incluye filtro de privacidad de Nexova, flujo de propuesta única, auditoría y consolidación.
"""
from __future__ import annotations

import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel, Field

logger = logging.getLogger("nexova.agent_memory")

BusinessLine = Literal["outsourcing", "headhunting", "training", "general"]
MemoryCategory = Literal["escalation", "client_preference", "incident_pattern"]
ProposalDecision = Literal["approve", "reject", "edit", "ambiguous_or_unrelated", "expired"]

MAX_MEMORIES_PER_LINE = 25
DEFAULT_MEMORY_TTL_SECONDS = 30 * 24 * 3600  # 30 días
DEFAULT_PENDING_TTL_SECONDS = 3600  # 1 hora
DEFAULT_LOCAL_STORE_PATH = Path("data/agent_memory.json")

# Reglas no negociables del briefing de Nexova (docs/nexova-memory-BRIEFING.md)
_FORBIDDEN_PATTERNS: List[Tuple[re.Pattern[str], str]] = [
    (
        re.compile(r"\b(candidato|curr[ií]culum|\bcv\b|entrevista|calificaci[oó]n|postulante|ats)\b", re.IGNORECASE),
        "Prohibido memorizar datos personales o evaluaciones de candidatos (viven en el ATS).",
    ),
    (
        re.compile(r"\b(salario|sueldo|banda salarial|compensaci[oó]n|negociaci[oó]n salarial|oferta econ[oó]mica)\b", re.IGNORECASE),
        "Prohibido memorizar información salarial o negociaciones activas de headhunting.",
    ),
    (
        re.compile(r"\b(solo (para )?(este|ese) ticket|[úu]nicamente (para )?este ticket|caso aislado)\b", re.IGNORECASE),
        "Prohibido memorizar correcciones puntuales sin patrón repetible.",
    ),
]


class MemoryProposal(BaseModel):
    """Propuesta de memoria pendiente de confirmación explícita del usuario."""
    proposal_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    thread_id: str
    business_line: BusinessLine = "outsourcing"
    category: MemoryCategory = "incident_pattern"
    fact: str
    reason: str
    topic_key: Optional[str] = None
    source_message: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: Optional[str] = None


class MemoryEntry(BaseModel):
    """Hecho operativo consolidado en la memoria persistente."""
    memory_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_line: BusinessLine
    category: MemoryCategory
    fact: str
    topic_key: str
    approved_by_thread: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str = Field(
        default_factory=lambda: (
            datetime.now(timezone.utc) + timedelta(seconds=DEFAULT_MEMORY_TTL_SECONDS)
        ).isoformat()
    )


class MemoryAuditEntry(BaseModel):
    """Registro auditable de cada propuesta y decisión (aprobada o rechazada)."""
    audit_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    thread_id: str
    proposal_id: str
    proposed_fact: str
    final_fact: Optional[str] = None
    decision: ProposalDecision
    source_message: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def validate_memory_candidate(fact: str) -> Tuple[bool, Optional[str]]:
    """
    Evalúa un hecho candidato contra las restricciones del briefing de Nexova.
    Retorna (es_valido, motivo_rechazo).
    """
    cleaned = (fact or "").strip()
    if len(cleaned) < 12:
        return False, "El hecho propuesto es demasiado corto o ambiguo para memorizarse."

    for pattern, reason in _FORBIDDEN_PATTERNS:
        if pattern.search(cleaned):
            return False, reason

    return True, None


def _derive_topic_key(fact: str, explicit_key: Optional[str] = None) -> str:
    """Genera una clave normalizada para deduplicar hechos que actualizan la misma regla."""
    if explicit_key and explicit_key.strip():
        return explicit_key.strip().lower()
    words = re.findall(r"[a-záéíóúñ0-9]+", fact.lower())
    stopwords = {"el", "la", "los", "las", "de", "del", "en", "para", "con", "por", "que", "un", "una", "ahora"}
    significant = [w for w in words if w not in stopwords and len(w) > 2][:6]
    return "-".join(significant) or str(uuid.uuid4())[:8]


class AgentMemoryStore:
    """
    Interfaz explícita de lectura/escritura/consolidación de memoria del agente.
    Usa Redis si está disponible y hace fallback transparente a JSON local.
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        local_path: Path = DEFAULT_LOCAL_STORE_PATH,
        ttl_seconds: int = DEFAULT_MEMORY_TTL_SECONDS,
        pending_ttl_seconds: int = DEFAULT_PENDING_TTL_SECONDS,
        max_per_line: int = MAX_MEMORIES_PER_LINE,
    ) -> None:
        self.local_path = Path(local_path)
        self.ttl_seconds = ttl_seconds
        self.pending_ttl_seconds = pending_ttl_seconds
        self.max_per_line = max_per_line
        self._redis = self._connect_redis(redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0"))

    def _connect_redis(self, redis_url: str):
        try:
            import redis

            client = redis.Redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=1.0)
            client.ping()
            logger.info("Memoria del agente conectada a Redis.")
            return client
        except Exception as exc:
            logger.info(f"Redis no disponible ({exc}). Usando almacén local JSON en {self.local_path}.")
            return None

    # --- Persistencia base (Redis o JSON local) ---

    def _load_local(self) -> Dict[str, Any]:
        if not self.local_path.exists():
            return {"memories": {}, "pending": {}, "audit": []}
        try:
            return json.loads(self.local_path.read_text(encoding="utf-8"))
        except Exception:
            return {"memories": {}, "pending": {}, "audit": []}

    def _save_local(self, data: Dict[str, Any]) -> None:
        self.local_path.parent.mkdir(parents=True, exist_ok=True)
        self.local_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    # --- Lectura explícita ---

    def read_memory(self, business_line: Optional[BusinessLine] = None) -> List[MemoryEntry]:
        """Lee hechos consolidados vigentes, filtrados opcionalmente por línea de negocio."""
        now_iso = datetime.now(timezone.utc).isoformat()
        lines: List[BusinessLine] = (
            [business_line] if business_line else ["outsourcing", "headhunting", "training", "general"]
        )
        entries: List[MemoryEntry] = []

        if self._redis is not None:
            for line in lines:
                raw_items = self._redis.hvals(f"nexova:agent_memory:{line}")
                for raw in raw_items:
                    entry = MemoryEntry.model_validate_json(raw)
                    if entry.expires_at > now_iso:
                        entries.append(entry)
            return entries

        data = self._load_local()
        for line in lines:
            for item in data.get("memories", {}).get(line, []):
                entry = MemoryEntry.model_validate(item)
                if entry.expires_at > now_iso:
                    entries.append(entry)
        return entries

    # --- Propuesta pendiente (máximo 1 por thread_id, con TTL y auditoría de abandono) ---

    def _build_expired_audit(self, proposal: MemoryProposal) -> MemoryAuditEntry:
        return MemoryAuditEntry(
            thread_id=proposal.thread_id,
            proposal_id=proposal.proposal_id,
            proposed_fact=proposal.fact,
            final_fact=None,
            decision="expired",
            source_message="[expired_without_response]",
        )

    def expire_abandoned_proposals(self, thread_id: Optional[str] = None) -> List[MemoryAuditEntry]:
        """
        Expira propuestas pendientes cuyo TTL venció (silencio/abandono) tanto en JSON local
        como en Redis, registrando siempre el evento en AuditLog.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        expired_audits: List[MemoryAuditEntry] = []

        if self._redis is not None:
            threads = [thread_id] if thread_id else list(self._redis.smembers("nexova:pending_proposal_threads"))
            for tid in threads:
                raw_active = self._redis.get(f"nexova:pending_proposal:{tid}")
                raw_shadow = self._redis.get(f"nexova:pending_proposal_shadow:{tid}")
                if raw_active:
                    proposal = MemoryProposal.model_validate_json(raw_active)
                    if not (proposal.expires_at and proposal.expires_at <= now_iso):
                        continue
                elif raw_shadow:
                    proposal = MemoryProposal.model_validate_json(raw_shadow)
                else:
                    self._redis.srem("nexova:pending_proposal_threads", tid)
                    continue

                audit = self._build_expired_audit(proposal)
                self._append_audit(audit)
                self._clear_pending_proposal(tid)
                expired_audits.append(audit)
            return expired_audits

        data = self._load_local()
        pending = data.get("pending", {})
        target_threads = [thread_id] if thread_id else list(pending.keys())
        changed = False

        for tid in target_threads:
            raw = pending.get(tid)
            if not raw:
                continue
            proposal = MemoryProposal.model_validate(raw)
            if proposal.expires_at and proposal.expires_at <= now_iso:
                audit = self._build_expired_audit(proposal)
                data.setdefault("audit", []).append(audit.model_dump())
                pending.pop(tid, None)
                expired_audits.append(audit)
                changed = True

        if changed:
            self._save_local(data)
        return expired_audits

    def get_pending_proposal(self, thread_id: str) -> Optional[MemoryProposal]:
        self.expire_abandoned_proposals(thread_id)
        if self._redis is not None:
            raw = self._redis.get(f"nexova:pending_proposal:{thread_id}")
            return MemoryProposal.model_validate_json(raw) if raw else None

        data = self._load_local()
        raw = data.get("pending", {}).get(thread_id)
        return MemoryProposal.model_validate(raw) if raw else None

    def save_pending_proposal(self, proposal: MemoryProposal) -> Tuple[bool, Optional[str]]:
        """Guarda una propuesta pendiente solo si pasa el filtro Nexova y no hay otra abierta."""
        if self.get_pending_proposal(proposal.thread_id) is not None:
            return False, "Ya existe una propuesta de memoria pendiente para esta conversación."

        allowed, reject_reason = validate_memory_candidate(proposal.fact)
        if not allowed:
            return False, reject_reason

        if not proposal.expires_at:
            expires_at = (datetime.now(timezone.utc) + timedelta(seconds=self.pending_ttl_seconds)).isoformat()
            proposal = proposal.model_copy(update={"expires_at": expires_at})

        if self._redis is not None:
            payload = proposal.model_dump_json()
            self._redis.setex(f"nexova:pending_proposal:{proposal.thread_id}", self.pending_ttl_seconds, payload)
            self._redis.setex(f"nexova:pending_proposal_shadow:{proposal.thread_id}", self.ttl_seconds, payload)
            self._redis.sadd("nexova:pending_proposal_threads", proposal.thread_id)
            return True, None

        data = self._load_local()
        data.setdefault("pending", {})[proposal.thread_id] = proposal.model_dump()
        self._save_local(data)
        return True, None

    def _clear_pending_proposal(self, thread_id: str) -> None:
        if self._redis is not None:
            self._redis.delete(f"nexova:pending_proposal:{thread_id}")
            self._redis.delete(f"nexova:pending_proposal_shadow:{thread_id}")
            self._redis.srem("nexova:pending_proposal_threads", thread_id)
            return

        data = self._load_local()
        data.get("pending", {}).pop(thread_id, None)
        self._save_local(data)

    # --- Resolución y Auditoría ---

    def resolve_proposal(
        self,
        thread_id: str,
        decision: ProposalDecision,
        source_message: str,
        edited_fact: Optional[str] = None,
    ) -> Optional[MemoryAuditEntry]:
        """
        Resuelve la propuesta pendiente del hilo:
        - approve / edit: valida y consolida en el almacén persistente.
        - reject / ambiguous_or_unrelated: descarta por defecto sin escribir memoria.
        Siempre deja registro en AuditLog.
        """
        pending = self.get_pending_proposal(thread_id)
        if pending is None:
            return None

        final_fact: Optional[str] = None
        recorded_decision: ProposalDecision = decision

        if decision in ("approve", "edit"):
            candidate_fact = edited_fact.strip() if (decision == "edit" and edited_fact) else pending.fact
            allowed, _ = validate_memory_candidate(candidate_fact)
            if allowed:
                final_fact = candidate_fact
                self._consolidate_entry(
                    MemoryEntry(
                        business_line=pending.business_line,
                        category=pending.category,
                        fact=candidate_fact,
                        topic_key=_derive_topic_key(candidate_fact, pending.topic_key),
                        approved_by_thread=thread_id,
                    )
                )
            else:
                recorded_decision = "reject"

        audit = MemoryAuditEntry(
            thread_id=thread_id,
            proposal_id=pending.proposal_id,
            proposed_fact=pending.fact,
            final_fact=final_fact,
            decision=recorded_decision,
            source_message=source_message,
        )
        self._append_audit(audit)
        self._clear_pending_proposal(thread_id)
        return audit

    def _consolidate_entry(self, new_entry: MemoryEntry) -> None:
        """
        Consolidación y limpieza:
        1. Deduplica/reemplaza entradas con el mismo topic_key o alta similitud léxica.
        2. Purga entradas expiradas.
        3. Mantiene el tope máximo (max_per_line) eliminando las más antiguas.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        existing = [
            e for e in self.read_memory(new_entry.business_line)
            if e.expires_at > now_iso and not self._is_duplicate_or_update(e, new_entry)
        ]
        existing.append(new_entry)
        existing.sort(key=lambda e: e.created_at)
        trimmed = existing[-self.max_per_line :]

        if self._redis is not None:
            key = f"nexova:agent_memory:{new_entry.business_line}"
            self._redis.delete(key)
            for entry in trimmed:
                self._redis.hset(key, entry.memory_id, entry.model_dump_json())
            self._redis.expire(key, self.ttl_seconds)
            return

        data = self._load_local()
        data.setdefault("memories", {})[new_entry.business_line] = [e.model_dump() for e in trimmed]
        self._save_local(data)

    @staticmethod
    def _is_duplicate_or_update(existing: MemoryEntry, incoming: MemoryEntry) -> bool:
        if existing.topic_key == incoming.topic_key:
            return True
        words_a = set(re.findall(r"[a-záéíóúñ0-9]+", existing.fact.lower()))
        words_b = set(re.findall(r"[a-záéíóúñ0-9]+", incoming.fact.lower()))
        if not words_a or not words_b:
            return False
        jaccard = len(words_a & words_b) / len(words_a | words_b)
        return jaccard >= 0.65

    def _append_audit(self, entry: MemoryAuditEntry) -> None:
        if self._redis is not None:
            self._redis.rpush("nexova:memory_audit_log", entry.model_dump_json())
            return

        data = self._load_local()
        data.setdefault("audit", []).append(entry.model_dump())
        self._save_local(data)

    def get_audit_log(self, thread_id: Optional[str] = None) -> List[MemoryAuditEntry]:
        self.expire_abandoned_proposals(thread_id)
        if self._redis is not None:
            entries = [
                MemoryAuditEntry.model_validate_json(raw)
                for raw in self._redis.lrange("nexova:memory_audit_log", 0, -1)
            ]
        else:
            data = self._load_local()
            entries = [MemoryAuditEntry.model_validate(item) for item in data.get("audit", [])]

        if thread_id:
            return [e for e in entries if e.thread_id == thread_id]
        return entries


memory_store = AgentMemoryStore()