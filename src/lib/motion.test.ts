/**
 * Tests for motion utilities and reduced-motion support.
 */

import { describe, it, expect } from "vitest";
import {
  fadeInUp,
  slideIn,
  scaleIn,
  staggerContainer,
  MOTION_CONFIG,
} from "./motion";

describe("Motion Configuration", () => {
  it("exports motion config with expected values", () => {
    expect(MOTION_CONFIG.duration).toBe(0.6);
    expect(MOTION_CONFIG.ease).toEqual([0.21, 0.47, 0.32, 0.98]);
    expect(MOTION_CONFIG.staggerDelay).toBe(0.1);
  });
});

describe("Motion Variants", () => {
  it("fadeInUp animates from hidden to visible", () => {
    expect(fadeInUp.hidden).toEqual({ opacity: 0, y: 24 });
    expect(fadeInUp.visible).toMatchObject({
      opacity: 1,
      y: 0,
    });
  });

  it("slideIn supports left direction", () => {
    const variant = slideIn("left");
    expect(variant.hidden).toEqual({ opacity: 0, x: -32 });
    expect(variant.visible).toMatchObject({ opacity: 1, x: 0 });
  });

  it("slideIn supports right direction", () => {
    const variant = slideIn("right");
    expect(variant.hidden).toEqual({ opacity: 0, x: 32 });
    expect(variant.visible).toMatchObject({ opacity: 1, x: 0 });
  });

  it("slideIn defaults to left", () => {
    const variant = slideIn();
    expect(variant.hidden).toEqual({ opacity: 0, x: -32 });
  });

  it("scaleIn animates from hidden to visible", () => {
    expect(scaleIn.hidden).toEqual({ opacity: 0, scale: 0.9 });
    expect(scaleIn.visible).toMatchObject({
      opacity: 1,
      scale: 1,
    });
  });

  it("staggerContainer provides stagger timing for children", () => {
    expect(staggerContainer.visible).toMatchObject({
      transition: {
        staggerChildren: MOTION_CONFIG.staggerDelay,
      },
    });
  });
});
