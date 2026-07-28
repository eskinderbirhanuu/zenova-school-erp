import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import PlaceholderCard from "@/components/dashboard/placeholder-card"
import FeedCard from "@/components/dashboard/feed-card"
import MetricBadgesRow from "@/components/dashboard/metric-badges-row"
import NowTeachingCard from "@/components/dashboard/now-teaching-card"
import ChildSelectorBar from "@/components/dashboard/child-selector-bar"
import { Users, Home } from "lucide-react"

describe("PlaceholderCard", () => {
  it("renders title and default message", () => {
    render(<PlaceholderCard title="My Widget" />)
    expect(screen.getByText("My Widget")).toBeInTheDocument()
    expect(screen.getByText("Coming soon")).toBeInTheDocument()
  })

  it("renders custom message and description", () => {
    render(<PlaceholderCard title="Reports" description="Coming in v2" message="Under development" />)
    expect(screen.getByText("Reports")).toBeInTheDocument()
    expect(screen.getByText("Coming in v2")).toBeInTheDocument()
    expect(screen.getByText("Under development")).toBeInTheDocument()
  })

  it("renders with custom icon", () => {
    const { container } = render(<PlaceholderCard title="Home" icon={Home} />)
    expect(container.querySelector("svg")).toBeInTheDocument()
  })
})

describe("FeedCard", () => {
  it("renders title and empty state", () => {
    render(<FeedCard title="Activity" items={[]} />)
    expect(screen.getByText("Activity")).toBeInTheDocument()
    expect(screen.getByText("No recent activity")).toBeInTheDocument()
  })

  it("renders custom empty message", () => {
    render(<FeedCard title="Alerts" items={[]} emptyMessage="All clear" />)
    expect(screen.getByText("All clear")).toBeInTheDocument()
  })

  it("renders feed items with labels", () => {
    const items = [
      { label: "User registered", detail: "John Doe", time: "2m ago" },
      { label: "Payment received" },
    ]
    render(<FeedCard title="Recent" items={items} />)
    expect(screen.getByText("User registered")).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("John Doe"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("2m ago"))).toBeInTheDocument()
    expect(screen.getByText("Payment received")).toBeInTheDocument()
  })

  it("renders feed items with badge", () => {
    const items = [
      { label: "Task", badge: { text: "New", variant: "success" as const } },
    ]
    render(<FeedCard title="Tasks" items={items} />)
    expect(screen.getByText("New")).toBeInTheDocument()
  })

  it("renders description", () => {
    render(<FeedCard title="Feed" items={[]} description="Latest updates" />)
    expect(screen.getByText("Latest updates")).toBeInTheDocument()
  })
})

describe("MetricBadgesRow", () => {
  it("renders all metrics", () => {
    const metrics = [
      { label: "Students", value: "120", icon: Users },
      { label: "Teachers", value: "15", icon: Users },
    ]
    render(<MetricBadgesRow metrics={metrics} />)
    expect(screen.getByText("120")).toBeInTheDocument()
    expect(screen.getByText("Students")).toBeInTheDocument()
    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.getByText("Teachers")).toBeInTheDocument()
  })

  it("renders single metric", () => {
    const metrics = [{ label: "Active", value: "42", icon: Users }]
    render(<MetricBadgesRow metrics={metrics} />)
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("renders empty metrics gracefully", () => {
    const { container } = render(<MetricBadgesRow metrics={[]} />)
    expect(container.querySelector(".flex-wrap")).toBeInTheDocument()
  })
})

describe("NowTeachingCard", () => {
  const currentClass = { subject: "Math", grade: "10", section: "A", room: "201", time: "10:00 AM" }
  const nextClass = { subject: "Physics", grade: "10", section: "B", room: "305", time: "11:00 AM" }

  it("renders current class with In Progress badge", () => {
    render(<NowTeachingCard currentClass={currentClass} nextClass={null} />)
    expect(screen.getByText("Math")).toBeInTheDocument()
    expect(screen.getByText("In Progress")).toBeInTheDocument()
    expect(screen.getByText("Room 201")).toBeInTheDocument()
    expect(screen.getByText("10:00 AM")).toBeInTheDocument()
  })

  it("shows upcoming next class", () => {
    render(<NowTeachingCard currentClass={currentClass} nextClass={nextClass} />)
    expect(screen.getByText("Physics")).toBeInTheDocument()
    expect(screen.getByText("11:00 AM")).toBeInTheDocument()
    const badges = screen.getAllByText("Upcoming")
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it("shows 'No class right now' when no current, but has next", () => {
    render(<NowTeachingCard currentClass={null} nextClass={nextClass} />)
    expect(screen.getByText("No class right now")).toBeInTheDocument()
    expect(screen.getByText("Physics")).toBeInTheDocument()
  })

  it("shows 'Done for the day' when both are null", () => {
    render(<NowTeachingCard currentClass={null} nextClass={null} />)
    expect(screen.getByText("Done for the day")).toBeInTheDocument()
    expect(screen.getByText("All classes are completed")).toBeInTheDocument()
  })
})

describe("ChildSelectorBar", () => {
  const children = [
    { id: "1", name: "Alice", initials: "A", grade: "5" },
    { id: "2", name: "Bob", initials: "B", grade: "3" },
  ]

  it("renders all children", () => {
    // eslint-disable-next-line react/no-children-prop
    render(<ChildSelectorBar children={children} selectedId="1" onSelect={() => {}} />)
    expect(screen.getByText("Alice")).toBeInTheDocument()
    expect(screen.getByText("Bob")).toBeInTheDocument()
    expect(screen.getByText("Grade 5")).toBeInTheDocument()
    expect(screen.getByText("Grade 3")).toBeInTheDocument()
  })

  it("highlights selected child", () => {
    // eslint-disable-next-line react/no-children-prop
    render(<ChildSelectorBar children={children} selectedId="1" onSelect={() => {}} />)
    const alice = screen.getByText("Alice").closest("button")
    expect(alice?.className).toContain("bg-primary/10")
  })

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn()
    // eslint-disable-next-line react/no-children-prop
    render(<ChildSelectorBar children={children} selectedId="1" onSelect={onSelect} />)
    fireEvent.click(screen.getByText("Bob"))
    expect(onSelect).toHaveBeenCalledWith("2")
  })
})