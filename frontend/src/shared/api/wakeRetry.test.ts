import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiConnectionError, ApiError, isTransient, withWakeRetry } from "./client";

afterEach(() => vi.useRealTimers());

describe("withWakeRetry", () => {
  it("reintenta mientras el servidor despierta y devuelve el resultado", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const onWaiting = vi.fn();
    const p = withWakeRetry(async () => {
      calls += 1;
      if (calls < 3) throw new ApiError("Bad Gateway", 502);
      return "ok";
    }, onWaiting);
    await vi.runAllTimersAsync();
    await expect(p).resolves.toBe("ok");
    expect(calls).toBe(3);
    expect(onWaiting).toHaveBeenCalledTimes(2);
  });

  it("no reintenta errores definitivos (401, 409)", async () => {
    const fn = vi.fn(async () => {
      throw new ApiError("Token inválido", 401);
    });
    await expect(withWakeRetry(fn)).rejects.toThrow("Token inválido");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("clasifica errores pasajeros", () => {
    expect(isTransient(new ApiConnectionError("sin red"))).toBe(true);
    expect(isTransient(new ApiError("x", 503))).toBe(true);
    expect(isTransient(new ApiError("x", 409))).toBe(false);
    expect(isTransient(new Error("x"))).toBe(false);
  });
});
