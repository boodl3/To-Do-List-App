import { z } from 'zod';

/** Persisted document shape. contracts/app-document.schema.json is generated from this. */
export const CURRENT_SCHEMA_VERSION = 4;

/** Timer widget size bounds in px (width v2, height v3). Text keeps its size; layout reflows. */
export const WIDGET_WIDTH = { min: 200, max: 480 } as const;
export const WIDGET_HEIGHT = { min: 120, max: 640 } as const;

/** Longest stored note HTML (v4). */
export const NOTE_MAX_LENGTH = 100_000;

const Uuid = z.uuidv4();
const EstimateMin = z.int().min(1).max(5940).nullable();

export const PresetAccentSchema = z.enum(['orange', 'mint', 'pink', 'yellow', 'violet', 'sky']);
/** A palette name, or a custom opaque colour as lowercase `#rrggbb` (v2). */
export const AccentSchema = z.union([PresetAccentSchema, z.string().regex(/^#[0-9a-f]{6}$/)]);

export const SubtaskSchema = z.strictObject({
  id: Uuid,
  text: z.string().max(500),
  done: z.boolean(),
  estimateMin: EstimateMin,
});

export const TaskSchema = z.strictObject({
  id: Uuid,
  text: z.string().max(500),
  done: z.boolean(),
  estimateMin: EstimateMin,
  subtasks: z.array(SubtaskSchema),
});

export const SectionSchema = z.strictObject({
  id: Uuid,
  title: z.string().max(120),
  accent: AccentSchema,
  x: z.number(),
  y: z.number(),
  width: z.number().min(240),
  height: z.number().min(160),
  tasks: z.array(TaskSchema).max(500),
  createdAt: z.int().min(0),
  /** v4: present on notes, which hold sanitized rich-text HTML instead of tasks. */
  note: z.string().max(NOTE_MAX_LENGTH).optional(),
});

export const ConnectionSchema = z.strictObject({
  id: Uuid,
  from: Uuid,
  to: Uuid,
  style: z.enum(['arrow', 'line']),
  /** v3: `curved` is a bezier like the drag-to-connect preview. */
  shape: z.enum(['straight', 'curved']),
  label: z.string().max(40),
});

export const ViewportSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.25).max(2),
});

export const BoardSchema = z
  .strictObject({
    sections: z.array(SectionSchema).max(500),
    connections: z.array(ConnectionSchema),
    viewport: ViewportSchema,
  })
  .superRefine((board, ctx) => {
    const ids = new Set(board.sections.map((s) => s.id));
    board.connections.forEach((c, i) => {
      if (!ids.has(c.from) || !ids.has(c.to)) {
        ctx.addIssue({
          code: 'custom',
          path: ['connections', i],
          message: 'connection must reference existing sections',
        });
      }
    });
  });

export const TimerStatusSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('idle') }),
  z.strictObject({ kind: z.literal('running'), endsAt: z.int().min(0) }),
  z.strictObject({ kind: z.literal('paused'), remainingMs: z.int().min(0) }),
]);

export const PomodoroSettingsSchema = z.strictObject({
  focusMin: z.int().min(1).max(120),
  shortBreakMin: z.int().min(1).max(60),
  longBreakMin: z.int().min(1).max(90),
  longBreakEvery: z.int().min(2).max(10),
  sound: z.boolean(),
});

export const PomodoroStateSchema = z.strictObject({
  settings: PomodoroSettingsSchema,
  mode: z.enum(['focus', 'shortBreak', 'longBreak']),
  status: TimerStatusSchema,
  sessionId: Uuid.nullable(),
  focusStreak: z.int().min(0),
  completedToday: z.strictObject({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    count: z.int().min(0),
  }),
  linkedTaskId: Uuid.nullable(),
  widget: z.strictObject({
    x: z.number(),
    y: z.number(),
    width: z.number().min(WIDGET_WIDTH.min).max(WIDGET_WIDTH.max),
    height: z.number().min(WIDGET_HEIGHT.min).max(WIDGET_HEIGHT.max),
    visible: z.boolean(),
  }),
});

export const PreferencesSchema = z.strictObject({
  theme: z.enum(['system', 'light', 'dark']),
  pinned: z.boolean(),
});

export const AppDocumentSchema = z
  .strictObject({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    board: BoardSchema,
    pomodoro: PomodoroStateSchema,
    prefs: PreferencesSchema,
  })
  .meta({
    title: 'Focusboard AppDocument v4',
    description:
      'Persisted shape of focusboard.json. Generated from src/domain/schema.ts by src/domain/schema.test.ts — do not edit by hand.',
  });

export type PresetAccent = z.infer<typeof PresetAccentSchema>;
export type Accent = z.infer<typeof AccentSchema>;
export type Subtask = z.infer<typeof SubtaskSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type Viewport = z.infer<typeof ViewportSchema>;
export type Board = z.infer<typeof BoardSchema>;
export type TimerStatus = z.infer<typeof TimerStatusSchema>;
export type PomodoroSettings = z.infer<typeof PomodoroSettingsSchema>;
export type PomodoroMode = PomodoroState['mode'];
export type PomodoroState = z.infer<typeof PomodoroStateSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type AppDocument = z.infer<typeof AppDocumentSchema>;
