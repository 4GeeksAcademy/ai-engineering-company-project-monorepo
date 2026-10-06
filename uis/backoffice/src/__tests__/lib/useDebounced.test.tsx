// The "wait until the user stops typing" hook (`lib/useDebounced.ts`), used by the incident list's search box. Fake timers
// stand in for the clock, so nothing here waits.
//
// Layout shared by every frontend test file: one `describe` per function, and inside each HAPPY PATH, EDGE CASES,
// FAILURE MODES. Arrange / Act / Assert.
import { act, renderHook } from "@testing-library/react";
import { useDebounced } from "@/lib/useDebounced";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const wait = (ms: number) => act(() => void jest.advanceTimersByTime(ms));

describe("useDebounced", () => {
  describe("happy path", () => {
    it("starts with the value it is given, with no wait", () => {
      const { result } = renderHook(() => useDebounced("vpn", 300));

      expect(result.current).toBe("vpn");
    });

    it("follows a new value only after the delay has passed", () => {
      const { result, rerender } = renderHook(({ value }) => useDebounced(value, 300), { initialProps: { value: "a" } });

      rerender({ value: "ab" });
      expect(result.current).toBe("a"); // not yet
      wait(299);
      expect(result.current).toBe("a");
      wait(1);

      expect(result.current).toBe("ab");
    });
  });

  describe("edge cases", () => {
    it("while the value keeps changing it waits, and then gives only the last one", () => {
      const { result, rerender } = renderHook(({ value }) => useDebounced(value, 300), { initialProps: { value: "" } });

      for (const typed of ["v", "vp", "vpn"]) {
        rerender({ value: typed });
        wait(200); // always less than the delay since the last keystroke
      }
      expect(result.current).toBe("");
      wait(100);

      expect(result.current).toBe("vpn");
    });

    it("works with values that are not text", () => {
      const { result, rerender } = renderHook(({ value }) => useDebounced(value, 100), { initialProps: { value: { page: 1 } } });
      const next = { page: 2 };

      rerender({ value: next });
      wait(100);

      expect(result.current).toBe(next);
    });

    it("a delay of zero still waits for the next tick instead of updating at once", () => {
      const { result, rerender } = renderHook(({ value }) => useDebounced(value, 0), { initialProps: { value: 1 } });

      rerender({ value: 2 });
      expect(result.current).toBe(1);
      wait(0);

      expect(result.current).toBe(2);
    });

    it("a change back to the value it already shows leaves it unchanged", () => {
      const { result, rerender } = renderHook(({ value }) => useDebounced(value, 100), { initialProps: { value: "a" } });

      rerender({ value: "b" });
      rerender({ value: "a" });
      wait(100);

      expect(result.current).toBe("a");
    });
  });

  describe("failure modes", () => {
    it("when the component goes away, the pending update is cancelled and nothing runs afterwards", () => {
      const errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
      const { rerender, unmount } = renderHook(({ value }) => useDebounced(value, 300), { initialProps: { value: "a" } });
      rerender({ value: "ab" });
      expect(jest.getTimerCount()).toBe(1);

      unmount();

      expect(jest.getTimerCount()).toBe(0);
      wait(1000);
      expect(errors).not.toHaveBeenCalled();
      errors.mockRestore();
    });

    it("never leaves more than one timer waiting, however fast the value changes", () => {
      const { rerender } = renderHook(({ value }) => useDebounced(value, 300), { initialProps: { value: 0 } });

      for (let i = 1; i <= 50; i += 1) rerender({ value: i });

      expect(jest.getTimerCount()).toBe(1);
    });
  });
});
