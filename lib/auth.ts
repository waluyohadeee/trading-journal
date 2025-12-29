import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';

const ALLOWED_EMAIL = process.env.NEXT_PUBLIC_ALLOWED_EMAIL;
const ALLOWED_UID = process.env.NEXT_PUBLIC_ALLOWED_UID;

export const signIn = async (email: string, password: string) => {
  // Validasi email
  if (email !== ALLOWED_EMAIL) {
    throw new Error('Unauthorized: Email not allowed');
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  // Validasi UID setelah login
  if (userCredential.user.uid !== ALLOWED_UID) {
    await firebaseSignOut(auth);
    throw new Error('Unauthorized: User not allowed');
  }

  return userCredential.user;
};

export const signOut = async () => {
  await firebaseSignOut(auth);
};