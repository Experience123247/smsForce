"use client";

import { useMemo, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  CalendarClock,
  Send,
  Sparkles,
  Users,
  Wallet,
  FileText,
  Clock,
  RefreshCw,
  X,
} from "lucide-react";

/* ============================================================
   TYPES
============================================================ */

interface AIAudit {
  isApproved: boolean;
  action: "approve" | "rewrite" | "reject";
  reason: string;
  originalMessage: string;
  suggestedMessage: string | null;
  suggestedAlternatives: string[];
  category: string;
  riskLevel: "low" | "medium" | "high";
}

type CampaignStatus =
  | "approved"
  | "scheduled"
  | "successful"
  | "failed"
  | "cancelled";

interface CampaignResponse {
  success: boolean;
  reference: string;
  campaignId?: string;
  campaignName?: string;
  status: CampaignStatus;
  amountCharged?: number;
  estimatedCost?: number;
  messageSent?: string;
  message?: string;
  scheduledFor?: string | null;
  aiAudit?: AIAudit;
  response?: unknown;
}

interface ReviewResponse {
  success: boolean;
  campaignId: string;
  campaignName: string;
  status: "approved";
  aiAudit: AIAudit;
  recipientCount: number;
  totalUnits: number;
  estimatedCost: number;
  selectedMessage: string;
}

interface FunctionError {
  message?: string;
  code?: string;
  details?: {
    aiAudit?: AIAudit;
    code?: string;
    required?: number;
    available?: number;
    nextAvailableTime?: string;
  };
}

function isInsufficientBalanceError(
  error: FunctionError
): boolean {
  return (
    error.message
      ?.toLowerCase()
      .includes("insufficient balance") ??
    false
  );
}

/* ============================================================
   HELPERS
============================================================ */

function extractNumbersFromText(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) =>
      item
        .replace(/^["']|["']$/g, "")
        .trim()
    )
    .filter(Boolean);
}

