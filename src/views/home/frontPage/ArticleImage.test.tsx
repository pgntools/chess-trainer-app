import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { expectNoAxeViolations } from "../../../test/axe";
import { ArticleImage } from "./ArticleImage";

/*
  <ArticleImage> (CTA-137): an image in an article — a figure as wide as
  asked, its caption under it, its alt text what a screen reader says (none
  for a decorative one), opening full size where it links.
*/

describe("ArticleImage", () => {
  it("shows the image by its alt text, lazily, its caption under it", async () => {
    render(<ArticleImage src="/photo.png" alt="The final position" caption="White mates on h7" />);
    const image = screen.getByRole("img", { name: "The final position" });
    expect(image).toHaveAttribute("src", "/photo.png");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(screen.getByText("White mates on h7").tagName).toBe("FIGCAPTION");
    expect(screen.getByRole("figure")).toContainElement(image);
    await expectNoAxeViolations();
  });

  it("is said by no one when decorative — an empty alt", () => {
    render(<ArticleImage src="/flourish.png" alt="" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("article-image").querySelector("img")).toHaveAttribute("alt", "");
  });

  it("takes the width it is given, at the start of its line", () => {
    render(<ArticleImage src="/photo.png" alt="A board" width="60%" align="start" />);
    const figure = screen.getByTestId("article-image");
    expect(figure).toHaveStyle({ width: "60%", marginInlineStart: "0px" });
  });

  it("opens full size from a link named for the image", async () => {
    render(<ArticleImage src="/photo.png" alt="The final position" link />);
    const link = screen.getByRole("link", { name: "The final position — full size" });
    expect(link).toHaveAttribute("href", "/photo.png");
    expect(link).toHaveAttribute("target", "_blank");
    await expectNoAxeViolations();
  });
});
