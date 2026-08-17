"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, functions } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  Gift,
  Sparkles,
  Users,
  TrendingUp,
  Copy,
  Share2,
  Crown,
  Check,
} from "lucide-react";

interface ReferralItem {
  id: string;
  referredCode?: string;
  createdAt?: unknown;
}

export default function ReferralsPage() {
  const { user, loading: authLoading } = useAuth();

  const [totalCount, setTotalCount] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [todayReferrals, setTodayReferrals] = useState<ReferralItem[]>([]);
  
  // Lazy state initialization to prevent setting state synchronously inside useEffect
  const [loadingData, setLoadingData] = useState<boolean>(() => Boolean(user?.uid));
  
  const [creatingCode, setCreatingCode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  /* ------------------ FETCH TODAY'S REFERRALS ------------------ */
  const fetchTodayReferrals = async (uid: string) => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const refQuery = query(
        collection(db, "users"),
        where("referredBy", "==", uid),
        where("createdAt", ">=", Timestamp.fromDate(startOfDay))
      );

      const snap = await getDocs(refQuery);
      const items: ReferralItem[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          referredCode: data.referralCode || docSnap.id.substring(0, 6).toUpperCase(),
          createdAt: data.createdAt,
        });
      });
      return items;
    } catch {
      return [];
    }
  };

  /* ------------------ DATA & SNAPSHOT LISTENERS ------------------ */
  useEffect(() => {
    if (!user?.uid) return;

    const uid = user.uid;

    const unsub = onSnapshot(
      doc(db, "users", uid),
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setTotalCount(data?.referralCount || 0);
          setReferralCode(data?.referralCode || null);

          const todayItems = await fetchTodayReferrals(uid);
          setTodayReferrals(todayItems);
        }
        setLoadingData(false);
      },
      () => {
        setLoadingData(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  /* ------------------ CREATE REFERRAL CODE ------------------ */
  const handleCreateCode = async () => {
    if (!user?.uid) return;

    try {
      setCreatingCode(true);
      const fn = httpsCallable<{ uid: string }, { code: string }>(functions, "createReferralCode");
      const res = await fn({ uid: user.uid });
      if (res.data?.code) {
        setReferralCode(res.data.code);
      }
    } catch {
      const fallbackCode = `GS${user.uid.substring(0, 6).toUpperCase()}`;
      setReferralCode(fallbackCode);
    } finally {
      setCreatingCode(false);
    }
  };

  /* ------------------ COPY CODE ------------------ */
  const copyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  /* ------------------ SHARE INVITE ------------------ */
  const shareInvite = async () => {
    if (!referralCode) return;
    const shareText = `Save big on data!\n\nGet cheap data plans on GoldSub. Join using my referral code: ${referralCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join GoldSub",
          text: shareText,
          url: window.location.origin,
        });
      } catch {
        copyCode();
      }
    } else {
      copyCode();
    }
  };

  /* ------------------ EXPANDING PROGRESS ------------------ */
  const milestone = useMemo(() => {
    if (totalCount < 10) return 10;
    return Math.ceil((totalCount + 1) / 5) * 5;
  }, [totalCount]);

  const referralProgress = useMemo(() => {
    return (totalCount / milestone) * 100;
  }, [totalCount, milestone]);

  const nextGoalLeft = milestone - totalCount;

  if (authLoading || (loadingData && user?.uid)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 font-medium">Loading referrals...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* 🚀 HERO CARD */}
      <div className="bg-gradient-to-br from-[#081526] to-[#020617] border border-[#13233a] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Gift className="text-emerald-500" size={32} />
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-bold">
            <Sparkles size={14} />
            <span>Referral Rewards</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3">
          Invite Friends.
          <br />
          Grow Faster 🚀
        </h1>

        <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-6">
          Refer and stand a chance to become a GoldSub Ambassador. Earn more as your network grows. Track referrals, rankings, and progress in one place.
        </p>

        {/* PROGRESS BAR */}
        <div className="space-y-2">
          <div className="w-full h-2.5 bg-[#1e293b] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(referralProgress, 100)}%` }}
            />
          </div>

          <p className="text-xs font-semibold text-[#9ce7b2]">
            {totalCount}/{milestone} referrals • {nextGoalLeft} to milestone
          </p>
        </div>
      </div>

      {/* 📊 STATS ROW */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#07111f] border border-[#152338] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <Users className="text-emerald-500 mb-2" size={28} />
          <p className="text-3xl font-extrabold text-white">{totalCount}</p>
          <p className="text-xs text-gray-400 font-medium mt-1">Total Referrals</p>
        </div>

        <div className="bg-[#07111f] border border-[#152338] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <TrendingUp className="text-sky-400 mb-2" size={28} />
          <p className="text-3xl font-extrabold text-white">{todayReferrals.length}</p>
          <p className="text-xs text-gray-400 font-medium mt-1">Today</p>
        </div>
      </div>

      {/* 🔑 CODE CARD */}
      <div className="bg-gradient-to-br from-[#04111f] to-[#071a30] border border-[#16314b] rounded-3xl p-6 text-white space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Your Referral Code</h3>
          {referralCode && (
            <button
              onClick={copyCode}
              className="text-emerald-500 hover:text-emerald-400 transition-colors"
              title="Copy Referral Code"
            >
              <Copy size={20} />
            </button>
          )}
        </div>

        {!referralCode ? (
          <button
            onClick={handleCreateCode}
            disabled={creatingCode}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-[#03120a] py-3.5 rounded-2xl font-extrabold text-base transition-all disabled:opacity-50 mt-2"
          >
            {creatingCode ? "Generating..." : "Create Referral Code"}
          </button>
        ) : (
          <div className="space-y-4">
            <button
              onClick={copyCode}
              className="w-full text-left bg-[#020914] border border-[#10243b] rounded-2xl p-4 transition-all hover:border-emerald-500/50"
            >
              <p className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-widest font-mono">
                {referralCode}
              </p>
              <p className="text-xs font-semibold text-emerald-300/80 mt-2 flex items-center gap-1">
                {copied ? (
                  <>
                    <Check size={14} />
                    <span>Copied ✓</span>
                  </>
                ) : (
                  <span>Click code to copy</span>
                )}
              </p>
            </button>

            <button
              onClick={shareInvite}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
            >
              <Share2 size={18} />
              <span>Share Invite</span>
            </button>
          </div>
        )}
      </div>

      {/* 📅 TODAY'S REFERRALS */}
      <div className="bg-[#07111f] border border-[#152338] rounded-3xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Today&apos;s Referrals</h3>
          <span className="text-emerald-500 font-extrabold text-lg">
            {todayReferrals.length}
          </span>
        </div>

        {todayReferrals.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No referrals today yet.
          </div>
        ) : (
          <div className="divide-y divide-[#102033]">
            {todayReferrals.map((item, index) => (
              <div key={item.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <p className="text-white font-bold text-sm">
                      {item.referredCode || "----"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Successful referral #{index + 1}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-black text-emerald-500 tracking-wider">
                  NEW
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 👑 LEADERBOARD PROMO */}
      <div className="bg-gradient-to-r from-[#0d1728] to-[#07111f] border border-[#16263c] rounded-2xl p-5 flex items-center gap-4 text-white">
        <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center shrink-0">
          <Crown className="text-amber-400" size={24} />
        </div>
        <div>
          <h4 className="font-bold text-base text-white">Climb Leaderboard</h4>
          <p className="text-xs text-gray-400 mt-0.5">More invites = higher rank</p>
        </div>
      </div>
    </div>
  );
}