import { AdminUserRecord, ImpersonatedSession } from '../types';

const IMPERSONATION_STORAGE_KEY = 'senegal_cv_impersonated_session';

export function getImpersonatedSession(): ImpersonatedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ImpersonatedSession;
  } catch (e) {
    console.error('Failed to parse impersonation session:', e);
    return null;
  }
}

export function startImpersonationSession(targetUser: AdminUserRecord, adminEmail: string, currentPath = '#editor'): ImpersonatedSession {
  const session: ImpersonatedSession = {
    adminEmail,
    targetUser,
    startedAt: new Date().toISOString(),
    originalPath: currentPath
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(session));
    // Also inject user profile cache for Candidate components
    localStorage.setItem('senegal_cv_user_profile', JSON.stringify({
      uid: targetUser.uid,
      email: targetUser.email,
      displayName: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      phone: targetUser.phone,
      city: targetUser.city,
      targetJob: targetUser.targetJob,
      balance: targetUser.balance,
      credits: targetUser.credits,
      subscriptionStatus: targetUser.subscriptionStatus,
      isImpersonated: true,
      hasForceUnlockedDocs: targetUser.hasForceUnlockedDocs
    }));
    window.dispatchEvent(new CustomEvent('impersonation-changed', { detail: session }));
  }
  return session;
}

export function stopImpersonationSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    localStorage.removeItem('senegal_cv_user_profile');
    window.dispatchEvent(new CustomEvent('impersonation-changed', { detail: null }));
  }
}

export function isImpersonating(): boolean {
  return !!getImpersonatedSession();
}
