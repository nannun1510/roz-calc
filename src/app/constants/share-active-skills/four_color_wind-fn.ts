import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

export const FourColorWindFn = (): ActiveSkillModel => ({
  label: 'Wind Colors Charm',
  name: 'Wind Colors Charm',
  inputType: 'selectButton',
  dropdown: [
    { label: 'Yes', value: 1, isUse: true },
    { label: 'No', value: 0, isUse: false },
  ],
});
