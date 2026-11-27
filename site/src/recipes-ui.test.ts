import { describe, expect, it, vi } from "vitest";
import { mountRecipesSection } from "./recipes-ui";

describe("recipe tiles", () => {
  it("renders five accessible tiles and opens a contextual stage", async () => {
    const section = document.createElement("section");
    section.id = "recipes";
    section.innerHTML = `
      <div id="recipeGrid"></div>
      <div id="recipeStage" hidden>
        <h3 id="recipeStageTitle"></h3>
        <a id="recipeSourceLink" href="#">View source</a>
        <button type="button" id="recipeReplay">Replay</button>
        <button type="button" id="recipeCopy">Copy implementation</button>
        <div id="recipeStageSurface"></div>
      </div>
    `;
    document.body.append(section);

    vi.spyOn(console, "error").mockImplementation(() => undefined);

    mountRecipesSection(section);
    const tiles = section.querySelectorAll<HTMLButtonElement>(".recipe-tile");
    expect(tiles).toHaveLength(5);
    expect(tiles[0].textContent).toContain("Chat");
    expect(tiles[0].textContent).not.toContain("AI Chat");
    expect(tiles[0].querySelector(".recipe-tile-arrow")).toBeNull();

    tiles[1].click();
    expect(tiles[1].getAttribute("aria-pressed")).toBe("true");
    const stage = section.querySelector("#recipeStage") as HTMLElement;
    expect(stage.hidden).toBe(false);
    expect(section.querySelector("#recipeStageTitle")?.textContent).toBe(
      "Editor",
    );
    expect(
      section.querySelector(".recipe-shell-editor, .recipe-editor"),
    ).toBeTruthy();
    expect(section.querySelector("#recipeSourceLink")?.textContent).toMatch(
      /View source/,
    );

    section.remove();
  });
});
