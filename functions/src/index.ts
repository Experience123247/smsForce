import * as admin from "firebase-admin";

import axios from "axios";

import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";

import { signupanalytics } from "./datawebhook/analytics/signupAnalytics";

import { processFlutterCharge } from "./flutterChargeBalancer";

import {
  reviewBulkSmsHandler,
  sendApprovedBulkSmsHandler,
  scheduleBulkSmsHandler,
  processScheduledBulkSmsTask,
} from "./sendBulkSms";
import { createReferralCode } from "./referral/createReferralCode";
import { generateReferralCode } from "./referral/generateReferralCode";
import { handleReferral } from "./referral/handleReferral";
import { createUser } from "./auth/createUser";
import { saveUserProfile } from "./auth/saveUserProfile";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// EXPORT EVERYTHING YOU WANT DEPLOYED
export {
  createUser,
  saveUserProfile,
  handleReferral,
  createReferralCode,
  generateReferralCode,
  reviewBulkSmsHandler,
  sendApprovedBulkSmsHandler,
  scheduleBulkSmsHandler,
  processScheduledBulkSmsTask,
  signupanalytics,
};

/** ============================
 * SECRETS
 * ============================ */

const FLUTTERWAVE_HASH = defineSecret("FLUTTERWAVE_HASH");

const FLUTTERWAVE_SECRET = defineSecret("FLUTTERWAVE_SECRET");

export const createFlutterwaveAccount = onCall(
  {
    secrets: [FLUTTERWAVE_SECRET],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    const uid = request.auth.uid;
    const { first_name, last_name, phone, bvn } = request.data;

    if (!first_name || !last_name || !phone || !bvn) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    // Prevent duplicate VA creation
    if (userSnap.data()?.flutterwave_va) {
      return {
        status: "exists",
        message: "Virtual account already created",
      };
    }

    const email = userSnap.data()?.email;
    const secret = await FLUTTERWAVE_SECRET.value();

    const txRef = `VA-${uid}-${Date.now()}`;

    try {
      const res = await axios.post(
        "https://api.flutterwave.com/v3/virtual-account-numbers",
        {
          email,
          tx_ref: txRef,
          phonenumber: phone,
          firstname: first_name,
          lastname: last_name,
          narration: `${first_name} ${last_name}`,
          is_permanent: true, // STATIC account
          bvn,
        },
        {
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
        },
      );

      const va = res.data.data;

      await userRef.update({
        flutterwave_va: {
          account_number: va.account_number,
          bank_name: va.bank_name,
          flw_ref: va.flw_ref,
          order_ref: va.order_ref,
          tx_ref: txRef,
          status: "active",
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        },
      });

      return {
        status: "success",
        account_number: va.account_number,
        bank_name: va.bank_name,
      };
    } catch (error: any) {
      console.error("Flutterwave VA Error:", error.response?.data || error);

      throw new HttpsError(
        "internal",
        error.response?.data?.message || "Failed to create virtual account",
      );
    }
  },
);

/** ============================
 * FLUTTERWAVE WEBHOOK
 * ============================ */
export const flutterwaveWeb = onRequest(
  {
    secrets: [
      "FLUTTERWAVE_HASH",

      // REQUIRED FOR replayBlockedTransactions
      "ISQUARE_BASE_URL",
      "ISQUARE_USERNAME",
      "ISQUARE_PASSWORD",
      "IACAFE_API_KEY",
    ],
  },

  async (req, res): Promise<void> => {
    try {
      /* ---------------- SIGNATURE ---------------- */

      const secret = FLUTTERWAVE_HASH.value();

      const signature =
        req.headers["verif-hash"] ||
        req.headers["x-flw-signature"] ||
        req.headers["x-flutterwave-signature"];

      if (!signature || signature !== secret) {
        console.error("[Webhook] invalid signature");
        res.status(401).send("Invalid signature");
        return;
      }

      const payload = req.body;

      console.log("[Webhook RAW]", JSON.stringify(payload, null, 2));

      console.log(`[Webhook Event] ${payload?.event}`);

      /* =====================================
PROVIDER FUNDING TRANSFER WEBHOOK
===================================== */

      if (payload.event === "transfer.completed") {
        const data = payload.data;

        console.log("[Transfer Webhook]", JSON.stringify(data));

        if (String(data.status).toUpperCase() !== "SUCCESSFUL") {
          res.status(200).send("Ignored");
          return;
        }

        const reference = data.reference;
        const transferId = String(data.id);

        let q = await db
          .collection("provider_funding_queue")
          .where("flutterwave_reference", "==", reference)
          .limit(1)
          .get();

        /* fallback lookup by transfer id */
        if (q.empty && transferId) {
          q = await db
            .collection("provider_funding_queue")
            .where("flutterwave_transfer_id", "==", transferId)
            .limit(1)
            .get();
        }

        if (q.empty) {
          console.error(`[Transfer] no funding match ${reference}`);

          res.status(200).send("No Match");
          return;
        }

        const doc = q.docs[0];
        const funding = doc.data() as any;

        /* idempotency */
        if (
          funding.webhook_pending === false ||
          funding.status === "completed"
        ) {
          res.status(200).send("Duplicate ignored");
          return;
        }

        /* --------------------------
 complete funding + unlock
 -------------------------- */

        await db.runTransaction(async (tx) => {
          tx.update(doc.ref, {
            status: "completed",
            webhook_pending: false,
            provider_credit_confirmed: true,
            webhook_payload: data,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        /* --------------------------
 SAFE DELAYED REPLAY (NON-BLOCKING)
-------------------------- */

        setTimeout(async () => {
          try {
            console.log(
              `[Replay Scheduled] provider=${funding.provider} after 60s`,
            );
          } catch (replayErr) {
            console.error("Replay error:", replayErr);
          }
        }, 60000);

        res.status(200).send("Transfer Processed");
        return;
      }

      /* =====================================
USER WALLET FUNDING WEBHOOK
===================================== */

      if (payload.event !== "charge.completed") {
        res.status(200).send("Ignored");
        return;
      }

      const data = payload.data;

      if (String(data.status).toLowerCase() !== "successful") {
        res.status(200).send("Not successful");
        return;
      }

      const { tx_ref, flw_ref, amount, payment_type } = data;

      let uid: string | null = null;

      if (tx_ref?.startsWith("VA-")) {
        uid = tx_ref.split("-")[1];
      } else if (tx_ref?.includes("-")) {
        uid = tx_ref.split("-")[0];
      }

      if (!uid) {
        res.status(200).send("UID unresolved");
        return;
      }

      const txDoc = db
        .collection("wallet_transactions")
        .doc(uid)
        .collection("transactions")
        .doc(flw_ref);

      const existing = await txDoc.get();

      if (existing.exists) {
        res.status(200).send("Duplicate ignored");
        return;
      }

      const gross = Number(amount);

      const result = await processFlutterCharge({
        amount: gross,
        uid,
      });

      const { userFee, profit } = result;

      const net = Math.max(gross - userFee, 0);

      await txDoc.set(
        {
          tx_ref,
          flw_ref,
          payment_type,
          gross_amount: gross,
          fee: userFee,
          net_amount: net,
          profit,
          status: "succeeded",
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      await db.doc(`users/${uid}`).set(
        {
          balance: admin.firestore.FieldValue.increment(net),
        },
        { merge: true },
      );

      res.status(200).send("OK");
      return;
    } catch (err) {
      console.error("Webhook error:", err);

      res.status(500).send("Webhook error");
      return;
    }
  },
);