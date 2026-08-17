import * as admin from "firebase-admin";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

interface ChargeInput {
  amount: number;
  uid: string;
  timestamp?: any;
}

/* ================= FETCH CONFIG ================= */
const getFeeConfig = async () => {
  const snap = await db.collection("fluttercharge_config").doc("fees").get();

  if (!snap.exists) {
    throw new Error("Fee config not found");
  }

  return snap.data() as any;
};

export const processFlutterCharge = async ({
  amount,
  uid,
  timestamp,
}: ChargeInput) => {
  const gross = Number(amount);

  /* ================= LOAD CONFIG ================= */
  const config = await getFeeConfig();

  const flutterwavePercent = config.flutterwavePercent ?? 0.0215;
  const discountFactor = config.discountFactor ?? 1;

  const flwFee = gross * flutterwavePercent;

  /* ================= DETERMINE TIER ================= */
  let tier: "small" | "medium" | "large" = "small";

  if (gross >= config.medium.min && gross <= config.medium.max) {
    tier = "medium";
  }

  if (gross >= config.large.min) {
    tier = "large";
  }

  const tierConfig = config[tier];

  /* ================= USER FEE ================= */
  let userFee = 0;

  if (tierConfig.percent > 0) {
    userFee = gross * tierConfig.percent;

    // ✅ discount applies ONLY to percent
    userFee = userFee * discountFactor;
  } else {
    userFee = tierConfig.flat;
  }

  const profit = userFee - flwFee;

  /* ================= DATE ================= */
  const now = timestamp ? new Date(timestamp) : new Date();

  const dayKey = now.toISOString().split("T")[0];
  const monthKey = dayKey.slice(0, 7);
  const yearKey = dayKey.slice(0, 4);

  /* ================= ANALYTICS DOCS ================= */
  const dailyRef = db
    .collection("fluttercharge_analytics")
    .doc("daily")
    .collection("days")
    .doc(dayKey);

  const monthlyRef = db
    .collection("fluttercharge_analytics")
    .doc("monthly")
    .collection("months")
    .doc(monthKey);

  const yearlyRef = db
    .collection("fluttercharge_analytics")
    .doc("yearly")
    .collection("years")
    .doc(yearKey);

  /* ================= GLOBAL TIMELINE ================= */
  const timelineCol = db
    .collection("fluttercharge_analytics")
    .doc("timeline")
    .collection("txns");

  /* ================= GET LAST NET ================= */
  const lastSnap = await timelineCol
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  let previousNet = 0;

  if (!lastSnap.empty) {
    previousNet = lastSnap.docs[0].data().net || 0;
  }

  const newNet = previousNet + profit;

  /* ================= TOTALS ================= */
  const totalProfitInc = profit > 0 ? profit : 0;
  const totalLossInc = profit < 0 ? Math.abs(profit) : 0;

  const update: any = {
    [`${tier}.profit`]: FieldValue.increment(profit),
    [`${tier}.count`]: FieldValue.increment(1),

    "totals.totalProfit": FieldValue.increment(totalProfitInc),
    "totals.totalLoss": FieldValue.increment(totalLossInc),
    "totals.net": FieldValue.increment(profit),

    updatedAt: FieldValue.serverTimestamp(),
  };

  /* ================= NEW TXN ================= */
  const txnRef = timelineCol.doc();

  const txnData = {
    amount: gross,
    profit,
    net: newNet, // ✅ cumulative
    tier,
    createdAt: FieldValue.serverTimestamp(),
  };

  /* ================= WRITE ================= */
  const batch = db.batch();

  batch.set(dailyRef, update, { merge: true });
  batch.set(monthlyRef, update, { merge: true });
  batch.set(yearlyRef, update, { merge: true });

  batch.set(txnRef, txnData);

  await batch.commit();

  /* ================= LIMIT TO 100 ================= */
  const allTxns = await timelineCol.orderBy("createdAt", "desc").get();

  if (allTxns.size > 100) {
    const docsToDelete = allTxns.docs.slice(100);

    const deleteBatch = db.batch();

    docsToDelete.forEach((doc) => {
      deleteBatch.delete(doc.ref);
    });

    await deleteBatch.commit();
  }

  return {
    gross,
    userFee,
    flwFee,
    profit,
    net: newNet,
    tier,
  };
};
