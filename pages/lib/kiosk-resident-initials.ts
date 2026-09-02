function getLetters(value: string) {
  return Array.from(value).filter((character) => /\p{L}/u.test(character));
}

function getFirstLetter(value: string | null | undefined) {
  return getLetters(value?.trim() || "")[0] || "";
}

/**
 * Formats a resident identity as first-name initial + last-name initial.
 *
 * A full name ignores every middle name ("Joshua Marc Adams" -> "JA").
 * A manually entered initials value keeps its first and last letters
 * ("JMA" or "J.M.A." -> "JA").
 */
export function formatResidentInitials(
  firstNameOrFullName: string | null | undefined,
  lastName?: string | null,
) {
  if (lastName !== undefined) {
    return `${getFirstLetter(firstNameOrFullName)}${getFirstLetter(lastName)}`.toLocaleUpperCase();
  }

  const value = firstNameOrFullName?.trim() || "";
  const nameParts = value.split(/\s+/).filter(Boolean);

  if (nameParts.length > 1) {
    return `${getFirstLetter(nameParts[0])}${getFirstLetter(nameParts.at(-1))}`.toLocaleUpperCase();
  }

  const letters = getLetters(value);
  if (letters.length === 0) return "";

  return `${letters[0]}${letters.length > 1 ? letters.at(-1) : ""}`.toLocaleUpperCase();
}
