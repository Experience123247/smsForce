import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

export const saveUserProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const userId = request.auth.uid;
  const db = admin.firestore();
  const data = request.data || {};

  await db
    .collection("users")
    .doc(userId)
    .set(
      {
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }, // 👈 Preserves existing document fields & prevents overwriting created_at
    );

  return { success: true };
});
