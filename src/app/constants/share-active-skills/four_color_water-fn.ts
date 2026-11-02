import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

export const FourColorWaterFn = (): ActiveSkillModel => ({
  label: 'Water Colors Charm',
  name: 'Water Colors Charm',
  inputType: 'selectButton',
  dropdown: [
    { label: 'Yes', value: 1, isUse: true },
    { label: 'No', value: 0, isUse: false },
  ],
});
