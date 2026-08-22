import React from 'react';
import { CVFormData, AIOptimizedData } from '../types';
import { Mail, Phone, MapPin } from 'lucide-react';

interface CoverLetterTemplateProps {
  formData?: CVFormData;
  data?: CVFormData;
  aiData?: AIOptimizedData | null;
  onDownloadPDF?: () => void;
  onOpenDownloadWizard?: () => void;
  isGeneratingPDF?: boolean;
  onFormDataChange?: (updated: CVFormData) => void;
  onRegenerate?: () => void;
  isLoading?: boolean;
  isEditingDirectly?: boolean;
  onToneChange?: (tone: any) => void;
}

export const CoverLetterTemplate: React.FC<CoverLetterTemplateProps> = ({
  formData: propFormData,
  data: propData,
  aiData,
  isEditingDirectly = false,
  onFormDataChange
}) => {
  const formData = propFormData || propData || ({} as CVFormData);
  const personalInfo = formData?.personalInfo || {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Dakar',
    country: 'Sénégal',
    targetJob: '',
    linkedin: ''
  };

  const targetJob = personalInfo.targetJob || '';
  const targetCompany = formData.targetCompany || "l'Entreprise";
  const city = personalInfo.city || 'Dakar';
  const country = personalInfo.country || 'Sénégal';

  const todayDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const userCustomInstructions = (formData.letterInstructions || formData.highlightsSummary || '').trim();

  // Rich, full-page default letter crafted to fill an A4 page harmoniously following VOUS / MOI / NOUS / CONCLUSION architecture (250-350 words)
  const defaultLetter = {
    subject: `Candidature${targetJob ? ` au poste de ${targetJob}` : ''}${formData.targetCompany ? ` - ${formData.targetCompany}` : ''}`,
    greeting: 'Madame, Monsieur le Responsable des Recrutements,',
    opening: `C'est avec un vif intérêt et un réel enthousiasme que je vous soumets ma candidature pour le poste de ${targetJob || 'professionnel qualifié'} au sein de ${formData.targetCompany ? formData.targetCompany : 'votre entreprise'}. Reconnu pour son dynamisme, son exigence de qualité et son positionnement stratégique sur le marché, votre établissement incarne une référence d'excellence au sein de laquelle je souhaite activement investir mes compétences et mon engagement.`,
    bodyParagraphs: [
      userCustomInstructions
        ? `Fort d'un parcours solide directement aligné avec vos attentes prioritaires (${userCustomInstructions}), j'ai acquis une maîtrise approfondie des méthodologies opérationnelles et techniques propres à notre secteur d'activité. Mon sens aigu de l'organisation et ma rigueur m'ont permis de mener à bien des projets stratégiques d'envergure, de surmonter des défis complexes et d'atteindre avec constance des résultats mesurables et performants.`
        : `Fort d'un parcours solide et diversifié dans mon domaine d'activité, j'ai acquis une maîtrise approfondie des méthodologies opérationnelles et des outils indispensables à la performance de mes fonctions. Mon sens aigu de l'organisation et mon esprit d'analyse m'ont permis de piloter des projets stratégiques d'envergure, de surmonter des problématiques complexes et d'atteindre avec régularité des objectifs ambitieux et chiffrés.`,
      `Intégrer ${formData.targetCompany ? formData.targetCompany : 'votre structure'} constitue pour moi une opportunité majeure de conjuguer mes compétences à vos ambitions de développement. Parfaitement au fait des enjeux et spécificités économiques à ${city} et dans la sous-région UEMOA, je suis convaincu que ma proactivité, mon leadership collaboratif et ma force de proposition apporteront une valeur ajoutée concrète et immédiate à vos équipes.`
    ],
    callToAction: `Convaincu de la parfaite adéquation entre vos besoins et mon profil, je serais honoré de vous rencontrer lors d'un entretien à votre convenance afin de vous exposer de vive voix le détail de mes motivations et mes perspectives de contribution. Je me tiens à votre entière disposition pour convenir d'une date d'échange.`,
    closing: `Dans l'attente de votre précieux retour, je vous prie d'agréer, Madame, Monsieur le Responsable des Recrutements, l'expression de mes salutations les plus distinguées et respectueuses.`
  };

  const letter = aiData?.coverLetter || defaultLetter;

  // Handle direct text edits if editable mode is on
  const handleTextChange = (field: string, value: string) => {
    if (!onFormDataChange) return;
    // can sync back if needed
  };

  return (
    <div className="w-full flex justify-center py-2 print:py-0">
      {/* ------------------------------------------------------------- */}
      {/* PURE A4 SHEET CONTAINER (210mm x 297mm)                       */}
      {/* ------------------------------------------------------------- */}
      <div 
        id="letter-preview" 
        data-single-page="true"
        className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-xl border border-slate-200/90 p-8 sm:p-12 lg:p-14 flex flex-col justify-between font-sans leading-relaxed print:shadow-none print:border-none print:p-0 print:m-0 print:min-h-0"
        style={{
          boxSizing: 'border-box',
          pageBreakInside: 'avoid',
          breakInside: 'avoid'
        }}
      >
        {/* TOP SECTION: HEADER + RECIPIENT + SUBJECT + GREETING */}
        <div className="space-y-5">
          
          {/* 1. Header: Candidate Info (Left) + Recipient Info & Date (Right) */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-5">
            
            {/* Sender (Candidate) Details */}
            <div className="space-y-1 max-w-sm">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                {personalInfo.firstName || 'Prénom'} {personalInfo.lastName || 'NOM'}
              </h1>
              {personalInfo.targetJob && (
                <p className="text-xs sm:text-sm font-extrabold text-indigo-700 uppercase tracking-wider">
                  {personalInfo.targetJob}
                </p>
              )}
              
              <div className="pt-2 text-xs text-slate-600 space-y-1 font-medium">
                {(personalInfo.address || personalInfo.city) && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{personalInfo.address ? `${personalInfo.address}, ` : ''}{city}, {country}</span>
                  </p>
                )}
                {personalInfo.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{personalInfo.phone}</span>
                  </p>
                )}
                {personalInfo.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{personalInfo.email}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Recipient Details (Right Aligned) */}
            <div className="text-left sm:text-right space-y-1 text-xs self-start sm:self-auto bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none w-full sm:w-auto border sm:border-none border-slate-100">
              <p className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wide">
                À l'attention de la Direction des Recrutements
              </p>
              {formData.targetCompany ? (
                <p className="font-black text-indigo-700 text-sm sm:text-base">{formData.targetCompany}</p>
              ) : (
                <p className="font-bold text-slate-800 text-xs sm:text-sm">Direction des Ressources Humaines</p>
              )}
              <p className="text-slate-600 font-medium">{city}, {country}</p>
              <p className="text-slate-500 font-medium pt-1">
                Fait à <span className="font-bold text-slate-800">{city}</span>, le {todayDate}
              </p>
            </div>

          </div>

          {/* 2. Subject Line (Objet) */}
          <div className="bg-slate-50/90 border-l-4 border-indigo-600 px-4 py-2.5 rounded-r-lg">
            <p className="text-xs sm:text-sm font-bold text-slate-900">
              <span className="text-indigo-700 font-black uppercase tracking-wider mr-2">Objet :</span>
              <span 
                contentEditable={isEditingDirectly} 
                suppressContentEditableWarning 
                className="outline-none"
              >
                {letter.subject}
              </span>
            </p>
          </div>

          {/* 3. Greeting */}
          <div className="pt-0.5">
            <p className="font-bold text-slate-900 text-xs sm:text-sm">
              <span 
                contentEditable={isEditingDirectly} 
                suppressContentEditableWarning 
                className="outline-none"
              >
                {letter.greeting}
              </span>
            </p>
          </div>

          {/* 4. Body Paragraphs (Structure VOUS / MOI / NOUS / CONCLUSION) */}
          <div 
            className="text-slate-800 font-sans"
            style={{ 
              fontSize: '10.5pt', 
              lineHeight: 1.6,
              textAlign: 'justify' 
            }}
          >
            
            {/* Paragraphe 1 : Accroche (VOUS) */}
            <p 
              contentEditable={isEditingDirectly} 
              suppressContentEditableWarning 
              className="outline-none font-normal"
              style={{ marginBottom: '1.25rem' }}
            >
              {letter.opening}
            </p>

            {/* Paragraphes 2 & 3 : MOI (Compétences & Réalisations) et NOUS (Apport mutuel) */}
            {letter.bodyParagraphs && letter.bodyParagraphs.map((para, idx) => (
              <p 
                key={idx} 
                contentEditable={isEditingDirectly} 
                suppressContentEditableWarning 
                className="outline-none font-normal"
                style={{ marginBottom: '1.25rem' }}
              >
                {para}
              </p>
            ))}

            {/* Paragraphe 4 : Conclusion & Demande d'entretien */}
            {letter.callToAction && (
              <p 
                contentEditable={isEditingDirectly} 
                suppressContentEditableWarning 
                className="outline-none font-normal"
                style={{ marginBottom: '1.25rem' }}
              >
                {letter.callToAction}
              </p>
            )}

            {/* Formule de politesse formelle */}
            {letter.closing && (
              <p 
                contentEditable={isEditingDirectly} 
                suppressContentEditableWarning 
                className="outline-none font-medium text-slate-900"
                style={{ marginBottom: '1.25rem' }}
              >
                {letter.closing}
              </p>
            )}

          </div>

        </div>

        {/* BOTTOM SECTION: SIGNATURE */}
        <div className="pt-6 mt-4 border-t border-slate-200 flex justify-end" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          {/* Signature Block */}
          <div className="text-right space-y-1">
            <p className="text-xs text-slate-500 font-medium">Signature du candidat,</p>
            <p className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
              {personalInfo.firstName} {personalInfo.lastName}
            </p>
            {personalInfo.targetJob && (
              <p className="text-xs font-bold text-indigo-700">{personalInfo.targetJob}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};



