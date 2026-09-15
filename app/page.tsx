"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  Pencil,
  Plus,
  ReceiptText,
  Repeat2,
  Trash2,
  X,
} from "lucide-react";

type Subscription = {
  id: string;
  name: string;
  amount: number;
  billing_day: number;
  created_at: string;
};

type Expense = {
  id: string;
  name: string;
  amount: number;
  expense_date: string;
  created_at: string;
};

type Sheet =
  | null
  | "choose"
  | "subscription"
  | "expense";

type FormMode = "create" | "edit";

export default function Home() {
  const [subscriptions, setSubscriptions] = useState<
    Subscription[]
  >([]);

  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<Sheet>(null);

  const [formMode, setFormMode] =
    useState<FormMode>("create");

  const [editingId, setEditingId] = useState<
    string | null
  >(null);

  // ---------------------------------
  // REFERENCE MONTH
  // ---------------------------------

  const [referenceDate, setReferenceDate] = useState(
    () => {
      const now = new Date();

      return new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );
    }
  );

  // ---------------------------------
  // SUBSCRIPTION FORM
  // ---------------------------------

  const [subscriptionName, setSubscriptionName] =
    useState("");

  const [subscriptionAmount, setSubscriptionAmount] =
    useState("");

  const [billingDay, setBillingDay] = useState("");

  // ---------------------------------
  // EXPENSE FORM
  // ---------------------------------

  const [expenseName, setExpenseName] = useState("");

  const [expenseAmount, setExpenseAmount] =
    useState("");

  const [expenseDate, setExpenseDate] = useState(
    getLocalDate()
  );

  const [saving, setSaving] = useState(false);

  const [expandedMonth, setExpandedMonth] = useState<
    string | null
  >(null);

  // ---------------------------------
  // DATE HELPERS
  // ---------------------------------

  function getLocalDate() {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const changeMonth = (direction: number) => {
    setReferenceDate((current) => {
      return new Date(
        current.getFullYear(),
        current.getMonth() + direction,
        1
      );
    });
  };

  // ---------------------------------
  // LOAD DATA
  // ---------------------------------

  const loadData = async () => {
    setLoading(true);

    const [
      subscriptionsResult,
      expensesResult,
    ] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*"),

      supabase
        .from("expenses")
        .select("*")
        .order("expense_date", {
          ascending: false,
        }),
    ]);

    if (subscriptionsResult.error) {
      console.error(
        "Subscriptions error:",
        subscriptionsResult.error
      );
    }

    if (expensesResult.error) {
      console.error(
        "Expenses error:",
        expensesResult.error
      );
    }

    setSubscriptions(
      (subscriptionsResult.data ??
        []) as Subscription[]
    );

    setExpenses(
      (expensesResult.data ?? []) as Expense[]
    );

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // ---------------------------------
  // FORMATTERS
  // ---------------------------------

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatMonth = (date: Date) => {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        month: "short",
      }
    )
      .format(date)
      .toUpperCase();
  };

  const formatDay = (date: Date) => {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        day: "2-digit",
      }
    ).format(date);
  };

  const formatExpenseDate = (
    dateString: string
  ) => {
    const date = new Date(
      `${dateString}T00:00:00`
    );

    return new Intl.DateTimeFormat(
      "en-US",
      {
        day: "2-digit",
        month: "short",
      }
    )
      .format(date)
      .toUpperCase();
  };

  // ---------------------------------
  // SELECTED MONTH
  // ---------------------------------

  const referenceYear =
    referenceDate.getFullYear();

  const referenceMonth =
    referenceDate.getMonth();

  const referenceMonthLabel =
    new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(referenceDate);

  // ---------------------------------
  // SUBSCRIPTIONS TOTAL
  // ---------------------------------

  const monthlyTotal = useMemo(() => {
    return subscriptions.reduce(
      (total, item) =>
        total + Number(item.amount),
      0
    );
  }, [subscriptions]);

  const yearlyTotal = monthlyTotal * 12;

  // ---------------------------------
  // SELECTED MONTH EXPENSES
  // ---------------------------------

  const referenceMonthExpenses =
    useMemo(() => {
      return expenses.filter((expense) => {
        const date = new Date(
          `${expense.expense_date}T00:00:00`
        );

        return (
          date.getFullYear() ===
            referenceYear &&
          date.getMonth() ===
            referenceMonth
        );
      });
    }, [
      expenses,
      referenceYear,
      referenceMonth,
    ]);

  const referenceExpensesTotal =
    useMemo(() => {
      return referenceMonthExpenses.reduce(
        (total, expense) =>
          total + Number(expense.amount),
        0
      );
    }, [referenceMonthExpenses]);

  // Subscription + actual expenses

  const referenceMonthTotal =
    monthlyTotal + referenceExpensesTotal;

  // ---------------------------------
  // NEXT BILLING DATE
  // ---------------------------------

  const getNextBillingDate = (
    billingDay: number
  ) => {
    const today = new Date();

    const year = today.getFullYear();
    const month = today.getMonth();

    const daysThisMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const validDayThisMonth = Math.min(
      billingDay,
      daysThisMonth
    );

    let nextDate = new Date(
      year,
      month,
      validDayThisMonth
    );

    nextDate.setHours(23, 59, 59, 999);

    if (nextDate < today) {
      const nextMonthDate = new Date(
        year,
        month + 1,
        1
      );

      const nextMonthYear =
        nextMonthDate.getFullYear();

      const nextMonth =
        nextMonthDate.getMonth();

      const daysNextMonth = new Date(
        nextMonthYear,
        nextMonth + 1,
        0
      ).getDate();

      const validDayNextMonth = Math.min(
        billingDay,
        daysNextMonth
      );

      nextDate = new Date(
        nextMonthYear,
        nextMonth,
        validDayNextMonth
      );
    }

    return nextDate;
  };

  const sortedSubscriptions =
    useMemo(() => {
      return [...subscriptions].sort(
        (a, b) =>
          getNextBillingDate(
            a.billing_day
          ).getTime() -
          getNextBillingDate(
            b.billing_day
          ).getTime()
      );
    }, [subscriptions]);

  const daysUntil = (date: Date) => {
    const today = new Date();

    const startToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const startTarget = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    return Math.round(
      (startTarget.getTime() -
        startToday.getTime()) /
        86400000
    );
  };

  // ---------------------------------
  // EXPENSE HISTORY
  // ---------------------------------

  const expenseMonths = useMemo(() => {
    const groups: Record<
      string,
      {
        key: string;
        label: string;
        total: number;
        expenses: Expense[];
      }
    > = {};

    expenses.forEach((expense) => {
      const date = new Date(
        `${expense.expense_date}T00:00:00`
      );

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!groups[key]) {
        groups[key] = {
          key,

          label:
            new Intl.DateTimeFormat(
              "en-US",
              {
                month: "long",
                year: "numeric",
              }
            ).format(date),

          total: 0,
          expenses: [],
        };
      }

      groups[key].total += Number(
        expense.amount
      );

      groups[key].expenses.push(expense);
    });

    return Object.values(groups).sort(
      (a, b) =>
        b.key.localeCompare(a.key)
    );
  }, [expenses]);

  const highestMonthTotal = Math.max(
    ...expenseMonths.map(
      (month) => month.total
    ),
    1
  );

  // ---------------------------------
  // OPEN SHEETS
  // ---------------------------------

  const openChoose = () => {
    setFormMode("create");
    setEditingId(null);
    setSheet("choose");
  };

  const openCreateSubscription = () => {
    setFormMode("create");
    setEditingId(null);

    setSubscriptionName("");
    setSubscriptionAmount("");
    setBillingDay("");

    setSheet("subscription");
  };

  const openEditSubscription = (
    subscription: Subscription
  ) => {
    setFormMode("edit");

    setEditingId(subscription.id);

    setSubscriptionName(
      subscription.name
    );

    setSubscriptionAmount(
      String(subscription.amount)
    );

    setBillingDay(
      String(subscription.billing_day)
    );

    setSheet("subscription");
  };

  const openCreateExpense = () => {
    setFormMode("create");
    setEditingId(null);

    setExpenseName("");
    setExpenseAmount("");

    // Start on selected month if not current month
    const today = new Date();

    if (
      referenceYear ===
        today.getFullYear() &&
      referenceMonth === today.getMonth()
    ) {
      setExpenseDate(getLocalDate());
    } else {
      const month = String(
        referenceMonth + 1
      ).padStart(2, "0");

      setExpenseDate(
        `${referenceYear}-${month}-01`
      );
    }

    setSheet("expense");
  };

  const openEditExpense = (
    expense: Expense
  ) => {
    setFormMode("edit");

    setEditingId(expense.id);

    setExpenseName(expense.name);

    setExpenseAmount(
      String(expense.amount)
    );

    setExpenseDate(
      expense.expense_date
    );

    setSheet("expense");
  };

  const closeSheet = () => {
    if (saving) return;

    setSheet(null);
  };

  // ---------------------------------
  // SAVE SUBSCRIPTION
  // ---------------------------------

  const saveSubscription =
    async () => {
      const numericAmount = Number(
        subscriptionAmount
      );

      const numericBillingDay =
        Number(billingDay);

      if (!subscriptionName.trim()) {
        alert(
          "Write the subscription name."
        );
        return;
      }

      if (
        Number.isNaN(numericAmount) ||
        numericAmount <= 0
      ) {
        alert("Enter a valid price.");
        return;
      }

      if (
        !Number.isInteger(
          numericBillingDay
        ) ||
        numericBillingDay < 1 ||
        numericBillingDay > 31
      ) {
        alert(
          "Billing day must be between 1 and 31."
        );
        return;
      }

      setSaving(true);

      if (
        formMode === "edit" &&
        editingId
      ) {
        const { error } =
          await supabase
            .from("subscriptions")
            .update({
              name: subscriptionName.trim(),
              amount: numericAmount,
              billing_day:
                numericBillingDay,
            })
            .eq("id", editingId);

        if (error) {
          console.error(error);

          alert(
            "Could not update subscription."
          );

          setSaving(false);
          return;
        }
      } else {
        const { error } =
          await supabase
            .from("subscriptions")
            .insert({
              name: subscriptionName.trim(),
              amount: numericAmount,
              billing_day:
                numericBillingDay,
            });

        if (error) {
          console.error(error);

          alert(
            "Could not add subscription."
          );

          setSaving(false);
          return;
        }
      }

      await loadData();

      setSaving(false);
      setSheet(null);
    };

  // ---------------------------------
  // SAVE EXPENSE
  // ---------------------------------

  const saveExpense = async () => {
    const numericAmount = Number(
      expenseAmount
    );

    if (!expenseName.trim()) {
      alert("Write the expense name.");
      return;
    }

    if (
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      alert("Enter a valid amount.");
      return;
    }

    if (!expenseDate) {
      alert("Choose a date.");
      return;
    }

    setSaving(true);

    if (
      formMode === "edit" &&
      editingId
    ) {
      const { error } =
        await supabase
          .from("expenses")
          .update({
            name: expenseName.trim(),
            amount: numericAmount,
            expense_date: expenseDate,
          })
          .eq("id", editingId);

      if (error) {
        console.error(error);

        alert(
          "Could not update expense."
        );

        setSaving(false);
        return;
      }
    } else {
      const { error } =
        await supabase
          .from("expenses")
          .insert({
            name: expenseName.trim(),
            amount: numericAmount,
            expense_date: expenseDate,
          });

      if (error) {
        console.error(error);

        alert(
          "Could not add expense."
        );

        setSaving(false);
        return;
      }
    }

    await loadData();

    setSaving(false);
    setSheet(null);
  };

  // ---------------------------------
  // DELETE SUBSCRIPTION
  // ---------------------------------

  const deleteSubscription =
    async () => {
      if (!editingId) return;

      if (
        !window.confirm(
          "Delete this subscription?"
        )
      ) {
        return;
      }

      setSaving(true);

      const { error } =
        await supabase
          .from("subscriptions")
          .delete()
          .eq("id", editingId);

      if (error) {
        console.error(error);

        alert(
          "Could not delete subscription."
        );

        setSaving(false);
        return;
      }

      await loadData();

      setSaving(false);
      setSheet(null);
    };

  // ---------------------------------
  // DELETE EXPENSE
  // ---------------------------------

  const deleteExpense = async () => {
    if (!editingId) return;

    if (
      !window.confirm(
        "Delete this expense?"
      )
    ) {
      return;
    }

    setSaving(true);

    const { error } =
      await supabase
        .from("expenses")
        .delete()
        .eq("id", editingId);

    if (error) {
      console.error(error);

      alert(
        "Could not delete expense."
      );

      setSaving(false);
      return;
    }

    await loadData();

    setSaving(false);
    setSheet(null);
  };

  return (
    <main className="min-h-screen bg-[#090A0B] text-white">
      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-32 h-[450px] w-[450px] rounded-full bg-[#CCFF33]/10 blur-[140px]" />

        <div className="absolute right-[-180px] top-[300px] h-[430px] w-[430px] rounded-full bg-[#7567FF]/10 blur-[150px]" />
      </div>

      <div className="relative mx-auto min-h-screen max-w-md px-5 pb-32 pt-7">
        {/* HEADER */}

        <header className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/30">
              Monthly commitments
            </p>

            <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.055em]">
              Subscriptions
            </h1>
          </div>

          <button
            onClick={openChoose}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#CCFF33] text-black shadow-[0_0_35px_rgba(204,255,51,0.15)] transition active:scale-95"
          >
            <Plus size={21} />
          </button>
        </header>

        {/* MONTH SELECTOR */}

        <section className="mt-8 flex items-center justify-between">
          <button
            onClick={() =>
              changeMonth(-1)
            }
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.04] text-white/60 transition active:scale-90"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => {
              const now = new Date();

              setReferenceDate(
                new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  1
                )
              );
            }}
            className="text-center"
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">
              Overview
            </p>

            <p className="mt-1 text-[17px] font-semibold tracking-[-0.035em]">
              {referenceMonthLabel}
            </p>
          </button>

          <button
            onClick={() =>
              changeMonth(1)
            }
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.04] text-white/60 transition active:scale-90"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </section>

        {/* MONTH HERO */}

        <section className="relative mt-5 overflow-hidden rounded-[34px] bg-[#CCFF33] p-6 text-black">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/40 blur-[70px]" />

          <div className="relative">
            <div className="flex items-center gap-2">
              <CalendarDays
                size={14}
                className="opacity-50"
              />

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
                Total ·{" "}
                {referenceMonthLabel}
              </p>
            </div>

            <h2 className="mt-5 text-[48px] font-semibold leading-none tracking-[-0.07em]">
              {formatMoney(
                referenceMonthTotal
              )}
            </h2>

            <p className="mt-3 text-[11px] font-medium leading-5 text-black/45">
              {formatMoney(monthlyTotal)}{" "}
              subscriptions
              {" · "}
              {formatMoney(
                referenceExpensesTotal
              )}{" "}
              expenses
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-black/10 pt-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35">
                  Subscriptions
                </p>

                <p className="mt-1 text-[18px] font-semibold tracking-[-0.035em]">
                  {formatMoney(
                    monthlyTotal
                  )}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35">
                  Other expenses
                </p>

                <p className="mt-1 text-[18px] font-semibold tracking-[-0.035em]">
                  {formatMoney(
                    referenceExpensesTotal
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-[10px] font-medium text-black/40">
                {subscriptions.length}{" "}
                {subscriptions.length === 1
                  ? "subscription"
                  : "subscriptions"}
              </p>

              <div className="rounded-full bg-black px-4 py-2 text-[10px] font-semibold text-white">
                {
                  referenceMonthExpenses.length
                }{" "}
                {referenceMonthExpenses.length ===
                1
                  ? "expense"
                  : "expenses"}
              </div>
            </div>
          </div>
        </section>

        {/* UPCOMING SUBSCRIPTIONS */}

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">
                Calendar
              </p>

              <h2 className="mt-1 text-[23px] font-semibold tracking-[-0.045em]">
                Upcoming
              </h2>
            </div>

            {!loading &&
              subscriptions.length > 0 && (
                <p className="pb-1 text-[11px] text-white/25">
                  Next payments
                </p>
              )}
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="rounded-[30px] border border-white/[0.07] bg-white/[0.035] px-5 py-12 text-center">
                <p className="text-[12px] text-white/25">
                  Loading...
                </p>
              </div>
            ) : sortedSubscriptions.length ===
              0 ? (
              <div className="rounded-[30px] border border-dashed border-white/10 bg-white/[0.025] px-6 py-12 text-center">
                <Repeat2
                  size={20}
                  className="mx-auto text-white/25"
                />

                <p className="mt-4 text-[13px] text-white/35">
                  No subscriptions yet.
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute bottom-8 left-[34px] top-8 w-px bg-gradient-to-b from-[#CCFF33]/50 via-white/10 to-transparent" />

                <div className="space-y-3">
                  {sortedSubscriptions.map(
                    (subscription) => {
                      const nextDate =
                        getNextBillingDate(
                          subscription.billing_day
                        );

                      const remaining =
                        daysUntil(nextDate);

                      return (
                        <button
                          key={
                            subscription.id
                          }
                          onClick={() =>
                            openEditSubscription(
                              subscription
                            )
                          }
                          className="relative flex w-full items-center gap-4 rounded-[28px] border border-white/[0.07] bg-white/[0.04] p-3 text-left backdrop-blur-xl transition active:scale-[0.985]"
                        >
                          <div className="relative z-10 flex h-[64px] w-[64px] shrink-0 flex-col items-center justify-center rounded-[21px] bg-[#151719] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                            <span className="text-[9px] font-semibold tracking-[0.12em] text-[#CCFF33]">
                              {formatMonth(
                                nextDate
                              )}
                            </span>

                            <span className="mt-0.5 text-[22px] font-semibold leading-none tracking-[-0.04em]">
                              {formatDay(
                                nextDate
                              )}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold tracking-[-0.025em]">
                              {
                                subscription.name
                              }
                            </p>

                            <p className="mt-1 text-[10px] text-white/30">
                              {remaining === 0
                                ? "Today"
                                : remaining ===
                                    1
                                  ? "Tomorrow"
                                  : `In ${remaining} days`}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-[15px] font-semibold tracking-[-0.03em]">
                              {formatMoney(
                                Number(
                                  subscription.amount
                                )
                              )}
                            </p>

                            <p className="mt-1 text-[9px] text-white/25">
                              / month
                            </p>
                          </div>

                          <ChevronRight
                            size={15}
                            className="shrink-0 text-white/15"
                          />
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SELECTED MONTH EXPENSES */}

        <section className="mt-12">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">
                Selected month
              </p>

              <h2 className="mt-1 text-[23px] font-semibold tracking-[-0.045em]">
                {referenceMonthLabel}
              </h2>
            </div>

            <p className="pb-1 text-[14px] font-semibold">
              {formatMoney(
                referenceExpensesTotal
              )}
            </p>
          </div>

          <div className="mt-5">
            {referenceMonthExpenses.length ===
            0 ? (
              <button
                onClick={
                  openCreateExpense
                }
                className="w-full rounded-[28px] border border-dashed border-white/10 bg-white/[0.025] px-6 py-9 text-center"
              >
                <ReceiptText
                  size={20}
                  className="mx-auto text-white/25"
                />

                <p className="mt-4 text-[13px] font-medium">
                  No expenses in this
                  month
                </p>

                <p className="mt-1 text-[11px] text-white/25">
                  Tap to add one.
                </p>
              </button>
            ) : (
              <div className="overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.035] p-2">
                {referenceMonthExpenses.map(
                  (expense) => (
                    <button
                      key={expense.id}
                      onClick={() =>
                        openEditExpense(
                          expense
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-[21px] px-2 py-3 text-left transition active:bg-white/[0.04]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white/[0.05]">
                        <ReceiptText
                          size={15}
                          className="text-white/30"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">
                          {expense.name}
                        </p>

                        <p className="mt-1 text-[9px] font-medium tracking-[0.08em] text-white/25">
                          {formatExpenseDate(
                            expense.expense_date
                          )}
                        </p>
                      </div>

                      <p className="text-[13px] font-semibold">
                        {formatMoney(
                          Number(
                            expense.amount
                          )
                        )}
                      </p>

                      <ChevronRight
                        size={14}
                        className="text-white/15"
                      />
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* HISTORY */}

        <section className="mt-12">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">
                History
              </p>

              <h2 className="mt-1 text-[23px] font-semibold tracking-[-0.045em]">
                Past expenses
              </h2>
            </div>

            <History
              size={17}
              className="mb-1 text-white/20"
            />
          </div>

          <div className="mt-5 space-y-3">
            {!loading &&
              expenseMonths.length === 0 && (
                <button
                  onClick={
                    openCreateExpense
                  }
                  className="w-full rounded-[30px] border border-dashed border-white/10 bg-white/[0.025] px-6 py-10 text-center"
                >
                  <ReceiptText
                    size={20}
                    className="mx-auto text-white/25"
                  />

                  <p className="mt-4 text-[13px] font-medium">
                    Add your first expense
                  </p>

                  <p className="mt-1 text-[11px] text-white/25">
                    You can enter expenses
                    from any past month.
                  </p>
                </button>
              )}

            {expenseMonths.map(
              (month) => {
                const expanded =
                  expandedMonth ===
                  month.key;

                const barWidth =
                  Math.max(
                    (month.total /
                      highestMonthTotal) *
                      100,
                    4
                  );

                return (
                  <div
                    key={month.key}
                    className="overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.035]"
                  >
                    <button
                      onClick={() =>
                        setExpandedMonth(
                          expanded
                            ? null
                            : month.key
                        )
                      }
                      className="w-full px-5 py-5 text-left"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[15px] font-semibold tracking-[-0.025em]">
                            {month.label}
                          </p>

                          <p className="mt-1 text-[10px] text-white/25">
                            {
                              month
                                .expenses
                                .length
                            }{" "}
                            {month
                              .expenses
                              .length ===
                            1
                              ? "expense"
                              : "expenses"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <p className="text-[17px] font-semibold tracking-[-0.04em]">
                            {formatMoney(
                              month.total
                            )}
                          </p>

                          <ChevronDown
                            size={15}
                            className={`text-white/25 transition-transform ${
                              expanded
                                ? "rotate-180"
                                : ""
                            }`}
                          />
                        </div>
                      </div>

                      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-[#CCFF33]"
                          style={{
                            width: `${barWidth}%`,
                          }}
                        />
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-white/[0.06] px-3 pb-3">
                        {month.expenses.map(
                          (expense) => (
                            <button
                              key={
                                expense.id
                              }
                              onClick={() =>
                                openEditExpense(
                                  expense
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-[20px] px-2 py-3 text-left transition active:bg-white/[0.04]"
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white/[0.05]">
                                <ReceiptText
                                  size={15}
                                  className="text-white/30"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-medium">
                                  {
                                    expense.name
                                  }
                                </p>

                                <p className="mt-1 text-[9px] font-medium tracking-[0.08em] text-white/25">
                                  {formatExpenseDate(
                                    expense.expense_date
                                  )}
                                </p>
                              </div>

                              <p className="text-[13px] font-semibold">
                                {formatMoney(
                                  Number(
                                    expense.amount
                                  )
                                )}
                              </p>

                              <ChevronRight
                                size={14}
                                className="text-white/15"
                              />
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </section>

        {/* YEARLY SUBSCRIPTION INFO */}

        <section className="mt-8 rounded-[25px] border border-white/[0.06] bg-white/[0.025] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/20">
                Subscription cost
              </p>

              <p className="mt-1 text-[12px] text-white/35">
                Estimated yearly total
              </p>
            </div>

            <p className="text-[16px] font-semibold tracking-[-0.035em] text-white/70">
              {formatMoney(yearlyTotal)}
            </p>
          </div>
        </section>
      </div>

      {/* FLOATING ADD */}

      <div className="fixed bottom-6 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-5">
        <button
          onClick={openChoose}
          className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-[#171819]/90 py-4 text-[13px] font-semibold shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition active:scale-[0.98]"
        >
          <Plus
            size={17}
            className="text-[#CCFF33]"
          />

          Add
        </button>
      </div>

      {/* CHOOSE SHEET */}

      {sheet === "choose" && (
        <SheetShell
          onClose={closeSheet}
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
            New entry
          </p>

          <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.055em]">
            What are you adding?
          </h2>

          <div className="mt-7 space-y-3">
            <button
              onClick={
                openCreateSubscription
              }
              className="flex w-full items-center gap-4 rounded-[27px] border border-white/[0.07] bg-white/[0.045] p-4 text-left transition active:scale-[0.98]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-[19px] bg-[#CCFF33] text-black">
                <Repeat2 size={21} />
              </div>

              <div className="flex-1">
                <p className="text-[16px] font-semibold">
                  Subscription
                </p>

                <p className="mt-1 text-[11px] text-white/30">
                  A recurring monthly
                  payment
                </p>
              </div>

              <ChevronRight
                size={16}
                className="text-white/20"
              />
            </button>

            <button
              onClick={
                openCreateExpense
              }
              className="flex w-full items-center gap-4 rounded-[27px] border border-white/[0.07] bg-white/[0.045] p-4 text-left transition active:scale-[0.98]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-[19px] bg-[#7567FF]/20 text-[#A99FFF]">
                <ReceiptText
                  size={21}
                />
              </div>

              <div className="flex-1">
                <p className="text-[16px] font-semibold">
                  Expense
                </p>

                <p className="mt-1 text-[11px] text-white/30">
                  A one-time expense
                </p>
              </div>

              <ChevronRight
                size={16}
                className="text-white/20"
              />
            </button>
          </div>
        </SheetShell>
      )}

      {/* SUBSCRIPTION SHEET */}

      {sheet === "subscription" && (
        <SheetShell
          onClose={closeSheet}
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
            Monthly payment
          </p>

          <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.055em]">
            {formMode === "create"
              ? "Add subscription"
              : "Edit subscription"}
          </h2>

          <div className="mt-7 space-y-3">
            <InputCard label="Subscription">
              <input
                value={subscriptionName}
                onChange={(event) =>
                  setSubscriptionName(
                    event.target.value
                  )
                }
                placeholder="Spotify, Netflix, iCloud..."
                autoFocus
                className="mt-2 w-full bg-transparent text-[17px] font-medium outline-none placeholder:text-white/15"
              />
            </InputCard>

            <InputCard label="Monthly price">
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[24px] font-semibold text-[#CCFF33]">
                  €
                </span>

                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={
                    subscriptionAmount
                  }
                  onChange={(event) =>
                    setSubscriptionAmount(
                      event.target.value
                    )
                  }
                  placeholder="0.00"
                  className="w-full bg-transparent text-[28px] font-semibold tracking-[-0.05em] outline-none placeholder:text-white/15"
                />
              </div>
            </InputCard>

            <InputCard label="Billing day">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                value={billingDay}
                onChange={(event) =>
                  setBillingDay(
                    event.target.value
                  )
                }
                placeholder="e.g. 15"
                className="mt-2 w-full bg-transparent text-[17px] font-medium outline-none placeholder:text-white/15"
              />
            </InputCard>
          </div>

          <SaveButton
            saving={saving}
            edit={
              formMode === "edit"
            }
            onClick={
              saveSubscription
            }
            createLabel="Add subscription"
          />

          {formMode === "edit" && (
            <DeleteButton
              saving={saving}
              onClick={
                deleteSubscription
              }
              label="Delete subscription"
            />
          )}
        </SheetShell>
      )}

      {/* EXPENSE SHEET */}

      {sheet === "expense" && (
        <SheetShell
          onClose={closeSheet}
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
            One-time payment
          </p>

          <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.055em]">
            {formMode === "create"
              ? "Add expense"
              : "Edit expense"}
          </h2>

          <div className="mt-7 space-y-3">
            <InputCard label="Expense">
              <input
                value={expenseName}
                onChange={(event) =>
                  setExpenseName(
                    event.target.value
                  )
                }
                placeholder="Dinner, flight, shopping..."
                autoFocus
                className="mt-2 w-full bg-transparent text-[17px] font-medium outline-none placeholder:text-white/15"
              />
            </InputCard>

            <InputCard label="Amount">
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[24px] font-semibold text-[#CCFF33]">
                  €
                </span>

                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={expenseAmount}
                  onChange={(event) =>
                    setExpenseAmount(
                      event.target.value
                    )
                  }
                  placeholder="0.00"
                  className="w-full bg-transparent text-[28px] font-semibold tracking-[-0.05em] outline-none placeholder:text-white/15"
                />
              </div>
            </InputCard>

            <InputCard label="Date">
              <input
                type="date"
                value={expenseDate}
                onChange={(event) =>
                  setExpenseDate(
                    event.target.value
                  )
                }
                className="mt-2 w-full bg-transparent text-[16px] font-medium outline-none [color-scheme:dark]"
              />
            </InputCard>
          </div>

          <SaveButton
            saving={saving}
            edit={
              formMode === "edit"
            }
            onClick={saveExpense}
            createLabel="Add expense"
          />

          {formMode === "edit" && (
            <DeleteButton
              saving={saving}
              onClick={deleteExpense}
              label="Delete expense"
            />
          )}
        </SheetShell>
      )}
    </main>
  );
}

// ---------------------------------
// UI COMPONENTS
// ---------------------------------

function SheetShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100]">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        aria-label="Close"
      />

      <div className="absolute bottom-0 left-1/2 max-h-[95vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-[40px] border border-white/10 bg-[#111214] px-5 pb-8 pt-3 shadow-[0_-30px_100px_rgba(0,0,0,0.7)]">
        <div className="mx-auto h-1.5 w-11 rounded-full bg-white/15" />

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="-mt-9">
          {children}
        </div>
      </div>
    </div>
  );
}

function InputCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
        {label}
      </p>

      {children}
    </div>
  );
}

function SaveButton({
  saving,
  edit,
  onClick,
  createLabel,
}: {
  saving: boolean;
  edit: boolean;
  onClick: () => void;
  createLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="mt-5 flex w-full items-center justify-center gap-2 rounded-[23px] bg-[#CCFF33] py-4 text-[13px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-50"
    >
      {edit ? (
        <Pencil size={15} />
      ) : (
        <Plus size={16} />
      )}

      {saving
        ? "Saving..."
        : edit
          ? "Save changes"
          : createLabel}
    </button>
  );
}

function DeleteButton({
  saving,
  onClick,
  label,
}: {
  saving: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-[23px] py-3.5 text-[12px] font-medium text-[#FF8CA8] disabled:opacity-50"
    >
      <Trash2 size={14} />

      {label}
    </button>
  );
}