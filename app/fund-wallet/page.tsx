"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, functions } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, collection } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";
import {
  CreditCard,
  Banknote,
  Eye,
  EyeOff,
  Info,
  CheckCircle,
  Copy,
  Shield,
  Wallet,
  XCircle,
} from "lucide-react";

type FundingMethod = "card" | "virtual";

interface VirtualAccount {
  account_number: string;
  bank_name: string;
  account_name: string;
}

interface VAResponse {
  va: VirtualAccount;
}

export default function FundWalletPage() {
  const { user, loading: authLoading } = useAuth();

  /* ── Balance & Eye toggle ── */
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isBalanceVisible, setIsBalanceVisible] = useState<boolean>(true);

  /* ── Method picker ── */
  const [activeMethod, setActiveMethod] = useState<FundingMethod | null>("card");

  /* ── Flutterwave payment states ── */
  const [fundAmount, setFundAmount] = useState<string>("");
  const [activeTxRef, setActiveTxRef] = useState<string>("");
  const [loadingPayment, setLoadingPayment] = useState<boolean>(false);
  const [paymentModalStatus, setPaymentModalStatus] = useState<"success" | "cancelled" | null>(null);

  /* ── Virtual Account states ── */
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [vaCreating, setVaCreating] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [vaPhone, setVaPhone] = useState<string>("");
  const [bvn, setBvn] = useState<string>("");

  /* ── Copy feedback states ── */
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  /* ── Popup banner/toast ── */
  const [popup, setPopup] = useState<{ msg: string; success: boolean } | null>(null);

  const quickAmounts = ["1000", "5000", "10000", "20000"];

  const showPopup = (msg: string, success = false) => {
    setPopup({ msg, success });
    setTimeout(() => setPopup(null), 4000);
  };

  /* ── Firestore Listener (Balance + Virtual Account) ── */
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWalletBalance(data.balance || 0);

        if (data.flutterwave_va?.account_number) {
          setVirtualAccount({
            account_number: data.flutterwave_va.account_number,
            bank_name: data.flutterwave_va.bank_name,
            account_name: data.flutterwave_va.account_name,
          });
        }
      }
    });
    return () => unsub();
  }, [user]);

  /* ── FLUTTERWAVE CONFIGURATION ── */
  const config = {
    public_key: "FLWPUBK-1d9e3c5f384e9fca7a756f080077948f-X",
    tx_ref: activeTxRef,
    amount: Number(fundAmount) || 0,
    currency: "NGN",
    payment_options: "card,banktransfer,ussd,mobilemoney",
    customer: {
      email: user?.email || "user@example.com",
      phone_number: vaPhone || "",
      name: `${firstName} ${lastName}`.trim() || user?.displayName || "User",
    },
    customizations: {
      title: "GoldSub Wallet Funding",
      description: "Payment for wallet top-up",
      logo: "https://st2.depositphotos.com/4035913/6124/i/600/depositphotos_61243733-stock-illustration-letter-g-logo-icon-design.jpg",
    },
  };

  const handleFlutterwavePayment = useFlutterwave(config);

  const startPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return showPopup("Please log in to continue.", false);
    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      return showPopup("Please enter a valid amount.", false);
    }

    // ✅ Generated imperatively during user action, keeping render pure
    const generatedTxRef = `${user.uid}-${Date.now()}`;
    setActiveTxRef(generatedTxRef);

    try {
      setLoadingPayment(true);
      const userTransactionsRef = collection(
        doc(db, "wallet_transactions", user.uid),
        "transactions"
      );
      await setDoc(doc(userTransactionsRef, generatedTxRef), {
        amount: Number(fundAmount),
        status: "pending",
        reference: generatedTxRef,
        timestamp: Date.now(),
      });

      handleFlutterwavePayment({
        callback: (response) => {
          setLoadingPayment(false);
          closePaymentModal();
          if (response.status === "successful" || response.status === "completed") {
            setPaymentModalStatus("success");
            setFundAmount("");
          } else {
            setPaymentModalStatus("cancelled");
          }
        },
        onClose: () => {
          setLoadingPayment(false);
        },
      });
    } catch {
      showPopup("Failed to initiate payment. Please try again.", false);
      setLoadingPayment(false);
    }
  };

  /* ── VIRTUAL ACCOUNT CREATION ── */
  const handleCreateVA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return showPopup("No email found. Please log in.", false);
    if (!firstName.trim()) return showPopup("Enter your first name.", false);
    if (!lastName.trim()) return showPopup("Enter your last name.", false);
    if (!vaPhone.trim()) return showPopup("Enter your phone number.", false);
    if (!bvn.trim() || bvn.length !== 11) {
      return showPopup("Enter a valid 11-digit BVN.", false);
    }

    setVaCreating(true);
    try {
      const fn = httpsCallable<
        { first_name: string; last_name: string; phone: string; email: string; bvn: string },
        VAResponse
      >(functions, "createFlutterwaveAccount");

      const res = await fn({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: vaPhone.trim(),
        email: user.email,
        bvn: bvn.trim(),
      });

      const va = res.data.va;
      setVirtualAccount(va);
      showPopup("Virtual account created successfully!", true);
      setBvn("");
      setFirstName("");
      setLastName("");
      setVaPhone("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      showPopup(
        errorMessage === "internal"
          ? "Poor network, try again"
          : errorMessage,
        false
      );
    } finally {
      setVaCreating(false);
    }
  };

  /* ── COPY HELPER ── */
  const handleCopy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* ── POPUP TOAST NOTIFICATION ── */}
      {popup && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium transition-all ${
            popup.success
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {popup.msg}
        </div>
      )}

      {/* ── BALANCE CARD ── */}
      <div className="bg-[#0b1575] text-white rounded-2xl p-6 shadow-md">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-blue-200 font-medium">Wallet Balance</span>
          <button
            onClick={() => setIsBalanceVisible(!isBalanceVisible)}
            className="text-blue-200 hover:text-white transition-colors"
          >
            {isBalanceVisible ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <h2 className="text-4xl font-extrabold mb-4 tracking-tight">
          {isBalanceVisible ? `₦${walletBalance.toLocaleString()}` : "••••••"}
        </h2>

        <div className="bg-white/10 rounded-xl p-3 flex items-start gap-3 text-xs text-blue-100">
          <Info size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>Fund your wallet to purchase airtime, data, cable & electricity.</p>
          </div>
          <div className="text-right text-blue-200 border-l border-white/10 pl-3">
            <p className="font-semibold">Flutterwave Charge</p>
            <p>Below 3000 = ₦20~25</p>
            <p>Above 3000 = 1.29%</p>
          </div>
        </div>
      </div>

      {/* ── METHOD PICKER HEADING ── */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Choose funding method
        </p>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setActiveMethod(activeMethod === "card" ? null : "card")}
            className={`p-4 rounded-2xl border-2 text-center flex flex-col items-center gap-2 transition-all relative ${
              activeMethod === "card"
                ? "border-[#0b1575] bg-blue-50/50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center ${
                activeMethod === "card" ? "bg-[#0b1575] text-white" : "bg-gray-100 text-[#0b1575]"
              }`}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <p
                className={`text-sm font-bold ${
                  activeMethod === "card" ? "text-[#0b1575]" : "text-gray-800"
                }`}
              >
                Payment Options
              </p>
              <p className="text-xs text-gray-500">Debit card, transfer, USSD</p>
            </div>
            {activeMethod === "card" && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#0b1575]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveMethod(activeMethod === "virtual" ? null : "virtual")}
            className={`p-4 rounded-2xl border-2 text-center flex flex-col items-center gap-2 transition-all relative ${
              activeMethod === "virtual"
                ? "border-[#0b1575] bg-blue-50/50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center ${
                activeMethod === "virtual" ? "bg-[#0b1575] text-white" : "bg-gray-100 text-[#0b1575]"
              }`}
            >
              <Banknote size={20} />
            </div>
            <div>
              <p
                className={`text-sm font-bold ${
                  activeMethod === "virtual" ? "text-[#0b1575]" : "text-gray-800"
                }`}
              >
                Virtual Account
              </p>
              <p className="text-xs text-gray-500">Transfer directly to account</p>
            </div>
            {activeMethod === "virtual" && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#0b1575]" />
            )}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          METHOD: CARD / FLUTTERWAVE
      ══════════════════════════════════════ */}
      {activeMethod === "card" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-gray-800">Fund Your Wallet</h3>

          <form onSubmit={startPayment} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Enter Amount
              </label>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#0b1575] bg-gray-50">
                <span className="text-2xl font-bold text-[#0b1575] mr-2">₦</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full text-2xl font-bold text-gray-800 bg-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Quick Select
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setFundAmount(amt)}
                    className={`py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                      fundAmount === amt
                        ? "border-[#0b1575] bg-blue-50 text-[#0b1575]"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    ₦{Number(amt).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingPayment || !fundAmount || parseFloat(fundAmount) <= 0}
              className="w-full bg-[#0b1575] hover:bg-[#080f55] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loadingPayment ? (
                "Processing..."
              ) : (
                <>
                  <Wallet size={18} />
                  <span>Continue to Payment</span>
                </>
              )}
            </button>
          </form>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Accepted Methods
            </p>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-[#0b1575]" />
                <span>Debit / Credit Card</span>
              </div>
              <div className="flex items-center gap-2">
                <Banknote size={16} className="text-[#0b1575]" />
                <span>Bank Transfer</span>
              </div>
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-[#0b1575]" />
                <span>USSD & Mobile Money</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          METHOD: VIRTUAL ACCOUNT
      ══════════════════════════════════════ */}
      {activeMethod === "virtual" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          {virtualAccount ? (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">Your Virtual Account</h3>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-800">
                <Info size={16} className="shrink-0 mt-0.5 text-[#0b1575]" />
                <p>Transfer any amount to this account to fund your wallet instantly.</p>
              </div>

              {[
                { label: "Bank Name", value: virtualAccount.bank_name, key: "bank" },
                { label: "Account Number", value: virtualAccount.account_number, key: "acc_num" },
                { label: "Account Name", value: virtualAccount.account_name, key: "acc_name" },
              ].map(({ label, value, key }) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4"
                >
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <p className="text-base font-bold text-gray-800">{value}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(value, key)}
                    className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      copiedKey === key
                        ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                        : "bg-white border-gray-200 text-[#0b1575] hover:bg-gray-100"
                    }`}
                  >
                    {copiedKey === key ? (
                      <>
                        <CheckCircle size={14} />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ))}

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                <span>Transfers reflect in your wallet within minutes</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">Create Virtual Account</h3>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-800">
                <Info size={16} className="shrink-0 mt-0.5 text-[#0b1575]" />
                <p>Set up a dedicated bank account number to fund your wallet via bank transfer anytime.</p>
              </div>

              <form onSubmit={handleCreateVA} className="space-y-3">
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-[#0b1575] outline-none"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-[#0b1575] outline-none"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={vaPhone}
                  onChange={(e) => setVaPhone(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-[#0b1575] outline-none"
                />
                <input
                  type="text"
                  placeholder="BVN (11 digits)"
                  maxLength={11}
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-[#0b1575] outline-none"
                />

                <button
                  type="submit"
                  disabled={vaCreating}
                  className="w-full bg-[#0b1575] hover:bg-[#080f55] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {vaCreating ? (
                    "Creating..."
                  ) : (
                    <>
                      <Banknote size={18} />
                      <span>Create Virtual Account</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── SECURITY BADGE ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-gray-500 shadow-sm">
        <Shield size={20} className="text-emerald-500 shrink-0" />
        <span>Secured by Flutterwave • Your payment information is encrypted</span>
      </div>

      {/* ── PAYMENT STATUS MODAL ── */}
      {paymentModalStatus && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            {paymentModalStatus === "success" ? (
              <>
                <CheckCircle size={56} className="text-emerald-500 mx-auto" />
                <h4 className="text-lg font-bold text-gray-800">Payment Processing</h4>
                <p className="text-sm text-gray-600">
                  Your payment is being processed. Your wallet balance will update shortly.
                </p>
              </>
            ) : (
              <>
                <XCircle size={56} className="text-red-500 mx-auto" />
                <h4 className="text-lg font-bold text-gray-800">Payment Cancelled</h4>
                <p className="text-sm text-gray-600">
                  Your payment was cancelled. No charges were made.
                </p>
              </>
            )}

            <button
              onClick={() => setPaymentModalStatus(null)}
              className={`w-full py-2.5 rounded-xl text-white font-semibold transition-all ${
                paymentModalStatus === "success" ? "bg-[#0b1575]" : "bg-red-600"
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}