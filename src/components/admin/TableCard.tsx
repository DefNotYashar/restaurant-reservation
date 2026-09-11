"use client";
import { TriangleAlert, X, Cake, Users } from "lucide-react";
import type { ReservationDto, TableDto } from "@/lib/api";
import { displayNotes, exceedsCapacity, findConflicts, presenceOf, PRESENCE_CARD } from "@/lib/reservations";
import type { TableOrderSummary } from "@/lib/orders";
import { toFaDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";

interface Props {
  table: TableDto;
  reservations: ReservationDto[]; // assigned to this table (already date/time filtered)
  allReservations: ReservationDto[];
  selectedId: string | null;
  dropTarget: boolean;
  onTableClick: (table: TableDto) => void;
  onReservationSelect: (r: ReservationDto) => void;
  onReservationDetails: (r: ReservationDto) => void;
  onUnassign: (r: ReservationDto) => void;
  onDragStartReservation: (r: ReservationDto) => void;
  onDropOnTable: (table: TableDto) => void;
  onDragOverTable: (table: TableDto) => void;
  orderSummary?: TableOrderSummary | null;
}

export default function TableCard({
  table,
  reservations,
  allReservations,
  selectedId,
  dropTarget,
  onTableClick,
  onReservationSelect,
  onReservationDetails,
  onUnassign,
  onDragStartReservation,
  onDropOnTable,
  onDragOverTable,
  orderSummary,
}: Props) {
  return (
    <div
      onClick={() => onTableClick(table)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverTable(table);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropOnTable(table);
      }}
      className={cn(
        "rounded-xl border p-4 min-h-32 transition-colors cursor-pointer",
        dropTarget
          ? "border-amber-400 bg-amber-500/10 border-dashed"
          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
        reservations.length === 0 && "border-dashed",
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold">{table.name}</span>
      </div>
      {orderSummary && (
        <div className="text-[11px] text-zinc-400 mb-1">
          سفارش:
          {[
            orderSummary.fresh > 0 ? `${toFaDigits(orderSummary.fresh)} جدید` : null,
            orderSummary.preparing > 0 ? `${toFaDigits(orderSummary.preparing)} در حال تهیه` : null,
            orderSummary.ready > 0 ? `${toFaDigits(orderSummary.ready)} آماده` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </div>
      )}

      {reservations.length === 0 ? (
        <div className="text-xs text-zinc-600 mt-3 text-center">{dropTarget ? "رها کنید" : "خالی"}</div>
      ) : (
        <div className="space-y-2 mt-2">
          {reservations.map((r) => {
            const over = exceedsCapacity(r, table);
            const conflicts = findConflicts(r, allReservations, table.id);
            const selected = selectedId === r.id;
            return (
              <div
                key={r.id}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  onDragStartReservation(r);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onReservationSelect(r);
                }}
                title="کلیک برای انتخاب و جابه‌جایی. کلیک روی نام برای جزئیات."
                className={cn(
                  "rounded-lg border p-2 text-sm cursor-grab",
                  PRESENCE_CARD[presenceOf(r)],
                  selected && "ring-1 ring-amber-400 border-amber-400",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="font-medium truncate hover:text-amber-400 cursor-pointer"
                    title="مشاهده و ویرایش جزئیات"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReservationDetails(r);
                    }}
                  >
                    {r.customer?.name ?? "-"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnassign(r);
                    }}
                    className="p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                    aria-label="لغو تخصیص"
                    title="لغو تخصیص"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {toFaDigits(r.partySize)}
                  </span>
                  <span>{toFaDigits(r.time.slice(0, 5))}</span>
                  <span className="font-mono" dir="ltr">
                    {r.code}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {displayNotes(r) && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400 truncate" title={displayNotes(r) ?? ""}>
                      <Cake className="w-3 h-3 shrink-0" />
                      <span className="truncate">{displayNotes(r)}</span>
                    </span>
                  )}
                  {over && (
                    <span className="flex items-center gap-0.5 text-[11px] text-amber-400" title="ظرفیت میز کمتر از تعداد مهمان">
                      <TriangleAlert className="w-3 h-3" /> ظرفیت
                    </span>
                  )}
                  {conflicts.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] text-red-400" title={`تداخل: ${conflicts.map((c) => c.code).join("، ")}`}>
                      <TriangleAlert className="w-3 h-3" /> تداخل
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
