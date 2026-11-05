import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ROZ_AUTO_SPELLS } from '../../../../jobs/roz/roz-procs';
import { ROZ_ATK_SKILLS } from '../../../../jobs/roz/roz-data.generated';

type Tab = 'learn' | 'self' | 'party' | 'debuff';
interface SkillLike { name: string; label: string; inputType?: string; isDebuff?: boolean; dropdown: { label: string; value: any; isUse?: boolean }[] }
interface RowRef { tab: Tab; arr: 'passiveSkills' | 'activeSkills' | 'skillBuffs'; i: number; skill: SkillLike }

/** Party buff groups (by the class that casts them), for the Party buffs tab. */
const BUFF_GROUPS: [string, string[]][] = [
  ['Acolyte / Priest', ['Blessing', 'Increase Agility', 'Angelus', 'Impositio Manus', 'Gloria', 'Suffragium']],
  ['Merchant / Blacksmith', ['Crazy Uproar', 'Adrenaline Rush', 'Power Thrust', 'Weapon Perfection']],
  ['Swordman', ['Magnum Break']],
  ['Wizard / Sage', ['Mystical Amplification', 'Volcano', 'Deluge', 'Whirlwind']],
  ['Bard / Dancer', ['Impressive Riff', 'Magic Strings', 'Perfect Tablature', 'Song of Lutie', 'Lady Luck', 'Focus Ballet', "Gypsy's Kiss", 'Battle Theme']],
];

const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

@Component({
  selector: 'roz-skill-panel',
  templateUrl: './roz-skill-panel.component.html',
  styleUrls: ['./roz-skill-panel.component.css'],
})
export class RozSkillPanelComponent {
  @Input() model: any;
  @Input() skillBuffs: SkillLike[] = [];
  @Input() passiveSkills: SkillLike[] = [];
  @Input() activeSkills: SkillLike[] = [];
  /** ROZ auto attack procs this class has: spellFist / autoSpell / luckyCast / duple */
  @Input() procs: string[] = [];
  @Input() isAutoAttackSelected = false;
  @Output() changed = new EventEmitter<void>();
  @Output() useAutoAttack = new EventEmitter<void>();

