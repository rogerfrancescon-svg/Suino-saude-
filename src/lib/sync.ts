import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { VisitData } from '../types';

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const logout = async () => {
  return signOut(auth);
};

export const syncHistoryToCloud = async (localHistory: VisitData[]) => {
  if (!auth.currentUser) throw new Error("User not authenticated");
  const userId = auth.currentUser.uid;
  const historyRef = collection(db, 'users', userId, 'history');
  
  const batch = writeBatch(db);
  for (const visit of localHistory) {
    const docRef = doc(historyRef, visit.id.toString());
    batch.set(docRef, { ...visit, userId }, { merge: true });
  }
  await batch.commit();
};

export const getHistoryFromCloud = async (): Promise<VisitData[]> => {
  if (!auth.currentUser) throw new Error("User not authenticated");
  const userId = auth.currentUser.uid;
  const historyRef = collection(db, 'users', userId, 'history');
  
  const snapshot = await getDocs(historyRef);
  const visits: VisitData[] = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    visits.push({
      id: data.id,
      producer: data.producer,
      farm: data.farm,
      batch: data.batch,
      date: data.date,
      phase: data.phase,
      feed: data.feed,
      meds: data.meds,
      housingDate: data.housingDate,
      mortality: data.mortality,
      totalAnimals: data.totalAnimals,
      temp: data.temp,
      humidity: data.humidity,
      co2: data.co2,
      duration: data.duration,
      counts: data.counts,
      results: data.results,
      notes: data.notes,
      images: data.images,
    });
  });
  return visits;
};
