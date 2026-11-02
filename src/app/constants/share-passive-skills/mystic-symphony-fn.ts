import { PassiveSkillModel } from '../../jobs/_character-base.abstract';

export const MysticSymphonyFn = (): PassiveSkillModel => ({
  label: 'Mystic Symphony',
  name: 'Mystic Symphony',
  inputType: 'selectButton',
  dropdown: [
    { label: 'Yes', value: 1, isUse: true, bonus: { p_race_fish: 50, p_race_demihuman: 50, m_race_fish: 50, m_race_demihuman: 50, "Rhythm Shooting": 100, "Rose Blossom": 100 } },
    { label: 'No', value: 0, isUse: false },
  ],
});
