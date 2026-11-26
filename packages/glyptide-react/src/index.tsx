import {
  createGlyptide,
  type AppearanceConfig,
  type CreateGlyptideOptions,
  type EngineState,
  type GlyptideEvent,
  type GlyptideEventHandler,
  type GlyptideInstance,
  type GenerationColors,
  type MotionConfig,
  type ThemeAwarePalette,
  type ThemePreference,
} from "glyptide";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
} from "react";

export interface GlyptideProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  pattern?: string;
  text?: string;
  source?: string;
  speed?: number;
  latency?: number;
  reduce?: boolean;
  colors?: GenerationColors | null;
  preset?: string | null;
  palette?: ThemeAwarePalette | null;
  theme?: ThemePreference;
  appearance?: AppearanceConfig | null;
  motion?: MotionConfig | null;
  autoPlay?: boolean;
  signal?: AbortSignal;
  onStatus?: (state: EngineState) => void;
  onEvent?: GlyptideEventHandler;
}

export interface GlyptideHandle {
  instance: GlyptideInstance | null;
  start: (text?: string) => void;
  beginStream: () => number;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  accept: () => void;
  reject: () => void;
  append: (chunk: string, session?: number) => void;
  applySnapshot: (fullText: string, session?: number) => void;
  finish: (session?: number) => void;
  setAppearance: GlyptideInstance["setAppearance"];
  on: (event: GlyptideEvent | "*", handler: GlyptideEventHandler) => () => void;
  readonly state: EngineState | null;
  readonly rendered: string;
  readonly session: number;
}

/**
 * React wrapper around createGlyptide.
 * Import `glyptide/styles.css` once in your app.
 *
 * Strict Mode safe: effect cleanup destroys the instance; a dedicated waiting
 * element is owned by this component (never shared via parent queries).
 */
export const Glyptide = forwardRef<GlyptideHandle, GlyptideProps>(
  function Glyptide(
    {
      pattern,
      text,
      source,
      speed,
      latency,
      reduce,
      colors,
      preset,
      palette,
      theme,
      appearance,
      motion,
      autoPlay = false,
      signal,
      onStatus,
      onEvent,
      className,
      ...rest
    },
    ref,
  ) {
    const outRef = useRef<HTMLDivElement>(null);
    const waitRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<GlyptideInstance | null>(null);
    const propsRef = useRef({
      text,
      source,
      appearance,
      speed,
      latency,
      motion,
      onStatus,
      onEvent,
    });
    propsRef.current = {
      text,
      source,
      appearance,
      speed,
      latency,
      motion,
      onStatus,
      onEvent,
    };

    useEffect(() => {
      if (!outRef.current || !waitRef.current) return;

      const opts: CreateGlyptideOptions = {
        element: outRef.current,
        waiting: waitRef.current,
        pattern,
        speed,
        latency,
        reduce,
        colors,
        preset,
        palette,
        theme,
        motion,
        signal,
        onStatus: (s) => propsRef.current.onStatus?.(s),
        onEvent: (e, d) => propsRef.current.onEvent?.(e, d),
        config: {
          source,
          text,
          appearance: appearance ?? undefined,
          motion: motion ?? undefined,
        },
      };

      const instance = createGlyptide(opts);
      instanceRef.current = instance;

      if (autoPlay && text) {
        instance.start({
          text,
          source,
          appearance: appearance ?? undefined,
          motion: motion ?? undefined,
        });
      }

      return () => {
        instance.destroy();
        instanceRef.current = null;
      };
      // Re-create when pattern / signal identity changes; other props update hot
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pattern, signal]);

    useEffect(() => {
      instanceRef.current?.setAppearance({
        preset,
        palette,
        theme,
        colors,
        appearance: appearance ?? null,
        motion: motion ?? null,
      });
    }, [preset, palette, theme, colors, appearance, motion]);

    useImperativeHandle(ref, () => ({
      get instance() {
        return instanceRef.current;
      },
      start(nextText) {
        const p = propsRef.current;
        instanceRef.current?.start({
          text: nextText ?? p.text ?? "",
          source: p.source,
          appearance: p.appearance ?? undefined,
          motion: p.motion ?? undefined,
        });
      },
      beginStream: () => instanceRef.current?.beginStream() ?? 0,
      stop: () => instanceRef.current?.stop(),
      pause: () => instanceRef.current?.pause(),
      resume: () => instanceRef.current?.resume(),
      reset: () => {
        const p = propsRef.current;
        instanceRef.current?.reset({
          text: p.text ?? "",
          source: p.source,
          appearance: p.appearance ?? undefined,
          motion: p.motion ?? undefined,
        });
      },
      accept: () => instanceRef.current?.accept(),
      reject: () => instanceRef.current?.reject(),
      append: (chunk, session) => instanceRef.current?.append(chunk, session),
      applySnapshot: (full, session) =>
        instanceRef.current?.applySnapshot(full, session),
      finish: (session) => instanceRef.current?.finish(session),
      setAppearance: (opts) => instanceRef.current?.setAppearance(opts),
      on: (event, handler) =>
        instanceRef.current?.on(event, handler) ?? (() => {}),
      get state() {
        return instanceRef.current?.state ?? null;
      },
      get rendered() {
        return instanceRef.current?.rendered ?? "";
      },
      get session() {
        return instanceRef.current?.session ?? 0;
      },
    }));

    return (
      <div className={className} {...rest}>
        <div ref={outRef} className="glyptide-document" />
        <div ref={waitRef} className="glyptide-waiting" aria-hidden="true" />
      </div>
    );
  },
);

export { createGlyptide } from "glyptide";
export type {
  AppearanceConfig,
  EngineState,
  GlyptideEvent,
  GlyptideEventHandler,
  GlyptideInstance,
  GenerationColors,
  ThemePreference,
};
