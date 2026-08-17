"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Megaphone,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import {
  loginNextJS,
  resendVerificationEmailNextJS,
} from "@/lib/auth";

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

  // Firebase invalid credentials
  if (
    message.includes("auth/invalid-credential") ||
    message.includes("auth/wrong-password") ||
    message.includes("auth/user-not-found")
  ) {
    return "Incorrect email or password.";
  }

  if (message.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }

  if (message.includes("auth/user-disabled")) {
    return "This account has been disabled. Please contact support.";
  }

  if (message.includes("auth/too-many-requests")) {
    return "Too many login attempts. Please wait a moment and try again.";
  }

  if (message.includes("auth/network-request-failed")) {
    return "Unable to connect. Please check your internet connection and try again.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "An account with this email already exists.";
  }

  if (message.includes("auth/weak-password")) {
    return "Your password is too weak. Please choose a stronger password.";
  }

  if (message.includes("auth/requires-recent-login")) {
    return "Please log in again to continue.";
  }

  // Verification-related errors
  if (message.includes("auth/expired-action-code")) {
    return "This verification link has expired. Please request a new one.";
  }

  if (message.includes("auth/invalid-action-code")) {
    return "This verification link is no longer valid. Please request a new one.";
  }

  // Remove Firebase formatting if an unknown error comes through
  const cleaned = raw
    .replace(/^firebase:\s*/i, "")
    .replace(/^error:\s*/i, "")
    .replace(/\(auth\/[^)]+\)/gi, "")
    .replace(/auth\/[a-z-]+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.:]+$/, "");

  // Never show an empty/raw Firebase error
  if (!cleaned || cleaned.toLowerCase() === "error") {
    return "Something went wrong while logging in. Please try again.";
  }

  return cleaned;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [requiresVerification, setRequiresVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* ============================================================
     LOGIN
  ============================================================ */

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccessMsg("");
    setRequiresVerification(false);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await loginNextJS(email.trim(), password);

      if (res.success) {
        router.push("/dashboard");
        return;
      }

      // Clean the error coming from loginNextJS
      setError(
        getFriendlyAuthError(
          res.error || "Unable to log in. Please try again."
        )
      );

      if (res.requiresVerification) {
        setRequiresVerification(true);
      }
    } catch (err: unknown) {
      setError(getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     RESEND VERIFICATION
  ============================================================ */

  const handleResend = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password first.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await resendVerificationEmailNextJS(
        email.trim(),
        password
      );

      if (res.success) {
        setSuccessMsg(
          "Verification link sent! Please check your inbox or spam folder."
        );
      } else {
        setError(
          getFriendlyAuthError(
            res.error || "Failed to resend verification link."
          )
        );
      }
    } catch (err: unknown) {
      setError(
        getFriendlyAuthError(
          err || "Failed to resend verification link."
        )
      );
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
                Promotional SMS made simple
              </div>

              <h1 className="max-w-xl text-5xl font-black leading-[1.03] tracking-[-0.04em] xl:text-6xl">
                Welcome back.
                <br />
                <span className="text-cyan-300">
                  Time to grow.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-[15px] leading-7 text-blue-100/75">
                Log in to your SmsForce account and continue
                reaching your customers with powerful promotional
                SMS campaigns.
              </p>

              {/* SMS Preview */}
              <div className="mt-10 max-w-md rounded-[28px] border border-white/10 bg-white/[0.08] p-3 shadow-2xl backdrop-blur-xl">

                <div className="rounded-[22px] bg-white p-5 text-slate-900">

                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#07145c] text-white">
                      <Megaphone className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-bold">
                        SMSFORCE
                      </p>

                      <p className="text-[10px] text-slate-400">
                        Promotional SMS
                      </p>
                    </div>

                    <span className="ml-auto text-[10px] text-slate-400">
                      now
                    </span>

                  </div>

                  <div className="mt-4 rounded-2xl rounded-tl-md bg-slate-100 p-4">
                    <p className="text-[13px] leading-6 text-slate-700">
                      💰No money? No be problem!,
                      Buy TV, Phone, Fridge and pay small small
                      @yourbusiness. Zero interest. Visit 30 Enugu Rd
                      or call 080XXX today!
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">

                    <span className="text-[10px] text-slate-400">
                      Promotional campaign
                    </span>

                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Ready
                    </span>

                  </div>

                </div>
              </div>

              {/* Features */}
              <div className="mt-6 grid max-w-md grid-cols-3 gap-3">

                {[
                  ["01", "Create"],
                  ["02", "Promote"],
                  ["03", "Grow"],
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
            LOGIN FORM
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
                href="/signup"
                className="text-sm font-semibold text-slate-600"
              >
                Create account
              </Link>

            </div>

            {/* Heading */}
            <div className="mb-7">

              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#07145c]/[0.07] text-[#07145c]">
                <Zap className="h-5 w-5" />
              </div>

              <h2 className="text-3xl font-black tracking-[-0.035em] sm:text-[2.15rem]">
                Welcome back.
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Log in to manage your promotional SMS campaigns
                and keep your customers engaged.
              </p>

            </div>

            {/* Form Card */}
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.07)] sm:p-7">

              <form
                onSubmit={handleLogin}
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

                    <p className="text-xs leading-5 text-emerald-700">
                      {successMsg}
                    </p>

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
                      placeholder="you@business.com"
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

                {/* Password */}
                <div>

                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    Password
                  </label>

                  <div className="relative">

                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      required
                      autoComplete="current-password"
                      className="signup-input pr-12"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>

                  </div>

                </div>

                {/* Forgot password */}
                <div className="-mt-1 flex justify-end">

                  <Link
                    href="/forgotPassword"
                    className="text-xs font-bold text-[#07145c] transition hover:text-[#0a1c79] hover:underline"
                  >
                    Forgot password?
                  </Link>

                </div>

                {/* Security message */}
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3.5">

                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                  <p className="text-[11px] leading-5 text-slate-500">
                    Your connection is secure. Your SmsForce
                    account and campaign information are protected.
                  </p>

                </div>

                {/* Login button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#07145c] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#07145c]/15 transition hover:-translate-y-0.5 hover:bg-[#0a1c79] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >

                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Logging you in...
                    </>
                  ) : (
                    <>
                      Log in
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </>
                  )}

                </button>

              </form>

              {/* Verification */}
              {requiresVerification && (
                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">

                  <div className="flex items-start gap-3">

                    <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                    <div className="flex-1">

                      <p className="text-xs font-bold text-amber-900">
                        Email verification required
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-amber-700">
                        Your account has not been verified yet.
                        Send yourself a new verification link.
                      </p>

                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-[11px] font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" />
                            Resend verification
                          </>
                        )}
                      </button>

                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* Bottom links */}
            <div className="signup-footer flex flex-col items-center justify-between gap-3 sm:flex-row">

              <p>
                Do not have an account?{" "}
                <Link
                  href="/signup"
                  className="font-bold text-[#07145c] hover:underline"
                >
                  Create one
                </Link>
              </p>

              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure login
              </div>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}