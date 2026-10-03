"""Pydantic contracts for the managed incidents (the live incident manager).

Not to be confused with ``schemas.py``, which is the CSV *analysis* contract.
The rules (categories, statuses, origins, patterns, limits) come from the
shared contract in ``packages/shared/incidents/contract.json`` via
``incidents_analyzer``, the same package the CLI script uses, so the form, the
API and the CSV analysis agree on what a valid incident is.

An incident is created ``open``. Its status only changes through
``StatusChange`` (see ``incident_lifecycle.py``); the content fields are
editable only while ``open`` or ``in_progress``.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    model_validator,
)

from incidents_analyzer.contract import (
    AGENT_ID_PATTERN,
    CLIENT_COMPANY_MAX,
    DESCRIPTION_MAX,
    DESCRIPTION_MIN,
    DISCARD_REASON_MAX,
    DISCARD_REASON_MIN,
    ID_PATTERN,
    ORIGINS,
    SCORE_MAX,
    SCORE_MIN,
    STATUSES,
    TITLE_MAX,
    TITLE_MIN,
    BRANCHES,
    CATEGORIES,
)

IncidentCategory = StrEnum("IncidentCategory", {name: name for name in CATEGORIES})
IncidentBranch = StrEnum("IncidentBranch", {name: name for name in BRANCHES})
IncidentStatus = StrEnum("IncidentStatus", {name: name for name in STATUSES})
IncidentOrigin = StrEnum("IncidentOrigin", {name: name for name in ORIGINS})

_Text = StringConstraints(strip_whitespace=True)
IncidentId = Annotated[str, _Text, StringConstraints(pattern=ID_PATTERN.pattern)]
Title = Annotated[str, _Text, StringConstraints(min_length=TITLE_MIN, max_length=TITLE_MAX)]
Description = Annotated[str, _Text, StringConstraints(min_length=DESCRIPTION_MIN, max_length=DESCRIPTION_MAX)]
ClientCompany = Annotated[str, _Text, StringConstraints(min_length=1, max_length=CLIENT_COMPANY_MAX)]
AgentId = Annotated[str, _Text, StringConstraints(pattern=AGENT_ID_PATTERN.pattern)]
DiscardReason = Annotated[
    str, _Text, StringConstraints(min_length=DISCARD_REASON_MIN, max_length=DISCARD_REASON_MAX)
]
Score = Annotated[int, Field(ge=SCORE_MIN, le=SCORE_MAX)]

# Fields an incident cannot do without; the others can be cleared with ``null``.
REQUIRED_FIELDS = ("title", "description", "category", "origin", "branch")


def mask_email(email: str) -> str:
    """``elena.smith@icloud.com`` -> ``e***@icloud.com``. Lists never expose the full address."""
    local, _, domain = email.partition("@")
    return f"{local[:1]}***@{domain}"


class _Content(BaseModel):
    """What the reporter provides."""

    model_config = ConfigDict(extra="forbid")

    title: Title
    description: Description
    category: IncidentCategory
    origin: IncidentOrigin
    branch: IncidentBranch
    client_company: ClientCompany | None = None
    agent_id: AgentId | None = None
    customer_email: EmailStr | None = None


class IncidentCreate(_Content):
    """Body of ``POST /api/incidents``. Status is always ``open``, so it is not accepted."""


class IncidentUpdate(BaseModel):
    """Body of ``PATCH /api/incidents/{id}``: only the fields to change.
    The merged result is validated again by ``IncidentRecord``."""

    model_config = ConfigDict(extra="forbid")

    title: Title | None = None
    description: Description | None = None
    category: IncidentCategory | None = None
    origin: IncidentOrigin | None = None
    branch: IncidentBranch | None = None
    client_company: ClientCompany | None = None
    agent_id: AgentId | None = None
    customer_email: EmailStr | None = None

    @model_validator(mode="after")
    def not_empty_and_required_fields_kept(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        nulls = [name for name in REQUIRED_FIELDS if name in self.model_fields_set and getattr(self, name) is None]
        if nulls:
            raise ValueError(f"These fields cannot be empty: {', '.join(nulls)}")
        return self


class StatusChange(BaseModel):
    """Body of ``PATCH /api/incidents/{id}/status``. Which extra fields it takes
    depends on the target status; ``incident_lifecycle`` enforces that."""

    model_config = ConfigDict(extra="forbid")

    status: IncidentStatus
    satisfaction_score: Score | None = None
    discard_reason: DiscardReason | None = None


class HistoryEntry(BaseModel):
    at: datetime
    kind: Literal["created", "imported", "status_changed", "edited"]
    actor: str
    from_status: IncidentStatus | None = None
    to_status: IncidentStatus | None = None
    # For ``edited``: the names of the fields that changed (never their values).
    fields: list[str] = Field(default_factory=list)
    note: str | None = None


class IncidentRecord(_Content):
    """What is stored: the content plus status, lifecycle data and audit trail.

    The invariants hold for every stored incident, whether it was created
    through the API or imported from the CSV.
    """

    id: IncidentId
    status: IncidentStatus
    satisfaction_score: Score | None = None
    discard_reason: DiscardReason | None = None
    created_at: datetime
    updated_at: datetime
    history: list[HistoryEntry] = Field(default_factory=list)

    @model_validator(mode="after")
    def status_matches_lifecycle_data(self) -> Self:
        if self.status != IncidentStatus.resolved and self.satisfaction_score is not None:
            raise ValueError("Only a resolved incident can have a satisfaction_score")
        if self.status != IncidentStatus.discarded and self.discard_reason is not None:
            raise ValueError("Only a discarded incident can have a discard_reason")
        if self.updated_at < self.created_at:
            raise ValueError("updated_at cannot be before created_at")
        return self


class _IncidentView(BaseModel):
    id: str
    title: str
    description: str
    category: IncidentCategory
    status: IncidentStatus
    origin: IncidentOrigin
    branch: str
    client_company: str | None
    agent_id: str | None
    satisfaction_score: int | None
    discard_reason: str | None
    created_at: datetime
    updated_at: datetime
    allowed_transitions: list[IncidentStatus]
    editable: bool


class IncidentListItem(_IncidentView):
    """A row of the list: the customer's address is masked."""

    customer_email_masked: str | None


