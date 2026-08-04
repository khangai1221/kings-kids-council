import { describe, expect, it } from "vitest";
import { isEmailInAllowedDomain } from "@/lib/auth/domain";

describe("isEmailInAllowedDomain", () => {
  it("accepts an email in the allowed domain", () => {
    expect(isEmailInAllowedDomain("student@kingskids.mn", "kingskids.mn")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isEmailInAllowedDomain("Student@KingsKids.MN", "kingskids.mn")).toBe(true);
  });

  it("rejects a different domain", () => {
    expect(isEmailInAllowedDomain("student@gmail.com", "kingskids.mn")).toBe(false);
  });

  it("rejects a domain that merely ends with the allowed domain as a substring", () => {
    expect(isEmailInAllowedDomain("student@notkingskids.mn", "kingskids.mn")).toBe(false);
  });

  it("handles an allowed domain passed with a leading @", () => {
    expect(isEmailInAllowedDomain("student@kingskids.mn", "@kingskids.mn")).toBe(true);
  });

  it("rejects empty input", () => {
    expect(isEmailInAllowedDomain("", "kingskids.mn")).toBe(false);
    expect(isEmailInAllowedDomain("student@kingskids.mn", "")).toBe(false);
  });
});
