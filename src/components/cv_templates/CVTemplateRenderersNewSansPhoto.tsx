import React from 'react';
import { CVTemplateInternalProps } from './CVTemplateTypes';
import { Mail, Phone, MapPin, Globe, Linkedin, Award, Briefcase, GraduationCap, Sparkles, CheckCircle2, Terminal, Shield, Scale, Compass, Leaf, BookOpen, Layers, BarChart3, Cpu, Building2 } from 'lucide-react';

export const CVTemplateRenderersNewSansPhoto: React.FC<CVTemplateInternalProps> = ({
  personalInfo,
  experiences,
  education,
  skills,
  languages,
  profileSummary,
  themeHex,
  activeStyle,
  makeEditable,
  updatePersonalInfo,
  renderCustomSections,
  renderFreeTextBlocks,
  aiData,
}) => {
  // -------------------------------------------------------------
  // STYLE 11 (21): SWISS GRID DESIGN
  // -------------------------------------------------------------
  if (activeStyle === 'swiss_grid') {
    return (
      <div className="w-full bg-white p-7 sm:p-9 font-sans text-slate-900 leading-relaxed">
        {/* Swiss Asymmetric Header */}
        <div className="border-b-4 border-slate-950 pb-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-end" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="md:col-span-2 space-y-1">
            <span className="text-[10px] font-black tracking-[0.25em] text-red-600 uppercase block">Curriculum Vitae • Swiss Grid</span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-slate-950 leading-none">
              <span {...makeEditable(personalInfo.firstName || '', (v) => updatePersonalInfo('firstName', v))}>{personalInfo.firstName || 'Prénom'}</span>{' '}
              <span {...makeEditable(personalInfo.lastName || '', (v) => updatePersonalInfo('lastName', v))}>{personalInfo.lastName || 'Nom'}</span>
            </h1>
            <p className="text-sm font-bold text-slate-700 tracking-wide uppercase pt-1" {...makeEditable(personalInfo.targetJob || '', (v) => updatePersonalInfo('targetJob', v))}>
              {personalInfo.targetJob || 'Poste Cible'}
            </p>
          </div>
          <div className="text-xs space-y-1 md:text-right text-slate-600 font-medium">
            {personalInfo.email && <div className="flex md:justify-end items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-900" />{personalInfo.email}</div>}
            {personalInfo.phone && <div className="flex md:justify-end items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-900" />{personalInfo.phone}</div>}
            {personalInfo.city && <div className="flex md:justify-end items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-900" />{personalInfo.city}, {personalInfo.country || 'Sénégal'}</div>}
            {personalInfo.linkedin && <div className="flex md:justify-end items-center gap-1.5"><Linkedin className="w-3.5 h-3.5 text-slate-900" />{personalInfo.linkedin}</div>}
          </div>
        </div>

        {/* 2-Column Swiss Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-7">
          {/* Left Column: Summary & Experiences (8 cols) */}
          <div className="md:col-span-8 space-y-6">
            <div className="space-y-1.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1">
                <span className="w-2.5 h-2.5 bg-red-600 inline-block"></span>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-950">Profil Professionnel</h2>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed pt-1 text-justify">{profileSummary}</p>
            </div>

            <div className="space-y-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1">
                <span className="w-2.5 h-2.5 bg-slate-950 inline-block"></span>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-950">Expériences Marquantes</h2>
              </div>
              <div className="space-y-4">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1 border-l-2 border-slate-200 pl-3 py-0.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline gap-2">
                        <h3 className="font-extrabold text-xs text-slate-950 uppercase">{exp.position}</h3>
                        <span className="text-[10px] font-mono font-bold text-red-600">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-700">{exp.company} • {exp.location || 'Dakar'}</div>
                      <ul className="space-y-1 text-xs text-slate-700 list-square pl-3 pt-1">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
            {renderFreeTextBlocks()}
          </div>

          {/* Right Column: Skills, Education & Languages (4 cols) */}
          <div className="md:col-span-4 space-y-6">
            <div className="space-y-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1">
                <span className="w-2.5 h-2.5 bg-slate-950 inline-block"></span>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-950">Compétences</h2>
              </div>
              <div className="space-y-1.5 text-xs">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-slate-950 font-bold block text-[11px] uppercase">{cat.category} :</strong>
                    <span className="text-slate-700">{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1">
                <span className="w-2.5 h-2.5 bg-slate-950 inline-block"></span>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-950">Formation</h2>
              </div>
              <div className="space-y-2.5 text-xs">
                {education.map((edu) => (
                  <div key={edu.id} className="border-b border-slate-100 pb-1.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="font-bold text-slate-950 text-xs">{edu.degree}</div>
                    <div className="text-slate-600 text-[11px] font-medium">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                  </div>
                ))}
              </div>
            </div>

            {languages.length > 0 && (
              <div className="space-y-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1">
                  <span className="w-2.5 h-2.5 bg-slate-950 inline-block"></span>
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-950">Langues</h2>
                </div>
                <div className="space-y-1 text-xs">
                  {languages.map((l, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-900">{l.name}</span>
                      <span className="text-slate-600">{l.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {renderCustomSections()}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 12 (22): NORDIQUE MINIMAL ZEN
  // -------------------------------------------------------------
  if (activeStyle === 'nordic_clean') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-800">
        <div className="border-b border-emerald-800/20 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-wide text-emerald-950">
                <span className="font-semibold" {...makeEditable(personalInfo.firstName || '', (v) => updatePersonalInfo('firstName', v))}>{personalInfo.firstName || 'Aminata'}</span>{' '}
                <span {...makeEditable(personalInfo.lastName || '', (v) => updatePersonalInfo('lastName', v))}>{personalInfo.lastName || 'Diallo'}</span>
              </h1>
              <p className="text-xs font-medium text-emerald-800 tracking-wider uppercase mt-1">
                {personalInfo.targetJob || 'Consultant Stratégie'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
              {personalInfo.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-emerald-700" />{personalInfo.email}</span>}
              {personalInfo.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-emerald-700" />{personalInfo.phone}</span>}
              {personalInfo.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-700" />{personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-950 border-b border-emerald-900/15 pb-1 mb-2">Vision & Profil</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>

          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-950 border-b border-emerald-900/15 pb-1 mb-3">Parcours Professionnel</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium text-xs sm:text-sm text-slate-900">{exp.position} — <span className="text-emerald-800 font-semibold">{exp.company}</span></h3>
                      <span className="text-[11px] text-slate-500 font-mono">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-950 border-b border-emerald-900/15 pb-1 mb-2">Expertises</h2>
              <div className="space-y-2 text-xs">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-emerald-950 block text-[11px] font-semibold">{cat.category}</strong>
                    <span className="text-slate-600">{cat.skills.join(' • ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-950 border-b border-emerald-900/15 pb-1 mb-2">Formations & Diplômes</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-medium text-slate-900">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 13 (23): MONACO HEDGE FUND & BANQUE
  // -------------------------------------------------------------
  if (activeStyle === 'monaco_banking') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-serif text-slate-900">
        <div className="border-b-2 border-amber-600/60 pb-4 mb-6 text-center space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <span className="text-[10px] font-sans font-extrabold tracking-[0.3em] text-amber-700 uppercase">Haute Finance & Investissement</span>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 uppercase">
            {personalInfo.firstName} {personalInfo.lastName}
          </h1>
          <p className="text-xs font-sans font-bold text-slate-700 tracking-widest uppercase">
            {personalInfo.targetJob || 'Directeur des Investissements'}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-sans text-slate-600 pt-1">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.city && <span>• {personalInfo.city}, Sénégal</span>}
            {personalInfo.linkedin && <span>• LinkedIn</span>}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-black uppercase tracking-widest text-slate-950 border-b border-slate-300 pb-1 mb-2">Synthèse Exécutive</h2>
            <p className="text-xs text-slate-800 leading-relaxed text-justify">{profileSummary}</p>
          </div>

          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-black uppercase tracking-widest text-slate-950 border-b border-slate-300 pb-1 mb-3">Parcours & Mandats de Gestion</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-950 uppercase">{exp.position} — <span className="text-amber-800">{exp.company}</span></h3>
                      <span className="text-[11px] font-sans font-semibold text-slate-600">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-800 list-disc list-inside font-sans pl-1">
                      {bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 font-sans" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b border-slate-300 pb-1 mb-2">Compétences Clés & Régulation</h2>
              <div className="space-y-1.5 text-xs text-slate-800">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="font-bold text-slate-950">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b border-slate-300 pb-1 mb-2">Diplômes & Certifications</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 14 (24): TOKYO ÉDITORIAL
  // -------------------------------------------------------------
  if (activeStyle === 'tokyo_editorial') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="border-l-4 border-rose-600 pl-4 py-1 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Édition & Création Stratégique</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
            {personalInfo.firstName} <span className="text-rose-600">{personalInfo.lastName}</span>
          </h1>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{personalInfo.targetJob}</p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-2">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.city && <span>• {personalInfo.city}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 border-rose-600 pb-1 mb-2">Manifeste & Compétences</h2>
              <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 border-rose-600 pb-1 mb-3">Réalisations & Carrière</h2>
              <div className="space-y-4">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-extrabold text-xs text-slate-950">{exp.position}</h3>
                        <span className="text-[10px] font-bold text-rose-600">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-600">{exp.company}</div>
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
            {renderFreeTextBlocks()}
          </div>

          <div className="space-y-6">
            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 border-rose-600 pb-1 mb-2">Disciplines</h2>
              <div className="space-y-1.5 text-xs">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-slate-950 font-bold block text-[11px] uppercase">{cat.category} :</strong>
                    <span className="text-slate-600">{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 border-rose-600 pb-1 mb-2">Diplômes</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
            {renderCustomSections()}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 15 (25): BAUHAUS CONSTRUCTIF
  // -------------------------------------------------------------
  if (activeStyle === 'bauhaus_modern') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="bg-slate-950 text-white p-6 rounded-none mb-6 relative overflow-hidden" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500 rounded-bl-full opacity-90"></div>
          <h1 className="text-3xl font-black uppercase tracking-tighter relative z-10">{personalInfo.firstName} {personalInfo.lastName}</h1>
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mt-1 relative z-10">{personalInfo.targetJob}</p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-300 mt-3 relative z-10">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.city && <span>• {personalInfo.city}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 space-y-6">
            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-slate-950 pb-1 mb-2">Profil & Objectifs</h2>
              <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
            </div>
            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-slate-950 pb-1 mb-3">Parcours Professionnel</h2>
              <div className="space-y-4">
                {experiences.map((exp) => {
                  const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                  const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                  return (
                    <div key={exp.id} className="space-y-1 border-l-4 border-amber-500 pl-3" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-extrabold text-xs text-slate-950 uppercase">{exp.position} — <span className="text-slate-700 font-bold">{exp.company}</span></h3>
                        <span className="text-[10px] font-mono font-bold text-amber-700">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
            {renderFreeTextBlocks()}
          </div>

          <div className="md:col-span-4 space-y-6">
            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-slate-950 pb-1 mb-2">Compétences</h2>
              <div className="space-y-1.5 text-xs">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-slate-950 font-bold block text-[11px] uppercase">{cat.category} :</strong>
                    <span className="text-slate-700 text-[11px]">{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-slate-950 pb-1 mb-2">Formation</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
            {renderCustomSections()}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 16 (26): BARREAU & NOTARIAT
  // -------------------------------------------------------------
  if (activeStyle === 'legal_heritage') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-serif text-slate-900">
        <div className="border-b border-slate-400 pb-4 mb-6 text-center space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <span className="text-[10px] font-sans font-bold tracking-[0.25em] text-slate-600 uppercase">Cabinet Juridique & Conseil</span>
          <h1 className="text-3xl font-normal tracking-wide text-slate-950 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
          <p className="text-xs font-sans font-semibold text-slate-700 uppercase tracking-widest">{personalInfo.targetJob || 'Juriste d\'Affaires'}</p>
          <div className="flex flex-wrap justify-center gap-3 text-xs font-sans text-slate-600 pt-1">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.city && <span>• {personalInfo.city}</span>}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Qualifications & Déontologie</h2>
            <p className="text-xs text-slate-800 leading-relaxed text-justify">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-3">Expériences & Contentieux</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="font-normal italic">{exp.company}</span></h3>
                      <span className="text-[11px] font-sans text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-800 list-disc list-inside font-sans pl-1">
                      {bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 font-sans" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Domaines d'Expertise</h2>
              <div className="space-y-1.5 text-xs text-slate-700">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="font-bold text-slate-950">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Diplômes & Prestation de Serment</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 17 (27): SILICON DARK MODE
  // -------------------------------------------------------------
  if (activeStyle === 'silicon_dark') {
    return (
      <div className="w-full bg-slate-950 p-8 sm:p-10 font-mono text-slate-100 min-h-[297mm]">
        <div className="border-b border-indigo-500/30 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="flex items-center gap-2 text-indigo-400 text-xs mb-1">
            <Terminal className="w-4 h-4" />
            <span>developer_profile.sh</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            {personalInfo.firstName} <span className="text-indigo-400">{personalInfo.lastName}</span>
          </h1>
          <p className="text-xs font-bold text-emerald-400 mt-1">
            &gt; {personalInfo.targetJob || 'Fullstack Engineer & AI'}
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-3">
            {personalInfo.email && <span>email: "{personalInfo.email}"</span>}
            {personalInfo.phone && <span>phone: "{personalInfo.phone}"</span>}
            {personalInfo.city && <span>location: "{personalInfo.city}"</span>}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase text-indigo-400 border-b border-slate-800 pb-1 mb-2">// README.md</h2>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">{profileSummary}</p>
          </div>

          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase text-indigo-400 border-b border-slate-800 pb-1 mb-3">// WORK_EXPERIENCE</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs text-white">{exp.position} @ <span className="text-indigo-400">{exp.company}</span></h3>
                      <span className="text-[10px] text-emerald-400">{exp.startDate} - {exp.current ? 'NOW' : exp.endDate}</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside font-sans pl-1">
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
              <h2 className="text-xs font-bold uppercase text-indigo-400 border-b border-slate-800 pb-1 mb-2">// TECH_STACK</h2>
              <div className="space-y-1.5 text-xs font-sans">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-indigo-300 font-mono text-[11px] block">{cat.category}:</strong>
                    <span className="text-slate-300 text-xs font-mono">{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase text-indigo-400 border-b border-slate-800 pb-1 mb-2">// EDUCATION</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs font-sans" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-white">{edu.degree}</div>
                  <div className="text-slate-400 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 18 (28): ATLANTIQUE CORPORATE
  // -------------------------------------------------------------
  if (activeStyle === 'atlantic_navy') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="bg-gradient-to-r from-sky-900 to-blue-900 text-white p-6 sm:p-8 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">{personalInfo.firstName} {personalInfo.lastName}</h1>
          <p className="text-xs font-bold text-sky-200 uppercase tracking-widest mt-1">{personalInfo.targetJob}</p>
          <div className="flex flex-wrap gap-4 text-xs text-sky-100 mt-3 font-medium">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.city && <span>• {personalInfo.city}</span>}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-sky-950 border-b-2 border-sky-800 pb-1 mb-2">Synthèse de Carrière</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-sky-950 border-b-2 border-sky-800 pb-1 mb-3">Expériences Opérationnelles</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-blue-800 font-semibold">{exp.company}</span></h3>
                      <span className="text-[10px] font-bold text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-sky-950 border-b-2 border-sky-800 pb-1 mb-2">Compétences Stratégiques</h2>
              <div className="space-y-1.5 text-xs text-slate-700">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="font-bold text-slate-900">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-sky-950 border-b-2 border-sky-800 pb-1 mb-2">Diplômes & Écoles</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 19 (29): ARCHITECTE & BTP TECHNIQUE
  // -------------------------------------------------------------
  if (activeStyle === 'architect_blueprint') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="border-b-2 border-slate-900 pb-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="sm:col-span-2">
            <span className="text-[10px] font-mono font-bold text-sky-700 uppercase">PROJET : CV TECHNIQUE / INGÉNIERIE</span>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-slate-950">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase">{personalInfo.targetJob || 'Ingénieur Génie Civil'}</p>
          </div>
          <div className="text-xs font-mono text-slate-700 space-y-0.5">
            <div>LOC: {personalInfo.city || 'Dakar'}</div>
            <div>TEL: {personalInfo.phone || 'N/A'}</div>
            <div>MAIL: {personalInfo.email || 'N/A'}</div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-1 mb-2">[01] NOTE DE CADRAGE & PROFIL</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-1 mb-3">[02] EXPÉRIENCES & PROJETS LIVRÉS</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs text-slate-950 uppercase">{exp.position} // <span className="text-sky-800">{exp.company}</span></h3>
                      <span className="text-[10px] font-mono text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-1 mb-2">[03] OUTILS & NORMES</h2>
              <div className="space-y-1 text-xs">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-1 mb-2">[04] HABILITATIONS & DIPLÔMES</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-1.5 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 20 (30): ÉCO-RESPONSABLE & RSE
  // -------------------------------------------------------------
  if (activeStyle === 'eco_forest') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-800">
        <div className="border-b-2 border-green-800 pb-4 mb-6 flex justify-between items-end" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div>
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest flex items-center gap-1"><Leaf className="w-3 h-3" /> Impact Positif & Développement Durable</span>
            <h1 className="text-3xl font-extrabold text-green-950">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase mt-0.5">{personalInfo.targetJob || 'Manager RSE & Environnement'}</p>
          </div>
          <div className="text-xs text-slate-600 space-y-0.5 text-right font-medium">
            <div>{personalInfo.email}</div>
            <div>{personalInfo.phone}</div>
            <div>{personalInfo.city}</div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase text-green-950 border-b border-green-800/30 pb-1 mb-2">Engagement & Vision Écologique</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-green-950 border-b border-green-800/30 pb-1 mb-3">Missions & Projets Durables</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs sm:text-sm text-green-950">{exp.position} — <span className="text-green-800 font-semibold">{exp.company}</span></h3>
                      <span className="text-[11px] text-slate-500 font-medium">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-green-950 border-b border-green-800/30 pb-1 mb-2">Compétences & Référentiels</h2>
              <div className="space-y-1.5 text-xs text-slate-700">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-green-950 font-bold">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-green-950 border-b border-green-800/30 pb-1 mb-2">Formations & Certifications</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-green-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 21 (31): PARIS HAUTE COUTURE
  // -------------------------------------------------------------
  if (activeStyle === 'paris_couture') {
    return (
      <div className="w-full bg-white p-9 sm:p-12 font-serif text-slate-900">
        <div className="text-center pb-6 mb-6 border-b border-slate-200 space-y-1.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <span className="text-[9px] font-sans font-light tracking-[0.4em] text-rose-900 uppercase">Maison & Direction Artistique</span>
          <h1 className="text-3xl sm:text-4xl font-light tracking-wide uppercase text-slate-950">{personalInfo.firstName} {personalInfo.lastName}</h1>
          <p className="text-xs font-sans font-medium tracking-widest uppercase text-slate-600">{personalInfo.targetJob || 'Directeur de Création'}</p>
          <div className="flex justify-center gap-4 text-[11px] font-sans text-slate-500 pt-2">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.city && <span>• {personalInfo.city}</span>}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-[11px] font-sans font-semibold uppercase tracking-[0.25em] text-slate-900 text-center mb-2">Profil</h2>
            <p className="text-xs text-slate-700 leading-relaxed text-justify max-w-2xl mx-auto italic">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-[11px] font-sans font-semibold uppercase tracking-[0.25em] text-slate-900 border-b border-slate-200 pb-1 mb-3">Parcours & Collections</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline font-sans">
                      <h3 className="font-semibold text-xs text-slate-900 uppercase">{exp.position} — <span className="font-normal italic">{exp.company}</span></h3>
                      <span className="text-[10px] text-slate-400">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside font-sans pl-1">
                      {bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 font-sans" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-900 border-b border-slate-200 pb-1 mb-2">Savoir-Faire</h2>
              <div className="space-y-1 text-xs text-slate-700">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-slate-900 font-semibold">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-900 border-b border-slate-200 pb-1 mb-2">Écoles & Titres</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-semibold text-slate-900">{edu.degree}</div>
                  <div className="text-slate-500 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 22 (32): CONSEIL STRATÉGIQUE AMBRE
  // -------------------------------------------------------------
  if (activeStyle === 'amber_consulting') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="border-l-8 border-amber-600 pl-4 py-2 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest">Conseil en Stratégie & Organisation</span>
          <h1 className="text-3xl font-black uppercase text-slate-950">{personalInfo.firstName} {personalInfo.lastName}</h1>
          <p className="text-xs font-bold text-slate-700 uppercase">{personalInfo.targetJob || 'Manager Conseil'}</p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 mt-2">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.city && <span>• {personalInfo.city}</span>}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-amber-600 pb-1 mb-2">Proposition de Valeur</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-amber-600 pb-1 mb-3">Missions de Conseil & Projets</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-amber-800 font-semibold">{exp.company}</span></h3>
                      <span className="text-[11px] font-bold text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-amber-600 pb-1 mb-2">Piliers Méthodologiques</h2>
              <div className="space-y-1 text-xs">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-amber-600 pb-1 mb-2">Grandes Écoles & Diplômes</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 23 (33): CYBERSÉCURITÉ & CLOUD
  // -------------------------------------------------------------
  if (activeStyle === 'cyber_security') {
    return (
      <div className="w-full bg-[#0a1118] p-8 sm:p-10 font-mono text-teal-100 min-h-[297mm]">
        <div className="border-b border-teal-500/40 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="flex items-center gap-2 text-teal-400 text-xs mb-1">
            <Shield className="w-4 h-4 text-teal-400" />
            <span>SEC_CLEARANCE: LEVEL_4 // INFRASTRUCTURE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">{personalInfo.firstName} {personalInfo.lastName}</h1>
          <p className="text-xs font-bold text-teal-300 mt-1">&gt; {personalInfo.targetJob || 'Lead DevSecOps & Cloud'}</p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-2 font-mono">
            {personalInfo.email && <span>email: "{personalInfo.email}"</span>}
            {personalInfo.phone && <span>tel: "{personalInfo.phone}"</span>}
            {personalInfo.city && <span>node: "{personalInfo.city}"</span>}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase text-teal-400 border-b border-teal-900 pb-1 mb-2">// MISSION_PROFILE</h2>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase text-teal-400 border-b border-teal-900 pb-1 mb-3">// TRACK_RECORD</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs text-white">{exp.position} @ <span className="text-teal-400">{exp.company}</span></h3>
                      <span className="text-[10px] text-teal-300">{exp.startDate} - {exp.current ? 'ACTIF' : exp.endDate}</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside font-sans pl-1">
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
              <h2 className="text-xs font-bold uppercase text-teal-400 border-b border-teal-900 pb-1 mb-2">// CERTIFICATIONS_&_STACK</h2>
              <div className="space-y-1.5 text-xs font-sans">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-teal-300 font-mono text-[11px] block">{cat.category}:</strong>
                    <span className="text-teal-200 text-xs font-mono">{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase text-teal-400 border-b border-teal-900 pb-1 mb-2">// ACCRÉDITATIONS</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs font-sans" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-white">{edu.degree}</div>
                  <div className="text-slate-400 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 24 (34): ZÉNITH UNIVERSITAIRE & R&D
  // -------------------------------------------------------------
  if (activeStyle === 'zenith_academic') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-serif text-slate-900">
        <div className="border-b-2 border-indigo-900 pb-4 mb-6 text-center space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-indigo-900 uppercase">Enseignement Supérieur & Recherche Scientifique</span>
          <h1 className="text-3xl font-black text-slate-950 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
          <p className="text-xs font-sans font-bold text-slate-700 uppercase tracking-widest">{personalInfo.targetJob || 'Enseignant-Chercheur / Docteur'}</p>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-sans text-slate-600 pt-1">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.city && <span>• {personalInfo.city}</span>}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-indigo-950 border-b border-slate-300 pb-1 mb-2">Axes de Recherche & Thématiques</h2>
            <p className="text-xs text-slate-800 leading-relaxed text-justify">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-indigo-950 border-b border-slate-300 pb-1 mb-3">Postes & Travaux de Recherche</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline font-sans">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-indigo-900 font-semibold">{exp.company}</span></h3>
                      <span className="text-[11px] text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-800 list-disc list-inside font-sans pl-1">
                      {bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 font-sans" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-950 border-b border-slate-300 pb-1 mb-2">Méthodologies & Domaines</h2>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-950 border-b border-slate-300 pb-1 mb-2">Thèse & Titres Académiques</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 25 (35): AVANT-GARDE ASYMÉTRIQUE
  // -------------------------------------------------------------
  if (activeStyle === 'vanguard_split') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-4 border-fuchsia-600 pb-5 mb-6 gap-3" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div>
            <span className="text-[10px] font-black text-fuchsia-600 uppercase tracking-widest">Avant-Garde • Vision Moderne</span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase text-slate-950">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase mt-0.5">{personalInfo.targetJob}</p>
          </div>
          <div className="text-xs text-slate-600 space-y-0.5 sm:text-right font-medium">
            {personalInfo.email && <div>{personalInfo.email}</div>}
            {personalInfo.phone && <div>{personalInfo.phone}</div>}
            {personalInfo.city && <div>{personalInfo.city}</div>}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-fuchsia-600 pb-1 mb-2">Profil & Ambition</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-fuchsia-600 pb-1 mb-3">Parcours & Réalisations</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1 border-l-2 border-fuchsia-500 pl-3" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-fuchsia-700 font-semibold">{exp.company}</span></h3>
                      <span className="text-[10px] font-bold text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-fuchsia-600 pb-1 mb-2">Compétences</h2>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-fuchsia-600 pb-1 mb-2">Diplômes</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 26: DIPLOMATIE & AFFAIRES PUBLIQUES
  // -------------------------------------------------------------
  if (activeStyle === 'diplomatic_affairs') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-serif text-slate-900 leading-relaxed">
        <div className="text-center border-b-2 border-slate-800 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <span className="text-[10px] font-sans font-black tracking-[0.3em] text-blue-900 uppercase block mb-1">Affaires Publiques & Diplomatie</span>
          <h1 className="text-3xl font-extrabold uppercase tracking-wide text-slate-950 font-serif">
            {personalInfo.firstName} {personalInfo.lastName}
          </h1>
          <p className="text-xs font-sans font-bold text-slate-700 uppercase tracking-widest mt-1">
            {personalInfo.targetJob || 'Conseiller aux Affaires Publiques'}
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs font-sans text-slate-600 mt-2">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.city && <span>• {personalInfo.city}, {personalInfo.country || 'Sénégal'}</span>}
            {personalInfo.linkedin && <span>• {personalInfo.linkedin}</span>}
          </div>
        </div>

        <div className="space-y-6 font-sans">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold font-serif uppercase tracking-widest text-blue-950 border-b border-slate-300 pb-1 mb-2">Note de Synthèse & Profil</h2>
            <p className="text-xs text-slate-700 leading-relaxed text-justify">{profileSummary}</p>
          </div>

          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold font-serif uppercase tracking-widest text-blue-950 border-b border-slate-300 pb-1 mb-3">Missions Institutionnelles & Fonctions</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-blue-900 font-semibold">{exp.company}</span></h3>
                      <span className="text-[11px] text-slate-500 font-medium">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-bold font-serif uppercase tracking-widest text-blue-950 border-b border-slate-300 pb-1 mb-2">Domaines d’Expertise</h2>
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
              <h2 className="text-xs font-bold font-serif uppercase tracking-widest text-blue-950 border-b border-slate-300 pb-1 mb-2">Diplômes & Hautes Écoles</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 27: AUDIT & CONTRÔLE FINANCIER
  // -------------------------------------------------------------
  if (activeStyle === 'financial_audit') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="border-l-4 border-slate-900 pl-4 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Audit Financier & Conformité</span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-slate-950">{personalInfo.firstName} {personalInfo.lastName}</h1>
          <p className="text-xs font-bold text-slate-700 uppercase mt-0.5">{personalInfo.targetJob || 'Auditeur Senior'}</p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-1 font-medium">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.city && <span>• {personalInfo.city}</span>}
          </div>
        </div>

        <div className="space-y-5">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b pb-1 mb-2">Synthèse d’Audit & Périmètre</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>

          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-3">Missions d’Audit & Conseil</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-slate-800 font-semibold">{exp.company}</span></h3>
                      <span className="text-[10px] font-bold text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Normes & Outils</h2>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-1 mb-2">Qualifications & Certifications</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 28: BIO-MÉDICAL & PHARMACIE
  // -------------------------------------------------------------
  if (activeStyle === 'medical_research') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="flex justify-between items-start border-b-2 border-sky-600 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div>
            <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Recherche Clinique & Pharmacologie</span>
            <h1 className="text-3xl font-black uppercase text-slate-950">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase mt-0.5">{personalInfo.targetJob || 'Docteur en Pharmacie'}</p>
          </div>
          <div className="text-xs text-slate-600 space-y-0.5 text-right font-medium">
            {personalInfo.email && <div>{personalInfo.email}</div>}
            {personalInfo.phone && <div>{personalInfo.phone}</div>}
            {personalInfo.city && <div>{personalInfo.city}</div>}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-800 border-b pb-1 mb-2">Profil Scientifique</h2>
            <p className="text-xs text-slate-700 leading-relaxed text-justify">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-800 border-b pb-1 mb-3">Expérience Hospitalière & Laboratoire</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-sky-700 font-semibold">{exp.company}</span></h3>
                      <span className="text-[10px] font-bold text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-sky-800 border-b pb-1 mb-2">Compétences Cliniques</h2>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-sky-800 border-b pb-1 mb-2">Titres & Doctorats</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 29: SUPPLY CHAIN & LOGISTIQUE GLOBALE
  // -------------------------------------------------------------
  if (activeStyle === 'supply_chain') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="bg-amber-500 text-white p-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <span className="text-[10px] font-black tracking-widest uppercase opacity-90 block">Supply Chain & Operations</span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
          <p className="text-xs font-bold tracking-wide uppercase opacity-95">{personalInfo.targetJob || 'Responsable Logistique & Fret'}</p>
          <div className="flex flex-wrap gap-3 text-xs pt-2 font-medium opacity-90">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.city && <span>• {personalInfo.city}</span>}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-800 border-b-2 border-amber-500 pb-1 mb-2">Profil Opérationnel</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-800 border-b-2 border-amber-500 pb-1 mb-3">Parcours Logistique & Gestion de Flux</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-amber-700 font-semibold">{exp.company}</span></h3>
                      <span className="text-[10px] font-bold text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-amber-800 border-b-2 border-amber-500 pb-1 mb-2">Outils & Systèmes ERP</h2>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-amber-800 border-b-2 border-amber-500 pb-1 mb-2">Formation & Certifications</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE 30: HUMANITAIRE & ONG
  // -------------------------------------------------------------
  if (activeStyle === 'ngo_humanitarian') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-emerald-600 pb-5 mb-6 gap-2" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Coopération Internationale & ONG</span>
            <h1 className="text-3xl font-black uppercase text-slate-950">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase mt-0.5">{personalInfo.targetJob || 'Chef de Projet Humanitaire'}</p>
          </div>
          <div className="text-xs text-slate-600 space-y-0.5 sm:text-right font-medium">
            {personalInfo.email && <div>{personalInfo.email}</div>}
            {personalInfo.phone && <div>{personalInfo.phone}</div>}
            {personalInfo.city && <div>{personalInfo.city}, {personalInfo.country || 'Sénégal'}</div>}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-wider text-emerald-900 border-b pb-1 mb-2">Engagement & Impact Social</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-emerald-800 border-b pb-1 mb-3">Missions Terrain & Coordination de Bailleurs</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-emerald-700 font-semibold">{exp.company}</span></h3>
                      <span className="text-[10px] font-bold text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-emerald-800 border-b pb-1 mb-2">Gestion de Projet & Bailleurs</h2>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-emerald-800 border-b pb-1 mb-2">Diplômes & Certifications Internationales</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-slate-950">{edu.degree}</div>
                  <div className="text-slate-600 text-[11px]">{edu.institution} ({edu.startDate} - {edu.endDate})</div>
                </div>
              ))}
            </div>
          </div>
          {renderFreeTextBlocks()}
          {renderCustomSections()}
        </div>
      </div>
    );
  }

  return null;
};
