/**
 * Firebase web config for the class mode (Realtime Database only; the site itself is on Vercel).
 * These values are PUBLIC by design (they identify the project, they do not grant access: the
 * database rules do). Override per deployment with VITE_FIREBASE_* env vars.
 */
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? 'AIzaSyCXTrIB3CWlyiUdVf2CBohZOE1IP2aCCbQ',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? 'glossy-monitor-514715-k4.firebaseapp.com',
  databaseURL:
    env.VITE_FIREBASE_DATABASE_URL ??
    'https://glossy-monitor-514715-k4-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? 'glossy-monitor-514715-k4',
  appId: env.VITE_FIREBASE_APP_ID ?? '1:896458186849:web:ea6f35495b58b1974eca20',
};
