/**
 * API Route: /api/admin/users
 * Administration Dokya - Suppression, Modification, Ajustement et Contrôle des Utilisateurs
 * Compatible Vercel Serverless Function & Next.js App Router / Express
 */

import admin, { db } from '../../app/lib/firebaseAdmin';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-email, x-admin-key'
};

// 1. GET: Lister les utilisateurs depuis Firestore
export async function GET(req?: Request): Promise<Response> {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users: any[] = [];
    usersSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      users.push({
        uid: docSnap.id,
        id: docSnap.id,
        email: data.email || `${docSnap.id}@user.senegalcv.sn`,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
        city: data.city || '',
        targetJob: data.targetJob || '',
        walletBalance: Number(data.walletBalance ?? data.balance ?? 0),
        balance: Number(data.walletBalance ?? data.balance ?? 0),
        role: data.role || 'candidate',
        status: data.status || 'active',
        subscriptionStatus: data.subscriptionStatus || 'free',
        hasForceUnlockedDocs: Boolean(data.hasForceUnlockedDocs),
        documentsCount: Number(data.documentsCount || 0),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      });
    });

    return new Response(
      JSON.stringify({
        success: true,
        users,
        total: users.length,
        message: 'Liste des utilisateurs récupérée avec succès'
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[API Admin Users GET Error]:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erreur lors de la récupération des utilisateurs' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// 2. DELETE: Supprimer un utilisateur du registre Auth et du document principal Firestore
export async function DELETE(req: Request): Promise<Response> {
  try {
    let targetUserId = '';

    // Essayer d'extraire depuis l'URL (ex: /api/admin/users?id=xxx ou ?userId=xxx)
    if (req.url) {
      try {
        const urlObj = new URL(req.url, 'http://localhost');
        targetUserId = urlObj.searchParams.get('targetUserId') || urlObj.searchParams.get('userId') || urlObj.searchParams.get('id') || '';
      } catch (e) {
        // Ignorer l'erreur d'URL
      }
    }

    // Si pas trouvé dans l'URL, lire depuis le body JSON
    if (!targetUserId) {
      try {
        const body = await req.json();
        targetUserId = body?.targetUserId || body?.userId || body?.id || '';
      } catch (e) {
        // Ignorer si pas de body
      }
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'L\'identifiant de l\'utilisateur (targetUserId) est requis pour la suppression.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 1. Supprimer l'utilisateur du registre Auth Firebase
    if ((admin as any)?.auth && typeof (admin as any).auth === 'function') {
      try {
        await (admin as any).auth().deleteUser(targetUserId);
        console.log(`[Admin DELETE] Utilisateur ${targetUserId} supprimé d'Auth avec succès`);
      } catch (authErr: any) {
        // Log d'avertissement mais on continue la suppression Firestore
        console.warn(`[Admin DELETE Auth Warning for ${targetUserId}]:`, authErr?.message || authErr);
      }
    }

    // 2. Supprimer son document principal dans Firestore
    try {
      await db.collection('users').doc(targetUserId).delete();
      console.log(`[Admin DELETE] Document Firestore users/${targetUserId} supprimé avec succès`);
    } catch (fsErr: any) {
      console.error(`[Admin DELETE Firestore Error for ${targetUserId}]:`, fsErr);
      throw fsErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Utilisateur supprimé'
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[Admin DELETE Users Error]:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Erreur lors de la suppression de l\'utilisateur'
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// 3. PUT / PATCH: Modification profil, statut ('actif', 'suspendu') et rôle ('user', 'admin') dans Firestore
export async function PUT(req: Request): Promise<Response> {
  return handleUpdateUser(req);
}

export async function PATCH(req: Request): Promise<Response> {
  return handleUpdateUser(req);
}

async function handleUpdateUser(req: Request): Promise<Response> {
  try {
    let targetUserId = '';
    let body: any = {};

    try {
      body = await req.json();
      targetUserId = body?.targetUserId || body?.userId || body?.id || body?.uid || '';
    } catch (e) {
      body = {};
    }

    if (!targetUserId && req.url) {
      try {
        const urlObj = new URL(req.url, 'http://localhost');
        targetUserId = urlObj.searchParams.get('targetUserId') || urlObj.searchParams.get('userId') || urlObj.searchParams.get('id') || '';
      } catch (e) {
        // URL parse fallback
      }
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'L\'identifiant utilisateur (targetUserId) est requis.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const {
      status,
      role,
      firstName,
      lastName,
      phone,
      city,
      targetJob,
      walletBalance,
      balance,
      subscriptionStatus,
      hasForceUnlockedDocs,
      suspendedReason
    } = body;

    const firestoreUpdate: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    // Statut ('actif', 'suspendu' / 'active', 'suspended')
    if (status !== undefined) {
      if (status === 'actif' || status === 'active') {
        firestoreUpdate.status = 'active';
        firestoreUpdate.suspendedReason = null;
      } else if (status === 'suspendu' || status === 'suspended') {
        firestoreUpdate.status = 'suspended';
        if (suspendedReason) firestoreUpdate.suspendedReason = suspendedReason;
      } else {
        firestoreUpdate.status = status;
      }
    }

    // Rôle ('user', 'admin', 'candidate')
    if (role !== undefined) {
      if (role === 'admin') {
        firestoreUpdate.role = 'admin';
      } else if (role === 'user' || role === 'candidate') {
        firestoreUpdate.role = 'candidate';
      } else {
        firestoreUpdate.role = role;
      }
    }

    if (firstName !== undefined) firestoreUpdate.firstName = firstName;
    if (lastName !== undefined) firestoreUpdate.lastName = lastName;
    if (phone !== undefined) firestoreUpdate.phone = phone;
    if (city !== undefined) firestoreUpdate.city = city;
    if (targetJob !== undefined) firestoreUpdate.targetJob = targetJob;
    if (subscriptionStatus !== undefined) firestoreUpdate.subscriptionStatus = subscriptionStatus;
    if (hasForceUnlockedDocs !== undefined) firestoreUpdate.hasForceUnlockedDocs = Boolean(hasForceUnlockedDocs);

    // Ajustement du solde
    const newBal = walletBalance !== undefined ? walletBalance : balance;
    if (newBal !== undefined && !isNaN(Number(newBal))) {
      firestoreUpdate.walletBalance = Number(newBal);
      firestoreUpdate.balance = Number(newBal);
    }

    // Mise à jour atomique dans Firestore
    await db.collection('users').doc(targetUserId).set(firestoreUpdate, { merge: true });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profil utilisateur mis à jour avec succès',
        targetUserId,
        updatedFields: firestoreUpdate
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[Admin PUT/PATCH Users Error]:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Erreur lors de la modification de l\'utilisateur'
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// 4. POST: Compatibilité action universelle
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || body.method;

    if (action === 'DELETE' || action === 'delete') {
      return DELETE(new Request(req.url, { method: 'DELETE', body: JSON.stringify(body) }));
    }

    if (action === 'UPDATE' || action === 'update' || action === 'PUT' || action === 'PATCH') {
      return handleUpdateUser(new Request(req.url, { method: 'PUT', body: JSON.stringify(body) }));
    }

    // Ajuster solde
    if (action === 'adjust_wallet' || action === 'adjust_balance') {
      const targetUserId = body.targetUserId || body.userId;
      const amount = Number(body.amount);
      const type = body.type || 'credit';

      if (!targetUserId || isNaN(amount) || amount <= 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Paramètres d\'ajustement de solde invalides.' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const userDoc = await db.collection('users').doc(targetUserId).get();
      const currentBal = Number(userDoc.exists ? (userDoc.data()?.walletBalance ?? userDoc.data()?.balance ?? 0) : 0);
      const newBalance = type === 'credit' ? currentBal + amount : Math.max(0, currentBal - amount);

      await db.collection('users').doc(targetUserId).update({
        walletBalance: newBalance,
        balance: newBalance,
        updatedAt: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({
          success: true,
          newBalance,
          message: `Solde ajusté avec succès : ${newBalance} FCFA`
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    return handleUpdateUser(req);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erreur requête POST' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// 5. Default Handler pour Node/Express/Next.js Pages router
export default async function handler(req: any, res?: any) {
  if (!res || typeof res.status !== 'function') {
    if (req.method === 'DELETE') return DELETE(req);
    if (req.method === 'PUT' || req.method === 'PATCH') return handleUpdateUser(req);
    if (req.method === 'POST') return POST(req);
    return GET(req);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-email, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'DELETE') {
      const targetUserId = req.query?.targetUserId || req.query?.userId || req.query?.id || req.body?.targetUserId || req.body?.userId || req.body?.id;
      if (!targetUserId) {
        return res.status(400).json({ success: false, error: 'targetUserId manquant pour la suppression' });
      }

      if ((admin as any)?.auth && typeof (admin as any).auth === 'function') {
        try {
          await (admin as any).auth().deleteUser(targetUserId);
        } catch (authErr: any) {
          console.warn('[handler Admin Auth deleteUser warn]:', authErr?.message);
        }
      }
      await db.collection('users').doc(targetUserId).delete();
      return res.status(200).json({ success: true, message: 'Utilisateur supprimé' });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const targetUserId = req.query?.targetUserId || req.query?.userId || req.query?.id || req.body?.targetUserId || req.body?.userId || req.body?.id;
      if (!targetUserId) {
        return res.status(400).json({ success: false, error: 'targetUserId manquant' });
      }

      const { status, role, firstName, lastName, phone, city, targetJob, walletBalance, balance } = req.body || {};
      const firestoreUpdate: any = { updatedAt: new Date().toISOString() };

      if (status !== undefined) {
        firestoreUpdate.status = (status === 'actif' || status === 'active') ? 'active' : ((status === 'suspendu' || status === 'suspended') ? 'suspended' : status);
      }
      if (role !== undefined) {
        firestoreUpdate.role = role === 'admin' ? 'admin' : (role === 'user' ? 'candidate' : role);
      }
      if (firstName !== undefined) firestoreUpdate.firstName = firstName;
      if (lastName !== undefined) firestoreUpdate.lastName = lastName;
      if (phone !== undefined) firestoreUpdate.phone = phone;
      if (city !== undefined) firestoreUpdate.city = city;
      if (targetJob !== undefined) firestoreUpdate.targetJob = targetJob;
      const b = walletBalance !== undefined ? walletBalance : balance;
      if (b !== undefined && !isNaN(Number(b))) {
        firestoreUpdate.walletBalance = Number(b);
        firestoreUpdate.balance = Number(b);
      }

      await db.collection('users').doc(targetUserId).set(firestoreUpdate, { merge: true });
      return res.status(200).json({ success: true, message: 'Profil mis à jour', data: firestoreUpdate });
    }

    return res.status(200).json({ success: true, message: 'Route utilisateurs active' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erreur interne' });
  }
}
