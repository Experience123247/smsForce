"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { logoutNextJS } from "@/lib/auth";

import {
  Menu,
  LayoutDashboard,
  History,
  CreditCard,
  BarChart3,
  Smartphone,
  Users,
  LogOut,
  Wallet,
  User as UserIcon,
  MessageSquare,
  ArrowUpRight,
  ChevronRight,
  Zap,
} from "lucide-react";

/* ============================================================
   NAVIGATION
============================================================ */

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Transaction History",
    href: "/TransactionHistory",
    icon: History,
  },
  {
    name: "Fund Wallet",
    href: "/fund-wallet",
    icon: CreditCard,
  },
  {
    name: "Statistics",
    href: "/statistics",
    icon: BarChart3,
  },
  {
    name: "Bulk Sms",
    href: "/bulkSms",
    icon: Smartphone,
  },
  {
    name: "Referrals",
    href: "/referrals",
    icon: Users,
  },
 
];

/* ============================================================
   SMS CONFIG
============================================================ */

const SMS_UNIT_PRICE = 8.4;

/* ============================================================
   COMPONENT
============================================================ */

export default function SidebarLayout({
  children,
  balance = 0,
}: {
  children: React.ReactNode;
  balance?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const { user } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  /* ============================================================
     SMS UNIT CALCULATION

     1 SMS UNIT = ₦8.40
  ============================================================ */

  const smsUnits =
    balance > 0
      ? Math.floor(balance / SMS_UNIT_PRICE)
      : 0;

  /* ============================================================
     LOGOUT
  ============================================================ */

  const handleLogout = async () => {
    await logoutNextJS();
    router.push("/login");
  };

  /* ============================================================
     SIDEBAR TOGGLE
     
     Desktop:
       Collapse / expand sidebar

     Mobile:
       Open / close sidebar
  ============================================================ */

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen((previous) => !previous);
    } else {
      setIsCollapsed((previous) => !previous);
    }
  };

  /* ============================================================
     FORMATTERS
  ============================================================ */

  const formattedBalance = balance.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedUnits = smsUnits.toLocaleString("en-NG");

  return (
    <>
      {/* ======================================================
          RESPONSIVE SIDEBAR STYLES

          IMPORTANT:
          No useEffect or isMobile state is required.
      ====================================================== */}

      <style jsx>{`
        /* ================================
           MAIN SIDEBAR
        ================================= */

        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;

          width: 270px;
          height: 100vh;

          background-color: #07145c;
          color: #cbd5e1;

          display: block;

          z-index: 50;

          border-right: 1px solid
            rgba(255, 255, 255, 0.06);

          overflow-x: hidden;
          overflow-y: auto;

          scrollbar-width: thin;
          scrollbar-color:
            rgba(255, 255, 255, 0.2)
            transparent;

          transition:
            width 0.22s ease-in-out,
            transform 0.25s ease-in-out;
        }

        /* ================================
           COLLAPSED DESKTOP SIDEBAR
        ================================= */

        .sidebar.collapsed {
          width: 72px;
        }

        /* ================================
           MAIN CONTENT
        ================================= */

        .main-container {
          margin-left: 270px;
          min-height: 100vh;

          display: flex;
          flex-direction: column;

          min-width: 0;

          transition:
            margin-left 0.22s ease-in-out;
        }

        .main-container.collapsed {
          margin-left: 72px;
        }

        /* ================================
           MOBILE
        ================================= */

        @media (max-width: 767px) {
          .sidebar {
            width: 270px;

            transform: translateX(-100%);

            box-shadow:
              8px 0 30px
              rgba(0, 0, 0, 0.18);
          }

          .sidebar.mobile-open {
            transform: translateX(0);
          }

          /*
           * On mobile the sidebar is removed
           * from the content flow completely.
           */
          .main-container,
          .main-container.collapsed {
            margin-left: 0;
          }
        }
      `}</style>

      {/* ======================================================
          PAGE WRAPPER
      ====================================================== */}

      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f4f6f9",
        }}
      >
        {/* ====================================================
            MOBILE OVERLAY
        ==================================================== */}

        {isMobileOpen && (
          <div
            onClick={() => setIsMobileOpen(false)}
            style={{
              position: "fixed",
              inset: 0,

              backgroundColor:
                "rgba(3, 7, 18, 0.45)",

              backdropFilter: "blur(2px)",

              zIndex: 40,
            }}
          />
        )}

        {/* ====================================================
            SIDEBAR
        ==================================================== */}

        <aside
          className={[
            "sidebar",
            isCollapsed ? "collapsed" : "",
            isMobileOpen ? "mobile-open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",

              /*
               * IMPORTANT:
               * No fixed height here.
               *
               * The sidebar itself handles scrolling.
               * Therefore all navigation items can exist
               * naturally below one another.
               */
              minHeight: "100%",
            }}
          >
            {/* ==================================================
                BRAND HEADER
            ================================================== */}

            <div
              style={{
                height: "68px",
                minHeight: "68px",

                display: "flex",
                alignItems: "center",

                padding: isCollapsed
                  ? "0 19px"
                  : "0 20px",

                gap: "12px",

                borderBottom:
                  "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Logo */}

              <div
                style={{
                  width: "36px",
                  height: "36px",
                  minWidth: "36px",

                  borderRadius: "11px",

                  backgroundColor: "#ffffff",
                  color: "#07145c",

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",

                  boxShadow:
                    "0 8px 20px rgba(0,0,0,0.12)",
                }}
              >
                <MessageSquare
                  size={18}
                  strokeWidth={2.5}
                />
              </div>

              {!isCollapsed && (
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,

                      color: "#ffffff",

                      fontSize: "17px",
                      fontWeight: 800,

                      letterSpacing: "-0.02em",
                    }}
                  >
                    Sms
                    <span
                      style={{
                        color: "#67e8f9",
                      }}
                    >
                      Force
                    </span>
                  </p>

                  <p
                    style={{
                      margin: "2px 0 0",

                      fontSize: "9px",

                      color:
                        "rgba(191,219,254,0.55)",

                      textTransform: "uppercase",

                      letterSpacing: "0.13em",

                      fontWeight: 700,
                    }}
                  >
                    Messaging platform
                  </p>
                </div>
              )}
            </div>

            {/* ==================================================
                USER AREA
            ================================================== */}

            {!isCollapsed && (
              <div
                style={{
                  margin: "14px 14px 8px",

                  padding: "11px 12px",

                  borderRadius: "15px",

                  backgroundColor:
                    "rgba(255,255,255,0.055)",

                  border:
                    "1px solid rgba(255,255,255,0.07)",

                  display: "flex",
                  alignItems: "center",

                  gap: "10px",

                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "34px",
                    height: "34px",

                    borderRadius: "11px",

                    backgroundColor: "#f59e0b",
                    color: "#fff",

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",

                    flexShrink: 0,
                  }}
                >
                  <UserIcon size={17} />
                </div>

                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <p
                    style={{
                      margin: 0,

                      fontSize: "14px",
                      fontWeight: 700,

                      color: "#ffffff",

                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user?.displayName || "User"}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",

                      gap: "5px",

                      marginTop: "3px",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",

                        borderRadius: "50%",

                        backgroundColor:
                          "#34d399",
                      }}
                    />

                    <span
                      style={{
                        fontSize: "10px",

                        color: "#86efac",

                        fontWeight: 600,
                      }}
                    >
                      Online
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================
                NAVIGATION

                ALL ITEMS COME BEFORE THE WALLET.
            ================================================== */}

            <nav
              style={{
                padding: "12px 10px 8px",
              }}
            >
              {!isCollapsed && (
                <p
                  style={{
                    margin: "4px 11px 11px",

                    fontSize: "10px",
                    fontWeight: 800,

                    letterSpacing: "0.16em",

                    textTransform: "uppercase",

                    color:
                      "rgba(191,219,254,0.45)",
                  }}
                >
                  Messaging
                </p>
              )}

              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;

                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(
                      `${item.href}/`
                    ));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() =>
                      setIsMobileOpen(false)
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",

                      gap: "13px",

                      padding: isCollapsed
                        ? "12px 0"
                        : "11px 12px",

                      justifyContent: isCollapsed
                        ? "center"
                        : "flex-start",

                      borderRadius: "13px",

                      fontSize: "14px",

                      fontWeight: isActive
                        ? 700
                        : 500,

                      color: isActive
                        ? "#ffffff"
                        : "#b8c5e3",

                      backgroundColor:
                        isActive
                          ? "rgba(255,255,255,0.10)"
                          : "transparent",

                      textDecoration: "none",

                      marginBottom: "4px",

                      transition:
                        "background-color 0.15s ease, color 0.15s ease",

                      position: "relative",
                    }}
                    title={
                      isCollapsed
                        ? item.name
                        : undefined
                    }
                  >
                    {/* Active indicator */}

                    {isActive && (
                      <span
                        style={{
                          position: "absolute",

                          left: 0,
                          top: "50%",

                          transform:
                            "translateY(-50%)",

                          width: "3px",
                          height: "22px",

                          borderRadius:
                            "0 4px 4px 0",

                          backgroundColor:
                            "#67e8f9",
                        }}
                      />
                    )}

                    <Icon
                      size={19}
                      strokeWidth={
                        isActive ? 2.4 : 1.9
                      }
                      style={{
                        flexShrink: 0,

                        color: isActive
                          ? "#facc15"
                          : "#9fb0d4",
                      }}
                    />

                    {!isCollapsed && (
                      <span
                        style={{
                          whiteSpace:
                            "nowrap",

                          overflow: "hidden",

                          textOverflow:
                            "ellipsis",

                          flex: 1,
                        }}
                      >
                        {item.name}
                      </span>
                    )}

                    {/* Bulk SMS indicator */}

                    {!isCollapsed &&
                      item.href ===
                        "/bulkSms" && (
                        <span
                          style={{
                            fontSize: "8px",

                            fontWeight: 800,

                            padding: "3px 6px",

                            borderRadius:
                              "999px",

                            color: "#07145c",

                            backgroundColor:
                              "#67e8f9",
                          }}
                        >
                          SEND
                        </span>
                      )}
                  </Link>
                );
              })}
            </nav>

            {/* ==================================================
                SMS WALLET

                IMPORTANT:
                This comes AFTER Referral + Settings.
            ================================================== */}

            <div
              style={{
                padding: isCollapsed
                  ? "10px"
                  : "10px 14px 14px",

                marginTop: "2px",
              }}
            >
              {isCollapsed ? (
                <Link
                  href="/fund-wallet"
                  title={`₦${formattedBalance} • ${formattedUnits} SMS`}
                  style={{
                    display: "flex",

                    width: "44px",
                    height: "44px",

                    margin: "0 auto",

                    borderRadius: "14px",

                    alignItems: "center",
                    justifyContent: "center",

                    color: "#facc15",

                    backgroundColor:
                      "rgba(255,255,255,0.08)",

                    textDecoration: "none",
                  }}
                >
                  <Wallet size={19} />
                </Link>
              ) : (
                <div
                  style={{
                    borderRadius: "19px",

                    padding: "15px",

                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035))",

                    border:
                      "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  {/* Wallet title */}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",

                      justifyContent:
                        "space-between",

                      marginBottom: "7px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",

                        gap: "7px",
                      }}
                    >
                      <Wallet
                        size={13}
                        color="#94a3b8"
                      />

                      <span
                        style={{
                          fontSize: "9px",

                          fontWeight: 800,

                          letterSpacing:
                            "0.12em",

                          color: "#94a3b8",

                          textTransform:
                            "uppercase",
                        }}
                      >
                        SMS Wallet
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: "9px",
                        color: "#64748b",
                      }}
                    >
                      ₦8.40 / SMS
                    </span>
                  </div>

                  {/* Balance */}

                  <p
                    style={{
                      margin: 0,

                      color: "#facc15",

                      fontSize: "20px",

                      lineHeight: 1.2,

                      fontWeight: 800,

                      letterSpacing:
                        "-0.03em",
                    }}
                  >
                    ₦{formattedBalance}
                  </p>

                  {/* SMS Units */}

                  <div
                    style={{
                      marginTop: "5px",

                      display: "flex",
                      alignItems: "center",

                      gap: "6px",
                    }}
                  >
                    <MessageSquare
                      size={12}
                      color="#67e8f9"
                    />

                    <span
                      style={{
                        color: "#cbd5e1",

                        fontSize: "11px",

                        fontWeight: 600,
                      }}
                    >
                      ≈ {formattedUnits} SMS
                      Units
                    </span>
                  </div>

                  {/* Top up */}

                  <Link
                    href="/fund-wallet"
                    style={{
                      display: "flex",

                      alignItems: "center",
                      justifyContent:
                        "center",

                      gap: "6px",

                      width: "100%",

                      marginTop: "13px",

                      padding: "9px 10px",

                      borderRadius: "12px",

                      background:
                        "linear-gradient(135deg, #facc15, #f59e0b)",

                      color: "#111827",

                      fontSize: "11px",

                      fontWeight: 800,

                      textDecoration: "none",

                      boxShadow:
                        "0 7px 18px rgba(245,158,11,0.16)",
                    }}
                  >
                    Top up wallet
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              )}
            </div>

            {/* ==================================================
                LOGOUT
            ================================================== */}

            <div
              style={{
                padding: "8px 10px 18px",

                borderTop:
                  "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",

                  display: "flex",
                  alignItems: "center",

                  justifyContent: isCollapsed
                    ? "center"
                    : "flex-start",

                  gap: "12px",

                  padding: isCollapsed
                    ? "10px 0"
                    : "10px 11px",

                  borderRadius: "12px",

                  fontSize: "14px",
                  fontWeight: 600,

                  color: "#fca5a5",

                  backgroundColor:
                    "transparent",

                  border: "none",

                  cursor: "pointer",
                }}
                title={
                  isCollapsed
                    ? "Log Out"
                    : undefined
                }
              >
                <LogOut
                  size={18}
                  style={{
                    flexShrink: 0,
                  }}
                />

                {!isCollapsed && (
                  <span>Log Out</span>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* ====================================================
            MAIN CONTENT
        ==================================================== */}

        <div
          className={[
            "main-container",
            isCollapsed
              ? "collapsed"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* ==================================================
              HEADER
          ================================================== */}

          <header
            style={{
              height: "64px",

              backgroundColor: "#ffffff",

              borderBottom:
                "1px solid #e5e7eb",

              display: "flex",
              alignItems: "center",

              padding: "0 18px",

              position: "sticky",
              top: 0,

              zIndex: 30,
            }}
          >
            {/* Menu */}

            <button
              onClick={toggleSidebar}
              style={{
                width: "38px",
                height: "38px",

                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",

                borderRadius: "11px",

                padding: 0,

                backgroundColor:
                  "#f8fafc",

                border:
                  "1px solid #e5e7eb",

                cursor: "pointer",

                marginRight: "14px",
              }}
              aria-label="Toggle Menu"
            >
              <Menu
                size={19}
                color="#334155"
              />
            </button>

            {/* ==================================================
                SMS CREDITS + BALANCE
            ================================================== */}

            <div
              style={{
                display: "flex",
                alignItems: "center",

                gap: "12px",
              }}
            >
              {/* SMS Credits */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",

                  gap: "6px",

                  backgroundColor:
                    "#f8fafc",

                  border:
                    "1px solid #e5e7eb",

                  padding: "7px 11px",

                  borderRadius: "10px",
                }}
              >
                <MessageSquare
                  size={15}
                  color="#07145c"
                />

                <span
                  style={{
                    fontSize: "12px",

                    color: "#64748b",

                    fontWeight: 600,
                  }}
                >
                  SMS CREDITS:
                </span>

                <span
                  style={{
                    fontSize: "13px",

                    color: "#0f172a",

                    fontWeight: 800,
                  }}
                >
                  {formattedUnits}
                </span>
              </div>

              {/* Wallet */}

              <Link
                href="/fund-wallet"
                style={{
                  display: "flex",
                  alignItems: "center",

                  gap: "7px",

                  backgroundColor:
                    "#f8fafc",

                  padding: "7px 11px",

                  borderRadius: "10px",

                  fontSize: "13px",

                  fontWeight: 700,

                  color: "#111827",

                  border:
                    "1px solid #e5e7eb",

                  textDecoration: "none",
                }}
              >
                <Wallet
                  size={15}
                  color="#059669"
                />

                ₦{formattedBalance}
              </Link>
            </div>

            {/* ==================================================
                START SENDING MESSAGES
            ================================================== */}

            <div
              style={{
                marginLeft: "auto",
              }}
            >
              <Link
                href="/bulkSms"
                style={{
                  display: "flex",

                  alignItems: "center",

                  gap: "9px",

                  textDecoration: "none",

                  color: "#07145c",

                  fontSize: "14px",

                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: "32px",
                    height: "32px",

                    borderRadius: "9px",

                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",

                    backgroundColor:
                      "#eef2ff",

                    color: "#07145c",
                  }}
                >
                  <Zap size={16} />
                </span>

                <span>
                  Start sending messages
                </span>

                <ChevronRight
                  size={16}
                  color="#94a3b8"
                />
              </Link>
            </div>
          </header>

          {/* ==================================================
              MAIN BODY
          ================================================== */}

          <main
            style={{
              flex: 1,

              padding: "24px",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
}