"""Build the calculator's item DB from the ROZ Global client's English item table
(System/itemInfo_strings.lub + itemInfo_data.lub, dumped to tools/roz/roz-items-en.json).

That table is the item list the Global client actually shows: every equipment entry in it
is turned into an item.json record. Base stats come from the labelled lines (Type, ATK,
DEF, Weight, Weapon Level, Required Level, Position, Equippable by, Equipped on, Element);
bonuses are parsed from the English description, including refine conditions. Lines the
parser cannot read with certainty (combos, procs, skill-specific effects) are kept in the
tooltip under "[ROZ] Not yet in the calculator".

Usage: python3 tools/roz/convert-items-en.py
"""
import json, re, collections

D = 'src/assets/demo/data'
src = json.load(open('tools/roz/roz-items-en.json'))
S, DATA = src['tbl_string'], src['tbl_data']
fork = json.load(open('tools/roz/latam-original-item.json'))
# Bonus keys the Tong calc engine understands (src/app/utils/create-raw-total-bonus.ts);
# anything else (damage taken, healing, SP cost, PvP) has no effect on damage output.
_raw = open('src/app/utils/create-raw-total-bonus.ts').read()
VALID = set(re.findall(r'^\s+([A-Za-z_0-9]+):', _raw, re.M))

clean = lambda s: re.sub(r'\^[0-9a-fA-F]{6}', '', s).strip()

WEAPON = {'Dagger': 256, 'Sword': 257, 'One-Handed Sword': 257, 'Two-Handed Sword': 258, 'One-Handed Spear': 259, 'Spear': 259, 'Two-Handed Spear': 260,
          'One-Handed Axe': 261, 'Axe': 261, 'Two-Handed Axe': 262, 'Mace': 263, 'One-Handed Staff': 265, 'Staff': 265, 'Rod': 265, 'Bow': 266, 'Knuckle': 267,
          'Instrument': 268, 'Musical Instrument': 268, 'Whip': 269, 'Book': 270, 'Katar': 271, 'Two-Handed Staff': 278}
EQUIP = {'Headgear': 512, 'Helmet': 512, 'Helm': 512, 'Armor': 513, 'Shield': 514, 'Garment': 515, 'Shoes': 516, 'Accessory': 517, 'Accessory (Right)': 510, 'Accessory (Left)': 511}
CARDPOS = {'Weapon': 0, 'Armor': 16, 'Shield': 32, 'Garment': 4, 'Shoes': 64, 'Accessory': 136, 'Headgear': 769, 'Helmet': 769, 'Helm': 769}
CLASS = {'Novice': 'Novice', 'Swordsman': 'Swordman', 'Swordman': 'Swordman', 'Mage': 'Mage', 'Archer': 'Archer', 'Acolyte': 'Acolyte', 'Merchant': 'Merchant', 'Thief': 'Thief',
         'Knight': 'Knight', 'Crusader': 'Crusader', 'Wizard': 'Wizard', 'Sage': 'Sage', 'Hunter': 'Hunter', 'Bard': 'Bard', 'Dancer': 'Dancer', 'Priest': 'Priest',
         'Monk': 'Monk', 'Blacksmith': 'Blacksmith', 'Alchemist': 'Alchemist', 'Assassin': 'Assassin', 'Rogue': 'Rogue', 'Super Novice': 'SuperNovice'}
POS = {'Upper': 'Upper', 'Middle': 'Middle', 'Mid': 'Middle', 'Lower': 'Lower'}
ELEMENTS = ['Neutral', 'Water', 'Earth', 'Fire', 'Wind', 'Poison', 'Holy', 'Shadow', 'Dark', 'Ghost', 'Undead']
RACES = {'Formless': 'formless', 'Undead': 'undead', 'Brute': 'brute', 'Plant': 'plant', 'Insect': 'insect', 'Fish': 'fish', 'Shellfish': 'fish', 'Demon': 'demon',
         'Demi-Human': 'demihuman', 'Demihuman': 'demihuman', 'Human': 'demihuman', 'Angel': 'angel', 'Dragon': 'dragon', 'all races': 'all'}
SIZES = {'Small': 's', 'Medium': 'm', 'Large': 'l', 'All Sizes': 'all', 'all sizes': 'all'}
ele_key = lambda e: 'dark' if e == 'Shadow' else e.lower()

