/**
 * ROZ: which random-option slot an option type can roll in.
 * The game client does not ship this (it is server data), so this table is filled from
 * what players report. Key = the option's value prefix (before ":"), value = allowed slots (1-4).
 * Options not listed are allowed in every slot.
 */
export const ROZ_OPTION_SLOT_RULES: Record<string, number[]> = {
  flee: [2], // reported by players: FLEE only rolls in the 2nd option slot
};

export const rozOptionAllowedInSlot = (value: string, slot: number) => {
  if (!slot || !value) return true;
  const key = String(value).split(':')[0];
  const rule = ROZ_OPTION_SLOT_RULES[key];
  return !rule || rule.includes(slot);
};
