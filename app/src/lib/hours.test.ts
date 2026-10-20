import { describe, expect, it } from 'vitest';
import { dateToParisLocal, openStatus, parisClock, parisLocalToDate, slotToDate, timeSlots, type DayHours } from './hours';

const week: DayHours[] = [0, 1, 2, 3, 4, 5, 6].map(d => ({ dayOfWeek: d, isOpen: true, open: '11:00', close: d >= 4 && d <= 5 ? '00:00' : '23:00' }));

describe('horaires (heure de Paris)', () => {
  it('lit l\'heure de Paris en été et en hiver', () => {
    expect(parisClock(new Date('2026-07-15T10:30:00Z'))).toMatchObject({ day: 2, minutes: 12 * 60 + 30 }); // mercredi 12h30
    expect(parisClock(new Date('2026-12-15T10:30:00Z'))).toMatchObject({ day: 1, minutes: 11 * 60 + 30 }); // mardi 11h30
  });

  it('calcule ouvert / fermé, minuit inclus', () => {
    expect(openStatus(week, new Date('2026-10-16T21:30:00Z')).open).toBe(true); // vendredi 23h30, ferme à minuit
    expect(openStatus(week, new Date('2026-10-15T21:30:00Z'))).toEqual({ open: false, label: 'Fermé, à demain dès 11h00' }); // jeudi 23h30
    expect(openStatus(week, new Date('2026-10-15T07:00:00Z'))).toEqual({ open: false, label: 'Fermé, ouvre à 11h00' });
  });

  it('saute les jours fermés', () => {
    const closedFri = week.map(h => (h.dayOfWeek === 4 ? { ...h, isOpen: false } : h));
    expect(openStatus(closedFri, new Date('2026-10-15T21:30:00Z')).label).toBe('Fermé, à samedi dès 11h00');
  });

  it('propose des créneaux après le délai de préparation, avant la fermeture', () => {
    const slots = timeSlots(week, 20, 15, new Date('2026-10-15T19:50:00Z')); // jeudi 21h50
    expect(slots).toEqual(['22:15', '22:30', '22:45']);
    expect(timeSlots(week, 20, 15, new Date('2026-10-15T07:00:00Z'))[0]).toBe('11:30'); // avant ouverture
  });

  it('convertit un créneau de Paris en date UTC', () => {
    expect(slotToDate('20:15', new Date('2026-10-15T15:00:00Z')).toISOString()).toBe('2026-10-15T18:15:00.000Z');
    expect(slotToDate('20:15', new Date('2026-12-15T15:00:00Z')).toISOString()).toBe('2026-12-15T19:15:00.000Z');
  });

  it('convertit les champs date/heure de Paris dans les deux sens', () => {
    expect(parisLocalToDate('2026-07-01T23:59').toISOString()).toBe('2026-07-01T21:59:00.000Z');
    expect(parisLocalToDate('2026-01-01T00:00').toISOString()).toBe('2025-12-31T23:00:00.000Z');
    expect(dateToParisLocal(new Date('2026-07-01T21:59:00Z'))).toBe('2026-07-01T23:59');
  });
});
