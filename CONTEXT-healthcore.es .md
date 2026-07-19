# CONTEXT — HealthCore

**Hito 2: Fundamentos de Programación**  
**Empresa:** HealthCore — Red de Atención Ambulatoria  
**Tu rol:** Junior AI Engineer, equipo HealthCore Digital  
**Responsable del proyecto:** James Osei, CTO

---

## Sobre HealthCore

HealthCore es una empresa de servicios de salud ambulatorios que opera 12 clínicas en Estados Unidos (Texas, Florida, Georgia) y Reino Unido (Londres, Mánchester). Formas parte de HealthCore Digital, la unidad interna de tecnología creada para modernizar los flujos clínicos y operativos. La empresa procesa alrededor de 600 visitas de pacientes por semana, gestiona facturación de seguros en sistemas de EE. UU. y Reino Unido, y emplea a más de 200 personas entre personal clínico y administrativo.

---

## Tu asignación

James Osei, el CTO, necesita que construyas la lógica principal de procesamiento de datos para tres de los problemas operativos más urgentes de HealthCore: seguimiento de denegaciones de facturación, estimación de costos por no-shows y monitoreo de cumplimiento de CME (continuing medical education).

Ahora mismo, el equipo de facturación de Tom Callahan calcula manualmente las tasas de denegación a partir de exportaciones CSV. El equipo clínico de Marcus Reid no tiene forma de estimar cuánto ingreso se pierde cada semana por no-shows. Y el equipo de personas de Diane Foster lleva las horas de CME en una hoja de cálculo sin alertas cuando los clínicos se atrasan, lo que genera un riesgo regulatorio real.

Este hito se enfoca en construir funciones TypeScript que impulsarán un dashboard interno de operaciones. Esto es programación pura: sin IA y sin prompting. James necesita comprobar que puedes escribir código sólido, bien tipado y que maneje correctamente lógica de negocio real.

> "El objetivo de este hito no es la complejidad, es la confiabilidad. Estos números llegan a Tom, Marcus y Diane cada lunes por la mañana. Si están mal, me entero yo. Escribe código en el que podamos confiar."  
> — James Osei, CTO

---

## Qué vas a construir

Implementarás un conjunto de utilidades TypeScript para:

1. **Modelar datos de claims, citas y clínicos** usando interfaces
2. **Filtrar y buscar registros operativos** por sede, estado y fecha
3. **Calcular tasas de denegación de facturación** por payer y sede
4. **Estimar el impacto en ingresos por no-show** por clínica y semana
5. **Monitorear cumplimiento CME** e identificar clínicos en riesgo
6. **Validar datos** antes de procesarlos

---

## Entidades de negocio

### Claim

Un claim representa una solicitud de facturación enviada a un payer de seguros después de una visita del paciente.

**Interface: `Claim`**

```typescript
interface Claim {
  claimId: string; // Format: "CLM-XXXXXX" (e.g., "CLM-000042")
  patientId: string; // Format: "HC-XXXXXX" (e.g., "HC-A3F291")
  locationId: string; // Clinic ID (e.g., "us-tx-001")
  serviceType: ServiceType; // Type of care delivered
  payerName: string; // Insurance provider name (e.g., "BlueCross")
  payerId: string; // Alphanumeric payer code
  submissionDate: string; // ISO 8601 date string
  claimAmount: number; // Amount billed in USD (must be > 0)
  status: ClaimStatus; // Current claim status
  denialReason?: DenialReason; // Only present when status === "denied"
  resubmitted: boolean; // Whether the claim was resubmitted after denial
}

type ClaimStatus = "submitted" | "approved" | "denied" | "pending" | "appealed";

type DenialReason =
  | "missing_authorisation"
  | "coding_error"
  | "duplicate_claim"
  | "patient_not_covered"
  | "service_not_covered"
  | "incomplete_documentation";

type ServiceType =
  | "primary_care"
  | "chronic_disease"
  | "preventive"
  | "specialist"
  | "womens_health"
  | "paediatric"
  | "mental_health";
```

**Reglas de validación:**

- `claimAmount` debe ser > 0
- `submissionDate` no debe ser una fecha futura
- `locationId` debe coincidir con uno de los IDs de clínicas conocidas
- Si `status === "denied"`, `denialReason` debe estar presente
- `patientId` debe cumplir el formato `HC-` seguido de 6 caracteres alfanuméricos

---

### Appointment

Una cita representa una visita de paciente programada en una clínica de HealthCore.

**Interface: `Appointment`**

