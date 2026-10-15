import { DesktopMenu, type MenuOption } from './DesktopMenu';

/** Studio fields use the same menu, keyboard navigation and theme as the main editor. */
export function StudioSelect<Value extends string>({ label, value, options, placeholder, disabled, onChange }: {
  label: string;
  value: Value;
  options: readonly MenuOption<Value>[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: Value) => void;
}) {
  return <div className="studio-field studio-select">
    <span>{label}</span>
    <DesktopMenu ariaLabel={label} value={value} disabled={disabled} options={options}
      valueLabel={options.find(option => option.value === value)?.label ?? placeholder ?? label} onChange={onChange}/>
  </div>;
}
