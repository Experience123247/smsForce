"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect} from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import BalanceCard from "@/components/BalanceCard";


export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();


  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Sync user balance for the top navbar
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
    
      }
    });
    return () => unsub();
  }, [user]);

  if (loading || !user) {
    return <p className="p-6">Loading session...</p>;
  }

  return (
   
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, {user.displayName || "User"}
        </h1>

        {/* 🚀 Top Balance Component */}
        <BalanceCard />

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-700 font-medium">
            You are securely logged into your Next.js dashboard.
          </p>
        </div>
      </div>
  
  );
}