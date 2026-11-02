export const AspdPotionList = [
  { label: 'Concentration Potion', value: 645, bonus: 4 },
  { label: 'Awakening Potion', value: 656, bonus: 6 },
  { label: 'Berserk Potion', value: 657, bonus: 9 },
];

export const AspdPotionStackable = [{ label: 'ASPD Potion', value: 12684, bonus: 3 }];

export const AspdPotionList2 = [{ label: 'Enrich Celermine', value: 12437 }, ...AspdPotionStackable];

export const AspdPotionFixBonus = new Map([...AspdPotionList, ...AspdPotionStackable].map((a) => [a.value, a.bonus]));

export const extrabuff = [{ label: 'Confidential Document', value: 103428 },
						{ label: 'Symposium Rice Cake', value: 103429 },
						{ label: 'Symposium Butter Cookie', value: 103430 },
						{ label: 'Symposium Coffee Stick', value: 103431 }
						];