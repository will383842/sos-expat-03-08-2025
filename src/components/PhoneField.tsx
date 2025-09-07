import React from 'react';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { toE164 } from '../utils/phone';

type CountryCode = 'FR' | 'BE' | 'CH' | 'MA' | 'ES' | 'IT' | 'DE' | 'GB';

export type PhoneFieldProps<TFieldValues extends FieldValues = FieldValues> = {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label?: string;
  defaultCountry?: CountryCode;
  placeholder?: string;
  required?: boolean;
};

export default function PhoneField<TFieldValues extends FieldValues = FieldValues>({
  name,
  control,
  label,
  defaultCountry = 'FR',
  placeholder = '+33612345678',
  required,
}: PhoneFieldProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        // ✅ plus de setValueAs ici
        required: required ? 'Numéro requis' : false,
        validate: (v: string) => {
          const res = toE164(v, defaultCountry);
          return res.ok || 'Numéro invalide (ex: +33612345678)';
        },
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
              const normalized = toE164(e.currentTarget.value, defaultCountry);
              if (normalized.ok) {
                field.onChange(normalized.e164); // ✅ normalisation au blur
              }
              field.onBlur();
            }}
          />
          {fieldState.error && (
            <span className="text-red-600 text-xs">{fieldState.error.message}</span>
          )}
        </div>
      )}
    />
  );
}
