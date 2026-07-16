import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeightInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeightInput({ id, label, value, onChange }: WeightInputProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          onChange(Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0);
        }}
        className="font-mono tabular-nums w-24"
      />
    </div>
  );
}
