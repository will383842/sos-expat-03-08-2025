// npm i libphonenumber-js
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function toE164(input: string, defaultCountry: 'FR'|'BE'|'CH'|'MA'|'ES'|'IT'|'DE'|'GB'='FR') {
  const val = (input || '').trim();
  if (!val) return { ok:false as const, e164:null as const, reason:'empty' };

  const p = val.startsWith('+')
    ? parsePhoneNumberFromString(val)
    : parsePhoneNumberFromString(val, defaultCountry);

  if (!p || !p.isValid()) return { ok:false as const, e164:null as const, reason:'invalid' };

  const e164 = p.number; // +XXXXXXXX
  if (!/^\+[1-9]\d{8,14}$/.test(e164)) return { ok:false as const, e164:null as const, reason:'length' };
  return { ok:true as const, e164 };
}
