import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface HandleReferralPayload {
  referralCode: string;
}

export const handleReferral = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const newUserId = request.auth.uid;
  const { referralCode } = (request.data || {}) as HandleReferralPayload;

  if (!referralCode) {
    return { success: false, message: "No referral code provided." };
  }

  const db = admin.firestore();

  try {
    // 1️⃣ Find referrer directly in the 'users' collection (exact original logic)
    const snap = await db
      .collection("users")
      .where("referralCode", "==", referralCode)
      .get();

    if (snap.empty) {
      return { success: false, message: "Referrer not found." };
    }

    const referrerDoc = snap.docs[0];
    const referrerId = referrerDoc.id;

    if (referrerId === newUserId) {
      return { success: false, message: "Cannot refer self." };
    }

    // 2️⃣ Get NEW USER data to read their referralCode
    const newUserRef = db.collection("users").doc(newUserId);
    const newUserDoc = await newUserRef.get();

    if (!newUserDoc.exists) {
      throw new HttpsError("not-found", "New user document not found.");
    }

    const newUserData = newUserDoc.data();

    // Check if user was already referred
    if (newUserData?.referredBy) {
      return { success: false, message: "User already has a referrer." };
    }

    const referredUserCode = newUserData?.referralCode || "UNKNOWN";

    // 3️⃣ Link new user
    await newUserRef.update({
      referredBy: referrerId,
    });

    // 4️⃣ Create referral record in existing 'referrals' collection
    await db.collection("referrals").add({
      referrerId,
      referredId: newUserId,
      referredCode: referredUserCode,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 5️⃣ Increment count on referrer user document
    await db.collection("users").doc(referrerId).update({
      referralCount: admin.firestore.FieldValue.increment(1),
    });

    return { success: true };
  } catch (error: any) {
    console.log("Referral error:", error);
    throw new HttpsError("internal", error.message);
  }
});