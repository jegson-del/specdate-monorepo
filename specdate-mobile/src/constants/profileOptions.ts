export const OCCUPATION_OPTIONS = [
  'Student',
  'Employed (Private)',
  'Employed (Government)',
  'Self-employed',
  'Freelancer',
  'Business owner',
  'Unemployed',
  'Homemaker',
  'Retired',
] as const;

export const QUALIFICATION_OPTIONS = [
  'High School',
  'Diploma',
  'Bachelor’s',
  'Master’s',
  'PhD',
  'Professional Certification',
] as const;

export const SEX_OPTIONS = ['Male', 'Female', 'Other'] as const;

/** Religion options for profile and spec requirements. "Any" = no filter when used as spec requirement. */
export const RELIGION_OPTIONS = [
    'Any',
    'Christianity',
    'Muslim',
    'Buddhist',
    'Sikh',
    'Hindu',
    'Jewish',
    'Other',
] as const;

