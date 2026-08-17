"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  DocumentData,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../lib/firebase";

/* ============================================================
   TYPES
============================================================ */

type FirestoreInt64 = {
  low: number;
  high?: number;
  unsigned?: boolean;
};

type FirestoreDateLike = {
  toDate: () => Date;
};

type Tx = {
  id: string;
  reference?: string;
  campaignName?: string;
  status?: string;
  recipientCount?: number;
  amountCharged?: number;
  estimatedCost?: number;
  selectedMessage?: string;
  originalMessage?: string;
  scheduledFor?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  pagesPerRecipient?: number;
  totalUnits?: number;
  recipients?: string[];
  walletDeducted?: boolean;
  isApproved?: boolean;
  category?: string;
};

type Filter =
  | "all"
  | "successful"
  | "scheduled"
  | "processing"
  | "failed";

/* ============================================================
   TYPE GUARDS
============================================================ */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFirestoreInt64(value: unknown): value is FirestoreInt64 {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.low === "number" &&
    Number.isFinite(value.low)
  );
}

function isFirestoreDateLike(
  value: unknown
): value is FirestoreDateLike {
  if (!isObject(value)) {
    return false;
  }

  return typeof value.toDate === "function";
}

/* ============================================================
   SAFE VALUE HELPERS
============================================================ */

