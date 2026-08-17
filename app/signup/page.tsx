"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";

// Make sure these paths point to your Next.js Firebase setup
import { auth, functions } from "@/lib/firebase"; 


import {
  User,
  Mail,
  Phone,
  Lock,
  Users,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Zap,
  X,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Modal State
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupSuccess, setPopupSuccess] = useState(false);

  function showPopup(title: string, message?: string, success = false) {
    setPopupTitle(title);
    setPopupMessage(message || "");
    setPopupSuccess(success);
    setPopupVisible(true);
  }

  function cleanErrorMessage(error: string): string {
    let c = error.replace(/^firebase:\s*/i, "");
    c = c
      .replace(/\(auth\/[^)]+\)/g, "")
      .replace(/\[|\]/g, "")
      .trim();
    return c.replace(/\.$/, "");
  }

  // Direct Inline Firebase Calls
  async function executeSignup() {
    // 1️⃣ Authenticate user via Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Set display name in auth session
    await updateProfile(user, { displayName: fullName });

    // 2️⃣ Call Cloud Function: createUser
    const createUserFn = httpsCallable(functions, "createUser");
    await createUserFn({ fullName, phone, email });

    // 3️⃣ Call Cloud Function: handleReferral (If referral code provided)
    if (referralCode.trim()) {
      const handleReferralFn = httpsCallable(functions, "handleReferral");
      await handleReferralFn({ referralCode: referralCode.trim() });
    }

    // 4️⃣ Call Cloud Function: signupanalytics
    try {
      const analyticsFn = httpsCallable(functions, "signupanalytics");
      await analyticsFn({});
    } catch (analyticsErr) {
      console.error("Signup analytics failed:", analyticsErr);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      showPopup("All Fields Required", "Please fill in every field.");
      return;
    }

    if (password !== confirmPassword) {
      showPopup("Password Mismatch", "Your passwords do not match.");
      return;
    }

    if (password.length < 6) {
      showPopup("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      await executeSignup();

      showPopup(
        "Account Created!",
        "Your account has been created successfully.",
        true
      );

      setTimeout(() => {
        setPopupVisible(false);
        router.push("/login");
      }, 1400);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An error occurred.";
      showPopup("Signup Failed", cleanErrorMessage(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="min-h-screen lg:grid lg:grid-cols-[0.92fr_1.08fr]">

        {/* Brand panel */}
        <section className="relative hidden min-h-screen overflow-hidden bg-[#07145c] text-white lg:flex lg:flex-col">
          <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute -bottom-48 -right-32 h-[36rem] w-[36rem] rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative z-10 flex h-full flex-col px-12 py-10 xl:px-16">
            <Link href="/" className="flex w-fit items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#07145c] shadow-lg">
                <Megaphone className="h-5 w-5" />
              </span>
              <span className="text-xl font-black tracking-tight">
                Sms<span className="text-cyan-300">Force</span>
              </span>
            </Link>

            <div className="flex flex-1 flex-col justify-center">
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-blue-100">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                Promotional SMS made simple
              </div>

              <h1 className="max-w-xl text-5xl font-black leading-[1.03] tracking-[-0.04em] xl:text-6xl">
                Turn your offers into{" "}
                <span className="text-cyan-300">attention.</span>
              </h1>

              <p className="mt-6 max-w-lg text-[15px] leading-7 text-blue-100/75">
                Reach customers with promotional SMS for sales, discounts,
                new products, weekend deals and special offers.
              </p>

              <div className="mt-10 max-w-md rounded-[28px] border border-white/10 bg-white/[0.08] p-3 shadow-2xl backdrop-blur-xl">
                <div className="rounded-[22px] bg-white p-5 text-slate-900">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#07145c] text-white">
                      <Megaphone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">SMSFORCE</p>
                      <p className="text-[10px] text-slate-400">Promotional SMS</p>
                    </div>
                    <span className="ml-auto text-[10px] text-slate-400">now</span>
                  </div>

                  <div className="mt-4 rounded-2xl rounded-tl-md bg-slate-100 p-4">
                    <p className="text-[13px] leading-6 text-slate-700">
                      🔥 Weekend Deal! Get 20% off your next purchase.
                      Offer ends Sunday. Visit our store today!
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Promotional campaign</span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
                {[
                  ["01", "Create"],
                  ["02", "Promote"],
                  ["03", "Grow"],
                ].map(([n, label]) => (
                  <div key={n} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                    <p className="text-[10px] font-bold text-cyan-300">{n}</p>
                    <p className="mt-1 text-xs font-semibold text-white/80">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-blue-200/50">
              © {new Date().getFullYear()} SmsForce · Built for Nigerian businesses
            </p>
          </div>
        </section>

        {/* Form */}
        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-20">
          <div className="w-full max-w-xl">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#07145c] text-white">
                  <Megaphone className="h-4 w-4" />
                </span>
                <span className="font-black">Sms<span className="text-[#07145c]">Force</span></span>
              </Link>
              <Link href="/login" className="text-sm font-semibold text-slate-600">
                Log in
              </Link>
            </div>

            <div className="mb-7">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#07145c]/[0.07] text-[#07145c]">
                <Zap className="h-5 w-5" />
              </div>
              <h2 className="text-3xl font-black tracking-[-0.035em] sm:text-[2.15rem]">
                Start promoting smarter.
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Create your SmsForce account and start reaching your customers
                with promotional SMS.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.07)] sm:p-7">
              <form onSubmit={handleSignup} className="space-y-5">

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Full name" icon={<User className="h-4 w-4" />}>
                    <input type="text" placeholder="Chisom Anthony" value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="signup-input" required />
                  </FormField>

                  <FormField label="Phone number" icon={<Phone className="h-4 w-4" />}>
                    <input type="tel" placeholder="08100000000" value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="signup-input" required />
                  </FormField>
                </div>

                <FormField label="Email address" icon={<Mail className="h-4 w-4" />}>
                  <input type="email"  value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="signup-input" required />
                </FormField>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Password" icon={<Lock className="h-4 w-4" />}>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} placeholder="Minimum 6 characters"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className="signup-input pr-11" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormField>

                  <FormField label="Confirm password" icon={<Lock className="h-4 w-4" />}>
                    <div className="relative">
                      <input type={showConfirm ? "text" : "password"} placeholder="Repeat your password"
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`signup-input pr-11 ${confirmPassword && password !== confirmPassword ? "border-rose-300" : ""}`}
                        required />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormField>
                </div>

                <FormField label={<>Referral code <span className="font-normal text-slate-400">(optional)</span></>}
                  icon={<Users className="h-4 w-4" />}>
                  <input type="text" placeholder="REF12345" value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="signup-input uppercase" />
                </FormField>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-[11px] leading-5 text-slate-500">
                    Your account details are protected. Use SmsForce to create
                    and manage promotional SMS campaigns.
                  </p>
                </div>

                <button type="submit" disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#07145c] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#07145c]/15 transition hover:-translate-y-0.5 hover:bg-[#0a1c79] disabled:cursor-not-allowed disabled:bg-slate-300">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating your account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            </div>

           <div className="signup-footer flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p>Already have an account?{" "}
                <Link href="/login" className="font-bold text-[#07145c] hover:underline">Log in</Link>
              </p>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure account creation
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Existing success/error popup functionality, redesigned */}
      {popupVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-[28px] border border-white/70 bg-white p-7 text-center shadow-2xl">
            <button type="button" onClick={() => setPopupVisible(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>

            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
              popupSuccess ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}>
              {popupSuccess ? <CheckCircle2 className="h-7 w-7" /> : <AlertCircle className="h-7 w-7" />}
            </div>

            <h3 className="mt-5 text-xl font-black">{popupTitle}</h3>
            {popupMessage && <p className="mt-2 text-sm leading-6 text-slate-500">{popupMessage}</p>}

            <button type="button" onClick={() => setPopupVisible(false)}
              className={`mt-6 w-full rounded-2xl py-3 text-sm font-bold text-white ${
                popupSuccess ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}>
              Continue
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function FormField({ label, icon, children }: {
  label: React.ReactNode;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <div className="[&_input]:pl-10">{children}</div>
      </div>
    </div>
  );
}
