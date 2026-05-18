import { z } from "zod";

// ---------------------------------------------------------------------------
// Action schemas
// ---------------------------------------------------------------------------

const WaitForLoadAction = z.object({
  type: z.literal("waitForLoad"),
});

const NavigateAction = z.object({
  type: z.literal("navigate"),
  url: z.string(),
});

const ClickAction = z.object({
  type: z.literal("click"),
  selector: z.string(),
});

const FillAction = z.object({
  type: z.literal("fill"),
  selector: z.string(),
  value: z.string(),
});

const TypeAction = z.object({
  type: z.literal("type"),
  selector: z.string(),
  value: z.string(),
});

const HoverAction = z.object({
  type: z.literal("hover"),
  selector: z.string(),
});

const ScrollAction = z.object({
  type: z.literal("scroll"),
  /** Absolute Y pixel position to scroll to (default 0). */
  y: z.number().optional(),
  /** Absolute X pixel position to scroll to (default 0). */
  x: z.number().optional(),
  /** Duration of the smooth scroll animation in milliseconds. */
  duration: z.number().optional(),
});

const WaitAction = z.object({
  type: z.literal("wait"),
  /** Milliseconds to pause. */
  ms: z.number(),
});

const PressAction = z.object({
  type: z.literal("press"),
  /** CSS selector of the element to focus before pressing the key. */
  selector: z.string().optional(),
  /** Key name, e.g. "Enter", "Tab", "Escape". */
  key: z.string(),
});

export const ActionSchema = z.discriminatedUnion("type", [
  WaitForLoadAction,
  NavigateAction,
  ClickAction,
  FillAction,
  TypeAction,
  HoverAction,
  ScrollAction,
  WaitAction,
  PressAction,
]);

export type Action = z.infer<typeof ActionSchema>;

// ---------------------------------------------------------------------------
// Journey step schema
// ---------------------------------------------------------------------------

export const JourneyStepSchema = z.object({
  /** Human-readable title shown in console output. */
  title: z.string(),
  /** Relative URL to navigate to at the start of this step (optional). */
  url: z.string().optional(),
  /** Caption text displayed in the rendered video. */
  caption: z.string().optional(),
  /** How long to linger after all actions complete, in milliseconds. */
  durationAfterActionsMs: z.number().optional().default(500),
  actions: z.array(ActionSchema).optional().default([]),
});

export type JourneyStep = z.infer<typeof JourneyStepSchema>;

// ---------------------------------------------------------------------------
// Top-level spec schema
// ---------------------------------------------------------------------------

export const DemoSpecSchema = z.object({
  projectName: z.string(),
  baseUrl: z.string().url(),
  outputName: z.string(),

  brand: z
    .object({
      logo: z.string().optional(),
      primaryColour: z.string().optional(),
      background: z.string().optional(),
    })
    .optional(),

  music: z
    .object({
      file: z.string(),
      startAt: z.number().optional().default(0),
      volume: z.number().min(0).max(1).optional().default(0.75),
      fadeOutSeconds: z.number().optional().default(4),
    })
    .optional(),

  landscape: z
    .object({
      enabled: z.boolean().optional().default(true),
      width: z.number().optional().default(1920),
      height: z.number().optional().default(1080),
    })
    .optional()
    .default({ enabled: true, width: 1920, height: 1080 }),

  reel: z
    .object({
      enabled: z.boolean().optional().default(true),
      width: z.number().optional().default(1080),
      height: z.number().optional().default(1920),
      safeArea: z
        .object({
          top: z.number(),
          bottom: z.number(),
          left: z.number(),
          right: z.number(),
        })
        .optional(),
    })
    .optional()
    .default({ enabled: true, width: 1080, height: 1920 }),

  journey: z.array(JourneyStepSchema).min(1),
});

export type DemoSpec = z.infer<typeof DemoSpecSchema>;

// ---------------------------------------------------------------------------
// Metadata written by capture-demo.ts and consumed by render-demo-video.mjs
// ---------------------------------------------------------------------------

export interface CaptionMarker {
  /** Caption text. */
  text: string;
  /** Start time in seconds within the raw video. */
  startSeconds: number;
  /** End time in seconds within the raw video. */
  endSeconds: number;
}

export interface VideoMetadata {
  outputName: string;
  mode: "landscape" | "reel";
  width: number;
  height: number;
  rawVideoPath: string;
  outputVideoPath: string;
  totalDurationSeconds: number;
  captions: CaptionMarker[];
  logoPath: string | null;
  music: {
    file: string;
    startAt: number;
    volume: number;
    fadeOutSeconds: number;
  } | null;
  brand: {
    primaryColour: string;
    background: string;
  } | null;
  reel: {
    safeArea: { top: number; bottom: number; left: number; right: number } | null;
  } | null;
}
