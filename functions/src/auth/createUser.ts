import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { generateUniqueReferralCode } from "../referral/generateReferralCode";

interface CreateUserPayload {
  fullName: string;
  phone?: string;
  email?: string;
}

export const createUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);

  const existingUser = await userRef.get();
  if (existingUser.exists) {
    return { success: true, message: "User profile already exists." };
  }

  const { fullName, phone, email } = (request.data || {}) as CreateUserPayload;
  const userEmail = request.auth.token.email || email || "";
  const referralCode = await generateUniqueReferralCode();

  const newUserProfile = {
    uid,
    email: userEmail,
    fullName: fullName || "",
    phone: phone || "",
    referralCode,
    referredBy: null,
    referralCount: 0,
    requiresVerification: true, // 👈 Explicitly flags NEW users for verification
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Saved strictly inside the 'users' collection
  await userRef.set(newUserProfile);

  return { success: true, user: newUserProfile };
});