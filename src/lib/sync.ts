import { collection, doc, setDoc, onSnapshot, query, deleteDoc, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { VisitData } from '../types';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import React, { useState, useEffect } from 'react';

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login failed", error);
  }
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed", error);
  }
};

export const useFirestoreSync = (localHistory: VisitData[], setLocalHistory: React.Dispatch<React.SetStateAction<VisitData[]>>) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let isFirstLoad = true;

    const q = query(collection(db, `users/${user.uid}/history`));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const remoteData: VisitData[] = [];
      snapshot.forEach((doc) => {
        remoteData.push({
          ...(doc.data() as VisitData),
          isOfflinePending: doc.metadata.hasPendingWrites
        });
      });
      
      const currentIsFirstLoad = isFirstLoad;
      isFirstLoad = false;

      setLocalHistory((prevLocal) => {
        const mergedMap = new Map<number, VisitData>();

        // 1. Put all remote records (including pending writes from Firestore cache) into the map
        remoteData.forEach(rv => mergedMap.set(rv.id, rv));

        // 2. Preserve any local records that aren't in remote, or override remote with pending local changes
        const purelyLocalUnsynced: VisitData[] = [];
        prevLocal.forEach(lv => {
          if (!mergedMap.has(lv.id)) {
            // It's locally present but not remotely present (e.g. seeded data, or old data, or offline created data)
            // We KEEP it locally to prevent data loss ("sumiu todo o historico").
            mergedMap.set(lv.id, lv);
            
            // Only auto-push if it was explicitly flagged as an offline edit/creation AND it's the first load
            if (lv.isOfflinePending && currentIsFirstLoad) {
              purelyLocalUnsynced.push(lv);
            }
          } else {
            // It exists remotely. But maybe our local version has pending edits that remote doesn't know about yet?
            if (lv.isOfflinePending && currentIsFirstLoad) {
              const rv = remoteData.find(r => Number(r.id) === Number(lv.id));
              // If we are on first load, and local says pending, we trust local over remote and overwrite
              if (rv) {
                mergedMap.set(lv.id, lv); // Overwrite remote with local pending
                purelyLocalUnsynced.push(lv);
              }
            }
          }
        });

        // 3. Trigger auto-sync for purely local offline records
        purelyLocalUnsynced.forEach(visit => {
          const docRef = doc(db, `users/${user.uid}/history`, visit.id.toString());
          const visitToUpload = { ...visit, isOfflinePending: false };
          setDoc(docRef, visitToUpload).catch(err => console.error("Auto upload failed", err));
        });

        return Array.from(mergedMap.values()).sort((a, b) => b.id - a.id);
      });
    });

    return () => unsubscribe();
  }, [user, setLocalHistory]);

  const saveVisitToFirestore = React.useCallback(async (visit: VisitData) => {
    if (user) {
      try {
        const visitToUpload = { ...visit, isOfflinePending: false };
        await setDoc(doc(db, `users/${user.uid}/history`, visit.id.toString()), visitToUpload);
      } catch (err) {
        console.error("Failed to save visit to firestore", err);
      }
    }
  }, [user]);

  const deleteVisitsFromFirestore = React.useCallback(async (ids: number[]) => {
    if (user) {
        for (const id of ids) {
            await deleteDoc(doc(db, `users/${user.uid}/history`, id.toString()));
        }
    }
  }, [user]);

  return { user, saveVisitToFirestore, deleteVisitsFromFirestore };
};
