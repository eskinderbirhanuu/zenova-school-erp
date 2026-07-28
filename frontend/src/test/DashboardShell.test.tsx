/**
 * Renders a minimal DashboardShell test with placeholder widgets.
 * Verifies loading state, header rendering, and widget children.
 */
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import DashboardShell from "@/components/dashboard/dashboard-shell"

describe("DashboardShell", () => {
  it("renders header content", () => {
    render(
      <DashboardShell
        header={<div data-testid="header">Test Header</div>}
        widgets={[<div key="w1" data-testid="widget">Widget 1</div>]}
      />
    )
    expect(screen.getByTestId("header")).toHaveTextContent("Test Header")
    expect(screen.getByTestId("widget")).toHaveTextContent("Widget 1")
  })

  it("renders nothing when loading", () => {
    const { container } = render(
      <DashboardShell
        isLoading={true}
        widgets={[<div key="w1">Widget 1</div>]}
      />
    )
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("renders all widgets", () => {
    render(
      <DashboardShell
        widgets={[
          <div key="w1" data-testid="w1">W1</div>,
          <div key="w2" data-testid="w2">W2</div>,
          <div key="w3" data-testid="w3">W3</div>,
        ]}
      />
    )
    expect(screen.getByTestId("w1")).toBeInTheDocument()
    expect(screen.getByTestId("w2")).toBeInTheDocument()
    expect(screen.getByTestId("w3")).toBeInTheDocument()
  })
})