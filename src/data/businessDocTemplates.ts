import { BusinessDocTemplateOption } from '../types';

export const BUSINESS_DOC_TEMPLATES: BusinessDocTemplateOption[] = [
  {
    id: 'classique_ohada',
    name: 'Classique OHADA',
    description: 'Alignement traditionnel conforme normes UEMOA/OHADA, tableau standard et mentions légales.',
    badge: 'Standard UEMOA'
  },
  {
    id: 'minimaliste_pro',
    name: 'Minimaliste Pro',
    description: 'Polices fines, très épuré, lignes légères et aérées, mise en valeur des chiffres essentiels.',
    badge: 'Ultra Épuré'
  },
  {
    id: 'corporate_executif',
    name: 'Corporate / Exécutif',
    description: 'En-tête imposante avec typographie forte, structure pour grands comptes et PME.',
    badge: 'Corporate'
  },
  {
    id: 'modern_clean',
    name: 'Modern Clean',
    description: 'Disposition moderne et asymétrique, décompte financier soigné aligné à droite.',
    badge: 'Moderne'
  },
  {
    id: 'compact_business',
    name: 'Compact Business',
    description: 'Mise en page resserrée optimisée pour de nombreux articles et prestations sur 1 page.',
    badge: 'Condensé'
  },
  {
    id: 'freelance_creative',
    name: 'Freelance Creative',
    description: 'Style épuré pour consultants & indépendants, typographie soignée et termes d’exécution clairs.',
    badge: 'Freelance'
  },
  {
    id: 'deux_colonnes',
    name: 'Structure Deux Colonnes',
    description: 'Coordonnées de l’émetteur et du client face-à-face dans l’en-tête, équilibre visuel parfait.',
    badge: 'Symétrique'
  },
  {
    id: 'standard_international',
    name: 'Standard International',
    description: 'Format universel avec mentions détaillées (NINEA, RC, TVA, devise ISO), idéal export.',
    badge: 'International'
  },
  {
    id: 'btp_service',
    name: 'BTP & Prestations',
    description: 'Descriptions de travaux détaillées, gestion visible des acomptes et délais de chantier.',
    badge: 'Technique & BTP'
  },
  {
    id: 'elegant_line',
    name: 'Elegant Line',
    description: 'Lignes architecturales épurées uniquement sur les totaux et l’en-tête, clarté maximale.',
    badge: 'Design Épuré'
  }
];
