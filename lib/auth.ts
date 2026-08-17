import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./firebase";
import { sendPasswordResetEmail } from "firebase/auth";

// References to your DEPLOYED backend Cloud Functions
const createUserCallable = httpsCallable(functions, "createUser");
const handleReferralCallable = httpsCallable(functions, "handleReferral");

// Helper function to safely extract error messages without using `any`
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// 1️⃣ SIGNUP
export async function signupNextJS({
  email,
  password,
  fullName,
  phone,
  referralCode,
}: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  referralCode?: string;
}) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: fullName });

    // Call backend Cloud Function
    await createUserCallable({ fullName, phone, email });

    if (referralCode) {
      await handleReferralCallable({ referralCode });
    }

    await sendEmailVerification(user);
    await signOut(auth);

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// 2️⃣ LOGIN
export async function loginNextJS(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (userSnap.exists()) {
      const userData = userSnap.data();

      if (userData?.requiresVerification === true && !user.emailVerified) {
        await signOut(auth);
        return {
          success: false,
          requiresVerification: true,
          error: "Please verify your email address before logging in.",
        };
      }
    }

    return { success: true, user };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// 3️⃣ LOGOUT
export async function logoutNextJS() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// 4️⃣ RESEND VERIFICATION EMAIL
export async function resendVerificationEmailNextJS(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    await signOut(auth);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}



// 5️⃣ FORGOT PASSWORD
export async function forgotPasswordNextJS(email: string) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}