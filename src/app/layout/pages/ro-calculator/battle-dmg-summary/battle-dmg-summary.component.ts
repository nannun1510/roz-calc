import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-battle-dmg-summary',
  templateUrl: './battle-dmg-summary.component.html',
  styleUrls: ['./battle-dmg-summary.component.css', '../ro-calculator.component.css'],
})
export class BattleDmgSummaryComponent {
  /** names of ROZ auto attack procs switched on in the Skills panel (they only count with Skill = Auto Attack) */
  get rozProcsOn(): string {
    const m: any = this.model || {};
    return [m.rozSpellFist && 'Spell Fist', m.rozAutoSpell && 'Auto Spell', m.rozDupleLv > 0 && 'Duple Light'].filter(Boolean).join(', ');
  }

  @Input({ required: true }) model = {} as any;
  @Input({ required: true }) totalSummary = {} as any;
  @Input({ required: true }) totalSummary2 = {} as any;
  @Input({ required: true }) isCalculating: boolean;
  @Input({ required: true }) isEnableCompare: boolean;
  @Input({ required: true }) isInProcessingPreset: boolean;
  @Input({ required: true }) selectedChances: any[];
  @Input({ required: true }) selectedChances2: any[];
  @Input({ required: true }) hideBasicAtk: boolean;
  @Input({ required: true }) showLeftWeapon: boolean;

  @Output() showElementTableClick = new EventEmitter<any>();

  constructor() {}

  onShowElementalTableClick() {
    this.showElementTableClick.emit(1);
  }
}