# flat stat names -> engine keys
FLAT = {'STR': 'str', 'AGI': 'agi', 'VIT': 'vit', 'INT': 'int', 'DEX': 'dex', 'LUK': 'luk', 'ATK': 'atk', 'MATK': 'matk', 'DEF': 'def', 'MDEF': 'mdef',
        'HIT': 'hit', 'FLEE': 'flee', 'FLEE Rate': 'flee', 'CRIT': 'cri', 'Critical': 'cri', 'Perfect Dodge': 'perfectDodge', 'MHP': 'hp', 'MAXHP': 'hp', 'Max HP': 'hp',
        'MSP': 'sp', 'MAXSP': 'sp', 'Max SP': 'sp', 'HP': 'hp', 'SP': 'sp', 'ASPD': 'aspd', 'All Stats': 'allStatus', 'All Status': 'allStatus', 'All State': 'allStatus'}
PCT = {'MHP': 'hpPercent', 'MAXHP': 'hpPercent', 'Max HP': 'hpPercent', 'MSP': 'spPercent', 'MAXSP': 'spPercent', 'Max SP': 'spPercent', 'HP': 'hpPercent', 'SP': 'spPercent',
       'ATK': 'atkPercent', 'MATK': 'matkPercent', 'ASPD': 'aspdPercent', 'CRIT': 'cri', 'Critical Damage': 'criDmg', 'Heal Amount': 'healPower', 'HP Heal effect': 'healPower',
       'Heal effect': 'healPower', 'Ranged Physical Damage': 'range', 'Ranged Weapon Physical Damage': 'range', 'Melee Physical Damage': 'melee', 'Long-range physical damage': 'range'}
flat_names = '|'.join(sorted(map(re.escape, FLAT), key=len, reverse=True))
pct_names = '|'.join(sorted(map(re.escape, PCT), key=len, reverse=True))


def targets(text):
    """'Demi-Human, Brute, Plant, and Insect' -> [('race','demihuman'),...]"""
    out = []
    for t in re.split(r',\s*(?:and\s+)?|\s+and\s+|\s*/\s*', text.strip()):
        t = re.sub(r'^(?:monsters|enemies|Monsters|Enemies) of ', '', t.strip())
        t = re.sub(r'\b(Enemies|enemies|Monsters|monsters|Monster|monster|type|-type|race|races of)\b', '', t).strip(' -')
        t = t.replace('monsters of ', '').replace('enemies of ', '').strip()
        if t in RACES: out.append(('race', RACES[t]))
        elif t in SIZES: out.append(('size', SIZES[t]))
        elif re.sub(r'[- ]?[Pp]roperty$', '', t) in ELEMENTS: out.append(('element', ele_key(re.sub(r'[- ]?[Pp]roperty$', '', t))))
        elif t in ('players', 'Players', 'player'): out.append(('race', 'player_human'))
        else: return None
    return out or None


def clause(c):
    """One bonus clause -> list of (key, value) or None when not understood."""
    c = c.strip().rstrip('.').strip()
    c = re.sub(r'^(additional(ly)?|an additional|increases?)\s+', '', c, flags=re.I).strip()
    c = re.sub(r'\s+additional$', '', c)
    if not c: return []
    if re.fullmatch(r'Unbreakable|Cannot be Refined|Cannot be refined|Indestructible', c): return []
    m = re.fullmatch(rf'({flat_names})\s*([+-])\s*(\d+)', c)
    if m:
        k, v = FLAT[m.group(1)], int(m.group(3)) * (1 if m.group(2) == '+' else -1)
        return [(s, v) for s in ('str', 'agi', 'vit', 'int', 'dex', 'luk')] if k == 'allStatus' else [(k, v)]
    m = re.fullmatch(rf'({flat_names}) increases by (?:an additional )?(\d+)', c)
    if m: return [(FLAT[m.group(1)], int(m.group(2)))]
    m = re.fullmatch(rf'({pct_names})\s*([+-])\s*(\d+)%', c)
    if m: return [(PCT[m.group(1)], int(m.group(3)) * (1 if m.group(2) == '+' else -1))]
    m = re.fullmatch(r'(?:reduces )?(Variable Casting Time|Variable Cast(?:ing)?|Fixed Casting(?: Time)?|Fixed Cast|After Attack Delay|Global Delay|After Cast(?:ing)? Delay|SP consumption|SP Consumption)\s*(?:-|by\s*)\s*(\d+)%', c)
    if not m: m = re.fullmatch(r'reduces (Variable Casting Time|Fixed Casting Time|After Attack Delay|Global Delay|After Cast Delay|SP consumption) by (\d+)%', c)
    if m:
        k, v = m.group(1).lower(), int(m.group(2))
        if k.startswith('variable'): return [('vct', v)]
        if k.startswith('fixed'): return [('fctPercent', v)]
        if k.startswith('after attack'): return [('aspdPercent', v)]
        if k.startswith('sp'): return [('spCostPercent', -v)]
        return [('acd', v)]
    m = re.fullmatch(r'ASPD increases \(After Attack Delay -(\d+)%\)', c)
    if m: return [('aspdPercent', int(m.group(1)))]
    # damage dealt
    m = re.fullmatch(r'(Physical|Magic(?:al)?|Physical/Magical|Physical and [Mm]agical) [Dd]amage (?:dealt )?to (.+?) \+(\d+)%(?: \(excluding Players\))?', c, flags=re.I)
    if not m:
        m2 = re.fullmatch(r'(Physical|Magic(?:al)?) damage to players \+(\d+)%', c, flags=re.I)
        if m2: return [((('p' if m2.group(1).lower().startswith('phys') else 'm') + '_race_player_human'), int(m2.group(2)))]
    if m:
        kinds = ['p', 'm'] if '/' in m.group(1) or ' and ' in m.group(1) else (['p'] if m.group(1).startswith('Physical') else ['m'])
        tg = targets(m.group(2))
        if tg: return [(f'{k}_{a}_{b}', int(m.group(3))) for k in kinds for a, b in tg]
        return None
    # damage taken / resistances
    m = re.fullmatch(r'(?:Physical (?:and magical )?|Magical )?[Dd]amage [Tt]aken from (.+?) -(\d+)%', c)
    if m:
        tg = targets(m.group(1))
        if tg: return [(('subrace_' if a == 'race' else 'subsize_' if a == 'size' else 'subele_') + b, int(m.group(2))) for a, b in tg]
        return None
    m = re.fullmatch(r'(\w+)-Property [Rr]esistance \+(\d+)%', c)
    if m and m.group(1) in ELEMENTS: return [(f'subele_{ele_key(m.group(1))}', int(m.group(2)))]
    if re.match(r'(EXP gained|Item drop rate|Resistance to|HP Recovery Rate|SP Recovery Rate|SP Heal effect|Loses \d+ SP|SP -\d+ when unequipped|Losing the equipment)', c, flags=re.I):
        return []  # no effect on damage
    return None


