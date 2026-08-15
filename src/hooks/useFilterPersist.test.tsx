import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useFilterPersist } from "./useFilterPersist";

const defaults = { status: "all", search: "" };

function wrapper(initialEntries: string[]) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}

describe("useFilterPersist", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns defaults when no URL params and nothing saved", () => {
    const { result } = renderHook(() => useFilterPersist("page", defaults), {
      wrapper: wrapper(["/"]),
    });
    expect(result.current.filters).toEqual(defaults);
  });

  it("lets URL params override defaults on mount", () => {
    const { result } = renderHook(() => useFilterPersist("page", defaults), {
      wrapper: wrapper(["/?status=pending"]),
    });
    expect(result.current.filters).toEqual({ status: "pending", search: "" });
  });

  it("persists filter changes to sessionStorage", () => {
    const { result } = renderHook(() => useFilterPersist("page", defaults), {
      wrapper: wrapper(["/"]),
    });
    act(() => result.current.setFilters({ search: "abc" }));
    expect(result.current.filters.search).toBe("abc");
    expect(JSON.parse(sessionStorage.getItem("filters:page")!)).toMatchObject({
      search: "abc",
    });
  });

  it("restores saved filters when no URL params are present", () => {
    sessionStorage.setItem(
      "filters:page",
      JSON.stringify({ status: "closed", search: "x" })
    );
    const { result } = renderHook(() => useFilterPersist("page", defaults), {
      wrapper: wrapper(["/"]),
    });
    expect(result.current.filters).toEqual({ status: "closed", search: "x" });
  });

  it("prefers URL params over saved filters", () => {
    sessionStorage.setItem(
      "filters:page",
      JSON.stringify({ status: "closed", search: "x" })
    );
    const { result } = renderHook(() => useFilterPersist("page", defaults), {
      wrapper: wrapper(["/?status=pending"]),
    });
    expect(result.current.filters.status).toBe("pending");
  });

  it("supports functional updates", () => {
    const { result } = renderHook(() => useFilterPersist("page", defaults), {
      wrapper: wrapper(["/"]),
    });
    act(() =>
      result.current.setFilters((prev) => ({ ...prev, search: prev.search + "z" }))
    );
    expect(result.current.filters.search).toBe("z");
  });

  it("resets filters to defaults on clear (which the effect re-syncs to storage)", () => {
    const { result } = renderHook(() => useFilterPersist("page", defaults), {
      wrapper: wrapper(["/"]),
    });
    act(() => result.current.setFilters({ search: "abc" }));
    act(() => result.current.clearFilters());
    expect(result.current.filters).toEqual(defaults);
    // clearFilters removes the key, then the persist effect re-writes the
    // reset (default) filters, keeping storage in sync with state.
    expect(JSON.parse(sessionStorage.getItem("filters:page")!)).toEqual(defaults);
  });
});
