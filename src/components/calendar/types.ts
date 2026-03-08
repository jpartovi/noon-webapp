export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  calendarName: string;
  calendarColor: string;
  googleAccountEmail: string;
}

export interface PositionedEvent extends CalendarEvent {
  column: number;
  totalColumns: number;
}