function num(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (isFirestoreInt64(value)) {
    return value.low;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/* ============================================================
   DATE HELPERS
============================================================ */

function dateOf(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (isFirestoreDateLike(value)) {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }

  if (
    typeof value === "number" ||
    typeof value === "string"
  ) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function dateText(value: unknown): string {
  const date = dateOf(value);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/* ============================================================
   MONEY
============================================================ */

function money(value: unknown): string {
  return `₦${num(value).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ============================================================
   STATUS
============================================================ */

function status(value: unknown): string {
  return str(value).toLowerCase().trim();
}

function statusName(value: string): string {
  const names: Record<string, string> = {
    successful: "Successful",
    success: "Successful",
    completed: "Successful",
    scheduled: "Scheduled",
    processing: "Processing",
    pending: "Processing",
    failed: "Failed",
    failure: "Failed",
    cancelled: "Cancelled",
    canceled: "Cancelled",
  };

  if (names[value]) {
    return names[value];
  }

  if (!value) {
    return "Unknown";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function matchesStatus(
  currentStatus: string,
  filter: Filter
): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "successful") {
    return [
      "successful",
      "success",
      "completed",
    ].includes(currentStatus);
  }

  if (filter === "processing") {
    return [
      "processing",
      "pending",
    ].includes(currentStatus);
  }

  return currentStatus === filter;
}

/* ============================================================
   FIRESTORE MAPPING
============================================================ */

function mapTransaction(
  id: string,
  data: DocumentData
): Tx {
  return {
    id,

    reference:
      typeof data.reference === "string"
        ? data.reference
        : undefined,

    campaignName:
      typeof data.campaignName === "string"
        ? data.campaignName
        : undefined,

    status:
      typeof data.status === "string"
        ? data.status
        : undefined,

    recipientCount:
      data.recipientCount !== undefined
        ? num(data.recipientCount)
        : undefined,

    amountCharged:
      data.amountCharged !== undefined
        ? num(data.amountCharged)
        : undefined,

    estimatedCost:
      data.estimatedCost !== undefined
        ? num(data.estimatedCost)
        : undefined,

    selectedMessage:
      typeof data.selectedMessage === "string"
        ? data.selectedMessage
        : undefined,

    originalMessage:
      typeof data.originalMessage === "string"
        ? data.originalMessage
        : undefined,

    scheduledFor: data.scheduledFor,
    created_at: data.created_at,
    updated_at: data.updated_at,

    pagesPerRecipient:
      data.pagesPerRecipient !== undefined
        ? num(data.pagesPerRecipient)
        : undefined,

    totalUnits:
      data.totalUnits !== undefined
        ? num(data.totalUnits)
        : undefined,

    recipients:
      Array.isArray(data.recipients)
        ? data.recipients.filter(
            (recipient: unknown): recipient is string =>
              typeof recipient === "string"
          )
        : undefined,

    walletDeducted:
      typeof data.walletDeducted === "boolean"
        ? data.walletDeducted
        : undefined,

    isApproved:
      typeof data.isApproved === "boolean"
        ? data.isApproved
        : undefined,

    category:
      typeof data.category === "string"
        ? data.category
        : undefined,
  };
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [selectedTransaction, setSelectedTransaction] =
    useState<Tx | null>(null);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          if (!cancelled) {
            setTransactions([]);
            setError(
              "Please sign in to view your transaction history."
            );
            setLoading(false);
          }

          return;
        }

        try {
          setLoading(true);
          setError("");

          const transactionsRef = collection(
            db,
            "bulksms_transactions",
            user.uid,
            "transactions"
          );

          let snapshot;

          try {
            snapshot = await getDocs(
              query(
                transactionsRef,
                orderBy("created_at", "desc"),
                limit(100)
              )
            );
          } catch {
            snapshot = await getDocs(
              query(
                transactionsRef,
                limit(100)
              )
            );
          }

          if (cancelled) {
            return;
          }

          const rows = snapshot.docs.map(
            (document) =>
              mapTransaction(
                document.id,
                document.data()
              )
          );

          rows.sort((a, b) => {
            const first =
              dateOf(a.created_at)?.getTime() ?? 0;

            const second =
              dateOf(b.created_at)?.getTime() ?? 0;

            return second - first;
          });

          setTransactions(rows);
        } catch (loadError) {
          if (!cancelled) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Unable to load transaction history."
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  /* ============================================================
     FILTERED TRANSACTIONS
  ============================================================ */

  const filteredTransactions = useMemo(() => {
    const searchTerm = search
      .trim()
      .toLowerCase();

    return transactions.filter((transaction) => {
      const currentStatus = status(
        transaction.status
      );

      if (
        !matchesStatus(
          currentStatus,
          filter
        )
      ) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      return [
        transaction.campaignName,
        transaction.reference,
        transaction.id,
        transaction.selectedMessage,
        transaction.originalMessage,
        transaction.category,
      ]
        .filter(
          (value): value is string =>
            Boolean(value)
        )
        .some((value) =>
          value
            .toLowerCase()
            .includes(searchTerm)
        );
    });
  }, [
    transactions,
    search,
    filter,
  ]);

  /* ============================================================
     SUMMARY
  ============================================================ */

  const summary = useMemo(() => {
    const successful =
      transactions.filter((transaction) =>
        [
          "successful",
          "success",
          "completed",
        ].includes(
          status(transaction.status)
        )
      ).length;

    const scheduled =
      transactions.filter(
        (transaction) =>
          status(transaction.status) ===
          "scheduled"
      ).length;

    const spent =
      transactions.reduce(
        (total, transaction) =>
          total +
          num(transaction.amountCharged),
        0
      );

    return {
      total: transactions.length,
      successful,
      scheduled,
      spent,
    };
  }, [transactions]);

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 text-slate-900 dark:bg-[#0b0d10] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <header className="mb-7">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Bulk SMS
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Transaction History
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            View your bulk SMS campaigns,
            charges, recipients and status.
          </p>
        </header>

        {/* SUMMARY */}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="Total campaigns"
            value={summary.total}
          />

          <SummaryCard
            label="Successful"
            value={summary.successful}
          />

          <SummaryCard
            label="Scheduled"
            value={summary.scheduled}
          />

          <SummaryCard
            label="Total charged"
            value={money(summary.spent)}
          />
        </div>

        {/* SEARCH + FILTERS */}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#111418] sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative w-full lg:max-w-md">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search campaigns or reference..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/[.04] dark:focus:border-white/25"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {(
                [
                  "all",
                  "successful",
                  "scheduled",
                  "processing",
                  "failed",
                ] as Filter[]
              ).map((currentFilter) => (
                <button
                  key={currentFilter}
                  type="button"
                  onClick={() =>
                    setFilter(currentFilter)
                  }
                  className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                    filter === currentFilter
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 dark:bg-white/[.06] dark:text-slate-300"
                  }`}
                >
                  {currentFilter === "all"
                    ? "All"
                    : statusName(
                        currentFilter
                      )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CONTENT */}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <EmptyState
            title="Unable to load transactions"
            message={error}
          />
        ) : filteredTransactions.length === 0 ? (
          <EmptyState
            title={
              search ||
              filter !== "all"
                ? "No matching transactions"
                : "No transactions yet"
            }
            message={
              search ||
              filter !== "all"
                ? "Try changing your search or status filter."
                : "Your bulk SMS transactions will appear here."
            }
          />
        ) : (
          <>
            {/* DESKTOP */}

            <DesktopTransactions
              transactions={
                filteredTransactions
              }
              onSelect={
                setSelectedTransaction
              }
            />

            {/* MOBILE */}

            <div className="space-y-3 lg:hidden">
              {filteredTransactions.map(
                (transaction) => (
                  <MobileTransaction
                    key={transaction.id}
                    transaction={
                      transaction
                    }
                    onSelect={
                      setSelectedTransaction
                    }
                  />
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* DETAILS MODAL */}

      {selectedTransaction && (
        <TransactionDetails
          transaction={
            selectedTransaction
          }
          close={() =>
            setSelectedTransaction(null)
          }
        />
      )}
    </main>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111418] sm:p-5">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-2 truncate text-xl font-semibold sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({
  value,
}: {
  value: string;
}) {
  const styles: Record<string, string> = {
    successful:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",

    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",

    completed:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",

    scheduled:
      "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",

    processing:
      "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",

    pending:
      "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",

    failed:
      "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300",

    failure:
      "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[value] ??
        "bg-slate-100 text-slate-600 dark:bg-white/[.08] dark:text-slate-300"
      }`}
    >
      {statusName(value)}
    </span>
  );
}

/* ============================================================
   DESKTOP TABLE
============================================================ */

function DesktopTransactions({
  transactions,
  onSelect,
}: {
  transactions: Tx[];
  onSelect: (transaction: Tx) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111418] lg:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[.025]">
            <tr className="text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-4">
                Campaign
              </th>

              <th className="px-5 py-4">
                Recipients
              </th>

              <th className="px-5 py-4">
                Amount
              </th>

              <th className="px-5 py-4">
                Scheduled
              </th>

              <th className="px-5 py-4">
                Status
              </th>

              <th />
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-white/[.06]">
            {transactions.map(
              (transaction) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-slate-50 dark:hover:bg-white/[.025]"
                >
                  <td className="max-w-[330px] px-5 py-4">
                    <p className="truncate text-sm font-semibold">
                      {transaction.campaignName ||
                        "Untitled campaign"}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {transaction.reference ||
                        transaction.id}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {transaction.recipientCount ??
                      transaction.recipients
                        ?.length ??
                      0}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium">
                    {money(
                      transaction.amountCharged
                    )}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {dateText(
                      transaction.scheduledFor
                    )}

                    <p className="mt-1 text-xs text-slate-500">
                      {dateText(
                        transaction.created_at
                      )}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge
                      value={status(
                        transaction.status
                      )}
                    />
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        onSelect(transaction)
                      }
                      className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/[.07]"
                    >
                      View
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   MOBILE TRANSACTION
============================================================ */

function MobileTransaction({
  transaction,
  onSelect,
}: {
  transaction: Tx;
  onSelect: (transaction: Tx) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(transaction)}
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-white/10 dark:bg-[#111418]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {transaction.campaignName ||
              "Untitled campaign"}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500">
            {transaction.reference ||
              transaction.id}
          </p>
        </div>

        <StatusBadge
          value={status(
            transaction.status
          )}
        />
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {transaction.selectedMessage ||
          transaction.originalMessage ||
          "No message available"}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 dark:border-white/[.06]">
        <MiniValue
          label="Recipients"
          value={String(
            transaction.recipientCount ??
              transaction.recipients
                ?.length ??
              0
          )}
        />

        <MiniValue
          label="Amount"
          value={money(
            transaction.amountCharged
          )}
        />

        <MiniValue
          label="Scheduled"
          value={dateText(
            transaction.scheduledFor
          )}
        />
      </div>
    </button>
  );
}

/* ============================================================
   MINI VALUE
============================================================ */

function MiniValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-medium">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   DETAILS MODAL
============================================================ */

function TransactionDetails({
  transaction,
  close,
}: {
  transaction: Tx;
  close: () => void;
}) {
  const recipientCount =
    transaction.recipientCount ??
    transaction.recipients?.length ??
    0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          close();
        }
      }}
    >
      <section className="max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-[#111418] sm:max-w-2xl sm:rounded-3xl">

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {transaction.campaignName ||
                "Transaction details"}
            </p>

            <p className="truncate text-xs text-slate-500">
              {transaction.reference ||
                transaction.id}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            className="rounded-xl p-2 text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="max-h-[calc(92vh-73px)] overflow-y-auto p-5 sm:p-6">

          <div className="mb-5 flex items-center justify-between">
            <StatusBadge
              value={status(
                transaction.status
              )}
            />

            {transaction.category && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-600 dark:bg-white/[.07] dark:text-slate-300">
                {transaction.category}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DetailStat
              label="Recipients"
              value={String(
                recipientCount
              )}
            />

            <DetailStat
              label="Amount charged"
              value={money(
                transaction.amountCharged
              )}
            />

            <DetailStat
              label="Estimated cost"
              value={money(
                transaction.estimatedCost
              )}
            />

            <DetailStat
              label="SMS units"
              value={
                transaction.totalUnits ===
                undefined
                  ? "—"
                  : String(
                      transaction.totalUnits
                    )
              }
            />
          </div>

          <div className="mt-5 space-y-4">

            {/* MESSAGE */}

            <DetailSection title="Message">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                {transaction.selectedMessage ||
                  transaction.originalMessage ||
                  "No message available"}
              </p>
            </DetailSection>

            {/* SCHEDULE */}

            <DetailSection title="Schedule">
              <DetailRow
                label="Scheduled for"
                value={dateText(
                  transaction.scheduledFor
                )}
              />

              <DetailRow
                label="Created"
                value={dateText(
                  transaction.created_at
                )}
              />

              <DetailRow
                label="Last updated"
                value={dateText(
                  transaction.updated_at
                )}
              />
            </DetailSection>

            {/* SMS DETAILS */}

            <DetailSection title="SMS details">
              <DetailRow
                label="Pages per recipient"
                value={
                  transaction.pagesPerRecipient ===
                  undefined
                    ? "—"
                    : String(
                        transaction.pagesPerRecipient
                      )
                }
              />

              <DetailRow
                label="Wallet"
                value={
                  transaction.walletDeducted ===
                  undefined
                    ? "—"
                    : transaction.walletDeducted
                    ? "Deducted"
                    : "Not deducted"
                }
              />

              <DetailRow
                label="Approved"
                value={
                  transaction.isApproved ===
                  undefined
                    ? "—"
                    : transaction.isApproved
                    ? "Yes"
                    : "No"
                }
              />
            </DetailSection>

            {/* RECIPIENTS */}

            {transaction.recipients &&
              transaction.recipients.length >
                0 && (
                <DetailSection
                  title={`Recipients (${recipientCount})`}
                >
                  <div className="max-h-44 overflow-y-auto rounded-xl bg-slate-50 p-3 dark:bg-white/[.04]">
                    {transaction.recipients.map(
                      (
                        recipient,
                        index
                      ) => (
                        <div
                          key={`${recipient}-${index}`}
                          className="flex justify-between py-1.5 text-sm"
                        >
                          <span className="text-slate-400">
                            {index + 1}
                          </span>

                          <span>
                            {recipient}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </DetailSection>
              )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   DETAIL COMPONENTS
============================================================ */

function DetailStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[.04]">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
      <h3 className="mb-3 text-sm font-semibold">
        {title}
      </h3>

      {children}
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-5 border-b border-slate-100 py-2.5 last:border-0 dark:border-white/[.06]">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="max-w-[60%] truncate text-right text-sm font-medium">
        {value}
      </span>
    </div>
  );
}

/* ============================================================
   LOADING
============================================================ */

function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(
        (item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111418]"
          />
        )
      )}
    </div>
  );
}

/* ============================================================
   EMPTY
============================================================ */

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center dark:border-white/15 dark:bg-[#111418]">
      <h2 className="text-base font-semibold">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {message}
      </p>
    </div>
  );
}