import {
  createGlyptide,
  type AppearanceConfig,
  type CreateGlyptideOptions,
  type EngineState,
  type GlyptideInstance,
  type GenerationColors,
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
  autoPlay?: boolean;
  onStatus?: (state: EngineState) => void;
}

export interface GlyptideHandle {
  instance: GlyptideInstance | null;
  start: (text?: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  accept: () => void;
  reject: () => void;
  append: (chunk: string) => void;
  finish: () => void;
}

/**
 * React wrapper around createGlyptide.
 * Import `glyptide/styles.css` once in your app.
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
      autoPlay = false,
      onStatus,
      className,
      ...rest
    },
    ref,
  ) {
    const outRef = useRef<HTMLDivElement>(null);
    const waitRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<GlyptideInstance | null>(null);

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
        onStatus,
        config: {
          source,
          text,
          appearance: appearance ?? undefined,
        },
      };

      const instance = createGlyptide(opts);
      instanceRef.current = instance;

      if (autoPlay && text) {
        instance.start({ text, source, appearance: appearance ?? undefined });
      }

      return () => {
        instance.destroy();
        instanceRef.current = null;
      };
      // Re-create when pattern identity changes; appearance updates via setAppearance
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pattern]);

    useEffect(() => {
      instanceRef.current?.setAppearance({
        preset,
        palette,
        theme,
        colors,
        appearance: appearance ?? null,
      });
    }, [preset, palette, theme, colors, appearance]);

    useImperativeHandle(ref, () => ({
      get instance() {
        return instanceRef.current;
      },
      start(nextText) {
        instanceRef.current?.start({
          text: nextText ?? text ?? "",
          source,
          appearance: appearance ?? undefined,
        });
      },
      stop: () => instanceRef.current?.stop(),
      pause: () => instanceRef.current?.pause(),
      resume: () => instanceRef.current?.resume(),
      accept: () => instanceRef.current?.accept(),
      reject: () => instanceRef.current?.reject(),
      append: (chunk) => instanceRef.current?.append(chunk),
      finish: () => instanceRef.current?.finish(),
    }));

    return (
      <div className={className} {...rest}>
        <div ref={outRef} className="document glyptide-document" />
        <div ref={waitRef} className="waiting glyptide-waiting" />
      </div>
    );
  },
);

export { createGlyptide } from "glyptide";
export type {
  AppearanceConfig,
  EngineState,
  GenerationColors,
  GlyptideInstance,
  ThemeAwarePalette,
};
