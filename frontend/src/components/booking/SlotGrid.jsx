import { money, timeRange, timeShort } from '../../utils/format'

/**
 * Enhanced SlotGrid displaying real-time slot statuses:
 * - AVAILABLE: crisp selectable card, price per slot, emerald border / subtle mint hover
 * - SELECTED: bold court green fill, white text, checkmark badge
 * - BOOKED: disabled, clear 'Booked' badge pill, subtle muted background
 * - HELD: subtle amber badge 'Held (In checkout)', non-selectable to prevent conflict
 * - PAST: disabled, muted gray text for slots that have already passed today
 */
export default function SlotGrid({ slots = [], selectedId, onSelect }) {
  if (!slots.length) return null

  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Time slots">
        {slots.map((s) => {
          const slotId = s.id || s.slotId || `${s.startTime}-${s.endTime}`
          const isSelected = selectedId === slotId
          const status = (s.status || (s.available ? 'AVAILABLE' : 'BOOKED')).toUpperCase()

          const isAvailable = status === 'AVAILABLE' || (s.available && status !== 'HELD' && status !== 'BOOKED' && status !== 'PAST')
          const isHeld = status === 'HELD'
          const isBooked = status === 'BOOKED'
          const isPast = status === 'PAST'

          const durationLabel = s.duration ? `${s.duration} mins` : '60 mins'

          return (
            <li key={slotId}>
              <button
                type="button"
                disabled={!isAvailable}
                aria-pressed={isSelected}
                onClick={() => isAvailable && onSelect(s)}
                className={`relative w-full rounded-xl border p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-court ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30'
                    : isAvailable
                    ? 'border-emerald-200/80 bg-white text-navy hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-sm cursor-pointer'
                    : isHeld
                    ? 'cursor-not-allowed border-amber-200 bg-amber-50/50 text-amber-900 opacity-90'
                    : isBooked
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                    : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-semibold ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {timeShort(s.startTime)}
                  </span>
                  {isSelected && (
                    <span className="inline-flex items-center rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      ✓ Selected
                    </span>
                  )}
                  {!isSelected && isHeld && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                      ⏱ Held
                    </span>
                  )}
                  {!isSelected && isBooked && (
                    <span className="inline-flex items-center rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                      Booked
                    </span>
                  )}
                  {!isSelected && isPast && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                      Past
                    </span>
                  )}
                </div>

                <div className="mt-1 font-bold text-sm">
                  {timeRange(s.startTime, s.endTime)}
                </div>

                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className={isSelected ? 'text-emerald-100' : 'text-slate-500'}>
                    {durationLabel}
                  </span>
                  <span className={`font-bold ${isSelected ? 'text-white' : isAvailable ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {isAvailable ? money(s.price) : isHeld ? 'In checkout' : isBooked ? 'Unavailable' : 'Ended'}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Visual Status Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-amber-100" />
          <span>Temporarily Held (10 min)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span>Booked / Past</span>
        </div>
      </div>
    </div>
  )
}
