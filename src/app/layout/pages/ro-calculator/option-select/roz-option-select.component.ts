import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import { FlatOption, flattenOptionList } from 'src/app/utils/flatten-option-list';
import { rozOptionAllowedInSlot } from 'src/app/constants/roz-option-slot-rules';

const slotCache = new WeakMap<any[], Map<number, any[]>>();
const prune = (nodes: any[], slot: number): any[] =>
  (nodes || [])
    .map((n) => (Array.isArray(n.children) && n.children.length ? { ...n, children: prune(n.children, slot) } : n))
    .filter((n) => (Array.isArray(n.children) ? n.children.length > 0 : rozOptionAllowedInSlot(n.value, slot)));

/**
 * ROZ: random-option slot = Tong's original cascade menu + a search button.
 * The search button opens a small panel where you can type (e.g. "demi", "atk %", "str +5").
 */
@Component({
  selector: 'roz-option-select',
  templateUrl: './roz-option-select.component.html',
  styleUrls: ['./roz-option-select.component.css'],
})
export class RozOptionSelectComponent {
  @Input() options: any[] = [];
  @Input() value: any;
  @Input() disabled = false;
  @Input() placeholder = 'Option';
  @Output() valueChange = new EventEmitter<any>();
  @Output() changed = new EventEmitter<any>();

  @ViewChild('op') op: OverlayPanel;
  @ViewChild('searchInput') searchInput: ElementRef<HTMLInputElement>;

  query = '';
  results: FlatOption[] = [];
  readonly LIMIT = 80;

  /** slot number (1-4) from the placeholder "Option N" */
  get slot() {
    return Number(String(this.placeholder).match(/(\d)/)?.[1] || 0);
  }

  /** option tree with only the options this slot can roll (ROZ slot rules) */
  get slotOptions() {
    if (!Array.isArray(this.options)) return [];
    let m = slotCache.get(this.options);
    if (!m) { m = new Map(); slotCache.set(this.options, m); }
    if (!m.has(this.slot)) m.set(this.slot, prune(this.options, this.slot));
    return m.get(this.slot);
  }

  get flat() {
    return flattenOptionList(this.slotOptions);
  }

  onCascade(event: any) {
    this.valueChange.emit(this.value);
    this.changed.emit(event);
  }

  openSearch(event: Event) {
    if (this.disabled) return;
    this.query = '';
    this.filter();
    this.op.toggle(event);
    setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
  }

  filter() {
    const words = this.query.toLowerCase().split(/\s+/).filter(Boolean);
    const out: FlatOption[] = [];
    for (const o of this.flat) {
      const s = o.search.toLowerCase();
      if (words.every((w) => s.includes(w))) {
        out.push(o);
        if (out.length >= this.LIMIT) break;
      }
    }
    this.results = out;
  }

  pick(o: FlatOption) {
    this.value = o.value;
    this.valueChange.emit(o.value);
    this.changed.emit({ value: o.value });
    this.op.hide();
  }

  onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && this.results.length) this.pick(this.results[0]);
    if (e.key === 'Escape') this.op.hide();
  }
}
