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
  
  const rawImage = (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) || 
                   product.imageUrl || 
                   (product as any).image || 
                   'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';

  const completeProduct: ProductItem = {
    id,
    userId: product.userId,
    sellerId: product.userId,
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
      : [rawImage],
    imageUrl: rawImage,
    saleType: product.saleType || 'direct_order',
    redirectUrl: product.redirectUrl || '',
    enableDirectOrder: product.saleType === 'direct_order' ? true : (product.enableDirectOrder ?? false),
    status: product.status || 'active',
    product_type: product.product_type || (product as any).productType || (product.category === 'Produits Physiques' ? 'physical' : 'digital'),
    productType: product.product_type || (product as any).productType || (product.category === 'Produits Physiques' ? 'physical' : 'digital'),
    digitalFiles: product.digitalFiles || [],
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
    if (userId) {
      const localKey = `${LOCAL_PRODUCTS_PREFIX}${userId}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const list: ProductItem[] = JSON.parse(raw);
        const filtered = list.filter(p => p.id !== productId);
        localStorage.setItem(localKey, JSON.stringify(filtered));
      }
    }
    // Also sweep any other local storage keys matching LOCAL_PRODUCTS_PREFIX
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_PRODUCTS_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const list: ProductItem[] = JSON.parse(raw);
            if (Array.isArray(list)) {
              const filtered = list.filter(p => p.id !== productId);
              localStorage.setItem(key, JSON.stringify(filtered));
            }
          } catch (_e) {}
        }
      }
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

export const DEFAULT_MARKETPLACE_OFFERS: ProductItem[] = [];

/**
 * Nettoie en profondeur les caches locaux de fausses offres ou données de test
 */
export function purgeLocalMockProducts(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key && (
          key === 'dokya_marketplace_offers' ||
          key.startsWith('mock_') ||
          key.includes('fake_offers')
        )
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (_e) {}
}

/**
 * Récupère toutes les offres marketplace disponibles pour les télévendeurs
 * Strictement vierge par défaut : uniquement les produits réels actifs publiés dans Firestore ou en cache local
 */
export async function fetchAllMarketplaceOffers(options?: {
  country?: string;
  category?: string;
  minCommission?: number;
  searchQuery?: string;
}): Promise<ProductItem[]> {
  const offersMap = new Map<string, ProductItem>();

  const normalizeOffer = (p: ProductItem): ProductItem => {
    const effectiveSellerId = p.sellerId || p.userId || '';
    const rawImage = (Array.isArray(p.images) && p.images.length > 0 && p.images[0]) || 
                     p.imageUrl || 
                     (p as any).image || 
                     (p as any).productImage ||
                     'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';
    return {
      ...p,
      sellerId: effectiveSellerId,
      imageUrl: rawImage,
      images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [rawImage]
    };
  };

  // 1. Récupérer uniquement les produits réels actifs depuis Firestore
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    snap.forEach(d => {
      const p = d.data() as ProductItem;
      if (p && p.id && p.isAffiliationEnabled !== false) {
        offersMap.set(p.id, normalizeOffer(p));
      }
    });
  } catch (err) {
    console.warn('[StoreService] Erreur fetchAllMarketplaceOffers Firestore:', err);
  }

  // 2. Récupérer également les produits réels actifs créés localement
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(LOCAL_PRODUCTS_PREFIX) || key.startsWith('dokya_seller_products_'))) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: ProductItem[] = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach(p => {
                if (p && p.id && p.status === 'active' && p.isAffiliationEnabled !== false) {
                  if (!offersMap.has(p.id)) {
                    offersMap.set(p.id, normalizeOffer(p));
                  }
                }
              });
            }
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

  const effectiveSellerId = review.sellerId || (review as any).userId || 'seller_default';
  const effectiveSellerName = review.sellerName || review.sellerUsername || 'Vendeur';
  const effectiveSellerUsername = review.sellerUsername || slugify(effectiveSellerName);

  const newReview: SellerReview = {
    ...review,
    id,
    sellerId: effectiveSellerId,
    sellerName: effectiveSellerName,
    sellerUsername: effectiveSellerUsername,
    createdAt: now
  };

  try {
    const docRef = doc(db, SELLER_REVIEWS_COLLECTION, id);
    await setDoc(docRef, newReview);
  } catch (err) {
    console.warn('[StoreService] Erreur saveSellerReview Firestore:', err);
  }

  try {
    if (typeof localStorage !== 'undefined') {
      // 1. Sauvegarde par sellerId
      const localKey = `${LOCAL_REVIEWS_PREFIX}${effectiveSellerId}`;
      const raw = localStorage.getItem(localKey);
      const existing: SellerReview[] = raw ? JSON.parse(raw) : [];
      existing.unshift(newReview);
      localStorage.setItem(localKey, JSON.stringify(existing));

      // 2. Sauvegarde globale pour affichage instantané dans tous les onglets
      const globalKey = 'dokya_all_seller_reviews';
      const globalRaw = localStorage.getItem(globalKey);
      const globalExisting: SellerReview[] = globalRaw ? JSON.parse(globalRaw) : [];
      globalExisting.unshift(newReview);
      localStorage.setItem(globalKey, JSON.stringify(globalExisting));
    }
  } catch (_e) {}

  return newReview;
}

/**
 * Récupère les avis publics sur un vendeur (ou tous les avis si aucun sellerId n'est fourni)
 */
export async function fetchSellerReviews(sellerId?: string): Promise<SellerReview[]> {
  const reviewsMap = new Map<string, SellerReview>();

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
      const r = d.data() as SellerReview;
      if (r && r.id) {
        reviewsMap.set(r.id, r);
      }
    });
  } catch (err) {
    console.warn('[StoreService] Erreur fetchSellerReviews Firestore:', err);
  }

  // Fusion proactive avec les avis sauvegardés en local
  try {
    if (typeof localStorage !== 'undefined') {
      if (sellerId) {
        const localKey = `${LOCAL_REVIEWS_PREFIX}${sellerId}`;
        const raw = localStorage.getItem(localKey);
        if (raw) {
          const list: SellerReview[] = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach(r => {
              if (r && r.id && !reviewsMap.has(r.id)) reviewsMap.set(r.id, r);
            });
          }
        }
      } else {
        const globalKey = 'dokya_all_seller_reviews';
        const globalRaw = localStorage.getItem(globalKey);
        if (globalRaw) {
          const globalList: SellerReview[] = JSON.parse(globalRaw);
          if (Array.isArray(globalList)) {
            globalList.forEach(r => {
              if (r && r.id && !reviewsMap.has(r.id)) reviewsMap.set(r.id, r);
            });
          }
        }

        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(LOCAL_REVIEWS_PREFIX)) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                parsed.forEach(r => {
                  if (r && r.id && !reviewsMap.has(r.id)) reviewsMap.set(r.id, r);
                });
              }
            }
          }
        }
      }
    }
  } catch (_e) {}

  const reviews = Array.from(reviewsMap.values());
  return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

