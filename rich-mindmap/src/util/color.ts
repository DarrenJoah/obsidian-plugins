import { BRANCH_COLORS } from "../constants";

export function assignBranchColor(existingColor: string, childIndex: number): string {
  if (existingColor) return existingColor;
  return BRANCH_COLORS[childIndex % BRANCH_COLORS.length];
}
