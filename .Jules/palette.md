## 2024-05-22 - Complex List Items as Buttons
**Learning:** List items acting as buttons with complex internal content (rank, text, progress bar, icons) create a verbose and disjointed screen reader experience.
**Action:** Always provide a concise `aria-label` on the container button that summarizes the key information (e.g., "Rank 1, example.com, time spent 2h 30m"), overriding the verbose internal structure.
