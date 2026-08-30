import React from 'react';
import { CVTemplateInternalProps } from './CVTemplateTypes';
import { Mail, Phone, MapPin, Globe, Linkedin, Award, Briefcase, GraduationCap, Sparkles, User, CheckCircle2, Plane, Tv, Building, Trophy, Home, Laptop, BrainCircuit, Landmark, Hotel, Zap } from 'lucide-react';

export const CVTemplateRenderersNewAvecPhoto: React.FC<CVTemplateInternalProps> = ({
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
  effectiveHobbies = [],
}) => {
  // -------------------------------------------------------------
  // STYLE 36: PHOTO ART DIRECTOR
  // -------------------------------------------------------------
  if (activeStyle === 'photo_art_director') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="flex flex-col sm:flex-row items-center gap-6 border-b-4 border-fuchsia-700 pb-6 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 border-fuchsia-600 shadow-md shrink-0 bg-slate-100 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-fuchsia-600" />
            )}
          </div>
          <div className="space-y-1 text-center sm:text-left flex-1">
            <span className="text-[10px] font-black tracking-widest text-fuchsia-700 uppercase">Direction Artistique & Design Visuel</span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase text-slate-950">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{personalInfo.targetJob || 'Directeur Artistique'}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-slate-600 pt-1 font-medium">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-fuchsia-700 pb-1 mb-2">Vision Créative</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-fuchsia-700 pb-1 mb-3">Parcours & Campagnes</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-fuchsia-800 font-semibold">{exp.company}</span></h3>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-fuchsia-700 pb-1 mb-2">Compétences & Outils</h2>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-fuchsia-700 pb-1 mb-2">Diplômes & Écoles d'Art</h2>
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
  // STYLE 37: PHOTO LUXE GOLD
  // -------------------------------------------------------------
  if (activeStyle === 'photo_luxe_gold') {
    return (
      <div className="w-full bg-[#111827] text-white p-8 sm:p-10 font-serif min-h-[297mm]">
        <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-amber-500/40 pb-6 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-amber-400 shadow-xl shrink-0 bg-slate-800 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-amber-300" />
            )}
          </div>
          <div className="space-y-1 text-center sm:text-left flex-1">
            <span className="text-[10px] font-sans font-extrabold tracking-[0.3em] text-amber-400 uppercase">Prestige & Haute Direction</span>
            <h1 className="text-3xl sm:text-4xl font-normal tracking-wide text-amber-100 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-sans font-bold text-slate-300 uppercase tracking-widest">{personalInfo.targetJob}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs font-sans text-slate-400 pt-1">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-amber-400 border-b border-slate-800 pb-1 mb-2">Profil Exécutif</h2>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-amber-400 border-b border-slate-800 pb-1 mb-3">Parcours & Responsabilités</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline font-sans">
                      <h3 className="font-bold text-xs sm:text-sm text-amber-100">{exp.position} — <span className="text-slate-300">{exp.company}</span></h3>
                      <span className="text-[10px] text-amber-400">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 font-sans" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 border-b border-slate-800 pb-1 mb-2">Compétences Stratégiques</h2>
              <div className="space-y-1.5 text-xs text-slate-300">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-amber-200 font-bold">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 border-b border-slate-800 pb-1 mb-2">Grandes Écoles & Titres</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-amber-100">{edu.degree}</div>
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
  // STYLE 38: PHOTO SCANDINAVIAN
  // -------------------------------------------------------------
  if (activeStyle === 'photo_scandinavian') {
    return (
      <div className="w-full bg-[#fbfcfb] p-8 sm:p-10 font-sans text-slate-800">
        <div className="flex items-center gap-6 border-b border-teal-900/15 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border border-teal-700/30 shrink-0 bg-teal-50 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-teal-700" />
            )}
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-light text-teal-950">
              <span className="font-semibold">{personalInfo.firstName}</span> {personalInfo.lastName}
            </h1>
            <p className="text-xs font-medium text-teal-800 uppercase tracking-wider">{personalInfo.targetJob}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-900 border-b border-teal-900/15 pb-1 mb-2">Présentation</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-teal-950 border-b border-teal-900/15 pb-1 mb-3">Expériences</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium text-xs sm:text-sm text-slate-900">{exp.position} — <span className="text-teal-800 font-semibold">{exp.company}</span></h3>
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
              <h2 className="text-xs font-semibold uppercase tracking-widest text-teal-950 border-b border-teal-900/15 pb-1 mb-2">Compétences</h2>
              <div className="space-y-1.5 text-xs">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-teal-950 block text-[11px] font-semibold">{cat.category}</strong>
                    <span className="text-slate-600">{cat.skills.join(' • ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-teal-950 border-b border-teal-900/15 pb-1 mb-2">Formations</h2>
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
  // STYLE 39: PHOTO SILICON EXEC
  // -------------------------------------------------------------
  if (activeStyle === 'photo_silicon_exec') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl mb-6 shadow-md flex items-center justify-between gap-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-widest">Leadership & Scale</span>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">{personalInfo.targetJob || 'VP of Engineering / CTO'}</p>
            <div className="flex flex-wrap gap-3 text-xs text-indigo-100 mt-2 font-medium">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-indigo-400 shrink-0 bg-slate-800 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-indigo-200" />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-indigo-700 pb-1 mb-2">Executive Summary</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-indigo-700 pb-1 mb-3">Leadership Track Record</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-indigo-800 font-semibold">{exp.company}</span></h3>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-indigo-700 pb-1 mb-2">Core Competencies</h2>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-indigo-700 pb-1 mb-2">Education & Degrees</h2>
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
  // STYLE 40: PHOTO HOSPITALITY & LUXE
  // -------------------------------------------------------------
  if (activeStyle === 'photo_hospitality') {
    return (
      <div className="w-full bg-[#fdfcfb] p-8 sm:p-10 font-serif text-slate-900">
        <div className="flex items-center gap-6 border-b-2 border-amber-800/30 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-amber-700 shadow shrink-0 bg-slate-100 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-amber-700" />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-sans font-bold tracking-widest text-amber-800 uppercase">Hôtellerie de Luxe & Accueil 5*</span>
            <h1 className="text-2xl sm:text-3xl font-normal text-slate-950 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-sans font-semibold text-slate-700 uppercase tracking-wider">{personalInfo.targetJob || 'Directeur d\'Hôtel'}</p>
            <div className="flex flex-wrap gap-3 text-xs font-sans text-slate-600 pt-1">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Profil & Standards d'Excellence</h2>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-3">Expériences & Établissements</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline font-sans">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-amber-800">{exp.company}</span></h3>
                      <span className="text-[10px] text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Compétences Métier</h2>
              <div className="space-y-1 text-xs text-slate-700">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Diplômes Hôteliers</h2>
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
  // STYLE 41: PHOTO AVIATION & LOGISTIQUE
  // -------------------------------------------------------------
  if (activeStyle === 'photo_aviation') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="flex items-center justify-between border-b-2 border-sky-800 pb-5 mb-6 gap-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div>
            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-widest flex items-center gap-1"><Plane className="w-3.5 h-3.5" /> Aéronautique & Supply Chain</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase mt-0.5">{personalInfo.targetJob || 'Manager Logistique & Fret'}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-2 border-sky-800 shrink-0 bg-slate-100 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-sky-800" />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Profil & Rigueur Opérationnelle</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-3">Parcours & Opérations</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-sky-800 font-semibold">{exp.company}</span></h3>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Expertises & Normes</h2>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Diplômes & Licences</h2>
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
  // STYLE 42: PHOTO MEDIA & PRESSE
  // -------------------------------------------------------------
  if (activeStyle === 'photo_media_press') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-serif text-slate-900">
        <div className="flex items-center gap-6 border-b-4 border-slate-950 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-20 h-24 rounded-none overflow-hidden border border-slate-900 shrink-0 bg-slate-100 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover grayscale" />
            ) : (
              <User className="w-10 h-10 text-slate-800" />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-sans font-black tracking-widest text-red-600 uppercase">Information & Ligne Éditoriale</span>
            <h1 className="text-3xl font-black text-slate-950 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-sans font-bold text-slate-700 uppercase">{personalInfo.targetJob || 'Journaliste / Rédacteur en Chef'}</p>
            <div className="flex flex-wrap gap-3 text-xs font-sans text-slate-600 pt-1">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Édito & Ligne Professionnelle</h2>
            <p className="text-xs text-slate-800 leading-relaxed font-sans">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-3">Enquêtes & Rédactions</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline font-sans">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="font-semibold italic text-slate-700">{exp.company}</span></h3>
                      <span className="text-[10px] text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Compétences</h2>
              <div className="space-y-1 text-xs text-slate-700">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Écoles de Journalisme</h2>
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
  // STYLE 43: PHOTO ENERGY GREEN
  // -------------------------------------------------------------
  if (activeStyle === 'photo_energy_green') {
    return (
      <div className="w-full bg-[#f6faf6] p-8 sm:p-10 font-sans text-slate-900">
        <div className="flex items-center gap-6 border-b-2 border-emerald-700 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-emerald-600 shrink-0 bg-emerald-50 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-emerald-700" />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Énergies Renouvelables & Climat</span>
            <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase">{personalInfo.targetJob || 'Ingénieur Énergies'}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase text-emerald-950 border-b border-emerald-700/30 pb-1 mb-2">Vision Énergétique</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-950 border-b border-emerald-700/30 pb-1 mb-3">Projets Solaires & Réalisations</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs sm:text-sm text-emerald-950">{exp.position} — <span className="text-emerald-800 font-semibold">{exp.company}</span></h3>
                      <span className="text-[10px] text-slate-500 font-medium">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-950 border-b border-emerald-700/30 pb-1 mb-2">Compétences Techniques</h2>
              <div className="space-y-1.5 text-xs text-slate-700">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-emerald-950 font-bold">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-950 border-b border-emerald-700/30 pb-1 mb-2">Diplômes d'Ingénieur</h2>
              {education.map((edu) => (
                <div key={edu.id} className="mb-2 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="font-bold text-emerald-950">{edu.degree}</div>
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
  // STYLE 44: PHOTO FINTECH PRO
  // -------------------------------------------------------------
  if (activeStyle === 'photo_fintech_pro') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="flex items-center gap-6 border-b-2 border-blue-600 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-blue-600 shrink-0 bg-blue-50 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-blue-600" />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">FinTech & Néo-Banque</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase">{personalInfo.targetJob || 'Product Manager FinTech'}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Profil Produit & Finance</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-3">Expériences & Launches</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-blue-700 font-semibold">{exp.company}</span></h3>
                      <span className="text-[10px] font-mono font-bold text-blue-600">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Stack & Compétences</h2>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Diplômes</h2>
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
  // STYLE 45: PHOTO PUBLIC SECTOR & DIPLOMATIE
  // -------------------------------------------------------------
  if (activeStyle === 'photo_public_sector') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-serif text-slate-900">
        <div className="flex items-center gap-6 border-b-2 border-slate-900 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-slate-900 shrink-0 bg-slate-100 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-slate-800" />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-sans font-bold tracking-widest text-blue-900 uppercase">Affaires Publiques & Diplomatie</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-sans font-bold text-slate-700 uppercase">{personalInfo.targetJob || 'Conseiller Diplomatique'}</p>
            <div className="flex flex-wrap gap-3 text-xs font-sans text-slate-600 pt-1">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Profil & Engagement Public</h2>
            <p className="text-xs text-slate-800 leading-relaxed font-sans">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-3">Fonctions & Missions Officielles</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline font-sans">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-blue-950 font-semibold">{exp.company}</span></h3>
                      <span className="text-[10px] text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Domaines de Compétence</h2>
              <div className="space-y-1 text-xs text-slate-700">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-slate-900 font-bold">{cat.category} : </strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Diplômes & Concours</h2>
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
  // STYLE 46: PHOTO AGRI-FOOD & BIO
  // -------------------------------------------------------------
  if (activeStyle === 'photo_agri_food') {
    return (
      <div className="w-full bg-[#fdfcf9] p-8 sm:p-10 font-sans text-slate-900">
        <div className="flex items-center gap-6 border-b-2 border-lime-800 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-lime-700 shrink-0 bg-lime-50 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-lime-800" />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-lime-800 uppercase tracking-widest">Agro-Alimentaire & Filières Terroir</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase">{personalInfo.targetJob || 'Ingénieur Agronome'}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase text-lime-950 border-b border-lime-800/30 pb-1 mb-2">Profil Agronomie</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-lime-950 border-b border-lime-800/30 pb-1 mb-3">Parcours & Exploitations</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-lime-800 font-semibold">{exp.company}</span></h3>
                      <span className="text-[10px] text-slate-500">{exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</span>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-lime-950 border-b border-lime-800/30 pb-1 mb-2">Compétences Clés</h2>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-lime-950 border-b border-lime-800/30 pb-1 mb-2">Diplômes</h2>
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
  // STYLE 47: PHOTO SPORTS & PERFORMANCE
  // -------------------------------------------------------------
  if (activeStyle === 'photo_sports_coach') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="flex items-center gap-6 border-b-4 border-red-600 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-red-600 shrink-0 bg-red-50 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-red-600" />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Sport, Santé & Haute Performance</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase">{personalInfo.targetJob || 'Coach Sportif & Préparateur Physique'}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-red-600 pb-1 mb-2">Philosophie de Coaching</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-red-600 pb-1 mb-3">Parcours & Palmarès</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-red-600 font-semibold">{exp.company}</span></h3>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-red-600 pb-1 mb-2">Disciplines & Outils</h2>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b-2 border-red-600 pb-1 mb-2">Diplômes d'État</h2>
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
  // STYLE 48: PHOTO IMMOBILIER DE PRESTIGE
  // -------------------------------------------------------------
  if (activeStyle === 'photo_real_estate') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="flex items-center gap-6 border-b-2 border-amber-800 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-amber-700 shrink-0 bg-slate-100 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-amber-800" />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1"><Home className="w-3.5 h-3.5" /> Immobilier Haut de Gamme</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase">{personalInfo.targetJob || 'Consultant Immobilier Prestige'}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Profil & Négociation</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-3">Transactions & Mandats</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-amber-800 font-semibold">{exp.company}</span></h3>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Expertises Métier</h2>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Diplômes & Cartes Pro</h2>
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
  // STYLE 49: PHOTO DIGITAL NOMAD
  // -------------------------------------------------------------
  if (activeStyle === 'photo_digital_nomad') {
    return (
      <div className="w-full bg-white p-8 sm:p-10 font-sans text-slate-900">
        <div className="flex items-center gap-6 border-b-2 border-purple-600 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-purple-500 shrink-0 bg-purple-50 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-purple-600" />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest flex items-center gap-1"><Laptop className="w-3.5 h-3.5" /> Digital Nomad & Freelance International</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-slate-700 uppercase">{personalInfo.targetJob || 'Consultant Freelance & Remote'}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.city && <span>• {personalInfo.city}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Profil & Flexibilité Remote</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-3">Missions & Clients</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-950">{exp.position} — <span className="text-purple-700 font-semibold">{exp.company}</span></h3>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Stack & Outils Remote</h2>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 border-b pb-1 mb-2">Formations</h2>
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
  // STYLE 50: PHOTO QUANTUM AI
  // -------------------------------------------------------------
  if (activeStyle === 'photo_quantum_ai') {
    return (
      <div className="w-full bg-[#030712] text-slate-100 p-8 sm:p-10 font-mono min-h-[297mm]">
        <div className="flex items-center gap-6 border-b border-cyan-500/40 pb-5 mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] shrink-0 bg-slate-900 flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img src={personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-cyan-300" />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1"><BrainCircuit className="w-3.5 h-3.5" /> QUANTUM COMPUTING & GENERATIVE AI</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase">{personalInfo.firstName} {personalInfo.lastName}</h1>
            <p className="text-xs font-bold text-cyan-300 uppercase mt-0.5">&gt; {personalInfo.targetJob || 'Lead AI Researcher & LLM Architect'}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-400 pt-1">
              {personalInfo.email && <span>email: "{personalInfo.email}"</span>}
              {personalInfo.phone && <span>• tel: "{personalInfo.phone}"</span>}
              {personalInfo.city && <span>• loc: "{personalInfo.city}"</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase text-cyan-400 border-b border-slate-800 pb-1 mb-2">// SYSTEM_PROFILE</h2>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">{profileSummary}</p>
          </div>
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase text-cyan-400 border-b border-slate-800 pb-1 mb-3">// RESEARCH_&_DEPLOYMENTS</h2>
            <div className="space-y-4">
              {experiences.map((exp) => {
                const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
                const bullets = aiExp?.optimizedDescription || (exp.description ? [exp.description] : []);
                return (
                  <div key={exp.id} className="space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="flex justify-between items-baseline font-sans">
                      <h3 className="font-bold text-xs text-white">{exp.position} @ <span className="text-cyan-400">{exp.company}</span></h3>
                      <span className="text-[10px] font-mono text-cyan-300">{exp.startDate} - {exp.current ? 'ACTIVE' : exp.endDate}</span>
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
              <h2 className="text-xs font-bold uppercase text-cyan-400 border-b border-slate-800 pb-1 mb-2">// ALGORITHMIC_STACK</h2>
              <div className="space-y-1.5 text-xs font-sans text-slate-300">
                {skills.map((cat, idx) => (
                  <div key={idx}>
                    <strong className="text-cyan-300 font-mono text-[11px] block">{cat.category}:</strong>
                    <span>{cat.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase text-cyan-400 border-b border-slate-800 pb-1 mb-2">// PHDs_&_ACCREDITATIONS</h2>
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

  return null;
};
