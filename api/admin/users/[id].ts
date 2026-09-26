/**
 * API Route Dynamique: /api/admin/users/[id]
 * Gestion administrative directe par identifiant utilisateur (DELETE, PATCH, PUT, GET)
 * Compatible Next.js App Router, Pages Router & Vercel Serverless
 */

import admin, { db } from '../../../lib/firebaseAdmin';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-email, x-admin-key, x-user-role'
};

// Helper pour extraire l'ID utilisateur
function extractUserId(req: any, context?: any): string {
  if (context?.params?.id) return context.params.id;
  if (req?.query?.id) return req.query.id;
  if (req?.params?.id) return req.params.id;

  if (typeof req?.url === 'string') {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const segments = parsed.pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && lastSegment !== 'users' && lastSegment !== '[id]') {
        return decodeURIComponent(lastSegment);
      }
      const queryId = parsed.searchParams.get('id') || parsed.searchParams.get('userId') || parsed.searchParams.get('targetUserId');
      if (queryId) return queryId;
    } catch {}
  }
  return '';
}

// 1. DELETE: Supprimer un compte (Firebase Auth + Firestore)
export async function DELETE(req: Request | any, context?: any): Promise<Response> {
  try {
    const userId = extractUserId(req, context);

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Identifiant utilisateur manquant pour la suppression.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (userId === 'peter25ngouala@gmail.com') {
      return new Response(
        JSON.stringify({ success: false, error: 'Impossible de supprimer le compte Super Administrateur.' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // A) Supprimer l'utilisateur d'Authentication avec le SDK Admin
    if ((admin as any)?.auth && typeof (admin as any).auth === 'function') {
      try {
        await (admin as any).auth().deleteUser(userId);
        console.log(`[Admin API /users/[id] DELETE] Utilisateur ${userId} supprimé de Firebase Auth`);
      } catch (authErr: any) {
        console.warn(`[Admin Auth Warning for ${userId}]:`, authErr?.message || authErr);
      }
    }

    // B) Supprimer le document correspondant dans la collection Firestore
    try {
      await db.collection('users').doc(userId).delete();
      console.log(`[Admin API /users/[id] DELETE] Document Firestore users/${userId} supprimé`);
    } catch (fsErr: any) {
      console.error(`[Admin Firestore DELETE Error for ${userId}]:`, fsErr);
      throw fsErr;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Utilisateur supprimé' }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[Admin DELETE /users/[id] Error]:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Erreur lors de la suppression de l\'utilisateur.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// 2. PATCH / PUT: Mettre à jour le profil, rôle ou statut dans Firestore
export async function PATCH(req: Request | any, context?: any): Promise<Response> {
  return handleUpdateUser(req, context);
}

export async function PUT(req: Request | any, context?: any): Promise<Response> {
  return handleUpdateUser(req, context);
}

async function handleUpdateUser(req: Request | any, context?: any): Promise<Response> {
  try {
    const userId = extractUserId(req, context);

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Identifiant utilisateur manquant pour la modification.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let bodyData: any = {};
    if (typeof req.json === 'function') {
      try {
        bodyData = await req.json();
      } catch {
        bodyData = {};
      }
    } else if (req.body) {
      bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    // Préparer les données à mettre à jour
    const updatePayload: Record<string, any> = {
      ...bodyData,
      updatedAt: new Date().toISOString()
    };

    // Nettoyer les champs d'identification pour éviter les collisions
    delete updatePayload.id;
    delete updatePayload.uid;
    delete updatePayload.adminEmail;

    // Normaliser rôle et statut si fournis
    if (updatePayload.status) {
      updatePayload.status = (updatePayload.status === 'actif' || updatePayload.status === 'active') ? 'active' :
                             (updatePayload.status === 'suspendu' || updatePayload.status === 'suspended') ? 'suspended' : updatePayload.status;
    }
    if (updatePayload.role) {
      updatePayload.role = updatePayload.role === 'admin' ? 'admin' : (updatePayload.role === 'user' ? 'candidate' : updatePayload.role);
    }

    // Effectuer la mise à jour Firestore
    try {
      await db.collection('users').doc(userId).update(updatePayload);
    } catch (updateErr: any) {
      // Si le document n'existe pas encore, utiliser set avec merge
      await db.collection('users').doc(userId).set(updatePayload, { merge: true });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Profil utilisateur mis à jour', data: updatePayload }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[Admin PATCH/PUT /users/[id] Error]:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Erreur lors de la mise à jour du profil.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// 3. GET: Consulter un utilisateur par son identifiant
export async function GET(req: Request | any, context?: any): Promise<Response> {
  try {
    const userId = extractUserId(req, context);
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Identifiant utilisateur manquant.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const docSnap = await db.collection('users').doc(userId).get();
    if (!docSnap.exists) {
      return new Response(
        JSON.stringify({ success: false, error: 'Utilisateur introuvable.' }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user: { uid: docSnap.id, id: docSnap.id, ...docSnap.data() } }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Erreur récupération utilisateur.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// 4. OPTIONS: Préflight CORS
export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// 5. Default Handler Node/Express/Pages Router
export default async function handler(req: any, res?: any) {
  if (!res || typeof res.status !== 'function') {
    if (req.method === 'DELETE') return DELETE(req);
    if (req.method === 'PUT') return PUT(req);
    if (req.method === 'PATCH') return PATCH(req);
    if (req.method === 'OPTIONS') return OPTIONS();
    return GET(req);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-email, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const userId = extractUserId(req);
  if (!userId) {
    return res.status(400).json({ success: false, error: 'Identifiant utilisateur manquant.' });
  }

  try {
    if (req.method === 'DELETE') {
      if (userId === 'peter25ngouala@gmail.com') {
        return res.status(403).json({ success: false, error: 'Impossible de supprimer le Super Admin.' });
      }

      if ((admin as any)?.auth && typeof (admin as any).auth === 'function') {
        try {
          await (admin as any).auth().deleteUser(userId);
        } catch (authErr: any) {
          console.warn('[Admin Auth Warn]:', authErr?.message);
        }
      }

      await db.collection('users').doc(userId).delete();
      return res.status(200).json({ success: true, message: 'Utilisateur supprimé' });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const updateData = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      updateData.updatedAt = new Date().toISOString();

      try {
        await db.collection('users').doc(userId).update(updateData);
      } catch {
        await db.collection('users').doc(userId).set(updateData, { merge: true });
      }

      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
      const docSnap = await db.collection('users').doc(userId).get();
      if (!docSnap.exists) {
        return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
      }
      return res.status(200).json({ success: true, user: { uid: docSnap.id, ...docSnap.data() } });
    }

    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  } catch (err: any) {
    console.error('[api/admin/users/[id] Handler Error]:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Erreur interne' });
  }
}
