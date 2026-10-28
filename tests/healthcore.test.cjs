const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CLINICS,
  SERVICE_TYPES,
  averageBy,
  binarySearch,
  countBy,
  createEnquiryReport,
  filterItems,
  groupBy,
  linearSearch,
  maximumBy,
  minimumBy,
  sortItems,
  sumBy,
  validatePatientEnquiry
} = require("../dist/test/index.js");

const TODAY = new Date(2026, 9, 26, 12);
const validEnquiry = {
  first_name: "Ana",
  last_name: "García",
  date_of_birth: "1990-05-10",
  email: "ana@example.com",
  phone: "+1 305 555 0191",
  preferred_language: "Spanish",
  preferred_clinic: "HealthCore Miami",
  preferred_date: "2026-10-27",
  preferred_time: "morning",
  service_type: "Primary Care",
  new_patient: "yes",
  has_insurance: "no",
  health_concern: "I would like to discuss a routine health check.",
  contact_consent: true
};

test("collection utilities handle empty input and do not mutate sources", () => {
  assert.deepEqual(filterItems([], () => true), []);
  assert.deepEqual(sortItems([], (left, right) => left - right), []);
  assert.equal(groupBy([], (item) => item).size, 0);

  const source = [3, 1, 2];
  assert.deepEqual(sortItems(source, (left, right) => left - right), [1, 2, 3]);
  assert.deepEqual(source, [3, 1, 2]);
});

test("collection utilities filter and group using selected properties", () => {
  const clinics = CLINICS.filter((clinic) => clinic.state === "TX");
  assert.equal(filterItems(CLINICS, (clinic) => clinic.state === "TX").length, 3);
  assert.equal(clinics.length, 3);
  assert.equal(groupBy(CLINICS, (clinic) => clinic.state).get("FL").length, 2);
});

test("linear and binary search return indexes or -1 for no match", () => {
  assert.equal(linearSearch([], () => true), -1);
  assert.equal(linearSearch(["a", "b"], (item) => item === "b"), 1);
  assert.equal(linearSearch(["a", "b"], (item) => item === "x"), -1);
  assert.equal(binarySearch([], 4, (item, target) => item - target), -1);
  assert.equal(binarySearch([1, 3, 5, 7], 5, (item, target) => item - target), 2);
  assert.equal(binarySearch([1, 3, 5, 7], 4, (item, target) => item - target), -1);
});

test("aggregations count, sum, average and select extremes", () => {
  const records = [{ n: 5 }, { n: 2 }, { n: 9 }];
  assert.equal(countBy([], (item) => item).size, 0);
  assert.deepEqual([...countBy(["TX", "FL", "TX"], (state) => state)], [["TX", 2], ["FL", 1]]);
  assert.equal(sumBy(records, (record) => record.n), 16);
  assert.equal(averageBy(records, (record) => record.n), 16 / 3);
  assert.equal(averageBy([], (item) => item), undefined);
  assert.equal(minimumBy(records, (record) => record.n).n, 2);
  assert.equal(maximumBy(records, (record) => record.n).n, 9);
  assert.equal(minimumBy([], (item) => item), undefined);
  assert.equal(maximumBy([], (item) => item), undefined);
});

test("enquiry report counts records by clinic and service", () => {
  const report = createEnquiryReport([
    validEnquiry,
    { ...validEnquiry, preferred_clinic: "HealthCore Austin Central", service_type: "Mental Health" }
  ]);
  assert.equal(report.totalEnquiries, 2);
  assert.equal(report.byClinic.get("HealthCore Miami"), 1);
  assert.equal(report.byClinic.get("HealthCore Austin Central"), 1);
  assert.equal(report.byService.get("Primary Care"), 1);
  assert.equal(report.byService.get("Mental Health"), 1);
});

test("valid enquiry passes with no errors or warnings", () => {
  const result = validatePatientEnquiry(validEnquiry, "en", TODAY);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.warnings, []);
});

test("validator reports missing and malformed input instead of throwing", () => {
  for (const input of [undefined, null, [], "not an enquiry", {}]) {
    const result = validatePatientEnquiry(input, "en", TODAY);
    assert.equal(result.isValid, false);
    for (const field of [
      "first_name",
      "last_name",
      "date_of_birth",
      "email",
      "phone",
      "preferred_language",
      "preferred_clinic",
      "preferred_date",
      "preferred_time",
      "service_type",
      "new_patient",
      "has_insurance",
      "health_concern",
      "contact_consent"
    ]) {
      assert.ok(result.errors[field], `expected missing ${field} to be invalid`);
    }
  }
});

test("validator rejects invalid configuration instead of returning misleading results", () => {
  assert.throws(
    () => validatePatientEnquiry(validEnquiry, "fr", TODAY),
    { name: "RangeError", message: "Validation language must be 'en' or 'es'" }
  );
  assert.throws(
    () => validatePatientEnquiry(validEnquiry, "en", new Date(Number.NaN)),
    { name: "RangeError", message: "Validation reference date must be valid" }
  );
});

