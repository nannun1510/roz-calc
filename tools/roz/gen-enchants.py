"""ROZ Global enchants, from the client's own item text.

ROZ enchant stones describe themselves:
    [Enchant Effects]        <effect lines>          (pet eggs: "At 1 Lv: ..." / "At 2 Lv: ...")
    [Enchantable Equipment]  <equipment names>
This script turns every such item into Tong enchant items (itemTypeId 11) and writes
src/app/constants/enchant_item/roz-enchant-table.ts mapping each enchantable item to them.
Pet eggs become one enchant per level (Taming Ring).

Run after convert-items-en.py (it appends to item.json).
"""
import json, re, importlib.util, collections

spec = importlib.util.spec_from_file_location('conv', 'tools/roz/convert-items-en.py')
# reuse the parser without re-running the whole conversion
src = open('tools/roz/convert-items-en.py').read()
parser_src = src[:src.index("META = re.compile(")]
ns = {}
exec(compile(parser_src, 'convert-items-en.py', 'exec'), ns)
parse_line, S, TH, clean = ns['parse_line'], ns['S'], ns['TH'], ns['clean']

D = 'src/assets/demo/data/item.json'
items = json.load(open(D))
by_name = collections.defaultdict(list)
for k, v in items.items():
    by_name[re.sub(r' \[\d+\]$', '', v['name'])].append(k)


def section(lines, title):
    out, on = [], False
    for l in lines:
        if l == title: on = True; continue
        if on and (l.startswith('---') or (l.startswith('[') and l.endswith(']'))): break
        if on and l: out.append(l)
    return out


def script_of(effect_lines):
    sc = collections.defaultdict(list)
    for l in effect_lines:
        r = parse_line(l)
        if r is None:
            # keep the parts we understand
            r = []
            for part in re.split(r',\s*', l):
                rr = parse_line(part)
                if rr: r += rr
        for k, v in r: sc[k].append(v)
    sc = {k: v for k, v in sc.items() if k in ns['VALID']}
    return sc


enchant_items, table, skipped = {}, collections.defaultdict(list), []
for k, v in S.items():
    lines = [clean(x) for x in v.get('identifiedDescriptionName') or []]
    effects = section(lines, '[Enchant Effects]')
    targets = section(lines, '[Enchantable Equipment]')
    if not effects or not targets: continue
    name = v['identifiedDisplayName']
    levels = collections.OrderedDict()
    for l in effects:
        m = re.match(r'At (\d+) Lv:\s*(.*)$', l)
        if m: levels.setdefault(int(m.group(1)), []).append(m.group(2))
    variants = [(lv, f'{name} Lv{lv}', 9_000_000 + int(k) * 10 + lv, ls) for lv, ls in levels.items()] if levels else [(None, name, int(k), effects)]
    target_ids = sorted({i for t in targets for i in by_name.get(t, [])})
    if not target_ids: skipped.append((name, targets[:2])); continue
    for lv, ename, eid, eff in variants:
        sc = script_of(eff)
        if sc is None: skipped.append((ename, eff)); continue
        aegis = f'ROZ_E_{eid}'
        desc = '\n'.join(v.get('identifiedDescriptionName') or [])
        th = '\n'.join((TH.get(k) or {}).get('identifiedDescriptionName') or [])
        if th: desc += '\n^0000ff──────── ภาษาไทย ────────^000000\n' + th
        enchant_items[str(eid)] = {'id': eid, 'aegisName': aegis, 'name': ename, 'unidName': ename, 'resName': '', 'description': desc,
                                   'slots': 0, 'itemTypeId': 11, 'itemSubTypeId': 0, 'itemLevel': None, 'attack': None, 'defense': None,
                                   'weight': 0, 'requiredLevel': None, 'location': None, 'compositionPos': 65535, 'script': sc}
        for t in target_ids: table[items[t]['aegisName']].append(aegis)

