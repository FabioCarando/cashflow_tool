"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Pencil,
  Save,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Transaction = {
  id: string;
  type: "income" | "expense";
  name: string;
  category: string | null;
  amount: number;
  currency: "EUR" | "HKD";
  transaction_date: string;
};

export default function ActivityPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("Other");
  const [editCurrency, setEditCurrency] =
    useState<"EUR" | "HKD">("EUR");
  const [editDate, setEditDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`
  );

  // Temporary exchange rate.
  // Later we will replace this with historical FX rates.
  const HKD_PER_EUR = 9;

  const toEUR = (
    amount: number,
    currency: "EUR" | "HKD"
  ) => {
    return currency === "EUR"
      ? Number(amount)
      : Number(amount) / HKD_PER_EUR;
  };

  const loadTransactions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", {
        ascending: false,
      });

    if (error) {
      console.error("Activity error:", error);
    }

    setTransactions((data ?? []) as Transaction[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) =>
      item.transaction_date.startsWith(selectedMonth)
    );
  }, [transactions, selectedMonth]);

  const income = filteredTransactions
    .filter((item) => item.type === "income")
    .reduce(
      (total, item) =>
        total + toEUR(item.amount, item.currency),
      0
    );

  const expenses = filteredTransactions
    .filter((item) => item.type === "expense")
    .reduce(
      (total, item) =>
        total + toEUR(item.amount, item.currency),
      0
    );

  const netCashFlow = income - expenses;

  const deleteTransaction = async (id: string) => {
    const confirmed = window.confirm(
      "Delete this transaction?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      alert("Could not delete this transaction.");
      return;
    }

    setTransactions((previous) =>
      previous.filter((item) => item.id !== id)
    );
  };

  const openEdit = (item: Transaction) => {
    setEditingTransaction(item);
    setEditName(item.name);
    setEditAmount(String(item.amount));
    setEditCategory(item.category ?? "Other");
    setEditCurrency(item.currency);
    setEditDate(item.transaction_date);
  };

  const saveEdit = async () => {
    if (!editingTransaction) return;

    const numericAmount = Number(editAmount);

    if (
      !editName.trim() ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0 ||
      !editDate
    ) {
      alert("Please complete all required fields.");
      return;
    }

    setSavingEdit(true);

    const { error } = await supabase
      .from("transactions")
      .update({
        type: editingTransaction.type,
        name: editName.trim(),
        amount: numericAmount,
        category: editCategory,
        currency: editCurrency,
        transaction_date: editDate,
      })
      .eq("id", editingTransaction.id);

    if (error) {
      console.error("Update error:", error);
      alert("Could not update transaction.");
      setSavingEdit(false);
      return;
    }

    setTransactions((previous) =>
      previous.map((item) =>
        item.id === editingTransaction.id
          ? {
              ...item,
              name: editName.trim(),
              amount: numericAmount,
              category: editCategory,
              currency: editCurrency,
              transaction_date: editDate,
            }
          : item
      )
    );

    setEditingTransaction(null);
    setSavingEdit(false);
  };

  const formatAmount = (item: Transaction) => {
    if (item.currency === "EUR") {
      return `€${Number(item.amount).toLocaleString(
        undefined,
        {
          maximumFractionDigits: 2,
        }
      )}`;
    }

    return `HK$ ${Number(item.amount).toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const formatEUR = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <main className="min-h-screen bg-[#090A0B] text-white">
      {/* BACKGROUND GLOWS */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[#CCFF33]/10 blur-[120px]" />

        <div className="absolute right-[-120px] top-[220px] h-[380px] w-[380px] rounded-full bg-[#7567FF]/15 blur-[140px]" />
      </div>

      <div className="relative mx-auto min-h-screen max-w-md px-4 pb-12 pt-5">
        {/* HEADER */}

        <header className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] transition hover:bg-white/[0.08]"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
              Money history
            </p>

            <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.045em]">
              Activity
            </h1>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
            <Wallet
              size={17}
              className="text-white/50"
            />
          </div>
        </header>

        {/* MONTH FILTER */}

        <section className="mt-7 rounded-[30px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                Month
              </p>

              <p className="mt-1 text-[17px] font-semibold">
                Filter activity
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/[0.06]">
              <CalendarDays
                size={17}
                className="text-white/50"
              />
            </div>
          </div>

          <input
            type="month"
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(event.target.value)
            }
            className="mt-5 w-full rounded-[18px] border border-white/[0.08] bg-black/20 px-4 py-3 text-[14px] text-white outline-none [color-scheme:dark]"
          />
        </section>

        {/* KPI */}

        <section className="mt-4 grid grid-cols-2 gap-3">
          {/* INCOME */}

          <div className="rounded-[26px] bg-[#CCFF33] p-4 text-black">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.16em] text-black/45">
                Income
              </p>

              <ArrowDownLeft size={16} />
            </div>

            <p className="mt-5 text-[25px] font-semibold tracking-[-0.05em]">
              {formatEUR(income)}
            </p>
          </div>

          {/* EXPENSES */}

          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                Expenses
              </p>

              <ArrowUpRight
                size={16}
                className="text-white/45"
              />
            </div>

            <p className="mt-5 text-[25px] font-semibold tracking-[-0.05em]">
              {formatEUR(expenses)}
            </p>
          </div>
        </section>

        {/* NET CASH FLOW */}

        <section className="mt-3 rounded-[26px] border border-white/[0.08] bg-white/[0.035] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                Net cash flow
              </p>

              <p
                className={`mt-1 text-[20px] font-semibold tracking-[-0.04em] ${
                  netCashFlow >= 0
                    ? "text-[#CCFF33]"
                    : "text-[#FF8CA8]"
                }`}
              >
                {netCashFlow >= 0 ? "+" : ""}
                {formatEUR(netCashFlow)}
              </p>
            </div>

            <div
              className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${
                netCashFlow >= 0
                  ? "bg-[#CCFF33]/10 text-[#CCFF33]"
                  : "bg-[#FF8CA8]/10 text-[#FF8CA8]"
              }`}
            >
              {netCashFlow >= 0 ? (
                <ArrowUpRight size={17} />
              ) : (
                <ArrowDownLeft size={17} />
              )}
            </div>
          </div>
        </section>

        {/* TRANSACTIONS */}

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
              Transactions
            </p>

            <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.045em]">
              {filteredTransactions.length}{" "}
              {filteredTransactions.length === 1
                ? "movement"
                : "movements"}
            </h2>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045]">
            {loading ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[13px] text-white/30">
                  Loading...
                </p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[13px] text-white/30">
                  No transactions for this month
                </p>
              </div>
            ) : (
              filteredTransactions.map(
                (item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 px-4 py-4 ${
                      index !==
                      filteredTransactions.length - 1
                        ? "border-b border-white/[0.06]"
                        : ""
                    }`}
                  >
                    {/* LEFT */}

                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] ${
                          item.type === "income"
                            ? "bg-[#CCFF33] text-black"
                            : "bg-white/[0.06] text-white"
                        }`}
                      >
                        {item.type === "income" ? (
                          <ArrowDownLeft size={18} />
                        ) : (
                          <ArrowUpRight size={18} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium">
                          {item.name}
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <span className="truncate text-[10px] text-white/30">
                            {item.category ?? "Other"}
                          </span>

                          <span className="text-[10px] text-white/15">
                            •
                          </span>

                          <span className="shrink-0 text-[10px] text-white/30">
                            {new Date(
                              `${item.transaction_date}T00:00:00`
                            ).toLocaleDateString(
                              "en-US",
                              {
                                day: "numeric",
                                month: "short",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT */}

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right">
                        <p
                          className={`text-[13px] font-semibold ${
                            item.type === "income"
                              ? "text-[#CCFF33]"
                              : "text-white"
                          }`}
                        >
                          {item.type === "income"
                            ? "+"
                            : "-"}
                          {formatAmount(item)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            openEdit(item)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white/[0.05] text-white/25 transition hover:bg-white/[0.08] hover:text-white"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          onClick={() =>
                            deleteTransaction(
                              item.id
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white/[0.05] text-white/25 transition hover:bg-[#FF8CA8]/10 hover:text-[#FF8CA8]"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </section>
      </div>

      {/* EDIT SHEET */}

      {editingTransaction && (
        <div className="fixed inset-0 z-[100]">
          {/* OVERLAY */}

          <button
            onClick={() =>
              setEditingTransaction(null)
            }
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            aria-label="Close"
          />

          {/* SHEET */}

          <div className="absolute bottom-0 left-1/2 max-h-[96vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-[38px] border border-white/10 bg-[#111214] px-5 pb-8 pt-3 text-white shadow-[0_-30px_100px_rgba(0,0,0,0.65)]">
            <div className="mx-auto h-1.5 w-11 rounded-full bg-white/15" />

            {/* SHEET HEADER */}

            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                  Transaction
                </p>

                <h3 className="mt-1 text-[27px] font-semibold tracking-[-0.05em]">
                  Edit movement
                </h3>
              </div>

              <button
                onClick={() =>
                  setEditingTransaction(null)
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] transition hover:bg-white/[0.1]"
              >
                <X size={18} />
              </button>
            </div>

            {/* TYPE */}

            <div className="mt-6 flex rounded-[20px] bg-black/25 p-1">
              <button
                onClick={() =>
                  setEditingTransaction({
                    ...editingTransaction,
                    type: "income",
                  })
                }
                className={`flex-1 rounded-[16px] py-3 text-[12px] font-semibold transition ${
                  editingTransaction.type ===
                  "income"
                    ? "bg-[#CCFF33] text-black"
                    : "text-white/35"
                }`}
              >
                Income
              </button>

              <button
                onClick={() =>
                  setEditingTransaction({
                    ...editingTransaction,
                    type: "expense",
                  })
                }
                className={`flex-1 rounded-[16px] py-3 text-[12px] font-semibold transition ${
                  editingTransaction.type ===
                  "expense"
                    ? "bg-white text-black"
                    : "text-white/35"
                }`}
              >
                Expense
              </button>
            </div>

            {/* FORM */}

            <div className="mt-5 grid gap-3">
              {/* NAME */}

              <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                  Name
                </p>

                <input
                  value={editName}
                  onChange={(event) =>
                    setEditName(
                      event.target.value
                    )
                  }
                  placeholder="Transaction name"
                  className="mt-1 w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/15"
                />
              </div>

              {/* AMOUNT + CURRENCY */}

              <div className="grid grid-cols-[1fr_110px] gap-3">
                <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                    Amount
                  </p>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editAmount}
                    onChange={(event) =>
                      setEditAmount(
                        event.target.value
                      )
                    }
                    className="mt-1 w-full bg-transparent text-[15px] text-white outline-none"
                  />
                </div>

                <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                    Currency
                  </p>

                  <select
                    value={editCurrency}
                    onChange={(event) =>
                      setEditCurrency(
                        event.target
                          .value as
                          | "EUR"
                          | "HKD"
                      )
                    }
                    className="mt-1 w-full bg-transparent text-[14px] text-white outline-none"
                  >
                    <option
                      value="EUR"
                      className="bg-[#111214]"
                    >
                      EUR
                    </option>

                    <option
                      value="HKD"
                      className="bg-[#111214]"
                    >
                      HKD
                    </option>
                  </select>
                </div>
              </div>

              {/* CATEGORY */}

              <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                  Category
                </p>

                <select
                  value={editCategory}
                  onChange={(event) =>
                    setEditCategory(
                      event.target.value
                    )
                  }
                  className="mt-1 w-full bg-transparent text-[14px] text-white outline-none"
                >
                  {[
                    "Housing",
                    "Food",
                    "Transport",
                    "Lifestyle",
                    "Subscription",
                    "Music",
                    "Salary",
                    "Freelance",
                    "Other",
                  ].map((category) => (
                    <option
                      key={category}
                      value={category}
                      className="bg-[#111214]"
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* DATE */}

              <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                  Date
                </p>

                <input
                  type="date"
                  value={editDate}
                  onChange={(event) =>
                    setEditDate(
                      event.target.value
                    )
                  }
                  className="mt-1 w-full bg-transparent text-[14px] text-white outline-none [color-scheme:dark]"
                />
              </div>
            </div>

            {/* SAVE */}

            <button
              onClick={saveEdit}
              disabled={savingEdit}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#CCFF33] py-4 text-[14px] font-semibold text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />

              {savingEdit
                ? "Saving..."
                : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}