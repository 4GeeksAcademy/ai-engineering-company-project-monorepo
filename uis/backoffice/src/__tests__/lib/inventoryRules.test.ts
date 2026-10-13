/**
 * The inventory rules (`lib/inventoryRules.ts`): stock levels, the checks the forms run before sending, and how API
 * rejections become sentences the staff can read.
 *
 * Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { ApiError } from "@/lib/api";
import {
  LOW_STOCK_THRESHOLD,
  assetIdFromQuery,
  assetOptionLabel,
  authorName,
  compareByUrgency,
  compareOrdersNewestFirst,
  countByLevel,
  describeInventoryError,
  isBadRequest,
  orderDetail,
  outboundPayload,
  parseQuantity,
  stockLevel,
  stockWarning,
  unitsLabel,
  validateInbound,
  validateOutbound,
} from "@/lib/inventoryRules";
import type { Asset, InventoryOrder } from "@/types/inventory";

const asset = (over: Partial<Asset> = {}): Asset => ({
  id: 1,
  name: "Ratón ergonómico",
  sku: "NXV-PER-001",
  category: "peripherals",
  office: "Valencia",
  current_stock: 10,
  ...over,
});

const order = (over: Partial<InventoryOrder> = {}): InventoryOrder => ({
  type: "inbound",
  id: 1,
  asset: { id: 1, name: "Ratón ergonómico", sku: "NXV-PER-001", category: "peripherals", office: "Valencia" },
  quantity: 3,
  office: "Valencia",
  created_at: "2026-10-13T08:00:00Z",
  user_uuid: "6f1c2b7e-0000-4000-8000-000000000000",
  supplier: "Office Depot Miami",
  exit_type: null,
  assigned_to: null,
  ...over,
});

describe("stockLevel", () => {
  describe("happy path", () => {
    it("is ok above the low-stock threshold", () => {
      expect(stockLevel(LOW_STOCK_THRESHOLD + 1)).toBe("ok");
    });
    it("is low from one unit up to the threshold", () => {
      expect(stockLevel(1)).toBe("low");
      expect(stockLevel(LOW_STOCK_THRESHOLD)).toBe("low");
    });
    it("is empty at zero", () => {
      expect(stockLevel(0)).toBe("empty");
    });
  });
  describe("edge cases", () => {
    it("treats a negative figure as empty rather than as healthy", () => {
      expect(stockLevel(-2)).toBe("empty");
    });
  });
});

describe("compareByUrgency and countByLevel", () => {
  it("puts empty first, then low, then ok, and the fewest units first within a level", () => {
    const list = [
      asset({ id: 1, name: "B", current_stock: 20 }),
      asset({ id: 2, name: "A", current_stock: 3 }),
      asset({ id: 3, name: "C", current_stock: 0 }),
      asset({ id: 4, name: "D", current_stock: 1 }),
    ];
    expect([...list].sort(compareByUrgency).map((a) => a.id)).toEqual([3, 4, 2, 1]);
  });

  it("falls back to the name, then the SKU, when the stock is the same", () => {
    const list = [
      asset({ id: 1, name: "Hub", sku: "B", current_stock: 8 }),
      asset({ id: 2, name: "Hub", sku: "A", current_stock: 8 }),
      asset({ id: 3, name: "Cable", sku: "Z", current_stock: 8 }),
    ];
    expect([...list].sort(compareByUrgency).map((a) => a.id)).toEqual([3, 2, 1]);
  });

  it("counts how many products are at each level", () => {
    const list = [asset({ current_stock: 0 }), asset({ current_stock: 2 }), asset({ current_stock: 9 }), asset({ current_stock: 50 })];
    expect(countByLevel(list)).toEqual({ empty: 1, low: 1, ok: 2 });
  });
});

describe("labels", () => {
  it("tells the same product in two offices apart", () => {
    expect(assetOptionLabel(asset({ name: 'Portátil 14" Business', sku: "NXV-IT-002", office: "Miami" }))).toBe(
      'Portátil 14" Business · NXV-IT-002 · Miami',
    );
  });
  it("pluralises the units", () => {
    expect(unitsLabel(1)).toBe("1 unidad");
    expect(unitsLabel(0)).toBe("0 unidades");
    expect(unitsLabel(12)).toBe("12 unidades");
  });
});

describe("parseQuantity", () => {
  it("accepts a whole number of at least one", () => {
    expect(parseQuantity("7")).toBe(7);
    expect(parseQuantity(" 12 ")).toBe(12);
  });
  it.each(["", "0", "-3", "2.5", "1e3", "abc", "3 units", "99999999999999999999"])("rejects %p", (raw) => {
    expect(parseQuantity(raw)).toBeNull();
  });
});

describe("validateInbound", () => {
  it("passes a complete entry", () => {
    expect(validateInbound({ assetId: "1", quantity: "5", supplier: "Office Depot Miami" })).toEqual({});
  });
  it("asks for every missing field, in Spanish", () => {
    const errors = validateInbound({ assetId: "", quantity: "", supplier: "   " });
    expect(Object.keys(errors).sort()).toEqual(["assetId", "quantity", "supplier"]);
    expect(errors.supplier).toBe("Indica el proveedor.");
  });
  it("rejects zero units", () => {
    expect(validateInbound({ assetId: "1", quantity: "0", supplier: "X" }).quantity).toMatch(/mayor que 0/);
  });
});

describe("validateOutbound", () => {
  const base = { assetId: "1", quantity: "2", exitType: "allocation" as const, assignedTo: "Ana Pérez" };

  describe("happy path", () => {
    it("passes an allocation with an employee", () => {
      expect(validateOutbound(base)).toEqual({});
    });
    it("passes a consumption with no employee", () => {
      expect(validateOutbound({ ...base, exitType: "consumption", assignedTo: "" })).toEqual({});
    });
  });

  describe("edge cases", () => {
    it("does not judge the stock: that is a warning and the API's call, not a form error", () => {
      expect(validateOutbound({ ...base, quantity: "9999" })).toEqual({});
    });
  });

  describe("failure modes", () => {
    it("requires the employee for an allocation, but not for a consumption", () => {
      expect(validateOutbound({ ...base, assignedTo: "  " }).assignedTo).toMatch(/a quién se asigna/);
      expect(validateOutbound({ ...base, exitType: "consumption", assignedTo: "  " }).assignedTo).toBeUndefined();
    });
    it("requires an asset and a valid quantity", () => {
      const errors = validateOutbound({ ...base, assetId: "", quantity: "x" });
      expect(errors.assetId).toBe("Selecciona el activo.");
      expect(errors.quantity).toBeDefined();
    });
  });
});

describe("stockWarning", () => {
  it("warns, with the figures, when the quantity is above the stock shown", () => {
    expect(stockWarning("11", 10)).toBe("Atención: solo hay 10 unidades en stock y pides 11. La salida será rechazada.");
    expect(stockWarning("2", 1)).toMatch(/solo hay 1 unidad en stock/);
  });
  it("warns that an asset with no stock cannot be taken out", () => {
    expect(stockWarning("1", 0)).toMatch(/no tiene stock/);
  });
  it("is silent when the quantity fits, when it is not a valid number yet, or when the stock is not known", () => {
    expect(stockWarning("10", 10)).toBeNull();
    expect(stockWarning("", 10)).toBeNull();
    expect(stockWarning("abc", 10)).toBeNull();
    expect(stockWarning("5", null)).toBeNull();
  });
});

describe("assetIdFromQuery", () => {
  it("takes a plain positive integer", () => {
    expect(assetIdFromQuery("5")).toBe("5");
    expect(assetIdFromQuery(["7", "8"])).toBe("7");
  });
  it.each([undefined, "", "0", "-1", "1.5", "abc", "5; DROP", "<script>", "12345678901"])("ignores %p", (value) => {
    expect(assetIdFromQuery(value as string | undefined)).toBe("");
  });
});

describe("isBadRequest", () => {
  it("is true only for an API 400", () => {
    expect(isBadRequest(new ApiError("x", 400))).toBe(true);
    expect(isBadRequest(new ApiError("x", 500))).toBe(false);
    expect(isBadRequest(new Error("x"))).toBe(false);
  });
});

describe("outboundPayload", () => {
  it("sends the employee only with an allocation, trimmed", () => {
    expect(
      outboundPayload({ assetId: "3", quantity: " 2 ", exitType: "allocation", assignedTo: "  Ana  " }, "Miami"),
    ).toEqual({ asset_id: 3, quantity: 2, exit_type: "allocation", assigned_to: "Ana", office: "Miami" });
  });
  it("sends null for a consumption even if a name was typed before switching the type", () => {
    expect(
      outboundPayload({ assetId: "3", quantity: "1", exitType: "consumption", assignedTo: "Ana" }, "Valencia").assigned_to,
    ).toBeNull();
  });
});

describe("describeInventoryError", () => {
  describe("happy path", () => {
    it("turns the insufficient-stock 400 into a Spanish sentence with the figures", () => {
      const err = new ApiError("Insufficient stock for asset 'Resma de papel A4'. Available: 3, requested: 10.", 400);
      expect(describeInventoryError(err, "x")).toBe("No hay stock suficiente de «Resma de papel A4»: disponible 3, solicitado 10.");
    });
    it("keeps the name when it has quotes or accents in it", () => {
      const err = new ApiError("Insufficient stock for asset 'Portátil 14\" Business'. Available: 0, requested: 1.", 400);
      expect(describeInventoryError(err, "x")).toContain("«Portátil 14\" Business»");
    });
    it("translates an office mismatch", () => {
      const err = new ApiError(
        "Asset 'Hub USB-C' belongs to the Miami office: an order for it cannot be registered in Valencia.",
        422,
      );
      expect(describeInventoryError(err, "x")).toBe(
        "«Hub USB-C» pertenece a la oficina de Miami: no se puede registrar un movimiento suyo en Valencia.",
      );
    });
    it("translates the business rule on assigned_to", () => {
      const err = new ApiError("assigned_to is required when exit_type is 'allocation'", 422);
      expect(describeInventoryError(err, "x")).toMatch(/Indica a quién se asigna/);
    });
    it("names the fields of a validation error in Spanish", () => {
      const err = new ApiError("quantity: Input should be greater than 0", 422, { quantity: "Input should be greater than 0" });
      expect(describeInventoryError(err, "x")).toBe("Cantidad: debe ser mayor que 0.");
    });
  });

  describe("edge cases", () => {
    it("shows an unknown message of the API as it is", () => {
      expect(describeInventoryError(new ApiError("Algo concreto", 409), "x")).toBe("Algo concreto");
    });
    it("never shows a bare status text for a 400: gives a sentence instead", () => {
      expect(describeInventoryError(new ApiError("Bad Request", 400), "x")).toMatch(/no es válida/);
      expect(describeInventoryError(new ApiError("", 400), "x")).toMatch(/no es válida/);
    });
    it("uses the fallback for a non-400 with no message", () => {
      expect(describeInventoryError(new ApiError("", 409), "No se pudo.")).toBe("No se pudo.");
    });
  });

  describe("failure modes", () => {
    it("explains a network failure", () => {
      expect(describeInventoryError(new ApiError("No response from the server", 0), "x")).toMatch(/No se pudo conectar/);
    });
    it("explains a server failure and includes the body's message when it says something", () => {
      expect(describeInventoryError(new ApiError("Database is locked", 503), "x")).toBe(
        "El servidor ha tenido un problema (error 503). Inténtalo de nuevo en unos minutos. Detalle: Database is locked",
      );
    });
    it("leaves out the detail when it is only the generic status text", () => {
      const message = describeInventoryError(new ApiError("Internal Server Error", 500), "x");
      expect(message).toBe("El servidor ha tenido un problema (error 500). Inténtalo de nuevo en unos minutos.");
    });
    it("explains a server failure", () => {
      expect(describeInventoryError(new ApiError("Traceback...", 500), "x")).toMatch(/problema/);
    });
    it("explains an expired session, a forbidden call and a missing product", () => {
      expect(describeInventoryError(new ApiError("Not authenticated", 401), "x")).toMatch(/sesión/);
      expect(describeInventoryError(new ApiError("Forbidden", 403), "x")).toMatch(/permiso/);
      expect(describeInventoryError(new ApiError("Asset 9 not found", 404), "x")).toMatch(/No se encontró el activo/);
    });
    it("does not blame the asset for a 404 of the route itself (proxy or deployment problem)", () => {
      const message = describeInventoryError(new ApiError("Not Found", 404), "x");
      expect(message).toMatch(/error 404/);
      expect(message).not.toMatch(/No se encontró el activo/);
    });
    it("keeps the detail of a server failure short: a stack trace is not for the staff", () => {
      const message = describeInventoryError(new ApiError("x".repeat(500), 500), "x");
      expect(message.length).toBeLessThan(260);
      expect(message).toMatch(/…$/);
    });
    it("uses the fallback for something that is not an API error", () => {
      expect(describeInventoryError(new TypeError("boom"), "No se pudo cargar.")).toBe("No se pudo cargar.");
    });
  });
});

describe("order history helpers", () => {
  it("sorts newest first, using the id to break a tie", () => {
    const list = [
      order({ id: 1, created_at: "2026-10-12T10:00:00Z" }),
      order({ id: 2, created_at: "2026-10-13T10:00:00Z" }),
      order({ id: 3, created_at: "2026-10-13T10:00:00Z" }),
    ];
    expect([...list].sort(compareOrdersNewestFirst).map((o) => o.id)).toEqual([3, 2, 1]);
  });

  it("shows the author's name, or says there is none when they are not in the directory", () => {
    const uuid = "6f1c2b7e-0000-4000-8000-000000000000";
    expect(authorName(uuid, { [uuid]: "Marta Ruiz" })).toBe("Marta Ruiz");
    expect(authorName(uuid, {})).toBe("Usuario no disponible");
  });

  it("labels the seed data (nil UUID) as loaded by the system", () => {
    expect(authorName("00000000-0000-0000-0000-000000000000", {})).toBe("Sistema (datos iniciales)");
  });

  it("describes an entry by its supplier and an exit by its type and employee", () => {
    expect(orderDetail(order())).toBe("Office Depot Miami");
    expect(orderDetail(order({ supplier: null }))).toBe("—");
    expect(orderDetail(order({ type: "outbound", supplier: null, exit_type: "allocation", assigned_to: "Ana Pérez" }))).toBe(
      "Asignación a un empleado: Ana Pérez",
    );
    expect(orderDetail(order({ type: "outbound", supplier: null, exit_type: "consumption" }))).toBe("Consumo");
    expect(orderDetail(order({ type: "outbound", supplier: null }))).toBe("Salida");
  });
});
