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
import { RighthandMasteryFn } from '../../constants/share-passive-skills';
import { AspdTable } from '../_aspd-table';
import { RozAspdTable } from './roz-aspd-table';
import { ROZ_AUTO_SPELLS, ROZ_PROC_TREE } from './roz-procs';
export { ROZ_AUTO_SPELLS, ROZ_PROC_TREE } from './roz-procs';

// ROZ 1st/2nd job base ASPD per weapon (Tong only has 3rd/4th job rows; others fell back to a flat 156)
Object.assign(AspdTable as any, RozAspdTable);

/** ROZ skills the engine classes do not have (values from the ROZ client skill text).
 *  Weapon-dependent parts are applied in getMasteryAtk / setAdditionalBonus below. */
const lvs = (n: number, fn: (l: number) => Record<string, number> = () => ({})) => [
  { label: '-', value: 0, isUse: false },
  ...Array.from({ length: n }, (_, i) => ({ label: `Lv ${i + 1}`, value: i + 1, skillLv: i + 1, isUse: true, bonus: fn(i + 1) })),
];
const ROZ_EXTRA_PASSIVES: Record<string, any> = {
  Study: { name: 'Study', label: 'Study (Book: dmg +3/Lv, ASPD)', inputType: 'dropdown', dropdown: lvs(10) },
  'Music Lessons': { name: 'Music Lessons', label: 'Music Lessons (Instrument)', inputType: 'dropdown', dropdown: lvs(10, (l) => ({ spPercent: l })) },
  'Dance Lessons': { name: 'Dance Lessons', label: 'Dance Lessons (Whip)', inputType: 'dropdown', dropdown: lvs(10, (l) => ({ spPercent: l })) },
  Flee: { name: 'Flee', label: 'Flee', inputType: 'dropdown', dropdown: lvs(10, (l) => ({ flee: [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15][l] })) },
  'Righthand Mastery': RighthandMasteryFn(),
  // ROZ: HIT +1% per level (the double hit itself is shown by "Auto Attack" in the Skill list)
  'Double Attack': { name: 'Double Attack', label: 'Double Attack (Dagger)', inputType: 'dropdown', dropdown: lvs(10, (l) => ({ hitPercent: l })) },
  // Priest: party Blessing / Increase AGI centred on the caster; stronger with the caster's Job Lv.
  // Applied to yourself in setAdditionalBonus (assumes Blessing / Increase AGI Lv10).
  Clementia: { name: 'Clementia', label: 'Clementia (Blessing 10 + JobLv/10)', inputType: 'dropdown', dropdown: lvs(3) },
  Cantocandidus: { name: 'Cantocandidus', label: 'Cantocandidus (Inc AGI 10 + JobLv/10)', inputType: 'dropdown', dropdown: lvs(3) },
};

/** ROZ Clementia / Cantocandidus value for a caster Job Lv (Tong / official: + JobLv / 10). */
export const rozClementia = (jobLv: number) => ({ str: 10 + Math.floor(jobLv / 10), int: 10 + Math.floor(jobLv / 10), dex: 10 + Math.floor(jobLv / 10), hit: 20 + Math.floor(jobLv / 10) });
export const rozCantocandidus = (jobLv: number) => ({ agi: 12 + Math.floor(jobLv / 10), aspdPercent: 10 + Math.floor(jobLv / 10) });
const ROZ_EXTRA_ACTIVES: Record<string, any> = {
  // ROZ text (EN/TH/KR): only a strong poison status, no damage increase (Tong's EDP gives a big damage boost)
  'Enchant Deadly Poison': { name: 'Enchant Deadly Poison', label: 'Enchant Deadly Poison (poison only)', inputType: 'selectButton', dropdown: [{ label: 'Yes', value: 1, isUse: true, bonus: {} }, { label: 'No', value: 0, isUse: false }] },
  Fury: { name: 'Fury', label: 'Fury (CRIT)', inputType: 'dropdown', dropdown: lvs(5, (l) => ({ cri: 7.5 + 2.5 * l })) },
  'Summon Spirit Sphere': { name: 'Summon Spirit Sphere', label: 'Spirit Spheres (+3 dmg each)', inputType: 'dropdown', dropdown: lvs(5) },
  // Sage endows (ROZ EN client name; Thai client: Flame Launcher / Lightning Loader / Frost Weapon / Seismic Weapon).
  // Element magic damage +1%/Lv; the weapon element itself is picked in the weapon element box.
  'Endow Blaze': { name: 'Endow Blaze', label: 'Endow Blaze / Flame Launcher (Fire magic +Lv%)', inputType: 'dropdown', dropdown: lvs(5, (l) => ({ m_my_element_fire: l })) },
  'Endow Tornado': { name: 'Endow Tornado', label: 'Endow Tornado / Lightning Loader (Wind magic +Lv%)', inputType: 'dropdown', dropdown: lvs(5, (l) => ({ m_my_element_wind: l })) },
  'Endow Tsunami': { name: 'Endow Tsunami', label: 'Endow Tsunami / Frost Weapon (Water magic +Lv%)', inputType: 'dropdown', dropdown: lvs(5, (l) => ({ m_my_element_water: l })) },
  'Endow Quake': { name: 'Endow Quake', label: 'Endow Quake / Seismic Weapon (Earth magic +Lv%)', inputType: 'dropdown', dropdown: lvs(5, (l) => ({ m_my_element_earth: l })) },
};

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
 * ROZ auto attack (Skill list "Auto Attack"): Double Attack / dual wield / katar rows, plus the
 * class procs set in the Self skills tab (damage-calculator.ts calcRozProcs):
 *  - Duple Light (Priest, client text): Strike 500+50*Lv % ATK, Magic 800+80*Lv % MATK.
 *    Proc chance is not in the client: official server code rolls each light at 10+2*Lv %.
 *  - Spell Fist (Sage, client text): 5*Lv % chance, 100*Lv % MATK of the bolt's element.
 *  - Hindsight / Auto Spell (Sage, client text): 2*Lv % per normal hit, spell at half the level.
 *  - Double Bolt / Lucky Cast (Sage, client text): 30+10*Lv % that a Bolt is cast again.
 */
