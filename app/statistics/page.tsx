"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

/* ============================================================
   TYPES
============================================================ */

type TransactionStatus =
  | "scheduled"
  | "successful"
  | "failed"
  | "processing"
  | "cancelled"
  | "pending"
  | string;

interface BulkSmsTransaction {
  reference?: string;
  campaignName?: string;
  status?: TransactionStatus;

  recipientCount?: number;
  totalUnits?: number;
  pagesPerRecipient?: number;

  amountCharged?: number;
  estimatedCost?: number;

  walletDeducted?: boolean;

  created_at?: Timestamp | Date | string | null;
  updated_at?: Timestamp | Date | string | null;
  scheduledFor?: Timestamp | Date | string | null;

  recipients?: string[];
}

/* ============================================================
   HELPERS
============================================================ */

function isTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  );
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "low" in value &&
    typeof (value as { low?: unknown }).low === "number"
  ) {
    return (value as { low: number }).low;
  }

  return 0;
}

function toDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (isTimestamp(value)) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-NG").format(value);
}

function formatCurrency(value: number): string {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: unknown): string {
  const date = toDate(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabel(status: string): string {
  if (!status) {
    return "Unknown";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

/* ============================================================
   ICONS
============================================================ */

function CampaignIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h10M7 13h6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SmsIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 8.7 3.9 8.38 8.38 0 0 1 12.5 3a8.5 8.5 0 0 1 8.5 8.5Z" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v8a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 11a8.1 8.1 0 0 0-14.8-4.8L3 9" />
      <path d="M3 4v5h5" />
      <path d="M4 13a8.1 8.1 0 0 0 14.8 4.8L21 15" />
      <path d="M21 20v-5h-5" />
    </svg>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>

          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            {value}
          </p>

          {subtitle ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STATUS ROW
============================================================ */

interface StatusRowProps {
  label: string;
  count: number;
  total: number;
}

function StatusRow({
  label,
  count,
  total,
}: StatusRowProps) {
  const percentage =
    total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>

        <span className="text-gray-500 dark:text-gray-400">
          {formatNumber(count)} · {percentage}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-gray-900 transition-all dark:bg-white"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function StatisticsPage() {
  const [uid, setUid] = useState<string | null>(null);

  /*
   * authReady is separate from uid.
   *
   * This prevents us from treating the initial "uid === null"
   * state as an unauthenticated user before Firebase finishes
   * checking the authentication state.
   */
  const [authReady, setAuthReady] = useState(false);

  const [transactions, setTransactions] = useState<
    BulkSmsTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(
    null,
  );

  /* ============================================================
     GET AUTHENTICATED USER
  ============================================================ */

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;

    const loadAuth = async () => {
      try {
        const { getAuth, onAuthStateChanged } = await import(
          "firebase/auth"
        );

        const auth = getAuth();

        unsubscribeAuth = onAuthStateChanged(auth, (user) => {
          /*
           * These state updates happen inside Firebase's
           * asynchronous auth callback, not synchronously in
           * the effect body.
           */
          setUid(user?.uid ?? null);
          setAuthReady(true);

          if (!user) {
            setTransactions([]);
            setLoading(false);
          }
        });
      } catch {
        setErrorMessage(
          "Unable to initialize authentication.",
        );
        setAuthReady(true);
        setLoading(false);
      }
    };

    void loadAuth();

    return () => {
      unsubscribeAuth?.();
    };
  }, []);

  /* ============================================================
     FIRESTORE LISTENER
  ============================================================ */

  useEffect(() => {
    /*
     * Do nothing until Firebase has finished determining
     * whether the user is authenticated.
     */
    if (!authReady || !uid) {
      return;
    }

    const transactionsRef = collection(
      db,
      "bulksms_transactions",
      uid,
      "transactions",
    );

    const transactionsQuery = query(
      transactionsRef,
      orderBy("created_at", "desc"),
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const data: BulkSmsTransaction[] = snapshot.docs.map(
          (document) => {
            const raw = document.data();

            return {
              reference:
                typeof raw.reference === "string"
                  ? raw.reference
                  : undefined,

              campaignName:
                typeof raw.campaignName === "string"
                  ? raw.campaignName
                  : undefined,

              status:
                typeof raw.status === "string"
                  ? raw.status
                  : undefined,

              recipientCount: toNumber(
                raw.recipientCount,
              ),

              totalUnits: toNumber(raw.totalUnits),

              pagesPerRecipient: toNumber(
                raw.pagesPerRecipient,
              ),

              amountCharged: toNumber(
                raw.amountCharged,
              ),

              estimatedCost: toNumber(
                raw.estimatedCost,
              ),

              walletDeducted:
                typeof raw.walletDeducted === "boolean"
                  ? raw.walletDeducted
                  : undefined,

              created_at: raw.created_at ?? null,

              updated_at: raw.updated_at ?? null,

              scheduledFor: raw.scheduledFor ?? null,

              recipients: Array.isArray(raw.recipients)
                ? raw.recipients.filter(
                    (recipient): recipient is string =>
                      typeof recipient === "string",
                  )
                : undefined,
            };
          },
        );

        /*
         * These are inside the asynchronous Firestore
         * snapshot callback, which is allowed by the lint rule.
         */
        setTransactions(data);
        setLoading(false);
        setErrorMessage(null);
      },
      (error) => {
        console.error(
          "Failed to load bulk SMS statistics:",
          error,
        );

        setErrorMessage(
          "Unable to load transaction statistics.",
        );

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [authReady, uid]);

  /* ============================================================
     STATISTICS
  ============================================================ */

  const statistics = useMemo(() => {
    let successful = 0;
    let scheduled = 0;
    let failed = 0;
    let processing = 0;
    let cancelled = 0;
    let pending = 0;

    let totalRecipients = 0;
    let totalUnits = 0;
    let totalAmountCharged = 0;
    let totalEstimatedCost = 0;

    let walletDeductedCount = 0;

    transactions.forEach((transaction) => {
      const status =
        transaction.status?.toLowerCase() ?? "";

      switch (status) {
        case "successful":
        case "success":
          successful += 1;
          break;

        case "scheduled":
          scheduled += 1;
          break;

        case "failed":
          failed += 1;
          break;

        case "processing":
          processing += 1;
          break;

        case "cancelled":
        case "canceled":
          cancelled += 1;
          break;

        case "pending":
          pending += 1;
          break;

        default:
          break;
      }

      totalRecipients += toNumber(
        transaction.recipientCount,
      );

      totalUnits += toNumber(
        transaction.totalUnits,
      );

      totalAmountCharged += toNumber(
        transaction.amountCharged,
      );

      totalEstimatedCost += toNumber(
        transaction.estimatedCost,
      );

      if (transaction.walletDeducted === true) {
        walletDeductedCount += 1;
      }
    });

    const totalCampaigns = transactions.length;

    const successRate =
      totalCampaigns > 0
        ? (successful / totalCampaigns) * 100
        : 0;

    const averageRecipients =
      totalCampaigns > 0
        ? totalRecipients / totalCampaigns
        : 0;

    const averageUnits =
      totalCampaigns > 0
        ? totalUnits / totalCampaigns
        : 0;

    return {
      totalCampaigns,
      successful,
      scheduled,
      failed,
      processing,
      cancelled,
      pending,
      totalRecipients,
      totalUnits,
      totalAmountCharged,
      totalEstimatedCost,
      walletDeductedCount,
      successRate,
      averageRecipients,
      averageUnits,
    };
  }, [transactions]);

  /* ============================================================
     RECENT TRANSACTIONS
  ============================================================ */

  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  /* ============================================================
     AUTH LOADING
  ============================================================ */

  if (!authReady) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  /* ============================================================
     NOT AUTHENTICATED
  ============================================================ */

  if (!uid) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Statistics
            </h1>

            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Please sign in to view your bulk SMS statistics.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-gray-950 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Statistics
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Overview of your bulk SMS campaigns and usage.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Live data
            <RefreshIcon />
          </div>
        </div>

        {/* ERROR */}

        {errorMessage ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {/* LOADING */}

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800"
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="h-72 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-72 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        ) : (
          <>
            {/* TOP STATISTICS */}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Campaigns"
                value={formatNumber(
                  statistics.totalCampaigns,
                )}
                subtitle="All campaigns"
                icon={<CampaignIcon />}
              />

              <StatCard
                title="Successful"
                value={formatNumber(
                  statistics.successful,
                )}
                subtitle={`${statistics.successRate.toFixed(
                  1,
                )}% success rate`}
                icon={<CheckIcon />}
              />

              <StatCard
                title="Scheduled"
                value={formatNumber(
                  statistics.scheduled,
                )}
                subtitle="Awaiting execution"
                icon={<ClockIcon />}
              />

              <StatCard
                title="Recipients"
                value={formatNumber(
                  statistics.totalRecipients,
                )}
                subtitle="Total recipients"
                icon={<UsersIcon />}
              />
            </section>

            {/* USAGE STATISTICS */}

            <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="SMS Units"
                value={formatNumber(
                  statistics.totalUnits,
                )}
                subtitle={`${statistics.averageUnits.toFixed(
                  1,
                )} average per campaign`}
                icon={<SmsIcon />}
              />

              <StatCard
                title="Amount Charged"
                value={formatCurrency(
                  statistics.totalAmountCharged,
                )}
                subtitle="Wallet charges"
                icon={<WalletIcon />}
              />

              <StatCard
                title="Estimated Cost"
                value={formatCurrency(
                  statistics.totalEstimatedCost,
                )}
                subtitle="Campaign estimates"
                icon={<WalletIcon />}
              />

              <StatCard
                title="Wallet Deducted"
                value={formatNumber(
                  statistics.walletDeductedCount,
                )}
                subtitle="Campaigns with deduction"
                icon={<WalletIcon />}
              />
            </section>

            {/* ANALYTICS */}

            <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

              {/* STATUS */}

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Campaign Status
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Breakdown of campaign outcomes.
                  </p>
                </div>

                <div className="space-y-5">
                  <StatusRow
                    label="Successful"
                    count={statistics.successful}
                    total={statistics.totalCampaigns}
                  />

                  <StatusRow
                    label="Scheduled"
                    count={statistics.scheduled}
                    total={statistics.totalCampaigns}
                  />

            
                  <StatusRow
                    label="Processing"
                    count={statistics.processing}
                    total={statistics.totalCampaigns}
                  />

                  <StatusRow
                    label="Pending"
                    count={statistics.pending}
                    total={statistics.totalCampaigns}
                  />

                  <StatusRow
                    label="Cancelled"
                    count={statistics.cancelled}
                    total={statistics.totalCampaigns}
                  />
                </div>
              </div>

              {/* PERFORMANCE */}

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Campaign Performance
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Key usage metrics calculated from your
                    transaction history.
                  </p>
                </div>

                <div className="space-y-6">

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Success rate
                      </span>

                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {statistics.successRate.toFixed(1)}%
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-gray-900 transition-all dark:bg-white"
                        style={{
                          width: `${Math.min(
                            statistics.successRate,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Avg. recipients
                      </p>

                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {statistics.averageRecipients.toFixed(
                          1,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Avg. SMS units
                      </p>

                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {statistics.averageUnits.toFixed(1)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Charged
                      </p>

                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(
                          statistics.totalAmountCharged,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Estimated cost
                      </p>

                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(
                          statistics.totalEstimatedCost,
                        )}
                      </p>
                    </div>

                  </div>
                </div>
              </div>
            </section>

            {/* RECENT ACTIVITY */}

            <section className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

              <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800 sm:px-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Recent Campaigns
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Your latest bulk SMS activity.
                </p>
              </div>

              {recentTransactions.length === 0 ? (
                <div className="px-5 py-12 text-center sm:px-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No transaction history available yet.
                  </p>
                </div>
              ) : (
                <>
                  {/* DESKTOP */}

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[700px]">
                      <thead>
                        <tr className="border-b border-gray-200 text-left dark:border-gray-800">

                          <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Campaign
                          </th>

                          <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Status
                          </th>

                          <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Recipients
                          </th>

                          <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Units
                          </th>

                          <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Amount
                          </th>

                          <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Date
                          </th>

                        </tr>
                      </thead>

                      <tbody>
                        {recentTransactions.map(
                          (transaction, index) => {
                            const status =
                              transaction.status?.toLowerCase() ??
                              "";

                            return (
                              <tr
                                key={
                                  transaction.reference ??
                                  `${transaction.campaignName ?? "campaign"}-${index}`
                                }
                                className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                              >

                                <td className="px-6 py-4">
                                  <div className="max-w-[220px]">
                                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                      {transaction.campaignName ||
                                        "Unnamed campaign"}
                                    </p>

                                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                                      {transaction.reference ||
                                        "No reference"}
                                    </p>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                      status === "successful" ||
                                      status === "success"
                                        ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                                        : status === "failed"
                                          ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                          : status === "scheduled"
                                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                    }`}
                                  >
                                    {getStatusLabel(
                                      transaction.status ??
                                        "unknown",
                                    )}
                                  </span>
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                  {formatNumber(
                                    toNumber(
                                      transaction.recipientCount,
                                    ),
                                  )}
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                  {formatNumber(
                                    toNumber(
                                      transaction.totalUnits,
                                    ),
                                  )}
                                </td>

                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(
                                    toNumber(
                                      transaction.amountCharged,
                                    ),
                                  )}
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                  {formatDate(
                                    transaction.created_at,
                                  )}
                                </td>

                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE */}

                  <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
                    {recentTransactions.map(
                      (transaction, index) => {
                        const status =
                          transaction.status?.toLowerCase() ??
                          "";

                        return (
                          <div
                            key={
                              transaction.reference ??
                              `${transaction.campaignName ?? "campaign"}-${index}`
                            }
                            className="p-5"
                          >
                            <div className="flex items-start justify-between gap-4">

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                  {transaction.campaignName ||
                                    "Unnamed campaign"}
                                </p>

                                <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                                  {transaction.reference ||
                                    "No reference"}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                                  status === "successful" ||
                                  status === "success"
                                    ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                                    : status === "failed"
                                      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                      : status === "scheduled"
                                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                              >
                                {getStatusLabel(
                                  transaction.status ??
                                    "unknown",
                                )}
                              </span>

                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">

                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Recipients
                                </p>

                                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                  {formatNumber(
                                    toNumber(
                                      transaction.recipientCount,
                                    ),
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  SMS units
                                </p>

                                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                  {formatNumber(
                                    toNumber(
                                      transaction.totalUnits,
                                    ),
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Amount
                                </p>

                                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(
                                    toNumber(
                                      transaction.amountCharged,
                                    ),
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Created
                                </p>

                                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                  {formatDate(
                                    transaction.created_at,
                                  )}
                                </p>
                              </div>

                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </>
              )}
            </section>

            {/* EMPTY STATE */}

            {transactions.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <SmsIcon />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
                  No SMS statistics yet
                </h3>

                <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
                  Once you create bulk SMS campaigns, their
                  statistics will appear here automatically.
                </p>

              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}