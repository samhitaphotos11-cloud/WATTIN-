# Design System Specification: High-End EV Mobility

## 1. Overview & Creative North Star
### The Creative North Star: "The Fluid Navigator"
This design system moves beyond the utilitarian nature of standard route planners to create a "Fluid Navigator" experience. The goal is to evoke the feeling of electric motion: silent, smooth, and technologically advanced. We achieve this by rejecting the rigid, "boxed-in" layouts of traditional enterprise software in favor of an editorial, high-breathability approach.

By utilizing intentional asymmetry—such as shifting the focus between expansive map views and dense informational sidebars—we create a rhythm that guides the eye. Overlapping elements and floating "glass" containers suggest a multi-dimensional interface that feels light, airy, and premium.

---

## 2. Colors & Surface Philosophy

Our palette is anchored by a vibrant, high-energy teal, contrasted against a sophisticated range of cool grays.

### Tonal Hierarchy
- **Primary (`#006b5c`) & Primary Container (`#00bfa5`):** Reserved for the "Pulse" of the app—actionable route buttons, active charging stations, and the vehicle’s current path.
- **The Neutrals:** Use `surface` (`#f7f9fb`) for the base environment and `surface_container_lowest` (`#ffffff`) for the primary interaction cards to create a natural, "paper-on-desk" lift.

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for defining sections. Instead:
- Use **Background Shifts:** Place a `surface_container_low` (`#f2f4f6`) panel against the `background` (`#f7f9fb`) to define a sidebar.
- Use **Vertical Space:** Let 48px–64px of whitespace act as your primary separator.

### Surface Nesting & Glassmorphism
Treat the UI as physical layers. An EV parameter input field should be a `surface_container_highest` (`#e0e3e5`) element nested inside a `surface_container_lowest` (`#ffffff`) card. 
- **Signature Polish:** For floating map overlays (like the "Ready to navigate?" prompt), use a backdrop-blur (12px–20px) combined with a semi-transparent `surface` color. This creates an integrated "frosted glass" effect that feels native to the environment.

---

## 3. Typography

The system utilizes a dual-font strategy to balance geometric modernity with human-centric readability.

*   **Display & Headlines (Plus Jakarta Sans):** Chosen for its wide apertures and modern, tech-forward feel. Use `display-md` and `headline-lg` to create authoritative entry points for the user. 
*   **Body & Labels (Manrope):** A highly legible sans-serif that excels in functional data density (e.g., battery kWh, range numbers).
*   **Editorial Scale:** Do not be afraid of extreme contrast. Pair a `headline-lg` title with `body-sm` metadata to create a hierarchy that feels curated rather than templated.

---

## 4. Elevation & Depth

We avoid "heavy" UI by replacing structural lines with **Tonal Layering**.

- **The Layering Principle:** Depth is achieved by stacking. A card (`surface_container_lowest`) sitting on a section (`surface_container_low`) provides all the visual affordance needed without a single line of stroke.
- **Ambient Shadows:** When an element must "float" (e.g., a navigation drawer or a map pin), use an extra-diffused shadow:
    - **Blur:** 24px to 40px.
    - **Opacity:** 4%–6% of the `on_surface` color.
- **The "Ghost Border":** If a boundary is required for accessibility in forms, use the `outline_variant` (`#bbcac4`) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
- **Primary:** Use a subtle gradient transition from `primary` (`#006b5c`) to `primary_container` (`#00bfa5`) to give the button "soul." 
- **Secondary/Ghost:** Use `primary` text on a transparent background, or a `surface_container_high` background for a soft-touch feel.
- **Corner Radius:** Follow the `lg` (1rem) or `full` (pill) scale to maintain the "Fluid" aesthetic.

### Input Fields
- **Styling:** Remove the bottom border. Use a solid `surface_container_highest` fill with a `md` (0.75rem) corner radius.
- **Spacing:** Ensure generous internal padding (16px horizontal). Text should never feel cramped within its container.

### Chips & Tags
- Use for "EV Connector Types" or "Stopovers." 
- Styles should be low-impact: `secondary_container` background with `on_secondary_container` text.

### Cards & Lists
- **Prohibition:** Divider lines between list items are forbidden. 
- **The Alternative:** Use a 12px vertical gap or a subtle hover state shift to `surface_container_high` to indicate row separation.
- **Route Cards:** Use a `surface_container_lowest` base with a "Ghost Border" to house journey details.

---

## 6. Do’s and Don’ts

### Do
- **Do** use large, sweeping border-radii (`xl` or 1.5rem) for large map containers to make the tech feel approachable.
- **Do** lean into the teal/cyan primary for success states and navigation paths—it is the signature "energy" of the brand.
- **Do** allow map elements to bleed to the edges of their containers.

### Don't
- **Don't** use pure black (`#000000`) for text. Use `on_surface` (`#191c1e`) to maintain a soft, premium tonal range.
- **Don't** use standard "drop shadows" with 20%+ opacity. They look dated and "dirty" against the light gray background.
- **Don't** use 1px dividers to separate the sidebar from the main content; use a `surface` to `surface_container_low` transition instead.