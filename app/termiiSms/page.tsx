"use client";

import { useState } from "react";

type TermiiResponse = {
  code?: string;
  balance?: number;
  message_id?: string;
  message_id_str?: string;
  message?: string;
  user?: string;
  error?: string;
  status?: number;
  response?: string;
};

export default function Home() {
  const [numbers, setNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [senderId, setSenderId] = useState("BBUpdates");

  const [channel, setChannel] = useState<"generic" | "dnd">("generic");

  const [type, setType] = useState<
    "plain" | "unicode" | "encrypted"
  >("plain");

  const [response, setResponse] =
    useState<TermiiResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  // ================= SEND SMS =================

  const sendSMS = async () => {
    setError("");
    setResponse(null);

    // Convert textarea into array
    const phoneNumbers = numbers
      .split(/[\n,]+/)
      .map((number) => number.trim())
      .filter(Boolean);

    // Validation
    if (phoneNumbers.length === 0) {
      setError("Enter at least one phone number.");
      return;
    }

    if (phoneNumbers.length > 100) {
      setError("You can send a maximum of 100 numbers at once.");
      return;
    }

    if (!message.trim()) {
      setError("Enter a message.");
      return;
    }

    if (!senderId.trim()) {
      setError("Enter a Sender ID.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/termiiSms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumbers,
          message,
          senderId,
          channel,
          type,
        }),
      });

      const text = await res.text();

      console.log("Frontend raw response:", text);

      let data: TermiiResponse;

      try {
        data = JSON.parse(text);
      } catch {
        setError(
          `Server returned a non-JSON response:\n${text}`
        );
        return;
      }

      if (!res.ok) {
        setResponse(data);
        setError(data.error || data.message || "Request failed.");
        return;
      }

      setResponse(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        padding: "50px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          background: "#ffffff",
          padding: 30,
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: 8,
            fontSize: 30,
          }}
        >
          Bulk SMS Test
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: 30,
          }}
        >
          Test Termii bulk SMS delivery.
        </p>

        {/* ================= PHONE NUMBERS ================= */}

        <label
          style={{
            display: "block",
            fontWeight: "bold",
            marginBottom: 8,
          }}
        >
          Phone Numbers
        </label>

        <textarea
          value={numbers}
          onChange={(e) => setNumbers(e.target.value)}
          placeholder={`2348143451826
2348031234567
2349012345678`}
          rows={6}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc",
            marginBottom: 5,
            resize: "vertical",
          }}
        />

        <p
          style={{
            fontSize: 13,
            color: "#777",
            marginTop: 5,
          }}
        >
          Enter one number per line or separate numbers with commas.
          Maximum: 100 numbers.
        </p>

        {/* ================= SENDER ID ================= */}

        <label
          style={{
            display: "block",
            fontWeight: "bold",
            marginTop: 20,
            marginBottom: 8,
          }}
        >
          Sender ID
        </label>

        <input
          type="text"
          value={senderId}
          onChange={(e) => setSenderId(e.target.value)}
          placeholder="BBUpdates"
          maxLength={11}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />

        <p
          style={{
            fontSize: 13,
            color: "#777",
          }}
        >
          Alphanumeric Sender ID: 3–11 characters.
        </p>

        {/* ================= MESSAGE ================= */}

        <label
          style={{
            display: "block",
            fontWeight: "bold",
            marginTop: 20,
            marginBottom: 8,
          }}
        >
          Message
        </label>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your SMS message..."
          rows={6}
          maxLength={1000}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc",
            resize: "vertical",
          }}
        />

        <p
          style={{
            fontSize: 13,
            color: "#777",
            textAlign: "right",
          }}
        >
          {message.length} characters
        </p>

        {/* ================= CHANNEL ================= */}

        <label
          style={{
            display: "block",
            fontWeight: "bold",
            marginTop: 15,
            marginBottom: 8,
          }}
        >
          SMS Route
        </label>

        <select
          value={channel}
          onChange={(e) =>
            setChannel(e.target.value as "generic" | "dnd")
          }
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "white",
          }}
        >
          <option value="generic">
            Generic — Promotional / Non-DND
          </option>

          <option value="dnd">
            DND — Transactional / Critical
          </option>
        </select>

        {/* ================= MESSAGE TYPE ================= */}

        <label
          style={{
            display: "block",
            fontWeight: "bold",
            marginTop: 20,
            marginBottom: 8,
          }}
        >
          Message Type
        </label>

        <select
          value={type}
          onChange={(e) =>
            setType(
              e.target.value as
                | "plain"
                | "unicode"
                | "encrypted"
            )
          }
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "white",
          }}
        >
          <option value="plain">Plain</option>
          <option value="unicode">Unicode</option>
          <option value="encrypted">Encrypted</option>
        </select>

        {/* ================= ERROR ================= */}

        {error && (
          <div
            style={{
              marginTop: 20,
              padding: 15,
              background: "#ffecec",
              border: "1px solid #ffb5b5",
              borderRadius: 8,
              color: "#b00020",
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        )}

        {/* ================= SEND BUTTON ================= */}

        <button
          onClick={sendSMS}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 25,
            padding: 14,
            border: "none",
            borderRadius: 8,
            background: loading ? "#999" : "#111",
            color: "white",
            fontSize: 16,
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Sending..." : "Send Bulk SMS"}
        </button>

        {/* ================= RESPONSE ================= */}

        {response && (
          <div style={{ marginTop: 30 }}>
            <h2 style={{ fontSize: 20 }}>Termii Response</h2>

            {response.code === "ok" && (
              <div
                style={{
                  padding: 15,
                  background: "#eaf8ee",
                  border: "1px solid #a8dfb8",
                  borderRadius: 8,
                  marginBottom: 15,
                }}
              >
                <strong>SMS request accepted.</strong>
              </div>
            )}

            <pre
              style={{
                background: "#111",
                color: "#fff",
                padding: 20,
                borderRadius: 8,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}