import { BusinessDocItem } from '../types';

export interface SectorPreset {
  id: string;
  name: string;
  iconName: string;
  description: string;
  items: BusinessDocItem[];
  defaultNotes: string;
}

export const SECTOR_PRESETS: SectorPreset[] = [
  {
    id: 'web_fintech',
    name: 'Web, Logiciel & Mobile Money',
    iconName: 'Code',
    description: 'Développement web, applications et intégration Wave / Orange Money',
    items: [
      { id: 'item-1', description: 'Développement d\'une plateforme web responsive moderne (Next.js, TypeScript, Tailwind)', quantity: 1, unitPrice: 350000, total: 350000 },
      { id: 'item-2', description: 'Intégration de la passerelle de paiement Mobile Money (Wave, Orange Money & Free Money)', quantity: 1, unitPrice: 150000, total: 150000 },
      { id: 'item-3', description: 'Hébergement Cloud sécurisé, certificat SSL et configuration nom de domaine .sn (1 an)', quantity: 1, unitPrice: 80000, total: 80000 },
      { id: 'item-4', description: 'Formation des administrateurs et maintenance technique corrective offerte (30 jours)', quantity: 1, unitPrice: 50000, total: 50000 }
    ],
    defaultNotes: 'Acompte de 50% à la validation du devis, solde à la mise en production.\nDélais de livraison : 14 jours ouvrés.\nGarantie et support inclus pendant 30 jours.'
  },
  {
    id: 'btp_renovation',
    name: 'BTP, Électricité & Rénovation',
    iconName: 'Hammer',
    description: 'Chantier, maçonnerie, électricité, plomberie et finitions',
    items: [
      { id: 'item-1', description: 'Travaux de peinture intérieure haut de gamme (Enduit, ponçage et 2 couches finition)', quantity: 120, unitPrice: 3500, total: 420000 },
      { id: 'item-2', description: 'Rénovation complète installation électrique et pose tableau divisionnaire aux normes', quantity: 1, unitPrice: 280000, total: 280000 },
      { id: 'item-3', description: 'Fourniture et pose de carrelage en grès cérame poli 60x60 cm (avec plinthes)', quantity: 45, unitPrice: 9000, total: 405000 },
      { id: 'item-4', description: 'Nettoyage approfondi de fin de chantier et évacuation des gravats', quantity: 1, unitPrice: 60000, total: 60000 }
    ],
    defaultNotes: 'Modalités de règlement : Acompte 40% au démarrage, 40% à mi-chantier, 20% à la réception des travaux.\nDurée d\'exécution estimée : 21 jours ouvrables.'
  },
  {
    id: 'design_branding',
    name: 'Design, Branding & Médias',
    iconName: 'Palette',
    description: 'Identité visuelle, logos vectoriels, charte graphique et réseaux sociaux',
    items: [
      { id: 'item-1', description: 'Création d\'identité visuelle complète (Logo vectoriel, déclinaisons, charte graphique & typographies)', quantity: 1, unitPrice: 180000, total: 180000 },
      { id: 'item-2', description: 'Pack de supports imprimés (Cartes de visite pro, papier à en-tête, chemises à rabat & kakemono)', quantity: 1, unitPrice: 95000, total: 95000 },
      { id: 'item-3', description: 'Kit de 15 templates visuels éditables Canva / Photoshop pour Instagram & LinkedIn', quantity: 1, unitPrice: 75000, total: 75000 },
      { id: 'item-4', description: 'Livraison des fichiers sources HD (AI, EPS, PDF Haute Définition, PNG transparent)', quantity: 1, unitPrice: 30000, total: 30000 }
    ],
    defaultNotes: 'Règlement par Wave ou Virement bancaire.\nCession totale des droits d\'utilisation et de propriété intellectuelle à la livraison finale.'
  },
  {
    id: 'consulting_audit',
    name: 'Consulting, Audit & Formation',
    iconName: 'Briefcase',
    description: 'Audit financier, stratégie d\'entreprise, élaboration de business plan',
    items: [
      { id: 'item-1', description: 'Mission de diagnostic stratégique et audit organisationnel des opérations', quantity: 1, unitPrice: 450000, total: 450000 },
      { id: 'item-2', description: 'Élaboration du Plan d\'Affaires (Business Plan prévisionnel sur 3 ans aux normes bancaires UEMOA)', quantity: 1, unitPrice: 300000, total: 300000 },
      { id: 'item-3', description: 'Session de formation certifiante pour l\'équipe managériale (2 journées complètes)', quantity: 2, unitPrice: 150000, total: 300000 }
    ],
    defaultNotes: 'Honoraires payables à 50% à la signature de la convention de prestation et 50% à la remise du rapport final.'
  },
  {
    id: 'evenementiel_traiteur',
    name: 'Événementiel & Traiteur',
    iconName: 'Utensils',
    description: 'Organisation de séminaires, pauses-café, sonorisation et réceptions',
    items: [
      { id: 'item-1', description: 'Pause-café VIP (Café Touba, Nespresso, viennoiseries chaudes, jus locaux Bissap/Bouye & fruits)', quantity: 35, unitPrice: 3500, total: 122500 },
      { id: 'item-2', description: 'Buffet déjeunatoire complet (Entrées variées, Thieboudienne Penda Mbaye, grillades & desserts)', quantity: 35, unitPrice: 7500, total: 262500 },
      { id: 'item-3', description: 'Location sonorisation professionnelle, micros sans fil et vidéoprojecteur Full HD', quantity: 1, unitPrice: 85000, total: 85000 },
      { id: 'item-4', description: 'Service en salle assuré par maîtres d\'hôtel qualifiés avec tenue professionnelle', quantity: 2, unitPrice: 25000, total: 50000 }
    ],
    defaultNotes: 'Réservation ferme confirmée à réception d\'un acompte de 60%. Solde le jour de l\'événement.'
  },
  {
    id: 'nettoyage_securite',
    name: 'Nettoyage & Sécurité Pro',
    iconName: 'Shield',
    description: 'Entretien de bureaux, désinfection, gardiennage et sécurité',
    items: [
      { id: 'item-1', description: 'Prestation mensuelle d\'entretien et nettoyage quotidien de locaux professionnels (300 m²)', quantity: 1, unitPrice: 160000, total: 160000 },
      { id: 'item-2', description: 'Désinfection, dératisation et désinsectisation semestrielle certifiée', quantity: 1, unitPrice: 75000, total: 75000 },
      { id: 'item-3', description: 'Fourniture des consommables d\'hygiène (Savons automatiques, essuie-mains et sacs)', quantity: 1, unitPrice: 45000, total: 45000 }
    ],
    defaultNotes: 'Facturation mensuelle terme échu. Paiement à 15 jours par virement ou Wave.'
  },
  {
    id: 'transport_logistique',
    name: 'Transport, Logistique & Location',
    iconName: 'Truck',
    description: 'Courses urbaines, transferts aéroport AIBD, location de véhicules',
    items: [
      { id: 'item-1', description: 'Mise à disposition d\'un SUV climatisé avec chauffeur professionnel (Journée de 10h Dakar)', quantity: 3, unitPrice: 45000, total: 135000 },
      { id: 'item-2', description: 'Transferts VIP Aéroport International Blaise Diagne (AIBD) - Dakar Centre', quantity: 2, unitPrice: 30000, total: 60000 },
      { id: 'item-3', description: 'Frais de carburant et péages autoroute à péage inclus', quantity: 1, unitPrice: 35000, total: 35000 }
    ],
    defaultNotes: 'Règlement à la fin de la mission par Wave, Orange Money ou Carte Bancaire.'
  }
];

