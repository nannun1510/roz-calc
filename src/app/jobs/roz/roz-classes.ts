/**
 * Ragnarok Zero: Global classes.
 *
 * Each ROZ class reuses an engine class for its passive/buff logic (masteries, Two-Hand
 * Quicken, …), then:
 *  - keeps only the passives/buffs whose name is in the ROZ client skill tree,
 *  - replaces every attack skill with the ROZ versions generated from the client
 *    (ratio / hits / element / timings: see tools/roz/gen-skills.py),
 *  - uses ROZ level caps and the plain 1st/2nd job name (item equip checks, HP/SP table).
 *
 * Not modelled yet (no ratio in the client text, or a special formula): see
 * tools/roz/roz-skills-not-modelled.json.
 */
import { ElementType } from '../../constants';
import { ClassName } from '../_class-name';
import { AtkSkillModel, CharacterBase } from '../_character-base.abstract';
import { Acolyte } from '../Acolyte';
import { Archer } from '../Archer';
import { AssassinCross } from '../AssassinCross';
import { Bard } from '../Bard';
import { Champion } from '../Champion';
import { Creator } from '../Creator';
import { Dancer } from '../Dancer';
import { HighPriest } from '../HighPriest';
import { HighWizard } from '../HighWizard';
import { LordKnight } from '../LordKnight';
import { Mage } from '../Mage';
import { Merchant } from '../Merchant';
import { Paladin } from '../Paladin';
import { Scholar } from '../Scholar';
import { Sniper } from '../Sniper';
import { Stalker } from '../Stalker';
import { Swordman } from '../Swordman';
import { Thief } from '../Thief';
import { Whitesmith } from '../Whitesmith';
import { SuperNovice } from '../SuperNovice';
import { ArchBishop } from '../ArchBishop';
import { Sura } from '../Sura';
import { Mechanic } from '../Mechanic';
import { Genetic } from '../Genetic';
import { GuillotineCross } from '../GuillotineCross';
import { Minstrel } from '../Minstrel';
import { Wanderer } from '../Wanderer';
import { Ranger } from '../Ranger';
import { ShadowChaser } from '../ShadowChaser';
import { RoyalGuard } from '../RoyalGuard';
import { RuneKnight } from '../RuneKnight';
import { Warlock } from '../Warlock';
import { Sorcerer } from '../Sorcerer';
import { ROZ_ATK_SKILLS, ROZ_SKILL_TREE, RozAtkSpec } from './roz-data.generated';

/** ROZ Global caps (Sept 2026 patch: Base 60 / Job 60). Kept at the classic 99 / 50-70 so builds can be planned ahead. */
export const ROZ_MAX_BASE_LEVEL = 99;
const ROZ_MAX_JOB_1ST = 50;
const ROZ_MAX_JOB_2ND = 70;

const ELEMENT: Record<string, ElementType> = {
  Neutral: ElementType.Neutral, Water: ElementType.Water, Earth: ElementType.Earth, Fire: ElementType.Fire, Wind: ElementType.Wind,
  Poison: ElementType.Poison, Holy: ElementType.Holy, Dark: ElementType.Dark, Ghost: ElementType.Ghost, Undead: ElementType.Undead,
};

const STAT_KEY: Record<string, string> = { str: 'totalStr', agi: 'totalAgi', vit: 'totalVit', int: 'totalInt', dex: 'totalDex', luk: 'totalLuk' };

/** ROZ skill rules that the generated table (ratios / timings) cannot express, from the client skill text. */
const ROZ_SKILL_OVERRIDES: Record<string, Partial<AtkSkillModel> & Record<string, any>> = {
  // "Has an additional chance equal to 50% of the caster's CRIT to apply Critical Damage.
  //  Only half of the total Critical Damage bonus is applied."
  'Focused Arrow Strike': { canCri: true, baseCriPercentage: 0.5, criDmgPercentage: 0.5, rozCritNote: 'Crit chance = 50% of your CRIT · half of Crit Damage bonus' },
};

