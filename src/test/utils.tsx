import {
  render as rtlRender,
  type RenderOptions,
} from "@testing-library/react";
import { ThemeProvider } from "../components/ThemeProvider";
import { WeightUnitProvider } from "../contexts/WeightUnitContext";
import { type ReactElement, type ReactNode } from "react";

function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <WeightUnitProvider>{children}</WeightUnitProvider>
    </ThemeProvider>
  );
}

export function render(ui: ReactElement, options: RenderOptions = {}) {
  return rtlRender(ui, { wrapper: Providers, ...options });
}

// re-export everything
export * from "@testing-library/react";
