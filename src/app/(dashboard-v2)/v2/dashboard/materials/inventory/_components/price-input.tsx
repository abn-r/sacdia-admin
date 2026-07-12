"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";

interface PriceInputProps {
  /** Current value in centavos (integer) */
  valueCentavos: number;
  onChange: (centavos: number) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

/**
 * Converts a peso string (e.g. "123.45") input to centavos integer.
 * Display: pesos with 2 decimal places. Submit: integer centavos.
 */
export function PriceInput({
  valueCentavos,
  onChange,
  disabled,
  id,
  placeholder = "0.00",
}: PriceInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue =
    valueCentavos > 0 ? (valueCentavos / 100).toFixed(2) : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Allow only digits and at most one decimal point with up to 2 decimal places
    if (raw === "" || raw === ".") {
      onChange(0);
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) {
      // Round to 2 decimal places to avoid floating-point drift
      onChange(Math.round(parsed * 100));
    }
  }

  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
        $
      </span>
      <Input
        ref={inputRef}
        id={id}
        type="number"
        step="0.01"
        min="0"
        defaultValue={displayValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className="pl-6"
      />
    </div>
  );
}
