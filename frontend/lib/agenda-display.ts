export const AGENDA_PAGE_SIZE = 10;

export function visibleAgendaAppointments<T extends { status: string }>(appointments: T[]): T[] {
  return appointments.filter(appointment => appointment.status !== "cancelled");
}

export function agendaPage<T>(appointments: T[], requestedPage: number) {
  const pages = Math.max(1, Math.ceil(appointments.length / AGENDA_PAGE_SIZE));
  const page = Math.max(1, Math.min(Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1, pages));
  const start = (page - 1) * AGENDA_PAGE_SIZE;
  return { page, pages, total: appointments.length, start: appointments.length ? start + 1 : 0,
    end: Math.min(start + AGENDA_PAGE_SIZE, appointments.length),
    appointments: appointments.slice(start, start + AGENDA_PAGE_SIZE) };
}

type DayHours = { open: string; close: string; active: boolean };
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type WeekHours = Partial<Record<DayKey, DayHours>>;

export type BusinessHours = WeekHours & {
  services?: Partial<Record<"vet" | "grooming", WeekHours>>;
};

const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function minutes(time: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function agendaGridRange(hours: BusinessHours | null, activeModules: string[]) {
  const weeks: WeekHours[] = hours ? [hours] : [];
  const veterinary = hours?.services?.vet;
  const grooming = hours?.services?.grooming;
  if (veterinary && activeModules.includes("veterinary")) weeks.push(veterinary);
  if (grooming && activeModules.includes("grooming")) weeks.push(grooming);

  const windows = weeks.flatMap(week => DAY_KEYS.flatMap(day => {
    const row = week[day];
    if (!row?.active) return [];
    const open = minutes(row.open);
    const close = minutes(row.close);
    return open < close ? [{ open, close }] : [];
  }));
  if (!windows.length) return { hourStart: 7, hourEnd: 20 };

  return {
    hourStart: Math.floor(Math.min(...windows.map(window => window.open)) / 60),
    hourEnd: Math.ceil(Math.max(...windows.map(window => window.close)) / 60),
  };
}