```typescript
interface Appointment {
  appointmentId: string; // Format: "APT-XXXXXX"
  patientId: string; // Format: "HC-XXXXXX"
  locationId: string; // Clinic ID
  serviceType: ServiceType; // Type of care scheduled
  scheduledDate: string; // ISO 8601 date string
  scheduledTime: string; // "HH:MM" in 24-hour format
  status: AppointmentStatus; // Current appointment status
  noShowReason?: string; // Free text, only present when status === "no_show"
  confirmedAt?: string; // ISO 8601 datetime, absent if not yet confirmed
}

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";
```

**Reglas de validación:**

- `scheduledTime` debe ser una hora válida de 24 horas en formato "HH:MM"
- `locationId` debe coincidir con uno de los IDs de clínicas conocidas
- Si `status === "no_show"`, `noShowReason` debería estar presente (avisar si falta, no rechazar)

---

### Clinician

Un clínico es un miembro del personal clínico con licencia que debe mantener horas de educación médica continua.

**Interface: `Clinician`**

```typescript
interface Clinician {
  clinicianId: string; // Format: "CLN-XXXXXX"
  firstName: string;
  lastName: string;
  role: ClinicianRole; // Determines CME requirements
  locationId: string; // Assigned clinic
  licenceState: string; // US state code (e.g., "TX") or "UK"
  licenceExpiryDate: string; // ISO 8601 date string
  cmeHoursRequired: number; // Annual CME hours required for this role
  cmeHoursLogged: number; // Hours logged so far in the current cycle
  cmeYearStartDate: string; // ISO 8601 date — start of current CME cycle
}

type ClinicianRole =
  | "physician"
  | "nurse_practitioner"
  | "nurse"
  | "medical_assistant";
```

**Reglas de validación:**

- `cmeHoursRequired` debe ser >= 0
- `cmeHoursLogged` debe ser >= 0
- `licenceExpiryDate` debe ser una fecha válida presente o futura (fechas pasadas se marcan como vencidas)
- `role` debe ser uno de los cuatro valores definidos

---

### Location

Una ubicación representa una clínica de HealthCore, incluyendo las tarifas promedio usadas para los cálculos de costo por no-show.

**Interface: `Location`**

```typescript
interface Location {
  locationId: string;
  name: string;
  city: string;
  stateOrCountry: string;
  country: "US" | "UK";
  phone: string;
  averageConsultationFee: Record<ServiceType, number>; // Average fee in USD per service type
}
```

---

## Funciones requeridas

Implementa estas funciones en los archivos correspondientes según la estructura del README.

### 1. Operaciones de colecciones (`src/utils/collections.ts`)

**`filterClaims(claims: Claim[], filters: Partial<Pick<Claim, "locationId" | "status" | "payerName" | "serviceType">>): Claim[]`**

- Devuelve claims que cumplan TODOS los criterios de filtro proporcionados
- Ignora claves de filtro que no se hayan proporcionado

**`filterAppointmentsByStatus(appointments: Appointment[], status: AppointmentStatus[]): Appointment[]`**

- Devuelve citas cuyo estado coincida con cualquiera de los estados proporcionados

**`sortClaimsById(claims: Claim[], direction: "asc" | "desc"): Claim[]`**

- Devuelve claims ordenados alfanuméricamente por `claimId`
- No debe mutar el arreglo original

**`sortAppointmentsByDate(appointments: Appointment[], direction: "asc" | "desc"): Appointment[]`**

- Devuelve citas ordenadas por `scheduledDate`
- No debe mutar el arreglo original

**`groupClaimsBy(claims: Claim[], key: "locationId" | "payerName" | "status" | "serviceType"): Record<string, Claim[]>`**

- Agrupa claims por la clave especificada
- Devuelve un objeto donde cada clave mapea a un arreglo de claims correspondientes

---

### 2. Operaciones de búsqueda (`src/utils/search.ts`)

**`findClaimById(claims: Claim[], claimId: string): Claim | null`**

- Realiza búsqueda lineal para encontrar un claim por ID
- Devuelve el claim si existe, `null` en caso contrario

**`findClinicianById(clinicians: Clinician[], clinicianId: string): Clinician | null`**

- Realiza búsqueda lineal para encontrar un clínico por ID
- Devuelve el clínico si existe, `null` en caso contrario

**`binarySearchClaimById(sortedClaims: Claim[], targetId: string): number`**

- Asume que el arreglo ya está ordenado por `claimId` ascendente (usa `sortClaimsById` primero)
- Realiza búsqueda binaria para encontrar el índice del claim con el ID objetivo
- Devuelve el índice si existe, `-1` en caso contrario

---

