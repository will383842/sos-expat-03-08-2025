import React from "react";

type Props = {
  value?: number;
  onChange: (next?: number) => void;
  placeholder?: string;
  suffix?: string; // "€" | "$" etc.
};

export default function MoneyInput({ value, onChange, placeholder, suffix }: Props) {
  const [text, setText] = React.useState(value?.toString() ?? "");
  React.useEffect(() => { setText(value?.toString() ?? ""); }, [value]);

  const accept = (v: string) => {
    // Autorise vide, entiers, décimaux avec , ou .
    if (v === "") return true;
    const norm = v.replace(",", ".");
    return /^(\d+(\.\d{0,2})?)$/.test(norm);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          if (!accept(v)) return;
          setText(v);
        }}
        onBlur={() => {
          const norm = text.replace(",", ".");
          onChange(norm === "" ? undefined : Number(norm));
        }}
        className="w-full border rounded px-3 py-2"
      />
      {suffix && <span className="text-gray-500">{suffix}</span>}
    </div>
  );
}
