import {
  codeDialogHtml,
  librarySectionHtml,
  playgroundLabHtml,
} from "../playground/chrome";
import { mountPlayground } from "../playground/mount";
import { bootPage } from "../shell";

bootPage("playground");

const play = document.getElementById("playground");
if (play) {
  play.innerHTML = playgroundLabHtml("full");
}

const libMount = document.getElementById("libraryMount");
if (libMount) {
  libMount.outerHTML = librarySectionHtml();
}

const dialogMount = document.getElementById("dialogMount");
if (dialogMount) {
  dialogMount.outerHTML = codeDialogHtml();
}

mountPlayground({
  mode: "full",
  playgroundPath: "/playground/",
  library: true,
});
