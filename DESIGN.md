---
name: Checkout
description: Calm mobile catalog and checkout for desk gear priced in COP.
colors:
  paper: "oklch(0.985 0.006 75)"
  surface: "oklch(0.995 0.004 75)"
  sunken: "oklch(0.955 0.01 75)"
  ink: "oklch(0.27 0.02 55)"
  muted: "oklch(0.46 0.02 60)"
  line: "oklch(0.89 0.012 75)"
  accent: "oklch(0.5 0.105 48)"
  accent-hover: "oklch(0.44 0.1 48)"
  on-accent: "oklch(0.98 0.008 75)"
  danger: "oklch(0.45 0.14 25)"
  danger-bg: "oklch(0.96 0.02 25)"
typography:
  body:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  heading:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  price:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
rounded:
  control: "0.5rem"
spacing:
  page: "1rem"
  stack: "1.25rem"
  touch: "2.75rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    height: "{spacing.touch}"
    padding: "0 1rem"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    height: "{spacing.touch}"
  button-secondary:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "{spacing.touch}"
    padding: "0 1rem"
---

## Overview

Mobile-first catalog and checkout. Light paper, warm ink, one copper accent reserved for the next step. Instrument Sans from Google Fonts carries every label, price, and button. Icons are Lucide at 20px with a 1.75 stroke. Screens are built from primitives in `apps/web/src/shared/ui`.

## Colors

Restrained palette. Neutrals are tinted toward warm paper (hue 75). Copper (`accent`) is only for the primary action, the current method, and focus. Danger is for alerts. Do not decorate lists or headers with the accent.

## Typography

One family: Instrument Sans, loaded from Google Fonts. Fixed sizes: body 1rem, heading 1.5rem, price 1.25rem or 1rem in a row. Weights 400 and 600. Prices use tabular numbers. Prose stays within 65 characters.

## Elevation

Flat. Separation is a 1px `line` border or a `sunken` fill. No drop shadows, no glass, no side stripes.

## Components

Primitives: `AppShell`, `UiButton`, `UiIconButton`, `UiIcon`, `UiField`, `UiInput`, `UiSelect`, `UiAlert`, `UiPrice`, `UiSkeleton`, `UiEmpty`.

Buttons are 44px tall, radius `control`, 200ms color transitions on an exponential ease. Primary, secondary, and ghost share that shape. Disabled drops to 50% opacity. Loading sets `aria-busy`.

Inputs and selects are native controls with the same height, radius, and border. `UiField` supplies the label and optional hint or error.

Lists are rows with hairline dividers, not cards. Loading uses skeletons. Empty states name the situation and the next move.

## Do's and Don'ts

Do keep one next step per screen, sized for a thumb. Do say the price, the stock, and whether payment can actually run.

Don't add marketplace badges, sale stickers, or urgency. Don't use a second typeface, gradient text, or identical icon cards. Don't enable pay until a real charge exists.