export function rozAtkSkill(spec: RozAtkSpec): AtkSkillModel {
  return { ...rozAtkSkillBase(spec), ...(ROZ_SKILL_OVERRIDES[spec.name] || {}) } as AtkSkillModel;
}

function rozAtkSkillBase(spec: RozAtkSpec): AtkSkillModel {
  const at = (arr: number[], skillLevel: number) => arr[Math.min(Math.max(skillLevel, 1), spec.maxLv) - 1] ?? arr[arr.length - 1];
  const sec = (arr: number[]) => (skillLevel: number) => at(arr, skillLevel) / 1000;
  return {
    name: spec.name as any,
    label: `${spec.name} Lv${spec.maxLv}`,
    value: `${spec.name}==${spec.maxLv}`,
    levelList: Array.from({ length: spec.maxLv }, (_, i) => ({ label: `${spec.name} Lv${i + 1}`, value: `${spec.name}==${i + 1}` })),
    fct: sec(spec.fct),
    vct: sec(spec.vct),
    acd: sec(spec.acd),
    cd: sec(spec.cd),
    isMatk: spec.type === 'magic',
    isMelee: spec.type === 'melee',
    ...(spec.element ? { element: ELEMENT[spec.element] } : {}),
    ...(spec.hits ? { totalHit: ({ skillLevel }: { skillLevel: number }) => at(spec.hits as number[], skillLevel) } : {}),
    ...(spec.timingKnown ? {} : { timingUnknown: true }),
    formula: (input) => {
      const ratio = at(spec.ratio, input.skillLevel);
      const extra = spec.extra?.statPctPerLv;
      return extra ? ratio + ((input.status as any)?.[STAT_KEY[extra]] ?? 0) * input.skillLevel : ratio;
    },
  };
}

/**
 * ROZ auto-attack proc skills, picked in the Skill dropdown. Selecting one shows the
 * "Auto attack procs" table (damage per proc, DPS, auto attack + procs DPS).
 *  - Duple Light (Priest, client text): Strike 500+50*Lv % ATK, Magic 800+80*Lv % MATK.
 *    Proc chance is not in the client: official server code rolls each light separately
 *    at 10+2*Lv % on a melee auto attack that hits (can be overridden on the page).
 *  - Spell Fist (Sage, client text): 5*Lv % chance, 100*Lv % MATK of the bolt's element.
 */
const procSkill = (name: string, label: string, proc: any, isMatk: boolean, ratio: (lv: number) => number): AtkSkillModel =>
  ({
    name: name as any,
    label: `${label} Lv10`,
    value: `${label}==10`,
    levelList: Array.from({ length: 10 }, (_, i) => ({ label: `${label} Lv${i + 1}`, value: `${label}==${i + 1}` })),
    acd: 0, fct: 0, vct: 0, cd: 0,
    isMatk,
    isMelee: !isMatk,
    ...(proc.element ? { element: proc.element } : {}),
    rozProc: proc,
    formula: ({ skillLevel }) => ratio(skillLevel),
  }) as any;

