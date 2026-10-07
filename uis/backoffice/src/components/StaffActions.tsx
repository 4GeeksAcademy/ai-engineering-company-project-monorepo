import { useEffect, useState } from "react";
import {
  fetchCustomers,
  fetchEmployees,
  fetchMenuItems,
  fetchRecipes,
  fetchSuppliers,
  fetchVacancies,
  postInbound,
  postPeople,
  postPreference,
  postRecipeAck,
  postRecipePublish,
  postRecommendation,
  postRecommendationAccept,
  postSale,
  toUserFacingMessage,
  type CustomerOption,
  type EmployeeOption,
  type InventoryProduct,
  type Location,
  type MenuItemOption,
  type RecipeOption,
  type SupplierOption,
  type VacancyOption,
} from "../lib/api";
import { trackCapture } from "../telemetry/events";

type Props = {
  locations: Location[];
  products: InventoryProduct[];
  disabled?: boolean;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function note(error: unknown): string {
  return toUserFacingMessage(error);
}

export function StaffActions({ locations, products, disabled = false }: Props) {
  const [menus, setMenus] = useState<MenuItemOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [vacancies, setVacancies] = useState<VacancyOption[]>([]);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [suggestionId, setSuggestionId] = useState<string | null>(null);
  const [suggestionName, setSuggestionName] = useState<string | null>(null);

  useEffect(() => {
    if (disabled) {
      return;
    }
    let cancelled = false;
    void Promise.all([
      fetchMenuItems(),
      fetchCustomers(),
      fetchSuppliers(),
      fetchEmployees(),
      fetchVacancies(),
      fetchRecipes(),
    ])
      .then(([menuRows, customerRows, supplierRows, employeeRows, vacancyRows, recipeRows]) => {
        if (cancelled) {
          return;
        }
        setMenus(menuRows);
        setCustomers(customerRows);
        setSuppliers(supplierRows);
        setEmployees(employeeRows);
        setVacancies(vacancyRows);
        setRecipes(recipeRows);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus(note(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [disabled]);

  async function refreshPeople(): Promise<void> {
    const [employeeRows, vacancyRows, recipeRows] = await Promise.all([
      fetchEmployees(),
      fetchVacancies(),
      fetchRecipes(),
    ]);
    setEmployees(employeeRows);
    setVacancies(vacancyRows);
    setRecipes(recipeRows);
  }

  const locationOptions = locations.map((location) => (
    <option key={location.id} value={location.id}>
      {location.name} ({location.currency})
    </option>
  ));

  return (
    <div className="accessible__stock">
      <h4>Record an operation</h4>
      <p className="accessible__status">
        These forms write through the central API. The no-sales simulator above is unchanged.
      </p>
      {status ? <p className="accessible__status">{status}</p> : null}

      <form
        className="accessible__stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const locationId = String(data.get("sale_location") ?? "");
          const location = locations.find((row) => row.id === locationId);
          const menu = menus.find((row) => row.id === String(data.get("sale_menu") ?? ""));
          const quantity = Number(data.get("sale_qty"));
          const amount = Number(data.get("sale_amount"));
          const coversRaw = String(data.get("sale_covers") ?? "").trim();
          if (!location || !menu || !Number.isFinite(quantity) || quantity < 1 || !(amount > 0)) {
            setStatus("Choose a location, a menu item, a quantity, and an amount.");
            return;
          }
          const body: Record<string, unknown> = {
            location_id: location.id,
            currency: location.currency,
            amount,
            channel: String(data.get("sale_channel")),
            lines: [
              {
                menu_item_id: menu.id,
                menu_item_name: menu.name,
                quantity,
                line_amount: amount,
              },
            ],
            loyalty_attached: false,
          };
          if (coversRaw !== "") {
            body.covers = Number(coversRaw);
          }
          void postSale(body)
            .then((saved) => {
              trackCapture("sale_completed", saved.capture);
              setStatus(`Ticket stored for ${location.name}.`);
              form.reset();
            })
            .catch((error: unknown) => setStatus(note(error)));
        }}
      >
        <label>
          Sale location
          <select name="sale_location" required disabled={disabled} defaultValue={locations[0]?.id ?? ""}>
            {locationOptions}
          </select>
        </label>
        <label>
          Channel
          <select name="sale_channel" defaultValue="in_store">
            <option value="in_store">In store</option>
            <option value="delivery">Delivery</option>
            <option value="digital_app">Digital app</option>
          </select>
        </label>
        <label>
          Menu item
          <select name="sale_menu" required defaultValue={menus[0]?.id ?? ""}>
            {menus.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantity
          <input name="sale_qty" type="number" min={1} defaultValue={1} required />
        </label>
        <label>
          Amount
          <input name="sale_amount" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          Covers (blank = 1)
          <input name="sale_covers" type="number" min={0} />
        </label>
        <button type="submit" disabled={disabled}>
          Record ticket
        </button>
      </form>

      <form
        className="accessible__stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const body = {
            location_id: String(data.get("order_location") ?? ""),
            supplier_id: String(data.get("order_supplier") ?? ""),
            product_id: Number(data.get("order_product")),
            quantity: Number(data.get("order_qty")),
            order_kind: String(data.get("order_kind")),
            category: String(data.get("order_category")),
            unit_price: Number(data.get("order_price")),
          };
          void postInbound(body)
            .then((saved) => {
              trackCapture("inbound_order_created", saved.inbound);
              trackCapture("ingredient_price_variance_detected", saved.price_variance);
              setStatus(
                saved.price_variance
                  ? "Inbound line stored. The unit price moved at least 1%."
                  : "Inbound line stored.",
              );
            })
            .catch((error: unknown) => setStatus(note(error)));
        }}
      >
        <label>
          Order location
          <select name="order_location" required defaultValue={locations[0]?.id ?? ""}>
            {locationOptions}
          </select>
        </label>
        <label>
          Supplier
          <select name="order_supplier" required defaultValue={suppliers[0]?.id ?? ""}>
            {suppliers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} ({row.currency} {row.latest_unit_price})
              </option>
            ))}
          </select>
        </label>
        <label>
          Ingredient
          <select name="order_product" required defaultValue={products[0]?.product_id ?? ""}>
            {products.map((row) => (
              <option key={row.product_id} value={row.product_id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantity
          <input name="order_qty" type="number" min={1} defaultValue={1} required />
        </label>
        <label>
          Category
          <select name="order_category" defaultValue="proteins">
            <option value="proteins">Proteins</option>
            <option value="vegetables_fruit">Vegetables and fruit</option>
            <option value="beverages_packaging">Beverages and packaging</option>
            <option value="imported_sauces">Imported sauces</option>
            <option value="cleaning">Cleaning</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Kind
          <select name="order_kind" defaultValue="scheduled">
            <option value="scheduled">Scheduled</option>
            <option value="emergency">Emergency</option>
          </select>
        </label>
        <label>
          Unit price
          <input name="order_price" type="number" min="0.01" step="0.01" required />
        </label>
        <button type="submit" disabled={disabled}>
          Place inbound line
        </button>
      </form>

      <form
        className="accessible__stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const customerId = String(data.get("pref_customer") ?? "");
          void postPreference(customerId, {
            preference_code: String(data.get("pref_code")),
            preference_value: String(data.get("pref_value")),
          })
            .then((saved) => {
              trackCapture("customer_preference_recorded", saved.capture);
              setStatus("Preference stored.");
            })
            .catch((error: unknown) => setStatus(note(error)));
        }}
      >
        <label>
          Customer
          <select name="pref_customer" required defaultValue={customers[0]?.id ?? ""}>
            {customers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} ({row.market})
              </option>
            ))}
          </select>
        </label>
        <label>
          Preference
          <select name="pref_code" defaultValue="preferred_language">
            <option value="preferred_language">Language</option>
            <option value="preferred_channel">Channel</option>
            <option value="favorite_menu_item">Favourite dish</option>
            <option value="diet">Diet</option>
          </select>
        </label>
        <label>
          Value
          <input name="pref_value" required placeholder="es, in_store, gluten_free, or a dish name" />
        </label>
        <button type="submit" disabled={disabled}>
          Save preference
        </button>
      </form>

      <form
        className="accessible__stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const customerId = String(data.get("rec_customer") ?? "");
          void postRecommendation({
            location_id: String(data.get("rec_location") ?? ""),
            surface: String(data.get("rec_surface") ?? "checkout"),
            customer_id: customerId || null,
          })
            .then((saved) => {
              trackCapture("recommendation_shown", saved.capture);
              setSuggestionId(saved.recommendation_id);
              setSuggestionName(String(saved.capture.menu_item_name ?? ""));
              setStatus("Suggestion shown.");
            })
            .catch((error: unknown) => setStatus(note(error)));
        }}
      >
        <label>
          Suggestion location
          <select name="rec_location" required defaultValue={locations[0]?.id ?? ""}>
            {locationOptions}
          </select>
        </label>
        <label>
          Surface
          <select name="rec_surface" defaultValue="checkout">
            <option value="checkout">Checkout</option>
            <option value="kiosk">Kiosk</option>
            <option value="app_home">App home</option>
          </select>
        </label>
        <label>
          Customer (optional)
          <select name="rec_customer" defaultValue="">
            <option value="">Anonymous guest</option>
            {customers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={disabled}>
          Show suggestion
        </button>
        <button
          type="button"
          disabled={disabled || !suggestionId}
          onClick={() => {
            if (!suggestionId) {
              return;
            }
            void postRecommendationAccept(suggestionId)
              .then((saved) => {
                trackCapture("recommendation_accepted", saved.capture);
                setStatus(`${suggestionName ?? "Suggestion"} accepted.`);
                setSuggestionId(null);
              })
              .catch((error: unknown) => setStatus(note(error)));
          }}
        >
          Guest accepted{suggestionName ? `: ${suggestionName}` : ""}
        </button>
      </form>

      <form
        className="accessible__stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void postPeople("/people/hires", {
            country: String(data.get("hire_country")),
            effective_date: String(data.get("hire_date")),
            employment_basis: String(data.get("hire_basis")),
          })
            .then(async (saved) => {
              trackCapture("employee_hired", saved.capture);
              await refreshPeople();
              setStatus("Hire recorded.");
            })
            .catch((error: unknown) => setStatus(note(error)));
        }}
      >
        <label>
          Hire country
          <select name="hire_country" defaultValue="Colombia">
            <option value="Colombia">Colombia</option>
            <option value="United States">United States</option>
          </select>
        </label>
        <label>
          Start date
          <input name="hire_date" type="date" required defaultValue={today()} />
        </label>
        <label>
          Basis
          <select name="hire_basis" defaultValue="kitchen">
            <option value="kitchen">Kitchen</option>
            <option value="floor">Floor</option>
            <option value="management">Management</option>
            <option value="support">Support</option>
          </select>
        </label>
        <button type="submit" disabled={disabled}>
          Record hire
        </button>
      </form>

      <form
        className="accessible__stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void postPeople("/people/separations", {
            employee_id: String(data.get("sep_employee")),
            effective_date: String(data.get("sep_date")),
            separation_kind: String(data.get("sep_kind")),
          })
            .then(async (saved) => {
              trackCapture("employee_separated", saved.capture);
              await refreshPeople();
              setStatus("Separation recorded.");
            })
            .catch((error: unknown) => setStatus(note(error)));
        }}
      >
        <label>
          Employee
          <select name="sep_employee" required defaultValue={employees.find((row) => !row.separated)?.employee_id ?? ""}>
            {employees
              .filter((row) => !row.separated)
              .map((row) => (
                <option key={row.employee_id} value={row.employee_id}>
                  {row.employee_id} · {row.country} · {row.employment_basis}
                </option>
              ))}
          </select>
        </label>
        <label>
          Separation date
          <input name="sep_date" type="date" required defaultValue={today()} />
        </label>
        <label>
          Kind
          <select name="sep_kind" defaultValue="resignation">
            <option value="resignation">Resignation</option>
            <option value="dismissal">Dismissal</option>
            <option value="end_of_contract">End of contract</option>
            <option value="other">Other</option>
          </select>
        </label>
        <button type="submit" disabled={disabled}>
          Record separation
        </button>
      </form>

      <form
        className="accessible__stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void postPeople("/people/absences", {
            employee_id: String(data.get("abs_employee")),
            absence_date: String(data.get("abs_date")),
            day_fraction: Number(data.get("abs_fraction")),
            absence_kind: String(data.get("abs_kind")),
          })
            .then((saved) => {
              trackCapture("absence_recorded", saved.capture);
              setStatus("Absence recorded.");
            })
            .catch((error: unknown) => setStatus(note(error)));
        }}
      >
        <label>
          Absent employee
          <select name="abs_employee" required defaultValue={employees[0]?.employee_id ?? ""}>
            {employees.map((row) => (
              <option key={row.employee_id} value={row.employee_id}>
                {row.employee_id} · {row.country}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input name="abs_date" type="date" required defaultValue={today()} />
        </label>
        <label>
          Day fraction
          <input name="abs_fraction" type="number" min="0.01" max="1" step="0.01" defaultValue={1} required />
        </label>
        <label>
          Kind
          <select name="abs_kind" defaultValue="sick">
            <option value="holiday">Holiday</option>
            <option value="sick">Sick</option>
            <option value="unpaid">Unpaid</option>
            <option value="other">Other</option>
          </select>
        </label>
        <button type="submit" disabled={disabled}>
          Record absence
        </button>
      </form>

      <form
        className="accessible__stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void postPeople("/people/roster-days", {
            employee_id: String(data.get("ros_employee")),
            roster_date: String(data.get("ros_date")),
          })
            .then((saved) => {
              trackCapture("roster_day_scheduled", saved.capture);
              setStatus("Roster day scheduled.");
            })
            .catch((error: unknown) => setStatus(note(error)));
        }}
      >
        <label>
          Roster employee
          <select name="ros_employee" required defaultValue={employees[0]?.employee_id ?? ""}>
            {employees.map((row) => (
              <option key={row.employee_id} value={row.employee_id}>
                {row.employee_id} · {row.country}
              </option>
            ))}
          </select>
        </label>
        <label>
          Roster date
          <input name="ros_date" type="date" required defaultValue={today()} />
        </label>
        <button type="submit" disabled={disabled}>
          Schedule day
        </button>
      </form>

      <form
        className="accessible__stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void postPeople("/people/vacancies", {
            country: String(data.get("vac_country")),
            opened_on: String(data.get("vac_opened")),
            employment_basis: String(data.get("vac_basis")),
          })
            .then(async (saved) => {
              trackCapture("vacancy_opened", saved.capture);
              await refreshPeople();
              setStatus("Vacancy opened.");
            })
            .catch((error: unknown) => setStatus(note(error)));
        }}
      >
        <label>
          Vacancy country
          <select name="vac_country" defaultValue="Colombia">
            <option value="Colombia">Colombia</option>
            <option value="United States">United States</option>
          </select>
        </label>
        <label>
          Opened
          <input name="vac_opened" type="date" required defaultValue={today()} />
        </label>
        <label>
          Basis
          <select name="vac_basis" defaultValue="kitchen">
            <option value="kitchen">Kitchen</option>
            <option value="floor">Floor</option>
            <option value="management">Management</option>
            <option value="support">Support</option>
          </select>
        </label>
        <button type="submit" disabled={disabled}>
          Open vacancy
        </button>
      </form>

      <form
        className="accessible__stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const vacancyId = String(data.get("fill_vacancy") ?? "");
          void postPeople(`/people/vacancies/${encodeURIComponent(vacancyId)}/fill`, {
            filled_on: String(data.get("fill_date")),
          })
            .then(async (saved) => {
              trackCapture("vacancy_filled", saved.capture);
              await refreshPeople();
              setStatus("Vacancy filled.");
            })
            .catch((error: unknown) => setStatus(note(error)));
        }}
      >
        <label>
          Open vacancy
          <select
            name="fill_vacancy"
            required
            defaultValue={vacancies.find((row) => !row.filled_on)?.vacancy_id ?? ""}
          >
            {vacancies
              .filter((row) => !row.filled_on)
              .map((row) => (
                <option key={row.vacancy_id} value={row.vacancy_id}>
                  {row.vacancy_id} · {row.country} · opened {row.opened_on}
                </option>
              ))}
          </select>
        </label>
        <label>
          Filled on
          <input name="fill_date" type="date" required defaultValue={today()} />
        </label>
        <button type="submit" disabled={disabled}>
          Fill vacancy
        </button>
      </form>

      <form
        className="accessible__stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const recipeId = String(data.get("pub_recipe") ?? "");
          void postRecipePublish(recipeId, String(data.get("pub_locale")))
            .then(async (saved) => {
              trackCapture("recipe_update_published", saved.capture);
              await refreshPeople();
              setStatus("Recipe version published.");
            })
            .catch((error: unknown) => setStatus(note(error)));
        }}
      >
        <label>
          Recipe
          <select name="pub_recipe" required defaultValue={recipes[0]?.recipe_id ?? ""}>
            {recipes.map((row) => (
              <option key={row.recipe_id} value={row.recipe_id}>
                {row.title_es} / {row.title_en} · v{row.version}
              </option>
            ))}
          </select>
        </label>
        <label>
          Locale
          <select name="pub_locale" defaultValue="es">
            <option value="es">es</option>
            <option value="en">en</option>
          </select>
        </label>
        <button type="submit" disabled={disabled}>
          Publish update
        </button>
      </form>

      <form
        className="accessible__stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const recipeId = String(data.get("ack_recipe") ?? "");
          const recipe = recipes.find((row) => row.recipe_id === recipeId);
          if (!recipe) {
            setStatus("Choose a published recipe.");
            return;
          }
          void postRecipeAck(recipeId, String(data.get("ack_location") ?? ""), recipe.version)
            .then((saved) => {
              trackCapture("recipe_update_acknowledged", saved.capture);
              setStatus("Location acknowledged the current recipe version.");
            })
            .catch((error: unknown) => setStatus(note(error)));
        }}
      >
        <label>
          Acknowledge recipe
          <select name="ack_recipe" required defaultValue={recipes[0]?.recipe_id ?? ""}>
            {recipes.map((row) => (
              <option key={row.recipe_id} value={row.recipe_id}>
                {row.recipe_id} · v{row.version}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <select name="ack_location" required defaultValue={locations[0]?.id ?? ""}>
            {locationOptions}
          </select>
        </label>
        <button type="submit" disabled={disabled}>
          Acknowledge
        </button>
      </form>
    </div>
  );
}
