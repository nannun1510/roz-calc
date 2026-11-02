import { Directive, ElementRef, HostListener, Input, OnDestroy } from '@angular/core';

/**
 * ROZ: item description on hover.
 *
 * A single floating panel (white card) that is always kept inside the visible window:
 * it opens to the right of the hovered element, flips to the left when there is no room,
 * and is clamped vertically with its own scroll for long descriptions. Works with the
 * page zoom set by roz-fit.ts (positions are computed in the zoomed coordinate space).
 */
@Directive({ selector: '[rozHoverDesc]' })
export class RozHoverDescDirective implements OnDestroy {
  @Input('rozHoverDesc') html = '';

  private static panel: HTMLDivElement | null = null;
  private timer: any;

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  private static getPanel() {
    if (!RozHoverDescDirective.panel) {
      const p = document.createElement('div');
      p.className = 'roz-hover-desc';
      p.style.display = 'none';
      document.body.appendChild(p);
      RozHoverDescDirective.panel = p;
    }
    return RozHoverDescDirective.panel;
  }

  @HostListener('mouseenter')
  onEnter() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.show(), 200);
  }

  @HostListener('mouseleave')
  @HostListener('mousedown')
  onLeave() {
    clearTimeout(this.timer);
    const p = RozHoverDescDirective.panel;
    if (p) p.style.display = 'none';
  }

  ngOnDestroy() {
    this.onLeave();
  }

  private show() {
    if (!this.html) return;
    const p = RozHoverDescDirective.getPanel();
    p.innerHTML = this.html;
    p.style.display = 'block';
    p.style.visibility = 'hidden';

    // Everything in the zoomed coordinate space of <html>.
    const zoom = parseFloat((document.documentElement.style as any).zoom || '1') || 1;
    const vw = window.innerWidth / zoom;
    const vh = window.innerHeight / zoom;
    const r = this.el.nativeElement.getBoundingClientRect();
    // getBoundingClientRect may already be in zoomed units (standardized CSS zoom) or not.
    const rectZoomed = Math.abs(r.right - this.el.nativeElement.offsetWidth - r.left) < 2 || zoom === 1;
    const k = rectZoomed ? 1 : 1 / zoom;
    const left = r.left * k, right = r.right * k, top = r.top * k;

    const gap = 8;
    p.style.maxHeight = `${Math.floor(vh - 2 * gap)}px`;
    const w = p.offsetWidth, h = p.offsetHeight;
    let x = right + gap;
    if (x + w > vw - gap) x = left - gap - w;
    if (x < gap) x = Math.max(gap, Math.min(vw - w - gap, left));
    let y = top;
    if (y + h > vh - gap) y = vh - gap - h;
    if (y < gap) y = gap;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.visibility = 'visible';
  }
}
