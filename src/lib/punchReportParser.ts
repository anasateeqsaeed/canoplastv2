/**
 * Parses a biometric punch report (.xlsx / .xls / .csv) into normalised
 * one-row-per-(employee+date) attendance entries.
 *
 * Heuristics handle the most common export shapes from low-cost devices:
 *  - Long format: one row per punch (Punch ID, Name, Date, Time[, In/Out])
 *  - Wide format: one row per employee, multiple columns of times
 *  - Date+time combined in a single column
 */
import * as XLSX from 'xlsx';

export interface RawPunch {
  punchId: string;
  name?: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:mm:ss
  inOut?: 'in' | 'out';
}

export interface ParsedDay {
  punchId: string;
  name: string;
  date: string;          // YYYY-MM-DD
  firstIn: string;       // HH:mm:ss
  lastOut: string;       // HH:mm:ss
  hoursWorked: number;   // decimal hours (after lunch deduction)
  punchCount: number;
}

export interface ParseOptions {
  /** Lunch break minutes deducted from total span. Default 60. */
  lunchBreakMinutes?: number;
  /** Min span (minutes) to even consider a single-punch day. Default 0. */
  minSpanMinutes?: number;
}

export interface ParseResult {
  days: ParsedDay[];
  rawPunches: RawPunch[];
  totalRowsParsed: number;
  detectedHeaders: Record<string, string>; // header -> normalised key
  warnings: string[];
}

/** Per-day shift resolution used by the shift-aware grouper. */
export interface ShiftDef {
  code: string;            // 'day' | 'night' | 'off' | ...
  startMins: number;       // minutes-of-day
  endMins: number;         // minutes-of-day (may be < startMins → crosses midnight)
  graceMins: number;
  crossesMidnight: boolean;
}
export type ShiftLookup = (personId: string, date: string) => ShiftDef | null;

export interface ShiftAwareDay extends ParsedDay {
  personId: string;
  shift: string;           // resolved shift code
  rolledFromNextDay: boolean; // true if any punch was attributed back from D+1
}

// ---------- Header detection ----------

const HEADER_ALIASES: Record<string, string[]> = {
  punchId: [
    'punchid', 'punch id', 'employee id', 'emp id', 'empid', 'enrollno',
    'enroll no', 'enroll', 'card no', 'cardno', 'user id', 'userid',
    'badge', 'badge no', 'ac-no', 'ac no', 'acno', 'employee code',
    'staff id', 'staffid', 'id',
  ],
  name: [
    'name', 'employee name', 'emp name', 'staff name', 'full name',
  ],
  date: [
    'date', 'attendance date', 'punch date', 'log date', 'day',
  ],
  time: [
    'time', 'punch time', 'log time', 'check time', 'event time',
  ],
  datetime: [
    'datetime', 'date time', 'date/time', 'date_time', 'timestamp', 'log',
  ],
  inOut: [
    'in/out', 'inout', 'status', 'mode', 'direction', 'event', 'type',
  ],
};

function normaliseHeader(h: string): string {
  return (h || '').toString().trim().toLowerCase().replace(/[\s_\-./]+/g, ' ');
}

function detectColumns(headers: string[]): { map: Record<string, number>; pretty: Record<string, string> } {
  const map: Record<string, number> = {};
  const pretty: Record<string, string> = {};
  headers.forEach((h, idx) => {
    const norm = normaliseHeader(h);
    for (const key of Object.keys(HEADER_ALIASES)) {
      if (map[key] !== undefined) continue;
      if (HEADER_ALIASES[key].some((alias) => norm === alias || norm.includes(alias))) {
        map[key] = idx;
        pretty[key] = String(h);
        break;
      }
    }
  });
  return { map, pretty };
}

// ---------- Date / time parsing ----------

function pad(n: number) { return n < 10 ? '0' + n : '' + n; }

function excelSerialToDate(serial: number): Date {
  // Excel epoch: 1899-12-30
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms);
}

