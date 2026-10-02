interface CheckboxOption<T extends string> {
  value: T;
  label: string;
}

interface CheckboxGroupProps<T extends string> {
  legend: string;
  options: CheckboxOption<T>[];
  selected: string[];
  onToggle: (value: T, checked: boolean) => void;
}

export default function CheckboxGroup<T extends string>({
  legend,
  options,
  selected,
  onToggle,
}: CheckboxGroupProps<T>) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-700 hover:text-zinc-900"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={(e) => onToggle(opt.value, e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}