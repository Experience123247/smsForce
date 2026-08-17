"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Eye, EyeOff, ChevronRight, Copy, CheckCircle } from "lucide-react";

export default function BalanceCard() {
  const { user } = useAuth();

  // 1️⃣ Lazy state initialization directly from localStorage (No useEffect needed for cache)
  const [balance, setBalance] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("lastBalance");
      return cached !== null ? Number(cached) : 0;
    }
    return 0;
  });

  const [vaAccount, setVaAccount] = useState<{
    account_number: string;
    bank_name: string;
  } | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("lastVA");
      if (cached !== null) {
        try {
          return JSON.parse(cached);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  // 2️⃣ Live Firestore snapshot listener
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        // Update balance state & update cache
        const newBalance = data.balance || 0;
        setBalance(newBalance);
        if (typeof window !== "undefined") {
          localStorage.setItem("lastBalance", String(newBalance));
        }

        // Read VA details from flutterwave_va
        const va = data.flutterwave_va ?? null;
        const vaInfo = va?.account_number
          ? { account_number: va.account_number, bank_name: va.bank_name }
          : null;

        setVaAccount(vaInfo);
        if (typeof window !== "undefined") {
          localStorage.setItem("lastVA", JSON.stringify(vaInfo));
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-0 my-4">
      <div className="bg-[#0b1575] text-white rounded-2xl p-5 shadow-md">
        {/* Top Row */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-[#aac4ff] font-medium">
              Available Balance
            </span>
            <button
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="text-[#aac4ff] hover:text-white transition-colors"
              aria-label="Toggle balance visibility"
            >
              {isBalanceVisible ? (
                <Eye size={16} />
              ) : (
                <EyeOff size={16} />
              )}
            </button>
          </div>

          <Link
            href="/history"
            className="flex items-center text-xs text-[#aac4ff] hover:text-white font-medium gap-1"
          >
            <span>View History</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Balance Display */}
        <div className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
          {isBalanceVisible ? `₦${balance.toLocaleString()}` : "••••••"}
        </div>

        {/* Fund Wallet Button */}
        <Link
          href="/fund-wallet"
          className="inline-block bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs sm:text-sm font-semibold px-5 py-2 rounded-full mb-4 transition-all"
        >
          Fund Wallet
        </Link>

        {/* Virtual Account Footer Row */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/10 text-xs sm:text-sm">
          {vaAccount ? (
            <>
              <span className="text-[#aac4ff] font-medium">
                {vaAccount.bank_name || "Bank"}
              </span>
              <span className="font-semibold text-white ml-1">
                {vaAccount.account_number}
              </span>
              <button
                onClick={() => handleCopy(vaAccount.account_number)}
                className="ml-2 text-[#aac4ff] hover:text-white"
                title="Copy Account Number"
              >
                {copied ? (
                  <CheckCircle size={14} className="text-green-400" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </>
          ) : (
            <Link
              href="/fund-wallet"
              className="flex items-center text-[#aac4ff] hover:text-white gap-1 text-xs"
            >
              <span>Set up virtual account</span>
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}