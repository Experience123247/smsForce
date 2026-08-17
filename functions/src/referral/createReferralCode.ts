import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { generateUniqueReferralCode } from "./generateReferralCode";

export const createReferralCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);

  const userDoc = await userRef.get();
  if (userDoc.exists && userDoc.data()?.referralCode) {
    return { referralCode: userDoc.data()?.referralCode };
  }

  const referralCode = await generateUniqueReferralCode();

  await userRef.update({ referralCode });

  return { referralCode };
});