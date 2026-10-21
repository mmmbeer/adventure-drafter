import { useRef } from "react";
import { paperColors } from "../lib/page-colors";
export function PaperColorPicker({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (color: string) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  return (
    <div className="paper-color-picker">
      <span className="field-caption">{label}</span>
      <div
        className="paper-swatches"
        role="group"
        aria-label={`${label} suggestions`}
      >
        {paperColors.map(({ name, color }) => (
          <button
            key={name}
            type="button"
            aria-pressed={value.toLowerCase() === color}
            onClick={() => onChange(color)}
          >
            <i style={{ background: color }} aria-hidden="true" />
            {name}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={
            !paperColors.some((p) => p.color === value.toLowerCase())
          }
          onClick={() => picker.current?.click()}
        >
          Custom…
        </button>
      </div>
      <label className="paper-custom-color">
        Custom color
        <input
          ref={picker}
          aria-label={label}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span>{value.toUpperCase()}</span>
      </label>
    </div>
  );
}
