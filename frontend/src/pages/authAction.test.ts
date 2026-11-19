import { describe, expect, it } from "vitest";
import { parseActionParams } from "./AuthActionPage";

describe("parseActionParams", () => {
  it("lee un enlace normal", () => {
    expect(parseActionParams("https://x.web.app/auth/accion?mode=verifyEmail&oobCode=ABC123&apiKey=k&lang=es")).toEqual({
      mode: "verifyEmail",
      oobCode: "ABC123",
    });
  });
  it("tolera &amp; de clientes de correo", () => {
    expect(parseActionParams("https://x.web.app/auth/accion?apiKey=k&amp;mode=resetPassword&amp;oobCode=Z-9_x")).toEqual({
      mode: "resetPassword",
      oobCode: "Z-9_x",
    });
  });
  it("tolera el enlace envuelto (redirección codificada)", () => {
    const wrapped = "https://safe.link/?url=" + encodeURIComponent("https://x.web.app/auth/accion?mode=verifyEmail&oobCode=Q1");
    expect(parseActionParams(wrapped)).toEqual({ mode: "verifyEmail", oobCode: "Q1" });
  });
  it("devuelve null si falta el código", () => {
    expect(parseActionParams("https://x.web.app/auth/accion?mode=verifyEmail").oobCode).toBeNull();
  });
});
