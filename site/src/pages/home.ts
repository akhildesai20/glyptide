import { patternCount } from "glyptide";
import { applyHomeCompatRedirects } from "../compat";
import { initHero } from "../hero";
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
