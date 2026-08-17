import { NextResponse } from "next/server";

type RequestBody = {
  phoneNumbers: string[];
  message: string;
  senderId: string;
  channel: "generic" | "dnd";
  type: "plain" | "unicode" | "encrypted";
};

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();

    const {
      phoneNumbers,
      message,
      senderId,
      channel,
      type,
    } = body;

    // ================= VALIDATION =================

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return NextResponse.json(
        {
          error: "Phone numbers must be an array.",
        },
        { status: 400 }
      );
    }

    if (phoneNumbers.length === 0) {
      return NextResponse.json(
        {
          error: "At least one phone number is required.",
        },
        { status: 400 }
      );
    }

    if (phoneNumbers.length > 100) {
      return NextResponse.json(
        {
          error: "Maximum of 100 phone numbers per request.",
        },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        {
          error: "Message is required.",
        },
        { status: 400 }
      );
    }

    if (!senderId?.trim()) {
      return NextResponse.json(
        {
          error: "Sender ID is required.",
        },
        { status: 400 }
      );
    }

    // ================= ENVIRONMENT =================

    const apiKey = process.env.TERMII_API_KEY;

    // Use your actual Termii API base URL here.
    // It can also be configured through .env.local.
    const baseUrl =
      process.env.TERMII_BASE_URL || "https://api.ng.termii.com";

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "TERMII_API_KEY is missing from environment variables.",
        },
        { status: 500 }
      );
    }

    // ================= CLEAN NUMBERS =================

    const cleanedNumbers = phoneNumbers
      .map((number) => number.trim())
      .filter(Boolean);

    // ================= TERMII REQUEST =================

    const payload = {
      to: cleanedNumbers,
      from: senderId,
      sms: message,
      type,
      channel,
      api_key: apiKey,
    };

    console.log("========== TERMII REQUEST ==========");
    console.log("Endpoint:", `${baseUrl}/api/sms/send/bulk`);
    console.log("Recipients:", cleanedNumbers.length);
    console.log("Sender ID:", senderId);
    console.log("Channel:", channel);
    console.log("Type:", type);

    const response = await fetch(`${baseUrl}/api/sms/send/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    // ================= READ RESPONSE SAFELY =================

    const responseText = await response.text();

    console.log("========== TERMII RESPONSE ==========");
    console.log("HTTP Status:", response.status);
    console.log("Response:", responseText);

    let data: unknown;

    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          error: "Termii returned a non-JSON response.",
          status: response.status,
          response: responseText,
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Send SMS Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      {
        status: 500,
      }
    );
  }
}