### 3. Calculadora de tasa de denegación de facturación (`src/utils/transformations.ts`)

**`calculateDenialRate(claims: Claim[]): number`**

- Devuelve la tasa de denegación como porcentaje (0–100), redondeada a 2 decimales
- Solo cuenta como denegados los claims con estado `"denied"`
- Lanza error si el arreglo de claims está vacío

**`denialRateByPayer(claims: Claim[]): Record<string, number>`**

- Agrupa claims por `payerName` y calcula la tasa de denegación para cada payer
- Devuelve un objeto donde las claves son nombres de payer y los valores son porcentajes de denegación (redondeados a 2 decimales)
- Solo incluye payers que aparezcan en el arreglo de claims

**`denialRateByLocation(claims: Claim[]): Record<string, number>`**

- Agrupa claims por `locationId` y calcula la tasa de denegación para cada ubicación
- Devuelve un objeto donde las claves son IDs de ubicación y los valores son porcentajes de denegación (redondeados a 2 decimales)

**`flagHighDenialPayers(claims: Claim[], threshold: number): string[]`**

- Devuelve los nombres de los payers cuya tasa de denegación supera el umbral dado
- Usa 8 como umbral por defecto (el benchmark de la industria para HealthCore es 5–8%)
- Devuelve un arreglo vacío si ningún payer supera el umbral

---

### 4. Estimador de costo por no-show (`src/utils/transformations.ts`)

**`calculateNoShowCost(appointments: Appointment[], location: Location, weekEndingDate: string): number`**

- Calcula el ingreso total estimado perdido por no-shows en una ubicación dada durante los 7 días calendario que terminan en `weekEndingDate` (inclusive)
- Usa `location.averageConsultationFee[serviceType]` para estimar el costo de cada cita perdida
- Devuelve 0 si no hay no-shows en ese período
- Devuelve un número en USD redondeado a 2 decimales

**`noShowRateByLocation(appointments: Appointment[]): Record<string, number>`**

- Calcula la tasa de no-show por ubicación como porcentaje
- Devuelve un objeto donde las claves son IDs de ubicación y los valores son porcentajes (redondeados a 2 decimales)

**`flagHighNoShowLocations(appointments: Appointment[], threshold: number): string[]`**

- Devuelve los IDs de ubicaciones cuya tasa de no-show supera el umbral dado
- Usa 20 como umbral por defecto (nivel interno de alerta de HealthCore)

---

### 5. Seguimiento de cumplimiento CME (`src/utils/transformations.ts`)

**`generateCMEReport(clinicians: Clinician[], asOfDate: string): CMEReport[]`**

Genera una entrada de reporte por cada clínico. Tipo de retorno:

```typescript
interface CMEReport {
  clinicianId: string;
  fullName: string; // "${firstName} ${lastName}"
  role: ClinicianRole;
  locationId: string;
  hoursRequired: number;
  hoursLogged: number;
  hoursRemaining: number; // Math.max(0, required - logged)
  percentComplete: number; // (logged / required) * 100, rounded to 1 decimal
  daysRemainingInCycle: number; // Calendar days from asOfDate to end of CME cycle
  complianceStatus: CMEStatus;
  licenceExpiryDate: string;
  licenceDaysRemaining: number; // Calendar days from asOfDate to licence expiry
}

type CMEStatus = "on_track" | "at_risk" | "overdue" | "complete";
```

**Lógica del estado de cumplimiento:**

- `"complete"` — `hoursLogged >= hoursRequired`
- `"overdue"` — el ciclo CME terminó Y `hoursLogged < hoursRequired`
- `"at_risk"` — el ciclo está activo Y el `percentComplete` del clínico está más de 15 puntos porcentuales por detrás del porcentaje de año transcurrido
- `"on_track"` — el ciclo está activo y el clínico no está en riesgo

**`getCliniciansAtRisk(clinicians: Clinician[], asOfDate: string): Clinician[]`**

- Devuelve todos los clínicos cuyo `complianceStatus` sea `"at_risk"` o `"overdue"`

**`getCliniciansWithExpiringLicences(clinicians: Clinician[], asOfDate: string, daysThreshold: number): Clinician[]`**

- Devuelve clínicos cuya licencia vence dentro de `daysThreshold` días calendario desde `asOfDate`
- Usa 90 como umbral recomendado para primeras alertas, 30 para alertas urgentes

---

### 6. Validaciones (`src/utils/validations.ts`)

**`validateClaim(claim: Claim, knownLocationIds: string[]): { valid: boolean, errors: string[] }`**

