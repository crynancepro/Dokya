import React from 'react';
import { BusinessDocData, BusinessDocTemplateId } from '../types';
import { numberToFrenchWords } from '../utils/numberToWords';

interface DevisFactureTemplateProps {
  data: BusinessDocData;
  isUnlocked?: boolean;
  onDataChange?: (updated: BusinessDocData) => void;
}

export const DevisFactureTemplate: React.FC<DevisFactureTemplateProps> = ({
  data
}) => {
  const isQuote = data.type === 'devis';
  const currency = data.currency || 'FCFA';
  const templateId: BusinessDocTemplateId = data.templateId || 'classique_ohada';

  // Calculate totals
  const subtotalHT = (data.items || []).reduce((acc, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unitPrice) || 0;
    return acc + (q * p);
  }, 0);

  const discountAmount = data.discountPercent 
    ? Math.round((subtotalHT * data.discountPercent) / 100) 
    : 0;

  const netHT = subtotalHT - discountAmount;
  const vatRate = data.applyVat ? (data.vatRate ?? 18) : 0;
  const vatAmount = data.applyVat ? Math.round((netHT * vatRate) / 100) : 0;
  const totalTTC = netHT + vatAmount;

  const deposit = data.depositAmount || 0;
  const remainingBalance = Math.max(0, totalTTC - deposit);

  const totalInWords = numberToFrenchWords(totalTTC, currency);

  // Theme color styles
  const theme = data.themeStyle || 'indigo';
  const getThemeClasses = () => {
    switch (theme) {
      case 'emerald':
        return {
          primaryText: 'text-emerald-700',
          accentBorder: 'border-emerald-600',
          accentBg: 'bg-emerald-600',
          lightAccentText: 'text-emerald-800'
        };
      case 'amber':
        return {
          primaryText: 'text-amber-700',
          accentBorder: 'border-amber-500',
          accentBg: 'bg-amber-500',
          lightAccentText: 'text-amber-800'
        };
      case 'slate':
        return {
          primaryText: 'text-slate-900',
          accentBorder: 'border-slate-900',
          accentBg: 'bg-slate-900',
          lightAccentText: 'text-slate-900'
        };
      case 'indigo':
      default:
        return {
          primaryText: 'text-indigo-700',
          accentBorder: 'border-indigo-600',
          accentBg: 'bg-indigo-600',
          lightAccentText: 'text-indigo-800'
        };
    }
  };

  const themeClasses = getThemeClasses();

  // Helper common components (all rendered directly on white background without box containers)
  const renderItemsTable = (isCompact = false, showDetails = false) => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-900">
          <th className={`${isCompact ? 'py-1.5' : 'py-2.5'} px-2 w-8 text-center`}>#</th>
          <th className={`${isCompact ? 'py-1.5' : 'py-2.5'} px-3`}>Désignation des Prestations & Livrables</th>
          <th className={`${isCompact ? 'py-1.5' : 'py-2.5'} px-2 w-16 text-center`}>Qté</th>
          <th className={`${isCompact ? 'py-1.5' : 'py-2.5'} px-3 w-28 text-right`}>P.U ({currency})</th>
          <th className={`${isCompact ? 'py-1.5' : 'py-2.5'} px-3 w-32 text-right`}>Total HT ({currency})</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 text-xs">
        {(data.items && data.items.length > 0) ? (
          data.items.map((item, idx) => {
            const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
            return (
              <tr key={item.id || idx}>
                <td className={`${isCompact ? 'py-1.5' : 'py-3'} px-2 text-center font-bold text-slate-400 text-[11px]`}>{idx + 1}</td>
                <td className={`${isCompact ? 'py-1.5' : 'py-3'} px-3 font-semibold text-slate-800 whitespace-pre-line leading-relaxed`}>
                  {item.description || 'Prestation professionnelle'}
                  {showDetails && (
                    <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                      Conforme au cahier des charges et aux spécifications convenues.
                    </span>
                  )}
                </td>
                <td className={`${isCompact ? 'py-1.5' : 'py-3'} px-2 text-center font-bold text-slate-700`}>
                  {item.quantity || 1}
                </td>
                <td className={`${isCompact ? 'py-1.5' : 'py-3'} px-3 text-right text-slate-700 font-mono`}>
                  {(Number(item.unitPrice) || 0).toLocaleString('fr-FR')}
                </td>
                <td className={`${isCompact ? 'py-1.5' : 'py-3'} px-3 text-right font-black text-slate-900 font-mono`}>
                  {lineTotal.toLocaleString('fr-FR')}
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={5} className="py-6 text-center text-slate-400 italic text-xs">
              Aucune ligne de prestation ajoutée.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderTotals = () => (
    <div className="space-y-2 text-xs">
      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
        <span>Total Hors Taxe (HT) :</span>
        <span className="font-bold text-slate-900 font-mono">{subtotalHT.toLocaleString('fr-FR')} {currency}</span>
      </div>

      {data.discountPercent > 0 && (
        <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
          <span>Remise commerciale ({data.discountPercent}%) :</span>
          <span className="font-bold font-mono">- {discountAmount.toLocaleString('fr-FR')} {currency}</span>
        </div>
      )}

      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
        <span>TVA ({data.applyVat ? `${data.vatRate ?? 18}%` : 'Exonérée'}) :</span>
        <span className="font-semibold text-slate-800 font-mono">
          {data.applyVat ? `${vatAmount.toLocaleString('fr-FR')} ${currency}` : `0 ${currency}`}
        </span>
      </div>

      <div className="flex justify-between items-center py-2.5 border-b-2 border-slate-900 text-slate-900 mt-2">
        <span className="text-xs font-black uppercase tracking-wider">
          {isQuote ? 'MONTANT TOTAL DU DEVIS' : 'NET À PAYER TTC'} :
        </span>
        <span className="text-lg font-black font-mono">
          {totalTTC.toLocaleString('fr-FR')} {currency}
        </span>
      </div>

      {deposit > 0 && (
        <div className="space-y-1 pt-1 text-[11px]">
          <div className="flex justify-between text-slate-600">
            <span>Acompte versé / requis :</span>
            <span className="font-bold font-mono text-slate-800">- {deposit.toLocaleString('fr-FR')} {currency}</span>
          </div>
          <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
            <span>Solde restant dû :</span>
            <span className="font-mono">{remainingBalance.toLocaleString('fr-FR')} {currency}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderPaymentInfo = () => (
    <div className="space-y-3 text-xs">
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
          Modalités de Paiement & Règlements
        </span>
      </div>

      <div className="space-y-1.5 text-slate-700">
        {data.paymentInfo?.waveNumber && (
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="font-medium text-slate-600">Wave Sénégal :</span>
            <span className="font-black font-mono text-slate-900">{data.paymentInfo.waveNumber}</span>
          </div>
        )}
        {data.paymentInfo?.orangeMoneyNumber && (
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="font-medium text-slate-600">Orange Money :</span>
            <span className="font-black font-mono text-slate-900">{data.paymentInfo.orangeMoneyNumber}</span>
          </div>
        )}
        {data.paymentInfo?.bankName && (
          <div className="py-1 border-b border-slate-100">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-600">Banque :</span>
              <span className="font-bold text-slate-900">{data.paymentInfo.bankName}</span>
            </div>
            {data.paymentInfo.ibanOrRib && (
              <div className="flex justify-between items-center mt-1 text-[11px]">
                <span className="text-slate-500">RIB / IBAN :</span>
                <span className="font-mono font-bold text-slate-900">{data.paymentInfo.ibanOrRib}</span>
              </div>
            )}
          </div>
        )}
        {data.notes && (
          <div className="pt-2 text-[11px] text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Conditions & Délais :</strong> {data.notes}
          </div>
        )}
      </div>
    </div>
  );

  const renderAmountInWords = () => (
    <div className="my-6 py-3 border-t border-b border-slate-200 text-xs text-slate-700 leading-relaxed">
      <span className="text-slate-400 font-bold uppercase text-[10px] mr-2">Arrêté en lettres :</span>
      <span className="font-medium italic">
        « {isQuote ? 'Arrêté le présent devis à la somme de' : 'Arrêté la présente facture à la somme de'} <strong className="text-slate-900 not-italic font-bold">{totalInWords}</strong> TTC »
      </span>
    </div>
  );

  const renderSignatures = () => (
    <div className="grid grid-cols-2 gap-8 pt-4 text-xs">
      <div className="space-y-8">
        <div className="font-bold text-slate-900">
          Bon pour Accord Client :
        </div>
        <div className="border-b border-slate-300 w-3/4 pt-8"></div>
        <span className="text-[10px] text-slate-400 italic block">Date, Signature et mention manuscrite "Lu et approuvé"</span>
      </div>

      <div className="text-right space-y-8">
        <div>
          <span className="font-black text-slate-900 block">{data.issuer.companyName || 'Mon Entreprise'}</span>
          <span className="text-[11px] text-slate-500">{data.signatoryName || data.issuer.name}</span>
        </div>
        <div className="border-b border-slate-300 w-3/4 ml-auto pt-8"></div>
        <span className="text-[10px] text-slate-400 block">Cachet de l'entreprise & Signature autorisée</span>
      </div>
    </div>
  );

  const renderFooter = () => (
    <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 leading-relaxed">
      <p>{data.issuer.companyName || 'Entreprise'} • NINEA : {data.issuer.ninea || 'En cours'} • {data.issuer.address || 'Dakar, Sénégal'} • Conformité OHADA / UEMOA</p>
    </div>
  );

  // =========================================================================
  // 10 DISTINCT TEMPLATE LAYOUTS (ALL CLEAN & CONTAINER-FREE)
  // =========================================================================

  return (
    <div 
      id="business-doc-preview" 
      data-single-page="true"
      data-a4-document="true"
      style={{
        width: '210mm',
        minWidth: '210mm',
        maxWidth: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box'
      }}
      className="w-[210mm] min-w-[210mm] max-w-[210mm] min-h-[297mm] mx-auto bg-white text-slate-900 p-10 rounded-none shadow-xl border border-slate-200/90 print:shadow-none print:border-none print:p-0 font-sans text-xs selection:bg-indigo-600 selection:text-white a4-document-root"
    >
      {/* ------------------------------------------------------------------ */}
      {/* MODÈLE 1 : CLASSIQUE OHADA (Standard UEMOA)                       */}
      {/* ------------------------------------------------------------------ */}
      {templateId === 'classique_ohada' && (
        <>
          <div className="flex justify-between items-start gap-6 pb-6 border-b border-slate-200">
            <div className="space-y-1.5 max-w-sm">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {data.issuer.companyName || 'Mon Entreprise / Agence'}
              </h1>
              {data.issuer.name && (
                <p className={`text-xs font-bold ${themeClasses.primaryText}`}>
                  {data.issuer.name}
                </p>
              )}
              <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 leading-relaxed">
                {data.issuer.address && <p>{[data.issuer.address, data.issuer.city, data.issuer.country || 'Sénégal'].filter(Boolean).join(', ')}</p>}
                <p className="font-medium text-slate-700">Tél : {data.issuer.phone || '+221 77 000 00 00'} {data.issuer.email && `• ${data.issuer.email}`}</p>
                {(data.issuer.ninea || data.issuer.rc) && (
                  <p className="text-[10px] text-slate-500 font-mono">
                    {data.issuer.ninea && `NINEA : ${data.issuer.ninea}`} {data.issuer.rc && `| RC : ${data.issuer.rc}`}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className={`text-sm font-black uppercase tracking-wider ${themeClasses.primaryText}`}>
                {isQuote ? 'DEVIS PROFESSIONNEL' : 'FACTURE CLIENT'}
              </div>
              <div className="text-lg font-black text-slate-900 font-mono">
                N° {data.docNumber || (isQuote ? 'DEV-2026-001' : 'FAC-2026-001')}
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                <div>Date d'émission : <strong className="text-slate-900">{data.issueDate || new Date().toISOString().split('T')[0]}</strong></div>
                {isQuote ? (
                  <div>Validité de l'offre : <strong className="text-slate-900">{data.validityDays || 30} jours</strong></div>
                ) : (
                  <div>Échéance de règlement : <strong className="text-slate-900">{data.dueDate || 'À réception'}</strong></div>
                )}
              </div>
            </div>
          </div>

          <div className="py-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                {isQuote ? 'Devis établi pour :' : 'Client Destinataire :'}
              </span>
              <div className="text-sm font-black text-slate-900">
                {data.client.companyName || data.client.name || 'Nom du Client / Entreprise'}
              </div>
              {data.client.companyName && data.client.name && (
                <div className="text-xs text-slate-600 font-medium mt-0.5">
                  À l'attention de : {data.client.name}
                </div>
              )}
            </div>

            <div className="text-left sm:text-right text-[11px] text-slate-600 space-y-0.5">
              {data.client.address && <div>{[data.client.address, data.client.city || 'Dakar'].filter(Boolean).join(', ')}</div>}
              {data.client.phone && <div>Tél : <strong className="text-slate-800">{data.client.phone}</strong></div>}
              {data.client.email && <div>Email : {data.client.email}</div>}
            </div>
          </div>

          <div className="my-6">{renderItemsTable()}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start pt-4 border-t border-slate-200">
            {renderPaymentInfo()}
            {renderTotals()}
          </div>
          {renderAmountInWords()}
          {renderSignatures()}
          {renderFooter()}
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODÈLE 2 : MINIMALISTE PRO (Lignes très fines & aérées)           */}
      {/* ------------------------------------------------------------------ */}
      {templateId === 'minimaliste_pro' && (
        <div className="font-sans font-light">
          <div className="flex justify-between items-start pb-8 border-b border-slate-100">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {data.issuer.companyName || 'Mon Entreprise'}
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-1">
                {data.issuer.name} • {data.issuer.city || 'Dakar'}, {data.issuer.country || 'Sénégal'}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {data.issuer.phone} • {data.issuer.email}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 block">
                {isQuote ? 'DEVIS' : 'FACTURE'}
              </span>
              <div className="text-xl font-light text-slate-900 font-mono mt-0.5">
                #{data.docNumber || '001'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {data.issueDate || new Date().toISOString().split('T')[0]}
              </div>
            </div>
          </div>

          <div className="py-6 border-b border-slate-100 flex justify-between items-baseline">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold block mb-1">FACTURÉ À</span>
              <div className="text-sm font-semibold text-slate-900">{data.client.companyName || data.client.name}</div>
              {data.client.email && <div className="text-xs text-slate-500">{data.client.email}</div>}
            </div>
            <div className="text-right text-xs text-slate-500">
              {data.client.phone && <div>{data.client.phone}</div>}
              {data.client.city && <div>{data.client.city}</div>}
            </div>
          </div>

          <div className="my-6">{renderItemsTable(false)}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-6 border-t border-slate-100">
            {renderPaymentInfo()}
            {renderTotals()}
          </div>

          {renderAmountInWords()}
          {renderSignatures()}
          {renderFooter()}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODÈLE 3 : CORPORATE / EXÉCUTIF (Bandeau et typographie forte)     */}
      {/* ------------------------------------------------------------------ */}
      {templateId === 'corporate_executif' && (
        <div>
          <div className={`border-l-4 ${themeClasses.accentBorder} pl-4 pb-4 mb-6 flex justify-between items-start`}>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                {data.issuer.companyName || 'ENTREPRISE EXÉCUTIVE'}
              </div>
              <div className={`text-xs font-bold ${themeClasses.primaryText} tracking-wide`}>
                {data.issuer.name || 'Direction Générale'}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {data.issuer.address}, {data.issuer.city} • Tél: {data.issuer.phone}
              </div>
            </div>

            <div className="text-right">
              <div className={`text-base font-black uppercase ${themeClasses.primaryText}`}>
                {isQuote ? 'DEVIS CORPORATE' : 'FACTURE COMMERCIALE'}
              </div>
              <div className="text-lg font-black font-mono text-slate-900">
                RÉF : {data.docNumber || 'DOC-2026-001'}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Émission : {data.issueDate}
              </div>
            </div>
          </div>

          <div className="py-4 border-t border-b border-slate-900 flex justify-between items-center text-xs">
            <div>
              <span className="font-bold text-slate-500 uppercase text-[10px] mr-2">DESTINATAIRE :</span>
              <strong className="text-slate-900 font-black text-sm">{data.client.companyName || data.client.name}</strong>
              {data.client.name && data.client.companyName && <span className="text-slate-600 ml-2">({data.client.name})</span>}
            </div>
            <div className="text-slate-600 font-medium">
              {data.client.city || 'Dakar'} • {data.client.phone}
            </div>
          </div>

          <div className="my-6">{renderItemsTable()}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t-2 border-slate-900">
            {renderPaymentInfo()}
            {renderTotals()}
          </div>

          {renderAmountInWords()}
          {renderSignatures()}
          {renderFooter()}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODÈLE 4 : MODERN CLEAN (Disposition asymétrique & soignée)       */}
      {/* ------------------------------------------------------------------ */}
      {templateId === 'modern_clean' && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.primaryText} block mb-1`}>
                DOCUMENT OFFICIEL
              </span>
              <h1 className="text-2xl font-black text-slate-900">
                {data.issuer.companyName || 'Mon Agence'}
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                {data.issuer.email} • {data.issuer.phone}
              </p>
            </div>

            <div className="sm:text-right bg-transparent">
              <div className="text-xs text-slate-500 uppercase font-black">
                {isQuote ? 'Devis n°' : 'Facture n°'}
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {data.docNumber || '2026-001'}
              </div>
              <div className="text-xs text-slate-600 font-medium mt-1">
                Date : {data.issueDate}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ÉMETTEUR</span>
              <div className="font-bold text-slate-900">{data.issuer.name}</div>
              <div className="text-xs text-slate-600">{data.issuer.address}, {data.issuer.city}</div>
              {data.issuer.ninea && <div className="text-[11px] text-slate-500 font-mono">NINEA : {data.issuer.ninea}</div>}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">DESTINATAIRE</span>
              <div className="font-bold text-slate-900">{data.client.companyName || data.client.name}</div>
              <div className="text-xs text-slate-600">{data.client.address}, {data.client.city}</div>
              <div className="text-xs text-slate-600">{data.client.phone} • {data.client.email}</div>
            </div>
          </div>

          <div className="my-6">{renderItemsTable()}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-slate-200">
            {renderPaymentInfo()}
            {renderTotals()}
          </div>

          {renderAmountInWords()}
          {renderSignatures()}
          {renderFooter()}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODÈLE 5 : COMPACT BUSINESS (Mise en page resserrée pour volume)  */}
      {/* ------------------------------------------------------------------ */}
      {templateId === 'compact_business' && (
        <div className="text-[11px]">
          <div className="flex justify-between items-center pb-3 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-base font-black text-slate-900 leading-tight">
                  {data.issuer.companyName || 'Entreprise Commerciale'}
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">
                  {data.issuer.name} • {data.issuer.phone} • {data.issuer.city}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-black text-xs uppercase text-slate-900">
                {isQuote ? 'DEVIS' : 'FACTURE'} N° {data.docNumber || '2026-001'}
              </span>
              <div className="text-[10px] text-slate-500">
                Date : {data.issueDate} | Validité : {data.validityDays || 30}j
              </div>
            </div>
          </div>

          <div className="py-2.5 border-b border-slate-200 flex justify-between items-center text-[10px]">
            <div>
              <span className="font-bold text-slate-500 mr-1">CLIENT :</span>
              <strong className="text-slate-900 font-bold">{data.client.companyName || data.client.name}</strong>
              {data.client.phone && <span className="text-slate-500 ml-2">Tél : {data.client.phone}</span>}
            </div>
            <div className="text-slate-500">
              {data.client.city || 'Dakar'} {data.client.email && `• ${data.client.email}`}
            </div>
          </div>

          <div className="my-3">{renderItemsTable(true)}</div>

          <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-200">
            {renderPaymentInfo()}
            {renderTotals()}
          </div>

          {renderAmountInWords()}
          {renderSignatures()}
          {renderFooter()}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODÈLE 6 : FREELANCE CREATIVE (Design indépendant soigné)         */}
      {/* ------------------------------------------------------------------ */}
      {templateId === 'freelance_creative' && (
        <div>
          <div className="pb-6 border-b border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-xs font-bold uppercase tracking-widest ${themeClasses.primaryText}`}>
                  Studio & Conseil Freelance
                </span>
                <h1 className="text-2xl font-black text-slate-900 mt-1">
                  {data.issuer.name || data.issuer.companyName || 'Consultant Indépendant'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {data.issuer.companyName && `${data.issuer.companyName} • `}{data.issuer.email} • {data.issuer.phone}
                </p>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {isQuote ? 'PROPOSITION TARIFAIRE' : 'NOTE D’HONORAIRES'}
                </div>
                <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
                  #{data.docNumber || 'DEV-2026'}
                </div>
                <div className="text-xs text-slate-500">
                  {data.issueDate}
                </div>
              </div>
            </div>
          </div>

          <div className="py-5 border-b border-slate-200 flex justify-between items-start text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">PROJET POUR :</span>
              <div className="text-sm font-bold text-slate-900">{data.client.companyName || data.client.name}</div>
              {data.client.name && <div className="text-slate-600">Contact : {data.client.name}</div>}
            </div>
            <div className="text-right text-slate-600 space-y-0.5">
              <div>{data.client.email}</div>
              <div>{data.client.phone}</div>
            </div>
          </div>

          <div className="my-6">{renderItemsTable()}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-slate-200">
            {renderPaymentInfo()}
            {renderTotals()}
          </div>

          {renderAmountInWords()}
          {renderSignatures()}
          {renderFooter()}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODÈLE 7 : STRUCTURE DEUX COLONNES (Émetteur et Client face-à-face)*/}
      {/* ------------------------------------------------------------------ */}
      {templateId === 'deux_colonnes' && (
        <div>
          <div className="text-center pb-4 border-b border-slate-200">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
              {isQuote ? 'DEVIS DE PRESTATIONS' : 'FACTURE DÉFINITIVE'}
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              N° {data.docNumber || '2026-001'}  —  Date : {data.issueDate}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 py-6 border-b border-slate-200">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">ÉMETTEUR</span>
              <div className="text-sm font-bold text-slate-900">{data.issuer.companyName || 'Mon Entreprise'}</div>
              <div className="text-xs text-slate-600">{data.issuer.name}</div>
              <div className="text-xs text-slate-600">{data.issuer.address}, {data.issuer.city}</div>
              <div className="text-xs text-slate-600">{data.issuer.phone} • {data.issuer.email}</div>
              {data.issuer.ninea && <div className="text-[10px] text-slate-400 font-mono">NINEA : {data.issuer.ninea}</div>}
            </div>

            <div className="space-y-1 text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">DESTINATAIRE</span>
              <div className="text-sm font-bold text-slate-900">{data.client.companyName || data.client.name}</div>
              {data.client.name && <div className="text-xs text-slate-600">Attn : {data.client.name}</div>}
              <div className="text-xs text-slate-600">{data.client.address || 'Dakar'}</div>
              <div className="text-xs text-slate-600">{data.client.phone} • {data.client.email}</div>
            </div>
          </div>

          <div className="my-6">{renderItemsTable()}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-slate-200">
            {renderPaymentInfo()}
            {renderTotals()}
          </div>

          {renderAmountInWords()}
          {renderSignatures()}
          {renderFooter()}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODÈLE 8 : STANDARD INTERNATIONAL (Mentions fiscales complètes)   */}
      {/* ------------------------------------------------------------------ */}
      {templateId === 'standard_international' && (
        <div>
          <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
            <div>
              <div className="text-xl font-black text-slate-900 uppercase">
                {data.issuer.companyName || 'COMPANY NAME'}
              </div>
              <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                {data.issuer.address}, {data.issuer.city}, {data.issuer.country || 'Sénégal'}<br />
                Tél : {data.issuer.phone} | Email : {data.issuer.email}<br />
                <span className="font-mono text-[10px]">Identifiant Fiscal (NINEA) : {data.issuer.ninea || 'N/A'} | RC : {data.issuer.rc || 'N/A'}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-black uppercase tracking-widest text-slate-900">
                {isQuote ? 'COMMERCIAL QUOTATION' : 'COMMERCIAL INVOICE'}
              </div>
              <div className="text-lg font-black font-mono text-slate-900 mt-1">
                REF : {data.docNumber || 'INV-2026'}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Issue Date : {data.issueDate}<br />
                Currency : <strong className="text-slate-900 font-mono">{currency}</strong>
              </div>
            </div>
          </div>

          <div className="py-4 border-b border-slate-200 flex justify-between items-baseline text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">BILL TO / CLIENT :</span>
              <div className="text-sm font-black text-slate-900">{data.client.companyName || data.client.name}</div>
              <div className="text-slate-600">{data.client.address}, {data.client.city}</div>
            </div>
            <div className="text-right text-slate-600">
              <div>Phone : {data.client.phone}</div>
              <div>Email : {data.client.email}</div>
            </div>
          </div>

          <div className="my-6">{renderItemsTable()}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t-2 border-slate-900">
            {renderPaymentInfo()}
            {renderTotals()}
          </div>

          {renderAmountInWords()}
          {renderSignatures()}
          {renderFooter()}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODÈLE 9 : BTP & SERVICE (Descriptions étendues & acomptes)       */}
      {/* ------------------------------------------------------------------ */}
      {templateId === 'btp_service' && (
        <div>
          <div className="flex justify-between items-start pb-6 border-b border-slate-300">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded-xs inline-block mb-1">
                BTP • TRAVAUX • PRESTATIONS
              </span>
              <h1 className="text-xl font-black text-slate-900 mt-1">
                {data.issuer.companyName || 'Entreprise Générale de Travaux'}
              </h1>
              <p className="text-xs text-slate-600">
                {data.issuer.name} • {data.issuer.phone} • {data.issuer.address}
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs font-black uppercase text-slate-700">
                {isQuote ? 'DEVIS ESTIMATIF DE CHANTIER' : 'FACTURE DE SITUATION'}
              </div>
              <div className="text-lg font-black font-mono text-slate-900">
                N° {data.docNumber || 'BTP-2026-001'}
              </div>
              <div className="text-xs text-slate-500">
                Date : {data.issueDate}
              </div>
            </div>
          </div>

          <div className="py-4 border-b border-slate-200 flex justify-between items-center text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">MAÎTRE D’OUVRAGE / CLIENT :</span>
              <span className="text-sm font-bold text-slate-900">{data.client.companyName || data.client.name}</span>
            </div>
            <div className="text-right text-slate-600">
              Site / Ville : <strong>{data.client.city || 'Dakar'}</strong>
            </div>
          </div>

          <div className="my-6">{renderItemsTable(false, true)}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-slate-300">
            {renderPaymentInfo()}
            {renderTotals()}
          </div>

          {renderAmountInWords()}
          {renderSignatures()}
          {renderFooter()}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODÈLE 10 : ELEGANT LINE (Lignes architecturales fines)           */}
      {/* ------------------------------------------------------------------ */}
      {templateId === 'elegant_line' && (
        <div>
          <div className="border-t-2 border-b-2 border-slate-900 py-4 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black tracking-widest uppercase text-slate-900">
                {data.issuer.companyName || 'MAISON & CONSEIL'}
              </h1>
              <p className="text-xs text-slate-500 tracking-wider">
                {data.issuer.name} • {data.issuer.city}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase tracking-widest font-bold text-slate-500">
                {isQuote ? 'DEVIS OFFICIEL' : 'FACTURE OFFICIELLE'}
              </span>
              <div className="text-base font-black font-mono text-slate-900">
                {data.docNumber || '2026-001'}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-baseline py-4 border-b border-slate-200 text-xs">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold block mb-0.5">CLIENT</span>
              <div className="text-sm font-bold text-slate-900">{data.client.companyName || data.client.name}</div>
            </div>
            <div className="text-right text-slate-500">
              {data.issueDate} • {data.client.phone}
            </div>
          </div>

          <div className="my-6">{renderItemsTable()}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t-2 border-slate-900">
            {renderPaymentInfo()}
            {renderTotals()}
          </div>

          {renderAmountInWords()}
          {renderSignatures()}
          {renderFooter()}
        </div>
      )}

    </div>
  );
};
