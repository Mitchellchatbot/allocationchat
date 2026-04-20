/**
 * ~30% chance: lowercase the first letter of sentences (skip the very first sentence).
 */
export function maybeDropCapitalization(text: string): string {
  // Split on sentence boundaries (. ! ?) followed by whitespace + capital letter
  return text.replace(
    /([.!?]\s+)([A-Z])/g,
    (match, sep, letter) => {
      if (Math.random() < 0.3) return sep + letter.toLowerCase();
      return match;
    }
  );
}

/**
 * ~30% chance per contraction: drop the apostrophe ("don't" → "dont").
 */
export function maybeDropApostrophes(text: string): string {
  return text.replace(/(\w)'(\w)/g, (match, before, after) => {
    if (Math.random() < 0.3) return before + after;
    return match;
  });
}
