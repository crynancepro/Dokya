import { auth } from '../../lib/firebase.js';

export const PRIMARY_ADMIN_EMAIL = 'peter25ngouala@gmail.com';

// List of authorized admin emails (sole primary administrator)
export const AUTHORIZED_ADMIN_EMAILS = [
  'peter25ngouala@gmail.com'
];

export const getLocalProfileKey = (uid) => `dokya_user_profile_${uid || (auth && auth.currentUser ? auth.currentUser.uid : 'guest')}`;

/**
 * Checks if a given email belongs to the administrator group.
 */
export function isAdminEmail(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return AUTHORIZED_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalized);
}

/**
 * Checks if the current Firebase user or stored user is an administrator.
 */
export function isCurrentUserAdmin(customUser) {
  const targetEmail = customUser?.email || auth?.currentUser?.email;
  if (targetEmail && isAdminEmail(targetEmail)) {
    return true;
  }
  // Check local profile cache if available
  try {
    const currentUid = customUser?.uid || auth?.currentUser?.uid;
    const localProfile = (currentUid && typeof localStorage !== 'undefined' ? localStorage.getItem(getLocalProfileKey(currentUid)) : null) || (typeof localStorage !== 'undefined' ? localStorage.getItem('senegal_cv_user_profile') : null);
    if (localProfile) {
      const parsed = JSON.parse(localProfile);
      if (parsed.email && isAdminEmail(parsed.email)) return true;
      if (parsed.role === 'admin' || parsed.role === 'ADMIN' || parsed.isAdmin === true) return true;
    }
  } catch (e) {
    // Ignore JSON errors
  }
  return false;
}

/**
 * Returns authorization headers for admin API requests.
 */
export function getAdminHeaders(customEmail) {
  const email = customEmail || auth?.currentUser?.email || PRIMARY_ADMIN_EMAIL;
  return {
    'Content-Type': 'application/json',
    'x-admin-email': email,
    'x-user-email': email,
    'x-user-role': 'admin'
  };
}