test("validation enforces the listed clinic directory and service options", () => {
  const result = validatePatientEnquiry(
    { ...validEnquiry, preferred_clinic: "Unknown Clinic", service_type: "Unknown Service" },
    "en",
    TODAY
  );
  assert.equal(result.errors.preferred_clinic, "Select the clinic you would like to visit");
  assert.equal(result.errors.service_type, "Select the type of care you are looking for");
  assert.equal(SERVICE_TYPES.length, 7);
});

test("date validation rejects weekends as the first business-day lead and dates beyond 60 days", () => {
  const friday = new Date(2026, 9, 30, 12);
  assert.ok(validatePatientEnquiry(
    { ...validEnquiry, preferred_date: "2026-10-31" },
    "en",
    friday
  ).errors.preferred_date);
  assert.ok(validatePatientEnquiry(
    { ...validEnquiry, preferred_date: "2026-12-30" },
    "en",
    TODAY
  ).errors.preferred_date);
  assert.equal(validatePatientEnquiry(
    { ...validEnquiry, preferred_date: "2026-11-02" },
    "en",
    friday
  ).errors.preferred_date, undefined);
});

test("date validation uses the user's local calendar day", () => {
  const lateLocalEvening = new Date(2026, 9, 26, 23, 30);
  const result = validatePatientEnquiry(
    { ...validEnquiry, preferred_date: "2026-10-27" },
    "en",
    lateLocalEvening
  );
  assert.equal(result.errors.preferred_date, undefined);
});

test("validation checks age and restricts paediatric care to patients under 18", () => {
  const adultPediatric = validatePatientEnquiry(
    { ...validEnquiry, service_type: "Paediatric Care" },
    "en",
    TODAY
  );
  assert.equal(
    adultPediatric.errors.service_type,
    "Paediatric Care is available for patients under 18. Please check the date of birth or select a different service."
  );

  const child = validatePatientEnquiry(
    { ...validEnquiry, date_of_birth: "2010-10-27", service_type: "Paediatric Care" },
    "en",
    TODAY
  );
  assert.equal(child.errors.date_of_birth, undefined);
  assert.equal(child.errors.service_type, undefined);

  const invalidDate = validatePatientEnquiry(
    { ...validEnquiry, date_of_birth: "2026-02-30" },
    "en",
    TODAY
  );
  assert.ok(invalidDate.errors.date_of_birth);
});

test("conditional insurance and returning-patient fields follow business rules", () => {
  const insured = validatePatientEnquiry(
    { ...validEnquiry, has_insurance: "yes", new_patient: "no", patient_id: "bad" },
    "en",
    TODAY
  );
  assert.ok(insured.errors.insurance_provider);
  assert.ok(insured.errors.insurance_member_id);
  assert.ok(insured.errors.patient_id);

  const validReturning = validatePatientEnquiry(
    {
      ...validEnquiry,
      has_insurance: "yes",
      insurance_provider: "Health Plan",
      insurance_member_id: "AB123456",
      new_patient: "no",
      patient_id: "HC-A3F291"
    },
    "en",
    TODAY
  );
  assert.equal(validReturning.isValid, true);
});

test("returning patients may omit their ID but cannot supply a malformed value", () => {
  for (const patientId of [12345, null, false, {}, [], "HC-12345", "HC-1234567", "bad"]) {
    for (const language of ["en", "es"]) {
      const result = validatePatientEnquiry(
        { ...validEnquiry, new_patient: "no", patient_id: patientId },
        language,
        TODAY
      );
      assert.equal(result.isValid, false);
      assert.ok(result.errors.patient_id);
    }
  }

  for (const patientId of [undefined, "", "   ", "HC-A3F291"]) {
    assert.equal(validatePatientEnquiry(
      { ...validEnquiry, new_patient: "no", patient_id: patientId },
      "en",
      TODAY
    ).isValid, true);
  }

  assert.equal(validatePatientEnquiry(
    { ...validEnquiry, patient_id: 12345 },
    "en",
    TODAY
  ).isValid, true, "hidden returning-patient fields must not affect new patients");
});

test("appointment window includes day 60 but excludes today and day 61", () => {
  for (const [preferredDate, valid] of [
    ["2026-10-26", false],
    ["2026-10-27", true],
    ["2026-12-25", true],
    ["2026-12-26", false],
    ["2026-11-31", false]
  ]) {
    const result = validatePatientEnquiry(
      { ...validEnquiry, preferred_date: preferredDate },
      "en",
      TODAY
    );
    assert.equal(result.errors.preferred_date === undefined, valid, preferredDate);
  }
});

test("birth dates enforce newborn, future, age 120 and age 121 boundaries", () => {
  for (const [birthDate, valid] of [
    ["2026-10-26", true],
    ["2026-10-27", false],
    ["1906-10-26", true],
    ["1905-10-27", true],
    ["1905-10-26", false],
    ["2000-02-29", true],
    ["2001-02-29", false]
  ]) {
    const result = validatePatientEnquiry(
      { ...validEnquiry, date_of_birth: birthDate },
      "en",
      TODAY
    );
    assert.equal(result.errors.date_of_birth === undefined, valid, birthDate);
  }
});

