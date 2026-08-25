import React, { useState, useRef } from 'react';
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Sparkles, 
  Smartphone, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { verifyReceiptImage } from '../services/receiptPaymentService';
import { ReceiptVerificationResult } from '../types';

interface ReceiptDropzoneProps {
  expectedAmount: number;
  documentTitle?: string;
  userId?: string;
  userEmail?: string;
  purpose?: 'document_unlock' | 'wallet_recharge' | 'pack_purchase' | string;
  onSuccess: (result: ReceiptVerificationResult) => void;
  onError?: (error: string) => void;
}


export const ReceiptDropzone: React.FC<ReceiptDropzoneProps> = ({
  expectedAmount,
  documentTitle = 'Déblocage de document',
  userId = 'guest',
  userEmail = 'candidat@senegalcv.sn',
  purpose = 'document_unlock',
  onSuccess,
  onError
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<ReceiptVerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage("Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("L'image est trop volumineuse (maximum 10 Mo).");
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setResult(null);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Déclencher automatiquement l'analyse OCR IA
    setIsAnalyzing(true);
    try {
      const res = await verifyReceiptImage({
        file,
        expectedAmount,
        documentTitle,
        userId,
        userEmail,
        purpose
      });

      setResult(res);

      if (res.success && res.status === 'COMPLETED') {
        // Succès immédiat
        setTimeout(() => {
          onSuccess(res);
        }, 1200);
      } else {
        const err = res.error || "Reçu non valide ou déjà utilisé.";
        setErrorMessage(err);
        if (onError) onError(err);
      }
    } catch (err: any) {
      const errStr = err?.message || "Reçu non valide ou déjà utilisé.";
      setErrorMessage(errStr);
      if (onError) onError(errStr);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const resetSelection = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Zone de Dépôt / Upload Interactif */}
      {!selectedFile ? (
        <div
          id="receipt-dropzone-box"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/80 scale-[0.99] ring-4 ring-indigo-500/10'
              : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/80 bg-white'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
            onChange={handleInputChange}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
              <Upload className="w-8 h-8 animate-bounce-subtle" />
            </div>

            <div className="space-y-1">
              <p className="text-base sm:text-lg font-bold text-slate-900">
                Importez la capture d'écran de votre reçu Wave ou Orange Money
              </p>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Glissez-déposez l'image ici ou <span className="text-indigo-600 font-semibold underline">parcourez vos fichiers</span>
              </p>
            </div>

            {/* Badges des opérateurs supportés */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                Wave Sénégal (TxID)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                Orange Money (ID OM)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Validation IA Instantanée
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Contrôle anti-doublon en temps réel & activation automatique sans attente</span>
            </div>
          </div>
        </div>
      ) : (
        /* Vue après sélection avec Scan IA */
        <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {previewUrl && (
                <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-slate-200 bg-white flex-shrink-0 shadow-sm">
                  <img src={previewUrl} alt="Reçu importé" className="w-full h-full object-cover" />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="w-full h-1 bg-white/80 animate-scan-line"></div>
                    </div>
                  )}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / 1024).toFixed(0)} Ko • {selectedFile.type.split('/')[1]?.toUpperCase()}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyse IA en cours (Vision OCR)...</span>
                    </>
                  ) : result?.success ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reçu analysé avec succès
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Analyse terminée avec erreur
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={resetSelection}
              disabled={isAnalyzing}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Changer d'image</span>
            </button>
          </div>

          {/* Animation pendant l'analyse IA */}
          {isAnalyzing && (
            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-indigo-900 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                  Extraction des informations de transaction...
                </span>
                <span>Vérification sécurité</span>
              </div>
              <div className="w-full bg-indigo-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full w-2/3 animate-pulse"></div>
              </div>
              <p className="text-[11px] text-indigo-700">
                L'IA analyse le montant ({expectedAmount.toLocaleString('fr-FR')} FCFA), l'ID unique et l'authenticité de la capture.
              </p>
            </div>
          )}

          {/* Résultat positif & Données extraites */}
          {result?.success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>Paiement instantané validé (COMPLETED) !</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-white/80 p-3 rounded-lg border border-emerald-100">
                <div>
                  <span className="text-slate-500 block">Opérateur :</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {result.method === 'wave' ? 'Wave Sénégal' : result.method === 'orange_money' ? 'Orange Money' : 'Mobile Money'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Montant détecté :</span>
                  <span className="font-bold text-emerald-700">
                    {(result.amount || expectedAmount).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-100">
                  <span className="text-slate-500 block">ID Transaction unique :</span>
                  <span className="font-mono font-bold text-indigo-700 select-all">
                    {result.transactionId || 'Non spécifié'}
                  </span>
                </div>
                {result.date && (
                  <div className="col-span-2 text-slate-500 text-[11px]">
                    Date du reçu : {result.date}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                <Zap className="w-4 h-4 text-amber-500 animate-bounce" />
                <span>Activation automatique de votre service en cours...</span>
              </div>
            </div>
          )}

          {/* Message d'erreur clair si rejeté */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 animate-shake">
              <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span>Reçu non valide ou déjà utilisé.</span>
              </div>
              <p className="text-xs text-red-700">
                {errorMessage}
              </p>
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={resetSelection}
                  className="text-xs font-bold text-red-700 hover:text-red-900 underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Importer un autre reçu
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
