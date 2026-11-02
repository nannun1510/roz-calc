// GENERATED from rAthena db/re/job_aspd.yml (renewal ASPD = 196 - job base delay for the weapon; shield adds its delay).
// ROZ Global uses the renewal ASPD formula; these replace the generic base 156 for 1st/2nd job classes.
import { ClassName } from '../_class-name';

export const RozAspdTable: Record<string, any> = {
  [ClassName.Novice]: { base: 156, shield: -10, Dagger: -15, Sword: -17, Axe: -10, Mace: -10, 'Two-Handed Mace': -15, Rod: -25, 'Two-Handed Rod': -25 },
  [ClassName.Swordman]: { base: 156, shield: -5, Dagger: -7, Sword: -7, 'Two-Handed Sword': -14, Spear: -17, 'Two-Handed Spear': -25, Axe: -15, 'Two-Handed Axe': -20, Mace: -10, 'Two-Handed Mace': -15 },
  [ClassName.Knight]: { base: 156, shield: -5, Dagger: -9, Sword: -5, 'Two-Handed Sword': -12, Spear: -15, 'Two-Handed Spear': -20, Axe: -10, 'Two-Handed Axe': -15, Mace: -5, 'Two-Handed Mace': -10 },
  [ClassName.Crusader]: { base: 156, shield: -5, Dagger: -8, Sword: -3, 'Two-Handed Sword': -15, Spear: -13, 'Two-Handed Spear': -12, Axe: -10, 'Two-Handed Axe': -15, Mace: -5, 'Two-Handed Mace': -10 },
  [ClassName.Mage]: { base: 146, shield: -10, Dagger: 0, Rod: -5, 'Two-Handed Rod': -5 },
  [ClassName.Wizard]: { base: 146, shield: -8, Dagger: -4, Rod: -3, 'Two-Handed Rod': -3 },
  [ClassName.Sage]: { base: 151, shield: -5, Dagger: -8, Sword: -15, Rod: -10, Book: 2, 'Two-Handed Rod': -10 },
  [ClassName.Archer]: { base: 156, shield: -9, Dagger: -15, Bow: -10 },
  [ClassName.Hunter]: { base: 156, shield: -9, Dagger: -13, Bow: -8 },
  [ClassName.Bard]: { base: 156, shield: -7, Dagger: -13, Bow: -8, Instrument: -5 },
  [ClassName.Dancer]: { base: 156, shield: -7, Dagger: -13, Bow: -8, Whip: -5 },
  [ClassName.Acolyte]: { base: 156, shield: -7, Mace: -5, 'Two-Handed Mace': -10, Rod: -20, 'Two-Handed Rod': -20 },
  [ClassName.Priest]: { base: 156, shield: -5, Mace: -3, 'Two-Handed Mace': -8, Rod: -20, Fistweapon: -20, Book: -4, 'Two-Handed Rod': -20 },
  [ClassName.Monk]: { base: 156, shield: -5, Mace: -3, 'Two-Handed Mace': -8, Rod: -20, Fistweapon: 0, 'Two-Handed Rod': -18 },
  [ClassName.Merchant]: { base: 156, shield: -5, Dagger: -12, Sword: -12, Axe: -8, 'Two-Handed Axe': -15, Mace: -10, 'Two-Handed Mace': -15 },
  [ClassName.Blacksmith]: { base: 156, shield: -5, Dagger: -10, Sword: -10, Axe: -6, 'Two-Handed Axe': -13, Mace: -8, 'Two-Handed Mace': -13 },
  [ClassName.Alchemist]: { base: 156, shield: -4, Dagger: -10, Sword: -5, Axe: -5, 'Two-Handed Axe': -12, Mace: -5, 'Two-Handed Mace': -10 },
  [ClassName.Thief]: { base: 156, shield: -6, Dagger: -8, Sword: -10, Axe: -20, Bow: -13 },
  [ClassName.Assassin]: { base: 156, shield: -6, Dagger: -2, Sword: -10, Axe: -11, Katar: -2, 'left-Dagger': -10, 'left-Sword': -12, 'left-Axe': -12 },
  [ClassName.Rogue]: { base: 156, shield: -5, Dagger: -5, Sword: -10, Bow: -10 },
};
