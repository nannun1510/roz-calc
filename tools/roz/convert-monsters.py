"""ROZ monster list = every monster the ROZ Global client's navigation table spawns
(navi_mob_enus.lub). Stats are NOT in the client: they come from rAthena's renewal
mob_db (kRO values, GPL data project) and still need checking against ROZ."""
import json, re, yaml, collections
navi = json.load(open('tools/roz/roz-navi-mob.json'))['Navi_Mob_strings']
db = yaml.safe_load(open('tools/roz/rathena-re-mob_db.yml'))['Body']
by_aegis = {m['AegisName']: m for m in db}
latam = json.load(open('tools/roz/latam-original-monster.json'))
ELEM = ['Neutral', 'Water', 'Earth', 'Fire', 'Wind', 'Poison', 'Holy', 'Dark', 'Ghost', 'Undead']
RACE = ['Formless', 'Undead', 'Brute', 'Plant', 'Insect', 'Fish', 'Demon', 'DemiHuman', 'Angel', 'Dragon']
SIZE = ['Small', 'Medium', 'Large']
maps = collections.defaultdict(list); names_ko = {}
for mp, ko, aegis in navi:
    maps[aegis].append(mp); names_ko[aegis] = ko
out = {}; missing = []
for aegis, mps in maps.items():
    m = by_aegis.get(aegis)
    if not m: missing.append(aegis); continue
    g = lambda k, d=0: m.get(k, d)
    lv = g('Level', 1); ele = ELEM.index(g('Element', 'Neutral')); elv = g('ElementLevel', 1)
    race = RACE.index('DemiHuman' if g('Race', 'Formless') == 'Demihuman' else g('Race', 'Formless'))
    size = SIZE.index(g('Size', 'Small')); boss = 1 if g('Class', 'Normal') == 'Boss' or m.get('Mvp') else 0
    atk1, atk2 = g('Attack'), g('Attack2')
    base = atk1 + lv + g('Str', 1)
    out[str(m['Id'])] = {
        'id': m['Id'], 'dbname': aegis, 'name': m.get('Name', aegis), 'spawn': ','.join(sorted(set(mps))),
        'stats': {
            'attackRange': g('AttackRange', 1), 'level': lv, 'health': g('Hp', 1), 'sp': g('Sp', 1),
            'str': g('Str', 1), 'int': g('Int', 1), 'vit': g('Vit', 1), 'dex': g('Dex', 1), 'agi': g('Agi', 1), 'luk': g('Luk', 1),
            'rechargeTime': g('AttackDelay'), 'atk1': atk1, 'atk2': atk2,
            'attack': {'minimum': base, 'maximum': base + atk2}, 'magicAttack': {'minimum': atk2, 'maximum': atk2},
            'defense': g('Defense'), 'baseExperience': g('BaseExp'), 'jobExperience': g('JobExp'),
            'aggroRange': g('ChaseRange', 12), 'escapeRange': 12, 'movementSpeed': g('WalkSpeed', 150),
            'attackSpeed': g('AttackDelay'), 'attackedSpeed': g('DamageMotion'),
            'element': elv * 20 + ele, 'scale': size, 'race': race, 'magicDefense': g('MagicDefense'),
            'hit': lv + g('Agi', 1) + 200, 'flee': lv + g('Dex', 1) + 170,
            'ai': 'MONSTER_TYPE_' + str(g('Ai', '06')), 'mvp': 1 if m.get('Mvp') else 0, 'class': boss, 'attr': 0, 'res': 0, 'mres': 0,
            'elementName': f'{ELEM[ele]} {elv}', 'elementShortName': ELEM[ele], 'scaleName': SIZE[size], 'raceName': RACE[race],
        },
    }
# ---- ROZ's own numbers (rozerodb.com, scraped from the live server data) override rAthena ----
EL = {'N': 0, 'W': 1, 'E': 2, 'F': 3, 'A': 4, 'P': 5, 'H': 6, 'S': 7, 'G': 8, 'U': 9}
roz_rows = [l.rstrip('\n').split(',', 22) for l in open('tools/roz/rozerodb-monsters.csv', encoding='utf-8') if l.strip() and not l.startswith('#')]
by_dbname = {v['dbname']: k for k, v in out.items()}
updated = added = 0
for r in roz_rows:
    (mid, lv, hp, df, mdf, amin, amax, mmin, mmax, flee, hit, st, ag, vi, it, dx, lk, ele, race, size, boss, aegis, name) = r
    if int(hp) <= 0: continue
    n = lambda x, d: int(x) if int(x) > 0 else d
    k = by_dbname.get(aegis) or (mid if mid in out else None)
    if k is None:
        k = mid; added += 1
        out[k] = {'id': int(mid), 'dbname': aegis, 'name': name, 'spawn': ','.join(sorted(set(maps.get(aegis, [])))), 'stats': {
            'attackRange': 1, 'sp': 1, 'rechargeTime': 1500, 'atk1': 0, 'atk2': 0, 'baseExperience': 0, 'jobExperience': 0, 'aggroRange': 12,
            'escapeRange': 12, 'movementSpeed': 150, 'attackSpeed': 1500, 'attackedSpeed': 500, 'ai': 'MONSTER_TYPE_06', 'attr': 0, 'res': 0, 'mres': 0}}
    else:
        updated += 1
    st_ = out[k]['stats']; o = dict(st_)
    e, elv = EL[ele[0]], int(ele[1:])
    st_.update({
        'level': int(lv), 'health': int(hp), 'defense': int(df), 'magicDefense': int(mdf),
        'str': n(st, o.get('str', 1)), 'agi': n(ag, o.get('agi', 1)), 'vit': n(vi, o.get('vit', 1)), 'int': n(it, o.get('int', 1)),
        'dex': n(dx, o.get('dex', 1)), 'luk': n(lk, o.get('luk', 1)),
        'attack': {'minimum': n(amin, (o.get('attack') or {}).get('minimum', 1)), 'maximum': n(amax, (o.get('attack') or {}).get('maximum', 1))},
        'magicAttack': {'minimum': n(mmin, (o.get('magicAttack') or {}).get('minimum', 1)), 'maximum': n(mmax, (o.get('magicAttack') or {}).get('maximum', 1))},
        'hit': n(hit, int(lv) + n(ag, 1) + 200), 'flee': n(flee, int(lv) + n(dx, 1) + 170),
        'element': elv * 20 + e, 'scale': int(size), 'race': int(race),
        'mvp': 1 if boss == 'M' else 0, 'class': 1 if boss in ('M', 'B') else 0,
        'elementName': f'{ELEM[e]} {elv}', 'elementShortName': ELEM[e], 'scaleName': SIZE[int(size)], 'raceName': RACE[int(race)],
    })
    out[k]['rozVerified'] = True
print('ROZ stats applied', updated, 'new monsters', added)

for k, v in latam.items():
    if 'Dummy' in v['name']: out[k] = v
json.dump(out, open('src/assets/demo/data/monster.json', 'w'), ensure_ascii=False, indent=1)
print('monsters', len(out), 'missing in rAthena', len(missing), missing[:20])
