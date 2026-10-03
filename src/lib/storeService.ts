import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { ProductItem, StoreOrder, SellerStoreProfile, StoreOrderStatus, SellerReview } from '../types';
import { createNotification } from './firebase';

const PRODUCTS_COLLECTION = 'products';
const STORE_ORDERS_COLLECTION = 'store_orders';
const SELLER_STORES_COLLECTION = 'seller_stores';
const SELLER_REVIEWS_COLLECTION = 'seller_reviews';

const LOCAL_PRODUCTS_PREFIX = 'dokya_seller_products_';
const LOCAL_ORDERS_PREFIX = 'dokya_seller_orders_';
const LOCAL_STORE_PREFIX = 'dokya_seller_store_';
const LOCAL_TELEMARKETER_ORDERS_PREFIX = 'dokya_telemarketer_orders_';
const LOCAL_REVIEWS_PREFIX = 'dokya_seller_reviews_';

/**
 * Nettoie une chaîne pour en faire un slug URL parfait
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Génère un slug unique pour un produit
 */
export function generateProductSlug(title: string): string {
  const base = slugify(title || 'produit');
  const shortRand = Math.random().toString(36).substring(2, 6);
  return `${base || 'item'}-${shortRand}`;
}

/**
 * Sauvegarde ou met à jour un produit
 */
export async function saveProduct(product: Partial<ProductItem> & { userId: string }): Promise<ProductItem> {
  const id = product.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  
  const slug = product.slug ? slugify(product.slug) : generateProductSlug(product.title || 'produit');
  
  const completeProduct: ProductItem = {
    id,
    userId: product.userId,
    sellerUsername: slugify(product.sellerUsername || product.sellerName || 'vendeur'),
    sellerName: product.sellerName || 'Vendeur Dokya',
    sellerPhone: product.sellerPhone || '',
    sellerEmail: product.sellerEmail || '',
    sellerWhatsapp: product.sellerWhatsapp || product.sellerPhone || '',
    title: product.title || 'Nouveau Produit',
    slug,
    description: product.description || '',
    price: Number(product.price) || 0,
    currency: 'FCFA',
    category: product.category || 'Services & Formations',
    images: Array.isArray(product.images) && product.images.length > 0 
      ? product.images 
      : ['https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80'],
    saleType: product.saleType || 'direct_order',
    redirectUrl: product.redirectUrl || '',
    enableDirectOrder: product.saleType === 'direct_order' ? true : (product.enableDirectOrder ?? false),
    status: product.status || 'active',
    viewsCount: product.viewsCount || 0,
    ordersCount: product.ordersCount || 0,
    commissionType: product.commissionType || 'percent',
    commissionValue: product.commissionValue !== undefined ? Number(product.commissionValue) : 20, // 20% par défaut
    targetCountries: Array.isArray(product.targetCountries) && product.targetCountries.length > 0 
      ? product.targetCountries 
      : ['ALL'],
    isAffiliationEnabled: product.isAffiliationEnabled ?? true,
    sellerRating: product.sellerRating || 4.9,
    sellerReviewsCount: product.sellerReviewsCount || 12,
    createdAt: product.createdAt || now,
    updatedAt: now
  };

  // 1. Sauvegarde Firestore
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    await setDoc(docRef, completeProduct, { merge: true });
  } catch (err) {
    console.warn('[StoreService] Erreur écriture Firestore product, sauvegarde locale:', err);
  }

  // 2. Sauvegarde Cache Local (par userId et par sellerUsername pour affichage vitrine instantané)
  try {
    const keysToUpdate = [
      `${LOCAL_PRODUCTS_PREFIX}${product.userId}`,
      `${LOCAL_PRODUCTS_PREFIX}${completeProduct.sellerUsername}`
    ];
    for (const localKey of keysToUpdate) {
      const raw = localStorage.getItem(localKey);
      const existing: ProductItem[] = raw ? JSON.parse(raw) : [];
      const index = existing.findIndex(p => p.id === id);
      if (index >= 0) {
        existing[index] = completeProduct;
      } else {
        existing.unshift(completeProduct);
      }
      localStorage.setItem(localKey, JSON.stringify(existing));
    }
  } catch (_e) {}

  // 3. Garantir la présence et synchronisation du profil vendeur dans seller_stores
  try {
    if (product.userId && completeProduct.sellerUsername) {
      const storeRef = doc(db, SELLER_STORES_COLLECTION, product.userId);
      await setDoc(storeRef, {
        userId: product.userId,
        username: completeProduct.sellerUsername,
        storeName: completeProduct.sellerName || `Boutique ${completeProduct.sellerUsername}`,
        whatsappNumber: completeProduct.sellerWhatsapp || completeProduct.sellerPhone || '',
        phone: completeProduct.sellerPhone || '',
        city: 'Dakar',
        country: 'Sénégal',
        tagline: 'Vendeur officiel Dokya',
        updatedAt: now
      }, { merge: true });

      const storeObj: SellerStoreProfile = {
        id: `store_${product.userId}`,
        userId: product.userId,
        username: completeProduct.sellerUsername,
        storeName: completeProduct.sellerName || `Boutique ${completeProduct.sellerUsername}`,
        whatsappNumber: completeProduct.sellerWhatsapp || completeProduct.sellerPhone || '',
        phone: completeProduct.sellerPhone || '',
        city: 'Dakar',
        country: 'Sénégal',
        tagline: 'Vendeur officiel Dokya',
        createdAt: now,
        updatedAt: now
      };
      localStorage.setItem(`${LOCAL_STORE_PREFIX}${product.userId}`, JSON.stringify(storeObj));
      localStorage.setItem(`${LOCAL_STORE_PREFIX}${completeProduct.sellerUsername}`, JSON.stringify(storeObj));
    }
  } catch (_e) {}

  return completeProduct;
}

