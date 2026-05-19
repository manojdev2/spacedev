/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate fuzzy match score (0-1, higher is better)
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  // Exact match
  if (t === q) return 1;

  // Contains match (prioritize)
  if (t.includes(q)) {
    // Score based on position and coverage
    const position = t.indexOf(q);
    const coverage = q.length / t.length;
    return 0.8 + (coverage * 0.15) + ((1 - position / t.length) * 0.05);
  }

  // Starts with match
  if (t.startsWith(q)) return 0.9;

  // Word boundary match
  const words = t.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(q)) return 0.75;
    if (word.includes(q)) return 0.65;
  }

  // Fuzzy match using Levenshtein distance
  const distance = levenshteinDistance(q, t);
  const maxLen = Math.max(q.length, t.length);
  
  if (maxLen === 0) return 0;
  
  const similarity = 1 - distance / maxLen;
  
  // Check if query matches start of target with typos
  const targetStart = t.slice(0, Math.min(q.length + 2, t.length));
  const startDistance = levenshteinDistance(q, targetStart);
  const startSimilarity = 1 - startDistance / Math.max(q.length, targetStart.length);
  
  // Use the better of full match or start match
  const bestSimilarity = Math.max(similarity, startSimilarity * 0.9);
  
  // Only return scores above threshold
  return bestSimilarity > 0.4 ? bestSimilarity * 0.6 : 0;
}

/**
 * Check if query fuzzy matches target
 */
export function fuzzyMatch(query: string, target: string, threshold = 0.3): boolean {
  return fuzzyScore(query, target) >= threshold;
}

/**
 * Fuzzy match against multiple fields, returns best score
 */
export function fuzzyMatchMultiple(
  query: string, 
  targets: string[], 
  threshold = 0.3
): { matched: boolean; score: number; bestMatch: string } {
  let bestScore = 0;
  let bestMatch = '';

  for (const target of targets) {
    const score = fuzzyScore(query, target);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = target;
    }
  }

  return {
    matched: bestScore >= threshold,
    score: bestScore,
    bestMatch,
  };
}
