# Wall Calendar — Frontend Engineering Challenge

A polished, interactive React wall calendar component built for the TakeUForward frontend challenge.

🔗 **Live Demo:** https://takeuforward-bay.vercel.app


## Features

- **Wall Calendar Aesthetic** — Hero image that changes every month with a wavy SVG cut dividing the image from the grid
- **Day Range Selection** — Click a start date, then an end date; hover preview shows the range before confirming; clear visual states for start, end, and in-between days
- **Integrated Notes** — Attach notes to any selected date or range; saved notes persist in-session; mobile uses a slide-up sheet with a FAB button
- **Month Flip Animation** — Smooth animated transition when navigating months
- **Dynamic Theming** — Gradient palette and hero image change automatically per month
- **Holiday Markers** — Indian public holidays highlighted with dot indicators and tooltips
- **Dark / Light Mode** — Toggle between themes
- **Fully Responsive** — Side-by-side layout on desktop; stacked + FAB notes panel on mobile


## Tech Choices

| Decision | Reason |
|---|---|
| Plain React (no UI library) | Full control over styling and interactions |
| Inline CSS-in-JS via `<style>` tag | Zero build config, easy theming with CSS variables |
| Unsplash static URLs | No API key needed; deterministic per month |
| localStorage not used | Challenge spec said frontend only; state resets on refresh intentionally |
| Monday-start grid | Matches international calendar standard |


## Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/Nizamuddin1N/takeuforward.git
cd takeuforward

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Open in browser
# http://localhost:5173