/**
 * Récupère tous les produits d'un vendeur
 */
export async function fetchUserProducts(userId: string): Promise<ProductItem[]> {
  if (!userId) return [];
  
  let products: ProductItem[] = [];

  // Essai Firestore
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    snap.forEach(d => {
      products.push(d.data() as ProductItem);
    });
  } catch (err) {
    console.warn('[StoreService] Erreur fetchUserProducts Firestore:', err);
  }

  // Fallback cache local si Firestore échoue ou est vide
  if (products.length === 0) {
    try {
      const localKey = `${LOCAL_PRODUCTS_PREFIX}${userId}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        products = JSON.parse(raw);
      }
    } catch (_e) {}
  } else {
    // Met à jour le cache local
    try {
      const localKey = `${LOCAL_PRODUCTS_PREFIX}${userId}`;
      localStorage.setItem(localKey, JSON.stringify(products));
    } catch (_e) {}
  }

  return products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Récupère un produit unique par son slug (pour dokya.site/p/[slug])
 */
export async function fetchProductBySlug(slug: string): Promise<ProductItem | null> {
  const cleanSlug = slugify(slug);
  if (!cleanSlug) return null;

  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('slug', '==', cleanSlug)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const product = snap.docs[0].data() as ProductItem;
      // Incrémente le compteur de vues de façon non bloquante
      try {
        updateDoc(snap.docs[0].ref, { viewsCount: increment(1) });
      } catch (_e) {}
      return product;
    }
  } catch (err) {
    console.warn('[StoreService] Erreur fetchProductBySlug Firestore:', err);
  }

  // Fallback recherche dans tous les caches locaux
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_PRODUCTS_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list: ProductItem[] = JSON.parse(raw);
          const found = list.find(p => p.slug === cleanSlug || p.id === slug);
          if (found) return found;
        }
      }
    }
  } catch (_e) {}

  return null;
}

/**
 * Supprime un produit
 */
export async function deleteProduct(productId: string, userId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));
  } catch (err) {
    console.warn('[StoreService] Erreur deleteProduct Firestore:', err);
  }

  try {
    const localKey = `${LOCAL_PRODUCTS_PREFIX}${userId}`;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: ProductItem[] = JSON.parse(raw);
      const filtered = list.filter(p => p.id !== productId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch (_e) {}

  return true;
}

/**
 * Crée une commande directe (Option B) passée par un acheteur sur Dokya
 */
export async function createStoreOrder(orderData: {
  productId: string;
  productSlug?: string;
  productTitle: string;
  productPrice: number;
  productImage?: string;
  sellerId: string;
  sellerUsername: string;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  buyerNotes?: string;
  quantity?: number;
}): Promise<StoreOrder> {
  const shortId = Math.floor(100000 + Math.random() * 900000);
  const id = `CMD-${shortId}`;
  const now = new Date().toISOString();
  const quantity = Math.max(1, orderData.quantity || 1);
  const totalAmount = orderData.productPrice * quantity;

  const newOrder: StoreOrder = {
    id,
    productId: orderData.productId,
    productSlug: orderData.productSlug,
    productTitle: orderData.productTitle,
    productPrice: orderData.productPrice,
    productImage: orderData.productImage,
    sellerId: orderData.sellerId,
    sellerUsername: orderData.sellerUsername,
    buyerName: orderData.buyerName.trim(),
    buyerPhone: orderData.buyerPhone.trim(),
    buyerAddress: orderData.buyerAddress.trim(),
    buyerNotes: orderData.buyerNotes?.trim() || '',
    quantity,
    totalAmount,
    currency: 'FCFA',
    status: 'pending',
    createdAt: now,
    updatedAt: now
  };

  // 1. Sauvegarde dans Firestore
  try {
    const orderDocRef = doc(db, STORE_ORDERS_COLLECTION, id);
    await setDoc(orderDocRef, newOrder);

    // Incrémente le nombre de commandes du produit
    if (orderData.productId) {
      try {
        const prodRef = doc(db, PRODUCTS_COLLECTION, orderData.productId);
        await updateDoc(prodRef, { ordersCount: increment(1) });
      } catch (_e) {}
    }
  } catch (err) {
    console.warn('[StoreService] Erreur createStoreOrder Firestore:', err);
  }

  // 2. Sauvegarde cache local vendeur
  try {
    const localKey = `${LOCAL_ORDERS_PREFIX}${orderData.sellerId}`;
    const raw = localStorage.getItem(localKey);
    const existing: StoreOrder[] = raw ? JSON.parse(raw) : [];
    existing.unshift(newOrder);
    localStorage.setItem(localKey, JSON.stringify(existing));
  } catch (_e) {}

  return newOrder;
}

/**
 * Récupère toutes les commandes reçues par un vendeur
 */
export async function fetchSellerOrders(sellerId: string): Promise<StoreOrder[]> {
  if (!sellerId) return [];

  let orders: StoreOrder[] = [];

  try {
    const q = query(
      collection(db, STORE_ORDERS_COLLECTION),
      where('sellerId', '==', sellerId)
    );
    const snap = await getDocs(q);
    snap.forEach(d => {
      orders.push(d.data() as StoreOrder);
    });
  } catch (err) {
    console.warn('[StoreService] Erreur fetchSellerOrders Firestore:', err);
  }

  if (orders.length === 0) {
    try {
      const localKey = `${LOCAL_ORDERS_PREFIX}${sellerId}`;
      const raw = localStorage.getItem(localKey);
      if (raw) orders = JSON.parse(raw);
    } catch (_e) {}
  } else {
    try {
      const localKey = `${LOCAL_ORDERS_PREFIX}${sellerId}`;
      localStorage.setItem(localKey, JSON.stringify(orders));
    } catch (_e) {}
  }

  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Récupère une commande spécifique par son ID (Firestore ou Cache local)
 */
export async function fetchStoreOrderById(orderId: string): Promise<StoreOrder | null> {
  if (!orderId) return null;
  const cleanId = orderId.trim();

  // 1. Recherche directe dans Firestore par ID de document
  try {
    const docRef = doc(db, STORE_ORDERS_COLLECTION, cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as StoreOrder;
    }
  } catch (err) {
    console.warn('[StoreService] Erreur fetchStoreOrderById doc Firestore:', err);
  }

  // 2. Recherche par query champ "id" dans Firestore
  try {
    const q = query(
      collection(db, STORE_ORDERS_COLLECTION),
      where('id', '==', cleanId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as StoreOrder;
    }
  } catch (err) {
    console.warn('[StoreService] Erreur fetchStoreOrderById query Firestore:', err);
  }

  // 3. Fallback scan des commandes locales en cache
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_ORDERS_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: StoreOrder[] = JSON.parse(raw);
            const found = list.find(o => o.id === cleanId || o.id.toLowerCase() === cleanId.toLowerCase());
            if (found) return found;
          }
        }
      }
    }
  } catch (_e) {}

  return null;
}

/**
 * Met à jour le statut d'une commande (En attente, Validée, Livrée, Annulée)
 */
export async function updateStoreOrderStatus(
  orderId: string, 
  sellerId: string, 
  newStatus: StoreOrderStatus
): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    const orderDocRef = doc(db, STORE_ORDERS_COLLECTION, orderId);
    await updateDoc(orderDocRef, {
      status: newStatus,
      updatedAt: now
    });
  } catch (err) {
    console.warn('[StoreService] Erreur updateStoreOrderStatus Firestore:', err);
  }

  try {
    const localKey = `${LOCAL_ORDERS_PREFIX}${sellerId}`;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: StoreOrder[] = JSON.parse(raw);
      const target = list.find(o => o.id === orderId);
      if (target) {
        target.status = newStatus;
        target.updatedAt = now;
        localStorage.setItem(localKey, JSON.stringify(list));
      }
    }
  } catch (_e) {}

  return true;
}

/**
 * Récupère le profil boutique d'un vendeur et TOUS ses produits créés (par username ou userId)
 */
export async function fetchSellerStore(usernameOrUserId: string): Promise<{
  profile: SellerStoreProfile | null;
  products: ProductItem[];
}> {
  const cleanKey = slugify(usernameOrUserId || '');
  let profile: SellerStoreProfile | null = null;
  const productMap = new Map<string, ProductItem>();

  // 1. Recherche du profil de boutique dans Firestore
  try {
    // A. Recherche par username
    let q = query(
      collection(db, SELLER_STORES_COLLECTION),
      where('username', '==', cleanKey)
    );
    let snap = await getDocs(q);

    // B. Si pas trouvé, recherche par userId
    if (snap.empty) {
      q = query(
        collection(db, SELLER_STORES_COLLECTION),
        where('userId', '==', usernameOrUserId)
      );
      snap = await getDocs(q);
    }

    if (!snap.empty) {
      profile = snap.docs[0].data() as SellerStoreProfile;
    }
  } catch (err) {
    console.warn('[StoreService] Erreur fetchSellerStore profile:', err);
  }

  // 2. Fallback cache local pour le profil
  if (!profile) {
    try {
      const rawStore = localStorage.getItem(`${LOCAL_STORE_PREFIX}${cleanKey}`) || 
                        localStorage.getItem(`${LOCAL_STORE_PREFIX}${usernameOrUserId}`);
      if (rawStore) profile = JSON.parse(rawStore);
    } catch (_e) {}
  }

  const targetUserId = profile?.userId || (usernameOrUserId.length > 20 ? usernameOrUserId : '');

  // 3. Récupération des produits du vendeur dans Firestore
  // A. Requête directe par sellerUsername (crucial pour dokya.site/b/[username])
  try {
    const qByUsername = query(
      collection(db, PRODUCTS_COLLECTION),
      where('sellerUsername', '==', cleanKey)
    );
    const snapU = await getDocs(qByUsername);
    snapU.forEach(d => {
      const p = d.data() as ProductItem;
      if (p.status !== 'archived') {
        productMap.set(p.id, p);
      }
    });
  } catch (_e) {
    console.warn('[StoreService] Erreur query products by sellerUsername:', _e);
  }

  // B. Requête par userId si identifié
  if (targetUserId) {
    try {
      const qByUser = query(
        collection(db, PRODUCTS_COLLECTION),
        where('userId', '==', targetUserId)
      );
      const snapUser = await getDocs(qByUser);
      snapUser.forEach(d => {
        const p = d.data() as ProductItem;
        if (p.status !== 'archived') {
          productMap.set(p.id, p);
        }
      });
    } catch (_e) {
      console.warn('[StoreService] Erreur query products by userId:', _e);
    }
  }

  // C. Récupération large si aucun produit retourné
  if (productMap.size === 0) {
    try {
      const allProdsSnap = await getDocs(collection(db, PRODUCTS_COLLECTION));
      allProdsSnap.forEach(d => {
        const p = d.data() as ProductItem;
        const pUserSlug = slugify(p.sellerUsername || '');
        if (
          (pUserSlug && (pUserSlug === cleanKey || cleanKey.includes(pUserSlug) || pUserSlug.includes(cleanKey))) ||
          (targetUserId && p.userId === targetUserId)
        ) {
          if (p.status !== 'archived') {
            productMap.set(p.id, p);
          }
        }
      });
    } catch (_e) {}
  }

  // 4. Intégration du cache local (par username et par userId)
  try {
    const keysToCheck = [
      `${LOCAL_PRODUCTS_PREFIX}${cleanKey}`,
      `${LOCAL_PRODUCTS_PREFIX}${usernameOrUserId}`,
      ...(targetUserId ? [`${LOCAL_PRODUCTS_PREFIX}${targetUserId}`] : [])
    ];
    for (const key of keysToCheck) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const list: ProductItem[] = JSON.parse(raw);
        list.forEach(p => {
          if (p.status !== 'archived') {
            if (!productMap.has(p.id)) {
              productMap.set(p.id, p);
            }
          }
        });
      }
    }
  } catch (_e) {}

  let products = Array.from(productMap.values());

  // 5. Synthèse automatique du profil boutique si manquant
  if (!profile && products.length > 0) {
    const p0 = products[0];
    profile = {
      id: `store_${p0.userId}`,
      userId: p0.userId,
      username: cleanKey,
      storeName: p0.sellerName || `Boutique ${cleanKey}`,
      whatsappNumber: p0.sellerWhatsapp || p0.sellerPhone || '',
      phone: p0.sellerPhone || '',
      city: 'Dakar',
      country: 'Sénégal',
      tagline: 'Vendeur officiel Dokya',
      description: 'Découvrez tous mes produits, formations et services disponibles sur Dokya.',
      createdAt: p0.createdAt,
      updatedAt: p0.updatedAt
    };
  }

  // 6. Mise en cache local pour affichage instantané aux prochaines visites
  if (products.length > 0) {
    try {
      localStorage.setItem(`${LOCAL_PRODUCTS_PREFIX}${cleanKey}`, JSON.stringify(products));
      if (targetUserId) {
        localStorage.setItem(`${LOCAL_PRODUCTS_PREFIX}${targetUserId}`, JSON.stringify(products));
      }
    } catch (_e) {}
  }

  return {
    profile,
    products: products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  };
}

/**
 * Enregistre ou met à jour le profil de boutique du vendeur
 */
export async function saveSellerStoreProfile(
  userId: string, 
  data: Partial<SellerStoreProfile>
): Promise<SellerStoreProfile> {
  const storeId = `store_${userId}`;
  const now = new Date().toISOString();
  const username = slugify(data.username || data.storeName || 'boutique');

  const profile: SellerStoreProfile = {
    id: storeId,
    userId,
    username,
    storeName: data.storeName || 'Ma Boutique Dokya',
    tagline: data.tagline || 'Produits & Services certifiés',
    description: data.description || '',
    logoUrl: data.logoUrl || '',
    bannerUrl: data.bannerUrl || '',
    whatsappNumber: data.whatsappNumber || '',
    phone: data.phone || data.whatsappNumber || '',
    email: data.email || '',
    city: data.city || 'Dakar',
    country: data.country || 'Sénégal',
    createdAt: data.createdAt || now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, SELLER_STORES_COLLECTION, storeId), profile, { merge: true });
  } catch (err) {
    console.warn('[StoreService] Erreur saveSellerStoreProfile Firestore:', err);
  }

  try {
    localStorage.setItem(`${LOCAL_STORE_PREFIX}${userId}`, JSON.stringify(profile));
    localStorage.setItem(`${LOCAL_STORE_PREFIX}${username}`, JSON.stringify(profile));
  } catch (_e) {}

  return profile;
}

// ============================================================================
// MODULE TÉLÉVENDEURS & MARKETPLACE D'AFFILIATION
// ============================================================================

export const DEFAULT_MARKETPLACE_OFFERS: ProductItem[] = [
  {
    id: 'prod_mk_formation_ats',
    userId: 'seller_dokya_academy',
    sellerUsername: 'dokya-academy',
    sellerName: 'Dokya Academy Pro',
    sellerPhone: '+221 77 123 45 67',
    sellerWhatsapp: '+221 77 123 45 67',
    sellerEmail: 'academy@dokya.site',
    title: 'Programme Masterclass Recrutement & CV ATS 2026',
    slug: 'masterclass-recrutement-ats-2026',
    description: 'Formation complète en vidéo + templates certifiés pour réussir tous les entretiens et décrocher un emploi international ou local. Éligible commissions télévendeurs prioritaires.',
    price: 15000,
    currency: 'FCFA',
    category: 'Formations & Coaching',
    images: ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'],
    saleType: 'direct_order',
    status: 'active',
    viewsCount: 342,
    ordersCount: 48,
    commissionType: 'percent',
    commissionValue: 30, // 30% = 4 500 FCFA
    targetCountries: ['ALL'],
    isAffiliationEnabled: true,
    sellerRating: 4.9,
    sellerReviewsCount: 24,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_mk_pack_business',
    userId: 'seller_fatou_consulting',
    sellerUsername: 'fatou-consulting',
    sellerName: 'Fatou Ndiaye Consulting',
    sellerPhone: '+221 78 987 65 43',
    sellerWhatsapp: '+221 78 987 65 43',
    sellerEmail: 'fatou@consulting-sn.com',
    title: 'Kit Juridique & Modèles Contrats Commerciaux OHADA',
    slug: 'kit-juridique-contrats-ohada',
    description: '35 contrats types prêts à l\'emploi pour PME et indépendants (Prestations, Vente, NDA, Partenariats, Baux). Très demandé par les commerçants et entrepreneurs.',
    price: 25000,
    currency: 'FCFA',
    category: 'Juridique & Entreprise',
    images: ['https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80'],
    saleType: 'direct_order',
    status: 'active',
    viewsCount: 215,
    ordersCount: 29,
    commissionType: 'fixed',
    commissionValue: 6000, // 6 000 FCFA fixe
    targetCountries: ['SN', 'CI', 'CM', 'CG', 'BF', 'ML'],
    isAffiliationEnabled: true,
    sellerRating: 4.8,
    sellerReviewsCount: 18,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_mk_cosmetique_bio',
    userId: 'seller_abidjan_beaute',
    sellerUsername: 'abidjan-beaute-naturelle',
    sellerName: 'Kenza Cosmétiques Bio',
    sellerPhone: '+225 07 45 89 12 34',
    sellerWhatsapp: '+225 07 45 89 12 34',
    sellerEmail: 'contact@kenzacosmetics.ci',
    title: 'Gamme Sérum Éclat & Soin Peaux Noires 100% Naturel',
    slug: 'serum-eclat-naturel-peaux-noires',
    description: 'Pack de soins formulé à base d\'huiles précieuses africaines (Karité, Baobab, Moringa). Forte demande en Côte d\'Ivoire, Sénégal et Cameroun.',
    price: 18000,
    currency: 'FCFA',
    category: 'Santé & Beauté',
    images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80'],
    saleType: 'direct_order',
    status: 'active',
    viewsCount: 520,
    ordersCount: 82,
    commissionType: 'percent',
    commissionValue: 25, // 25% = 4 500 FCFA
    targetCountries: ['CI', 'SN', 'CM'],
    isAffiliationEnabled: true,
    sellerRating: 5.0,
    sellerReviewsCount: 31,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_mk_gadget_smart',
    userId: 'seller_tech_dakar',
    sellerUsername: 'tech-dakar-express',
    sellerName: 'Tech Dakar Express',
    sellerPhone: '+221 70 888 99 00',
    sellerWhatsapp: '+221 70 888 99 00',
    sellerEmail: 'sales@techdakar.sn',
    title: 'Montre Connectée Pro Santé & Sport Étanche GPS',
    slug: 'smartwatch-pro-sante-sport',
    description: 'Smartwatch multifonctions avec suivi cardiaque, sommeil, appels Bluetooth et autonomie 10 jours. Livraison rapide sur Dakar et sous-région.',
    price: 22000,
    currency: 'FCFA',
    category: 'High-Tech & Gadgets',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'],
    saleType: 'direct_order',
    status: 'active',
    viewsCount: 680,
    ordersCount: 95,
    commissionType: 'fixed',
    commissionValue: 5000, // 5 000 FCFA fixe
    targetCountries: ['SN', 'CI', 'CM', 'CG'],
    isAffiliationEnabled: true,
    sellerRating: 4.7,
    sellerReviewsCount: 14,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * Récupère toutes les offres marketplace disponibles pour les télévendeurs
 */
export async function fetchAllMarketplaceOffers(options?: {
  country?: string;
  category?: string;
  minCommission?: number;
  searchQuery?: string;
}): Promise<ProductItem[]> {
  const offersMap = new Map<string, ProductItem>();

  // 1. Charger les offres par défaut
  DEFAULT_MARKETPLACE_OFFERS.forEach(offer => {
    offersMap.set(offer.id, offer);
  });

  // 2. Récupérer les produits réels depuis Firestore
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    snap.forEach(d => {
      const p = d.data() as ProductItem;
      if (p.isAffiliationEnabled !== false) {
        offersMap.set(p.id, p);
      }
    });
  } catch (err) {
    console.warn('[StoreService] Erreur fetchAllMarketplaceOffers Firestore:', err);
  }

  // 3. Récupérer aussi depuis le cache local des vendeurs
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_PRODUCTS_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: ProductItem[] = JSON.parse(raw);
            list.forEach(p => {
              if (p.status === 'active' && p.isAffiliationEnabled !== false) {
                offersMap.set(p.id, p);
              }
            });
          }
        }
      }
    }
  } catch (_e) {}

  let list = Array.from(offersMap.values());

  // 4. Filtrage par pays
  if (options?.country && options.country !== 'ALL') {
    list = list.filter(p => {
      const targets = p.targetCountries || ['ALL'];
      return targets.includes('ALL') || targets.includes(options.country!);
    });
  }

  // 5. Filtrage par catégorie
  if (options?.category && options.category !== 'all') {
    list = list.filter(p => p.category?.toLowerCase() === options.category?.toLowerCase());
  }

  // 6. Filtrage par montant de commission minimum
  if (options?.minCommission && options.minCommission > 0) {
    list = list.filter(p => {
      const commissionAmount = p.commissionType === 'percent'
        ? (p.price * (p.commissionValue || 0)) / 100
        : (p.commissionValue || 0);
      return commissionAmount >= options.minCommission!;
    });
  }

  // 7. Recherche textuelle
  if (options?.searchQuery?.trim()) {
    const queryTerm = options.searchQuery.toLowerCase().trim();
    list = list.filter(p => 
      p.title.toLowerCase().includes(queryTerm) ||
      p.description.toLowerCase().includes(queryTerm) ||
      p.sellerName.toLowerCase().includes(queryTerm) ||
      (p.category && p.category.toLowerCase().includes(queryTerm))
    );
  }

  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Calcule la commission d'un télévendeur sur un produit (Standard 80% vs VIP 100%)
 */
export function calculateTelemarketerCommission(
  price: number,
  commissionType: 'percent' | 'fixed' = 'percent',
  commissionValue: number = 20,
  isVip: boolean = false
): {
  grossCommission: number;
  telemarketerNet: number;
  dokyaFee: number;
  ratePercent: number;
} {
  const safePrice = Number(price) || 0;
  const safeVal = Number(commissionValue) || 20;
  const grossCommission = commissionType === 'percent'
    ? Math.round((safePrice * safeVal) / 100)
    : Math.round(safeVal);

  const telemarketerNet = isVip
    ? grossCommission
    : Math.round(grossCommission * 0.8);

  const dokyaFee = Math.max(0, grossCommission - telemarketerNet);
  const ratePercent = isVip ? 100 : 80;

  return {
    grossCommission,
    telemarketerNet,
    dokyaFee,
    ratePercent
  };
}

/**
 * Permet au télévendeur d'enregistrer une commande client directement depuis son espace
 * Calcule automatiquement la commission brute et la commission nette selon le mode (Standard 20% Dokya vs VIP 100% conservé)
 * Envoie une notification instantanée au Vendeur propriétaire du produit
 */
export async function createTelemarketerOrder(params: {
  product: ProductItem;
  telemarketerId: string;
  telemarketerName: string;
  telemarketerPhone?: string;
  telemarketerEmail?: string;
  telemarketerMode?: 'standard' | 'vip';
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  buyerNotes?: string;
  quantity?: number;
  proofUrl?: string;
  proofNote?: string;
}): Promise<StoreOrder> {
  const shortId = Math.floor(100000 + Math.random() * 900000);
  const id = `CMD-TEL-${shortId}`;
  const now = new Date().toISOString();
  const quantity = Math.max(1, params.quantity || 1);
  const totalAmount = params.product.price * quantity;

  // Calcul commission
  const commissionType = params.product.commissionType || 'percent';
  const commissionValue = params.product.commissionValue || 20;
  const unitCommission = commissionType === 'percent'
    ? (params.product.price * commissionValue) / 100
    : commissionValue;
  const commissionGross = Math.round(unitCommission * quantity);

  // Mode Standard : Dokya prélève 20% -> Télévendeur reçoit 80%
  // Mode VIP : Dokya prélève 0% -> Télévendeur reçoit 100%
  const isVip = params.telemarketerMode === 'vip';
  const commissionRateDokya = isVip ? 0 : 20;
  const commissionNet = isVip 
    ? commissionGross 
    : Math.round(commissionGross * 0.8);

  const newOrder: StoreOrder = {
    id,
    productId: params.product.id,
    productSlug: params.product.slug,
    productTitle: params.product.title,
    productPrice: params.product.price,
    productImage: params.product.images?.[0] || '',
    sellerId: params.product.userId,
    sellerUsername: params.product.sellerUsername,
    buyerName: params.buyerName.trim(),
    buyerPhone: params.buyerPhone.trim(),
    buyerAddress: params.buyerAddress.trim(),
    buyerNotes: params.buyerNotes?.trim() || '',
    quantity,
    totalAmount,
    currency: params.product.currency || 'FCFA',
    status: 'pending',
    paymentMethod: 'telemarketer_cash_on_delivery',
    // Télévendeur tracking & commission
    telemarketerId: params.telemarketerId,
    telemarketerName: params.telemarketerName,
    telemarketerPhone: params.telemarketerPhone || '',
    telemarketerEmail: params.telemarketerEmail || '',
    commissionGross,
    commissionNet,
    commissionRateDokya,
    telemarketerMode: isVip ? 'vip' : 'standard',
    proofUrl: params.proofUrl || '',
    proofNote: params.proofNote || '',
    sourceType: 'telemarketer_offsite',
    createdAt: now,
    updatedAt: now
  };

  // 1. Sauvegarde Firestore
  try {
    const orderDocRef = doc(db, STORE_ORDERS_COLLECTION, id);
    await setDoc(orderDocRef, newOrder);

    // Incrémente commandes sur le produit
    if (params.product.id) {
      try {
        const prodRef = doc(db, PRODUCTS_COLLECTION, params.product.id);
        await updateDoc(prodRef, { ordersCount: increment(1) });
      } catch (_e) {}
    }
  } catch (err) {
    console.warn('[StoreService] Erreur createTelemarketerOrder Firestore:', err);
  }

  // 2. Sauvegarde cache local (Télévendeur & Vendeur)
  try {
    // Cache du télévendeur
    const telKey = `${LOCAL_TELEMARKETER_ORDERS_PREFIX}${params.telemarketerId}`;
    const rawTel = localStorage.getItem(telKey);
    const existingTel: StoreOrder[] = rawTel ? JSON.parse(rawTel) : [];
    existingTel.unshift(newOrder);
    localStorage.setItem(telKey, JSON.stringify(existingTel));

    // Cache du vendeur
    const selKey = `${LOCAL_ORDERS_PREFIX}${params.product.userId}`;
    const rawSel = localStorage.getItem(selKey);
    const existingSel: StoreOrder[] = rawSel ? JSON.parse(rawSel) : [];
    existingSel.unshift(newOrder);
    localStorage.setItem(selKey, JSON.stringify(existingSel));
  } catch (_e) {}

  // 3. Notification instantanée transmise au Vendeur propriétaire du produit
  try {
    if (params.product.userId) {
      await createNotification(params.product.userId, {
        title: `📦 Nouvelle commande apportée par un Télévendeur !`,
        message: `Le télévendeur ${params.telemarketerName} vient d'enregistrer une commande pour "${params.product.title}" : Client ${params.buyerName} (${params.buyerPhone}), ${params.buyerAddress}. Commission à verser : ${commissionGross.toLocaleString('fr-FR')} FCFA.`,
        type: 'order',
        read: false,
        tabTarget: 'store'
      });
    }
  } catch (_e) {
    console.warn('[StoreService] Erreur envoi notification vendeur:', _e);
  }

  return newOrder;
}

