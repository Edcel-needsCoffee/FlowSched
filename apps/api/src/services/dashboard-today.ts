import type { PersonalClassEntry } from './dashboard.service.js';

/** Campus schedules follow Philippine time, independently of the server timezone. */
export function selectTodayClasses(classes: PersonalClassEntry[], now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  const day = value('weekday').toUpperCase();
  const currentTime = `${value('hour')}:${value('minute')}`;
  const todays_classes = classes.filter(entry => entry.day_of_week === day)
    .sort((a, b) => a.start_time.localeCompare(b.start_time) || a.end_time.localeCompare(b.end_time));
  return { todays_classes, my_next_class: todays_classes.find(entry => entry.start_time >= currentTime) ?? null };
}
