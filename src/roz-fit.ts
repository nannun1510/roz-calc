/**
 * ROZ: fit Tong's fixed-width layout (about 1540 px) to smaller screens by zooming the
 * whole page out, instead of a horizontal scrollbar. Larger screens are left at 100%.
 */
const LAYOUT_WIDTH = 1540;

export function rozFitToScreen() {
  const apply = () => {
    const z = Math.min(1, window.innerWidth / LAYOUT_WIDTH);
    (document.documentElement.style as any).zoom = z < 1 ? z.toFixed(3) : '';
  };
  apply();
  window.addEventListener('resize', apply);
}