- Valida todas las reglas de negocio de un claim
- Devuelve `{ valid: true, errors: [] }` si todas las reglas pasan
- Devuelve `{ valid: false, errors: ["..."] }` con un mensaje por cada regla fallida

**`validateClinician(clinician: Clinician): { valid: boolean, errors: string[] }`**

- Valida todas las reglas de negocio de un registro de clínico
- Devuelve `{ valid: true, errors: [] }` si todas las reglas pasan

**`isDenialRateAboveThreshold(rate: number, threshold?: number): boolean`**

- Devuelve `true` si `rate` supera `threshold` (por defecto: 8)

**`isNoShowRateAboveThreshold(rate: number, threshold?: number): boolean`**

- Devuelve `true` si `rate` supera `threshold` (por defecto: 20)

---

## Datos de ejemplo

Usa estos datos para probar tus funciones. Los nombres de campo y valores deben coincidir exactamente con las interfaces.

### Ubicaciones de ejemplo

```typescript
const sampleLocations: Location[] = [
  {
    locationId: "us-tx-001",
    name: "HealthCore Austin Central",
    city: "Austin",
    stateOrCountry: "TX",
    country: "US",
    phone: "(512) 340-8800",
    averageConsultationFee: {
      primary_care: 180,
      chronic_disease: 220,
      preventive: 150,
      specialist: 320,
      womens_health: 240,
      paediatric: 175,
      mental_health: 200,
    },
  },
  {
    locationId: "us-fl-001",
    name: "HealthCore Miami",
    city: "Miami",
    stateOrCountry: "FL",
    country: "US",
    phone: "(305) 510-7700",
    averageConsultationFee: {
      primary_care: 195,
      chronic_disease: 235,
      preventive: 160,
      specialist: 340,
      womens_health: 255,
      paediatric: 185,
      mental_health: 215,
    },
  },
  {
    locationId: "us-ga-001",
    name: "HealthCore Atlanta",
    city: "Atlanta",
    stateOrCountry: "GA",
    country: "US",
    phone: "(404) 330-9900",
    averageConsultationFee: {
      primary_care: 170,
      chronic_disease: 210,
      preventive: 145,
      specialist: 310,
      womens_health: 230,
      paediatric: 165,
      mental_health: 190,
    },
  },
];
```

### Claims de ejemplo

```typescript
const sampleClaims: Claim[] = [
  {
    claimId: "CLM-000001",
    patientId: "HC-A3F291",
    locationId: "us-tx-001",
    serviceType: "primary_care",
    payerName: "BlueCross",
    payerId: "BC001",
    submissionDate: "2025-03-10",
    claimAmount: 180,
    status: "approved",
    resubmitted: false,
  },
  {
    claimId: "CLM-000002",
    patientId: "HC-B7K442",
    locationId: "us-fl-001",
    serviceType: "specialist",
    payerName: "Aetna",
    payerId: "AET002",
    submissionDate: "2025-03-11",
    claimAmount: 340,
    status: "denied",
    denialReason: "missing_authorisation",
    resubmitted: false,
  },
  {
    claimId: "CLM-000003",
    patientId: "HC-C2M881",
    locationId: "us-ga-001",
    serviceType: "chronic_disease",
    payerName: "Medicare",
    payerId: "MED003",
    submissionDate: "2025-03-12",
    claimAmount: 210,
    status: "approved",
    resubmitted: false,
  },
  {
    claimId: "CLM-000004",
    patientId: "HC-D9P553",
    locationId: "us-tx-001",
    serviceType: "preventive",
    payerName: "BlueCross",
    payerId: "BC001",
    submissionDate: "2025-03-13",
    claimAmount: 150,
    status: "denied",
    denialReason: "coding_error",
    resubmitted: true,
  },
  {
    claimId: "CLM-000005",
    patientId: "HC-E4Q117",
    locationId: "us-fl-001",
    serviceType: "mental_health",
    payerName: "Cigna",
    payerId: "CIG004",
    submissionDate: "2025-03-14",
    claimAmount: 215,
    status: "pending",
    resubmitted: false,
  },
];
```

### Citas de ejemplo

