import {
  PALETTE_PRESETS,
  PRESET_CATEGORIES,
  appearanceCapabilities,
  classifyContrast,
  colorModeLabel,
  colorNeedsForEffect,
  contrastRatioHex,
  effectUsesAnyColor,
  fixContrastInk,
  getPresetOrDefault,
  normalizeHex,
  palettePreviewGradient,
  treatmentLabel,
  worstGradientContrast,
  type AppearanceColorMode,
  type AppearanceTreatment,
  type CaseId,
  type Effect,
  type GenerationPalette,
  type GradientMotion,
  type ThemeMode,
} from "glyptide";
import {
  activePalette,
  appearanceConfigFromState,
  loadAppearance,
  previewCss,
  resetToDefaults,
  resetToPreset,
  resetToken,
  saveAppearance,
  selectPreset,
  setToken,
  syncAppearanceForPattern,
  themeAwarePalette,
  type AppearanceState,
  resolvedThemeMode,
} from "./appearance";

export type AppearanceChangeHandler = (
  state: AppearanceState,
  theme: ThemeMode,
) => void;

interface PanelOptions {
  root: HTMLElement;
  getEffect: () => Effect;
  getCaseId: () => CaseId;
  getPatternName: () => string;
  onChange: AppearanceChangeHandler;
}

const TOKEN_META: {
  key: keyof GenerationPalette;
  label: string;
  need: keyof ReturnType<typeof colorNeedsForEffect>;
}[] = [
  { key: "ink", label: "Text ink", need: "ink" },
  { key: "highlight", label: "Highlight", need: "highlight" },
  { key: "gradientMiddle", label: "Gradient middle", need: "gradientMiddle" },
  { key: "gradientEnd", label: "Gradient end", need: "gradientEnd" },
];