# ---------------------------------------------------------------------------
# Essences (Subjugation Team / Expedition Corps): armor 4th slot, armor refine +9 or higher.
# Their text has no [Enchant Effects] section, so they are read line by line here.
# ---------------------------------------------------------------------------
clause, split_clauses, CLASS = ns['clause'], ns['split_clauses'], ns['CLASS']
ESSENCE_ARMORS = ['15220', '15221', '15222']  # Subjugation Team's Armor, Expedition's Armor, Expedition's Robe
GATE = 'XREFINEX[armor==9]'
STAT = {'ATK': 'atk', 'MATK': 'matk', 'CRIT': 'cri', 'FLEE': 'flee', 'HIT': 'hit', 'LUK': 'luk', 'DEX': 'dex'}
SKILL_FIX = {'Beastbane': 'Beast Bane', 'Intimidate': 'Snatch'}
NO_EFFECT = re.compile(r'SP cost|Heal Amount|Heal effect|Amp cooldown|Summon Spirit Sphere|Variable Cast Time of Occult|'
                       r'Casting Time Reduction of Occult|received Heal|natural SP')


def skills_of(txt):
    return [SKILL_FIX.get(x.strip(), x.strip()) for x in re.split(r'\s+or\s+|\s+and\s+', txt)]


def clauses_any(txt):
    out = []
    for c in split_clauses(txt):
        c = re.sub(r'^ASPD increases \(After Attack Delay -(\d+)%(?: per step)?\)$', r'ASPD (After Attack Delay -\1%)', c.strip())
        r = clause(c)
        if r is None: return None
        out += r
    return out


def essence_line(l):
    """-> list of (key, value) or None (not understood) or [] (no damage effect)."""
    l = l.strip().rstrip('.')
    if NO_EFFECT.search(l): return []
    # When equipped by <class>, ... (class-only lines)
    m = re.fullmatch(r'When equipped by (\w+) Class, (.+)', l)
    if m and m.group(1) in CLASS:
        used = f'USED[{CLASS[m.group(1)]}]'
        if re.search(r'trigger Bash Lv 10', m.group(2)): return [('roz_autobash', used + '10')]
        if re.search(r'trigger Hindsight', m.group(2)): return []
        r = clauses_any(m.group(2))
        return None if r is None else [(k, used + str(v)) for k, v in r]
    # <STAT> increases by N x the (skill) level of <skill>  /  Increases <STAT> by (N x) the level of <skill>
    m = (re.fullmatch(r'(ATK|MATK|CRIT|FLEE|HIT|LUK) increases by (\d+)× the (?:skill )?level of (.+)', l)
         or re.fullmatch(r'Increases (ATK|MATK|CRIT|FLEE|HIT|LUK) by (?:(\d+)× )?the (?:skill )?level of (.+)', l))
    if m:
        return [(STAT[m.group(1)], f'LEARN_SKILL[{sk}==1]---{m.group(2) or 1}') for sk in skills_of(m.group(3))]
    m = re.fullmatch(r'ASPD increases by (\d+)× the level of (.+?) \(After Attack Delay -1%\)', l)
    if m: return [('aspdPercent', f'LEARN_SKILL[{sk}==1]---{m.group(1)}') for sk in skills_of(m.group(2))]
    m = (re.fullmatch(r'Variable Casting Time is reduced by (\d+)× the level of (.+)', l)
         or re.fullmatch(r'Variable Cast Time Reduction increases by (\d+)× the level of (.+)', l))
    if m: return [('vct', f'LEARN_SKILL[{sk}==1]---{m.group(1)}') for sk in skills_of(m.group(2))]
    # For every N level(s) of <skill>, <effect>
    m = re.fullmatch(r'For every (?:(\d+) )?levels? of (.+?), (.+)', l)
    if m:
        n = m.group(1) or '1'
        eff = m.group(3)
        if re.fullmatch(r'CRIT increases', eff): return None  # amount not given in the client text
        mb = re.fullmatch(r'Bow Damage \+(\d+)%', eff)
        if mb: return [('range', f'WEAPON_TYPE[bow]LEARN_SKILL[{sk}==1]---{mb.group(1)}') for sk in skills_of(m.group(2))] if n == '1' else None
        r = clauses_any(eff)
        if r is None: return None
        return [(k, f'LEARN_SKILL[{sk}=={n}]---{v}') for sk in skills_of(m.group(2)) for k, v in r]
    # armor refine steps: For each (armor) refine (level) (on armor), X / For every N (armor) refine(s|levels) (on armor), X
    m = (re.fullmatch(r'For each (?:armor )?refine(?: level)?(?: on armor)?, (.+)', l)
         or re.fullmatch(r'For every (\d+) (?:armor )?refine(?:s| levels)?(?: on armor)?, (.+)', l))
    if m:
        n, eff = (m.group(1), m.group(2)) if m.lastindex == 2 else ('1', m.group(1))
        r = clauses_any(eff)
        return None if r is None else [(k, f'REFINE[armor=={n}]---{v}') for k, v in r]
    # Increases Melody Strike or Slinging Arrow damage by N%
    m = re.fullmatch(r'Increases (.+?) damage by (\d+)%', l)
    if m and ' or ' in m.group(1):
        names = [x.strip() for x in m.group(1).split(' or ')]
        if all(x in ns['SKILLS'] for x in names): return [(x, m.group(2)) for x in names]
    r = parse_line(l)
    if r is not None: return [(k, str(v)) for k, v in r]
    r = clauses_any(l)
    return r


