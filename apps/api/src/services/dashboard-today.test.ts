import { describe, expect, it } from 'vitest';
import { selectTodayClasses } from './dashboard-today.js';
import type { PersonalClassEntry } from './dashboard.service.js';

const entry = (day: string, start = '09:00'): PersonalClassEntry => ({
  day_of_week: day, start_time: start, end_time: '12:00', subject_code: 'TEST', subject_title: 'Test', section_label: '2A', room_name: 'Room 1',
});
describe('today-only faculty classes', () => {
  it('uses the Philippine weekday across the UTC date boundary', () => {
    const mon = entry('MON');
    expect(selectTodayClasses([entry('SUN'), mon, entry('TUE')], new Date('2026-11-22T16:00:00Z'))).toEqual({todays_classes: [mon], my_next_class: mon});
  });
  it('shows only today, sorts by time, and highlights the next unstarted class today', () => {
    const later = entry('WED', '11:00'), earlier = entry('WED', '08:00');
    expect(selectTodayClasses([later, entry('MON'), earlier, entry('THU')], new Date('2026-11-18T01:00:00Z'))).toEqual({todays_classes: [earlier, later], my_next_class: later});
  });
  it('returns empty on a class-free weekday and Sunday without falling back to another day', () => {
    for (const date of ['2026-11-20T01:00:00Z', '2026-11-22T01:00:00Z']) {
      expect(selectTodayClasses([entry('MON'), entry('SAT')], new Date(date))).toEqual({todays_classes: [], my_next_class: null});
    }
  });
  it('keeps today’s classes visible after the last start time without selecting another day', () => {
    const mon = entry('MON');
    expect(selectTodayClasses([mon, entry('TUE')], new Date('2026-11-23T10:00:00Z'))).toEqual({todays_classes: [mon], my_next_class: null});
  });
});
