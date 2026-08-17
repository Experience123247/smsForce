// app/dashboard/layout.tsx
"use client";

import SidebarLayout from "@/components/SidebarLayout";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setBalance(snap.data().balance || 0);
      }
    });
    return () => unsub();
  }, [user]);

  return (
    <SidebarLayout balance={balance} >
      {children}
    </SidebarLayout>
  );
}