import React, { useState } from 'react';
import { 
  Plus, Trash2, Sparkles, FileCheck, Calculator, RefreshCw, 
  Building2, User, Phone, Mail, MapPin, Calendar, Clock, 
  CreditCard, Smartphone, CheckCircle2, ArrowRight, Eye, Download,
  Percent, AlertCircle, FileText, Copy, Check,
  Layers, Palette, Tag, Shield, ArrowLeftRight
} from 'lucide-react';
import { BusinessDocData, BusinessDocItem } from '../types';
import { SECTOR_PRESETS, INDIVIDUAL_SERVICES_CATALOG } from '../data/businessPresets';
import { numberToFrenchWords } from '../utils/numberToWords';
import { generateBusinessDocWithGemini } from '../lib/geminiService';

interface DevisFactureFormProps {
  data: BusinessDocData;
  onChange: (data: BusinessDocData) => void;
  onOpenWizard: (docType: 'devis' | 'facture' | 'pack_business') => void;
  onPreviewToggle?: () => void;
  onPreview?: () => void;
  hideTypeSwitch?: boolean;
}

export const DevisFactureForm: React.FC<DevisFactureFormProps> = ({
  data,
  onChange,
  onOpenWizard,
  onPreviewToggle,
  onPreview,
  hideTypeSwitch = false
}) => {
  const isQuote = data.type === 'devis';
  const currency = data.currency || 'FCFA';
  const handlePreviewClick = onPreview || onPreviewToggle;
  const [activeTab, setActiveTab] = useState<'coords' | 'items' | 'payment'>('coords');
  const [isAiPolishing, setIsAiPolishing] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  // Switch Currency
  const handleCurrencyChange = (newCurrency: string) => {
    onChange({
      ...data,
      currency: newCurrency
    });
    setAiSuccessMsg(`Devise mise à jour : ${newCurrency}`);
    setTimeout(() => setAiSuccessMsg(null), 2000);
  };

  // Switch between Devis & Facture
  const handleTypeChange = (newType: 'devis' | 'facture') => {
    const currentYear = new Date().getFullYear();
    const defaultDocNum = newType === 'devis' 
      ? `DEV-${currentYear}-${String(Math.floor(Math.random() * 900) + 100)}`
      : `FAC-${currentYear}-${String(Math.floor(Math.random() * 900) + 100)}`;
    
    onChange({
      ...data,
      type: newType,
      docNumber: data.docNumber ? data.docNumber.replace(/^(DEV|FAC)/, newType === 'devis' ? 'DEV' : 'FAC') : defaultDocNum
    });
  };

  // Convert Quote directly to Invoice in 1 click
  const handleConvertQuoteToInvoice = () => {
    const currentYear = new Date().getFullYear();
    const invoiceNum = data.docNumber 
      ? data.docNumber.replace(/^DEV-/, 'FAC-') 
      : `FAC-${currentYear}-${String(Math.floor(Math.random() * 900) + 100)}`;
    
    onChange({
      ...data,
      type: 'facture',
      docNumber: invoiceNum,
      notes: data.notes || 'Facture émise suite à la validation du devis. Règlement à réception.'
    });
    setAiSuccessMsg("Converti en Facture Client !");
    setTimeout(() => setAiSuccessMsg(null), 2500);
  };

  // Add line item
  const handleAddItem = () => {
    const newItem: BusinessDocItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: '',
      quantity: 1,
      unitPrice: 50000,
      total: 50000
    };
    onChange({
      ...data,
      items: [...(data.items || []), newItem]
    });
  };

  // Add item from quick catalog
  const handleAddFromCatalog = (service: { label: string; price: number }) => {
    const newItem: BusinessDocItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: service.label,
      quantity: 1,
      unitPrice: service.price,
      total: service.price
    };
    onChange({
      ...data,
      items: [...(data.items || []), newItem]
    });
    setAiSuccessMsg(`"${service.label}" ajouté !`);
    setTimeout(() => setAiSuccessMsg(null), 2000);
  };

  // Duplicate line item
  const handleDuplicateItem = (index: number) => {
    const itemToClone = data.items[index];
    if (!itemToClone) return;
    const cloned: BusinessDocItem = {
      ...itemToClone,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    const updated = [...data.items];
    updated.splice(index + 1, 0, cloned);
    onChange({ ...data, items: updated });
  };

  // Update line item
  const handleUpdateItem = (index: number, field: keyof BusinessDocItem, val: any) => {
    const updated = [...(data.items || [])];
    const item = { ...updated[index], [field]: val };
    const q = Number(field === 'quantity' ? val : item.quantity) || 0;
    const p = Number(field === 'unitPrice' ? val : item.unitPrice) || 0;
    item.total = q * p;
    updated[index] = item;
    onChange({ ...data, items: updated });
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    const updated = data.items.filter((_, i) => i !== index);
    onChange({ ...data, items: updated });
  };

  // Apply Sector Preset
  const handleApplySectorPreset = (presetId: string) => {
    const preset = SECTOR_PRESETS.find(p => p.id === presetId);
    if (preset) {
      onChange({
        ...data,
        items: preset.items,
        notes: preset.defaultNotes || data.notes
      });
      setAiSuccessMsg(`Pack "${preset.name}" appliqué !`);
      setTimeout(() => setAiSuccessMsg(null), 2500);
    }
  };

  // Auto Calculations
  const subtotalHT = (data.items || []).reduce((acc, item) => {
    return acc + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
  }, 0);

  const discountAmount = data.discountPercent 
    ? Math.round((subtotalHT * data.discountPercent) / 100) 
    : 0;

  const netHT = subtotalHT - discountAmount;
  const vatRate = data.applyVat ? (data.vatRate ?? 18) : 0;
  const vatAmount = data.applyVat ? Math.round((netHT * vatRate) / 100) : 0;
  const totalTTC = netHT + vatAmount;

  // Deposit (Acompte)
  const deposit = data.depositAmount || 0;
  const remainingBalance = Math.max(0, totalTTC - deposit);

  // AI Assist Polish with Gemini
  const handleAiPolish = async () => {
    setIsAiPolishing(true);
    setAiSuccessMsg(null);

    try {
      const resData = await generateBusinessDocWithGemini({
        docType: data.type,
        issuer: data.issuer,
        client: data.client,
        items: data.items
      });

      if (resData.success && resData.items) {
        onChange({
          ...data,
          items: resData.items,
          notes: resData.notes || data.notes
        });
        setAiSuccessMsg("✨ Prestations optimisées par l'IA !");
      } else {
        const formattedItems = (data.items || []).map((it) => ({
          ...it,
          description: it.description.trim() ? it.description.trim().replace(/^[a-z]/, (c) => c.toUpperCase()) : 'Prestation de service'
        }));
        onChange({ ...data, items: formattedItems });
        setAiSuccessMsg("✨ Format harmonisé !");
      }
    } catch (e) {
      setAiSuccessMsg("✨ Format harmonisé !");
    } finally {
      setIsAiPolishing(false);
      setTimeout(() => setAiSuccessMsg(null), 2500);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4 text-slate-800 text-xs">
      
      {/* 1. COMPACT HEADER BAR: MODE SWITCHER, CURRENCY SELECTOR & QUICK CONVERT */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        {/* Toggle Devis / Facture & Devise Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {!hideTypeSwitch && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleTypeChange('devis')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  isQuote ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Devis Pro</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('facture')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isQuote ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Facture</span>
              </button>
            </div>
          )}

          {/* Currency Selector (FCFA, EUR, USD) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 px-1.5 hidden sm:inline">Devise:</span>
            {[
              { id: 'FCFA', label: 'FCFA' },
              { id: 'EUR', label: 'EUR (€)' },
              { id: 'USD', label: 'USD ($)' }
            ].map((c) => {
              const isSelected = currency === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCurrencyChange(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`Passer le document en ${c.label}`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {handlePreviewClick && (
            <button
              type="button"
              onClick={handlePreviewClick}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
              title={`Afficher le ${isQuote ? 'Devis' : 'la Facture'} en plein écran`}
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>Voir le document plein écran</span>
            </button>
          )}

          {!hideTypeSwitch && isQuote && (
            <button
              type="button"
              onClick={handleConvertQuoteToInvoice}
              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
            >
              <ArrowLeftRight className="w-3 h-3 text-amber-600" />
              <span>Convertir en Facture</span>
            </button>
          )}

          <div className="text-right pl-2 border-l border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block">Total TTC</span>
            <span className="text-sm font-black text-indigo-900 font-mono">
              {totalTTC.toLocaleString('fr-FR')} {currency}
            </span>
          </div>
        </div>
      </div>

      {/* 2. COMPACT TAB BAR (3 SIMPLE TABS) */}
      <div className="flex rounded-xl bg-slate-100 p-1 text-center font-bold text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('coords')}
          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'coords' ? 'bg-white text-indigo-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>1. Coordonnées</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'items' ? 'bg-white text-indigo-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. Prestations ({data.items?.length || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payment')}
          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'payment' ? 'bg-white text-indigo-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>3. Paiement & Totaux</span>
        </button>
      </div>

      {/* Alert toast */}
      {aiSuccessMsg && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{aiSuccessMsg}</span>
        </div>
      )}

      {/* 3. TAB 1: COORDONNÉES ÉMETTEUR & CLIENT */}
      {activeTab === 'coords' && (
        <div className="space-y-3">
          {/* Doc Ref & Dates in 1 Line */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">N° Document</label>
              <input
                type="text"
                value={data.docNumber}
                onChange={(e) => onChange({ ...data, docNumber: e.target.value })}
                className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Date d'émission</label>
              <input
                type="date"
                value={data.issueDate}
                onChange={(e) => onChange({ ...data, issueDate: e.target.value })}
                className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{isQuote ? 'Validité (jours)' : 'Échéance'}</label>
              {isQuote ? (
                <input
                  type="number"
                  value={data.validityDays || 30}
                  onChange={(e) => onChange({ ...data, validityDays: Number(e.target.value) || 30 })}
                  className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                />
              ) : (
                <input
                  type="date"
                  value={data.dueDate || ''}
                  onChange={(e) => onChange({ ...data, dueDate: e.target.value })}
                  className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                />
              )}
            </div>
          </div>

          {/* 2-Column Grid: Émetteur vs Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Émetteur */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <span className="font-black text-indigo-700 uppercase tracking-wider text-[10px] block">
                1. Émetteur (Votre Société)
              </span>
              <div>
                <input
                  type="text"
                  value={data.issuer.companyName}
                  onChange={(e) => onChange({ ...data, issuer: { ...data.issuer, companyName: e.target.value } })}
                  placeholder="Nom de l'entreprise *"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={data.issuer.phone}
                  onChange={(e) => onChange({ ...data, issuer: { ...data.issuer, phone: e.target.value } })}
                  placeholder="Téléphone *"
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                />
                <input
                  type="email"
                  value={data.issuer.email}
                  onChange={(e) => onChange({ ...data, issuer: { ...data.issuer, email: e.target.value } })}
                  placeholder="Email pro"
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={data.issuer.address}
                  onChange={(e) => onChange({ ...data, issuer: { ...data.issuer, address: e.target.value } })}
                  placeholder="Adresse / Ville"
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                />
                <input
                  type="text"
                  value={data.issuer.ninea || ''}
                  onChange={(e) => onChange({ ...data, issuer: { ...data.issuer, ninea: e.target.value } })}
                  placeholder="NINEA / RC"
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                />
              </div>
            </div>

            {/* Client */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <span className="font-black text-indigo-700 uppercase tracking-wider text-[10px] block">
                2. Client Destinataire
              </span>
              <div>
                <input
                  type="text"
                  value={data.client.companyName || ''}
                  onChange={(e) => onChange({ ...data, client: { ...data.client, companyName: e.target.value } })}
                  placeholder="Nom du Client ou Société *"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={data.client.phone}
                  onChange={(e) => onChange({ ...data, client: { ...data.client, phone: e.target.value } })}
                  placeholder="Téléphone client"
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                />
                <input
                  type="email"
                  value={data.client.email}
                  onChange={(e) => onChange({ ...data, client: { ...data.client, email: e.target.value } })}
                  placeholder="Email client"
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={data.client.address}
                  onChange={(e) => onChange({ ...data, client: { ...data.client, address: e.target.value } })}
                  placeholder="Adresse / Quartier du Client"
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              <span>Prestations suivantes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. TAB 2: PRESTATIONS & CATALOGUE */}
      {activeTab === 'items' && (
        <div className="space-y-3">
          {/* Quick Sector Presets in Compact Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-bold text-slate-400 shrink-0">Packs Métiers :</span>
            {SECTOR_PRESETS.slice(0, 5).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplySectorPreset(p.id)}
                className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all shrink-0"
              >
                {p.name.split(',')[0]}
              </button>
            ))}
          </div>

          {/* Action Bar for Items */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <span className="font-bold text-slate-700 text-xs">Lignes du document ({data.items?.length || 0})</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAiPolish}
                disabled={isAiPolishing}
                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Sparkles className={`w-3 h-3 ${isAiPolishing ? 'animate-spin' : ''}`} />
                <span>IA Gemini</span>
              </button>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
          </div>

          {/* Items List (Compact Rows) */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {(data.items || []).map((item, index) => {
              const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
              return (
                <div 
                  key={item.id || index}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                      placeholder="Désignation de la prestation / service..."
                      className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleDuplicateItem(index)}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                      title="Dupliquer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={data.items.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pl-7 text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-[10px]">Qté:</span>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, 'quantity', Number(e.target.value) || 0)}
                        className="w-full px-2 py-0.5 rounded border border-slate-200 bg-white font-bold text-center"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-[10px]">P.U:</span>
                      <input
                        type="number"
                        step={1000}
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(index, 'unitPrice', Number(e.target.value) || 0)}
                        className="w-full px-2 py-0.5 rounded border border-slate-200 bg-white font-bold"
                      />
                    </div>
                    <div className="flex items-center justify-end font-black text-indigo-900">
                      <span>{lineTotal.toLocaleString('fr-FR')} {currency}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Prestations Catalog */}
          <div className="flex flex-wrap gap-1 pt-1">
            {INDIVIDUAL_SERVICES_CATALOG.slice(0, 6).map((srv, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleAddFromCatalog(srv)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-2.5 h-2.5 text-indigo-600" />
                <span>{srv.label.split(' ')[0]} {srv.label.split(' ')[1]} ({srv.price.toLocaleString('fr-FR')} {currency})</span>
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('coords')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
            >
              ← Coordonnées
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payment')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              <span>Paiement & Totaux</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 5. TAB 3: FISCALITÉ, PAIEMENT & CONDITIONS */}
      {activeTab === 'payment' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment & Conditions */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <span className="font-black text-indigo-700 uppercase tracking-wider text-[10px] block">
                Modes de Règlement
              </span>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Numéro Wave Sénégal</label>
                <input
                  type="text"
                  value={data.paymentInfo?.waveNumber || ''}
                  onChange={(e) => onChange({ ...data, paymentInfo: { ...data.paymentInfo, waveNumber: e.target.value } })}
                  placeholder="+221 77 000 00 00"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Numéro Orange Money</label>
                <input
                  type="text"
                  value={data.paymentInfo?.orangeMoneyNumber || ''}
                  onChange={(e) => onChange({ ...data, paymentInfo: { ...data.paymentInfo, orangeMoneyNumber: e.target.value } })}
                  placeholder="+221 78 000 00 00"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Banque & RIB (optionnel)</label>
                <input
                  type="text"
                  value={data.paymentInfo?.ibanOrRib || ''}
                  onChange={(e) => onChange({ ...data, paymentInfo: { ...data.paymentInfo, ibanOrRib: e.target.value } })}
                  placeholder="RIB ou IBAN"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                />
              </div>
            </div>

            {/* Tax & Breakdown */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <span className="font-black text-indigo-700 uppercase tracking-wider text-[10px] block">
                Calculateur Fiscal & Totaux
              </span>
              
              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs">
                  <input
                    type="checkbox"
                    checked={data.applyVat}
                    onChange={(e) => onChange({ ...data, applyVat: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>TVA UEMOA (18%)</span>
                </label>
                <span className="font-bold text-slate-700">
                  {data.applyVat ? `${vatAmount.toLocaleString('fr-FR')} ${currency}` : `0 ${currency}`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Remise (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={data.discountPercent || 0}
                    onChange={(e) => onChange({ ...data, discountPercent: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Acompte ({currency})</label>
                  <input
                    type="number"
                    step={currency === 'FCFA' ? 5000 : 50}
                    value={data.depositAmount || 0}
                    onChange={(e) => onChange({ ...data, depositAmount: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white font-bold text-xs"
                  />
                </div>
              </div>

              {/* Total Box */}
              <div className="p-2.5 rounded-xl bg-indigo-900 text-white flex justify-between items-center shadow-xs">
                <span className="text-[10px] font-bold text-indigo-200 uppercase">NET TTC</span>
                <span className="text-base font-black font-mono">{totalTTC.toLocaleString('fr-FR')} {currency}</span>
              </div>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-bold text-slate-500">Style Visuel :</span>
            <div className="flex gap-1.5">
              {[
                { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-600' },
                { id: 'emerald', label: 'Émeraude', bg: 'bg-emerald-600' },
                { id: 'amber', label: 'Or', bg: 'bg-amber-500' },
                { id: 'slate', label: 'Ardoise', bg: 'bg-slate-900' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChange({ ...data, themeStyle: t.id as any })}
                  className={`px-2 py-1 rounded text-[10px] font-bold text-white cursor-pointer transition-all ${t.bg} ${
                    (data.themeStyle || 'indigo') === t.id ? 'ring-2 ring-offset-1 ring-indigo-600 scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
            >
              ← Prestations
            </button>
          </div>
        </div>
      )}

      {/* 6. GLOBAL CTA BAR AT BOTTOM */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500">
          Format conforme OHADA / UEMOA • Arrêté automatique en lettres
        </div>

        <button
          type="button"
          onClick={() => onOpenWizard(isQuote ? 'devis' : 'facture')}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Télécharger en PDF HD (1 000 F)</span>
        </button>
      </div>

    </div>
  );
};

export default DevisFactureForm;
