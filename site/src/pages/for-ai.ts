import { bootPage } from "../shell";
import { copyWithIconFeedback, setIconLabel } from "../icons/controls";

bootPage("for-ai");

const btn = document.getElementById("copyLlms");
const status = document.getElementById("copyLlmsStatus");
if (btn) setIconLabel(btn, "copy", "Copy llms.txt");

btn?.addEventListener("click", async () => {
  try {
    const res = await fetch("/llms.txt");
    const text = await res.text();
    const ok = await copyWithIconFeedback(btn, text, {
      idleLabel: "Copy llms.txt",
      successLabel: "Copied",
    });
    if (status) status.textContent = ok ? "" : "Open llms.txt and copy manually";
  } catch {
    if (status) status.textContent = "Open llms.txt and copy manually";
  }
});
