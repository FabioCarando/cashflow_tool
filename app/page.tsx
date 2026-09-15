"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CalendarDays,
  ChevronRight,
  Pencil,
  Plus,
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

type FormMode = "create" | "edit";

export default function Home() {
  const [subscriptions, setSubscriptions] = useState<
    Subscription[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);

  const [formMode, setFormMode] =
    useState<FormMode>("create");

  const [editingId, setEditingId] = useState<
    string | null
  >(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("");

  const [saving, setSaving] = useState(false);

  const loadSubscriptions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*");

    if (error) {
      console.error(
        "Subscriptions error:",
        error
      );

      setLoading(false);
      return;
    }

    setSubscriptions(
      (data ?? []) as Subscription[]
    );

    setLoading(false);
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const monthlyTotal = useMemo(() => {
    return subscriptions.reduce(
      (total, item) =>
        total + Number(item.amount),
      0
    );
  }, [subscriptions]);

  const yearlyTotal = monthlyTotal * 12;

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

  const sortedSubscriptions = useMemo(() => {
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

  const openCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setName("");
    setAmount("");
    setBillingDay("");
    setSheetOpen(true);
  };

  const openEdit = (
    subscription: Subscription
  ) => {
    setFormMode("edit");

    setEditingId(subscription.id);

    setName(subscription.name);

    setAmount(
      String(subscription.amount)
    );

    setBillingDay(
      String(subscription.billing_day)
    );

    setSheetOpen(true);
  };

  const closeSheet = () => {
    if (saving) return;

    setSheetOpen(false);
  };

  const saveSubscription = async () => {
    const numericAmount =
      Number(amount);

    const numericBillingDay =
      Number(billingDay);

    if (!name.trim()) {
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
      const { error } = await supabase
        .from("subscriptions")
        .update({
          name: name.trim(),
          amount: numericAmount,
          billing_day:
            numericBillingDay,
        })
        .eq("id", editingId);

      if (error) {
        console.error(
          "Update error:",
          error
        );

        alert(
          "Could not update subscription."
        );

        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("subscriptions")
        .insert({
          name: name.trim(),
          amount: numericAmount,
          billing_day:
            numericBillingDay,
        });

      if (error) {
        console.error(
          "Insert error:",
          error
        );

        alert(
          "Could not add subscription."
        );

        setSaving(false);
        return;
      }
    }

    await loadSubscriptions();

    setSaving(false);
    setSheetOpen(false);
  };

  const deleteSubscription =
    async () => {
      if (!editingId) return;

      const confirmed =
        window.confirm(
          "Delete this subscription?"
        );

      if (!confirmed) return;

      setSaving(true);

      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", editingId);

      if (error) {
        console.error(
          "Delete error:",
          error
        );

        alert(
          "Could not delete subscription."
        );

        setSaving(false);
        return;
      }

      await loadSubscriptions();

      setSaving(false);
      setSheetOpen(false);
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
            onClick={openCreate}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#CCFF33] text-black shadow-[0_0_35px_rgba(204,255,51,0.15)] transition active:scale-95"
          >
            <Plus size={21} />
          </button>
        </header>

        {/* HERO */}

        <section className="relative mt-8 overflow-hidden rounded-[34px] bg-[#CCFF33] p-6 text-black">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/40 blur-[70px]" />

          <div className="relative">
            <div className="flex items-center gap-2">
              <CalendarDays
                size={14}
                className="opacity-50"
              />

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
                Every month
              </p>
            </div>

            <h2 className="mt-5 text-[48px] font-semibold leading-none tracking-[-0.07em]">
              {formatMoney(
                monthlyTotal
              )}
            </h2>

            <p className="mt-3 text-[12px] font-medium text-black/45">
              across{" "}
              {subscriptions.length}{" "}
              {subscriptions.length === 1
                ? "subscription"
                : "subscriptions"}
            </p>

            <div className="mt-8 flex items-end justify-between border-t border-black/10 pt-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35">
                  Per year
                </p>

                <p className="mt-1 text-[19px] font-semibold tracking-[-0.035em]">
                  {formatMoney(
                    yearlyTotal
                  )}
                </p>
              </div>

              <div className="rounded-full bg-black px-4 py-2 text-[10px] font-semibold text-white">
                {subscriptions.length}{" "}
                active
              </div>
            </div>
          </div>
        </section>

        {/* UPCOMING */}

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
              subscriptions.length >
                0 && (
                <p className="pb-1 text-[11px] text-white/25">
                  Next payments
                </p>
              )}
          </div>

          {/* LIST */}

          <div className="mt-5">
            {loading ? (
              <div className="rounded-[30px] border border-white/[0.07] bg-white/[0.035] px-5 py-12 text-center">
                <p className="text-[12px] text-white/25">
                  Loading subscriptions...
                </p>
              </div>
            ) : sortedSubscriptions.length ===
              0 ? (
              <div className="rounded-[30px] border border-dashed border-white/10 bg-white/[0.025] px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05]">
                  <Plus
                    size={19}
                    className="text-white/35"
                  />
                </div>

                <h3 className="mt-5 text-[17px] font-semibold">
                  Nothing here yet
                </h3>

                <p className="mx-auto mt-2 max-w-[220px] text-[12px] leading-5 text-white/30">
                  Add your first
                  subscription and start
                  tracking your monthly
                  commitments.
                </p>

                <button
                  onClick={openCreate}
                  className="mt-6 rounded-full bg-white px-5 py-2.5 text-[11px] font-semibold text-black"
                >
                  Add subscription
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* TIMELINE */}

                <div className="absolute bottom-8 left-[34px] top-8 w-px bg-gradient-to-b from-[#CCFF33]/50 via-white/10 to-transparent" />

                <div className="space-y-3">
                  {sortedSubscriptions.map(
                    (subscription) => {
                      const nextDate =
                        getNextBillingDate(
                          subscription.billing_day
                        );

                      const remaining =
                        daysUntil(
                          nextDate
                        );

                      return (
                        <button
                          key={
                            subscription.id
                          }
                          onClick={() =>
                            openEdit(
                              subscription
                            )
                          }
                          className="relative flex w-full items-center gap-4 rounded-[28px] border border-white/[0.07] bg-white/[0.04] p-3 text-left backdrop-blur-xl transition active:scale-[0.985]"
                        >
                          {/* DATE */}

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

                          {/* INFO */}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold tracking-[-0.025em]">
                              {
                                subscription.name
                              }
                            </p>

                            <p className="mt-1 text-[10px] text-white/30">
                              {remaining ===
                              0
                                ? "Today"
                                : remaining ===
                                    1
                                  ? "Tomorrow"
                                  : `In ${remaining} days`}
                            </p>
                          </div>

                          {/* PRICE */}

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
      </div>

      {/* FLOATING ADD */}

      {!loading &&
        subscriptions.length > 0 && (
          <div className="fixed bottom-6 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-5">
            <button
              onClick={openCreate}
              className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-[#171819]/90 py-4 text-[13px] font-semibold shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition active:scale-[0.98]"
            >
              <Plus
                size={17}
                className="text-[#CCFF33]"
              />

              Add subscription
            </button>
          </div>
        )}

      {/* CREATE / EDIT SHEET */}

      {sheetOpen && (
        <div className="fixed inset-0 z-[100]">
          <button
            onClick={closeSheet}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            aria-label="Close"
          />

          <div className="absolute bottom-0 left-1/2 max-h-[95vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-[40px] border border-white/10 bg-[#111214] px-5 pb-8 pt-3 shadow-[0_-30px_100px_rgba(0,0,0,0.7)]">
            {/* HANDLE */}

            <div className="mx-auto h-1.5 w-11 rounded-full bg-white/15" />

            {/* HEADER */}

            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                  {formMode === "create"
                    ? "New monthly payment"
                    : "Monthly payment"}
                </p>

                <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.055em]">
                  {formMode === "create"
                    ? "Add subscription"
                    : "Edit subscription"}
                </h2>
              </div>

              <button
                onClick={closeSheet}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06]"
              >
                <X size={17} />
              </button>
            </div>

            {/* FORM */}

            <div className="mt-7 space-y-3">
              {/* NAME */}

              <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
                  Subscription
                </p>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Spotify, Netflix, iCloud..."
                  autoFocus
                  className="mt-2 w-full bg-transparent text-[17px] font-medium text-white outline-none placeholder:text-white/15"
                />
              </div>

              {/* PRICE */}

              <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
                  Monthly price
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[24px] font-semibold text-[#CCFF33]">
                    €
                  </span>

                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    className="w-full bg-transparent text-[28px] font-semibold tracking-[-0.05em] text-white outline-none placeholder:text-white/15"
                  />
                </div>
              </div>

              {/* BILLING DAY */}

              <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/[0.05]">
                    <CalendarDays
                      size={17}
                      className="text-white/40"
                    />
                  </div>

                  <div className="flex-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
                      Billing day
                    </p>

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
                      className="mt-1 w-full bg-transparent text-[15px] font-medium text-white outline-none placeholder:text-white/15"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SAVE */}

            <button
              onClick={saveSubscription}
              disabled={saving}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[23px] bg-[#CCFF33] py-4 text-[13px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-50"
            >
              {formMode === "edit" ? (
                <Pencil size={15} />
              ) : (
                <Plus size={16} />
              )}

              {saving
                ? "Saving..."
                : formMode === "create"
                  ? "Add subscription"
                  : "Save changes"}
            </button>

            {/* DELETE */}

            {formMode === "edit" && (
              <button
                onClick={
                  deleteSubscription
                }
                disabled={saving}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[23px] py-3.5 text-[12px] font-medium text-[#FF8CA8] transition active:bg-[#FF8CA8]/5 disabled:opacity-50"
              >
                <Trash2 size={14} />

                Delete subscription
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}