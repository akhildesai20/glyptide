/**
 * Reusable “Learn with AI” strip — landing (below hero) + docs (after Get started).
 */
import { createIcon } from "./icons";
import { copyWithIconFeedback, setIconLabel } from "./icons/controls";
import { buildLearnWithAiPrompt } from "./learn-with-ai-prompt";

const IDLE_LABEL = "Copy prompt for AI";
const SUCCESS_LABEL = "Prompt copied";
const FAIL_LABEL = "Copy failed — select text manually";

export function learnWithAiHtml(
  idSuffix = "",
  options: { wrap?: boolean } = {},
): string {
  const sid = idSuffix ? `-${idSuffix}` : "";
  const wrap = options.wrap === false ? "learn-ai" : "learn-ai wrap";
  return `
<section class="${wrap}" aria-labelledby="learn-ai-heading${sid}">
  <div class="learn-ai-card">
    <div class="learn-ai-icon" aria-hidden="true" data-learn-ai-icon></div>
    <div class="learn-ai-copy">
      <h2 id="learn-ai-heading${sid}" class="learn-ai-title">New to Glyptide?</h2>
      <p class="learn-ai-desc">
        Learn how to use Glyptide in your project with the help of your preferred AI
        assistant. No coding expertise required.
      </p>
      <p class="learn-ai-hint">
        Paste into ChatGPT, Claude, Gemini or your preferred AI assistant.
      </p>
    </div>
    <div class="learn-ai-actions">
      <button type="button" class="btn btn-primary learn-ai-cta" data-learn-ai-copy>
        ${IDLE_LABEL}
      </button>
      <p class="learn-ai-status" data-learn-ai-status aria-live="polite"></p>
    </div>
  </div>
</section>`;
}

/** Mount interactive copy behavior on a Learn with AI root (or document subtree). */
export function mountLearnWithAi(root: ParentNode = document): () => void {
  const cards = root.querySelectorAll<HTMLElement>(".learn-ai");
  const cleanups: Array<() => void> = [];

  cards.forEach((section) => {
    const iconHost = section.querySelector<HTMLElement>("[data-learn-ai-icon]");
    const btn = section.querySelector<HTMLButtonElement>("[data-learn-ai-copy]");
    const status = section.querySelector<HTMLElement>("[data-learn-ai-status]");
    if (!btn) return;

    if (iconHost && !iconHost.querySelector("svg")) {
      iconHost.append(createIcon("sparkles", { size: "xl" }));
    }
    setIconLabel(btn, "sparkles", IDLE_LABEL);

    const onClick = async () => {
      if (status) status.textContent = "";
      const prompt = buildLearnWithAiPrompt();
      const ok = await copyWithIconFeedback(btn, prompt, {
        idleIcon: "sparkles",
        idleLabel: IDLE_LABEL,
        successLabel: SUCCESS_LABEL,
        failLabel: FAIL_LABEL,
        holdMs: 2200,
      });
      if (ok) {
        if (iconHost) {
          iconHost.replaceChildren(
            createIcon("copied", { size: "xl", anim: "success" }),
          );
          window.setTimeout(() => {
            iconHost.replaceChildren(createIcon("sparkles", { size: "xl" }));
          }, 2200);
        }
        if (status) status.textContent = "";
      } else if (status) {
        status.textContent =
          "Couldn’t copy automatically. Open your clipboard settings or copy from For AI docs.";
      }
    };

    btn.addEventListener("click", onClick);
    cleanups.push(() => btn.removeEventListener("click", onClick));
  });

  return () => cleanups.forEach((fn) => fn());
}