export function mountAppearancePanel(options: PanelOptions): {
  getState: () => AppearanceState;
  setState: (next: AppearanceState) => void;
  syncTheme: () => void;
  syncEffect: () => void;
  applyInitial: () => void;
} {
  let state = loadAppearance();
  let editTheme: ThemeMode = resolvedThemeMode();
  let popoverOpen = false;

  const root = options.root;
  root.innerHTML = `
    <div class="appearance-panel">
      <div class="appearance-row" id="colorModeRow">
        <span class="appearance-label" id="colorModeLabel">Color mode</span>
        <div class="segmented" id="colorModeSeg" role="group" aria-labelledby="colorModeLabel"></div>
      </div>

      <div class="appearance-row" id="treatmentRow" hidden>
        <span class="appearance-label" id="treatmentLabel">Treatment</span>
        <div class="segmented segmented-wrap" id="treatmentSeg" role="group" aria-labelledby="treatmentLabel"></div>
        <p class="hint" id="treatmentNote" hidden></p>
      </div>

      <div class="appearance-row" id="intensityRow" hidden>
        <label class="appearance-label" for="intensity">
          Effect intensity <span class="muted" id="intensityValue"></span>
        </label>
        <input type="range" id="intensity" min="0" max="100" value="100" />
      </div>

      <div class="appearance-row" id="gradientDirRow" hidden>
        <label class="appearance-label" for="gradientDir">
          Gradient direction <span class="muted" id="gradientDirValue"></span>
        </label>
        <input type="range" id="gradientDir" min="0" max="360" value="110" />
      </div>

      <div class="appearance-row" id="gradientMotionRow" hidden>
        <span class="appearance-label" id="gradMotionLabel">Gradient motion</span>
        <div class="segmented" id="gradientMotionSeg" role="group" aria-labelledby="gradMotionLabel"></div>
      </div>

      <div class="appearance-row" id="paletteRow">
        <span class="appearance-label">Color preset</span>
        <button type="button" class="preset-trigger" id="presetTrigger" aria-haspopup="dialog" aria-expanded="false">
          <span class="preset-swatch" id="presetSwatch" aria-hidden="true"></span>
          <span class="preset-trigger-text">
            <span class="preset-name" id="presetName">Graphite</span>
            <span class="preset-mode" id="presetModeLabel"></span>
          </span>
          <span class="preset-caret" aria-hidden="true">▾</span>
        </button>
      </div>

      <div class="preset-popover" id="presetPopover" hidden role="dialog" aria-label="Color presets">
        <div class="preset-popover-head">
          <span>Presets</span>
          <div class="preset-theme-edit" role="group" aria-label="Edit palette for theme">
            <button type="button" data-edit-theme="light" class="btn btn-ghost btn-sm">Light</button>
            <button type="button" data-edit-theme="dark" class="btn btn-ghost btn-sm">Dark</button>
          </div>
        </div>
        <div class="preset-list" id="presetList"></div>
        <div class="preset-popover-foot">
          <button type="button" class="btn btn-ghost btn-sm" id="presetCustomBtn">Custom</button>
          <button type="button" class="btn btn-ghost btn-sm" id="presetResetBtn">Reset palette</button>
        </div>
      </div>

      <div class="token-grid" id="tokenGrid"></div>
      <div class="contrast-row" id="contrastRow" hidden>
        <span id="contrastText"></span>
        <button type="button" class="btn btn-ghost btn-sm" id="fixContrast" hidden>Fix contrast</button>
      </div>
    </div>
  `;

  const trigger = root.querySelector("#presetTrigger") as HTMLButtonElement;
  const popover = root.querySelector("#presetPopover") as HTMLElement;
  const list = root.querySelector("#presetList") as HTMLElement;
  const swatch = root.querySelector("#presetSwatch") as HTMLElement;
  const nameEl = root.querySelector("#presetName") as HTMLElement;
  const modeLabel = root.querySelector("#presetModeLabel") as HTMLElement;
  const tokenGrid = root.querySelector("#tokenGrid") as HTMLElement;
  const contrastRow = root.querySelector("#contrastRow") as HTMLElement;
  const contrastText = root.querySelector("#contrastText") as HTMLElement;
  const fixBtn = root.querySelector("#fixContrast") as HTMLButtonElement;
  const colorModeSeg = root.querySelector("#colorModeSeg") as HTMLElement;
  const treatmentRow = root.querySelector("#treatmentRow") as HTMLElement;
  const treatmentSeg = root.querySelector("#treatmentSeg") as HTMLElement;
  const treatmentNote = root.querySelector("#treatmentNote") as HTMLElement;
  const intensityRow = root.querySelector("#intensityRow") as HTMLElement;
  const intensityInput = root.querySelector("#intensity") as HTMLInputElement;
  const intensityValue = root.querySelector("#intensityValue") as HTMLElement;
  const gradientDirRow = root.querySelector("#gradientDirRow") as HTMLElement;
  const gradientDir = root.querySelector("#gradientDir") as HTMLInputElement;
  const gradientDirValue = root.querySelector("#gradientDirValue") as HTMLElement;
  const gradientMotionRow = root.querySelector("#gradientMotionRow") as HTMLElement;
  const gradientMotionSeg = root.querySelector("#gradientMotionSeg") as HTMLElement;
  const paletteRow = root.querySelector("#paletteRow") as HTMLElement;

  function siteTheme(): ThemeMode {
    return resolvedThemeMode();
  }

  function caps() {
    return appearanceCapabilities(
      options.getEffect(),
      options.getCaseId(),
      options.getPatternName(),
    );
  }

  function appearanceCfg() {
    return appearanceConfigFromState(state);
  }

  function emit(): void {
    saveAppearance(state);
    options.onChange(state, siteTheme());
  }

  function closePopover(restoreFocus = true): void {
    popoverOpen = false;
    popover.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  }

  function openPopover(): void {
    popoverOpen = true;
    popover.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    editTheme = siteTheme();
    renderPopover();
    positionPopover();
    const selected = popover.querySelector(
      '[aria-selected="true"]',
    ) as HTMLElement | null;
    (selected || popover.querySelector("button.preset-item"))?.focus();
  }

  function positionPopover(): void {
    popover.style.top = "";
    popover.style.bottom = "";
    popover.style.left = "0";
    popover.style.right = "0";
    const rect = trigger.getBoundingClientRect();
    const popH = popover.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < popH + 12 && rect.top > popH + 12) {
      popover.style.top = "auto";
      popover.style.bottom = "calc(100% + 6px)";
    } else {
      popover.style.top = "calc(100% + 6px)";
      popover.style.bottom = "auto";
    }
  }

  function renderSegmented<T extends string>(
    container: HTMLElement,
    items: { value: T; label: string }[],
    selected: T,
    onPick: (v: T) => void,
  ): void {
    container.replaceChildren(
      ...items.map(({ value, label }) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "segmented-btn";
        btn.textContent = label;
        btn.setAttribute("aria-pressed", String(value === selected));
        btn.onclick = () => onPick(value);
        return btn;
      }),
    );
  }

  function renderModeControls(): void {
    const c = caps();
    let mode = state.colorMode;
    if (!c.colorModes.includes(mode)) {
      mode = c.colorModes[0] ?? "default";
      if (mode !== state.colorMode) state = { ...state, colorMode: mode };
    }
    if (!c.treatments.includes(state.treatment)) {
      state = { ...state, treatment: c.defaultTreatment };
    }

    renderSegmented(
      colorModeSeg,
      c.colorModes.map((m) => ({ value: m, label: colorModeLabel(m) })),
      state.colorMode,
      (v: AppearanceColorMode) => {
        state = { ...state, colorMode: v };
        renderAll();
        emit();
      },
    );

    const showTreatment = state.colorMode === "solid" || state.colorMode === "gradient";
    treatmentRow.hidden = !showTreatment;
    if (showTreatment) {
      renderSegmented(
        treatmentSeg,
        c.treatments.map((t) => ({ value: t, label: treatmentLabel(t) })),
        state.treatment,
        (v: AppearanceTreatment) => {
          state = { ...state, treatment: v };
          renderAll();
          emit();
        },
      );
      const omitted = (
        ["ink", "highlight", "underline", "glow"] as AppearanceTreatment[]
      ).filter((t) => !c.treatments.includes(t));
      if (omitted.length && (c.preservesSemanticColors || c.preservesSyntaxHighlight)) {
        treatmentNote.hidden = false;
        treatmentNote.textContent = c.preservesSyntaxHighlight
          ? "Highlight and glow are unavailable here to preserve syntax colors."
          : "Only ink is available so semantic insertion and deletion colors stay intact.";
      } else {
        treatmentNote.hidden = true;
        treatmentNote.textContent = "";
      }
    }

    const showIntensity =
      showTreatment &&
      (state.treatment === "highlight" || state.treatment === "glow");
    intensityRow.hidden = !showIntensity;
    intensityInput.value = String(Math.round(state.intensity * 100));
    intensityValue.textContent = `${Math.round(state.intensity * 100)}%`;

    const showGradientExtras = state.colorMode === "gradient";
    gradientDirRow.hidden = !showGradientExtras;
    gradientDir.value = String(state.gradientDirection);
    gradientDirValue.textContent = `${state.gradientDirection}°`;

    gradientMotionRow.hidden = !(showGradientExtras && c.allowsGradientMotion);
    if (showGradientExtras && c.allowsGradientMotion) {
      renderSegmented(
        gradientMotionSeg,
        [
          { value: "animated" as GradientMotion, label: "Animated" },
          { value: "static" as GradientMotion, label: "Static" },
        ],
        state.gradientMotion,
        (v: GradientMotion) => {
          state = { ...state, gradientMotion: v };
          renderAll();
          emit();
        },
      );
    }

    const needsColor = effectUsesAnyColor(options.getEffect(), appearanceCfg());
    paletteRow.hidden = !needsColor && state.colorMode === "default";
  }

  function renderPopover(): void {
    list.replaceChildren();
    for (const cat of PRESET_CATEGORIES) {
      const heading = document.createElement("div");
      heading.className = "preset-cat";
      heading.textContent = cat.label;
      list.append(heading);
      for (const preset of PALETTE_PRESETS.filter((p) => p.category === cat.id)) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "preset-item";
        btn.setAttribute(
          "aria-selected",
          String(
            state.paletteMode === "preset" && state.presetId === preset.id,
          ),
        );
        const pal = preset[editTheme];
        btn.innerHTML = `
          <span class="preset-item-swatch" style="background:${palettePreviewGradient(pal)}"></span>
          <span class="preset-item-name">${preset.name}</span>
          <span class="preset-check" aria-hidden="true">✓</span>
        `;
        btn.onclick = () => {
          state = selectPreset(state, preset.id);
          closePopover();
          renderAll();
          emit();
        };
        list.append(btn);
      }
    }

    root.querySelectorAll<HTMLButtonElement>("[data-edit-theme]").forEach((b) => {
      const t = b.dataset.editTheme as ThemeMode;
      b.setAttribute("aria-pressed", String(t === editTheme));
      b.onclick = () => {
        editTheme = t;
        renderPopover();
        renderTokens();
        renderContrast();
      };
    });
  }

  function renderTrigger(): void {
    const theme = siteTheme();
    swatch.style.background = previewCss(state, theme);
    const preset = getPresetOrDefault(state.presetId);
    nameEl.textContent =
      state.paletteMode === "custom" ? `Custom · ${preset.name}` : preset.name;
    modeLabel.textContent = theme === "dark" ? "Dark" : "Light";
  }

  function renderTokens(): void {
    const needs = colorNeedsForEffect(options.getEffect(), appearanceCfg());
    const theme = editTheme;
    const pal = activePalette(state, theme);
    const origin = getPresetOrDefault(state.presetId)[theme];
    tokenGrid.replaceChildren();

    let any = false;
    for (const meta of TOKEN_META) {
      if (!needs[meta.need]) continue;
      any = true;
      const row = document.createElement("div");
      row.className = "token-row";
      const dirty = pal[meta.key] !== origin[meta.key];
      row.innerHTML = `
        <label class="token-label">
          <span>${meta.label}</span>
          <span class="token-inputs">
            <input type="color" data-token="${meta.key}" value="${pal[meta.key]}" aria-label="${meta.label} picker" />
            <input type="text" class="token-hex" data-hex="${meta.key}" value="${pal[meta.key]}" maxlength="7" spellcheck="false" aria-label="${meta.label} hex" />
            <button type="button" class="btn btn-ghost btn-sm token-reset" data-reset="${meta.key}" ${dirty ? "" : "hidden"} title="Reset token">Reset</button>
          </span>
        </label>
      `;
      tokenGrid.append(row);
    }

    tokenGrid.hidden = !any;

    tokenGrid.querySelectorAll<HTMLInputElement>("input[type=color]").forEach((input) => {
      input.oninput = () => {
        const key = input.dataset.token as keyof GenerationPalette;
        state = setToken(state, editTheme, key, input.value);
        renderAll();
        emit();
      };
    });

    tokenGrid.querySelectorAll<HTMLInputElement>("input.token-hex").forEach((input) => {
      input.onchange = () => {
        const key = input.dataset.hex as keyof GenerationPalette;
        const hex = normalizeHex(input.value);
        if (!hex) {
          input.value = activePalette(state, editTheme)[key];
          return;
        }
        state = setToken(state, editTheme, key, hex);
        renderAll();
        emit();
      };
    });

    tokenGrid.querySelectorAll<HTMLButtonElement>("[data-reset]").forEach((btn) => {
      btn.onclick = () => {
        const key = btn.dataset.reset as keyof GenerationPalette;
        state = resetToken(state, editTheme, key);
        renderAll();
        emit();
      };
    });
  }

  function surfaceBg(theme: ThemeMode): string {
    return theme === "dark" ? "#111111" : "#FFFFFF";
  }

  function renderContrast(): void {
    const needs = colorNeedsForEffect(options.getEffect(), appearanceCfg());
    if (!needs.ink && !needs.gradientMiddle) {
      contrastRow.hidden = true;
      return;
    }
    const theme = editTheme;
    const pal = activePalette(state, theme);
    const bg = surfaceBg(theme);

    let ratio: number | null = null;
    let label = "";

    if (needs.gradientMiddle || needs.gradientEnd) {
      const worst = worstGradientContrast(
        [pal.ink, pal.gradientMiddle, pal.gradientEnd],
        bg,
      );
      if (worst) {
        ratio = worst.ratio;
        label = `Gradient contrast: ${worst.ratio.toFixed(1)}:1`;
      }
    } else if (needs.ink) {
      ratio = contrastRatioHex(pal.ink, bg);
      if (ratio != null) label = `Ink contrast: ${ratio.toFixed(1)}:1`;
    }

    if (ratio == null) {
      contrastRow.hidden = true;
      return;
    }

    const level = classifyContrast(ratio);
    contrastRow.hidden = false;
    contrastRow.dataset.level = level;
    const status =
      level === "fail"
        ? "Low contrast"
        : level === "aa-large"
          ? "AA large text"
          : level === "aaa"
            ? "Meets AAA"
            : "Meets AA";
    contrastText.textContent = `${label} · ${status}`;
    fixBtn.hidden = level !== "fail" && level !== "aa-large";
  }

  function renderAll(): void {
    renderModeControls();
    renderTrigger();
    if (popoverOpen) renderPopover();
    renderTokens();
    renderContrast();
  }

  intensityInput.oninput = () => {
    state = {
      ...state,
      intensity: Math.max(0, Math.min(1, +intensityInput.value / 100)),
    };
    intensityValue.textContent = `${Math.round(state.intensity * 100)}%`;
    emit();
  };

  gradientDir.oninput = () => {
    state = { ...state, gradientDirection: +gradientDir.value };
    gradientDirValue.textContent = `${state.gradientDirection}°`;
    emit();
  };

  trigger.onclick = () => {
    if (popoverOpen) closePopover();
    else openPopover();
  };

  (root.querySelector("#presetCustomBtn") as HTMLButtonElement).onclick = () => {
    const pal = activePalette(state, editTheme);
    state = {
      ...state,
      paletteMode: "custom",
      custom: { ...state.custom, [editTheme]: { ...pal } },
    };
    closePopover();
    renderAll();
    emit();
  };

  (root.querySelector("#presetResetBtn") as HTMLButtonElement).onclick = () => {
    state = resetToPreset(state);
    closePopover();
    renderAll();
    emit();
  };

  fixBtn.onclick = () => {
    const theme = editTheme;
    const pal = activePalette(state, theme);
    const fixed = fixContrastInk(pal.ink, surfaceBg(theme), 4.5);
    if (fixed) {
      state = setToken(state, theme, "ink", fixed);
      renderAll();
      emit();
    }
  };

  document.addEventListener("keydown", (e) => {
    if (!popoverOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closePopover();
    }
  });

  document.addEventListener("pointerdown", (e) => {
    if (!popoverOpen) return;
    if (!root.contains(e.target as Node)) closePopover(false);
  });

  return {
    getState: () => state,
    setState: (next) => {
      state = next;
      saveAppearance(state);
      renderAll();
      emit();
    },
    syncTheme: () => {
      editTheme = siteTheme();
      renderAll();
      emit();
    },
    syncEffect: () => {
      state = syncAppearanceForPattern(
        state,
        options.getEffect(),
        options.getCaseId(),
        options.getPatternName(),
      );
      saveAppearance(state);
      renderAll();
      // Appearance panel stays visible — progressive disclosure handles relevance
      (root.closest("#colorDetails") as HTMLElement | null)?.removeAttribute(
        "hidden",
      );
      root.hidden = false;
    },
    applyInitial: () => {
      renderAll();
      emit();
    },
  };
}

export function appearanceToConfig(state: AppearanceState) {
  return {
    preset: state.presetId,
    palette: themeAwarePalette(state),
    theme: "inherit" as const,
    appearance: appearanceConfigFromState(state),
  };
}

export { resetToDefaults as resetAppearanceDefaults };
