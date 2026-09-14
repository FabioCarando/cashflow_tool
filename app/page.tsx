"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Eye,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";

type EntryType = "income" | "expense" | "recurring";

type Transaction = {
  id: string;
  type: "income" | "expense";
  name: string;
  category: string | null;
  amount: number;
  currency: "EUR" | "HKD";
  transaction_date: string;
};

type RecurringItem = {
  id: string;
  type: "income" | "expense";
  name: string;
  category: string | null;
  amount: number;
  currency: "EUR" | "HKD";
  frequency: string;
  active: boolean;
};

export default function Home() {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [entryType, setEntryType] = useState<EntryType | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  /*
    TEMPORARY EXCHANGE RATE

    For now:
    €1 = HK$9

    Later we will replace this with
    historical monthly exchange rates.
  */
  const HKD_PER_EUR = 9;

  const openEntry = (type: EntryType) => {
    setIsAddOpen(false);
    setEntryType(type);
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      const now = new Date();

      const startOfPeriod = new Date(
        now.getFullYear(),
        now.getMonth() - 5,
        1
      );

      const startOfNextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      );

      const startDate = startOfPeriod
        .toISOString()
        .split("T")[0];

      const endDate = startOfNextMonth
        .toISOString()
        .split("T")[0];

      const {
        data: transactionData,
        error: transactionError,
      } = await supabase
        .from("transactions")
        .select("*")
        .gte("transaction_date", startDate)
        .lt("transaction_date", endDate)
        .order("transaction_date", {
          ascending: false,
        });

      const {
        data: recurringData,
        error: recurringError,
      } = await supabase
        .from("recurring_items")
        .select("*")
        .eq("active", true)
        .order("created_at", {
          ascending: false,
        });

      if (transactionError) {
        console.error(
          "Transactions error:",
          transactionError
        );
      }

      if (recurringError) {
        console.error(
          "Recurring error:",
          recurringError
        );
      }

      setTransactions(
        (transactionData ?? []) as Transaction[]
      );

      setRecurringItems(
        (recurringData ?? []) as RecurringItem[]
      );

      setLoading(false);
    };

    loadDashboard();
  }, [refreshKey]);

  const toEUR = (
    amount: number,
    currency: "EUR" | "HKD"
  ) => {
    if (currency === "EUR") {
      return Number(amount);
    }

    return Number(amount) / HKD_PER_EUR;
  };

  const now = new Date();

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthTransactions =
    transactions.filter((item) => {
      const itemDate = new Date(
        `${item.transaction_date}T00:00:00`
      );

      return (
        itemDate.getFullYear() === currentYear &&
        itemDate.getMonth() === currentMonth
      );
    });

  const income = currentMonthTransactions
    .filter((item) => item.type === "income")
    .reduce(
      (total, item) =>
        total + toEUR(item.amount, item.currency),
      0
    );

  const expenses = currentMonthTransactions
    .filter((item) => item.type === "expense")
    .reduce(
      (total, item) =>
        total + toEUR(item.amount, item.currency),
      0
    );

  const freeCashFlow = income - expenses;

  const savingsRate =
    income > 0
      ? (freeCashFlow / income) * 100
      : 0;

  const toMonthlyEquivalent = (
  amount: number,
  frequency: string
) => {
  switch (frequency) {
    case "weekly":
      return (amount * 52) / 12;

    case "quarterly":
      return amount / 3;

    case "yearly":
      return amount / 12;

    case "monthly":
    default:
      return amount;
  }
};