ess_count, ess_unparsed = 0, []
for k, v in S.items():
    name = v['identifiedDisplayName']
    if not (k.startswith('29') and 'Essence' in name): continue
    lines = [clean(x) for x in v.get('identifiedDescriptionName') or []]
    body = lines[:next((i for i, x in enumerate(lines) if x.startswith('---')), len(lines))]
    sc, bad = collections.defaultdict(list), []
    for l in body:
        if not l or l == '_': continue
        r = essence_line(l)
        if r is None: bad.append(l); continue
        for kk, vv in r:
            if kk in ns['VALID'] or kk == 'roz_autobash': sc[kk].append(GATE + str(vv))
            else: bad.append(l)
    desc = '\n'.join(v.get('identifiedDescriptionName') or [])
    note = '^777777[ROZ] Armor 4th slot, armor refine +9 or higher.^000000\n'
    if bad:
        note += '^cc0000[ROZ] Not yet in the calculator:^000000\n' + '\n'.join(bad) + '\n^777777--------------------------^000000\n'
        ess_unparsed += [(name, b) for b in bad]
    th = '\n'.join((TH.get(k) or {}).get('identifiedDescriptionName') or [])
    if th: desc += '\n^0000ff──────── ภาษาไทย ────────^000000\n' + th
    eid = 9_500_000 + int(k)
    aegis = f'ROZ_E_{eid}'
    enchant_items[str(eid)] = {'id': eid, 'aegisName': aegis, 'name': name, 'unidName': name, 'resName': '', 'description': note + desc,
                               'slots': 0, 'itemTypeId': 11, 'itemSubTypeId': 0, 'itemLevel': None, 'attack': None, 'defense': None,
                               'weight': 0, 'requiredLevel': None, 'location': None, 'compositionPos': 65535, 'script': dict(sc)}
    for t in ESSENCE_ARMORS:
        if t in items: table[items[t]['aegisName']].append(aegis)
    ess_count += 1
print('essences', ess_count, 'unparsed lines', len(ess_unparsed))
for n, b in ess_unparsed: print('   ', n, '::', b)

items.update(enchant_items)
json.dump(items, open(D, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
ts = ['// GENERATED by tools/roz/gen-enchants.py from the ROZ Global item table. Do not edit by hand.',
      '// Each ROZ enchantable item -> its enchants, in the 4th enchant slot.',
      'export const RozEnchantTable: { name: string; enchants: [null | string[], string[], string[], string[]] }[] = [']
for name, ens in sorted(table.items()):
    ts.append(f'  {{ name: {json.dumps(name)}, enchants: [null, [], [], {json.dumps(sorted(set(ens)))}] }},')
ts.append('];')
open('src/app/constants/enchant_item/roz-enchant-table.ts', 'w').write('\n'.join(ts) + '\n')
print('enchant items', len(enchant_items), 'enchantable items', len(table), 'skipped', len(skipped), skipped[:6])
for t, ens in list(table.items())[:3]: print(t, items[t.replace('ROZ_', '')]['name'], len(ens), [enchant_items[e.replace('ROZ_E_', '')]['name'] for e in ens[:3]])

# Random options: every ROZ armor/accessory piece can roll up to 3 (weapons: 4, set in the UI)
rows = [f"  {json.dumps(v['aegisName'])}: 3," for v in items.values() if v['itemTypeId'] == 2 and v['itemSubTypeId'] in (510, 511, 512, 513, 514, 515, 516, 517)]
open('src/app/constants/roz-extra-option-table.ts', 'w').write("// GENERATED by tools/roz/gen-enchants.py: ROZ gear can roll up to 3 random options.\nexport const RozExtraOptionTable: Record<string, number> = {\n" + '\n'.join(rows) + "\n};\n")
print('option-able gear', len(rows))