const AUTO_ATTACK_SKILL: AtkSkillModel = {
  name: 'Auto Attack' as any,
  label: 'Auto Attack (Double Attack / Dual wield / Katar)',
  value: 'Auto Attack (Double Attack / Dual wield / Katar)==1',
  acd: 0, fct: 0, vct: 0, cd: 0, isMelee: true,
  rozProc: { kind: 'auto' },
  formula: () => 100,
} as any;


const autoAttackSkill = (procNames: string[], treeNames: string[]): AtkSkillModel => {
  const extra = procNames.filter((n) => n !== 'Double Bolt').map((n) => (n === 'Hindsight' ? 'Auto Spell' : n));
  const label = extra.length ? `Auto Attack (+ ${extra.join(' / ')})` : treeNames.includes('Double Attack') ? AUTO_ATTACK_SKILL.label : 'Auto Attack';
  return { ...AUTO_ATTACK_SKILL, label } as AtkSkillModel;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Engine skill names that differ from the ROZ English client name. */
const NAME_ALIAS: Record<string, string> = {
  ironfists: 'ironhand',
  maximizepower: 'powermaximize',
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
  const atk = ROZ_ATK_SKILLS.filter((s) => treeNames.includes(s.name) && !ROZ_PROC_TREE[s.name]).map(rozAtkSkill);
  const procNames = Object.keys(ROZ_PROC_TREE).filter((n) => treeNames.includes(n));
  // every class can auto attack (Sidewinder Card / Double Attack Stone work with any weapon)
  atk.push(autoAttackSkill(procNames, treeNames));

  return class extends (Base as any) {
    constructor() {
      super();
      const self = this as any;
      self.CLASS_NAME = cfg.className;
      self.classNames.splice(0, self.classNames.length, cfg.firstJob, ...(cfg.isSecond ? [cfg.className] : []));
      self._atkSkillList.splice(0, self._atkSkillList.length, ...atk);
      for (const key of ['_passiveSkillList', '_activeSkillList']) {
        const list: { name: string }[] = self[key];
        const extra = new Set([...Object.keys(ROZ_EXTRA_PASSIVES), ...Object.keys(ROZ_EXTRA_ACTIVES)].map(norm));
        const keep = list.filter((s) => allowed.has(norm(s.name)) && !extra.has(norm(s.name)));
        list.splice(0, list.length, ...keep);
      }
      const have = new Set([...self._passiveSkillList, ...self._activeSkillList].map((x: { name: string }) => norm(x.name)));
      const atkNames = new Set(atk.map((a) => norm(a.name)));
      for (const key of allowed) {
        if (have.has(key) || atkNames.has(key)) continue;
        if (Object.keys(ROZ_EXTRA_PASSIVES).some((n) => norm(n) === key) || Object.keys(ROZ_EXTRA_ACTIVES).some((n) => norm(n) === key)) continue;
        const d = donors().get(key);
        if (d) { self[d.kind].push(d.skill); have.add(key); }
      }
      for (const n of treeNames) {
        const k = norm(n);
        if (have.has(k)) continue;
        if (ROZ_EXTRA_PASSIVES[n]) { self._passiveSkillList.push(ROZ_EXTRA_PASSIVES[n]); have.add(k); }
        else if (ROZ_EXTRA_ACTIVES[n]) { self._activeSkillList.push(ROZ_EXTRA_ACTIVES[n]); have.add(k); }
      }
      // Sage: learned levels of the spells Auto Spell can cast (Auto Spell casts half its level, capped by this)
      if (treeNames.includes('Hindsight')) {
        for (const [spell] of ROZ_AUTO_SPELLS) {
          if (have.has(norm(spell))) continue;
          const max = ROZ_ATK_SKILLS.find((x) => x.name === spell)?.maxLv ?? 10;
          self._passiveSkillList.push({ name: spell, label: `${spell} (learned Lv, caps Auto Spell)`, inputType: 'dropdown', dropdown: lvs(max) });
          have.add(norm(spell));
        }
      }
      self.minMaxLevel = [1, ROZ_MAX_BASE_LEVEL];
      self.maxJob = cfg.isSecond ? ROZ_MAX_JOB_2ND : ROZ_MAX_JOB_1ST;
    }

    get className() { return cfg.className; }
    /** ROZ auto attack procs this class has (ids from ROZ_PROC_TREE), for the Self skills proc box. */
    get rozProcs(): string[] { return Object.entries(ROZ_PROC_TREE).filter(([n]) => treeNames.includes(n)).map(([, id]) => id); }
    get minMaxLevelCap() { return { minMaxLevel: [1, ROZ_MAX_BASE_LEVEL] as [number, number], maxJob: cfg.isSecond ? ROZ_MAX_JOB_2ND : ROZ_MAX_JOB_1ST }; }
    get maxBaseStat() { return 99; }
    /** ROZ: normal (non-transcendent) characters start with 48 status points (Tong default is 100) */
    get initialStatPoint() { return 48; }

    /** ROZ: race/element "bane" mastery ATK (Beast Bane, Demon Bane, ...) — some engine
     *  base classes (e.g. Sniper) never add it, so add it here unless the base already does. */
    getMasteryAtk(info: any): number {
      const base = super.getMasteryAtk(info) || 0;
      const src = String((Base as any).prototype.getMasteryAtk);
      if (/getMasteryAtkByMonsterRace|x_race_/.test(src)) return base + this.rozWeaponMastery(info);
      const self = this as any;
      const race = self.getMasteryAtkByMonsterRace(info?.monster?.race)?.totalAtk || 0;
      const ele = self.getMasteryAtkByMonsterElement(info?.monster?.element)?.totalAtk || 0;
      return base + race + ele + this.rozWeaponMastery(info);
    }

    /** ROZ class masteries that depend on the weapon (Study, Music/Dance Lessons) + Spirit Spheres */
    rozWeaponMastery(info: any): number {
      const self = this as any;
      const w = info?.weapon?.data?.typeName;
      let atk = 0;
      if (w === 'book') atk += 3 * (self.learnLv('Study') || 0);
      if (w === 'instrument') atk += 3 * (self.learnLv('Music Lessons') || 0);
      if (w === 'whip') atk += 3 * (self.learnLv('Dance Lessons') || 0);
      atk += 3 * (self.activeSkillLv('Summon Spirit Sphere') || 0);
      return atk;
    }

    setAdditionalBonus(params: any) {
      const total = super.setAdditionalBonus(params);
      const self = this as any;
      const w = params?.weapon?.data?.typeName;
      const add = (k: string, v: number) => { if (v) (total as any)[k] = ((total as any)[k] || 0) + v; };
      if (w === 'book') add('aspdPercent', 0.5 * (self.learnLv('Study') || 0));
      if (w === 'instrument') add('aspdPercent', self.learnLv('Music Lessons') || 0);
      if (w === 'whip') add('cri', self.learnLv('Dance Lessons') || 0);
      // Priest casting Clementia / Cantocandidus also buffs themself (Buffs panel Blessing / Increase AGI is then ignored)
      const job = Number(params?.model?.jobLevel) || 0;
      if ((self.learnLv('Clementia') || 0) > 0) for (const [k, v] of Object.entries(rozClementia(job))) add(k, v as number);
      if ((self.learnLv('Cantocandidus') || 0) > 0) for (const [k, v] of Object.entries(rozCantocandidus(job))) add(k, v as number);
      return total;
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
