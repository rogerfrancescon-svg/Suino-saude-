import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp | undefined;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn("Failed to initialize Firebase", e);
}

export const auth = (() => {
  try {
    return app ? getAuth(app) : undefined;
  } catch (e) {
    return undefined;
  }
})();

