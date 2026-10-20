/* Horaires d'ouverture et créneaux. Toujours calculés en heure de Paris,
   quel que soit le fuseau du serveur. dayOfWeek : 0 = lundi ... 6 = dimanche. */

export interface DayHours {
  dayOfWeek: number;
  isOpen: boolean;
  open: string;
  close: string;
}

export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const TZ = 'Europe/Paris';

/* Heure de Paris d'un instant : jour (0 = lundi), minutes depuis minuit, date AAAA-MM-JJ */
export function parisClock(now: Date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).map(p => [p.type, p.value]),
  );
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday);
  return { day, minutes: Number(parts.hour) * 60 + Number(parts.minute), date: `${parts.year}-${parts.month}-${parts.day}` };
}

/* "00:00" en fermeture = minuit = 24 h */
export function toMinutes(hm: string, isClose = false): number {
  const [h, m] = hm.split(':').map(Number);
  return (isClose && h === 0 ? 24 : h) * 60 + m;
}

export const hmLabel = (hm: string) => (hm === '00:00' ? 'minuit' : hm.replace(':', 'h'));
const pad = (n: number) => String(n).padStart(2, '0');
export const minutesToHM = (t: number) => `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;

export interface OpenStatus {
  open: boolean;
  label: string;
}

export function openStatus(hours: DayHours[], now: Date = new Date()): OpenStatus {
  const { day, minutes } = parisClock(now);
  const today = hours.find(h => h.dayOfWeek === day);
  if (today?.isOpen) {
    const o = toMinutes(today.open), c = toMinutes(today.close, true);
    if (minutes >= o && minutes < c) return { open: true, label: `Ouvert, jusqu'à ${hmLabel(today.close)}` };
    if (minutes < o) return { open: false, label: `Fermé, ouvre à ${hmLabel(today.open)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const next = hours.find(h => h.dayOfWeek === (day + i) % 7);
    if (next?.isOpen) return { open: false, label: `Fermé, ${i === 1 ? 'à demain' : 'à ' + DAY_NAMES[next.dayOfWeek].toLowerCase()} dès ${hmLabel(next.open)}` };
  }
  return { open: false, label: 'Fermé' };
}

/* Créneaux du jour (heure de Paris, "HH:MM"), à partir de maintenant + délai de préparation */
export function timeSlots(hours: DayHours[], leadMinutes: number, interval = 15, now: Date = new Date(), limit = 12): string[] {
  const { day, minutes } = parisClock(now);
  const today = hours.find(h => h.dayOfWeek === day);
  if (!today?.isOpen) return [];
  const o = toMinutes(today.open), c = toMinutes(today.close, true);
  let start = Math.ceil((minutes + leadMinutes) / interval) * interval;
  if (start < o + leadMinutes) start = Math.ceil((o + leadMinutes) / interval) * interval;
  const slots: string[] = [];
  for (let t = start; t <= c - interval && slots.length < limit; t += interval) slots.push(minutesToHM(t));
  return slots;
}

/* Décalage Paris - UTC (ms) à un instant donné, heure d'été comprise */
function parisOffset(at: Date): number {
  const asParis = new Date(at.toLocaleString('en-US', { timeZone: TZ }));
  const asUtc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }));
  return asParis.getTime() - asUtc.getTime();
}

/* "AAAA-MM-JJTHH:MM" lu en heure de Paris -> Date (UTC) */
export function parisLocalToDate(local: string): Date {
  const naive = new Date(`${local.slice(0, 16)}:00Z`);
  return new Date(naive.getTime() - parisOffset(naive));
}

/* Date -> "AAAA-MM-JJTHH:MM" en heure de Paris (champs datetime-local) */
export function dateToParisLocal(d: Date): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/* "HH:MM" du jour à Paris -> Date UTC. Les créneaux après minuit tombent le lendemain. */
export function slotToDate(slot: string, now: Date = new Date()): Date {
  const { date, minutes } = parisClock(now);
  const d = parisLocalToDate(`${date}T${slot}`);
  if (toMinutes(slot) < minutes - 12 * 60) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
