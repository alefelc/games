import { describe, expect, it, vi } from "vitest";
import { clearCoupleCodeFromLocation, readCoupleCodeFromLocation } from "../auth/couple-link";

describe("private couple links", () => {
  it("prefers the URL fragment and supports legacy query links", () => {
    expect(readCoupleCodeFromLocation({ search: "?couple_code=legacy", hash: "#couple_code=private" } as Location)).toBe("private");
    expect(readCoupleCodeFromLocation({ search: "?couple_code=legacy", hash: "" } as Location)).toBe("legacy");
  });

  it("removes the code from query and fragment without removing other values", () => {
    const replaceState = vi.fn();
    clearCoupleCodeFromLocation(
      { href: "https://teanimas.com/play?auth=login&couple_code=old#couple_code=new&screen=profile" } as Location,
      { replaceState } as unknown as History,
    );
    expect(replaceState).toHaveBeenCalledWith({}, "", "/play?auth=login#screen=profile");
  });
});
