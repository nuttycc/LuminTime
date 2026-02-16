## 2024-05-22 - Complex List Items as Buttons

**Learning:** List items acting as buttons with complex internal content (rank, text, progress bar, icons) create a verbose and disjointed screen reader experience.
**Action:** Always provide a concise `aria-label` on the container button that summarizes the key information (e.g., "Rank 1, example.com, time spent 2h 30m"), overriding the verbose internal structure.

## 2024-05-22 - Accessible Data Visualization

**Learning:** Purely visual charts (using `div`s) are invisible to screen readers. Mapping them to semantic lists (`role="list"`, `role="listitem"`) allows users to navigate data points.
**Action:** For simple bar charts, use `role="list"` on the container and `role="listitem"` on bars. Add `tabindex="0"` for keyboard access and provide verbose `aria-label`s (e.g., "10:00, 15 minutes") for each data point.