def split_clauses(text):
    return [p for p in re.split(r',\s*|\s+and\s+(?=[A-Z])|\.\s+|;\s*', text) if p.strip()]


def parse_line(line):
    """Returns (list of (key, value-string)) or None."""
    l = line.strip()
    # refine thresholds
    m = re.match(r'^(?:At \+(\d+) refine(?: or higher)?|When refined to \+(\d+)(?: or higher)?|At refine level (\d+)(?: or higher)?|If refined to \+(\d+)(?: or higher)?)\s*[,:]?\s*(.*)$', l, flags=re.I)
    if m:
        n = next(g for g in m.groups()[:4] if g)
        body = m.group(5)
        mm = re.fullmatch(r'(.+?) for each refine level above \+(\d+)\.?', body)
        if mm:
            base = int(mm.group(2)); out = []
            for c in split_clauses(mm.group(1)):
                r = clause(c)
                if r is None: return None
                for k, v in r: out += [(k, f'{lv}==={v}') for lv in range(base + 1, 21)]
            return out
        out = []
        for c in split_clauses(body):
            r = clause(c)
            if r is None: return None
            out += [(k, f'{n}==={v}') for k, v in r]
        return out
    m = re.match(r'^(?:For each refine|Each refine|Per refine level)[,:]?\s*(.*)$', l, flags=re.I)
    if m:
        body = re.sub(r'increases (.+?) by \+?(\d+%?)', r'\1 +\2', m.group(1))
        out = []
        for c in split_clauses(body):
            r = clause(c)
            if r is None: return None
            out += [(k, f'1---{v}') for k, v in r]
        return out
    m = re.match(r'^For every (\d+) refines?[,:]?\s*(.*)$', l, flags=re.I)
    if m:
        out = []
        for c in split_clauses(m.group(2)):
            r = clause(c)
            if r is None: return None
            out += [(k, f'{m.group(1)}---{v}') for k, v in r]
        return out
    if re.search(r'chance|When equipped (with|together)|equipped together|When using|when using|If total refine|Auto-Spell|autocast|skill Lv|Lv\.? ?\d+ can be used|for \d+ seconds|damage of|damage to [A-Z][a-z]+ [A-Z]|BaseLv|Base Level|Siege|GvG|WoE|PvP', l):
        return None
    out = []
    for c in split_clauses(l):
        r = clause(c)
        if r is None: return None
        out += [(k, str(v)) for k, v in r]
    return out


