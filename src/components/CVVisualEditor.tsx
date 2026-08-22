import React from 'react';
import { CVFormData } from '../types';
import { CVTemplate } from './CVTemplate';

interface CVVisualEditorProps {
  formData: CVFormData;
  onChange: (data: CVFormData) => void;
  isEditingDirectly?: boolean;
  onToggleDirectEdit?: () => void;
  unlocked?: boolean;
}

export const CVVisualEditor: React.FC<CVVisualEditorProps> = ({
  formData,
  onChange,
  unlocked = true,
}) => {
  return (
    <div className="relative w-full overflow-hidden">
      <div id="cv-preview" className="w-full">
        <CVTemplate
          formData={formData}
          aiData={formData.aiOptimizedData}
          onFormDataChange={onChange}
          unlocked={unlocked}
        />
      </div>
    </div>
  );
};