export const ROZ_PROC_SKILLS: Record<string, AtkSkillModel[]> = {
  'Duple Light': [procSkill('Duple Light', 'Duple Light (auto attack)', { kind: 'duple' }, false, (lv) => 500 + 50 * lv)],
  'Spell Fist': [
    procSkill('Spell Fist', 'Spell Fist - Fire Bolt (auto attack)', { kind: 'fist', element: ElementType.Fire }, true, (lv) => 100 * lv),
    procSkill('Spell Fist', 'Spell Fist - Cold Bolt (auto attack)', { kind: 'fist', element: ElementType.Water }, true, (lv) => 100 * lv),
    procSkill('Spell Fist', 'Spell Fist - Lightning Bolt (auto attack)', { kind: 'fist', element: ElementType.Wind }, true, (lv) => 100 * lv),
  ],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Engine skill names that differ from the ROZ English client name. */
const NAME_ALIAS: Record<string, string> = {
  ironfists: 'ironhand',
  musiclessons: 'musicallesson',
  dancelessons: 'dancinglesson',
  twohandedswordmastery: 'twohandedswordmastery',
};

/** Engine classes that hold 1st/2nd-job passives under their own trees (Mace Mastery in
 *  Arch Bishop, Iron Hand in Sura, Double Attack in Super Novice, …). Searched by name for
 *  ROZ tree skills the base class does not carry. Built once, lazily. */
let donorIndex: Map<string, { kind: '_passiveSkillList' | '_activeSkillList'; skill: any }> | undefined;
function donors() {
  if (donorIndex) return donorIndex;
  donorIndex = new Map();
  for (const C of [SuperNovice, ArchBishop, Sura, Mechanic, Genetic, GuillotineCross, Minstrel, Wanderer, Ranger, ShadowChaser, RoyalGuard, RuneKnight, Warlock, Sorcerer]) {
    const inst: any = new (C as any)();
    for (const kind of ['_passiveSkillList', '_activeSkillList'] as const) {
      for (const skill of inst[kind] as { name: string }[]) {
        const key = norm(skill.name);
        if (!donorIndex.has(key)) donorIndex.set(key, { kind, skill });
      }
    }
  }
  return donorIndex;
}

interface RozClassConfig {
  className: ClassName;
  /** 1st job (or itself for a 1st job) — for the skill tree and item checks. */
  firstJob: ClassName;
  isSecond: boolean;
}

type Ctor = new () => CharacterBase;

function makeRozClass(Base: Ctor, cfg: RozClassConfig): Ctor {
  const treeNames = [
    ...(ROZ_SKILL_TREE[cfg.firstJob] ?? []),
    ...(cfg.isSecond ? ROZ_SKILL_TREE[cfg.className] ?? [] : []),
  ].map((s) => s.name);
  const allowed = new Set(treeNames.map(norm).map((n) => NAME_ALIAS[n] ?? n));
  const atk = ROZ_ATK_SKILLS.filter((s) => treeNames.includes(s.name) && !ROZ_PROC_SKILLS[s.name]).map(rozAtkSkill);
  for (const [name, list] of Object.entries(ROZ_PROC_SKILLS)) if (treeNames.includes(name)) atk.push(...list);

  return class extends (Base as any) {
    constructor() {
      super();
      const self = this as any;
      self.CLASS_NAME = cfg.className;
      self.classNames.splice(0, self.classNames.length, cfg.firstJob, ...(cfg.isSecond ? [cfg.className] : []));
      self._atkSkillList.splice(0, self._atkSkillList.length, ...atk);
      for (const key of ['_passiveSkillList', '_activeSkillList']) {
        const list: { name: string }[] = self[key];
        const keep = list.filter((s) => allowed.has(norm(s.name)));
        list.splice(0, list.length, ...keep);
      }
      const have = new Set([...self._passiveSkillList, ...self._activeSkillList].map((x: { name: string }) => norm(x.name)));
      const atkNames = new Set(atk.map((a) => norm(a.name)));
      for (const key of allowed) {
        if (have.has(key) || atkNames.has(key)) continue;
        const d = donors().get(key);
        if (d) { self[d.kind].push(d.skill); have.add(key); }
      }
      self.minMaxLevel = [1, ROZ_MAX_BASE_LEVEL];
      self.maxJob = cfg.isSecond ? ROZ_MAX_JOB_2ND : ROZ_MAX_JOB_1ST;
    }

    get className() { return cfg.className; }
    get minMaxLevelCap() { return { minMaxLevel: [1, ROZ_MAX_BASE_LEVEL] as [number, number], maxJob: cfg.isSecond ? ROZ_MAX_JOB_2ND : ROZ_MAX_JOB_1ST }; }
    get maxBaseStat() { return 99; }

    /** ROZ: race/element "bane" mastery ATK (Beast Bane, Demon Bane, ...) — some engine
     *  base classes (e.g. Sniper) never add it, so add it here unless the base already does. */
    getMasteryAtk(info: any): number {
      const base = super.getMasteryAtk(info) || 0;
      const src = String((Base as any).prototype.getMasteryAtk);
      if (/getMasteryAtkByMonsterRace|x_race_/.test(src)) return base;
      const self = this as any;
      const race = self.getMasteryAtkByMonsterRace(info?.monster?.race)?.totalAtk || 0;
      const ele = self.getMasteryAtkByMonsterElement(info?.monster?.element)?.totalAtk || 0;
      return base + race + ele;
    }
    get excludedJobLevels(): number[] { return []; }
    get isExpandedClass() { return false; }
    /** ROZ has no trait stats (POW/STA/WIS/SPL/CON/CRT). */
    isAllowTraitStat() { return false; }
    /** Only the ROZ skills: the base getter also injects Wind Cutter for every class. */
    get atkSkills(): AtkSkillModel[] { return [...(this as any)._atkSkillList]; }
  } as unknown as Ctor;
}

/** id (internal, ROZ range 9000+) → [constructor, real job id for the icon, English label]. */
export const ROZ_CLASSES: [id: number, ctor: Ctor, jobId: number, label: string][] = [
  [9001, makeRozClass(Swordman, { className: ClassName.Swordman, firstJob: ClassName.Swordman, isSecond: false }), 1, 'Swordman'],
  [9007, makeRozClass(LordKnight, { className: ClassName.Knight, firstJob: ClassName.Swordman, isSecond: true }), 7, 'Knight'],
  [9014, makeRozClass(Paladin, { className: ClassName.Crusader, firstJob: ClassName.Swordman, isSecond: true }), 14, 'Crusader'],

  [9002, makeRozClass(Mage, { className: ClassName.Mage, firstJob: ClassName.Mage, isSecond: false }), 2, 'Mage'],
  [9009, makeRozClass(HighWizard, { className: ClassName.Wizard, firstJob: ClassName.Mage, isSecond: true }), 9, 'Wizard'],
  [9016, makeRozClass(Scholar, { className: ClassName.Sage, firstJob: ClassName.Mage, isSecond: true }), 16, 'Sage'],

  [9003, makeRozClass(Archer, { className: ClassName.Archer, firstJob: ClassName.Archer, isSecond: false }), 3, 'Archer'],
  [9011, makeRozClass(Sniper, { className: ClassName.Hunter, firstJob: ClassName.Archer, isSecond: true }), 11, 'Hunter'],
  [9019, makeRozClass(Bard, { className: ClassName.Bard, firstJob: ClassName.Archer, isSecond: true }), 19, 'Bard'],
  [9020, makeRozClass(Dancer, { className: ClassName.Dancer, firstJob: ClassName.Archer, isSecond: true }), 20, 'Dancer'],

  [9004, makeRozClass(Acolyte, { className: ClassName.Acolyte, firstJob: ClassName.Acolyte, isSecond: false }), 4, 'Acolyte'],
  [9008, makeRozClass(HighPriest, { className: ClassName.Priest, firstJob: ClassName.Acolyte, isSecond: true }), 8, 'Priest'],
  [9015, makeRozClass(Champion, { className: ClassName.Monk, firstJob: ClassName.Acolyte, isSecond: true }), 15, 'Monk'],

  [9005, makeRozClass(Merchant, { className: ClassName.Merchant, firstJob: ClassName.Merchant, isSecond: false }), 5, 'Merchant'],
  [9010, makeRozClass(Whitesmith, { className: ClassName.Blacksmith, firstJob: ClassName.Merchant, isSecond: true }), 10, 'Blacksmith'],
  [9018, makeRozClass(Creator, { className: ClassName.Alchemist, firstJob: ClassName.Merchant, isSecond: true }), 18, 'Alchemist'],

  [9006, makeRozClass(Thief, { className: ClassName.Thief, firstJob: ClassName.Thief, isSecond: false }), 6, 'Thief'],
  [9012, makeRozClass(AssassinCross, { className: ClassName.Assassin, firstJob: ClassName.Thief, isSecond: true }), 12, 'Assassin'],
  [9017, makeRozClass(Stalker, { className: ClassName.Rogue, firstJob: ClassName.Thief, isSecond: true }), 17, 'Rogue'],
];
