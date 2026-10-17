// The "load on mount, with loading / error / retry" hook (`lib/useAsyncResource.ts`), shared by the supplier directory and
// the asset stock. The loader is a mock: nothing here touches the network.
//
// Layout shared by every frontend test file: one `describe` per function, and inside each HAPPY PATH, EDGE CASES,
// FAILURE MODES. Arrange / Act / Assert.
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAsyncResource } from "@/lib/useAsyncResource";

const describeError = (err: unknown) => `fallo: ${err instanceof Error ? err.message : "desconocido"}`;

describe("useAsyncResource", () => {
  describe("happy path", () => {
    it("starts loading with the initial data, then shows what the loader returned", async () => {
      const load = jest.fn().mockResolvedValue(["a", "b"]);

      const { result } = renderHook(() => useAsyncResource<string[]>(load, [], describeError));
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual([]);
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).toEqual(["a", "b"]);
      expect(result.current.error).toBeNull();
      expect(load).toHaveBeenCalledTimes(1);
    });

    it("reload reads again and updates the data without going back to the loading state", async () => {
      const load = jest.fn().mockResolvedValueOnce(["a"]).mockResolvedValueOnce(["a", "b"]);
      const { result } = renderHook(() => useAsyncResource<string[]>(load, [], describeError));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(() => result.current.reload());

      expect(result.current.data).toEqual(["a", "b"]);
      expect(result.current.loading).toBe(false);
    });

    it("lets the view apply a change it already knows", async () => {
      const load = jest.fn().mockResolvedValue(["a"]);
      const { result } = renderHook(() => useAsyncResource<string[]>(load, [], describeError));
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.setData(["a", "edited"]));

      expect(result.current.data).toEqual(["a", "edited"]);
    });
  });

  describe("edge cases", () => {
    it("does not load again when the component re-renders with the same loader", async () => {
      const load = jest.fn().mockResolvedValue([]);
      const { result, rerender } = renderHook(() => useAsyncResource<string[]>(load, [], describeError));
      await waitFor(() => expect(result.current.loading).toBe(false));

      rerender();
      rerender();

      expect(load).toHaveBeenCalledTimes(1);
    });

    it("lets the view report an error of its own and clears it on the next load", async () => {
      const load = jest.fn().mockResolvedValue(["a"]);
      const { result } = renderHook(() => useAsyncResource<string[]>(load, [], describeError));
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.setError("No se pudo actualizar la tarifa."));
      expect(result.current.error).toBe("No se pudo actualizar la tarifa.");
      await act(() => result.current.reload());

      expect(result.current.error).toBeNull();
    });
  });

  describe("failure modes", () => {
    it("shows the described error, stops loading and keeps the initial data", async () => {
      const load = jest.fn().mockRejectedValue(new Error("503"));

      const { result } = renderHook(() => useAsyncResource<string[]>(load, [], describeError));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe("fallo: 503");
      expect(result.current.data).toEqual([]);
    });

    it("a failed reload keeps the data that was already on screen", async () => {
      const load = jest.fn().mockResolvedValueOnce(["a"]).mockRejectedValueOnce(new Error("timeout"));
      const { result } = renderHook(() => useAsyncResource<string[]>(load, [], describeError));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(() => result.current.reload());

      expect(result.current.error).toBe("fallo: timeout");
      expect(result.current.data).toEqual(["a"]);
    });

    it("retry goes back to the loading state while the second attempt runs, then recovers", async () => {
      let finish: (value: string[]) => void = () => {};
      const load = jest
        .fn()
        .mockRejectedValueOnce(new Error("503"))
        .mockImplementationOnce(() => new Promise<string[]>((resolve) => (finish = resolve)));
      const { result } = renderHook(() => useAsyncResource<string[]>(load, [], describeError));
      await waitFor(() => expect(result.current.error).toBe("fallo: 503"));

      let retrying: Promise<void> = Promise.resolve();
      act(() => {
        retrying = result.current.retry();
      });
      expect(result.current.loading).toBe(true); // not an empty list while the request is in flight
      expect(result.current.error).toBeNull();
      await act(async () => {
        finish(["a"]);
        await retrying;
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(["a"]);
    });
  });
});
