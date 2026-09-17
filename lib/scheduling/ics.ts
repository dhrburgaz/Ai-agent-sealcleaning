/**
 * Agent 16 — Calendar & Appointment Agent: ICS export/import (section 16/47).
 * Plain RFC 5545 text generation/parsing, no dependency needed — this is a
 * simple, well-specified text format, not something requiring a library or a
 * network call.
 */

export interface IcsEventInput {
  uid: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  description?: string;
  location?: string;
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  // RFC 5545 §3.1: lines longer than 75 octets should be folded with a
  // leading space on the continuation line.
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  parts.push(rest);
  return parts.join('\r\n');
}

export function buildIcsCalendar(events: IcsEventInput[], calendarName = 'Beyza Security'): string {
  const now = formatIcsDate(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Beyza Security//NL',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${event.uid}`));
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${formatIcsDate(event.startsAt)}`);
    lines.push(`DTEND:${formatIcsDate(event.endsAt)}`);
    lines.push(foldLine(`SUMMARY:${escapeIcsText(event.title)}`));
    if (event.description) lines.push(foldLine(`DESCRIPTION:${escapeIcsText(event.description)}`));
    if (event.location) lines.push(foldLine(`LOCATION:${escapeIcsText(event.location)}`));
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export interface ParsedIcsEvent {
  uid: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
}

function parseIcsDate(value: string): Date {
  // Handles the basic UTC form written by buildIcsCalendar (YYYYMMDDTHHMMSSZ)
  // and the floating form some external calendars export without a trailing Z.
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!match) throw new Error(`Geçersiz ICS tarih formatı: ${value}`);
  const [, y, mo, d, h, mi, s] = match;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)));
}

/** Minimal ICS import: reads UID/SUMMARY/DTSTART/DTEND from VEVENT blocks. */
export function parseIcsCalendar(icsText: string): ParsedIcsEvent[] {
  const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const eventBlocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const events: ParsedIcsEvent[] = [];

  for (const block of eventBlocks) {
    const body = block.split('END:VEVENT')[0] ?? '';
    const uidMatch = body.match(/UID:(.+)/);
    const summaryMatch = body.match(/SUMMARY:(.+)/);
    const startMatch = body.match(/DTSTART(?:;[^:]*)?:(\S+)/);
    const endMatch = body.match(/DTEND(?:;[^:]*)?:(\S+)/);
    if (!uidMatch || !startMatch || !endMatch) continue;
    events.push({
      uid: uidMatch[1]!.trim(),
      title: (summaryMatch?.[1] ?? '').trim(),
      startsAt: parseIcsDate(startMatch[1]!.trim()),
      endsAt: parseIcsDate(endMatch[1]!.trim()),
    });
  }
  return events;
}