META = re.compile(r'^(Type|ATK|MATK|DEF|Weight|Weapon Level|Armor Level|Required Level|Equippable [Bb]y|Equipped on|Position|Location|Element|Property)\s*:\s*(.*)$')
items, ov, st, unp = {}, {}, collections.Counter(), collections.Counter()
for k, v in S.items():
    lines = [clean(x) for x in v.get('identifiedDescriptionName') or []]
    f = {'type': None, 'atk': None, 'matk': None, 'def': 0, 'weight': 0, 'lv': None, 'req': 1, 'cls': ['all'], 'pos': [], 'cardpos': None, 'ele': None}
    body = []
    for l in lines:
        m = META.match(l)
        if not m:
            if l and not l.startswith('---') and l != '_': body.append(l)
            continue
        key, val = m.group(1).lower(), m.group(2).strip()
        num = re.match(r'(\d+)', val); num = int(num.group(1)) if num else None
        if key == 'type': f['type'] = val
        elif key == 'atk': f['atk'] = num
        elif key == 'matk': f['matk'] = num
        elif key == 'def': f['def'] = num or 0
        elif key == 'weight': f['weight'] = num or 0
        elif key in ('weapon level', 'armor level'): f['lv'] = num
        elif key == 'required level': f['req'] = num or 1
        elif key in ('position', 'location'): f['pos'] = [POS[p.strip()] for p in re.split(r'[,/&]|\band\b', val) if p.strip() in POS]
        elif key in ('element', 'property'): f['ele'] = val
        elif key == 'equipped on': f['cardpos'] = val
        elif key.startswith('equippable'):
            if val.startswith('All Jobs'): f['cls'] = ['all']
            else: f['cls'] = sorted({CLASS[c] for c in CLASS if re.search(r'\b' + re.escape(c) + r'\b', val)}) or ['all']
    t = f['type']
    if t in WEAPON: tid, sub = 1, WEAPON[t]
    elif t in EQUIP: tid, sub = 2, EQUIP[t]
    elif t == 'Card': tid, sub = 6, 0
    else: continue
    dt = DATA.get(k, {})
    if dt.get('costume'): continue
    script, un = collections.defaultdict(list), []
    for l in body:
        r = parse_line(l)
        if r is None:
            if re.search(r'\d|%|[Ii]gnore', l): un.append(l); unp[re.sub(r'\d+', 'N', l)] += 1
            continue
        for key, val in r: script[key].append(val)
    if f['matk'] and tid == 1: script['matk'].append(str(f['matk']))
    source = 'roz'
    fk = fork.get(k)
    if un and fk and fk.get('script') and all(all(x in fk['script'].get(kk, []) for x in vv) for kk, vv in script.items()) and script:
        script, source = {kk: vv for kk, vv in fk['script'].items() if kk in VALID or not re.fullmatch(r'[a-z_A-Z0-9]+', kk)}, 'latam'
    script = {kk: vv for kk, vv in dict(script).items() if kk in VALID or not re.fullmatch(r'[a-z_A-Z0-9]+', kk)}
    slots = dt.get('slotCount', 0)
    name = v['identifiedDisplayName'] + (f' [{slots}]' if slots else '')
    rec = {'id': int(k), 'aegisName': dt.get('identifiedResourceName', ''), 'name': name, 'unidName': v.get('unidentifiedDisplayName', ''),
           'resName': dt.get('identifiedResourceName', ''), 'description': '', 'slots': slots, 'itemTypeId': tid, 'itemSubTypeId': sub,
           'itemLevel': f['lv'], 'attack': f['atk'], 'defense': f['def'], 'weight': f['weight'], 'requiredLevel': f['req'],
           'location': f['pos'][0] if f['pos'] else ('Upper' if sub == 512 else None), 'compositionPos': None,
           'usableClass': f['cls'], 'script': script}
    if len(f['pos']) > 1: rec['locations'] = f['pos']
    if tid == 6:
        rec['compositionPos'] = CARDPOS.get((f['cardpos'] or '').split(',')[0].strip(), 65535)
        rec['usableClass'] = ['all']
    if f['ele'] and tid == 1:
        rec['propertyAtk'] = ele_key(f['ele']).capitalize() if f['ele'] != 'Shadow' else 'Dark'
    desc = '\n'.join(lines)
    if un and source == 'roz': desc = '[ROZ] Not yet in the calculator:\n' + '\n'.join(un) + '\n-------------------------\n' + desc
    rec['description'] = desc
    items[k] = rec
    st['items'] += 1; st['withScript'] += bool(script); st['fullyParsed'] += not un; st[source] += 1
json.dump(items, open(f'{D}/item.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(unp.most_common(), open('tools/roz/roz-items-unparsed.json', 'w'), ensure_ascii=False, indent=0)
print(dict(st)); print(collections.Counter((x['itemTypeId'], x['itemSubTypeId']) for x in items.values()).most_common())
for k in ('481000', '4001', '4035', '1163', '2601', '1231'):
    x = items.get(k); print(k, x and (x['name'], x['itemTypeId'], x['itemSubTypeId'], x['attack'], x['defense'], x['location'], x['usableClass'], x.get('compositionPos'), x['script'], x.get('propertyAtk')))
