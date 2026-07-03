import { faker } from "@faker-js/faker";

const LOCAL_PART_RE = /^[a-z0-9-]{1,64}$/;

function sanitizeNamePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeLocalPart(value: string): string | null {
  const normalized = value
    .replace(/\.{2,}/g, ".")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 64);

  return LOCAL_PART_RE.test(normalized) ? normalized : null;
}

export function generateRealisticLocalPart(): string {
  const first = sanitizeNamePart(faker.person.firstName());
  const last = sanitizeNamePart(faker.person.lastName());
  const suffix = faker.number.int({ min: 2, max: 9999 });

  const candidates = [
  `${first}.${last}`,
  `${first}${last}`,
  `${first}-${last}`,
  `${first}.${last}${suffix}`,
  `${first}${last}${suffix}`,
  `${first}${suffix}`,
  ];

  for (const candidate of faker.helpers.shuffle(candidates)) {
    const normalized = normalizeLocalPart(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return normalizeLocalPart(`${first}${suffix}`) ?? `${first}${suffix}`.slice(0, 64);
}
