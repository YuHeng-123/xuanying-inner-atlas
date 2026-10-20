/** Four transformations may belong to either major or minor stars. */
export function transformedStars<T extends { mutagen?: string }>(palace: { majorStars: T[]; minorStars: T[] }): T[] {
  return [...palace.majorStars, ...palace.minorStars].filter((star) => Boolean(star.mutagen));
}
