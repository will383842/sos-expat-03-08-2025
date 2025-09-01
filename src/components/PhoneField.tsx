import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { toE164 } from '../utils/phone';

type Props = {
  name: string;
  control: Control<any>;
  label?: string;
  defaultCountry?: 'FR'|'BE'|'CH'|'MA'|'ES'|'IT'|'DE'|'GB';
  placeholder?: string;
  required?: boolean;
};

export default function PhoneField({
  name, control, label, defaultCountry='FR', placeholder='+33612345678', required
}: Props) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? 'Numéro requis' : false,
        validate: (v: string) => toE164(v, defaultCountry).ok || 'Numéro invalide (ex: +33612345678)',
        setValueAs: (v: string) => {
          const r = toE164(v, defaultCountry);
          return r.ok ? r.e164 : v; // stocke en E.164
        }
      }}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1">
          {label && <label className="text-sm">{label}</label>}
          <input
            {...field}
            inputMode="tel"
            autoComplete="tel"
            placeholder={placeholder}
            className={`input ${fieldState.error ? 'border-red-500' : ''}`}
            onBlur={(e) => {
              const r = toE164(e.currentTarget.value, defaultCountry);
              if (r.ok) field.onChange(r.e164); // normalise au blur
              field.onBlur();
            }}
          />
          {fieldState.error && <span className="text-red-600 text-xs">{fieldState.error.message}</span>}
        </div>
      )}
    />
  );
}
