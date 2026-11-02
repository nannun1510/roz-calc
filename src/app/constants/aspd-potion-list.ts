export const AspdPotionList = [
  { label: 'Concentration Potion', value: 645, bonus: 4 },
  { label: 'Awakening Potion', value: 656, bonus: 6 },
  { label: 'Berserk Potion', value: 657, bonus: 9 },
];

// ROZ: Agi Up Potion stacks with the potions above ("ASPD increases slightly more"); treated like kRO's ASPD Potion (+3)
export const AspdPotionStackable = [{ label: 'Agi Up Potion', value: 107045, bonus: 3 }];

export const AspdPotionList2 = [...AspdPotionStackable];

export const AspdPotionFixBonus = new Map([...AspdPotionList, ...AspdPotionStackable].map((a) => [a.value, a.bonus]));

export const extrabuff: { label: string; value: number }[] = [];