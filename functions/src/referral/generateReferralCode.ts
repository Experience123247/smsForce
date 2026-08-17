import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

export const generateUniqueReferralCode = async (): Promise<string> => {
  const db = admin.firestore();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let isUnique = false;
  let code = "";

  while (!isUnique) {
    code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check uniqueness directly against the 'users' collection
    const snap = await db
      .collection("users")
      .where("referralCode", "==", code)
      .get();

    if (snap.empty) {
      isUnique = true;
    }
  }

  return code;
};

export const generateReferralCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const code = await generateUniqueReferralCode();
  return { referralCode: code };
});