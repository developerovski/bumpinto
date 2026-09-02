import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WhoIsHere from "./WhoIsHere";

describe("WhoIsHere", () => {
  it("hazır sayısını ve hazır olanların adlarını gösterir", () => {
    render(<WhoIsHere participants={[
      { displayName: "Mehmet", host: true, hasLocation: true },
      { displayName: "Ayşe", host: false, hasLocation: true },
      { displayName: "Kerem", host: false, hasLocation: false },
    ]} />);
    expect(screen.getByText("2 / 3 hazır")).toBeInTheDocument();
    expect(screen.getByText(/Mehmet ve Ayşe hazır\./)).toBeInTheDocument();
  });
});
