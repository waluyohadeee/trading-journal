import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

export interface Setup {
  id?: string;
  name: string;
  pair: string;
  direction: 'Buy' | 'Sell';
  date: string;
  time: string;
  status: string;
  slUsd: number;
  tpUsd: number;
  slAmount: number;
  tpAmount: number;
  outcome: string;
  pnl: number;
  rrRatio: number;
  screenshotUrls: string[];
  notes: string;
  setupOutcome: string;
  checklist: {
    htf: boolean[];
    ltf: boolean[];
    risk: boolean[];
  };
  score: number;
  createdAt?: any;
}

export const addSetup = async (userId: string, setup: Setup) => {
  const setupsRef = collection(db, `users/${userId}/setups`);
  const docRef = await addDoc(setupsRef, {
    ...setup,
    createdAt: Timestamp.now(),
  });
  return docRef;
};

export const getSetups = async (userId: string): Promise<Setup[]> => {
  const setupsRef = collection(db, `users/${userId}/setups`);
  const q = query(setupsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as Setup));
};

export const updateSetup = async (userId: string, setupId: string, data: Partial<Setup>) => {
  const setupRef = doc(db, `users/${userId}/setups/${setupId}`);
  return await updateDoc(setupRef, data);
};

export const deleteSetup = async (userId: string, setupId: string) => {
  const setupRef = doc(db, `users/${userId}/setups/${setupId}`);
  return await deleteDoc(setupRef);
};

export const uploadScreenshot = async (userId: string, file: File) => {
  const storageRef = ref(storage, `users/${userId}/screenshots/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};