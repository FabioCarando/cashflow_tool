"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  CalendarDays,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

type RecurringItem = {
  id: string;
  type: "income" | "expense";
  name: string;
  category: string | null;
  amount: number;
  currency: "EUR" | "HKD";
  frequency:
    | "weekly"
    | "monthly"
    | "quarterly"
    | "yearly";
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
};

export default function RecurringPage() {
  const router = useRouter();

  const [items, setItems] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingItem, setEditingItem] =
    useState<RecurringItem | null>(null);

  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] =
    useState("Other");
  const [editCurrency, setEditCurrency] =
    useState<"EUR" | "HKD">("EUR");
  const [editFrequency, setEditFrequency] =
    useState<
      "weekly" | "monthly" | "quarterly" | "yearly"
    >("monthly");
  const [editStartDate, setEditStartDate] =
    useState("");
  const [savingEdit, setSavingEdit] =
    useState(false);

  const HKD_PER_EUR = 9;

  const toEUR = (
    amount: number,
    currency: "EUR" | "HKD"
  ) => {
    return currency === "EUR"
      ? Number(amount)
      : Number(amount) / HKD_PER_EUR;
  };

  const toMonthlyEquivalent = (
    amount: number,
    frequency: RecurringItem["frequency"]
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

  const loadItems = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("recurring_items")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Recurring error:", error);
    }

    setItems((data ?? []) as RecurringItem[]);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const activeItems = useMemo(
    () => items.filter((item) => item.active),
    [items]
  );

  const monthlyExpenses = activeItems
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

  const monthlyIncome = activeItems
    .filter((item) => item.type === "income")
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

  const toggleActive = async (
    item: RecurringItem
  ) => {
    const newValue = !item.active;

    const { error } = await supabase
      .from("recurring_items")
      .update({
        active: newValue,
      })
      .eq("id", item.id);

    if (error) {
      console.error("Toggle error:", error);
      return;
    }

    setItems((previous) =>
      previous.map((current) =>
        current.id === item.id
          ? {
              ...current,
              active: newValue,
            }
          : current
      )
    );
  };

  const deleteItem = async (id: string) => {
    const confirmed = window.confirm(
      "Delete this recurring item?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("recurring_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      alert(
        "Could not delete this recurring item."
      );
      return;
    }

    setItems((previous) =>
      previous.filter((item) => item.id !== id)
    );
  };

  const openEdit = (item: RecurringItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditAmount(String(item.amount));
    setEditCategory(item.category ?? "Other");
    setEditCurrency(item.currency);
    setEditFrequency(item.frequency);
    setEditStartDate(item.start_date);
  };

  const saveEdit = async () => {
    if (!editingItem) return;

    const numericAmount = Number(editAmount);

    if (
      !editName.trim() ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0 ||
      !editStartDate
    ) {
      alert("Please complete all required fields.");
      return;
    }

    setSavingEdit(true);

    const { error } = await supabase
      .from("recurring_items")
      .update({
        type: editingItem.type,
        name: editName.trim(),
        amount: numericAmount,
        category: editCategory,
        currency: editCurrency,
        frequency: editFrequency,
        start_date: editStartDate,
      })
      .eq("id", editingItem.id);

    if (error) {
      console.error("Update error:", error);
      alert(
        "Could not update this recurring item."
      );
      setSavingEdit(false);
      return;
    }

    setItems((previous) =>
      previous.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              type: editingItem.type,
              name: editName.trim(),
              amount: numericAmount,
              category: editCategory,
              currency: editCurrency,
              frequency: editFrequency,
              start_date: editStartDate,
            }
          : item
      )
    );

    setEditingItem(null);
    setSavingEdit(false);
  };

  const formatEUR = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatOriginalAmount = (
    item: RecurringItem
  ) => {
    if (item.currency === "EUR") {
      return `€${Number(
        item.amount
      ).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}`;
    }

    return `HK$ ${Number(
      item.amount
    ).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;
  };

  const frequencyLabel = (
    frequency: RecurringItem["frequency"]
  ) => {
    switch (frequency) {
      case "weekly":
        return "Weekly";
      case "quarterly":
        return "Quarterly";
      case "yearly":
        return "Yearly";
      default:
        return "Monthly";
    }
  };

  return (
    <main className="min-h-screen bg-[#090A0B] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[#7567FF]/15 blur-[130px]" />

        <div className="absolute right-[-100px] top-[260px] h-[360px] w-[360px] rounded-full bg-[#CCFF33]/10 blur-[130px]" />
      </div>

      <div className="relative mx-auto min-h-screen max-w-md px-4 pb-16 pt-5">
        {/* HEADER */}

        <header className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
              Automatic money
            </p>

            <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.045em]">
              Recurring
            </h1>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
            <RefreshCcw
              size={17}
              className="text-white/50"
            />
          </div>
        </header>

        {/* HERO */}

        <section className="relative mt-7 overflow-hidden rounded-[32px] bg-[#CCFF33] p-5 text-black">
          <div className="absolute right-[-40px] top-[-50px] h-40 w-40 rounded-full bg-white/30 blur-[60px]" />

          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
              Monthly fixed burn
            </p>

            <h2 className="mt-3 text-[42px] font-semibold tracking-[-0.06em]">
              {formatEUR(monthlyExpenses)}
            </h2>

            <p className="mt-2 text-[12px] text-black/50">
              Estimated monthly equivalent
            </p>

            <div className="mt-7 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-black/40">
                  Recurring income
                </p>

                <p className="mt-1 text-[18px] font-semibold">
                  {formatEUR(monthlyIncome)}
                </p>
              </div>

              <div className="rounded-full bg-black px-4 py-2 text-[11px] font-semibold text-white">
                {activeItems.length} active
              </div>
            </div>
          </div>
        </section>

        {/* LIST HEADER */}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                Plans & commitments
              </p>

              <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.045em]">
                Your recurring
              </h2>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/[0.05] text-white/30">
              <Wallet size={16} />
            </div>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045]">
            {loading ? (
              <div className="px-5 py-10 text-center text-[13px] text-white/30">
                Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[13px] text-white/30">
                  No recurring items yet
                </p>
              </div>
            ) : (
              items.map((item, index) => {
                const monthlyEquivalent =
                  toMonthlyEquivalent(
                    toEUR(
                      item.amount,
                      item.currency
                    ),
                    item.frequency
                  );

                return (
                  <div
                    key={item.id}
                    className={`px-4 py-4 ${
                      index !== items.length - 1
                        ? "border-b border-white/[0.06]"
                        : ""
                    } ${
                      item.active
                        ? ""
                        : "opacity-45"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[15px] font-medium">
                            {item.name}
                          </p>

                          {!item.active && (
                            <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-white/30">
                              Paused
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] text-white/30">
                            {item.category ??
                              "Other"}
                          </span>

                          <span className="text-[10px] text-white/15">
                            •
                          </span>

                          <span className="text-[10px] text-white/30">
                            {frequencyLabel(
                              item.frequency
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={`text-[14px] font-semibold ${
                            item.type ===
                            "income"
                              ? "text-[#CCFF33]"
                              : "text-white"
                          }`}
                        >
                          {item.type ===
                          "income"
                            ? "+"
                            : "-"}
                          {formatOriginalAmount(
                            item
                          )}
                        </p>

                        <p className="mt-1 text-[9px] text-white/25">
                          ≈{" "}
                          {formatEUR(
                            monthlyEquivalent
                          )}
                          /mo
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      {/* TOGGLE */}

                      <button
                        onClick={() =>
                          toggleActive(item)
                        }
                        className={`relative h-7 w-12 rounded-full transition ${
                          item.active
                            ? "bg-[#CCFF33]"
                            : "bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-black transition-all ${
                            item.active
                              ? "left-6"
                              : "left-1"
                          }`}
                        />
                      </button>

                      {/* ACTIONS */}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            openEdit(item)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white/[0.05] text-white/30 transition hover:text-white"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          onClick={() =>
                            deleteItem(item.id)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white/[0.05] text-white/30 transition hover:text-[#FF8CA8]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* EDIT SHEET */}

      {editingItem && (
        <div className="fixed inset-0 z-[100]">
          <button
            onClick={() =>
              setEditingItem(null)
            }
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            aria-label="Close"
          />

          <div className="absolute bottom-0 left-1/2 max-h-[96vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-[38px] border border-white/10 bg-[#111214] px-5 pb-8 pt-3">
            <div className="mx-auto h-1.5 w-11 rounded-full bg-white/15" />

            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                  Recurring item
                </p>

                <h3 className="mt-1 text-[27px] font-semibold tracking-[-0.05em]">
                  Edit recurring
                </h3>
              </div>

              <button
                onClick={() =>
                  setEditingItem(null)
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06]"
              >
                <X size={18} />
              </button>
            </div>

            {/* TYPE */}

            <div className="mt-6 flex rounded-[20px] bg-black/25 p-1">
              <button
                onClick={() =>
                  setEditingItem({
                    ...editingItem,
                    type: "income",
                  })
                }
                className={`flex-1 rounded-[16px] py-3 text-[12px] font-semibold ${
                  editingItem.type ===
                  "income"
                    ? "bg-[#CCFF33] text-black"
                    : "text-white/35"
                }`}
              >
                Income
              </button>

              <button
                onClick={() =>
                  setEditingItem({
                    ...editingItem,
                    type: "expense",
                  })
                }
                className={`flex-1 rounded-[16px] py-3 text-[12px] font-semibold ${
                  editingItem.type ===
                  "expense"
                    ? "bg-white text-black"
                    : "text-white/35"
                }`}
              >
                Expense
              </button>
            </div>

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
                  className="mt-1 w-full bg-transparent text-[15px] text-white outline-none"
                />
              </div>

              {/* AMOUNT/CURRENCY */}

              <div className="grid grid-cols-[1fr_110px] gap-3">
                <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                    Amount
                  </p>

                  <input
                    type="number"
                    step="0.01"
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

              {/* FREQUENCY */}

              <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                  Frequency
                </p>

                <select
                  value={editFrequency}
                  onChange={(event) =>
                    setEditFrequency(
                      event.target
                        .value as
                        | "weekly"
                        | "monthly"
                        | "quarterly"
                        | "yearly"
                    )
                  }
                  className="mt-1 w-full bg-transparent text-[14px] text-white outline-none"
                >
                  <option
                    value="weekly"
                    className="bg-[#111214]"
                  >
                    Weekly
                  </option>

                  <option
                    value="monthly"
                    className="bg-[#111214]"
                  >
                    Monthly
                  </option>

                  <option
                    value="quarterly"
                    className="bg-[#111214]"
                  >
                    Quarterly
                  </option>

                  <option
                    value="yearly"
                    className="bg-[#111214]"
                  >
                    Yearly
                  </option>
                </select>
              </div>

              {/* START DATE */}

              <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.045] px-4 py-4">
                <div className="flex items-center gap-3">
                  <CalendarDays
                    size={17}
                    className="text-white/40"
                  />

                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                      Start date
                    </p>

                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(event) =>
                        setEditStartDate(
                          event.target.value
                        )
                      }
                      className="mt-1 w-full bg-transparent text-[14px] text-white outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={saveEdit}
              disabled={savingEdit}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#CCFF33] py-4 text-[14px] font-semibold text-black disabled:opacity-50"
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