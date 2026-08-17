"use client";

import { ChangeEvent, useState } from "react";

type TestResponse = Record<string, unknown>;

export default function TestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [phonebookName, setPhonebookName] = useState(
    "BBUpdates CSV Test"
  );
  const [description, setDescription] = useState(
    "Testing Termii Phonebook CSV upload"
  );
  const [loading, setLoading] = useState(false);
  const [response, setResponse] =
    useState<TestResponse | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setError("");
    setResponse(null);

    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const isCsv =
      selectedFile.name.toLowerCase().endsWith(".csv") ||
      selectedFile.type === "text/csv";

    if (!isCsv) {
      setFile(null);
      setError("Please select a CSV file.");
      return;
    }

    setFile(selectedFile);
  };

  const uploadCsv = async () => {
    setError("");
    setResponse(null);

    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    if (!phonebookName.trim()) {
      setError("Please enter a phonebook name.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append(
        "phonebook_name",
        phonebookName.trim()
      );
      formData.append(
        "description",
        description.trim()
      );

      const response = await fetch("/api/test", {
        method: "POST",
        body: formData,
      });

      const text = await response.text();

      let data: TestResponse;

      try {
        data = JSON.parse(text) as TestResponse;
      } catch {
        data = {
          error: `Server returned non-JSON response (${response.status}).`,
          rawResponse: text,
        };
      }

      setResponse(data);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 850,
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: 16,
          padding: 30,
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: 30,
          }}
        >
          Termii Phonebook CSV Test
        </h1>

        <p
          style={{
            marginTop: 0,
            color: "#666",
            lineHeight: 1.5,
          }}
        >
          Create a Termii phonebook and upload a CSV
          contact list to it in one request.
        </p>

        {/* PHONEBOOK NAME */}

        <label
          style={{
            display: "block",
            fontWeight: 600,
            marginTop: 25,
            marginBottom: 8,
          }}
        >
          Phonebook Name
        </label>

        <input
          value={phonebookName}
          onChange={(event) =>
            setPhonebookName(event.target.value)
          }
          placeholder="BBUpdates CSV Test"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 14,
            border: "1px solid #d6d9df",
            borderRadius: 10,
            fontSize: 15,
          }}
        />

        {/* DESCRIPTION */}

        <label
          style={{
            display: "block",
            fontWeight: 600,
            marginTop: 25,
            marginBottom: 8,
          }}
        >
          Description
        </label>

        <input
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          placeholder="Testing Termii Phonebook CSV upload"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 14,
            border: "1px solid #d6d9df",
            borderRadius: 10,
            fontSize: 15,
          }}
        />

        {/* CSV */}

        <label
          style={{
            display: "block",
            fontWeight: 600,
            marginTop: 25,
            marginBottom: 8,
          }}
        >
          CSV Contact File
        </label>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 14,
            border: "1px solid #d6d9df",
            borderRadius: 10,
            background: "#fff",
            fontSize: 15,
          }}
        />

        {file && (
          <div
            style={{
              marginTop: 10,
              padding: 12,
              background: "#f0fdf4",
              borderRadius: 8,
              color: "#166534",
              fontSize: 14,
            }}
          >
            <strong>Selected file:</strong>{" "}
            {file.name}
            <br />
            <strong>Size:</strong>{" "}
            {file.size.toLocaleString()} bytes
          </div>
        )}

        <p
          style={{
            fontSize: 13,
            color: "#777",
            lineHeight: 1.5,
          }}
        >
          Select the CSV containing your phone numbers.
          Termii will process the contact upload in the
          background.
        </p>

        {/* FLOW */}

        <div
          style={{
            marginTop: 20,
            padding: 15,
            background: "#f8fafc",
            borderRadius: 10,
            fontSize: 13,
            color: "#555",
            lineHeight: 1.7,
          }}
        >
          <strong>Test flow:</strong>
          <br />
          1. Create phonebook
          <br />
          2. Fetch phonebooks
          <br />
          3. Find the newly-created phonebook ID
          <br />
          4. Upload CSV to
          <code>
            /api/phonebooks/contacts/upload
          </code>
          <br />
          5. Display all Termii responses
        </div>

        {/* ERROR */}

        {error && (
          <div
            style={{
              marginTop: 20,
              padding: 15,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: 10,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* BUTTON */}

        <button
          onClick={uploadCsv}
          disabled={loading || !file}
          style={{
            width: "100%",
            marginTop: 20,
            padding: 15,
            border: "none",
            borderRadius: 10,
            background:
              loading || !file ? "#999" : "#111827",
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
            cursor:
              loading || !file
                ? "not-allowed"
                : "pointer",
          }}
        >
          {loading
            ? "Creating Phonebook & Uploading CSV..."
            : "Create Phonebook & Upload CSV"}
        </button>

        {/* RESPONSE */}

        {response && (
          <div style={{ marginTop: 30 }}>
            <h3
              style={{
                marginBottom: 10,
              }}
            >
              Complete Termii Response
            </h3>

            <pre
              style={{
                background: "#111827",
                color: "#fff",
                padding: 18,
                borderRadius: 10,
                overflowX: "auto",
                fontSize: 13,
                lineHeight: 1.6,
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