```typescript
const sampleAppointments: Appointment[] = [
  {
    appointmentId: "APT-000001",
    patientId: "HC-A3F291",
    locationId: "us-tx-001",
    serviceType: "primary_care",
    scheduledDate: "2025-03-10",
    scheduledTime: "09:00",
    status: "completed",
    confirmedAt: "2025-03-09T14:00:00Z",
  },
  {
    appointmentId: "APT-000002",
    patientId: "HC-F6R228",
    locationId: "us-fl-001",
    serviceType: "specialist",
    scheduledDate: "2025-03-11",
    scheduledTime: "11:30",
    status: "no_show",
    noShowReason: "Patient did not call to cancel",
  },
  {
    appointmentId: "APT-000003",
    patientId: "HC-G1S774",
    locationId: "us-tx-001",
    serviceType: "chronic_disease",
    scheduledDate: "2025-03-12",
    scheduledTime: "14:00",
    status: "no_show",
    noShowReason: "Unreachable before appointment",
  },
  {
    appointmentId: "APT-000004",
    patientId: "HC-H8T390",
    locationId: "us-ga-001",
    serviceType: "preventive",
    scheduledDate: "2025-03-13",
    scheduledTime: "10:00",
    status: "completed",
    confirmedAt: "2025-03-12T09:30:00Z",
  },
  {
    appointmentId: "APT-000005",
    patientId: "HC-I5U661",
    locationId: "us-fl-001",
    serviceType: "mental_health",
    scheduledDate: "2025-03-14",
    scheduledTime: "16:00",
    status: "no_show",
    noShowReason: "Transportation issue reported",
  },
];
```

### Clínicos de ejemplo

```typescript
const sampleClinicians: Clinician[] = [
  {
    clinicianId: "CLN-000001",
    firstName: "Marcus",
    lastName: "Reid",
    role: "physician",
    locationId: "us-tx-001",
    licenceState: "TX",
    licenceExpiryDate: "2026-06-30",
    cmeHoursRequired: 40,
    cmeHoursLogged: 28,
    cmeYearStartDate: "2025-01-01",
  },
  {
    clinicianId: "CLN-000002",
    firstName: "Sandra",
    lastName: "Flores",
    role: "nurse_practitioner",
    locationId: "us-fl-001",
    licenceState: "FL",
    licenceExpiryDate: "2025-05-15",
    cmeHoursRequired: 30,
    cmeHoursLogged: 6,
    cmeYearStartDate: "2025-01-01",
  },
  {
    clinicianId: "CLN-000003",
    firstName: "David",
    lastName: "Okafor",
    role: "physician",
    locationId: "us-ga-001",
    licenceState: "GA",
    licenceExpiryDate: "2027-01-01",
    cmeHoursRequired: 40,
    cmeHoursLogged: 40,
    cmeYearStartDate: "2025-01-01",
  },
];
```

---

## Referencia de reglas de negocio

Estos umbrales vienen directamente de Tom Callahan (Revenue Cycle) y Diane Foster (People). Codifícalos exactamente: se mostrarán en el reporte operativo del lunes por la mañana.

| Regla                                                      | Valor                                                 | Fuente          |
| ---------------------------------------------------------- | ----------------------------------------------------- | --------------- |
| Tasa de denegación de facturación — benchmark de industria | 8%                                                    | Tom Callahan    |
| Tasa de no-show — umbral interno de alerta                 | 20%                                                   | Dr. Marcus Reid |
| Horas CME requeridas — Physician                           | 40 horas/año                                          | Diane Foster    |
| Horas CME requeridas — Nurse Practitioner                  | 30 horas/año                                          | Diane Foster    |
| CME "at risk" — umbral de rezago                           | 15 puntos porcentuales por detrás del ritmo del ciclo | Diane Foster    |
| Alerta de licencia — primera advertencia                   | 90 días antes del vencimiento                         | Diane Foster    |
| Alerta de licencia — advertencia urgente                   | 30 días antes del vencimiento                         | Diane Foster    |

---

## Criterios de aceptación

Tu implementación será evaluada en:

1. **Type safety:** Todas las interfaces definidas con nombres y tipos correctos, sin `any`
2. **Corrección de funciones:** Cada función produce la salida esperada para las entradas dadas
3. **Manejo de edge cases:** Las funciones manejan arreglos vacíos, división por cero y campos opcionales faltantes de forma robusta
4. **Lógica de validación:** Las reglas de negocio de la tabla anterior se aplican correctamente
5. **Organización del código:** Las funciones están en los archivos correctos según su responsabilidad
6. **Sin mutaciones:** Las funciones de ordenamiento y filtrado no modifican los arreglos originales
7. **Funciones puras:** Las funciones trabajan solo con los parámetros que reciben, sin estado global

---

## ¿Preguntas?

Si tienes dudas sobre cualquier requisito, pregunta a tu mentor. En un entorno real de trabajo, escribirías a James en Slack o dejarías un comentario en el ticket de Jira.

---

_Este es un proyecto real de HealthCore Digital. Lo que construyas aquí se refactorizará en el dashboard operativo._
