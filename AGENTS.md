# Adventure Drafter Development Rules

These rules apply to all development in this repository, including work by human contributors and coding agents. Follow them when adding features, fixing bugs, refactoring, or reviewing changes.

## 1. Maximum script length

- No project-authored script or source module may exceed **500 physical lines**, including comments and blank lines. This includes application code, components, services, utilities, build scripts, and test scripts.
- Split files by responsibility before they reach the limit.
- Do not meet the limit by minifying code, compressing statements, removing useful documentation, or moving unrelated logic into a generic utility file.
- Installed dependencies and generated build output are not project-authored source. Do not commit generated bundles as a workaround.

## 2. Single responsibility

- Every script, module, component, function, class, and service must have one clear responsibility and one coherent reason to change.
- Separate document data and editing operations from rendering, persistence, export, and UI orchestration.
- Keep UI components focused on presentation and interaction. Put business rules and storage operations behind focused interfaces.
- Prefer small, composable functions and explicit dependencies. Avoid monolithic components, services, and catch-all utility modules.
- A file under 500 lines still needs to be split if it combines unrelated responsibilities.

## 3. Custom dialogs, alerts, and notifications

- Use the application's shared UI components for modals, confirmations, alerts, notifications, and user input.
- Do not use browser/system-default `alert()`, `confirm()`, or `prompt()`, including their `window` equivalents, for application interactions.
- Use the shared confirmation modal for decisions, inline feedback for field errors, and the shared notification system for status messages.
- Keep styling and behavior consistent across the application.
- Browser-owned file pickers, permission prompts, and print dialogs may be used when the requested platform operation requires them. They do not replace application dialogs or feedback.

## 4. Shared modal framework

All modals must use one reusable modal framework with **small**, **normal**, and **wide** size variants.

- Every modal has a header, body, and footer.
- The header always contains the modal title and an accessible close button.
- The footer always contains the relevant action button or buttons and a Cancel button.
- Keep the header and footer visible within the viewport for the entire time the modal is open.
- Only the body scrolls vertically. Long content must never push the title, close button, actions, or Cancel button out of view.
- Constrain the modal to the available viewport width and height. All three sizes must adapt to narrow screens and changes in viewport height.
- Implement the structure using a constrained flex or grid container, non-scrolling header and footer, and a body with `min-height: 0` and `overflow-y: auto`.
- Provide accessible dialog semantics, title association, keyboard navigation, focus trapping, Escape dismissal, and focus restoration.
- Route close, Cancel, and other dismissal paths through the same handling for unsaved work.
- Feature-specific modals supply their title, body, actions, and size. They must not duplicate the modal shell or invent their own scrolling and dismissal behavior.

## 5. Application layout and density

- Build Adventure Drafter as an editing application with the styled document page as the primary workspace.
- Use thin rails, compact toolbars, and task-focused panels to keep the document visible and accessible.
- Avoid webpage-style hero sections, oversized headers, repeated card grids, and decorative containers in the application workspace.
- Minimize unnecessary gaps and padding. Prefer square or subtly rounded surfaces over heavily rounded cards.
- Use consistent spacing and sizing tokens. Compact layouts must retain readable labels, clear focus states, and usable pointer and touch targets.
- Place controls where they support the editing task. Use contextual tools and progressive disclosure for less common options.

## 6. Reusable UI libraries and patterns

- Build UI features from reusable component libraries and the application's shared UI layer.
- Before adding a modal, toolbar, slide-out panel, menu, dropdown, notification, or other common interaction, check for an existing component or pattern.
- Reuse and extend an existing component when it serves the same purpose. Do not create a feature-specific version of an established UI pattern.
- Where a needed pattern is missing, create one shared component backed by accessible library primitives where practical, then use it consistently.
- Centralize shared styling, sizing, spacing, focus behavior, keyboard interaction, and dismissal behavior.
- Keep feature content separate from UI primitives. Prefer composition and explicit options over copied markup and CSS.
- Introduce an additional UI library only when existing libraries and shared components cannot reasonably meet the need. Document the reason and integrate it through the shared UI layer.

## Review checklist

Before completing a change:

- Verify every changed project-authored script and source module is at most 500 lines.
- Check that files, functions, components, and services each have one clear responsibility.
- Confirm application dialogs and feedback use shared custom components.
- For modal changes, verify all three size variants and long content on desktop and narrow viewports. The header and footer must remain visible while the body scrolls.
- Check that new UI uses existing shared patterns and preserves a compact editing workspace.
- Run the checks appropriate to the change and report any unresolved issues accurately.
