## 2026-10-18 current design contract

The current product design is the calm workspace. This supersedes earlier Toss-style color, gradient-icon-box, and identical rounded-card requirements. Functional exclusions and removed routes/widgets remain unchanged.

- Typeface: locally hosted Pretendard Variable 1.3.9, with its SIL Open Font License retained in public/fonts/pretendard.
- Tokens: canvas #F3F5F4, surface #FFFFFF, ink #172B2F, muted #53656A, line #D5DEDC, accent #16685D, accent hover #105448, accent soft #E7F1ED.
- Shapes: panels 10px, controls 6px, dialogs 14px. Card shadows are off; overlays may use a restrained shadow.
- Icons: lucide monochrome, 18–20px; no emoji UI. Preserve provider marks and their identifying colors.
- Layout: left-aligned public hero and actual task links; 220px app sidebar; white page headers with visible mobile actions. All existing working routes and function permissions remain intact.
- Verification: real font loading, contrast, focus/keyboard, 375/768/1280/1920 widths, protected-route states, previous input/result preservation, type checks and production build.


<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
