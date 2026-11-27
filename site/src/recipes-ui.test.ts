import { describe, expect, it, vi } from "vitest";
import { mountRecipesSection } from "./recipes-ui";

describe("recipe tiles", () => {
  it("renders five accessible tiles and opens a stage", async () => {
    const section = document.createElement("section");
    section.id = "recipes";
    section.innerHTML = `
      <div id="recipeGrid"></div>
      <div id="recipeStage" hidden>
        <h3 id="recipeStageTitle"></h3>
        <a id="recipeSourceLink" href="#"></a>
        <button type="button" id="recipeReplay">Replay</button>
        <div id="recipeOutput"></div>
        <div id="recipeWaiting"></div>
      </div>
    `;
    document.body.append(section);

    // Avoid real timers from chat stream hanging the suite
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    mountRecipesSection(section);
    const tiles = section.querySelectorAll<HTMLButtonElement>(".recipe-tile");
    expect(tiles).toHaveLength(5);
    for (const tile of tiles) {
      expect(tile.getAttribute("aria-pressed")).toBe("false");
      expect(tile.querySelector("svg.g-icon")).toBeTruthy();
    }

    tiles[1].click();
    expect(tiles[1].getAttribute("aria-pressed")).toBe("true");
    const stage = section.querySelector("#recipeStage") as HTMLElement;
    expect(stage.hidden).toBe(false);
    expect(section.querySelector("#recipeStageTitle")?.textContent).toBe(
      "AI Editor",
    );

    section.remove();
  });
});
