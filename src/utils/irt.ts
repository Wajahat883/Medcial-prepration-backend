// Very small placeholder for IRT-like weighting
// This is not a true IRT implementation — it's a lightweight modifier for Phase 2.

export function weightAccuracyByDifficulty(rawAccuracy: number, avgDifficulty: number) {
  // rawAccuracy: 0-100, avgDifficulty: 0-1 (0 easy, 1 hard)
  // Increase weight for harder questions up to +15%, decrease for easier down to -10%.
  const difficultyFactor = (avgDifficulty - 0.5) * 0.5; // range approx -0.25..0.25
  const modifier = Math.max(-0.10, Math.min(0.15, difficultyFactor));
  const adjusted = rawAccuracy * (1 + modifier);
  return Math.max(0, Math.min(100, Math.round(adjusted)));
}
