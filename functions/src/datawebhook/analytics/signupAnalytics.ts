// functions/src/analytics/signupAnalytics.ts
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const db = getFirestore();

export const signupanalytics = onCall(
  { region: "us-central1" },
  async (request) => {
    try {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const now = new Date();

      const dayKey = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
      const yearKey = `${now.getFullYear()}`; // YYYY

      const dailyRef = db.collection("analytics").doc("dailySignups").collection("days").doc(dayKey);
      const monthlyRef = db.collection("analytics").doc("monthlySignups").collection("months").doc(monthKey);
      const yearlyRef = db.collection("analytics").doc("yearlySignups").collection("years").doc(yearKey);

      const updatePayload = {
        totalSignups: FieldValue.increment(1),
        updatedAt: Timestamp.now(),
      };

      const batch = db.batch();
      batch.set(dailyRef, updatePayload, { merge: true });
      batch.set(monthlyRef, updatePayload, { merge: true });
      batch.set(yearlyRef, updatePayload, { merge: true });

      await batch.commit();

      return { success: true };
    } catch (err: any) {
      throw new HttpsError("internal", err.message || "Failed to update signup analytics");
    }
  }
);
