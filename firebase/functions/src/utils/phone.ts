export function assertE164(phone: string, who:'provider'|'client') {
  if (!/^\+[1-9]\d{8,14}$/.test(phone||'')) throw new Error(`Invalid ${who} phone: ${phone}`);
  return phone;
}