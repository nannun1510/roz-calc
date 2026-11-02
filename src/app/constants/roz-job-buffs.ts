import { ActiveSkillModel } from '../jobs/_character-base.abstract';

/**
 * ROZ Global party buffs / enemy debuffs (values from the ROZ client skill descriptions).
 * Shown in the "Buffs" panel. A buff your own class casts is taken from your class skill
 * list instead (same name), so it is never counted twice.
 */
const lv = (n: number, fn: (l: number) => Record<string, number>, from = 1) => [
  { label: '-', value: 0, isUse: false },
  ...Array.from({ length: n - from + 1 }, (_, i) => i + from).map((l) => ({ label: `Lv ${l}`, value: l, skillLv: l, isUse: true, bonus: fn(l) })),
];
const yes = (bonus: Record<string, number>, value = 1) => [
  { label: 'Yes', value, isUse: true, bonus },
  { label: 'No', value: 0, isUse: false },
];

export const RozJobBuffs: ActiveSkillModel[] = [
  // Acolyte / Priest
  { name: 'Blessing' as any, label: 'Blessing', inputType: 'dropdown', dropdown: lv(10, (l) => ({ str: l, int: l, dex: l, hit: 2 * l })) },
  { name: 'Increase Agility' as any, label: 'Increase AGI', inputType: 'dropdown', dropdown: lv(10, (l) => ({ agi: l + 2, aspdPercent: l })) },
  { name: 'Angelus' as any, label: 'Angelus', inputType: 'dropdown', dropdown: lv(10, (l) => ({ hp: 50 * l })) },
  { name: 'Impositio Manus', label: 'Impositio Manus', inputType: 'dropdown', dropdown: lv(5, (l) => ({ atk: 5 * l, matk: 5 * l })) },
  { name: 'Gloria' as any, label: 'Gloria (LUK +30)', inputType: 'selectButton', dropdown: yes({ luk: 30 }, 5) },
  { name: 'Suffragium' as any, label: 'Suffragium', inputType: 'dropdown', dropdown: lv(3, (l) => ({ vct: [0, 10, 15, 20][l] })) },
  // Merchant / Blacksmith
  { name: 'Crazy Uproar', label: 'Crazy Uproar', inputType: 'selectButton', dropdown: yes({ str: 4, atk: 30 }) },
  { name: 'Adrenaline Rush', label: 'Adrenaline Rush', inputType: 'dropdown', dropdown: lv(5, (l) => ({ hit: 5 + 3 * l, skillAspd: 5 })) },
  { name: 'Power Thrust', label: 'Power Thrust (party)', inputType: 'dropdown', dropdown: lv(5, (l) => ({ p_race_all: [0, 5, 5, 10, 10, 15][l] })) },
  { name: 'Weapon Perfection', label: 'Weapon Perfection', inputType: 'selectButton', dropdown: yes({ ignore_size_penalty: 1 }, 5) },
  // Swordman
  { name: 'Magnum Break', label: 'Magnum Break (+20% Fire)', inputType: 'selectButton', dropdown: yes({ magnumBreakPsedoBonus: 1 }) },
  // Wizard
  { name: 'Mystical Amplification', label: 'Mystical Amplification', inputType: 'dropdown', dropdown: lv(10, (l) => ({ mysticAmp: 5 * l })) },
  // Sage ground skills (element damage in the area)
  { name: 'Volcano' as any, label: 'Volcano (Fire dmg, ATK/MATK)', inputType: 'dropdown', dropdown: lv(5, (l) => ({ roz_land_fire: [0, 10, 12, 15, 17, 20][l], atk: 5 * l + 5, matk: 5 * l + 5 })) },
  { name: 'Deluge' as any, label: 'Deluge (Water dmg, MHP)', inputType: 'dropdown', dropdown: lv(5, (l) => ({ roz_land_water: [0, 10, 12, 15, 17, 20][l], hpPercent: [0, 5, 7, 10, 12, 15][l] })) },
  { name: 'Whirlwind' as any, label: 'Whirlwind (Wind dmg, FLEE)', inputType: 'dropdown', dropdown: lv(5, (l) => ({ roz_land_wind: [0, 10, 12, 15, 17, 20][l], flee: 3 * l })) },
  // Bard (performance)
  { name: 'Impressive Riff' as any, label: 'Impressive Riff (ASPD)', inputType: 'dropdown', dropdown: lv(10, (l) => ({ aspdPercent: 2 * l })) },
  { name: 'Magic Strings' as any, label: 'Magic Strings (Cast/Delay)', inputType: 'dropdown', dropdown: lv(10, (l) => ({ vct: 2 * l, acd: 3 * l })) },
  { name: 'Perfect Tablature' as any, label: 'Perfect Tablature (FLEE)', inputType: 'selectButton', dropdown: yes({ flee: 40, perfectDodge: 5 }, 10) },
  { name: 'Song of Lutie' as any, label: 'Song of Lutie (MHP)', inputType: 'selectButton', dropdown: yes({ hpPercent: 20 }, 10) },
  // Dancer (dance)
  { name: 'Lady Luck' as any, label: 'Lady Luck (CRIT)', inputType: 'dropdown', dropdown: lv(10, (l) => ({ cri: l, criDmg: 2 * l })) },
  { name: 'Focus Ballet' as any, label: 'Focus Ballet (HIT)', inputType: 'dropdown', dropdown: lv(10, (l) => ({ hit: 8 * l })) },
  { name: "Gypsy's Kiss" as any, label: "Gypsy's Kiss (MSP)", inputType: 'selectButton', dropdown: yes({ spPercent: 20 }, 10) },
  // Bard + Dancer ensemble
  { name: 'Battle Theme' as any, label: 'Battle Theme (ATK)', inputType: 'dropdown', dropdown: lv(5, (l) => ({ atk: 15 + 5 * l, def: 15 * l })) },
  // Enemy debuffs (treated as ignoring that much of the enemy's DEF / MDEF)
  { name: 'Provoke' as any, label: 'Provoke on enemy (DEF -)', inputType: 'dropdown', isDebuff: true, dropdown: lv(10, (l) => ({ p_pene_race_all: [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55][l] })) },
  { name: 'Signum Crucis' as any, label: 'Signum Crucis (Demon/Undead DEF -)', inputType: 'dropdown', isDebuff: true, dropdown: lv(10, (l) => ({ p_pene_race_demon: 10 + 4 * l, p_pene_race_undead: 10 + 4 * l })) },
  { name: 'Mind Breaker' as any, label: 'Mind Breaker on enemy (MDEF -)', inputType: 'dropdown', isDebuff: true, dropdown: lv(5, (l) => ({ m_pene_race_all: 12 * l })) },
];
