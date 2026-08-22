import React from 'react';
import { CVFormData, AIOptimizedData, Experience, Education, SkillCategory, Language, CustomSection, PersonalInfo } from '../../types';

export interface CVTemplateInternalProps {
  formData: CVFormData;
  personalInfo: PersonalInfo;
  experiences: Experience[];
  education: Education[];
  skills: SkillCategory[];
  languages: Language[];
  customSections?: CustomSection[];
  profileSummary: string;
  themeHex: string;
  activeStyle: string;
  makeEditable: (currentValue: string, onSave: (val: string) => void) => any;
  updatePersonalInfo: (field: keyof PersonalInfo, value: string) => void;
  alignClass: string;
  photoShapeClass: string;
  renderCustomSections: () => React.ReactNode;
  renderFreeTextBlocks: () => React.ReactNode;
  aiData?: AIOptimizedData | null;
}
