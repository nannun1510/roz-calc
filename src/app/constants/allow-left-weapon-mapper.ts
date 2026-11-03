import { ClassName } from '../jobs/_class-name';

export const AllowLeftWeaponMapper = {
  [ClassName.Assassin]: true, // ROZ: Assassin can dual-wield (Righthand / Lefthand Mastery)
  [ClassName.GuillotineCross]: true,
  [ClassName.ShadowCross]: true,
  [ClassName.Oboro]: true,
  [ClassName.Shiranui]: true,
  [ClassName.Kagerou]: true,
  [ClassName.Shinkiro]: true,
} as const;
