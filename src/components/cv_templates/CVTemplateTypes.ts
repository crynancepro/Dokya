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
  effectiveHobbies: string[];
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

/**
 * Standard A4 CV Divider Component
 * width: 100%, border: none, border-top: 2px solid var(--accent-color), margin: 12px 0, box-sizing: border-box
 */
export const CVDivider: React.FC<{ color?: string; className?: string; style?: React.CSSProperties }> = ({
  color,
  className = '',
  style = {}
}) => React.createElement('div', {
  className: `cv-divider w-full ${className}`,
  style: {
    width: '100%',
    border: 'none',
    borderTop: `2px solid ${color || 'var(--accent-color, #3b82f6)'}`,
    margin: '12px 0',
    boxSizing: 'border-box',
    ...style
  }
});