class IncidentOut(_IncidentView):
    """The full incident, with the audit trail."""

    customer_email: str | None
    history: list[HistoryEntry]


class ErrorDetail(BaseModel):
    detail: str


class FieldProblem(BaseModel):
    field: str | None  # the problematic field (None when it is the body as a whole)
    loc: list[str | int]
    msg: str
    type: str


class InvalidRequestResponse(BaseModel):
    """Body of the ``400`` the incident API answers when a request is invalid."""

    message: str
    detail: list[FieldProblem]


class IncidentPage(BaseModel):
    items: list[IncidentListItem]
    total: int
    page: int
    page_size: int
    pages: int


class CountItem(BaseModel):
    name: str
    count: int


class IncidentSummary(BaseModel):
    """Dashboard numbers for the incidents matching the current filters. With none, every
    count is 0 (and the satisfaction average is ``null``: there is no score to average)."""

    total: int
    status_counts: dict[str, int]
    status_percentages: dict[str, float]
    category_counts: dict[str, int]
    category_percentages: dict[str, float]
    origin_counts: dict[str, int]
    # Per branch ("sede"): the four offices, always all present (0 when none).
    branch_counts: dict[str, int]
    branch_percentages: dict[str, float]
    # open + in_progress, per category: the backlog.
    active_by_category: dict[str, int]
    satisfaction_average: float | None
    satisfaction_scored: int
    satisfaction_distribution: dict[str, int]
    top_branches: list[CountItem]
    top_clients: list[CountItem]


class IncidentFacets(BaseModel):
    """Distinct values present in the data, to fill the filter dropdowns."""

    branches: list[str]
    clients: list[str]
    agents: list[str]