function normalizePhoneNumber(value: string): string | null {
  let number = value
    .replace(/["'\s()-]/g, "")
    .trim();

  if (!number) return null;

  if (number.startsWith("00")) {
    number = `+${number.substring(2)}`;
  }

  if (number.startsWith("0") && number.length >= 10) {
    number = `+234${number.substring(1)}`;
  }

  if (/^234\d{10}$/.test(number)) {
    number = `+${number}`;
  }

  if (/^\+234\d{10}$/.test(number)) {
    return number;
  }

  if (/^\+\d{10,15}$/.test(number)) {
    return number;
  }

  return null;
}

/* ============================================================
   COMPONENT
============================================================ */

export default function BulkSMSPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ----------------------------------------------------------
     CAMPAIGN
  ---------------------------------------------------------- */

  const [campaignName, setCampaignName] = useState("");

  /* ----------------------------------------------------------
     RECIPIENTS
  ---------------------------------------------------------- */

  const [numbersText, setNumbersText] = useState("");
  const [csvFileName, setCsvFileName] = useState("");

  /* ----------------------------------------------------------
     MESSAGE
  ---------------------------------------------------------- */

  const [message, setMessage] = useState("");

  /* ----------------------------------------------------------
     PROCESSING
  ---------------------------------------------------------- */

  const [loading, setLoading] = useState(false);
  const [processingText, setProcessingText] = useState("");

  /* ----------------------------------------------------------
     REVIEW
  ---------------------------------------------------------- */

  const [reviewData, setReviewData] =
    useState<ReviewResponse | null>(null);

  /* ----------------------------------------------------------
     RESULT
  ---------------------------------------------------------- */

  const [resultData, setResultData] =
    useState<CampaignResponse | null>(null);

  /* ----------------------------------------------------------
     ERRORS
  ---------------------------------------------------------- */

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [errorType, setErrorType] = useState<
    "normal" | "balance" | "dnd" | "internet"
  >("normal");

  const [rejectedAudit, setRejectedAudit] =
    useState<AIAudit | null>(null);

  /* ----------------------------------------------------------
     SCHEDULING
  ---------------------------------------------------------- */

  const [showSchedule, setShowSchedule] =
    useState(false);

  const [scheduleDate, setScheduleDate] =
    useState("");

  const [scheduleTime, setScheduleTime] =
    useState("");

  /* ----------------------------------------------------------
     CANCEL / CLOSE RESULT
  ---------------------------------------------------------- */

  const clearMessages = () => {
    setErrorMessage(null);
    setRejectedAudit(null);
  };

  /* ============================================================
     RECIPIENT PROCESSING
  ============================================================ */

  const recipientList = useMemo(() => {
    const raw = extractNumbersFromText(numbersText);

    const normalized = raw
      .map(normalizePhoneNumber)
      .filter((number): number is string => Boolean(number));

    return Array.from(new Set(normalized));
  }, [numbersText]);

  const rawRecipientList = useMemo(
    () => extractNumbersFromText(numbersText),
    [numbersText]
  );

  const invalidRecipientCount =
    rawRecipientList.length - recipientList.length;

  const recipientCount = recipientList.length;

  /* ============================================================
     MESSAGE METADATA
  ============================================================ */

  const charCount = message.length;

  const smsPages =
    Math.ceil(charCount / 160) || 1;

  const totalUnits =
    recipientCount * smsPages;

  /* ============================================================
     CSV UPLOAD
  ============================================================ */

  const handleCsvUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    clearMessages();

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrorType("normal");
      setErrorMessage("Please upload a valid CSV file.");
      return;
    }

    try {
      const text = await file.text();

      /*
       * We intentionally don't require a specific column name.
       * The parser scans CSV cells and extracts values that look
       * like phone numbers.
       */

      const cells = text
        .split(/\r?\n/)
        .flatMap((line) =>
          line.split(",")
        )
        .map((cell) =>
          cell
            .replace(/^["']|["']$/g, "")
            .trim()
        )
        .filter(Boolean);

      const numbers = cells
        .map(normalizePhoneNumber)
        .filter(
          (number): number is string =>
            Boolean(number)
        );

      const uniqueNumbers =
        Array.from(new Set(numbers));

      if (uniqueNumbers.length === 0) {
        setErrorType("normal");
        setErrorMessage(
          "No valid phone numbers were found in the CSV file."
        );
        return;
      }

      setNumbersText(uniqueNumbers.join("\n"));
      setCsvFileName(file.name);
    } catch (error) {
      console.error("CSV upload error:", error);

      setErrorType("normal");
      setErrorMessage(
        "Unable to read the CSV file."
      );
    } finally {
      event.target.value = "";
    }
  };

  /* ============================================================
     APPLY AI SUGGESTION
  ============================================================ */

  const handleApplySuggestion = (
    text: string
  ) => {
    setMessage(text);
    clearMessages();
  };

  /* ============================================================
     INITIAL REVIEW
     
     This does:
     
     Campaign
     → recipients
     → message
     → initial balance check
     → AI review
     
     It DOES NOT send SMS.
  ============================================================ */

  const handleReviewCampaign = async () => {
    clearMessages();
    setResultData(null);

    if (!campaignName.trim()) {
      setErrorType("normal");
      setErrorMessage(
        "Please enter a campaign name."
      );
      return;
    }

    if (!recipientCount) {
      setErrorType("normal");
      setErrorMessage(
        "Please add at least one valid recipient."
      );
      return;
    }

    if (invalidRecipientCount > 0) {
      setErrorType("normal");
      setErrorMessage(
        `${invalidRecipientCount} recipient(s) are invalid. Please correct or remove them.`
      );
      return;
    }

    if (!message.trim()) {
      setErrorType("normal");
      setErrorMessage(
        "Please enter your promotional message. You can include your business name and contact"
      );
      return;
    }

    setLoading(true);
    setProcessingText(
      "Checking..."
    );

    try {
      setProcessingText(
        "Checking..."
      );

      const reviewCampaign =
        httpsCallable<
          {
            campaignName: string;
            phoneNumbers: string[];
            message: string;
          },
          ReviewResponse
        >(
          functions,
          "reviewBulkSmsHandler"
        );

      const result =
        await reviewCampaign({
          campaignName:
            campaignName.trim(),
          phoneNumbers: recipientList,
          message: message.trim(),
        });

      setProcessingText(
        "AI reviewing message..."
      );

      setReviewData(result.data);

      /*
       * If AI rewrites the message, DO NOT automatically
       * replace the user's message.
       *
       * The user chooses.
       */

      setErrorMessage(null);
      setRejectedAudit(null);
    } catch (error: unknown) {
      console.error(
        "Campaign review error:",
        error
      );

      const err =
        error as FunctionError;

      const audit =
        err.details?.aiAudit;

      if (audit) {
        setRejectedAudit(audit);
      }

      const code =
        err.code || "";

      if (
        isInsufficientBalanceError(err)
      ) {
        setErrorType("balance");
      } else if (
        code.includes("internal") &&
        (
          err.message
            ?.toLowerCase()
            .includes("network") ||
          err.message
            ?.toLowerCase()
            .includes("internet") ||
          err.message
            ?.toLowerCase()
            .includes("failed to perform")
        )
      ) {
        setErrorType("internet");
      } else {
        setErrorType("normal");
      }

      setErrorMessage(
        err.message ||
          "Unable to review campaign."
      );
    } finally {
      setLoading(false);
      setProcessingText("");
    }
  };

  /* ============================================================
     SEND NOW
     
     This performs:
     
     approved
     → final balance check
     → DND check
     → Africa's Talking
  ============================================================ */

  const handleSendNow = async () => {
    if (!reviewData) return;

    clearMessages();
    setLoading(true);
    setProcessingText(
      "Processing..."
    );

    try {
      const sendCampaign =
        httpsCallable<
          {
            campaignId: string;
            selectedMessage: string;
            mode: "now";
          },
          CampaignResponse
        >(
          functions,
          "sendApprovedBulkSmsHandler"
        );

      const result =
        await sendCampaign({
          campaignId:
            reviewData.campaignId,
          selectedMessage:
            message.trim(),
          mode: "now",
        });

      setResultData(result.data);
      setReviewData(null);
    } catch (error: unknown) {
      console.error(
        "Send campaign error:",
        error
      );

      const err =
        error as FunctionError;

      const code =
        err.code || "";

      if (
        isInsufficientBalanceError(err)
      ) {
        setErrorType("balance");
      } else if (
        err.details?.code ===
        "DND_RESTRICTED"
      ) {
        setErrorType("dnd");
      } else if (
        code.includes("internal")
      ) {
        setErrorType("internet");
      } else {
        setErrorType("normal");
      }

      setErrorMessage(
        err.message ||
          "Unable to send campaign."
      );
    } finally {
      setLoading(false);
      setProcessingText("");
    }
  };

  /* ============================================================
     SCHEDULE
  ============================================================ */

  const handleScheduleCampaign =
    async () => {
      if (!reviewData) return;

      clearMessages();

      if (!scheduleDate) {
        setErrorType("normal");
        setErrorMessage(
          "Please select a schedule date."
        );
        return;
      }

      if (!scheduleTime) {
        setErrorType("normal");
        setErrorMessage(
          "Please select a schedule time."
        );
        return;
      }

      const hour = Number(
        scheduleTime.split(":")[0]
      );

      if (
        hour < 8 ||
        hour >= 20
      ) {
        setErrorType("dnd");
        setErrorMessage(
          "Scheduled SMS must be between 8:00 AM and 8:00 PM."
        );
        return;
      }

      setLoading(true);
      setProcessingText(
        "Processing..."
      );

      try {
        const scheduleCampaign =
          httpsCallable<
            {
              campaignId: string;
              selectedMessage: string;
              scheduledFor: string;
            },
            CampaignResponse
          >(
            functions,
            "scheduleBulkSmsHandler"
          );

        /*
         * Local datetime is sent without converting
         * to the browser's UTC string. The backend treats
         * it as Africa/Lagos time.
         */

        const scheduledFor =
          `${scheduleDate}T${scheduleTime}:00`;

        const result =
          await scheduleCampaign({
            campaignId:
              reviewData.campaignId,
            selectedMessage:
              message.trim(),
            scheduledFor,
          });

        setResultData(result.data);
        setReviewData(null);
        setShowSchedule(false);
      } catch (error: unknown) {
        console.error(
          "Schedule campaign error:",
          error
        );

        const err =
          error as FunctionError;

        const code =
          err.code || "";

        if (
          code.includes(
            "failed-precondition"
          ) ||
          err.message
            ?.toLowerCase()
            .includes(
              "insufficient balance"
            )
        ) {
          setErrorType("balance");
        } else if (
          err.details?.code ===
          "DND_RESTRICTED"
        ) {
          setErrorType("dnd");
        } else {
          setErrorType("normal");
        }

        setErrorMessage(
          err.message ||
            "Unable to schedule campaign."
        );
      } finally {
        setLoading(false);
        setProcessingText("");
      }
    };

  /* ============================================================
     CANCEL REVIEW
  ============================================================ */

  const cancelReview = () => {
    setReviewData(null);
    setShowSchedule(false);
    clearMessages();
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 sm:p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="border-b border-gray-200 pb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Bulk SMS Campaign Text
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Create, review, schedule and send
            promotional SMS.
          </p>
        </div>

        {/* ======================================================
            ERROR DISPLAY
        ====================================================== */}

        {errorMessage && (
          <div
            className={`rounded-xl border p-4 ${
              errorType === "balance"
                ? "bg-amber-50 border-amber-200"
                : errorType === "dnd"
                ? "bg-orange-50 border-orange-200"
                : errorType === "internet"
                ? "bg-red-50 border-red-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {errorType === "balance" ? (
                <Wallet
                  className="text-amber-600 shrink-0"
                  size={20}
                />
              ) : errorType === "dnd" ? (
                <Clock
                  className="text-orange-600 shrink-0"
                  size={20}
                />
              ) : errorType === "internet" ? (
                <RefreshCw
                  className="text-red-600 shrink-0"
                  size={20}
                />
              ) : (
                <XCircle
                  className="text-red-600 shrink-0"
                  size={20}
                />
              )}

              <div className="flex-1">
                <p
                  className={`font-bold text-sm ${
                    errorType === "balance"
                      ? "text-amber-900"
                      : errorType === "dnd"
                      ? "text-orange-900"
                      : "text-red-900"
                  }`}
                >
                  {errorType === "balance"
                    ? "Insufficient Balance"
                    : errorType === "dnd"
                    ? "SMS Sending Time Restriction"
                    : errorType === "internet"
                    ? "Connection Error"
                    : "Campaign Blocked"}
                </p>

                <p className="text-sm mt-1 text-gray-700">
                  {errorMessage}
                </p>

                {errorType === "balance" && (
                  <p className="text-xs text-amber-700 mt-2">
                    Send SMS, Get customers attention
                  </p>
                )}

                {errorType === "dnd" && (
                  <p className="text-xs text-orange-700 mt-2">
                    Nigerian promotional SMS can
                    only be sent between 8:00 AM
                    and 8:00 PM. You can schedule
                    the campaign for an allowed time.
                  </p>
                )}

                {errorType === "internet" && (
                  <p className="text-xs text-red-700 mt-2">
                    Please check your internet
                    connection and try again.
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  setErrorMessage(null);
                  setRejectedAudit(null);
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================
            MAIN FORM
        ====================================================== */}

        {!reviewData && !resultData && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-7 space-y-7">

            {/* --------------------------------------------------
                CAMPAIGN NAME
            -------------------------------------------------- */}

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                <FileText
                  size={16}
                  className="text-[#0b1575]"
                />
                Campaign Name
              </label>

              <input
                type="text"
                value={campaignName}
                onChange={(e) =>
                  setCampaignName(
                    e.target.value
                  )
                }
                placeholder="e.g.Sales Promotion"
                maxLength={100}
                className="w-full p-3.5 border border-gray-300 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#0b1575] focus:border-transparent"
              />

              <p className="text-xs text-gray-400 mt-1.5">
                Give this campaign a name so you
                can identify it later.
              </p>
            </div>

            {/* --------------------------------------------------
                RECIPIENTS
            -------------------------------------------------- */}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <Users
                    size={16}
                    className="text-[#0b1575]"
                  />
                  Recipients
                </label>

                <span className="text-xs font-semibold text-gray-500">
                  {recipientCount}{" "}
                  {recipientCount === 1
                    ? "recipient"
                    : "recipients"}
                </span>
              </div>

              <textarea
                value={numbersText}
                onChange={(e) =>
                  setNumbersText(
                    e.target.value
                  )
                }
                placeholder={
                  "+2348010000000, +2349000000000"
                }
                rows={6}
                className="w-full p-3.5 border border-gray-300 rounded-xl text-sm text-gray-900 outline-none resize-y focus:ring-2 focus:ring-[#0b1575] focus:border-transparent"
              />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                <p className="text-xs text-gray-400">
                  Enter one number per line or
                  separate numbers with commas.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  <Upload size={15} />
                  Upload CSV
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={
                    handleCsvUpload
                  }
                  className="hidden"
                />
              </div>

              {csvFileName && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                  <FileText size={13} />
                  {csvFileName}
                </div>
              )}

              {invalidRecipientCount > 0 && (
                <p className="text-xs text-red-600 mt-2">
                  {invalidRecipientCount} invalid
                  recipient(s) detected.
                </p>
              )}
            </div>

            {/* --------------------------------------------------
                MESSAGE
            -------------------------------------------------- */}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-800">
                  Promotional SMS Message
                </label>

                <span className="text-xs font-medium text-gray-500">
                  {charCount} characters ·{" "}
                  {smsPages}{" "}
                  {smsPages === 1
                    ? "SMS"
                    : "SMS segments"}
                </span>
              </div>

              <textarea
                value={message}
                onChange={(e) =>
                  setMessage(
                    e.target.value
                  )
                }
                placeholder="Type your promotional message here..."
                rows={7}
                className="w-full p-3.5 border border-gray-300 rounded-xl text-sm text-gray-900 outline-none resize-y focus:ring-2 focus:ring-[#0b1575] focus:border-transparent"
              />

              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>
                  Your message will be reviewed
                  before sending.
                </span>

                <span>
                  {totalUnits} estimated SMS
                  units
                </span>
              </div>
            </div>

            {/* --------------------------------------------------
                DND NOTICE
            -------------------------------------------------- */}

            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
              <Clock
                size={18}
                className="text-blue-600 mt-0.5 shrink-0"
              />

              <div>
                <p className="text-sm font-bold text-blue-900">
                  Nigeria SMS sending window
                </p>

                <p className="text-xs text-blue-700 mt-1">
                  Promotional SMS can only be sent
                  between <strong>8:00 AM</strong>{" "}
                  and <strong>8:00 PM</strong>.
                  Scheduled campaigns must also
                  fall within this window.
                </p>
              </div>
            </div>

            {/* --------------------------------------------------
                REVIEW BUTTON
            -------------------------------------------------- */}

            <button
              onClick={handleReviewCampaign}
              disabled={
                loading ||
                !campaignName.trim() ||
                recipientCount === 0 ||
                !message.trim()
              }
              className="w-full py-3.5 px-4 bg-[#0b1575] hover:bg-[#081059] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw
                    size={17}
                    className="animate-spin"
                  />
                  {processingText ||
                    "Processing..."}
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                   Review
                </>
              )}
            </button>
          </div>
        )}

        {/* ======================================================
            AI REVIEW / USER CHOICE
        ====================================================== */}

        {reviewData && (
          <div className="space-y-5">

            {/* APPROVED HEADER */}

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={24}
                  className="text-emerald-600 shrink-0"
                />

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-emerald-900">
                      Message Approved
                    </h2>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold uppercase">
                      {reviewData.aiAudit.category}
                    </span>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase">
                      {reviewData.aiAudit.riskLevel} risk
                    </span>
                  </div>

                  <p className="text-sm text-emerald-700 mt-1">
                    Your campaign passed the
                    compliance review. Nothing has
                    been sent yet.
                  </p>
                </div>
              </div>
            </div>

            {/* MESSAGE CHOICE */}

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-7 space-y-5">

              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Choose your message
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  You can use your original message,
                  apply an AI suggestion, or edit
                  the message yourself.
                </p>
              </div>

              {/* USER MESSAGE */}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Final message
                  </label>

                  <span className="text-xs text-gray-500">
                    {message.length} characters
                  </span>
                </div>

                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  rows={6}
                  className="w-full p-3.5 border border-gray-300 rounded-xl text-sm text-gray-900 outline-none resize-y focus:ring-2 focus:ring-[#0b1575] focus:border-transparent"
                />
              </div>

              {/* AI SUGGESTIONS */}

              {(reviewData.aiAudit
                .suggestedMessage ||
                reviewData.aiAudit
                  .suggestedAlternatives
                  ?.length > 0) && (
                <div className="border-t pt-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles
                      size={16}
                      className="text-purple-600"
                    />

                    <p className="text-sm font-bold text-gray-800">
                      AI suggestions
                    </p>
                  </div>

                  {reviewData.aiAudit
                    .suggestedMessage && (
                    <button
                      type="button"
                      onClick={() =>
                        handleApplySuggestion(
                          reviewData.aiAudit
                            .suggestedMessage!
                        )
                      }
                      className="w-full text-left p-4 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition"
                    >
                      <div className="flex justify-between gap-3">
                        <span className="text-xs font-bold text-purple-900">
                          Recommended
                        </span>

                        <span className="text-[10px] font-bold text-purple-700">
                          USE THIS
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mt-2">
                        &quot;
                        {
                          reviewData.aiAudit
                            .suggestedMessage
                        }
                        &quot;
                      </p>
                    </button>
                  )}

                  {reviewData.aiAudit
                    .suggestedAlternatives
                    ?.map(
                      (
                        alternative,
                        index
                      ) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() =>
                            handleApplySuggestion(
                              alternative
                            )
                          }
                          className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#0b1575] hover:bg-gray-50 transition"
                        >
                          <div className="flex justify-between gap-3">
                            <span className="text-xs font-bold text-gray-700">
                              Alternative{" "}
                              {index + 1}
                            </span>

                            <span className="text-[10px] font-bold text-[#0b1575]">
                              USE THIS
                            </span>
                          </div>

                          <p className="text-sm text-gray-700 mt-2">
                            &quot;{alternative}&quot;
                          </p>
                        </button>
                      )
                    )}
                </div>
              )}

              {/* CAMPAIGN SUMMARY */}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t pt-5">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    Campaign
                  </p>
                  <p className="text-xs font-bold text-gray-800 mt-1 truncate">
                    {reviewData.campaignName}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    Recipients
                  </p>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    {reviewData.recipientCount}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    SMS Units
                  </p>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    {reviewData.totalUnits}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    Estimated Cost
                  </p>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    ₦
                    {reviewData.estimatedCost.toFixed(
                      2
                    )}
                  </p>
                </div>
              </div>

              {/* ACTIONS */}

              {!showSchedule ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">

                  <button
                    onClick={handleSendNow}
                    disabled={
                      loading ||
                      !message.trim()
                    }
                    className="py-3.5 rounded-xl bg-[#0b1575] hover:bg-[#081059] disabled:bg-gray-300 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
                  >
                    {loading ? (
                      <>
                        <RefreshCw
                          size={17}
                          className="animate-spin"
                        />
                        {processingText}
                      </>
                    ) : (
                      <>
                        <Send size={17} />
                        Send Now
                      </>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      setShowSchedule(true)
                    }
                    disabled={loading}
                    className="py-3.5 rounded-xl border border-[#0b1575] text-[#0b1575] hover:bg-blue-50 disabled:bg-gray-100 font-bold text-sm flex items-center justify-center gap-2 transition"
                  >
                    <CalendarClock
                      size={17}
                    />
                    Schedule Later
                  </button>
                </div>
              ) : (
                /* SCHEDULE PANEL */

                <div className="border-t pt-5 space-y-4">

                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      Schedule Campaign
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      Select a date and time between
                      8:00 AM and 8:00 PM.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        Date
                      </label>

                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) =>
                          setScheduleDate(
                            e.target.value
                          )
                        }
                        min={
                          new Date()
                            .toISOString()
                            .split("T")[0]
                        }
                        className="w-full p-3 border border-gray-300 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#0b1575]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        Time
                      </label>

                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) =>
                          setScheduleTime(
                            e.target.value
                          )
                        }
                        min="08:00"
                        max="19:59"
                        className="w-full p-3 border border-gray-300 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#0b1575]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={
                        handleScheduleCampaign
                      }
                      disabled={loading}
                      className="flex-1 py-3.5 rounded-xl bg-[#0b1575] hover:bg-[#081059] disabled:bg-gray-300 text-white font-bold text-sm flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <RefreshCw
                            size={17}
                            className="animate-spin"
                          />
                          {processingText}
                        </>
                      ) : (
                        <>
                          <CalendarClock
                            size={17}
                          />
                          Confirm Schedule
                        </>
                      )}
                    </button>

                    <button
                      onClick={() =>
                        setShowSchedule(false)
                      }
                      disabled={loading}
                      className="px-6 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={cancelReview}
                disabled={loading}
                className="w-full text-xs text-gray-500 hover:text-gray-800 pt-1"
              >
                Cancel campaign
              </button>
            </div>
          </div>
        )}

        {/* ======================================================
            SUCCESS / SCHEDULED RESULT
        ====================================================== */}

        {resultData && (
          <div
            className={`rounded-2xl border p-6 ${
              resultData.status ===
              "scheduled"
                ? "bg-blue-50 border-blue-200"
                : resultData.status ===
                  "successful"
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {resultData.status ===
              "scheduled" ? (
                <CalendarClock
                  size={26}
                  className="text-blue-600 shrink-0"
                />
              ) : resultData.status ===
                "successful" ? (
                <CheckCircle2
                  size={26}
                  className="text-emerald-600 shrink-0"
                />
              ) : (
                <XCircle
                  size={26}
                  className="text-red-600 shrink-0"
                />
              )}

              <div className="flex-1">
                <h2
                  className={`text-lg font-bold ${
                    resultData.status ===
                    "scheduled"
                      ? "text-blue-900"
                      : resultData.status ===
                        "successful"
                      ? "text-emerald-900"
                      : "text-red-900"
                  }`}
                >
                  {resultData.status ===
                  "scheduled"
                    ? "Campaign Scheduled"
                    : resultData.status ===
                      "successful"
                    ? "Campaign Sent Successfully"
                    : "Campaign Failed"}
                </h2>

                <p className="text-sm text-gray-700 mt-1">
                  {resultData.status ===
                  "scheduled"
                    ? `Your campaign is scheduled for ${resultData.scheduledFor || "the selected time"}.`
                    : resultData.message ||
                      "The campaign has been processed."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                  <div>
                    <p className="text-xs text-gray-500">
                      Campaign
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {resultData.campaignName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Reference
                    </p>
                    <p className="text-sm font-mono font-bold text-gray-900">
                      {resultData.reference}
                    </p>
                  </div>

                  {resultData.amountCharged !==
                    undefined && (
                    <div>
                      <p className="text-xs text-gray-500">
                        Amount
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        ₦
                        {resultData.amountCharged.toFixed(
                          2
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setResultData(null);
                    setCampaignName("");
                    setNumbersText("");
                    setMessage("");
                    setCsvFileName("");
                  }}
                  className="mt-5 px-5 py-2.5 rounded-lg bg-white border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Create New Campaign
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            AI REJECTION
        ====================================================== */}

        {rejectedAudit && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <XCircle
                className="text-red-600 shrink-0"
                size={22}
              />

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-red-900 text-sm">
                    Message Blocked
                  </h3>

                  <span className="px-2 py-1 rounded-full bg-red-200 text-red-900 text-[10px] font-bold uppercase">
                    {rejectedAudit.riskLevel} risk
                  </span>
                </div>

                <p className="text-sm text-red-800 mt-2">
                  {rejectedAudit.reason}
                </p>

                {rejectedAudit
                  .suggestedAlternatives
                  ?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-bold text-gray-700">
                      Suggested compliant messages
                    </p>

                    {rejectedAudit.suggestedAlternatives.map(
                      (
                        alternative,
                        index
                      ) => (
                        <button
                          key={index}
                          onClick={() =>
                            handleApplySuggestion(
                              alternative
                            )
                          }
                          className="w-full text-left p-3 bg-white border border-red-200 rounded-lg hover:border-[#0b1575]"
                        >
                          <p className="text-xs text-gray-800">
                            {alternative}
                          </p>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            FOOTER INFORMATION
        ====================================================== */}

        {!resultData && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pb-6">
            <AlertTriangle size={13} />
            Promotional SMS only. Always obtain
            appropriate recipient consent.
          </div>
        )}
      </div>
    </div>
  );
}