export const INDIVIDUAL_SERVICES_CATALOG = [
  { category: 'Informatique & Web', label: 'Création de site vitrine 5 pages', price: 250000 },
  { category: 'Informatique & Web', label: 'Boutique E-commerce avec paiement Wave & OM', price: 450000 },
  { category: 'Informatique & Web', label: 'Maintenance et mises à jour mensuelles', price: 50000 },
  { category: 'Design & Graphisme', label: 'Création de Logo vectoriel 3 propositions', price: 90000 },
  { category: 'Design & Graphisme', label: 'Affiche publicitaire & Flyer A5', price: 35000 },
  { category: 'Design & Graphisme', label: 'Création de catalogue produits PDF', price: 85000 },
  { category: 'Consulting & Droit', label: 'Rédaction de statuts de société SARL / SAS', price: 150000 },
  { category: 'Consulting & Droit', label: 'Déclaration fiscale mensuelle et TVA', price: 60000 },
  { category: 'BTP & Artisanat', label: 'Pose carrelage au m²', price: 4000 },
  { category: 'BTP & Artisanat', label: 'Travaux de plomberie sanitaire forfait', price: 75000 },
  { category: 'BTP & Artisanat', label: 'Installation climatiseur split (pose & raccord)', price: 35000 },
  { category: 'Marketing Digital', label: 'Gestion réseaux sociaux (1 mois / 12 posts)', price: 120000 },
  { category: 'Marketing Digital', label: 'Campagne sponsorisée Meta Ads / Google Ads', price: 70000 }
];
