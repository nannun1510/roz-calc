/** Sage Hindsight (Thai client: Auto Spell): spells it can cast, with the Hindsight level that unlocks each (client text). */
export const ROZ_AUTO_SPELLS: [name: string, minLv: number][] = [
  ['Fire Bolt', 1], ['Cold Bolt', 1], ['Lightning Bolt', 1], ['Soul Strike', 4], ['Fire Ball', 4],
  ['Frost Diver', 7], ['Earth Spike', 7], ['Thunder Storm', 10], ["Heaven's Drive", 10],
];

/** ROZ auto-attack procs. They are set in Skills > Self skills > "Auto attack procs" (model.roz* fields)
 *  and shown in the DPS tab when the Skill is "Auto Attack". Tree skill name -> proc id. */
export const ROZ_PROC_TREE: Record<string, string> = { 'Spell Fist': 'spellFist', Hindsight: 'autoSpell', 'Double Bolt': 'luckyCast', 'Duple Light': 'duple' };


/** Skill value of the Auto Attack entry (kept from v0.14 so old build codes still load). */
export const ROZ_AUTO_ATTACK_VALUE = 'Auto Attack (Double Attack / Dual wield / Katar)==1';
