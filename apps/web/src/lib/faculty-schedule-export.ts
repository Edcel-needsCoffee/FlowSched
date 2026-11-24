import type { ScheduleSlot, DayOfWeek } from './schedule-slots';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const LABELS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const rule = { style: 'thin' as const, color: { argb: 'FF000000' } };
const border = { top: rule, bottom: rule, left: rule, right: rule };
const minutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
const clock = (value: number): string => `${Math.floor(value / 60) % 12 || 12}:${String(value % 60).padStart(2, '0')}`;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export interface FacultyProgramOptions {
  faculty: { id: string; name: string; rank?: string | null };
  termLabel: string;
  slots: ScheduleSlot[];
  /** Injectable for offline generation and export verification. */
  template?: Uint8Array;
}

/** Use the institution's actual form, including its original two logos. */
export async function buildFacultyScheduleWorkbook(options: FacultyProgramOptions): Promise<Uint8Array> {
  let template = options.template;
  if (!template) {
    const response = await fetch(`${import.meta.env.BASE_URL}faculty-class-program-template.xlsx`);
    if (!response.ok) throw new Error('Faculty class program template could not be loaded.');
    template = new Uint8Array(await response.arrayBuffer());
  }
  const module = await import('exceljs');
  const ExcelJS = module.default ?? module;
  const source = new ExcelJS.Workbook();
  await source.xlsx.load(template as never);
  const form = source.worksheets[0];
  const wb = new ExcelJS.Workbook();
  wb.calcProperties.fullCalcOnLoad = true;
  wb.creator = 'FlowSched';
  const ws = wb.addWorksheet('Faculty Class Program');
  const slots = options.slots.filter((slot) => slot.faculty_id === options.faculty.id);
  for (const slot of slots) {
    if (minutes(slot.end_time) <= minutes(slot.start_time)) throw new Error('Invalid faculty schedule time range.');
  }
  const days = DAYS;
  const lastColumn = days.length + 1;
  const groups = new Map<string, { lecture: number; lab: number }>();
  for (const slot of slots) {
    const group = groups.get(slot.subject_code) ?? { lecture: 0, lab: 0 };
    group[slot.session_type === 'LAB' ? 'lab' : 'lecture'] += (minutes(slot.end_time) - minutes(slot.start_time)) / 60;
    groups.set(slot.subject_code, group);
  }
  const subjects = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  const extra = Math.max(0, subjects.length - 8);
  // Keep the supplied noon break when it is free. Expand it when teaching is scheduled.
  const lunchFree = !slots.some((s) => minutes(s.start_time) < 780 && minutes(s.end_time) > 720);
  const start = Math.min(420, ...slots.map((s) => Math.floor(minutes(s.start_time) / 30) * 30));
  const end = Math.max(1140, ...slots.map((s) => Math.ceil(minutes(s.end_time) / 30) * 30));
  const periods: { start: number; end: number; lunch: boolean }[] = [];
  for (let time = start; time < end;) {
    const isLunch = lunchFree && time === 720;
    const next = isLunch ? 780 : time + 30;
    periods.push({ start: time, end: next, lunch: isLunch });
    time = next;
  }
  const offset = periods.length - 23;
  const rowFor = (row: number): number => row + (row >= 37 ? offset : 0) + (row >= 49 ? extra : 0);
  const copyRow = (from: number, to: number): void => {
    ws.getRow(to).height = form.getRow(from).height;
    for (let col = 1; col <= 6; col++) {
      const original = form.getCell(from, col);
      const cell = ws.getCell(to, col);
      cell.style = clone(original.style);
      if (original.type !== ExcelJS.ValueType.Merge) cell.value = clone(original.value);
    }
  };
  for (let col = 1; col <= lastColumn; col++) ws.getColumn(col).width = form.getColumn(Math.min(col, 6)).width;
  for (let row = 1; row <= 70; row++) {
    if (row < 14 || row >= 37) copyRow(row, rowFor(row));
  }
  for (const range of form.model.merges ?? []) {
    const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range);
    if (!match) continue;
    const [, a, first, b, last] = match;
    if (+first >= 14 && +first <= 36) continue;
    ws.mergeCells(`${a}${rowFor(+first)}:${b}${rowFor(+last)}`);
  }
  // Reuse original image data and anchor positions without substituting artwork.
  for (const picture of form.getImages()) {
    const original = source.getImage(Number(picture.imageId));
    const imageId = wb.addImage({ buffer: original.buffer!, extension: original.extension });
    const range = picture.range as typeof picture.range & { ext?: { width: number; height: number } };
    if (range.ext) {
      ws.addImage(imageId, { tl: { col: range.tl.col, row: range.tl.row }, ext: { ...range.ext }, editAs: 'oneCell' });
    } else {
      ws.addImage(imageId, { tl: range.tl, br: range.br, editAs: 'oneCell' });
    }
  }
  ws.getCell('B9').value = options.faculty.name;
  ws.getCell('B10').value = options.faculty.rank ?? '';
  ws.getCell('E9').value = options.termLabel;
  ws.getCell('E10').value = 'Information Technology';
  ws.getCell('E11').value = 'COTE';
  for (const address of ['B9', 'B10', 'E9', 'E10', 'E11']) {
    ws.getCell(address).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  }
  ws.getRow(9).height = 28;
  ws.getRow(10).height = 23;
  ws.getRow(11).height = 23;
  days.forEach((_, index) => {
    const cell = ws.getCell(13, index + 2);
    cell.value = LABELS[index];
    cell.style = clone(form.getCell('B13').style);
  });
  for (let index = 0; index < periods.length; index++) {
    const period = periods[index];
    const row = 14 + index;
    ws.getRow(row).height = 25;
    ws.getCell(row, 1).value = `${clock(period.start)} - ${clock(period.end)}`;
    for (let col = 1; col <= lastColumn; col++) {
      const cell = ws.getCell(row, col);
      cell.font = { name: 'Arial', size: 10 };
      cell.border = border;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      if (col === 1) continue;
      const covering = slots.filter((s) => s.day_of_week === days[col - 2] && minutes(s.start_time) < period.end && minutes(s.end_time) > period.start);
      if (covering.length) {
        cell.value = covering.map((s) => `${s.subject_code}${s.session_type === 'LAB' ? ' L' : ''}\n${s.section_label}\n${s.faculty_name}\n${s.room_name ?? 'TBA'}`).join('\n\n');
        const color = covering[0].color;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color && /^#[a-f\d]{6}$/i.test(color) ? `FF${color.slice(1).toUpperCase()}` : 'FFFFE699' } };
        // Black text needs a light fill; use white on dark assignment colors.
        if (color && /^#[a-f\d]{6}$/i.test(color)) {
          const channels = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
          cell.font = { ...cell.font, color: { argb: channels[0] * .299 + channels[1] * .587 + channels[2] * .114 < 140 ? 'FFFFFFFF' : 'FF000000' } };
        }
      }
    }
    if (period.lunch) {
      ws.mergeCells(row, 2, row, lastColumn);
      ws.getCell(row, 2).value = 'L  U  N  C  H     B  R  E  A  K';
    }
  }
  // Merge consecutive identical blocks, retaining actual half-hour proportions.
  for (let col = 2; col <= lastColumn; col++) {
    let index = 0;
    while (index < periods.length) {
      const row = 14 + index;
      const value = ws.getCell(row, col).value;
      let last = index;
      if (value && !periods[index].lunch) {
        while (last + 1 < periods.length && !periods[last + 1].lunch && ws.getCell(15 + last, col).value === value) last++;
        if (last > index) ws.mergeCells(row, col, 14 + last, col);
        const neededHeight = (String(value).split('\n').length * 12 + 8) / (last - index + 1);
        for (let r = row; r <= 14 + last; r++) ws.getRow(r).height = Math.max(ws.getRow(r).height ?? 25, neededHeight);
      }
      index = last + 1;
    }
  }
  const formula = (address: string, text: string, result: number): void => {
    ws.getCell(address).value = { formula: text, result };
    ws.getCell(address).numFmt = '0.00';
  };
  for (let i = 0; i < 8 + extra; i++) {
    const row = rowFor(41) + i;
    for (let col = 1; col <= 4; col++) ws.getCell(row, col).style = clone(form.getCell(41, col).style);
    ws.getRow(row).height = 19;
    const subject = subjects[i];
    ws.getCell(row, 1).value = subject?.[0] ?? null;
    ws.getCell(row, 2).value = subject?.[1].lecture ?? null;
    ws.getCell(row, 3).value = subject?.[1].lab ?? null;
    ws.getCell(row, 2).numFmt = ws.getCell(row, 3).numFmt = '0.00';
    formula(`D${row}`, `B${row}+(C${row}*0.7)`, (subject?.[1].lecture ?? 0) + (subject?.[1].lab ?? 0) * .7);
  }
  const subtotal = rowFor(49);
  const lecture = subjects.reduce((sum, [, s]) => sum + s.lecture, 0);
  const lab = subjects.reduce((sum, [, s]) => sum + s.lab, 0);
  for (const [col, total] of [['B', lecture], ['C', lab], ['D', lecture + lab * .7]] as const) {
    formula(`${col}${subtotal}`, `SUM(${col}${rowFor(41)}:${col}${subtotal - 1})`, total);
  }
  ws.getCell(`F${rowFor(40)}`).value = subjects.length;
  formula(`F${rowFor(43)}`, `D${subtotal}-12`, lecture + lab * .7 - 12);
  // Other functions/designations stay editable. Do not copy an example instructor's hours.
  for (const [first, last, sub] of [[52, 55, 56], [59, 60, 61]]) {
    for (let r = rowFor(first); r <= rowFor(last); r++) formula(`D${r}`, `SUM(B${r}:C${r})`, 0);
    for (const col of ['B', 'C', 'D']) formula(`${col}${rowFor(sub)}`, `SUM(${col}${rowFor(first)}:${col}${rowFor(last)})`, 0);
  }
  formula(`F${rowFor(58)}`, `SUM(F${rowFor(53)}:F${rowFor(56)})`, 0);
  // Preserve the form's grand total of actual hours (weighted teaching is shown above).
  formula(`D${rowFor(63)}`, `B${subtotal}+C${subtotal}+D${rowFor(56)}+D${rowFor(61)}`, lecture + lab);
  ws.getCell(`B${rowFor(66)}`).value = options.faculty.name;
  ws.views = [{ state: 'normal', showGridLines: false }];
  ws.pageSetup = {
    // OOXML paper ID 14 is the reference form's 8.5 × 13 inch folio paper.
    orientation: 'portrait', paperSize: 14 as import('exceljs').PaperSize, fitToPage: true, fitToWidth: 1,
    fitToHeight: extra || periods.length > 23 ? 0 : 1,
    horizontalCentered: true,
    margins: { left: .25, right: .25, top: .5, bottom: .25, header: 0, footer: 0 },
    printArea: `A1:${lastColumn === 7 ? 'G' : 'F'}${rowFor(70)}`,
  };
  const bytes = await wb.xlsx.writeBuffer();
  return new Uint8Array(bytes as ArrayBuffer);
}
