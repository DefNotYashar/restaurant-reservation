"use client";
import { useEffect, useState } from "react";
import { X, Phone, Users, CalendarDays, Clock, Cake } from "lucide-react";
import type { ReservationDto, TableDto } from "@/lib/api";
import { Badge, statusVariant, statusLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import {
  assignTables,
  unassignTables,
  confirmReservation,
  arriveReservation,
  cancelReservationById,
  completeReservation,
  markNoShow,
  saveStaffNotes,
  updateReservationDetails,
  updateReservation,
  findConflicts,
  assignedTableNames,
  displayNotes,
  isActiveReservation,
} from "@/lib/reservations";
import { toFaDigits, formatJalaliShort } from "@/lib/persian";
import { updateCustomer } from "@/lib/customers";

interface Props {
  reservation: ReservationDto | null;
  tables: TableDto[];
  allReservations: ReservationDto[];
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

export default function ReservationDrawer(props: Props) {
  if (!props.reservation) return null;
  return <DrawerBody key={props.reservation.id} {...props} reservation={props.reservation} />;
}

function DrawerBody({
  reservation: r,
  tables,
  allReservations,
  onClose,
  onChanged,
}: Omit<Props, "reservation"> & { reservation: ReservationDto }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [staffNote, setStaffNote] = useState(r.staffNotes ?? "");
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState(r.date);
  const [editTime, setEditTime] = useState(r.time.slice(0, 5));
  const [editParty, setEditParty] = useState(r.partySize);
  const [assignTableId, setAssignTableId] = useState(r.assignedTables?.[0]?.table?.id ?? "");
  const [editingGuest, setEditingGuest] = useState(false);
  const [guestName, setGuestName] = useState(r.customer?.name ?? "");
  const [guestPhone, setGuestPhone] = useState(r.customer?.phone ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const note = displayNotes(r);
  const active = isActiveReservation(r);
  const selectedTable = tables.find((t) => t.id === assignTableId);
  const conflicts = selectedTable ? findConflicts(r, allReservations, selectedTable.id) : [];

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "عملیات ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-zinc-950/70" onClick={onClose} />
      <aside className="absolute left-0 top-0 h-full w-full max-w-sm bg-zinc-900 border-r border-zinc-800 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <span className="font-mono text-sm text-zinc-400" dir="ltr">{r.code}</span>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400" aria-label="بستن">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-lg font-bold">{r.customer?.name ?? "-"}</div>
              <button
                onClick={() => setEditingGuest(!editingGuest)}
                className="text-[11px] text-zinc-500 hover:text-amber-400 shrink-0"
              >
                {editingGuest ? "بستن" : "ویرایش"}
              </button>
            </div>
            {editingGuest ? (
              <div className="mt-2 space-y-2 rounded-lg border border-zinc-800 p-3">
                <div>
                  <label className="text-xs text-zinc-500">نام</label>
                  <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">تلفن</label>
                  <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} dir="ltr" />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy !== null || !guestName.trim() || !guestPhone.trim()}
                  onClick={() =>
                    run("guest", async () => {
                      await updateCustomer(r.customerId, { name: guestName, phone: guestPhone });
                      setEditingGuest(false);
                    })
                  }
                >
                  {busy === "guest" ? "…" : "ذخیره مشخصات"}
                </Button>
              </div>
            ) : (
              <a
                href={r.customer?.phone ? `tel:${r.customer.phone}` : undefined}
                className="flex items-center gap-2 text-sm text-zinc-300 mt-1 hover:text-amber-400"
                dir="ltr"
              >
                <Phone className="w-4 h-4" />
                <span>{r.customer?.phone ?? "-"}</span>
              </a>
            )}
            <div className="mt-2">
              <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                <Users className="w-3.5 h-3.5" /> مهمان
              </div>
              <div className="font-semibold">{toFaDigits(r.partySize)} نفر</div>
            </div>
            <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                <Clock className="w-3.5 h-3.5" /> ساعت
              </div>
              <div className="font-semibold">{toFaDigits(r.time.slice(0, 5))}</div>
            </div>
            <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 col-span-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                <CalendarDays className="w-3.5 h-3.5" /> تاریخ
              </div>
              <div className="font-semibold">{formatJalaliShort(r.date)}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500 mb-1.5">میز</div>
            {(r.assignedTables?.length ?? 0) > 0 ? (
              <div className="text-sm rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 mb-2">
                <span className="text-emerald-400 font-medium">{assignedTableNames(r)}</span>
                <span className="text-zinc-400"> تخصیص داده شده است.</span>
              </div>
            ) : (
              <div className="text-sm font-medium mb-2 text-zinc-400">تخصیص‌نیافته</div>
            )}
            {active && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select value={assignTableId} onChange={(e) => setAssignTableId(e.target.value)} className="flex-1">
                    <option value="">{(r.assignedTables?.length ?? 0) > 0 ? "تغییر میز…" : "انتخاب میز…"}</option>
                    {tables
                      .filter((t) => t.active)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </Select>
                </div>
                {conflicts.length > 0 && selectedTable && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <div className="font-semibold mb-0.5">تداخل</div>
                    <div>این میز در این بازه زمانی رزرو دیگری دارد: {conflicts.map((c) => `${c.code} (${c.time.slice(0, 5)})`).join("، ")}</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!assignTableId || busy !== null}
                    onClick={() => run("assign", () => assignTables(r.id, [assignTableId]))}
                  >
                    {busy === "assign" ? "…" : (r.assignedTables?.length ?? 0) > 0 ? "تغییر میز" : "تخصیص میز"}
                  </Button>
                  {(r.assignedTables?.length ?? 0) > 0 && (
                    <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run("unassign", () => unassignTables(r.id))}>
                      {busy === "unassign" ? "…" : "لغو تخصیص"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5">
              <Cake className="w-3.5 h-3.5" /> درخواست مشتری
            </div>
            <div className="text-sm rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 min-h-10">
              {note || <span className="text-zinc-600">بدون درخواست</span>}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500 mb-1.5">یادداشت پرسنل</div>
            <Textarea
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
              placeholder="یادداشت داخلی برای همکاران…"
              rows={2}
            />
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              disabled={busy !== null}
              onClick={() => run("note", () => saveStaffNotes(r.id, staffNote))}
            >
              {busy === "note" ? "…" : "ذخیره یادداشت"}
            </Button>
          </div>

          {editing ? (
            <div className="space-y-2 rounded-lg border border-zinc-800 p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500">تاریخ</label>
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">ساعت</label>
                  <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500">تعداد مهمان</label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={editParty}
                  onChange={(e) => setEditParty(Number(e.target.value))}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busy !== null}
                  onClick={() =>
                    run("edit", () =>
                      updateReservationDetails(r.id, { date: editDate, time: editTime, partySize: editParty }),
                    )
                  }
                >
                  {busy === "edit" ? "…" : "ذخیره تغییرات"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  انصراف
                </Button>
              </div>
            </div>
          ) : (
            active && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                ویرایش تاریخ / ساعت / تعداد
              </Button>
            )
          )}

          {r.status === "PENDING" && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm" variant="success" disabled={busy !== null} onClick={() => run("confirm", () => confirmReservation(r.id))}>
                {busy === "confirm" ? "…" : "تأیید"}
              </Button>
              <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => run("cancel", () => cancelReservationById(r.id))}>
                {busy === "cancel" ? "…" : "لغو رزرو"}
              </Button>
            </div>
          )}
          {r.status === "CONFIRMED" && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm" variant="success" disabled={busy !== null} onClick={() => run("arrive", () => arriveReservation(r.id))}>
                {busy === "arrive" ? "…" : "حاضر شد"}
              </Button>
              <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => run("cancel", () => cancelReservationById(r.id))}>
                {busy === "cancel" ? "…" : "لغو رزرو"}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run("noshow", () => markNoShow(r.id))}>
                {busy === "noshow" ? "…" : "عدم حضور"}
              </Button>
            </div>
          )}
          {(r.status === "ARRIVED" || r.status === "SEATED") && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => run("complete", () => completeReservation(r.id))}>
                {busy === "complete" ? "…" : "تکمیل"}
              </Button>
              <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => run("cancel", () => cancelReservationById(r.id))}>
                {busy === "cancel" ? "…" : "لغو رزرو"}
              </Button>
            </div>
          )}
          {r.status === "CANCELLED" && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => run("reopen", () => updateReservation(r.id, { status: "PENDING" }))}>
                {busy === "reopen" ? "…" : "بازگشایی"}
              </Button>
            </div>
          )}
          {(r.createdAt || r.updatedAt) && (
            <div className="text-[11px] text-zinc-600 pt-1">
              {r.createdAt && (
                <div>
                  ثبت: {new Date(r.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "medium", timeStyle: "short" })}
                </div>
              )}
              {r.updatedAt && r.updatedAt !== r.createdAt && (
                <div>
                  آخرین تغییر: {new Date(r.updatedAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "medium", timeStyle: "short" })}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
