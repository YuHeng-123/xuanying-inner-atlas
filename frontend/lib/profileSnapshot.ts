import type { MyProfile, StoredRelationship } from "@/lib/types";

/** Resolve the immutable chart inputs, including records created before profileSnapshot existed. */
export function getAnalysisProfileSnapshot(record: StoredRelationship): MyProfile | null {
  if (record.profileSnapshot) return record.profileSnapshot;

  const birth = record.analysis?.user_bazi?.birth;
  if (!birth || !Number.isInteger(birth.year) || !Number.isInteger(birth.month) || !Number.isInteger(birth.day)) return null;
  return {
    name: "",
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour: birth.hour ?? null,
  };
}

/** A different display name does not change a chart; compare only the chart's birth inputs. */
export function hasOutdatedProfileBasis(record: StoredRelationship, current: MyProfile | null): boolean {
  if (!current) return false;
  const snapshot = getAnalysisProfileSnapshot(record);
  if (!snapshot) return false;
  return snapshot.year !== current.year
    || snapshot.month !== current.month
    || snapshot.day !== current.day
    || (snapshot.hour ?? null) !== (current.hour ?? null);
}
