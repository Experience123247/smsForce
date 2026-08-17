"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Loader2,
  ArrowRight,
  Megaphone,
  Sparkles,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

import { forgotPasswordNextJS } from "@/lib/auth";

/* ============================================================
   CLEAN FIREBASE ERROR MESSAGES
============================================================ */

function getFriendlyAuthError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";

  const message = raw.toLowerCase();

  if (message.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }

  if (
    message.includes("auth/user-not-found") ||
    message.includes("auth/invalid-credential")
  ) {
    return "We couldn't find an account with that email address.";
  }

  if (message.includes("auth/too-many-requests")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (message.includes("auth/network-request-failed")) {
    return "Unable to connect. Please check your internet connection and try again.";
  }

  if (message.includes("auth/user-disabled")) {
    return "This account has been disabled. Please contact support.";
  }

  const cleaned = raw
    .replace(/^firebase:\s*/i, "")
    .replace(/^error:\s*/i, "")
    .replace(/\(auth\/[^)]+\)/gi, "")
    .replace(/auth\/[a-z-]+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.:]+$/, "");

  if (!cleaned || cleaned.toLowerCase() === "error") {
    return "Something went wrong. Please try again.";
  }

  return cleaned;
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  /* ============================================================
     RESET PASSWORD
  ============================================================ */

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccessMsg("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await forgotPasswordNextJS(email.trim());

      if (res.success) {
        setSuccessMsg(
          "Password reset instructions have been sent to your email."
        );

        setTimeout(() => {
          router.push("/login");
        }, 3500);
      } else {
        setError(
          getFriendlyAuthError(
            res.error || "Failed to send password reset link."
          )
        );
      }
    } catch (err: unknown) {
      setError(getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="min-h-screen lg:grid lg:grid-cols-[0.92fr_1.08fr]">

        {/* =====================================================
            BRAND PANEL
        ===================================================== */}

        <section className="relative hidden min-h-screen overflow-hidden bg-[#07145c] text-white lg:flex lg:flex-col">

          {/* Background glow */}
          <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-blue-400/20 blur-3xl" />

          <div className="absolute -bottom-48 -right-32 h-[36rem] w-[36rem] rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative z-10 flex h-full flex-col px-12 py-10 xl:px-16">

            {/* Logo */}
            <Link
              href="/"
              className="flex w-fit items-center gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#07145c] shadow-lg">
                <Megaphone className="h-5 w-5" />
              </span>

              <span className="text-xl font-black tracking-tight">
                Sms<span className="text-cyan-300">Force</span>
              </span>
            </Link>

            {/* Main content */}
            <div className="flex flex-1 flex-col justify-center">

              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-blue-100">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                Your account, always within reach
              </div>

              <h1 className="max-w-xl text-5xl font-black leading-[1.03] tracking-[-0.04em] xl:text-6xl">
                Forgot your
                <br />
                <span className="text-cyan-300">
                  password?
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-[15px] leading-7 text-blue-100/75">
                No worries. Enter the email address connected to
                your SmsForce account and we will help you get back
                in.
              </p>

              {/* Security Card */}
              <div className="mt-10 max-w-md rounded-[28px] border border-white/10 bg-white/[0.08] p-3 shadow-2xl backdrop-blur-xl">

                <div className="rounded-[22px] bg-white p-5 text-slate-900">

                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#07145c] text-white">
                      <KeyRound className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-bold">
                        PASSWORD RESET
                      </p>

                      <p className="text-[10px] text-slate-400">
                        Secure account recovery
                      </p>
                    </div>

                    <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Secure
                    </span>

                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-100 p-4">

                    <div className="flex items-start gap-3">

                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#07145c] shadow-sm">
                        <Mail className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Check your inbox
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          We will send a secure link that lets you
                          create a new password.
                        </p>
                      </div>

                    </div>

                  </div>

                  <div className="mt-4 flex items-center justify-between">

                    <span className="text-[10px] text-slate-400">
                      Account recovery
                    </span>

                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                      <ShieldCheck className="h-3 w-3" />
                      Protected
                    </span>

                  </div>

                </div>
              </div>

              {/* Steps */}
              <div className="mt-6 grid max-w-md grid-cols-3 gap-3">

                {[
                  ["01", "Email"],
                  ["02", "Verify"],
                  ["03", "Reset"],
                ].map(([number, label]) => (
                  <div
                    key={number}
                    className="rounded-2xl border border-white/10 bg-white/[0.05] p-3"
                  >
                    <p className="text-[10px] font-bold text-cyan-300">
                      {number}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-white/80">
                      {label}
                    </p>
                  </div>
                ))}

              </div>
            </div>

            <p className="text-[11px] text-blue-200/50">
              © {new Date().getFullYear()} SmsForce · Built for Nigerian businesses
            </p>

          </div>
        </section>

        {/* =====================================================
            RESET FORM
        ===================================================== */}

        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-20">

          <div className="w-full max-w-xl">

            {/* Mobile header */}
            <div className="mb-8 flex items-center justify-between lg:hidden">

              <Link
                href="/"
                className="flex items-center gap-2.5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#07145c] text-white">
                  <Megaphone className="h-4 w-4" />
                </span>

                <span className="font-black">
                  Sms<span className="text-[#07145c]">Force</span>
                </span>
              </Link>

              <Link
                href="/login"
                className="text-sm font-semibold text-slate-600"
              >
                Log in
              </Link>

            </div>

            {/* Heading */}
            <div className="mb-7">

              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#07145c]/[0.07] text-[#07145c]">
                <KeyRound className="h-5 w-5" />
              </div>

              <h2 className="text-3xl font-black tracking-[-0.035em] sm:text-[2.15rem]">
                Reset your password.
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Enter your account email and we will send you a
                secure link to create a new password.
              </p>

            </div>

            {/* Form Card */}
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.07)] sm:p-7">

              <form
                onSubmit={handleReset}
                className="space-y-5"
              >

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3.5">

                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />

                    <p className="text-xs leading-5 text-rose-700">
                      {error}
                    </p>

                  </div>
                )}

                {/* Success */}
                {successMsg && (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5">

                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                    <div>
                      <p className="text-xs font-bold text-emerald-800">
                        Reset email sent
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-700">
                        {successMsg}
                      </p>
                    </div>

                  </div>
                )}

                {/* Email */}
                <div>

                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    Email address
                  </label>

                  <div className="relative">

                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="email"
                      placeholder="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      required
                      autoComplete="email"
                      className="signup-input"
                    />

                  </div>

                </div>

                {/* Security message */}
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3.5">

                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                  <p className="text-[11px] leading-5 text-slate-500">
                    We will send a secure password reset link to
                    the email address associated with your account.
                  </p>

                </div>

                {/* Reset button */}
                <button
                  type="submit"
                  disabled={loading || !!successMsg}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#07145c] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#07145c]/15 transition hover:-translate-y-0.5 hover:bg-[#0a1c79] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >

                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </>
                  )}

                </button>

              </form>

            </div>

            {/* Bottom links */}
            <div className="signup-footer flex flex-col items-center justify-between gap-3 sm:flex-row">

              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 font-semibold text-[#07145c] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to login
              </Link>

              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure account recovery
              </div>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}