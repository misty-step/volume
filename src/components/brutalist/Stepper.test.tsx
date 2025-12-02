import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { Stepper } from "./Stepper";
import { useState } from "react";

function StatefulStepper(props: Parameters<typeof Stepper>[0]) {
  const [value, setValue] = useState<number | undefined>(props.value);
  return <Stepper {...props} value={value} onChange={setValue} />;
}

describe("Stepper", () => {
  it("increments and decrements by default step", async () => {
    render(<StatefulStepper label="Reps" value={1} />);

    const increment = screen.getByTestId("stepper-increment");
    const decrement = screen.getByTestId("stepper-decrement");
    const value = screen.getByTestId("stepper-value");

    await userEvent.click(increment);
    expect(value).toHaveTextContent("2");

    await userEvent.click(decrement);
    expect(value).toHaveTextContent("1");
  });

  it("uses smart weight steps via getStep", async () => {
    const getStep = vi.fn((v: number) => {
      if (v < 50) return 2.5;
      if (v < 150) return 5;
      return 10;
    });

    render(
      <StatefulStepper
        label="Weight"
        value={40}
        getStep={getStep}
        formatValue={(v) => `${v} lbs`}
      />
    );

    const increment = screen.getByTestId("stepper-increment");
    const value = screen.getByTestId("stepper-value");

    await userEvent.click(increment); // 40 + 2.5
    expect(value).toHaveTextContent("42.5 lbs");

    await userEvent.click(increment); // 42.5 + 2.5 -> 45 -> still <50 so 2.5 again after update
    expect(value).toHaveTextContent("45 lbs");
  });

  it("clamps to min and max", async () => {
    render(<StatefulStepper label="Reps" value={1} min={1} max={2} />);

    const decrement = screen.getByTestId("stepper-decrement");
    const increment = screen.getByTestId("stepper-increment");
    const value = screen.getByTestId("stepper-value");

    await userEvent.click(decrement);
    expect(value).toHaveTextContent("1"); // stays at min
    expect(decrement).toBeDisabled();

    await userEvent.click(increment);
    await userEvent.click(increment);
    expect(value).toHaveTextContent("2"); // clamps at max
    expect(increment).toBeDisabled();
  });

  it("announces value changes for screen readers", async () => {
    render(<StatefulStepper label="Reps" value={5} />);

    const announcement = screen.getByTestId("stepper-announcement");
    const increment = screen.getByTestId("stepper-increment");

    expect(announcement).toHaveTextContent("5");

    await userEvent.click(increment);
    expect(announcement).toHaveTextContent("6");
  });

  it("respects disabled state", async () => {
    const handleChange = vi.fn();
    render(
      <Stepper label="Weight" value={100} disabled onChange={handleChange} />
    );

    const increment = screen.getByTestId("stepper-increment");
    const decrement = screen.getByTestId("stepper-decrement");

    expect(increment).toBeDisabled();
    expect(decrement).toBeDisabled();

    await userEvent.click(increment);
    await userEvent.click(decrement);
    expect(handleChange).not.toHaveBeenCalled();
  });
});