test("paediatric eligibility ends on the eighteenth birthday", () => {
  for (const [birthDate, valid] of [
    ["2008-10-27", true],
    ["2008-10-26", false],
    ["2008-10-25", false]
  ]) {
    const result = validatePatientEnquiry(
      { ...validEnquiry, date_of_birth: birthDate, service_type: "Paediatric Care" },
      "en",
      TODAY
    );
    assert.equal(result.errors.service_type === undefined, valid, birthDate);
  }
});

test("insured patients must satisfy provider and member ID length boundaries", () => {
  for (const [length, valid] of [[0, false], [1, true], [100, true], [101, false]]) {
    const result = validatePatientEnquiry(
      {
        ...validEnquiry,
        has_insurance: "yes",
        insurance_provider: "a".repeat(length),
        insurance_member_id: "ABC123"
      },
      "en",
      TODAY
    );
    assert.equal(result.errors.insurance_provider === undefined, valid, `provider length ${length}`);
  }

  for (const [memberId, valid] of [
    ["A".repeat(5), false],
    ["A".repeat(6), true],
    ["A".repeat(20), true],
    ["A".repeat(21), false],
    ["ABC-123", false],
    [123456, false]
  ]) {
    const result = validatePatientEnquiry(
      {
        ...validEnquiry,
        has_insurance: "yes",
        insurance_provider: "Example plan",
        insurance_member_id: memberId
      },
      "en",
      TODAY
    );
    assert.equal(result.errors.insurance_member_id === undefined, valid);
  }
});

test("health concerns enforce exact 20 and 500 character boundaries", () => {
  for (const [length, valid] of [[19, false], [20, true], [500, true], [501, false]]) {
    const result = validatePatientEnquiry(
      { ...validEnquiry, health_concern: "a".repeat(length) },
      "en",
      TODAY
    );
    assert.equal(result.errors.health_concern === undefined, valid, `concern length ${length}`);
  }
});

test("empty reports and aggregations have documented output shapes", () => {
  assert.equal(sumBy([], (item) => item), 0);
  assert.deepEqual(createEnquiryReport([]), {
    totalEnquiries: 0,
    byClinic: new Map(),
    byService: new Map(),
    enquiriesByClinic: new Map()
  });
});

test("binary search handles endpoints, duplicates and object comparators", () => {
  const compare = (left, right) => left - right;
  assert.equal(binarySearch([2], 2, compare), 0);
  assert.equal(binarySearch([2], 1, compare), -1);
  assert.equal(binarySearch([1, 3, 5], 1, compare), 0);
  assert.equal(binarySearch([1, 3, 5], 5, compare), 2);
  const duplicateIndex = binarySearch([1, 3, 3, 5], 3, compare);
  assert.ok(duplicateIndex === 1 || duplicateIndex === 2);
  const records = [{ id: 1 }, { id: 3 }, { id: 5 }];
  assert.equal(binarySearch(records, { id: 3 }, (left, right) => left.id - right.id), 1);
});

test("validation and reports do not mutate source records", () => {
  const enquiry = Object.freeze({ ...validEnquiry });
  const source = Object.freeze([enquiry]);
  const snapshot = { ...enquiry };
  assert.equal(validatePatientEnquiry(enquiry, "en", TODAY).isValid, true);
  const report = createEnquiryReport(source);
  report.enquiriesByClinic.get(enquiry.preferred_clinic).push(enquiry);
  assert.equal(source.length, 1);
  assert.deepEqual(enquiry, snapshot);
});

test("evening preference warns when a clinic closes before 8pm", () => {
  const warning = validatePatientEnquiry(
    { ...validEnquiry, preferred_clinic: "HealthCore Orlando", preferred_time: "evening" },
    "en",
    TODAY
  );
  assert.equal(warning.warnings.length, 1);
  assert.match(warning.warnings[0], /closes before 8pm/);

  const lateClinic = validatePatientEnquiry(
    { ...validEnquiry, preferred_time: "evening" },
    "en",
    TODAY
  );
  assert.deepEqual(lateClinic.warnings, []);

  const lateClinicSaturday = validatePatientEnquiry(
    {
      ...validEnquiry,
      preferred_clinic: "HealthCore Austin North",
      preferred_time: "evening",
      preferred_date: "2026-10-31"
    },
    "en",
    TODAY
  );
  assert.equal(lateClinicSaturday.warnings.length, 1);
});

test("health concern, consent and Spanish messages are validated", () => {
  const result = validatePatientEnquiry(
    { ...validEnquiry, health_concern: "short", contact_consent: false },
    "es",
    TODAY
  );
  assert.match(result.errors.health_concern, /15 caracteres restantes/);
  assert.equal(
    result.errors.contact_consent,
    "Debes aceptar que nos pongamos en contacto contigo para enviar este formulario"
  );

  const tooLong = validatePatientEnquiry(
    { ...validEnquiry, health_concern: "a".repeat(501) },
    "en",
    TODAY
  );
  assert.equal(tooLong.errors.health_concern, "Please keep your health concern to 500 characters or fewer");
});
