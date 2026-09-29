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

  // 2. Sauvegarde Cache Local
  try {
    const localKey = `${LOCAL_PRODUCTS_PREFIX}${product.userId}`;
    const raw = localStorage.getItem(localKey);
    const existing: ProductItem[] = raw ? JSON.parse(raw) : [];
    const index = existing.findIndex(p => p.id === id);
    if (index >= 0) {
      existing[index] = completeProduct;
    } else {
      existing.unshift(completeProduct);
    }
    localStorage.setItem(localKey, JSON.stringify(existing));
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
 * Récupère le profil boutique d'un vendeur ou par son nom d'utilisateur
 */
export async function fetchSellerStore(usernameOrUserId: string): Promise<{
  profile: SellerStoreProfile | null;
  products: ProductItem[];
}> {
  const cleanKey = slugify(usernameOrUserId);
  let profile: SellerStoreProfile | null = null;
  let products: ProductItem[] = [];

  try {
    // Recherche par username
    let q = query(
      collection(db, SELLER_STORES_COLLECTION),
      where('username', '==', cleanKey)
    );
    let snap = await getDocs(q);

    // Si pas trouvé, recherche par userId
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

  // Récupérer les produits du vendeur
  const targetUserId = profile?.userId || usernameOrUserId;
  try {
    const qProd = query(
      collection(db, PRODUCTS_COLLECTION),
      where('userId', '==', targetUserId),
      where('status', '==', 'active')
    );
    const snapProd = await getDocs(qProd);
    snapProd.forEach(d => products.push(d.data() as ProductItem));
  } catch (err) {
    // Si la requête composée échoue, query simple
    try {
      const qSimple = query(
        collection(db, PRODUCTS_COLLECTION),
        where('userId', '==', targetUserId)
      );
      const snapSimple = await getDocs(qSimple);
      snapSimple.forEach(d => {
        const p = d.data() as ProductItem;
        if (p.status === 'active') products.push(p);
      });
    } catch (_e) {}
  }

  // Fallback cache local si vide
  if (!profile) {
    try {
      const rawStore = localStorage.getItem(`${LOCAL_STORE_PREFIX}${usernameOrUserId}`);
      if (rawStore) profile = JSON.parse(rawStore);
    } catch (_e) {}
  }

  if (products.length === 0) {
    try {
      const rawProds = localStorage.getItem(`${LOCAL_PRODUCTS_PREFIX}${targetUserId}`);
      if (rawProds) {
        const all: ProductItem[] = JSON.parse(rawProds);
        products = all.filter(p => p.status === 'active');
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
