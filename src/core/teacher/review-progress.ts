import type { Assignment, Review } from "../model";

export function readingProgress(
  assignment: Pick<Assignment, "minRead" | "fullRead">,
  review: Pick<Review, "passages" | "fullRead">,
  guide: { id: string }[],
) {
  const ids = new Set(guide.map((item) => item.id));
  const passages = [...new Set(review.passages)].filter((id) => ids.has(id));
  const fullReadRequired = assignment.fullRead || ids.size < assignment.minRead;
  const fulfilled =
    review.fullRead ||
    (!fullReadRequired && passages.length >= assignment.minRead);
  return {
    passages,
    read: passages.length,
    required: assignment.minRead,
    fullReadRequired,
    fulfilled,
    remaining: fulfilled
      ? 0
      : Math.max(0, assignment.minRead - passages.length),
  };
}
