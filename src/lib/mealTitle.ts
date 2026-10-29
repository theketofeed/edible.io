export function cleanMealTitle(title: string): string {
  const cleaned = title
    .replace(/\b(?:leftover|leftovers|next-day|reheated|meal-prep)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s.,;:!?'"()[\]{}-]+/, '')
    .replace(/^(?:(?:and|with)\b[\s.,;:!?'"()[\]{}-]*)+/i, '')
    .replace(/^[\s.,;:!?'"()[\]{}-]+/, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.split(/\s+/).length < 2) return title
  return cleaned.replace(/^([^\p{L}]*)(\p{L})/u, (_, prefix, firstLetter) => prefix + firstLetter.toUpperCase())
}
