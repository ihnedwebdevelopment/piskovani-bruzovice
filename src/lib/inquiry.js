export const serviceOptions = ['Karoserie a veteráni', 'Rámy a technika', 'Kovové konstrukce', 'Jiná zakázka'];
export function validateInquiry(input) {
  const data = {};
  const errors = {};
  for (const key of ['name', 'email', 'phone', 'location', 'service', 'message']) data[key] = typeof input?.[key] === 'string' ? input[key].trim() : '';
  data.email = data.email.toLowerCase();
  if (data.name.length < 2 || data.name.length > 100) errors.name = 'Napište prosím jméno (2–100 znaků).';
  if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Zkontrolujte prosím e-mailovou adresu.';
  if (data.phone && !/^[+\d\s()\-]{6,30}$/.test(data.phone)) errors.phone = 'Zkontrolujte prosím telefonní číslo.';
  if (data.location.length > 140) errors.location = 'Místo zkraťte na nejvýše 140 znaků.';
  if (!serviceOptions.includes(data.service)) errors.service = 'Vyberte prosím druh zakázky.';
  if (data.message.length < 20 || data.message.length > 4000) errors.message = 'Popište prosím zakázku alespoň 20 znaky, nejvýše 4 000 znaky.';
  if (input?.privacy !== true) errors.privacy = 'Potvrďte prosím použití údajů pro vyřízení poptávky.';
  return { data, errors, valid: Object.keys(errors).length === 0 };
}
