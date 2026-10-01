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
import { ProductItem, StoreOrder, SellerStoreProfile, StoreOrderStatus } from '../types';

const PRODUCTS_COLLECTION = 'products';
const STORE_ORDERS_COLLECTION = 'store_orders';
const SELLER_STORES_COLLECTION = 'seller_stores';

const LOCAL_PRODUCTS_PREFIX = 'dokya_seller_products_';
const LOCAL_ORDERS_PREFIX = 'dokya_seller_orders_';
const LOCAL_STORE_PREFIX = 'dokya_seller_store_';

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
