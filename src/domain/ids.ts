// ponytail: plain aliases document intent; brand them if ids ever get mixed up in practice.
export type SectionId = string;
export type TaskId = string;
export type ConnectionId = string;
export type SessionId = string;

/** Only the state layer calls this; domain functions receive ids as arguments. */
export const newId = (): string => crypto.randomUUID();
