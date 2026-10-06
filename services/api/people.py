"""In-memory people facts for the staff console.

Records carry an opaque employee or vacancy id. They do not store a name.
"""

from __future__ import annotations

import secrets
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from users import get_current_user

router = APIRouter(
    prefix="/people",
    tags=["people"],
    dependencies=[Depends(get_current_user)],
)

Country = Literal["Colombia", "United States"]
Basis = Literal["kitchen", "floor", "management", "support"]
SeparationKind = Literal["resignation", "dismissal", "end_of_contract", "other"]
AbsenceKind = Literal["holiday", "sick", "unpaid", "other"]
_DATE = r"^\d{4}-\d{2}-\d{2}$"


class Employee(BaseModel):
    employee_id: str
    country: Country
    effective_date: str
    employment_basis: Basis
    separated: bool = False


class Vacancy(BaseModel):
    vacancy_id: str
    country: Country
    opened_on: str
    employment_basis: Basis
    filled_on: str | None = None
    days_to_fill: int | None = None


class HireCreate(BaseModel):
    country: Country
    effective_date: str = Field(pattern=_DATE)
    employment_basis: Basis


class SeparationCreate(BaseModel):
    employee_id: str
    effective_date: str = Field(pattern=_DATE)
    separation_kind: SeparationKind


class AbsenceCreate(BaseModel):
    employee_id: str
    absence_date: str = Field(pattern=_DATE)
    day_fraction: float = Field(gt=0, le=1)
    absence_kind: AbsenceKind


class RosterCreate(BaseModel):
    employee_id: str
    roster_date: str = Field(pattern=_DATE)


class VacancyCreate(BaseModel):
    country: Country
    opened_on: str = Field(pattern=_DATE)
    employment_basis: Basis


class VacancyFill(BaseModel):
    filled_on: str = Field(pattern=_DATE)


class CaptureResult(BaseModel):
    capture: dict


_EMPLOYEES: list[Employee] = []
_VACANCIES: list[Vacancy] = []


def _token(prefix: str, length: int) -> str:
    alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
    return prefix + "".join(secrets.choice(alphabet) for _ in range(length))


def _employee(employee_id: str) -> Employee:
    for row in _EMPLOYEES:
        if row.employee_id == employee_id:
            return row
    raise HTTPException(status_code=404, detail="That employee was not found.")


def _vacancy(vacancy_id: str) -> Vacancy:
    for row in _VACANCIES:
        if row.vacancy_id == vacancy_id:
            return row
    raise HTTPException(status_code=404, detail="That vacancy was not found.")


@router.get("/employees", response_model=list[Employee])
def list_employees() -> list[Employee]:
    return list(_EMPLOYEES)


@router.get("/vacancies", response_model=list[Vacancy])
def list_vacancies() -> list[Vacancy]:
    return list(_VACANCIES)


@router.post("/hires", response_model=CaptureResult, status_code=201)
def hire(payload: HireCreate) -> CaptureResult:
    row = Employee(
        employee_id=_token("emp_", 8),
        country=payload.country,
        effective_date=payload.effective_date,
        employment_basis=payload.employment_basis,
    )
    _EMPLOYEES.append(row)
    return CaptureResult(
        capture={
            "location_scope": "none",
            "country": row.country,
            "employee_id": row.employee_id,
            "effective_date": row.effective_date,
            "employment_basis": row.employment_basis,
        }
    )


@router.post("/separations", response_model=CaptureResult, status_code=201)
def separate(payload: SeparationCreate) -> CaptureResult:
    row = _employee(payload.employee_id)
    if row.separated:
        raise HTTPException(status_code=409, detail="That employee is already separated.")
    row.separated = True
    return CaptureResult(
        capture={
            "location_scope": "none",
            "country": row.country,
            "employee_id": row.employee_id,
            "effective_date": payload.effective_date,
            "separation_kind": payload.separation_kind,
        }
    )


@router.post("/absences", response_model=CaptureResult, status_code=201)
def record_absence(payload: AbsenceCreate) -> CaptureResult:
    row = _employee(payload.employee_id)
    return CaptureResult(
        capture={
            "location_scope": "none",
            "country": row.country,
            "employee_id": row.employee_id,
            "absence_date": payload.absence_date,
            "day_fraction": payload.day_fraction,
            "absence_kind": payload.absence_kind,
        }
    )


@router.post("/roster-days", response_model=CaptureResult, status_code=201)
def schedule_roster_day(payload: RosterCreate) -> CaptureResult:
    row = _employee(payload.employee_id)
    return CaptureResult(
        capture={
            "location_scope": "none",
            "country": row.country,
            "employee_id": row.employee_id,
            "roster_date": payload.roster_date,
            "scheduled": True,
        }
    )


@router.post("/vacancies", response_model=CaptureResult, status_code=201)
def open_vacancy(payload: VacancyCreate) -> CaptureResult:
    row = Vacancy(
        vacancy_id=_token("vac_", 6),
        country=payload.country,
        opened_on=payload.opened_on,
        employment_basis=payload.employment_basis,
    )
    _VACANCIES.append(row)
    return CaptureResult(
        capture={
            "location_scope": "none",
            "country": row.country,
            "vacancy_id": row.vacancy_id,
            "opened_on": row.opened_on,
            "employment_basis": row.employment_basis,
        }
    )


@router.post("/vacancies/{vacancy_id}/fill", response_model=CaptureResult)
def fill_vacancy(vacancy_id: str, payload: VacancyFill) -> CaptureResult:
    row = _vacancy(vacancy_id)
    if row.filled_on is not None:
        raise HTTPException(status_code=409, detail="That vacancy is already filled.")
    opened = date.fromisoformat(row.opened_on)
    filled = date.fromisoformat(payload.filled_on)
    if filled < opened:
        raise HTTPException(status_code=400, detail="The fill date is before the vacancy opened.")
    row.filled_on = payload.filled_on
    row.days_to_fill = (filled - opened).days
    return CaptureResult(
        capture={
            "location_scope": "none",
            "country": row.country,
            "vacancy_id": row.vacancy_id,
            "opened_on": row.opened_on,
            "filled_on": row.filled_on,
            "days_to_fill": row.days_to_fill,
        }
    )
