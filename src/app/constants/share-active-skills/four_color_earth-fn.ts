import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

export const FourColorEarthFn = (): ActiveSkillModel => ({
  label: 'Earth Colors Charm',
  name: 'Earth Colors Charm',
  inputType: 'selectButton',
  dropdown: [
    { label: 'Yes', value: 1, isUse: true },
    { label: 'No', value: 0, isUse: false },
  ],
});