  tab: Tab = (store.get('roz-skill-tab') as Tab) || 'party';
  query = '';
  activeOnly = false;
  closedGroups = new Set<string>(JSON.parse(store.get('roz-skill-closed') || '[]'));
  customOpen = false;

  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'learn', label: 'Learned (passives)' },
    { id: 'self', label: 'Self skills' },
    { id: 'party', label: 'Party buffs' },
    { id: 'debuff', label: 'Monster debuffs' },
  ];
  readonly sfOptions = [
    { label: 'Off', value: '' }, { label: 'Fire Bolt', value: 'Fire' }, { label: 'Cold Bolt', value: 'Water' }, { label: 'Lightning Bolt', value: 'Wind' },
  ];
  readonly lv10 = Array.from({ length: 10 }, (_, i) => ({ label: `Lv ${i + 1}`, value: i + 1 }));
  readonly lv10off = [{ label: 'Off', value: 0 }, ...this.lv10];
  readonly lv5off = [{ label: 'Off', value: 0 }, ...this.lv10.slice(0, 5)];

  // ---------- rows ----------
  private rowsCache: { key: string; rows: RowRef[] } = { key: '', rows: [] };
  get rows(): RowRef[] {
    const key = `${this.passiveSkills.length}|${this.activeSkills.length}|${this.skillBuffs.length}|${this.passiveSkills[0]?.name}|${this.activeSkills[0]?.name}`;
    if (this.rowsCache.key === key) return this.rowsCache.rows;
    const rows: RowRef[] = [];
    this.passiveSkills.forEach((skill, i) => rows.push({ tab: 'learn', arr: 'passiveSkills', i, skill }));
    this.activeSkills.forEach((skill, i) => rows.push({ tab: skill.isDebuff ? 'debuff' : 'self', arr: 'activeSkills', i, skill }));
    this.skillBuffs.forEach((skill, i) => rows.push({ tab: skill.isDebuff ? 'debuff' : 'party', arr: 'skillBuffs', i, skill }));
    this.rowsCache = { key, rows };
    return rows;
  }
  private tabCache = new Map<string, RowRef[]>();
  rowsOf(tab: Tab) {
    const rows = this.rows;
    const key = `${this.rowsCache.key}#${tab}`;
    if (!this.tabCache.has(key)) this.tabCache.set(key, rows.filter((r) => r.tab === tab));
    return this.tabCache.get(key)!;
  }

  private groupCache: { src: RowRef[] | null; out: { name: string; rows: RowRef[] }[] } = { src: null, out: [] };
  get groups(): { name: string; rows: RowRef[] }[] {
    const party = this.rowsOf('party');
    if (this.groupCache.src === party) return this.groupCache.out;
    const used = new Set<RowRef>();
    const out = BUFF_GROUPS.map(([name, names]) => {
      const rows = party.filter((r) => names.includes(r.skill.name));
      rows.forEach((r) => used.add(r));
      return { name, rows };
    });
    const rest = party.filter((r) => !used.has(r));
    if (rest.length) out.push({ name: 'Other', rows: rest });
    this.groupCache = { src: party, out: out.filter((g) => g.rows.length) };
    return this.groupCache.out;
  }

  value(r: RowRef) { return this.model?.[r.arr]?.[r.i]; }
  isOn(r: RowRef) {
    const v = this.value(r);
    const opt = r.skill.dropdown?.find((o) => o.value === v);
    return !!opt?.isUse;
  }
  name(r: RowRef) { return (r.skill.label || r.skill.name).replace(/\s*\(.*\)\s*$/, ''); }
  hint(r: RowRef) { const m = (r.skill.label || '').match(/\((.*)\)\s*$/); return m ? m[1] : ''; }
  /** two options, one on and one off -> a switch */
  isSwitch(r: RowRef) { const d = r.skill.dropdown || []; return d.length === 2 && d.some((o) => o.isUse) && d.some((o) => !o.isUse); }
  toggle(r: RowRef) {
    const d = r.skill.dropdown;
    const target = d.find((o) => !!o.isUse !== this.isOn(r));
    if (!target) return;
    this.model[r.arr][r.i] = target.value;
    this.changed.emit();
  }
  visible(r: RowRef) {
    if (this.activeOnly && !this.isOn(r)) return false;
    const q = this.query.trim().toLowerCase();
    return !q || (r.skill.label || r.skill.name).toLowerCase().includes(q);
  }
  countOn(tab: Tab) {
    let n = this.rowsOf(tab).filter((r) => this.isOn(r)).length;
    if (tab === 'self') n += this.procOnCount;
    return n;
  }
  get activeRows() { return this.rows.filter((r) => this.isOn(r)); }
  /** typing in the search box shows matches from every tab */
  get searching() { return !!this.query.trim(); }

  setTab(t: Tab) { this.tab = t; store.set('roz-skill-tab', t); }
  toggleGroup(name: string) {
    this.closedGroups.has(name) ? this.closedGroups.delete(name) : this.closedGroups.add(name);
    store.set('roz-skill-closed', JSON.stringify([...this.closedGroups]));
  }
  groupOn(g: { rows: RowRef[] }) { return g.rows.filter((r) => this.isOn(r)); }
  isGroupOpen(name: string) { return this.searching || this.activeOnly || !this.closedGroups.has(name); }
  onChange() { this.changed.emit(); }
  trackRow = (_: number, r: RowRef) => `${r.arr}-${r.i}-${r.skill.name}`;

  // ---------- auto attack procs ----------
  has(p: string) { return this.procs?.includes(p); }
  get procOnCount() {
    const m = this.model || {};
    return (this.has('spellFist') && m.rozSpellFist ? 1 : 0) + (this.has('autoSpell') && m.rozAutoSpell ? 1 : 0)
      + (this.has('luckyCast') && m.rozLuckyCastLv > 0 ? 1 : 0) + (this.has('duple') && m.rozDupleLv > 0 ? 1 : 0);
  }
  private asOptCache: { lv: number; opts: any[] } = { lv: -1, opts: [] };
  get autoSpellOptions() {
    const lv = Number(this.model?.rozAutoSpellLv) || 10;
    if (this.asOptCache.lv === lv) return this.asOptCache.opts;
    const castLv = (spell: string) => {
      const max = ROZ_ATK_SKILLS.find((x) => x.name === spell)?.maxLv ?? 10;
      return Math.max(1, Math.min(max, Math.floor(lv / 2)));
    };
    const opts = [
      { label: 'Off', value: '', disabled: false },
      ...ROZ_AUTO_SPELLS.map(([spell, minLv]) => ({
        label: lv < minLv ? `${spell} (needs Auto Spell Lv ${minLv})` : `${spell} (casts Lv ${castLv(spell)})`,
        value: spell,
        disabled: lv < minLv,
      })),
    ];
    this.asOptCache = { lv, opts };
    return opts;
  }
  get sfHint() { const lv = Number(this.model?.rozSpellFistLv) || 10; return `${5 * lv}% · ${100 * lv}% MATK`; }
  get asHint() { const lv = Number(this.model?.rozAutoSpellLv) || 10; return `${2 * lv}% per normal hit`; }
  get lcHint() { const lv = Number(this.model?.rozLuckyCastLv) || 0; return lv ? `${30 + 10 * lv}% bolt repeat` : 'repeats Auto Spell bolts'; }
  get dupleHint() { const lv = Number(this.model?.rozDupleLv) || 0; return lv ? `${10 + 2 * lv}% each light` : 'Strike + Magic'; }
  get isCustom() { return this.customOpen || (Number(this.model?.rozProcChance) || 0) > 0 || (Number(this.model?.rozProcChance2) || 0) > 0; }
  onCustomToggle(on: boolean) {
    this.customOpen = on;
    if (!on) {
      this.model.rozProcChance = 0;
      this.model.rozProcChance2 = 0;
      this.changed.emit();
    }
  }
}
