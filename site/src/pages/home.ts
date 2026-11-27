import { patternCount } from "glyptide";
import { applyHomeCompatRedirects } from "../compat";
import { initHero } from "../hero";
import { copyWithIconFeedback, setIconLabel } from "../icons/controls";
import { integrateSectionHtml, mountIntegrate } from "../integrate";
import { learnWithAiHtml, mountLearnWithAi } from "../learn-with-ai";
import { $ } from "../dom";
import {
  playgroundLabHtml,
} from "../playground/chrome";
import { mountPlayground } from "../playground/mount";
import { mountRecipesSection } from "../recipes-ui";
import { bootPage } from "../shell";

if (!applyHomeCompatRedirects()) {
  bootPage("home");

  $("heroMeta").textContent =
    `${patternCount} patterns · 6 use cases · Open source`;
  const capPatterns = document.getElementById("heroCapPatterns");
  if (capPatterns) capPatterns.textContent = String(patternCount);

  const installCopy = document.getElementById("heroInstallCopy");
  const installCode = document.getElementById("heroInstallCode");
  if (installCopy instanceof HTMLButtonElement && installCode) {
    setIconLabel(installCopy, "copy", "Copy");
    installCopy.addEventListener("click", () => {
      void copyWithIconFeedback(installCopy, installCode.textContent?.trim() || "npm install glyptide", {
        idleLabel: "Copy",
        successLabel: "Copied",
      });
    });
  }

  initHero($("heroSentence"), $("heroPause"));

  const learnMount = document.getElementById("learnWithAiMount");
  if (learnMount) {
    learnMount.outerHTML = learnWithAiHtml("home");
    mountLearnWithAi(document);
  }

  mountRecipesSection($("recipes"));

  const play = $("playground");
  play.innerHTML = playgroundLabHtml("simple");
  play.classList.add("playground-section", "playground-section--simple", "wrap");

  const integrateHost = $("integrateMount");
  integrateHost.outerHTML = integrateSectionHtml();
  mountIntegrate(document);

  mountPlayground({
    mode: "simple",
    playgroundPath: "/playground/",
    library: false,
  });
}
