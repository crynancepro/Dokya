import { User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebase';

export const PRIMARY_ADMIN_EMAIL = 'admin1@gmail.com';

// List of authorized admin emails
export const AUTHORIZED_ADMIN_EMAILS: string[] = [
  'admin1@gmail.com',
  'admin1@gamil.com',
  'peter25ngouala@gmail.com'
];

/**
 * Checks if a given email belongs to the administrator group.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (AUTHORIZED_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalized)) {
    return true;
  }
  // Check if starts with admin or contains admin
  if (normalized.startsWith('admin') && normalized.includes('@')) {
    return true;
  }
  return false;
}

/**
 * Checks if the current Firebase user or stored user is an administrator.
 */
export function isCurrentUserAdmin(customUser?: FirebaseUser | null): boolean {
  const targetEmail = customUser?.email || auth.currentUser?.email;
  if (targetEmail && isAdminEmail(targetEmail)) {
    return true;
  }
  // Check local profile cache if available
  try {
    const localProfile = localStorage.getItem('senegal_cv_user_profile');
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
export function getAdminHeaders(customEmail?: string | null): HeadersInit {
  const email = customEmail || auth.currentUser?.email || PRIMARY_ADMIN_EMAIL;
  return {
    'Content-Type': 'application/json',
    'x-admin-email': email,
    'x-user-email': email,
    'x-user-role': 'admin'
  };
}
