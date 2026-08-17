"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import BalanceCard from "@/components/BalanceCard";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* ============================================================
   TYPES
============================================================ */

interface BulkSmsTransaction {
  reference?: string;
  campaignName?: string;
  status?: string;

  recipientCount?: number;
  totalUnits?: number;
  amountCharged?: number;
  estimatedCost?: number;

  created_at?: unknown;
  scheduledFor?: unknown;
}

interface ChartDataItem {
  date: string;
  campaigns: number;
  recipients: number;
  units: number;
}

/* ============================================================
   HELPERS
============================================================ */

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
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

function getDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    ).toDate();
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

function getStatusLabel(status: string): string {
  if (!status) {
    return "Unknown";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

/* ============================================================
   STAT CARD
============================================================ */

interface StatCardProps {
  title: string;
  value: string;
  description: string;
}

function StatCard({
  title,
  value,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

/* ============================================================
   CUSTOM TOOLTIP
============================================================ */

interface TooltipPayload {
  value?: number;
  name?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
      {label ? (
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>
      ) : null}

      {payload.map((item, index) => (
        <div
          key={`${item.name ?? "value"}-${index}`}
          className="flex items-center justify-between gap-6"
        >
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {item.name === "campaigns"
              ? "Campaigns"
              : item.name === "recipients"
                ? "Recipients"
                : item.name === "units"
                  ? "SMS Units"
                  : item.name ?? "Value"}
          </span>

          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatNumber(toNumber(item.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   DASHBOARD
============================================================ */

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<
    BulkSmsTransaction[]
  >([]);

  const [transactionsLoading, setTransactionsLoading] =
    useState(true);

  /* ============================================================
     AUTH REDIRECT
  ============================================================ */

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  /* ============================================================
     LOAD BULK SMS TRANSACTIONS
     
     IMPORTANT:
     Do NOT call setTransactionsLoading(true) synchronously
     inside this effect. The initial state is already true.
  ============================================================ */

  useEffect(() => {
    if (!user) {
      return;
    }

    const transactionsRef = collection(
      db,
      "bulksms_transactions",
      user.uid,
      "transactions",
    );

    const transactionsQuery = query(
      transactionsRef,
      orderBy("created_at", "asc"),
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const data: BulkSmsTransaction[] =
          snapshot.docs.map((transactionDoc) => {
            const raw = transactionDoc.data();

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

              amountCharged: toNumber(
                raw.amountCharged,
              ),

              estimatedCost: toNumber(
                raw.estimatedCost,
              ),

              created_at: raw.created_at ?? null,

              scheduledFor:
                raw.scheduledFor ?? null,
            };
          });

        setTransactions(data);
        setTransactionsLoading(false);
      },
      (error) => {
        console.error(
          "Failed to load dashboard transactions:",
          error,
        );

        setTransactions([]);
        setTransactionsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  /* ============================================================
     RESET LOADING STATE WHEN USER DISAPPEARS
     
     This is derived behavior rather than a synchronous state
     update in the Firestore subscription effect.
  ============================================================ */

  const effectiveTransactionsLoading =
    Boolean(user) && transactionsLoading;

  /* ============================================================
     STATISTICS
  ============================================================ */

  const statistics = useMemo(() => {
    let successful = 0;
    let failed = 0;
    let scheduled = 0;
    let processing = 0;
    let pending = 0;
    let cancelled = 0;

    let recipients = 0;
    let units = 0;
    let amountCharged = 0;
    let estimatedCost = 0;

    transactions.forEach((transaction) => {
      const status =
        transaction.status?.toLowerCase() ?? "";

      switch (status) {
        case "successful":
        case "success":
          successful += 1;
          break;

        case "failed":
          failed += 1;
          break;

        case "scheduled":
          scheduled += 1;
          break;

        case "processing":
          processing += 1;
          break;

        case "pending":
          pending += 1;
          break;

        case "cancelled":
        case "canceled":
          cancelled += 1;
          break;

        default:
          break;
      }

      recipients += toNumber(
        transaction.recipientCount,
      );

      units += toNumber(transaction.totalUnits);

      amountCharged += toNumber(
        transaction.amountCharged,
      );

      estimatedCost += toNumber(
        transaction.estimatedCost,
      );
    });

    const campaigns = transactions.length;

    const successRate =
      campaigns > 0
        ? (successful / campaigns) * 100
        : 0;

    return {
      campaigns,
      successful,
      failed,
      scheduled,
      processing,
      pending,
      cancelled,
      recipients,
      units,
      amountCharged,
      estimatedCost,
      successRate,
    };
  }, [transactions]);

  /* ============================================================
     CHART DATA
  ============================================================ */

  const chartData = useMemo<ChartDataItem[]>(() => {
    const grouped = new Map<
      string,
      ChartDataItem
    >();

    transactions.forEach((transaction) => {
      const date = getDate(transaction.created_at);

      if (!date) {
        return;
      }

      /*
       * Use the actual date as the map key so two dates with
       * different formatted labels can never collide.
       */
      const dateKey = date.toISOString().slice(0, 10);

      const displayDate = date.toLocaleDateString(
        "en-NG",
        {
          day: "numeric",
          month: "short",
        },
      );

      const current = grouped.get(dateKey);

      if (current) {
        current.campaigns += 1;

        current.recipients += toNumber(
          transaction.recipientCount,
        );

        current.units += toNumber(
          transaction.totalUnits,
        );
      } else {
        grouped.set(dateKey, {
          date: displayDate,
          campaigns: 1,
          recipients: toNumber(
            transaction.recipientCount,
          ),
          units: toNumber(transaction.totalUnits),
        });
      }
    });

    return Array.from(grouped.entries())
      .sort(([dateA], [dateB]) =>
        dateA.localeCompare(dateB),
      )
      .map(([, values]) => values);
  }, [transactions]);

  /* ============================================================
     RECENT TRANSACTIONS
  ============================================================ */

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .reverse()
      .slice(0, 5);
  }, [transactions]);

  /* ============================================================
     SESSION LOADING
  ============================================================ */

  if (loading || !user) {
    return (
      <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
        Loading session...
      </div>
    );
  }

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ======================================================
         HEADER
      ====================================================== */}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Welcome, {user.displayName || "User"}
        </h1>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Here&apos;s an overview of your bulk SMS activity.
        </p>
      </div>

      {/* ======================================================
   BALANCE
====================================================== */}

<div className="w-full [&>div]:!w-full [&>div]:!max-w-none">
  <BalanceCard />
</div>
      {/* ======================================================
         STATISTICS CARDS
      ====================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Campaigns"
          value={formatNumber(
            statistics.campaigns,
          )}
          description="Bulk SMS campaigns"
        />

        <StatCard
          title="Recipients"
          value={formatNumber(
            statistics.recipients,
          )}
          description="Total recipients"
        />

        <StatCard
          title="SMS Units"
          value={formatNumber(
            statistics.units,
          )}
          description="Total SMS units"
        />

        <StatCard
          title="Amount Spent"
          value={formatCurrency(
            statistics.amountCharged,
          )}
          description="Total amount charged"
        />
      </section>

      {/* ======================================================
         CHART + STATUS
      ====================================================== */}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ====================================================
           ACTIVITY CHART
        ==================================================== */}

        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              SMS Activity
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Campaign activity over time.
            </p>
          </div>

          {effectiveTransactionsLoading ? (
            <div className="h-[320px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ) : chartData.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  No activity yet
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your SMS activity will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="campaignGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopOpacity={0.2}
                      />

                      <stop
                        offset="100%"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                    }}
                    allowDecimals={false}
                  />

                  <Tooltip
                    content={<ChartTooltip />}
                  />

                  <Area
                    type="monotone"
                    dataKey="campaigns"
                    name="campaigns"
                    strokeWidth={2.5}
                    fill="url(#campaignGradient)"
                    fillOpacity={1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ====================================================
           CAMPAIGN STATUS
        ==================================================== */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Campaign Status
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Current campaign breakdown.
            </p>
          </div>

          <div className="space-y-5">
            <StatusItem
              label="Successful"
              value={statistics.successful}
              total={statistics.campaigns}
            />

            <StatusItem
              label="Scheduled"
              value={statistics.scheduled}
              total={statistics.campaigns}
            />

            <StatusItem
              label="Failed"
              value={statistics.failed}
              total={statistics.campaigns}
            />

            <StatusItem
              label="Processing"
              value={statistics.processing}
              total={statistics.campaigns}
            />

            <StatusItem
              label="Pending"
              value={statistics.pending}
              total={statistics.campaigns}
            />
          </div>

          {/* TOTAL */}

          <div className="mt-7 border-t border-gray-100 pt-5 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Total campaigns
              </span>

              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatNumber(
                  statistics.campaigns,
                )}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Success rate
              </span>

              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {statistics.successRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
         RECENT CAMPAIGNS
      ====================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800 sm:px-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Recent Campaigns
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your latest bulk SMS activity.
          </p>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No campaigns yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentTransactions.map(
              (transaction, index) => {
                const status =
                  transaction.status?.toLowerCase() ??
                  "unknown";

                const date = getDate(
                  transaction.created_at,
                );

                return (
                  <div
                    key={
                      transaction.reference ??
                      `${transaction.campaignName ?? "campaign"}-${index}`
                    }
                    className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    {/* CAMPAIGN */}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {transaction.campaignName ||
                          "Unnamed campaign"}
                      </p>

                      {transaction.reference ? (
                        <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                          {transaction.reference}
                        </p>
                      ) : null}

                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {date
                          ? date.toLocaleDateString(
                              "en-NG",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "Date unavailable"}
                      </p>
                    </div>

                    {/* DETAILS */}

                    <div className="flex flex-wrap items-center gap-5">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Recipients
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                          {formatNumber(
                            toNumber(
                              transaction.recipientCount,
                            ),
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          SMS Units
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
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

                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(
                            toNumber(
                              transaction.amountCharged,
                            ),
                          )}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          status === "successful" ||
                          status === "success"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            : status === "failed"
                              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                              : status === "scheduled"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                : status === "processing"
                                  ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {getStatusLabel(status)}
                      </span>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   STATUS ITEM
============================================================ */

interface StatusItemProps {
  label: string;
  value: number;
  total: number;
}

function StatusItem({
  label,
  value,
  total,
}: StatusItemProps) {
  const percentage =
    total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {label}
        </span>

        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatNumber(value)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-gray-900 transition-all dark:bg-white"
          style={{
            width: `${Math.min(percentage, 100)}%`,
          }}
        />
      </div>

      <p className="mt-1 text-right text-xs text-gray-400">
        {percentage.toFixed(1)}%
      </p>
    </div>
  );
}