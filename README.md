# Website

[https://attackjom.github.io/tong-calc-ro-host/#/](https://attackjom.github.io/tong-calc-ro-host/#/)

---
## ROZ Global edition (this branch)
- ROZ classes: `src/app/jobs/roz/roz-classes.ts`; generated skill data: `src/app/jobs/roz/roz-data.generated.ts` (`python3 tools/roz/gen-skills.py`).
- Items: `python3 tools/roz/convert-items-en.py` (from the patched ROZ client's English item table).
- Monsters: `python3 tools/roz/convert-monsters.py` (ROZ spawn list + rAthena stats).
- Build: `npm ci && npx ng build --base-href ./` → `dist/sakai-ng`, published on the `main` branch (GitHub Pages).
