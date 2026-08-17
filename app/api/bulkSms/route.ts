// app/api/bulkSms/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AfricasTalking = require("africastalking");

const africasTalking = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY!,
  username: process.env.AFRICASTALKING_USERNAME!,
});

const sms = africasTalking.SMS;
const COST_PER_UNIT = 4.0;

export async function POST(req: Request) {
  try {
    const { uid, phoneNumbers, message } = await req.json();

    if (!uid || !phoneNumbers || !message) {
      return NextResponse.json(
        { error: "Missing required fields (uid, phoneNumbers, message)" },
        { status: 400 }
      );
    }

    const numbersArray: string[] = Array.isArray(phoneNumbers)
      ? phoneNumbers
      : String(phoneNumbers)
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean);

    if (numbersArray.length === 0) {
      return NextResponse.json(
        { error: "No valid phone numbers provided" },
        { status: 400 }
      );
    }

    // 1. Calculate costs
    const smsPages = Math.ceil(message.length / 160) || 1;
    const totalUnits = numbersArray.length * smsPages;
    const totalCost = totalUnits * COST_PER_UNIT;

    // 2. Validate user balance first
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json(
        { error: "User account not found in Firestore" },
        { status: 404 }
      );
    }

    const currentBalance = userSnap.data()?.balance || 0;

    if (currentBalance < totalCost) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Required: ₦${totalCost}, Available: ₦${currentBalance}`,
        },
        { status: 400 }
      );
    }

    // 3. STEP 1: Call Africa's Talking API FIRST
    const atResponse = await sms.send({
      to: numbersArray,
      message,
      from: "GOLDSUB",
    });

    // Check delivery status from Africa's Talking response
    const recipientsList = atResponse?.SMSMessageData?.Recipients || [];
    const isSuccess = recipientsList.some(
      (r: { status: string }) => r.status === "Success" || r.status === "Sent"
    );

    // 4. STEP 2: Save to Firestore AFTER getting response
    const internalRef = `SMS_${uid.substring(0, 5)}_${Date.now()}`;
    const transactionRef = doc(
      db,
      "bulksms_transactions",
      uid,
      "transactions",
      internalRef
    );

    if (isSuccess) {
      // Deduct wallet balance
      await updateDoc(userRef, {
        balance: increment(-totalCost),
      });

      // Write successful transaction record
      await setDoc(transactionRef, {
        reference: internalRef,
        uid,
        recipients: numbersArray,
        recipientCount: numbersArray.length,
        message,
        pagesPerRecipient: smsPages,
        totalUnits,
        amountCharged: totalCost,
        status: "successful",
        apiResponse: atResponse.SMSMessageData,
        created_at: serverTimestamp(),
        firestore_timestamp: Date.now(),
      });

      return NextResponse.json({
        success: true,
        reference: internalRef,
        amountCharged: totalCost,
        response: atResponse, // Raw Africa's Talking response
      });
    } else {
      // Write failed transaction record
      await setDoc(transactionRef, {
        reference: internalRef,
        uid,
        recipients: numbersArray,
        recipientCount: numbersArray.length,
        message,
        pagesPerRecipient: smsPages,
        totalUnits,
        amountCharged: 0,
        status: "failed",
        error: atResponse?.SMSMessageData?.Message || "Delivery failed",
        apiResponse: atResponse,
        created_at: serverTimestamp(),
        firestore_timestamp: Date.now(),
      });

      return NextResponse.json(
        {
          error: atResponse?.SMSMessageData?.Message || "Delivery failed",
          response: atResponse,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Bulk SMS Server Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}