const fixedBurn = recurringItems
  .filter((item) => item.type === "expense")
  .reduce((total, item) => {
    const amountEUR = toEUR(
      item.amount,
      item.currency
    );

    return (
      total +
      toMonthlyEquivalent(
        amountEUR,
        item.frequency
      )
    );
  }, 0);

  const fixedBurnPercentage =
    income > 0
      ? (fixedBurn / income) * 100
      : 0;

  const monthlyCashFlow = Array.from(
    { length: 6 },
    (_, index) => {
      const date = new Date(
        currentYear,
        currentMonth - 5 + index,
        1
      );

      const year = date.getFullYear();
      const month = date.getMonth();

      const monthTransactions =
        transactions.filter((item) => {
          const itemDate = new Date(
            `${item.transaction_date}T00:00:00`
          );

          return (
            itemDate.getFullYear() === year &&
            itemDate.getMonth() === month
          );
        });

      const monthIncome = monthTransactions
        .filter((item) => item.type === "income")
        .reduce(
          (total, item) =>
            total +
            toEUR(item.amount, item.currency),
          0
        );

      const monthExpenses = monthTransactions
        .filter((item) => item.type === "expense")
        .reduce(
          (total, item) =>
            total +
            toEUR(item.amount, item.currency),
          0
        );

      return {
        label: date.toLocaleDateString("en-US", {
          month: "short",
        }),
        value: monthIncome - monthExpenses,
      };
    }
  );

  const maxCashFlow = Math.max(
    ...monthlyCashFlow.map((item) =>
      Math.abs(item.value)
    ),
    1
  );

  const currentCashFlow =
    monthlyCashFlow[5]?.value ?? 0;

  const previousCashFlow =
    monthlyCashFlow[4]?.value ?? 0;

  const cashFlowChange =
    previousCashFlow !== 0
      ? ((currentCashFlow - previousCashFlow) /
          Math.abs(previousCashFlow)) *
        100
      : 0;

  const formatEUR = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value);
  };

  const monthName = new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
    }
  ).format(new Date());

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#090A0B] text-white">
      {/* BACKGROUND GLOWS */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[#CCFF33]/10 blur-[120px]" />
        <div className="absolute right-[-120px] top-[220px] h-[380px] w-[380px] rounded-full bg-[#7567FF]/15 blur-[140px]" />
        <div className="absolute bottom-[-120px] left-[30%] h-[340px] w-[340px] rounded-full bg-[#FF8CA8]/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto min-h-screen max-w-md px-4 pb-32 pt-5">
        {/* HEADER */}
        <header className="flex items-center justify-between px-1">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/30">
              Personal wealth
            </p>

            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-[28px] font-semibold tracking-[-0.05em]">
                {monthName}
              </h1>

              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 backdrop-blur-xl">
                <div className="h-1.5 w-1.5 rounded-full bg-[#CCFF33] shadow-[0_0_12px_#CCFF33]" />

                <span className="text-[9px] font-medium text-white/45">
                  LIVE
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-2xl transition active:scale-95"
          >
            <Plus size={20} />
          </button>
        </header>

        {/* HERO */}
        <section className="mt-6">
          <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-white/[0.055] p-[1px] shadow-[0_40px_100px_rgba(0,0,0,0.45)] backdrop-blur-3xl">
            <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-[#CCFF33]/10 blur-[80px]" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-[#7567FF]/15 blur-[90px]" />

            <div className="relative rounded-[37px] bg-gradient-to-br from-white/[0.08] via-white/[0.025] to-transparent px-6 pb-6 pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/35">
                      Free cash flow
                    </p>

                    <Eye
                      size={13}
                      className="text-white/25"
                    />
                  </div>

                  <div className="mt-4 flex items-start">
                    <span className="mt-2 text-[22px] font-medium text-white/35">
                      €
                    </span>

                    <span className="ml-1 text-[62px] font-semibold leading-none tracking-[-0.075em]">
                      {loading
                        ? "—"
                        : formatEUR(freeCashFlow)}
                    </span>
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.06]">
                  <Wallet
                    size={19}
                    className="text-white/80"
                  />
                </div>
              </div>

              {/* TODO: NEXT STEP -> REAL MONTH COMPARISON */}
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#CCFF33]/15 bg-[#CCFF33]/10 px-3 py-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#CCFF33] text-black">
                  <ArrowUpRight
                    size={13}
                    strokeWidth={2.6}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`text-[12px] font-semibold ${
                      cashFlowChange >= 0
                        ? "text-[#D8FF6A]"
                        : "text-[#FF8CA8]"
                    }`}
                  >
                    {cashFlowChange >= 0 ? "+" : ""}
                    {cashFlowChange.toFixed(1)}%
                  </span>

                  <span className="text-[11px] text-white/35">
                    vs last month
                  </span>
                </div>
              </div>

              {/* INCOME + EXPENSE */}
              <div className="mt-7 grid grid-cols-2 gap-3">
                <MiniStat
                  title="Income"
                  value={
                    loading
                      ? "—"
                      : `€${formatEUR(income)}`
                  }
                  icon={
                    <ArrowDownLeft size={15} />
                  }
                />

                <MiniStat
                  title="Expenses"
                  value={
                    loading
                      ? "—"
                      : `€${formatEUR(expenses)}`
                  }
                  icon={
                    <ArrowUpRight size={15} />
                  }
                />
              </div>

              {/* SMART INSIGHT */}
              <div className="mt-3 flex items-center justify-between rounded-[22px] border border-white/[0.07] bg-black/20 px-4 py-3 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#CCFF33] text-black">
                    <Sparkles size={16} />
                  </div>

                  <div>
                    <p className="text-[11px] text-white/35">
                      Smart insight
                    </p>

                    <p className="text-[13px] font-medium">
                      {income > 0
                        ? savingsRate >= 30
                          ? "Strong savings month"
                          : savingsRate > 0
                          ? "Positive cash flow"
                          : "Expenses exceed income"
                        : "Add income to unlock insights"}
                    </p>
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  className="text-white/25"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SAVINGS + FIXED BURN */}
        <section className="mt-4 grid grid-cols-2 gap-3">
          {/* SAVINGS */}
          <div className="relative overflow-hidden rounded-[30px] bg-[#CCFF33] p-5 text-black">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/30 blur-[30px]" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
                  Savings
                </p>

                <TrendingUp size={17} />
              </div>

              <p className="mt-7 text-[38px] font-semibold tracking-[-0.06em]">
                {loading
                  ? "—"
                  : savingsRate.toFixed(1)}

                {!loading && (
                  <span className="text-[20px]">
                    %
                  </span>
                )}
              </p>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/10">
                <div
                  style={{
                    width: `${Math.min(
                      Math.max(savingsRate, 0),
                      100
                    )}%`,
                  }}
                  className="h-full rounded-full bg-black transition-all duration-700"
                />
              </div>

              <p className="mt-3 text-[10px] leading-relaxed text-black/45">
                {income === 0
                  ? "Add income to calculate your savings rate."
                  : savingsRate >= 50
                  ? "More than half of your income stayed yours."
                  : savingsRate > 0
                  ? "Your cash flow is positive this month."
                  : "You are spending more than you earn."}
              </p>
            </div>
          </div>

          {/* FIXED BURN */}
          <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-2xl">
            <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-[#7567FF]/20 blur-[40px]" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  Fixed burn
                </p>

                <RefreshCcw
                  size={16}
                  className="text-white/45"
                />
              </div>

              <p className="mt-7 text-[30px] font-semibold tracking-[-0.05em]">
                {loading
                  ? "—"
                  : `€${formatEUR(fixedBurn)}`}
              </p>

              <p className="mt-1 text-[12px] text-white/30">
                monthly commitments
              </p>

              <div className="mt-5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    style={{
                      width: `${Math.min(
                        Math.max(
                          fixedBurnPercentage,
                          0
                        ),
                        100
                      )}%`,
                    }}
                    className="h-full rounded-full bg-white/60 transition-all duration-700"
                  />
                </div>

                <span className="text-[10px] text-white/35">
                  {fixedBurnPercentage.toFixed(0)}
                  %
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CHART */}
        <section className="mt-4 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-2xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                Cash flow
              </p>

              <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em]">
                Last 6 months
              </h2>
            </div>

            <button className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <MoreHorizontal
                size={17}
                className="text-white/50"
              />
            </button>
          </div>

          {/*
            Chart is still visual/demo.
            In the next step we will calculate
            the last 6 months from Supabase.
          */}
          <div className="mt-8 flex h-36 items-end justify-between gap-2">
            {monthlyCashFlow.map((item, index) => {
              const percentage =
                (Math.abs(item.value) / maxCashFlow) * 100;

              const height = `${Math.max(
                percentage,
                6
              )}%`;

              return (
                <Bar
                  key={`${item.label}-${index}`}
                  label={item.label}
                  height={height}
                  active={
                    index === monthlyCashFlow.length - 1
                  }
                />
              );
            })}
          </div>
        </section>

        {/* RECURRING */}
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                Commitments
              </p>

              <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.045em]">
                Recurring
              </h2>
            </div>

            <button className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/45">
              View all
            </button>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] backdrop-blur-2xl">
            {loading ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[13px] text-white/30">
                  Loading...
                </p>
              </div>
            ) : recurringItems.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[13px] text-white/30">
                  No recurring payments yet
                </p>
              </div>
            ) : (
              recurringItems
                .slice(0, 4)
                .map((item, index) => (
                  <RecurringRow
                    key={item.id}
                    emoji={getCategoryEmoji(
                      item.category
                    )}
                    name={item.name}
                    category={
                      item.category ?? "Other"
                    }
                    amount={
                      item.currency === "EUR"
                        ? `€${Number(
                            item.amount
                          ).toLocaleString()}`
                        : `HK$ ${Number(
                            item.amount
                          ).toLocaleString()}`
                    }
                    last={
                      index ===
                      Math.min(
                        recurringItems.length,
                        4
                      ) -
                        1
                    }
                  />
                ))
            )}
          </div>
        </section>

        {/* NAVIGATION */}
        <nav className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-30px)] max-w-[400px] -translate-x-1/2 items-center justify-between rounded-[28px] border border-white/10 bg-[#111214]/80 p-2 backdrop-blur-3xl">
          <NavItem
            active
            icon={<Wallet size={18} />}
            label="Home"
          />

          <button
            onClick={() => router.push("/activity")}
            className="flex h-12 min-w-[56px] flex-col items-center justify-center gap-1 rounded-[18px] text-white/35 transition hover:bg-white/[0.05] hover:text-white"
          >
            <CreditCard size={18} />
            <span className="text-[8px] font-medium">
              Activity
            </span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#CCFF33] text-black shadow-[0_0_35px_rgba(204,255,51,0.28)] transition active:scale-95"
          >
            <Plus
              size={21}
              strokeWidth={2.5}
            />
          </button>

          <button
            onClick={() => router.push("/recurring")}
            className="flex h-12 min-w-[56px] flex-col items-center justify-center gap-1 rounded-[18px] text-white/35 transition hover:bg-white/[0.05] hover:text-white"
          >
            <RefreshCcw size={18} />

            <span className="text-[8px] font-medium">
              Recurring
            </span>
          </button>

          <NavItem
            icon={<Zap size={18} />}
            label="Insights"
          />
        </nav>
      </div>

      {/* ADD SHEET */}
      {isAddOpen && (
        <AddSheet
          onClose={() =>
            setIsAddOpen(false)
          }
          onSelect={openEntry}
        />
      )}

      {/* ENTRY SHEET */}
      {entryType && (
        <EntrySheet
          type={entryType}
          onClose={() =>
            setEntryType(null)
          }
          onSaved={() =>
            setRefreshKey(
              (previous) => previous + 1
            )
          }
        />
      )}
    </main>
  );
}

