import React from 'react';
import { CVFormData, AIOptimizedData, TemplateStyle, Experience, Education } from '../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Award, Briefcase, GraduationCap, Sparkles, User, CheckCircle2, Code, Terminal, Crown, Rocket, Zap, ChevronRight, TrendingUp, Move, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { CVTemplateRenderersNewSansPhoto } from './cv_templates/CVTemplateRenderersNewSansPhoto';
import { CVTemplateRenderersNewAvecPhoto } from './cv_templates/CVTemplateRenderersNewAvecPhoto';

export interface CVTemplateProps {
  formData?: CVFormData;
  data?: CVFormData;
  aiData?: AIOptimizedData | null;
  style?: TemplateStyle;
  primaryColor?: string;
  isUnlocked?: boolean;
  isPaid?: boolean;
  isEditingDirectly?: boolean;
  onFormDataChange?: (updated: CVFormData) => void;
}

export const CVTemplate: React.FC<CVTemplateProps> = ({
  formData: propFormData,
  data: propData,
  aiData,
  style = 'moderne',
  primaryColor = '#4f46e5',
  isUnlocked,
  isPaid,
  isEditingDirectly = false,
  onFormDataChange,
}) => {
  const formData = propFormData || propData || ({} as CVFormData);
  const unlocked = isPaid !== undefined ? isPaid : (isUnlocked ?? true);
  const personalInfo = formData?.personalInfo || { firstName: '', lastName: '', email: '', phone: '', address: '', city: 'Dakar', country: 'Sénégal', targetJob: '', linkedin: '', portfolio: '', photoUrl: '' };
  const experiences = formData?.experiences || [];
  const education = formData?.education || [];
  const skills = formData?.skills || [];
  const languages = formData?.languages || [];
  const customSections = formData?.customSections || [];
  const activeStyle = formData?.templateStyle || style;
  const themeHex = formData?.themeColor || primaryColor;

  // Font family class
  const fontClass = formData.fontFamily === 'serif' ? 'font-serif' : formData.fontFamily === 'mono' ? 'font-mono' : 'font-sans';
  
  // Font size class
  const fontSizeClass = formData.fontSize === 'small' 
    ? 'text-[11px] sm:text-xs leading-snug' 
    : formData.fontSize === 'large' 
    ? 'text-sm sm:text-base leading-normal' 
    : 'text-xs sm:text-sm leading-relaxed';

  // Spacing class
  const spacingClass = formData.spacing === 'compact'
    ? 'space-y-3 p-4 sm:p-5'
    : formData.spacing === 'relaxed'
    ? 'space-y-7 p-8 sm:p-10'
    : 'space-y-5 p-6 sm:p-8';

  // Profile summary: prioritize AI data if present
  const profileSummary = aiData?.profileSummary || 
    `Professionnel qualifié et motivé disposant d'une solide expérience sur le poste de ${personalInfo.targetJob || 'spécialiste'}. Rigoureux, autonome et orienté résultats, engagé à apporter une réelle valeur ajoutée aux projets d'entreprise.`;

  // Effective Hobbies (User input or AI auto-enriched default)
  const effectiveHobbies: string[] = (formData?.hobbies && formData.hobbies.length > 0)
    ? formData.hobbies
    : (aiData?.hobbies && aiData.hobbies.length > 0)
    ? aiData.hobbies
    : [
        "Veille technologique & Innovation continue",
        "Lecture stratégique & Analyse économique",
        "Pratique sportive régulière (Course à pied / Trail)",
        "Engagement associatif & Mentorat de jeunes talents"
      ];

  // Helper for updating nested personal info fields directly
  const updatePersonalInfo = (field: keyof typeof personalInfo, value: string) => {
    if (!onFormDataChange) return;
    onFormDataChange({
      ...formData,
      personalInfo: {
        ...formData.personalInfo,
        [field]: value
      }
    });
  };

  // Clean no-op editable helper
  const makeEditable = (_currentValue: string, _onSave: (val: string) => void) => {
    return {};
  };

  // Section Reordering Engine & Controls
  const defaultSectionOrder = ['summary', 'experiences', 'education', 'skills', 'languages', 'customSections', 'freeTextBlocks'];
  const sectionOrder = formData.sectionOrder && formData.sectionOrder.length > 0
    ? formData.sectionOrder
    : defaultSectionOrder;

  // Clean Section Wrapper with page-break-inside avoid for PDF export
  const SectionWrapper: React.FC<{
    sectionKey: string;
    title: string;
    children: React.ReactNode;
  }> = ({ children }) => {
    return (
      <div 
        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
        className="relative my-2 break-inside-avoid page-break-inside-avoid"
      >
        {children}
      </div>
    );
  };

  // Photo shape style helper
  const photoShapeClass = formData.photoShape === 'square'
    ? 'rounded-none'
    : formData.photoShape === 'rounded'
    ? 'rounded-2xl'
    : formData.photoShape === 'ring'
    ? 'rounded-full ring-4 ring-amber-400 shadow-xl'
    : 'rounded-full';

  // Text alignment helper
  const alignClass = formData.textAlign === 'center' 
    ? 'text-center' 
    : formData.textAlign === 'justify' 
    ? 'text-justify' 
    : 'text-left';

  // Render Canva Free Text Blocks
  const renderFreeTextBlocks = () => {
    if (!formData.freeTextBlocks || formData.freeTextBlocks.length === 0) return null;
    return (
      <div className="space-y-3 my-4">
        {formData.freeTextBlocks.map((block) => {
          const updateBlockText = (newText: string) => {
            if (!onFormDataChange) return;
            const updated = (formData.freeTextBlocks || []).map(b => 
              b.id === block.id ? { ...b, text: newText } : b
            );
            onFormDataChange({ ...formData, freeTextBlocks: updated });
          };

          const updateBlockTitle = (newTitle: string) => {
            if (!onFormDataChange) return;
            const updated = (formData.freeTextBlocks || []).map(b => 
              b.id === block.id ? { ...b, title: newTitle } : b
            );
            onFormDataChange({ ...formData, freeTextBlocks: updated });
          };

          if (block.style === 'badge') {
            return (
              <div key={block.id} className="py-1">
                {block.title && <h4 className="font-extrabold text-xs text-slate-900 uppercase border-b border-slate-200 pb-0.5 mb-1" {...makeEditable(block.title, updateBlockTitle)}>{block.title}</h4>}
                <p className="text-xs text-slate-700" {...makeEditable(block.text, updateBlockText)}>{block.text}</p>
              </div>
            );
          }
          if (block.style === 'banner') {
            return (
              <div key={block.id} className="py-1">
                {block.title && <h4 className="font-extrabold text-xs uppercase text-slate-900 border-b border-slate-200 pb-0.5 mb-1" {...makeEditable(block.title, updateBlockTitle)}>{block.title}</h4>}
                <p className="text-xs text-slate-700" {...makeEditable(block.text, updateBlockText)}>{block.text}</p>
              </div>
            );
          }
          if (block.style === 'quote') {
            return (
              <div key={block.id} className="py-1 text-slate-700 text-xs italic">
                {block.title && <strong className="not-italic font-bold block text-slate-900 mb-0.5" {...makeEditable(block.title, updateBlockTitle)}>{block.title}</strong>}
                <span {...makeEditable(block.text, updateBlockText)}>"{block.text}"</span>
              </div>
            );
          }
          return (
            <div key={block.id} className="py-1">
              {block.title && <h4 className="font-extrabold text-xs text-slate-900 border-b border-slate-200 pb-0.5 mb-1" {...makeEditable(block.title, updateBlockTitle)}>{block.title}</h4>}
              <p className="text-xs text-slate-700" {...makeEditable(block.text, updateBlockText)}>{block.text}</p>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Custom Sections
  const renderCustomSections = () => {
    if (!formData.customSections || formData.customSections.length === 0) return null;
    return (
      <div className="space-y-3 my-3">
        {formData.customSections.map((sec) => {
          const updateSecTitle = (newTitle: string) => {
            if (!onFormDataChange) return;
            const updated = (formData.customSections || []).map(s => s.id === sec.id ? { ...s, title: newTitle } : s);
            onFormDataChange({ ...formData, customSections: updated });
          };

          const updateSecContent = (newContent: string) => {
            if (!onFormDataChange) return;
            const updated = (formData.customSections || []).map(s => s.id === sec.id ? { ...s, content: newContent } : s);
            onFormDataChange({ ...formData, customSections: updated });
          };

          return (
            <div key={sec.id} className="space-y-1">
              <h3 
                className="text-xs font-black uppercase tracking-widest text-slate-800 border-b pb-1 flex items-center justify-between"
                style={{ borderColor: themeHex }}
                {...makeEditable(sec.title, updateSecTitle)}
              >
                <span>{sec.title}</span>
              </h3>
              <p 
                className="text-xs leading-relaxed text-slate-700 whitespace-pre-line pt-0.5"
                {...makeEditable(sec.content, updateSecContent)}
              >
                {sec.content}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      id="cv-preview"
      data-a4-document="true"
      style={{
        width: '210mm',
        minWidth: '210mm',
        maxWidth: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
      className={`bg-white text-slate-800 shadow-xl rounded-none print:shadow-none print:rounded-none border border-slate-200 transition-all relative w-[210mm] min-w-[210mm] max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between ${fontClass} ${fontSizeClass} a4-document-root`}
    >
      {/* Subtle Watermark Overlay when in unpaid preview mode */}
      {!unlocked && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-around overflow-hidden opacity-[0.12] select-none">
          <div className="text-2xl sm:text-4xl font-black text-slate-900 -rotate-45 tracking-widest uppercase">
            DOKYA • APERÇU GRATUIT
          </div>
          <div className="text-2xl sm:text-4xl font-black text-slate-900 -rotate-45 tracking-widest uppercase">
            DOKYA • APERÇU GRATUIT
          </div>
          <div className="text-2xl sm:text-4xl font-black text-slate-900 -rotate-45 tracking-widest uppercase">
            DOKYA • APERÇU GRATUIT
          </div>
        </div>
      )}

      {/* Main CV Content Wrapper */}
      <div className="flex-1 flex flex-col justify-between w-full h-full min-h-[297mm] transition-all duration-300">
      {/* ------------------------------------------------------------- */}
      {/* STYLE 1: MODERNE (En-tête Coloré & Layout Fluide) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'moderne' && (
        <div className="w-full bg-white">
          {/* Header Banner */}
          <div 
            className="p-6 sm:p-7 text-white relative overflow-hidden"
            style={{ backgroundColor: themeHex }}
          >
            <div className="relative z-10 max-w-3xl">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase">
                <span {...makeEditable(personalInfo.firstName || '', (val) => updatePersonalInfo('firstName', val))}>
                  {personalInfo.firstName || 'Aminata'}
                </span>{' '}
                <span className="font-light" {...makeEditable(personalInfo.lastName || '', (val) => updatePersonalInfo('lastName', val))}>
                  {personalInfo.lastName || 'Diop'}
                </span>
              </h1>
              <p className="text-base sm:text-lg font-medium text-white/90 mt-1 uppercase tracking-wider" {...makeEditable(personalInfo.targetJob || '', (val) => updatePersonalInfo('targetJob', val))}>
                {personalInfo.targetJob || 'Développeur Full-Stack'}
              </p>

              {/* Contact Pill Row */}
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs mt-3 text-white/80">
                {personalInfo.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span {...makeEditable(personalInfo.email, (val) => updatePersonalInfo('email', val))}>{personalInfo.email}</span>
                  </span>
                )}
                {personalInfo.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span {...makeEditable(personalInfo.phone, (val) => updatePersonalInfo('phone', val))}>{personalInfo.phone}</span>
                  </span>
                )}
                {personalInfo.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span {...makeEditable(personalInfo.city, (val) => updatePersonalInfo('city', val))}>{personalInfo.city}</span>
                  </span>
                )}
                {personalInfo.linkedin && (
                  <span className="flex items-center gap-1.5">
                    <Linkedin className="w-3.5 h-3.5 shrink-0" />
                    <span {...makeEditable(personalInfo.linkedin, (val) => updatePersonalInfo('linkedin', val))}>{personalInfo.linkedin}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Main Body with Dynamic Section Reordering */}
          <div className={`p-6 sm:p-7 space-y-5 ${alignClass} bg-white`}>
            {sectionOrder.map((sectionKey) => {
              if (sectionKey === 'summary' && !formData.hideSummary) {
                return (
                  <SectionWrapper key="summary" sectionKey="summary" title="Profil">
                    <div className="space-y-1">
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 border-b pb-1 flex items-center gap-1.5" style={{ borderColor: themeHex }}>
                        <Sparkles className="w-3.5 h-3.5" style={{ color: themeHex }} />
                        <span>Profil Professionnel</span>
                      </h2>
                      <p 
                        className="text-slate-600 text-xs sm:text-sm italic leading-relaxed pt-1"
                        {...makeEditable(profileSummary, (val) => {
                          if (onFormDataChange) {
                            onFormDataChange({
                              ...formData,
                              aiOptimizedData: {
                                ...(formData.aiOptimizedData || {}),
                                profileSummary: val
                              }
                            });
                          }
                        })}
                      >
                        "{profileSummary}"
                      </p>
                    </div>
                  </SectionWrapper>
                );
              }

              if (sectionKey === 'experiences' && !formData.hideExperiences && experiences.length > 0) {
                return (
                  <SectionWrapper key="experiences" sectionKey="experiences" title="Expériences">
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-3 border-b pb-1 flex items-center gap-2" style={{ borderColor: themeHex }}>
                        <Briefcase className="w-4 h-4" style={{ color: themeHex }} />
                        <span>Expériences Professionnelles</span>
                      </h2>

                      <div className="space-y-3.5">
                        {experiences.map((exp, expIdx) => {
                          const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                          const bullets = aiExp?.optimizedDescription && aiExp.optimizedDescription.length > 0 
                            ? aiExp.optimizedDescription 
                            : exp.description ? [exp.description] : [];

                          const updateExp = (field: keyof Experience, val: any) => {
                            if (!onFormDataChange) return;
                            const updated = formData.experiences.map(e => e.id === exp.id ? { ...e, [field]: val } : e);
                            onFormDataChange({ ...formData, experiences: updated });
                          };

                          return (
                            <div key={exp.id} className="space-y-1">
                              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                                  <span>{exp.position || 'Poste'}</span>{' '}
                                  <span className="font-semibold" style={{ color: themeHex }}>
                                    @ <span>{exp.company || 'Entreprise'}</span>
                                  </span>
                                </h3>
                                <span className="text-[11px] font-bold text-slate-500 shrink-0">
                                  <span>{exp.startDate}</span> - <span>{exp.current ? 'Présent' : exp.endDate}</span> | <span>{exp.location || 'Dakar'}</span>
                                </span>
                              </div>

                              {bullets.length > 0 && (
                                <ul className="mt-1 space-y-1 list-disc list-inside text-slate-600 text-xs pl-1">
                                  {bullets.map((bullet, i) => (
                                    <li key={i} className="leading-relaxed">
                                      <span>{bullet}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </SectionWrapper>
                );
              }

              if (sectionKey === 'education' && !formData.hideEducation && education.length > 0) {
                return (
                  <SectionWrapper key="education" sectionKey="education" title="Formations">
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-3 border-b pb-1 flex items-center gap-2" style={{ borderColor: themeHex }}>
                        <GraduationCap className="w-4 h-4" style={{ color: themeHex }} />
                        <span>Formations & Diplômes</span>
                      </h2>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {education.map((edu, eduIdx) => {
                          const updateEdu = (field: keyof Education, val: any) => {
                            if (!onFormDataChange) return;
                            const updated = formData.education.map(e => e.id === edu.id ? { ...e, [field]: val } : e);
                            onFormDataChange({ ...formData, education: updated });
                          };

                          return (
                            <div key={edu.id} className="text-xs space-y-0.5">
                              <div className="flex justify-between items-baseline">
                                <h3 className="font-bold text-slate-900">
                                  {edu.degree} {edu.fieldOfStudy ? `- ${edu.fieldOfStudy}` : ''}
                                </h3>
                                <span className="text-[10px] font-bold text-slate-500 shrink-0">
                                  {edu.startDate} - {edu.endDate}
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold text-slate-600">
                                {edu.institution} ({edu.location})
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </SectionWrapper>
                );
              }

              if (sectionKey === 'skills' && !formData.hideSkills && skills.length > 0) {
                return (
                  <SectionWrapper key="skills" sectionKey="skills" title="Compétences">
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-2 border-b pb-1 flex items-center gap-2" style={{ borderColor: themeHex }}>
                        <Award className="w-4 h-4" style={{ color: themeHex }} />
                        <span>Compétences</span>
                      </h2>

                      <div className="space-y-1.5 pt-0.5">
                        {skills.map((cat, i) => (
                          <div key={i} className="text-xs text-slate-700">
                            <strong 
                              className="text-slate-900 font-bold uppercase tracking-wider text-[11px]"
                              {...makeEditable(cat.category, (newCat) => {
                                if (!onFormDataChange) return;
                                const newSkills = [...formData.skills];
                                if (newSkills[i]) {
                                  newSkills[i] = { ...newSkills[i], category: newCat };
                                  onFormDataChange({ ...formData, skills: newSkills });
                                }
                              })}
                            >
                              {cat.category} :{' '}
                            </strong>
                            <span>{cat.skills.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionWrapper>
                );
              }

              if (sectionKey === 'languages' && !formData.hideLanguages && languages.length > 0) {
                return (
                  <SectionWrapper key="languages" sectionKey="languages" title="Langues">
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-2 border-b pb-1 flex items-center gap-2" style={{ borderColor: themeHex }}>
                        <Globe className="w-4 h-4" style={{ color: themeHex }} />
                        <span>Langues</span>
                      </h2>

                      <div className="space-y-1">
                        {languages.map((lang, i) => (
                          <div key={i} className="flex justify-between items-center text-xs border-b border-slate-100 pb-0.5">
                            <span 
                              className="font-semibold text-slate-800"
                              {...makeEditable(lang.name, (newName) => {
                                if (!onFormDataChange) return;
                                const newLangs = [...formData.languages];
                                if (newLangs[i]) {
                                  newLangs[i] = { ...newLangs[i], name: newName };
                                  onFormDataChange({ ...formData, languages: newLangs });
                                }
                              })}
                            >
                              {lang.name}
                            </span>
                            <span 
                              className="text-slate-500 font-medium text-[11px]"
                              {...makeEditable(lang.level, (newLevel) => {
                                if (!onFormDataChange) return;
                                const newLangs = [...formData.languages];
                                if (newLangs[i]) {
                                  newLangs[i] = { ...newLangs[i], level: newLevel };
                                  onFormDataChange({ ...formData, languages: newLangs });
                                }
                              })}
                            >
                              {lang.level}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionWrapper>
                );
              }

              if (sectionKey === 'customSections') {
                return (
                  <SectionWrapper key="customSections" sectionKey="customSections" title="Sections Personnalisées">
                    {renderCustomSections()}
                  </SectionWrapper>
                );
              }

              if (sectionKey === 'freeTextBlocks') {
                return (
                  <SectionWrapper key="freeTextBlocks" sectionKey="freeTextBlocks" title="Blocs Libres">
                    {renderFreeTextBlocks()}
                  </SectionWrapper>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 2: CLASSIQUE (Formel, Épuré, Traditionnel) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'classique' && (
        <div className="p-8 sm:p-10 space-y-6 bg-white">
          {/* Centered Traditional Header */}
          <div className="text-center border-b-2 pb-5" style={{ borderColor: themeHex }}>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase">
              {personalInfo.firstName} {personalInfo.lastName}
            </h1>
            <p className="text-base font-bold uppercase tracking-widest mt-1" style={{ color: themeHex }}>
              {personalInfo.targetJob}
            </p>

            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-600 font-medium">
              {personalInfo.city && <span>📍 {personalInfo.city}, {personalInfo.country || 'Sénégal'}</span>}
              {personalInfo.phone && <span>📞 {personalInfo.phone}</span>}
              {personalInfo.email && <span>✉️ {personalInfo.email}</span>}
              {personalInfo.linkedin && <span>🔗 {personalInfo.linkedin}</span>}
            </div>
          </div>

          {/* Profil */}
          <div className="space-y-1.5">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b pb-1" style={{ borderColor: themeHex }}>
              Profil Professionnel
            </h2>
            <p className="text-xs leading-relaxed text-slate-700 italic pt-0.5">
              {profileSummary}
            </p>
          </div>

          {/* Expériences */}
          <div className="space-y-4">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b pb-1" style={{ borderColor: themeHex }}>
              Parcours Professionnel
            </h2>
            {experiences.map((exp) => {
              const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
              const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);

              return (
                <div key={exp.id} className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      {exp.position} — <span style={{ color: themeHex }}>{exp.company}</span>
                    </h3>
                    <span className="text-[11px] font-bold text-slate-500">
                      {exp.startDate} – {exp.current ? 'Présent' : exp.endDate} ({exp.location})
                    </span>
                  </div>
                  <ul className="text-xs text-slate-700 list-disc list-inside space-y-1 pl-1">
                    {bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Formations & Compétences Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b pb-1 mb-2" style={{ borderColor: themeHex }}>
                Formations
              </h2>
              {education.map((edu) => (
                <div key={edu.id} className="text-xs mb-2.5 space-y-0.5">
                  <span className="font-bold text-slate-900 block">{edu.degree}</span>
                  <span className="text-slate-700">{edu.institution} ({edu.location})</span>
                  <span className="text-[10px] text-slate-500 block font-semibold">{edu.startDate} - {edu.endDate}</span>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b pb-1 mb-2" style={{ borderColor: themeHex }}>
                Compétences & Langues
              </h2>
              {skills.map((cat, idx) => (
                <div key={idx} className="text-xs text-slate-700 mb-1.5">
                  <strong className="text-slate-900 font-bold">{cat.category} :</strong>{' '}
                  <span>{cat.skills.join(', ')}</span>
                </div>
              ))}
              <div className="mt-2 text-xs text-slate-700">
                <strong className="text-slate-900 font-bold">Langues :</strong>{' '}
                <span>{languages.map(l => `${l.name} (${l.level})`).join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 3: ELEGANT (2 Colonnes avec Sidebar Sombre à Gauche) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'elegant' && (
        <div className="grid grid-cols-1 md:grid-cols-3 min-h-[1000px] bg-white">
          {/* Dark Sidebar */}
          <div className="p-6 text-white space-y-6" style={{ backgroundColor: '#1e293b' }}>
            <div className="space-y-1.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-xl mb-3">
                {personalInfo.firstName ? personalInfo.firstName[0] : 'A'}
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white leading-tight">
                {personalInfo.firstName}<br />{personalInfo.lastName}
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                {personalInfo.targetJob}
              </p>
            </div>

            <div className="border-t border-slate-700/80 pt-4 space-y-2.5 text-xs text-slate-300">
              <h3 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Contact</h3>
              {personalInfo.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> <span className="break-all">{personalInfo.email}</span></div>}
              {personalInfo.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> <span>{personalInfo.phone}</span></div>}
              {personalInfo.city && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> <span>{personalInfo.city}, Sénégal</span></div>}
              {personalInfo.linkedin && <div className="flex items-center gap-2"><Linkedin className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> <span className="break-all">{personalInfo.linkedin}</span></div>}
            </div>

            {/* Skills in Sidebar */}
            <div className="border-t border-slate-700/80 pt-4 space-y-3">
              <h3 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Compétences</h3>
              {skills.map((cat, i) => (
                <div key={i} className="text-xs space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">{cat.category}</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{cat.skills.join(', ')}</p>
                </div>
              ))}
            </div>

            {/* Languages in Sidebar */}
            <div className="border-t border-slate-700/80 pt-4 space-y-2">
              <h3 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Langues</h3>
              {languages.map((l, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="font-semibold">{l.name}</span>
                  <span className="text-slate-400 text-[11px]">{l.level}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Main Content */}
          <div className="md:col-span-2 p-7 space-y-6 bg-white">
            <div className="space-y-1">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-1 border-b-2 border-indigo-600 pb-1">
                Profil Professionnel
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed italic pt-1">
                {profileSummary}
              </p>
            </div>

            {/* Experiences */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 border-b-2 border-indigo-600 pb-1 mb-4">
                Expériences Professionnelles
              </h2>
              <div className="space-y-4">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription && aiExp.optimizedDescription.length > 0 
                    ? aiExp.optimizedDescription 
                    : exp.description ? [exp.description] : [];

                  return (
                    <div key={exp.id} className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold text-slate-900 text-sm">{exp.position} <span className="font-semibold text-indigo-600">| {exp.company}</span></h3>
                        <span className="text-[11px] font-bold text-slate-400">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Formations */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 border-b-2 border-indigo-600 pb-1 mb-3">
                Formations
              </h2>
              <div className="space-y-2.5">
                {education.map((edu) => (
                  <div key={edu.id} className="flex justify-between items-start text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">{edu.degree} - {edu.fieldOfStudy}</span>
                      <span className="text-slate-600">{edu.institution} ({edu.location})</span>
                    </div>
                    <span className="text-slate-400 font-bold shrink-0">{edu.startDate} - {edu.endDate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 4: CREATIVE (Design Dynamique & ATS Épuré) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'creative' && (
        <div className="p-6 sm:p-8 space-y-6 bg-white">
          {/* Creative Top Banner */}
          <div className="bg-slate-900 p-6 rounded-none text-white relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                  {personalInfo.firstName} {personalInfo.lastName}
                </h1>
                <p className="text-sm font-semibold text-indigo-300 mt-0.5 uppercase tracking-wider">
                  {personalInfo.targetJob}
                </p>
              </div>

              <div className="text-xs text-slate-300 space-y-1 shrink-0">
                {personalInfo.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-indigo-400" /> <span>{personalInfo.email}</span></div>}
                {personalInfo.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-indigo-400" /> <span>{personalInfo.phone}</span></div>}
                {personalInfo.city && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-indigo-400" /> <span>{personalInfo.city}, Sénégal</span></div>}
              </div>
            </div>
          </div>

          {/* Profile Section */}
          <div className="space-y-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 border-indigo-600 pb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Pitch & Profil Professionnel</span>
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed font-medium pt-1">
              {profileSummary}
            </p>
          </div>

          {/* Experiences */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-3 border-b-2 border-indigo-600 pb-1 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>Expériences Marquantes</span>
            </h2>

            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);

                return (
                  <div key={exp.id} className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">{exp.position} — <span className="text-indigo-600 font-bold">{exp.company}</span></h3>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 shrink-0">
                        {exp.startDate} - {exp.current ? 'Présent' : exp.endDate} | {exp.location}
                      </span>
                    </div>

                    <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside pl-1">
                      {bullets.map((b, i) => (
                        <li key={i} className="leading-relaxed">
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Education & Skills Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-indigo-600 pb-1 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Formations</span>
              </h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2.5 last:mb-0 text-xs space-y-0.5">
                  <span className="font-bold text-slate-900 block">{edu.degree}</span>
                  <span className="text-slate-600 font-medium">{edu.institution} ({edu.location})</span>
                  <span className="text-[10px] text-slate-400 block font-semibold">{edu.startDate} - {edu.endDate}</span>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-indigo-600 pb-1 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>Compétences</span>
              </h2>
              <div className="space-y-1.5">
                {skills.map((cat, idx) => (
                  <div key={idx} className="text-xs text-slate-700">
                    <strong className="text-slate-900 font-bold uppercase">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 5: EXECUTIVE / CADRE (Style Haute Direction & Rigueur) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'executive' && (
        <div className="p-8 sm:p-10 space-y-6 bg-white">
          {/* Executive Top Accent */}
          <div className="h-1.5 w-full" style={{ backgroundColor: themeHex }}></div>

          {/* Executive Header Block */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-300 pb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                {personalInfo.firstName} <span className="font-light">{personalInfo.lastName}</span>
              </h1>
              <p className="text-base font-extrabold uppercase tracking-widest mt-1" style={{ color: themeHex }}>
                {personalInfo.targetJob}
              </p>
            </div>

            <div className="text-xs text-slate-700 space-y-1 shrink-0 font-medium">
              {personalInfo.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-800" /> <span>{personalInfo.email}</span></div>}
              {personalInfo.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-800" /> <span>{personalInfo.phone}</span></div>}
              {personalInfo.city && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-800" /> <span>{personalInfo.city}, {personalInfo.country || 'Sénégal'}</span></div>}
            </div>
          </div>

          {/* Synthèse Exécutive */}
          <div className="space-y-1.5">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1" style={{ borderColor: themeHex }}>
              Synthèse Exécutive
            </h2>
            <p className="text-xs leading-relaxed text-slate-800 font-medium pt-1">
              "{profileSummary}"
            </p>
          </div>

          {/* Parcours & Responsabilités */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1" style={{ borderColor: themeHex }}>
              Parcours de Direction & Expériences
            </h2>

            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);

                return (
                  <div key={exp.id} className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-sm font-black text-slate-900 uppercase">
                        {exp.position} <span className="font-bold lowercase text-slate-500">chez</span> <span style={{ color: themeHex }}>{exp.company}</span>
                      </h3>
                      <span className="text-[11px] font-black text-slate-500">
                        {exp.startDate} – {exp.current ? 'Présent' : exp.endDate}
                      </span>
                    </div>

                    <ul className="text-xs text-slate-700 list-disc list-inside space-y-1 pl-1">
                      {bullets.map((b, i) => (
                        <li key={i} className="leading-relaxed">{b}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Qualifications & Compétences Clés */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-200">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 border-b pb-1" style={{ color: themeHex }}>
                Diplômes & Titres
              </h2>
              {education.map((edu) => (
                <div key={edu.id} className="text-xs mb-2">
                  <span className="font-bold text-slate-900 block">{edu.degree} - {edu.fieldOfStudy}</span>
                  <span className="text-slate-600">{edu.institution} ({edu.location})</span>
                  <span className="text-[10px] text-slate-400 block">{edu.startDate} - {edu.endDate}</span>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 border-b pb-1" style={{ color: themeHex }}>
                Expertises & Compétences
              </h2>
              {skills.map((cat, idx) => (
                <div key={idx} className="text-xs text-slate-700 mb-1.5">
                  <strong className="text-slate-900 font-bold">{cat.category} :</strong>{' '}
                  <span>{cat.skills.join(' • ')}</span>
                </div>
              ))}
              <div className="mt-2 text-xs text-slate-700">
                <strong className="text-slate-900 font-bold">Langues :</strong>{' '}
                {languages.map(l => `${l.name} (${l.level})`).join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 6: MINIMAL (Format Épuré & Fortement Optimisé ATS) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'minimal' && (
        <div className="p-8 sm:p-10 space-y-5 font-sans">
          {/* Minimalist Top Bar */}
          <div className="border-b border-slate-900 pb-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {personalInfo.firstName} {personalInfo.lastName}
            </h1>
            <p className="text-xs font-extrabold text-slate-700 uppercase tracking-widest mt-0.5">
              {personalInfo.targetJob}
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-600 font-medium">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}, {personalInfo.country || 'Sénégal'}</span>}
              {personalInfo.linkedin && <span>• {personalInfo.linkedin}</span>}
            </div>
          </div>

          {/* Profile Summary */}
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 mb-1">
              Résumé Professionnel
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed">
              {profileSummary}
            </p>
          </div>

          {/* Experience ATS-friendly */}
          <div className="space-y-3">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
              Expériences Professionnelles
            </h2>
            {experiences.map((exp) => {
              const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
              const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);

              return (
                <div key={exp.id} className="space-y-0.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-bold text-slate-900">{exp.position} — {exp.company}</span>
                    <span className="text-[10px] font-semibold text-slate-500">{exp.startDate} – {exp.current ? 'Présent' : exp.endDate}</span>
                  </div>
                  <ul className="text-xs text-slate-700 list-disc list-inside space-y-0.5">
                    {bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Education ATS */}
          <div className="space-y-2">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
              Formation
            </h2>
            {education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-baseline text-xs">
                <div>
                  <span className="font-bold text-slate-900">{edu.degree}</span>
                  <span className="text-slate-600">, {edu.institution} ({edu.location})</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500">{edu.startDate} – {edu.endDate}</span>
              </div>
            ))}
          </div>

          {/* Skills & Languages ATS */}
          <div className="space-y-1.5 pt-1">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
              Compétences & Langues
            </h2>
            {skills.map((cat, idx) => (
              <div key={idx} className="text-xs text-slate-700">
                <span className="font-bold text-slate-900">{cat.category} :</span>{' '}
                <span>{cat.skills.join(', ')}</span>
              </div>
            ))}
            <div className="text-xs text-slate-700 pt-0.5">
              <span className="font-bold text-slate-900">Langues :</span>{' '}
              {languages.map(l => `${l.name} (${l.level})`).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 7: TECH & DATA (Design Développeur & Stack Épurée) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'tech' && (
        <div className="w-full font-mono text-xs bg-white">
          {/* Dark Header with Code Aesthetic */}
          <div className="bg-slate-950 p-6 sm:p-7 text-slate-100 border-b-2 border-emerald-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
                  {personalInfo.firstName || 'Aminata'} <span className="text-emerald-400 font-mono">{personalInfo.lastName || 'Diop'}</span>
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
                  &lt;{personalInfo.targetJob || 'Software Engineer'} /&gt;
                </p>
              </div>

              <div className="text-[11px] text-slate-300 space-y-1 shrink-0 font-mono">
                {personalInfo.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-emerald-400" /> {personalInfo.email}</div>}
                {personalInfo.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-emerald-400" /> {personalInfo.phone}</div>}
                {personalInfo.city && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-emerald-400" /> {personalInfo.city}, SN</div>}
                {personalInfo.portfolio && <div className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-emerald-400" /> {personalInfo.portfolio}</div>}
              </div>
            </div>
          </div>

          {/* Tech Content Body */}
          <div className="p-6 sm:p-7 space-y-5 font-sans bg-white">
            {/* System Profile */}
            <div className="space-y-1">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 flex items-center gap-2 font-mono text-emerald-600">
                <Code className="w-4 h-4" />
                <span>// Profil System & Résumé</span>
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed font-medium pt-1">
                {profileSummary}
              </p>
            </div>

            {/* Experience / Projects */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 flex items-center gap-2 font-mono text-emerald-600">
                <Terminal className="w-4 h-4" />
                <span>// Expériences & Projets Récents</span>
              </h2>

              <div className="space-y-3.5">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);

                  return (
                    <div key={exp.id} className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm font-sans">
                          {exp.position} <span className="text-emerald-600 font-mono">@ {exp.company}</span>
                        </h3>
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {exp.startDate} - {exp.current ? 'NOW' : exp.endDate}
                        </span>
                      </div>

                      <ul className="space-y-1 text-xs text-slate-700">
                        {bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-500 font-mono font-bold shrink-0">&gt;</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stack & Education Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 border-b pb-1 font-mono text-emerald-600">
                  // Stack Technique
                </h2>
                <div className="space-y-1.5">
                  {skills.map((cat, i) => (
                    <div key={i} className="text-xs text-slate-700">
                      <strong className="text-slate-900 font-mono uppercase text-[11px]">{cat.category} : </strong>
                      <span>{cat.skills.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 border-b pb-1 font-mono text-emerald-600">
                  // Formations & Diplômes
                </h2>
                <div className="space-y-2">
                  {education.map((edu) => (
                    <div key={edu.id} className="text-xs space-y-0.5">
                      <span className="font-bold text-slate-900 block">{edu.degree}</span>
                      <span className="text-slate-600">{edu.institution} ({edu.location})</span>
                      <span className="text-[10px] text-slate-400 font-mono block">{edu.startDate} - {edu.endDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 8: CHRONO COMPACT (Timeline Chronologique & Layout Dense) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'compact' && (
        <div className="p-6 sm:p-8 space-y-5 bg-white">
          {/* Compact Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {personalInfo.firstName} {personalInfo.lastName}
              </h1>
              <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest mt-0.5">
                {personalInfo.targetJob}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-600">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}, SN</span>}
            </div>
          </div>

          {/* Profile */}
          <div className="space-y-1">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b pb-1">
              Accroche & Objectif
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed font-medium pt-0.5">
              {profileSummary}
            </p>
          </div>

          {/* Timeline Experience Section */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1">
              Timeline des Expériences
            </h2>

            <div className="space-y-3.5">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);

                return (
                  <div key={exp.id} className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                        {exp.position} <span className="text-indigo-600 font-semibold">— {exp.company}</span>
                      </h3>
                      <span className="text-[10px] font-bold text-slate-500 shrink-0">
                        {exp.startDate} - {exp.current ? 'Présent' : exp.endDate} | {exp.location}
                      </span>
                    </div>

                    <ul className="mt-1 space-y-0.5 text-xs text-slate-700 list-disc list-inside pl-1">
                      {bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formations & Compétences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 border-b pb-1">
                Formations & Diplômes
              </h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs space-y-0.5">
                  <span className="font-bold text-slate-900 block">{edu.degree}</span>
                  <span className="text-slate-600">{edu.institution} ({edu.location})</span>
                  <span className="text-[10px] text-slate-400 font-semibold block">{edu.startDate} - {edu.endDate}</span>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 border-b pb-1">
                Compétences
              </h2>
              <div className="space-y-1.5">
                {skills.map((cat, idx) => (
                  <div key={idx} className="text-xs text-slate-700">
                    <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                    <span className="text-slate-600">{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 9: PRESTIGE (Luxe, Finance, Conseil & Juridique) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'prestige' && (
        <div className="p-8 sm:p-10 space-y-6 bg-white">
          {/* Double Gold Line Frame Top */}
          <div className="border-t-2 border-b border-amber-600/40 py-5 text-center">
            <div className="flex justify-center mb-1">
              <Crown className="w-5 h-5 text-amber-700" />
            </div>
            <h1 className="text-3xl font-serif font-black text-slate-900 tracking-wide uppercase">
              {personalInfo.firstName} {personalInfo.lastName}
            </h1>
            <p className="text-xs font-extrabold uppercase tracking-widest text-amber-800 mt-1">
              {personalInfo.targetJob}
            </p>

            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-700 font-medium border-t border-amber-600/20 pt-2 max-w-xl mx-auto">
              {personalInfo.city && <span>📍 {personalInfo.city}, {personalInfo.country || 'Sénégal'}</span>}
              {personalInfo.phone && <span>📞 {personalInfo.phone}</span>}
              {personalInfo.email && <span>✉️ {personalInfo.email}</span>}
            </div>
          </div>

          {/* Prestige Profile Summary */}
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-900">
              Synthèse d'Excellence
            </h2>
            <p className="text-xs leading-relaxed text-slate-800 italic font-serif">
              "{profileSummary}"
            </p>
          </div>

          {/* Experiences Section */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-900 border-b-2 border-amber-700/30 pb-1 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-800" />
              <span>Parcours Professionnel</span>
            </h2>

            <div className="space-y-3.5">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);

                return (
                  <div key={exp.id} className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm font-serif">
                        {exp.position} — <span className="text-amber-800 font-sans">{exp.company}</span>
                      </h3>
                      <span className="text-[11px] font-bold text-amber-900/70">
                        {exp.startDate} – {exp.current ? 'Présent' : exp.endDate} ({exp.location})
                      </span>
                    </div>

                    <ul className="text-xs text-slate-700 list-disc list-inside space-y-1 pl-1">
                      {bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Education & Skills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-amber-600/20">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-amber-900 mb-2 border-b border-amber-700/30 pb-1">
                Diplômes & Hautes Études
              </h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs space-y-0.5">
                  <span className="font-bold text-slate-900 block font-serif">{edu.degree}</span>
                  <span className="text-slate-700">{edu.institution} ({edu.location})</span>
                  <span className="text-[10px] text-amber-800/70 font-semibold block">{edu.startDate} - {edu.endDate}</span>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-amber-900 mb-2 border-b border-amber-700/30 pb-1">
                Compétences & Réseau
              </h2>
              {skills.map((cat, idx) => (
                <div key={idx} className="text-xs text-slate-700 mb-1.5">
                  <strong className="text-slate-900 font-bold">{cat.category} :</strong>{' '}
                  <span>{cat.skills.join(' • ')}</span>
                </div>
              ))}
              <div className="mt-2 text-xs text-slate-700">
                <strong className="text-slate-900 font-bold">Langues :</strong>{' '}
                {languages.map(l => `${l.name} (${l.level})`).join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 10: STARTUP & GROWTH (Proactif, Impact & Business) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'startup' && (
        <div className="p-6 sm:p-8 space-y-6 bg-white">
          {/* Vibrant Top Header */}
          <div className="bg-slate-900 p-6 rounded-none text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                  {personalInfo.firstName} {personalInfo.lastName}
                </h1>
                <p className="text-sm font-bold text-violet-200 mt-0.5 uppercase tracking-wider">
                  {personalInfo.targetJob}
                </p>
              </div>

              <div className="text-xs text-slate-200 space-y-1 shrink-0">
                {personalInfo.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-amber-300" /> <span>{personalInfo.email}</span></div>}
                {personalInfo.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-amber-300" /> <span>{personalInfo.phone}</span></div>}
                {personalInfo.city && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-amber-300" /> <span>{personalInfo.city}, SN</span></div>}
              </div>
            </div>
          </div>

          {/* High Impact Pitch */}
          <div className="space-y-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 border-violet-600 pb-1 flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-600" />
              <span>Pitch Candidat</span>
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed font-medium pt-1">
              {profileSummary}
            </p>
          </div>

          {/* Key Experiences */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-3 border-b-2 border-violet-600 pb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-600" />
              <span>Expériences Marquantes & Réalisations</span>
            </h2>

            <div className="space-y-3.5">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);

                return (
                  <div key={exp.id} className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {exp.position} <span className="text-violet-600">@ {exp.company}</span>
                      </h3>
                      <span className="text-[10px] font-bold text-slate-500">
                        {exp.startDate} - {exp.current ? 'Présent' : exp.endDate}
                      </span>
                    </div>

                    <ul className="space-y-1 text-xs text-slate-700 pl-1 list-disc list-inside">
                      {bullets.map((b, i) => (
                        <li key={i} className="leading-relaxed">
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Education & Skills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-violet-600 pb-1">
                Diplômes
              </h2>
              {education.map((edu) => (
                <div key={edu.id} className="text-xs mb-2.5 last:mb-0 space-y-0.5">
                  <span className="font-bold text-slate-900 block">{edu.degree}</span>
                  <span className="text-slate-600 font-medium">{edu.institution} ({edu.location})</span>
                  <span className="text-[10px] text-slate-400 block font-semibold">{edu.startDate} - {edu.endDate}</span>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-violet-600 pb-1">
                Compétences Clés
              </h2>
              <div className="space-y-1.5">
                {skills.map((cat, idx) => (
                  <div key={idx} className="text-xs text-slate-700">
                    <strong className="text-slate-900 font-bold uppercase">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 11: PHOTO EXECUTIVE (Cadre Photo Executive Prestige) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'photo_executive' && (
        <div className="w-full bg-white">
          <div className="bg-slate-950 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden border-b-4 border-amber-500" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-amber-400 bg-slate-800 flex items-center justify-center">
                {personalInfo.photoUrl ? (
                  <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 text-amber-400 flex items-center justify-center font-black text-2xl">
                    {personalInfo.firstName?.[0] || 'A'}{personalInfo.lastName?.[0] || 'D'}
                  </div>
                )}
              </div>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                {personalInfo.firstName} <span className="text-amber-400">{personalInfo.lastName}</span>
              </h1>
              <p className="text-sm font-bold text-slate-200 mt-1 uppercase tracking-wider">
                {personalInfo.targetJob}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-300 mt-3">
                {personalInfo.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />{personalInfo.email}</span>}
                {personalInfo.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />{personalInfo.phone}</span>}
                {personalInfo.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />{personalInfo.city}</span>}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 bg-white">
            <div className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Synthèse Exécutive</span>
              </h2>
              <p className="text-xs text-slate-800 leading-relaxed font-medium pt-1">{profileSummary}</p>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-700 shrink-0" />
                <span>Parcours Professionnel</span>
              </h2>
              <div className="space-y-3.5">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm">{exp.position} — <span className="text-amber-700 font-semibold">{exp.company}</span></h3>
                        <span className="text-[10px] font-bold text-slate-600 shrink-0">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-800 list-disc list-inside pl-1">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Diplômes & Formation</h2>
                {education.map((edu) => (
                  <div key={edu.id} className="mb-2.5 text-xs space-y-0.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <span className="font-bold text-slate-900 block">{edu.degree}</span>
                    <span className="text-slate-700 font-medium">{edu.institution} • {edu.startDate} - {edu.endDate}</span>
                  </div>
                ))}
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Compétences Stratégiques</h2>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {skills.map((cat, idx) => (
                    <div key={idx}>
                      <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                      <span>{cat.skills.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 12: PHOTO MODERN (Design Photo Pro Split) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'photo_modern' && (
        <div className="w-full bg-white">
          <div className="bg-slate-900 text-white p-5 sm:p-7 flex items-center justify-between gap-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div className="space-y-1.5 flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
                {personalInfo.firstName} {personalInfo.lastName}
              </h1>
              <p className="text-sm font-bold uppercase tracking-wider text-sky-200">{personalInfo.targetJob}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white pt-1 font-medium">
                {personalInfo.email && (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <Mail className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                    <span>{personalInfo.email}</span>
                  </span>
                )}
                {personalInfo.phone && (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <Phone className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                    <span>{personalInfo.phone}</span>
                  </span>
                )}
                {(personalInfo.address || personalInfo.city || personalInfo.country) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                    <span>{[personalInfo.address, personalInfo.city, personalInfo.country].filter(Boolean).join(', ')}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white shrink-0 bg-slate-800 flex items-center justify-center">
              {personalInfo.photoUrl ? (
                <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white/70" />
              )}
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-5 bg-white">
            <div className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="font-black text-slate-900 uppercase text-xs border-b pb-1 tracking-wider">Profil Professionnel</h2>
              <p className="text-xs text-slate-800 leading-relaxed font-medium pt-1">{profileSummary}</p>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-3">
                Expériences Professionnelles
              </h2>
              <div className="space-y-3.5">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline mb-1 gap-2">
                        <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">{exp.position} <span className="text-indigo-600">— {exp.company}</span></h3>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-800 list-disc list-inside pl-1">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Diplômes & Formations</h2>
                {education.map((edu) => (
                  <div key={edu.id} className="mb-2 text-xs space-y-0.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <span className="font-bold text-slate-900 block">{edu.degree}</span>
                    <span className="text-slate-600">{edu.institution} ({edu.startDate} - {edu.endDate})</span>
                  </div>
                ))}
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Compétences & Langues</h2>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {skills.map((cat, idx) => (
                    <div key={idx}>
                      <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                      <span>{cat.skills.join(', ')}</span>
                    </div>
                  ))}
                </div>
                {languages.length > 0 && (
                  <div className="pt-2 text-xs text-slate-700">
                    <strong className="text-slate-900 font-bold">Langues : </strong>
                    <span>{languages.map((l) => `${l.name} (${l.level})`).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 13: PHOTO CREATIVE (Studio Photo & Sidebar Sombre) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'photo_creative' && (
        <div className="w-full flex flex-col sm:flex-row bg-white">
          <div className="w-full sm:w-1/3 bg-slate-900 text-white p-5 space-y-5">
            <div className="flex flex-col items-center text-center" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-violet-400 mb-2.5 bg-slate-800 flex items-center justify-center shrink-0">
                {personalInfo.photoUrl ? (
                  <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 text-violet-400 flex items-center justify-center font-bold text-xl">
                    CV
                  </div>
                )}
              </div>
              <h1 className="text-base font-black uppercase tracking-tight text-white">{personalInfo.firstName} {personalInfo.lastName}</h1>
              <p className="text-xs text-violet-300 font-extrabold uppercase mt-0.5">{personalInfo.targetJob}</p>
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-2 text-xs text-slate-200" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="font-black text-amber-400 uppercase text-[10px] tracking-widest mb-1.5">Coordonnées</h2>
              {personalInfo.email && (
                <div className="flex items-start gap-2 break-all">
                  <Mail className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                  <span className="break-all">{personalInfo.email}</span>
                </div>
              )}
              {personalInfo.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                  <span>{personalInfo.phone}</span>
                </div>
              )}
              {(personalInfo.address || personalInfo.city || personalInfo.country) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                  <span className="break-words leading-snug">{[personalInfo.address, personalInfo.city, personalInfo.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="font-black text-amber-400 uppercase text-[10px] tracking-widest mb-1.5">Compétences</h2>
              <div className="space-y-1 text-xs text-slate-200">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-violet-300 font-semibold">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {languages.length > 0 && (
              <div className="border-t border-slate-800 pt-3 space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <h2 className="font-black text-amber-400 uppercase text-[10px] tracking-widest mb-1.5">Langues</h2>
                {languages.map((l, i) => (
                  <div key={i} className="flex justify-between text-xs text-slate-200">
                    <span>{l.name}</span>
                    <span className="text-[10px] text-violet-300 font-bold">{l.level}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full sm:w-2/3 p-5 sm:p-7 space-y-5 bg-white">
            <div className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="font-black text-slate-900 uppercase text-xs border-b pb-1 tracking-wider">Résumé Professionnel</h2>
              <p className="text-xs text-slate-800 font-medium leading-relaxed pt-1">{profileSummary}</p>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-3">
                Expériences Clés
              </h2>
              <div className="space-y-3.5">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline gap-2">
                        <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">{exp.position} — <span className="text-violet-700 font-semibold">{exp.company}</span></h3>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-800 list-disc list-inside pl-1">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2.5">
                Formation & Diplômes
              </h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs space-y-0.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <span className="font-bold text-slate-900 block">{edu.degree}</span>
                  <span className="text-slate-600">{edu.institution} ({edu.startDate} - {edu.endDate})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 14: PHOTO MINIMAL (Épuré Chic avec Photo à Droite) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'photo_minimal' && (
        <div className="w-full p-6 sm:p-8 space-y-6 bg-white">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                {personalInfo.firstName} {personalInfo.lastName}
              </h1>
              <p className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mt-0.5">
                {personalInfo.targetJob}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-3 font-semibold">
                {personalInfo.email && <span>{personalInfo.email}</span>}
                {personalInfo.phone && <span>• {personalInfo.phone}</span>}
                {personalInfo.city && <span>• {personalInfo.city}</span>}
              </div>
            </div>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border border-slate-300 shrink-0 bg-slate-100 flex items-center justify-center">
              {personalInfo.photoUrl ? (
                <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-slate-400" />
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-1.5">Profil</h2>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">{profileSummary}</p>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-3">Expériences</h2>
              <div className="space-y-3.5">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline gap-2">
                        <h3 className="font-extrabold text-slate-900 text-xs">{exp.position} — <span className="font-bold text-slate-800">{exp.company}</span></h3>
                        <span className="text-[10px] text-slate-500 font-bold shrink-0">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside pl-1">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Formation</h2>
                {education.map((edu) => (
                  <div key={edu.id} className="mb-2 text-xs space-y-0.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <span className="font-bold text-slate-900 block">{edu.degree}</span>
                    <span className="text-slate-600 font-medium">{edu.institution} ({edu.startDate} - {edu.endDate})</span>
                  </div>
                ))}
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Compétences</h2>
                <div className="space-y-1 text-xs text-slate-700">
                  {skills.map((cat, idx) => (
                    <div key={idx}>
                      <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                      <span>{cat.skills.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 15: PHOTO CORPORATE (Style Bancaire & Cadre Doré) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'photo_corporate' && (
        <div className="w-full bg-white">
          <div className="bg-sky-950 text-white p-6 sm:p-8 flex items-center justify-between gap-6 border-b-4 border-amber-400" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
              <p className="text-xs font-bold text-sky-200 uppercase tracking-wider">{personalInfo.targetJob}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200 pt-2 font-medium">
                {personalInfo.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />{personalInfo.email}</span>}
                {personalInfo.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />{personalInfo.phone}</span>}
                {personalInfo.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />{personalInfo.city}</span>}
              </div>
            </div>
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-amber-400 shrink-0 bg-slate-800 flex items-center justify-center">
              {personalInfo.photoUrl ? (
                <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <Award className="w-10 h-10 text-amber-400" />
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 bg-white">
            <div className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="font-extrabold text-slate-900 uppercase text-xs border-b pb-1 tracking-wider">Résumé de Carrière</h2>
              <p className="text-xs text-slate-800 leading-relaxed font-medium pt-1">{profileSummary}</p>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-3">
                Parcours & Postes
              </h2>
              <div className="space-y-3.5">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline mb-1 gap-2">
                        <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">{exp.position} — <span className="text-sky-800 font-semibold">{exp.company}</span></h3>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-800 list-disc list-inside pl-1">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Diplômes & Formations</h2>
                {education.map((edu) => (
                  <div key={edu.id} className="mb-2 text-xs space-y-0.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <span className="font-bold text-slate-900 block">{edu.degree}</span>
                    <span className="text-slate-700 font-medium">{edu.institution} ({edu.startDate} - {edu.endDate})</span>
                  </div>
                ))}
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Compétences</h2>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {skills.map((cat, idx) => (
                    <div key={idx}>
                      <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                      <span>{cat.skills.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 16: PHOTO TECH (Tech Leader Photo & Stack) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'photo_tech' && (
        <div className="w-full bg-white">
          <div className="bg-slate-950 text-emerald-400 p-6 sm:p-8 flex items-center justify-between gap-6 border-b border-slate-800" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                {personalInfo.firstName} <span className="text-emerald-400">{personalInfo.lastName}</span>
              </h1>
              <p className="text-xs font-mono font-bold text-slate-200">{personalInfo.targetJob}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono pt-1">
                {personalInfo.email && <span>{personalInfo.email}</span>}
                {personalInfo.phone && <span>• {personalInfo.phone}</span>}
                {personalInfo.city && <span>• {personalInfo.city}</span>}
              </div>
            </div>
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-emerald-400 bg-slate-900 flex items-center justify-center">
                {personalInfo.photoUrl ? (
                  <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                ) : (
                  <Code className="w-10 h-10 text-emerald-400" />
                )}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 bg-white">
            <div className="space-y-1 font-mono text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-emerald-700 font-bold border-b pb-1 uppercase tracking-wider">Profil & Synthèse Tech</h2>
              <p className="text-slate-800 leading-relaxed font-sans text-xs pt-1">{profileSummary}</p>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-3 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Expériences & Projets Tech</span>
              </h2>
              <div className="space-y-3.5">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline mb-1 gap-2">
                        <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">{exp.position} <span className="text-emerald-700 font-mono">@ {exp.company}</span></h3>
                        <span className="text-[10px] font-mono text-slate-500 font-bold shrink-0">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-800 list-disc list-inside pl-1">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Stack Technique</h2>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {skills.map((cat, idx) => (
                    <div key={idx}>
                      <strong className="text-slate-900 font-mono font-bold uppercase">{cat.category} : </strong>
                      <span>{cat.skills.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Diplômes</h2>
                {education.map((edu) => (
                  <div key={edu.id} className="mb-2 text-xs space-y-0.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <span className="font-bold text-slate-900 block">{edu.degree}</span>
                    <span className="text-slate-600 font-medium">{edu.institution} ({edu.startDate} - {edu.endDate})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 17: PHOTO SIDEBAR (Full Vertical Sidebar with Portrait) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'photo_sidebar' && (
        <div className="w-full flex flex-col sm:flex-row bg-white">
          <div className="w-full sm:w-1/3 bg-slate-50 p-5 space-y-5 border-r border-slate-200">
            <div className="flex flex-col items-center text-center" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-300 mb-2.5 bg-slate-200 shrink-0">
                {personalInfo.photoUrl ? (
                  <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <h1 className="text-base font-black uppercase text-slate-900">{personalInfo.firstName} {personalInfo.lastName}</h1>
              <p className="text-xs text-indigo-700 font-extrabold uppercase mt-0.5">{personalInfo.targetJob}</p>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-2 text-xs text-slate-800 font-medium" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="font-black text-slate-900 uppercase text-[10px] tracking-widest mb-1.5">Coordonnées</h2>
              {personalInfo.email && (
                <div className="flex items-start gap-2 break-all">
                  <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span className="break-all">{personalInfo.email}</span>
                </div>
              )}
              {personalInfo.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{personalInfo.phone}</span>
                </div>
              )}
              {(personalInfo.address || personalInfo.city || personalInfo.country) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span className="break-words leading-snug">{[personalInfo.address, personalInfo.city, personalInfo.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="font-black text-slate-900 uppercase text-[10px] tracking-widest mb-1.5">Compétences</h2>
              <div className="space-y-1 text-xs text-slate-700">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {languages.length > 0 && (
              <div className="border-t border-slate-200 pt-3 space-y-1 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <h2 className="font-black text-slate-900 uppercase text-[10px] tracking-widest mb-1.5">Langues</h2>
                {languages.map((l, i) => (
                  <div key={i} className="flex justify-between text-slate-800 font-medium">
                    <span>{l.name}</span>
                    <span className="font-bold text-indigo-700">{l.level}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full sm:w-2/3 p-5 sm:p-7 space-y-5 bg-white">
            <div className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="font-extrabold text-slate-900 uppercase text-xs border-b pb-1 tracking-wider">Résumé Professionnel</h2>
              <p className="text-xs text-slate-800 font-medium leading-relaxed pt-1">{profileSummary}</p>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-3">
                Expérience
              </h2>
              <div className="space-y-3.5">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline gap-2">
                        <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">{exp.position} — <span className="text-indigo-700 font-semibold">{exp.company}</span></h3>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-800 list-disc list-inside pl-1">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">
                Formation
              </h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs space-y-0.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <span className="font-bold text-slate-900 block">{edu.degree}</span>
                  <span className="text-slate-700 font-medium">{edu.institution} ({edu.startDate} - {edu.endDate})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 18: PHOTO HORIZON (Bicolore Horizontal & Avatar) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'photo_horizon' && (
        <div className="w-full bg-white">
          <div className="bg-slate-900 text-white p-6 sm:p-8 flex items-center justify-between gap-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">{personalInfo.firstName} {personalInfo.lastName}</h1>
              <p className="text-sm font-extrabold text-indigo-300 uppercase tracking-wider">{personalInfo.targetJob}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200 mt-2 font-medium">
                {personalInfo.email && <span>{personalInfo.email}</span>}
                {personalInfo.phone && <span>• {personalInfo.phone}</span>}
                {personalInfo.city && <span>• {personalInfo.city}</span>}
              </div>
            </div>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white shrink-0 bg-slate-800 flex items-center justify-center">
              {personalInfo.photoUrl ? (
                <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white/70" />
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 bg-white">
            <div className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="font-extrabold text-slate-900 uppercase text-xs border-b pb-1 tracking-wider">Aperçu Candidat</h2>
              <p className="text-xs text-slate-800 font-medium leading-relaxed pt-1">{profileSummary}</p>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-3">Expériences Récentes</h2>
              <div className="space-y-3.5">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline mb-1 gap-2">
                        <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">{exp.position} — <span className="text-indigo-700 font-semibold">{exp.company}</span></h3>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-800 list-disc list-inside pl-1">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Formation</h2>
                {education.map((edu) => (
                  <div key={edu.id} className="mb-2 text-xs space-y-0.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <span className="font-bold text-slate-900 block">{edu.degree}</span>
                    <span className="text-slate-700 font-medium">{edu.institution} ({edu.startDate} - {edu.endDate})</span>
                  </div>
                ))}
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Atouts & Compétences</h2>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {skills.map((cat, idx) => (
                    <div key={idx}>
                      <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                      <span>{cat.skills.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 19: PHOTO IMPACT (BTP, Industrie, Ingénierie & Photo) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'photo_impact' && (
        <div className="w-full bg-white">
          <div className="bg-amber-500 text-slate-950 p-6 sm:p-8 flex items-center justify-between gap-6 border-b-4 border-slate-950" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-950">{personalInfo.firstName} {personalInfo.lastName}</h1>
              <p className="text-sm font-black uppercase tracking-wider text-slate-950 mt-0.5">{personalInfo.targetJob}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-950 mt-2 font-extrabold">
                {personalInfo.email && <span>{personalInfo.email}</span>}
                {personalInfo.phone && <span>• {personalInfo.phone}</span>}
                {personalInfo.city && <span>• {personalInfo.city}</span>}
              </div>
            </div>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-slate-950 shrink-0 bg-slate-900 flex items-center justify-center">
              {personalInfo.photoUrl ? (
                <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <Briefcase className="w-10 h-10 text-amber-400" />
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 bg-white">
            <div className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="font-black text-slate-950 uppercase text-xs border-b pb-1 tracking-wider">Résumé d'Impact</h2>
              <p className="text-xs text-slate-950 font-medium leading-relaxed pt-1">{profileSummary}</p>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-3">Projets & Expériences Clés</h2>
              <div className="space-y-3.5">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline mb-1 gap-2">
                        <h3 className="font-extrabold text-slate-950 text-xs sm:text-sm">{exp.position} — <span className="text-amber-700 font-semibold">{exp.company}</span></h3>
                        <span className="text-[10px] font-bold text-slate-600 shrink-0">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-900 list-disc list-inside pl-1">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Qualifications & Compétences</h2>
                <div className="space-y-1.5 text-xs text-slate-900">
                  {skills.map((cat, idx) => (
                    <div key={idx}>
                      <strong className="text-slate-900 font-bold uppercase">{cat.category} : </strong>
                      <span>{cat.skills.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Diplômes</h2>
                {education.map((edu) => (
                  <div key={edu.id} className="mb-2 text-xs space-y-0.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <span className="font-bold text-slate-900 block">{edu.degree}</span>
                    <span className="text-slate-700 font-medium">{edu.institution} ({edu.startDate} - {edu.endDate})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STYLE 20: PHOTO MEDICAL (Bio-Santé, Médical & Soin) */}
      {/* ------------------------------------------------------------- */}
      {activeStyle === 'photo_medical' && (
        <div className="w-full bg-white">
          <div className="bg-teal-800 text-white p-6 sm:p-8 flex items-center justify-between gap-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">{personalInfo.firstName} {personalInfo.lastName}</h1>
              <p className="text-xs font-bold text-teal-100 uppercase tracking-wider">{personalInfo.targetJob}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-teal-50 mt-2 font-medium">
                {personalInfo.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-teal-200 shrink-0" />{personalInfo.email}</span>}
                {personalInfo.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-teal-200 shrink-0" />{personalInfo.phone}</span>}
                {personalInfo.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-teal-200 shrink-0" />{personalInfo.city}</span>}
              </div>
            </div>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white shrink-0 bg-slate-800 flex items-center justify-center">
              {personalInfo.photoUrl ? (
                <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-teal-200" />
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 bg-white">
            <div className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="font-black text-slate-900 uppercase text-xs border-b pb-1 tracking-wider">Engagements & Profil Soignant</h2>
              <p className="text-xs text-slate-800 font-medium leading-relaxed pt-1">{profileSummary}</p>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-3">Parcours Clinique & Soins</h2>
              <div className="space-y-3.5">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline mb-1 gap-2">
                        <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">{exp.position} — <span className="text-teal-700 font-semibold">{exp.company}</span></h3>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-800 list-disc list-inside pl-1">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Savoir-Faire & Compétences</h2>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {skills.map((cat, idx) => (
                    <div key={idx}>
                      <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                      <span>{cat.skills.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Diplômes & Habilitations</h2>
                {education.map((edu) => (
                  <div key={edu.id} className="mb-2 text-xs space-y-0.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <span className="font-bold text-slate-900 block">{edu.degree}</span>
                    <span className="text-slate-700 font-medium">{edu.institution} ({edu.startDate} - {edu.endDate})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* NOUVEAUX STYLES SANS PHOTO (21 à 35) */}
      {/* ------------------------------------------------------------- */}
      <CVTemplateRenderersNewSansPhoto
        formData={formData}
        personalInfo={personalInfo}
        experiences={experiences}
        education={education}
        skills={skills}
        languages={languages}
        customSections={customSections}
        profileSummary={profileSummary}
        themeHex={themeHex}
        activeStyle={activeStyle}
        makeEditable={makeEditable}
        updatePersonalInfo={updatePersonalInfo}
        alignClass={alignClass}
        photoShapeClass={photoShapeClass}
        renderCustomSections={renderCustomSections}
        renderFreeTextBlocks={renderFreeTextBlocks}
        aiData={aiData}
        effectiveHobbies={effectiveHobbies}
      />

      {/* ------------------------------------------------------------- */}
      {/* NOUVEAUX STYLES AVEC PHOTO (36 à 50) */}
      {/* ------------------------------------------------------------- */}
      <CVTemplateRenderersNewAvecPhoto
        formData={formData}
        personalInfo={personalInfo}
        experiences={experiences}
        education={education}
        skills={skills}
        languages={languages}
        customSections={customSections}
        profileSummary={profileSummary}
        themeHex={themeHex}
        activeStyle={activeStyle}
        makeEditable={makeEditable}
        updatePersonalInfo={updatePersonalInfo}
        alignClass={alignClass}
        photoShapeClass={photoShapeClass}
        renderCustomSections={renderCustomSections}
        renderFreeTextBlocks={renderFreeTextBlocks}
        aiData={aiData}
        effectiveHobbies={effectiveHobbies}
      />

      </div>
    </div>
  );
};