/**
 * Récupère l'historique des commandes apportées par un télévendeur
 */
export async function fetchTelemarketerOrders(telemarketerId: string): Promise<StoreOrder[]> {
  if (!telemarketerId) return [];

  let orders: StoreOrder[] = [];

  // Firestore
  try {
    const q = query(
      collection(db, STORE_ORDERS_COLLECTION),
      where('telemarketerId', '==', telemarketerId)
    );
    const snap = await getDocs(q);
    snap.forEach(d => {
      orders.push(d.data() as StoreOrder);
    });
  } catch (err) {
    console.warn('[StoreService] Erreur fetchTelemarketerOrders Firestore:', err);
  }

  // Fallback local
  if (orders.length === 0) {
    try {
      const localKey = `${LOCAL_TELEMARKETER_ORDERS_PREFIX}${telemarketerId}`;
      const raw = localStorage.getItem(localKey);
      if (raw) orders = JSON.parse(raw);
    } catch (_e) {}
  } else {
    try {
      const localKey = `${LOCAL_TELEMARKETER_ORDERS_PREFIX}${telemarketerId}`;
      localStorage.setItem(localKey, JSON.stringify(orders));
    } catch (_e) {}
  }

  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Sauvegarde un avis / note public laissé par un télévendeur sur un vendeur
 */
export async function saveSellerReview(review: Omit<SellerReview, 'id' | 'createdAt'>): Promise<SellerReview> {
  const id = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newReview: SellerReview = {
    ...review,
    id,
    createdAt: now
  };

  try {
    const docRef = doc(db, SELLER_REVIEWS_COLLECTION, id);
    await setDoc(docRef, newReview);
  } catch (err) {
    console.warn('[StoreService] Erreur saveSellerReview Firestore:', err);
  }

  try {
    const localKey = `${LOCAL_REVIEWS_PREFIX}${review.sellerId}`;
    const raw = localStorage.getItem(localKey);
    const existing: SellerReview[] = raw ? JSON.parse(raw) : [];
    existing.unshift(newReview);
    localStorage.setItem(localKey, JSON.stringify(existing));
  } catch (_e) {}

  return newReview;
}

/**
 * Récupère les avis publics sur un vendeur (ou tous les avis si aucun sellerId n'est fourni)
 */
export async function fetchSellerReviews(sellerId?: string): Promise<SellerReview[]> {
  let reviews: SellerReview[] = [];

  try {
    let q;
    if (sellerId) {
      q = query(
        collection(db, SELLER_REVIEWS_COLLECTION),
        where('sellerId', '==', sellerId)
      );
    } else {
      q = query(collection(db, SELLER_REVIEWS_COLLECTION));
    }
    const snap = await getDocs(q);
    snap.forEach(d => {
      reviews.push(d.data() as SellerReview);
    });
  } catch (err) {
    console.warn('[StoreService] Erreur fetchSellerReviews Firestore:', err);
  }

  if (reviews.length === 0) {
    try {
      if (sellerId) {
        const localKey = `${LOCAL_REVIEWS_PREFIX}${sellerId}`;
        const raw = localStorage.getItem(localKey);
        if (raw) reviews = JSON.parse(raw);
      } else {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(LOCAL_REVIEWS_PREFIX)) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) reviews.push(...parsed);
            }
          }
        }
      }
    } catch (_e) {}
  }

  return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