/* ------------------------------------------------ */
/* CATEGORY EMOJI                                   */
/* ------------------------------------------------ */

function getCategoryEmoji(
  category: string | null
) {
  switch (category) {
    case "Housing":
      return "🏠";

    case "Food":
      return "🍜";

    case "Transport":
      return "🚕";

    case "Lifestyle":
      return "✨";

    case "Subscription":
      return "💳";

    case "Music":
      return "🎹";

    case "Salary":
      return "💰";

    case "Freelance":
      return "💻";

    default:
      return "◉";
  }
}

/* ------------------------------------------------ */
/* ADD SHEET                                        */
/* ------------------------------------------------ */

function AddSheet({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (type: EntryType) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100]">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />

      <div className="absolute bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 animate-[sheetUp_0.32s_ease-out] rounded-t-[38px] border border-white/10 bg-[#111214] px-5 pb-8 pt-3">
        <div className="mx-auto h-1.5 w-11 rounded-full bg-white/15" />

        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
              New movement
            </p>

            <h3 className="mt-1 text-[28px] font-semibold tracking-[-0.05em]">
              Add something
            </h3>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          <ActionCard
            icon={
              <ArrowDownLeft size={21} />
            }
            title="Income"
            subtitle="Salary, gig, consulting..."
            className="bg-[#CCFF33] text-black"
            onClick={() =>
              onSelect("income")
            }
          />

          <ActionCard
            icon={
              <ArrowUpRight size={21} />
            }
            title="Expense"
            subtitle="One-off spending"
            className="bg-white/[0.06] text-white"
            onClick={() =>
              onSelect("expense")
            }
          />

          <ActionCard
            icon={
              <RefreshCcw size={21} />
            }
            title="Recurring"
            subtitle="Rent, subscriptions, memberships"
            className="bg-[#7567FF]/20 text-white"
            onClick={() =>
              onSelect("recurring")
            }
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------ */
/* ENTRY SHEET                                      */
/* ------------------------------------------------ */

function EntrySheet({
  type,
  onClose,
  onSaved,
}: {
  type: EntryType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [currency, setCurrency] =
    useState<"EUR" | "HKD">("EUR");

  const [amount, setAmount] =
    useState("");

  const [name, setName] =
    useState("");

  const [category, setCategory] =
    useState("Other");

  const [saving, setSaving] =
    useState(false);
  const [date, setDate] = 
  useState(new Date().toISOString().split("T")[0]);

  const title =
    type === "income"
      ? "New income"
      : type === "expense"
      ? "New expense"
      : "New recurring";

  const handleKey = (key: string) => {
    if (key === "delete") {
      setAmount((previous) =>
        previous.slice(0, -1)
      );

      return;
    }

    if (
      key === "." &&
      amount.includes(".")
    ) {
      return;
    }

    if (amount.length >= 10) {
      return;
    }

    setAmount(
      (previous) => previous + key
    );
  };

  const saveEntry = async () => {
    if (!amount || !name.trim()) {
      return;
    }

    const numericAmount =
      Number(amount);

    if (
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      alert("Please enter a valid amount.");
      return;
    }

    setSaving(true);

    try {
      if (type === "recurring") {
        const { error } =
          await supabase
            .from("recurring_items")
            .insert({
              type: "expense",
              name: name.trim(),
              category,
              amount: numericAmount,
              currency,
              frequency: "monthly",
              start_date: date,});

        if (error) {
          throw error;
        }
      } else {
        const { error } =
          await supabase
            .from("transactions")
            .insert({
              type,
              name: name.trim(),
              category,
              amount: numericAmount,
              currency,
              transaction_date: date,});

        if (error) {
          throw error;
        }
      }

      /*
        IMPORTANT:
        refresh the Home after saving
      */
      onSaved();

      /*
        then close the sheet
      */
      onClose();
    } catch (error) {
      console.error(
        "Save error:",
        error
      );

      alert(
        "Something went wrong while saving."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110]">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      <div className="absolute bottom-0 left-1/2 max-h-[96vh] w-full max-w-md -translate-x-1/2 overflow-y-auto animate-[sheetUp_0.32s_ease-out] rounded-t-[40px] border border-white/10 bg-[#0F1012] px-5 pb-7 pt-3">
        <div className="mx-auto h-1.5 w-11 rounded-full bg-white/15" />

        {/* HEADER */}
        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
              {type}
            </p>

            <h3 className="mt-1 text-[28px] font-semibold tracking-[-0.05em]">
              {title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06]"
          >
            <X size={18} />
          </button>
        </div>

        {/* AMOUNT */}
        <div className="mt-8 flex items-center justify-center">
          <div className="flex items-end">
            <span className="mb-2 text-[24px] text-white/25">
              {currency === "EUR"
                ? "€"
                : "HK$"}
            </span>

            <span className="ml-2 max-w-[250px] overflow-hidden text-[64px] font-semibold leading-none tracking-[-0.07em]">
              {amount || "0"}
            </span>
          </div>
        </div>

        {/* CURRENCY */}
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() =>
              setCurrency("EUR")
            }
            className={`rounded-full px-4 py-2 text-[12px] font-medium transition ${
              currency === "EUR"
                ? "bg-[#CCFF33] text-black"
                : "bg-white/[0.06] text-white/40"
            }`}
          >
            EUR
          </button>

          <button
            onClick={() =>
              setCurrency("HKD")
            }
            className={`rounded-full px-4 py-2 text-[12px] font-medium transition ${
              currency === "HKD"
                ? "bg-[#CCFF33] text-black"
                : "bg-white/[0.06] text-white/40"
            }`}
          >
            HKD
          </button>
        </div>

        {/* DETAILS */}
        <div className="mt-8 grid gap-3">
          {/* NAME */}
          <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
              Name
            </p>

            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Spotify, Salary, Rent..."
              className="mt-1 w-full bg-transparent text-[14px] font-medium text-white outline-none placeholder:text-white/20"
            />
          </div>

          {/* CATEGORY */}
          <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
              Category
            </p>

            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
              className="mt-1 w-full bg-transparent text-[14px] font-medium text-white outline-none"
            >
              <option
                className="bg-[#111214]"
                value="Housing"
              >
                Housing
              </option>

              <option
                className="bg-[#111214]"
                value="Food"
              >
                Food
              </option>

              <option
                className="bg-[#111214]"
                value="Transport"
              >
                Transport
              </option>

              <option
                className="bg-[#111214]"
                value="Lifestyle"
              >
                Lifestyle
              </option>

              <option
                className="bg-[#111214]"
                value="Subscription"
              >
                Subscription
              </option>

              <option
                className="bg-[#111214]"
                value="Music"
              >
                Music
              </option>

              <option
                className="bg-[#111214]"
                value="Salary"
              >
                Salary
              </option>

              <option
                className="bg-[#111214]"
                value="Freelance"
              >
                Freelance
              </option>

              <option
                className="bg-[#111214]"
                value="Other"
              >
                Other
              </option>
            </select>
          </div>

          {/* DATE */}
          <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/[0.06]">
                <CalendarDays
                  size={17}
                  className="text-white/50"
                />
              </div>

              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                  Date
                </p>

                <input
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  className="mt-1 w-full bg-transparent text-[14px] font-medium text-white outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KEYPAD */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            ".",
            "0",
          ].map((key) => (
            <button
              key={key}
              onClick={() =>
                handleKey(key)
              }
              className="flex h-14 items-center justify-center rounded-[20px] bg-white/[0.055] text-[22px] font-medium transition active:scale-95 active:bg-white/[0.1]"
            >
              {key}
            </button>
          ))}

          <button
            onClick={() =>
              handleKey("delete")
            }
            className="flex h-14 items-center justify-center rounded-[20px] bg-white/[0.055] text-[15px] text-white/45 transition active:scale-95"
          >
            Delete
          </button>
        </div>

        {/* SAVE */}
        <button
          onClick={saveEntry}
          disabled={
            !amount ||
            !name.trim() ||
            saving
          }
          className={`mt-5 w-full rounded-[24px] py-4 text-[15px] font-semibold transition active:scale-[0.985] ${
            amount &&
            name.trim() &&
            !saving
              ? "bg-[#CCFF33] text-black"
              : "bg-white/[0.06] text-white/20"
          }`}
        >
          {saving
            ? "Saving..."
            : "Save"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------ */
/* ACTION CARD                                      */
/* ------------------------------------------------ */

function ActionCard({
  icon,
  title,
  subtitle,
  className,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-[26px] p-4 text-left transition active:scale-[0.985] ${className}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-black/10">
          {icon}
        </div>

        <div>
          <p className="text-[16px] font-semibold">
            {title}
          </p>

          <p className="mt-1 text-[11px] opacity-50">
            {subtitle}
          </p>
        </div>
      </div>

      <ChevronRight
        size={18}
        className="opacity-40"
      />
    </button>
  );
}

/* ------------------------------------------------ */
/* MINI STAT                                        */
/* ------------------------------------------------ */

function MiniStat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-white/[0.07] bg-black/20 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
          {title}
        </p>

        <div className="text-white/30">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-[20px] font-semibold tracking-[-0.035em]">
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------ */
/* CHART BAR                                        */
/* ------------------------------------------------ */

function Bar({
  label,
  height,
  active = false,
}: {
  label: string;
  height: string;
  active?: boolean;
}) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-end gap-3">
      <div className="relative flex h-full w-full items-end justify-center">
        <div
          style={{ height }}
          className={`w-full max-w-[34px] rounded-[10px] transition-all duration-700 ${
            active
              ? "bg-[#CCFF33] shadow-[0_0_25px_rgba(204,255,51,0.18)]"
              : "bg-white/[0.08]"
          }`}
        />
      </div>

      <span
        className={`text-[9px] ${
          active
            ? "font-semibold text-white"
            : "text-white/25"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------ */
/* RECURRING ROW                                    */
/* ------------------------------------------------ */

function RecurringRow({
  emoji,
  name,
  category,
  amount,
  last = false,
}: {
  emoji: string;
  name: string;
  category: string;
  amount: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-4 ${
        !last
          ? "border-b border-white/[0.06]"
          : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-white/[0.06] text-[19px]">
          {emoji}
        </div>

        <div>
          <p className="text-[14px] font-medium">
            {name}
          </p>

          <p className="mt-1 text-[10px] text-white/30">
            {category}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-[13px] font-medium">
          {amount}
        </p>

        <ChevronRight
          size={15}
          className="text-white/20"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------ */
/* NAV ITEM                                         */
/* ------------------------------------------------ */

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex h-12 min-w-[56px] flex-col items-center justify-center gap-1 rounded-[18px] transition ${
        active
          ? "bg-white text-black"
          : "text-white/35 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {icon}

      <span className="text-[8px] font-medium">
        {label}
      </span>
    </button>
  );
}