function parseDateCell(v: any): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) {
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  if (typeof v === 'number') {
    const d = excelSerialToDate(v);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const s = String(v).trim();
  // YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  // DD-MM-YYYY or DD/MM/YYYY
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  // DD-MMM-YYYY (e.g. 25-Apr-2025)
  m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{4})/);
  if (m) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const mi = months.indexOf(m[2].toLowerCase().slice(0, 3));
    if (mi >= 0) return `${m[3]}-${pad(mi + 1)}-${pad(+m[1])}`;
  }
  // Fallback: Date.parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return null;
}

function parseTimeCell(v: any): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) {
    return `${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}`;
  }
  if (typeof v === 'number') {
    // Excel time fraction (0..1) or full datetime serial
    let frac = v;
    if (v > 1) frac = v - Math.floor(v);
    const totalSecs = Math.round(frac * 86400);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  const s = String(v).trim();
  // HH:mm[:ss] [AM/PM]
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/);
  if (m) {
    let h = +m[1];
    const min = +m[2];
    const sec = m[3] ? +m[3] : 0;
    const ampm = m[4]?.toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${pad(h)}:${pad(min)}:${pad(sec)}`;
  }
  return null;
}

function parseDateTimeCell(v: any): { date: string; time: string } | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) {
    return {
      date: `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`,
      time: `${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}`,
    };
  }
  if (typeof v === 'number') {
    const d = excelSerialToDate(v);
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    };
  }
  const s = String(v).trim();
  const parts = s.split(/[ T]+/);
  if (parts.length >= 2) {
    const date = parseDateCell(parts[0]);
    const time = parseTimeCell(parts.slice(1).join(' '));
    if (date && time) return { date, time };
  }
  // Try Date.parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    };
  }
  return null;
}

// ---------- Row → punches ----------

function extractWidePunches(row: any[], punchId: string, name: string, dateStr: string): RawPunch[] {
  // Wide format: scan every cell for a HH:mm[:ss] string. Used when we found
  // an employee and a date but no obvious time column.
  const punches: RawPunch[] = [];
  row.forEach((cell) => {
    const t = parseTimeCell(cell);
    if (t) punches.push({ punchId, name, date: dateStr, time: t });
  });
  return punches;
}

// ---------- Main parser ----------

export async function parsePunchReport(
  file: File,
  opts: ParseOptions = {}
): Promise<ParseResult> {
  const lunchMins = opts.lunchBreakMinutes ?? 60;
  const minSpanMins = opts.minSpanMinutes ?? 0;

  const buf = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buf, { type: 'array', cellDates: true, raw: true });
  } catch (e: any) {
    throw new Error('Could not read file. Please use .xlsx or .csv format.');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error('Workbook is empty.');

  // Get all rows as arrays (header in first non-empty row).
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  });

  if (rows.length === 0) {
    return { days: [], rawPunches: [], totalRowsParsed: 0, detectedHeaders: {}, warnings: ['File is empty.'] };
  }

  // Find header row: the row with the most matched aliases in the first 10 rows.
  let headerIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i].map((c) => normaliseHeader(String(c)));
    let score = 0;
    for (const aliases of Object.values(HEADER_ALIASES)) {
      if (r.some((cell) => aliases.some((a) => cell === a || cell.includes(a)))) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      headerIdx = i;
    }
  }

  const headerRow = rows[headerIdx].map((c) => String(c));
  const { map: cols, pretty } = detectColumns(headerRow);
  const dataRows = rows.slice(headerIdx + 1);

  if (cols.punchId === undefined && cols.name === undefined) {
    throw new Error(
      'Could not detect employee column. Expected a column like "Employee ID", "Punch ID", "Card No" or "Name".'
    );
  }

  // Walk rows. Maintain "current employee + date" context so wide / merged
  // exports still work (some devices put the date or name only on the first
  // row of a block).
  const punches: RawPunch[] = [];
  const warnings: string[] = [];
  let currentPunchId = '';
  let currentName = '';
  let currentDate = '';

  for (const r of dataRows) {
    if (!r || r.every((c) => c === '' || c == null)) continue;

    // Update context if this row carries new identity / date.
    if (cols.punchId !== undefined && r[cols.punchId]) {
      currentPunchId = String(r[cols.punchId]).trim().replace(/^['`]+/, '');
    }
    if (cols.name !== undefined && r[cols.name]) {
      currentName = String(r[cols.name]).trim();
    }
    if (cols.datetime !== undefined && r[cols.datetime]) {
      const dt = parseDateTimeCell(r[cols.datetime]);
      if (dt) {
        currentDate = dt.date;
        if (currentPunchId || currentName) {
          punches.push({
            punchId: currentPunchId || currentName,
            name: currentName,
            date: dt.date,
            time: dt.time,
            inOut: cols.inOut !== undefined ? normaliseInOut(r[cols.inOut]) : undefined,
          });
        }
        continue;
      }
    }
    if (cols.date !== undefined && r[cols.date]) {
      const d = parseDateCell(r[cols.date]);
      if (d) currentDate = d;
    }

    // Time column may carry a full datetime (e.g. Hikvision "2026-05-12 09:14:49").
    // Handle this BEFORE the !currentDate guard so date-less files still work.
    if (cols.time !== undefined && r[cols.time]) {
      const raw = String(r[cols.time]);
      if (/\d{4}/.test(raw) && /\d{1,2}:\d{2}/.test(raw)) {
        const dt = parseDateTimeCell(r[cols.time]);
        if (dt && (currentPunchId || currentName)) {
          currentDate = dt.date;
          punches.push({
            punchId: currentPunchId || currentName,
            name: currentName,
            date: dt.date,
            time: dt.time,
            inOut: cols.inOut !== undefined ? normaliseInOut(r[cols.inOut]) : undefined,
          });
          continue;
        }
      }
    }

    if (!currentPunchId && !currentName) continue;
    if (!currentDate) continue;

    if (cols.time !== undefined && r[cols.time]) {
      const t = parseTimeCell(r[cols.time]);
      if (t) {
        punches.push({
          punchId: currentPunchId || currentName,
          name: currentName,
          date: currentDate,
          time: t,
          inOut: cols.inOut !== undefined ? normaliseInOut(r[cols.inOut]) : undefined,
        });
        continue;
      }
    }

    // Wide format fallback: row has employee + date but no explicit time col;
    // scan unmapped cells for any HH:mm value.
    const unmapped = r.filter((_, idx) =>
      idx !== cols.punchId && idx !== cols.name && idx !== cols.date && idx !== cols.datetime
    );
    const widePunches = extractWidePunches(unmapped, currentPunchId || currentName, currentName, currentDate);
    punches.push(...widePunches);
  }

  if (punches.length === 0) {
    warnings.push('No punch entries could be extracted from the file.');
  }

  // Group → ParsedDay[]
  const grouped = new Map<string, RawPunch[]>();
  for (const p of punches) {
    const key = `${p.punchId}__${p.date}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  const days: ParsedDay[] = [];
  grouped.forEach((list, key) => {
    const sorted = [...list].sort((a, b) => a.time.localeCompare(b.time));
    const firstIn = sorted[0].time;
    const lastOut = sorted[sorted.length - 1].time;
    const spanMins = timeDiffMinutes(firstIn, lastOut);
    if (spanMins < minSpanMins) return;
    const workedMins = Math.max(0, spanMins - (sorted.length > 1 ? lunchMins : 0));
    const [punchId, date] = key.split('__');
    days.push({
      punchId,
      name: sorted[0].name || '',
      date,
      firstIn,
      lastOut,
      hoursWorked: Math.round((workedMins / 60) * 100) / 100,
      punchCount: sorted.length,
    });
  });

  // Sort by date then employee
  days.sort((a, b) => a.date.localeCompare(b.date) || a.punchId.localeCompare(b.punchId));

  return {
    days,
    rawPunches: punches,
    totalRowsParsed: punches.length,
    detectedHeaders: pretty,
    warnings,
  };
}

// ---------- Shift-aware grouping ----------

function addDays(yyyymmdd: string, delta: number): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function timeToMins(hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Group raw punches into per-shift days, attributing post-midnight punches of
 * a night shift back to the date the shift started on.
 *
 * `punchIdToPersonId`: maps the device punch id to your internal person id
 * (used so the lookup can resolve roster + shift settings).
 */
export function groupPunchesShiftAware(
  punches: RawPunch[],
  punchIdToPersonId: (punchId: string) => string | null,
  shiftLookup: ShiftLookup,
  opts: ParseOptions = {}
): ShiftAwareDay[] {
  const lunchMins = opts.lunchBreakMinutes ?? 60;
  const minSpanMins = opts.minSpanMinutes ?? 0;

  // Bucket: key = personId__attributedDate → punches[]
  const buckets = new Map<string, { name: string; punchId: string; personId: string; date: string; shift: string; rolled: boolean; list: RawPunch[] }>();

  for (const p of punches) {
    const personId = punchIdToPersonId(p.punchId);
    if (!personId) continue;

    let attributedDate = p.date;
    let rolled = false;
    let shiftCode = 'day';

    const prevDate = addDays(p.date, -1);
    const prevShift = shiftLookup(personId, prevDate);
    const todayShift = shiftLookup(personId, p.date);
    const tMins = timeToMins(p.time);

    // If yesterday was a night shift that crosses midnight and this punch
    // falls before its end (+ grace), roll it back to yesterday.
    if (prevShift && prevShift.crossesMidnight && tMins <= prevShift.endMins + prevShift.graceMins) {
      attributedDate = prevDate;
      shiftCode = prevShift.code;
      rolled = true;
    } else if (todayShift) {
      shiftCode = todayShift.code;
    }

    const key = `${personId}__${attributedDate}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        name: p.name || '',
        punchId: p.punchId,
        personId,
        date: attributedDate,
        shift: shiftCode,
        rolled,
        list: [],
      });
    }
    const b = buckets.get(key)!;
    b.list.push(p);
    if (rolled) b.rolled = true;
  }

  const out: ShiftAwareDay[] = [];
  buckets.forEach((b) => {
    const sorted = [...b.list].sort((a, b2) => {
      // Sort by (date, time) so a rolled-back morning punch sorts AFTER prior night punches
      const ka = `${a.date} ${a.time}`;
      const kb = `${b2.date} ${b2.time}`;
      return ka.localeCompare(kb);
    });
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // Span across midnight when last.date > first.date
    let firstMins = timeToMins(first.time);
    let lastMins = timeToMins(last.time);
    if (last.date > first.date) lastMins += 24 * 60;
    const spanMins = Math.max(0, lastMins - firstMins);
    if (spanMins < minSpanMins) return;
    const workedMins = Math.max(0, spanMins - (sorted.length > 1 ? lunchMins : 0));

    out.push({
      personId: b.personId,
      punchId: b.punchId,
      name: b.name,
      date: b.date,
      shift: b.shift,
      rolledFromNextDay: b.rolled,
      firstIn: first.time,
      lastOut: last.time,
      hoursWorked: Math.round((workedMins / 60) * 100) / 100,
      punchCount: sorted.length,
    });
  });

  out.sort((a, b) => a.date.localeCompare(b.date) || a.punchId.localeCompare(b.punchId));
  return out;
}

function normaliseInOut(v: any): 'in' | 'out' | undefined {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (!s) return undefined;
  if (s.startsWith('i') || s === '0' || s.includes('check in') || s.includes('check-in')) return 'in';
  if (s.startsWith('o') || s === '1' || s.includes('check out') || s.includes('check-out')) return 'out';
  return undefined;
}

function timeDiffMinutes(a: string, b: string): number {
  const [ah, am, as] = a.split(':').map(Number);
  const [bh, bm, bs] = b.split(':').map(Number);
  return (bh * 60 + bm + (bs || 0) / 60) - (ah * 60 + am + (as || 0) / 60);
}

// ---------- Status derivation ----------

export function deriveStatus(
  hoursWorked: number,
  firstIn: string,
  shiftStart: string | null,
  lateThresholdMins: number
): 'P' | 'H' | 'LATE' {
  if (hoursWorked > 0 && hoursWorked < 5) return 'H';
  if (shiftStart) {
    const late = timeDiffMinutes(shiftStart, firstIn);
    if (late > lateThresholdMins) return 'LATE';
  }
  return 'P';
}
