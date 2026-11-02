/**
 * ROZ: Tong's random-option list is a 3-level cascade (category > group > value).
 * Flatten it to one searchable list for a filterable dropdown:
 * every selectable leaf keeps its own label, with the category path shown beside it
 * and included in the search text (plus English words for the Thai labels).
 */
export interface FlatOption {
  label: string;
  value: string;
  path: string;
  search: string;
}

const EN_ALIAS: Record<string, string> = {
  เจาะกาย: 'Physical Penetration Pene Ignore Def',
  เจาะเวท: 'Magical Penetration Pene Ignore Mdef',
};

const cache = new WeakMap<any[], FlatOption[]>();

export const flattenOptionList = (list: any[]): FlatOption[] => {
  if (!Array.isArray(list)) return [];
  const hit = cache.get(list);
  if (hit) return hit;

  const out: FlatOption[] = [];
  const walk = (nodes: any[], path: string[]) => {
    for (const n of nodes || []) {
      if (Array.isArray(n.children) && n.children.length > 0) {
        walk(n.children, [...path, n.label]);
      } else if (n.value != null) {
        const p = path.filter((x, i) => i < 2).join(' › ');
        let search = `${n.label} ${p}`;
        for (const [th, en] of Object.entries(EN_ALIAS)) if (search.includes(th)) search += ` ${en}`;
        out.push({ label: n.label, value: n.value, path: p, search });
      }
    }
  };
  walk(list, []);
  cache.set(list, out);
  return out;
};
