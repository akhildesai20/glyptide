/** Quick Integration strip — shared by Home and Docs. */
import { INTEGRATE_SNIPPETS } from "./export";
import { copyWithIconFeedback, setIconLabel } from "./icons/controls";

export function mountIntegrate(root: ParentNode = document): void {
  const codeEl = root.querySelector<HTMLElement>("#integrateCode");
  const copyBtn = root.querySelector<HTMLButtonElement>("#copyIntegrate");
  const statusEl = root.querySelector<HTMLElement>("#copyIntegrateStatus");
  if (!codeEl || !copyBtn) return;

  let codeTab: keyof typeof INTEGRATE_SNIPPETS = "js";
  const render = (): void => {
    codeEl.textContent = INTEGRATE_SNIPPETS[codeTab];
  };

  root.querySelectorAll<HTMLButtonElement>("[data-code-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      codeTab = btn.dataset.codeTab as keyof typeof INTEGRATE_SNIPPETS;
      root.querySelectorAll("[data-code-tab]").forEach((b) =>
        b.setAttribute("aria-selected", String(b === btn)),
      );
      render();
    });
  });
  render();

  setIconLabel(copyBtn, "copy", "Copy");
  copyBtn.onclick = async () => {
    const ok = await copyWithIconFeedback(copyBtn, INTEGRATE_SNIPPETS[codeTab], {
      idleLabel: "Copy",
      successLabel: "Copied",
    });
    if (statusEl) {
      statusEl.textContent = ok ? "" : "Select and copy manually";
      if (ok) window.setTimeout(() => (statusEl.textContent = ""), 1600);
    }
  };
}

export function integrateSectionHtml(opts?: { headingId?: string }): string {
  const hid = opts?.headingId ?? "integrate-heading";
  return `<section class="integrate wrap" aria-labelledby="${hid}">
        <div class="integrate-copy">
          <h2 id="${hid}" class="section-kicker">Quick integration</h2>
          <p>
            Drop Glyptide into an existing surface. Pass text from your stream —
            no AI API required. Install with
            <code>npm install glyptide</code>.
          </p>
        </div>
        <div class="integrate-code" role="region" aria-label="Integration example">
          <div class="code-tabs" role="tablist" aria-label="Integration language">
            <button type="button" role="tab" aria-selected="true" data-code-tab="js">
              JavaScript
            </button>
            <button type="button" role="tab" aria-selected="false" data-code-tab="react">
              React
            </button>
            <button type="button" role="tab" aria-selected="false" data-code-tab="download">
              Download
            </button>
          </div>
          <pre class="code-block" id="integrateCode" tabindex="0"></pre>
          <button type="button" class="btn btn-secondary btn-sm" id="copyIntegrate">
            Copy
          </button>
          <span class="copy-status" id="copyIntegrateStatus" role="status"></span>
        </div>
      </section>`;
}
