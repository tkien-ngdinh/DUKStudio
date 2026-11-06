# GradStudio PA#2 — Rules for the assistant

Team project name: DUKstudio. Product name shown on the pages: **GradStudio**. Course: CSC13008 Web Application Development. Teacher's brief: "GradStudio — final project brief" (screens in `docs/pa1/`, never edit that folder).

## 1. Goal

Build three static, responsive HTML pages, in main-flow order:

| Order | File | GradStudio screen | Role |
|---|---|---|---|
| 1 | `index.html` | Services and chat | Customer (Linh) |
| 2 | `studio.html` | Advice and clash handling | Admin (Thảo) |
| 3 | `booking.html` | Review the appointment and pay the deposit | Customer (Linh) |

Shared stylesheet: `style.css` (one file for all pages). Do not add other pages. Three finished pages beat six half-finished ones.
Every difference from the teacher's brief must be listed in `PROTOTYPE.md` ("Changed since the brief") with a reason.

## 2. Stack

- Semantic HTML5 and **plain CSS only**. Framework count = 0. No CDN, no icon library, no web-font service, no build step, no `node_modules`.
- JavaScript is optional and may be used for progressive enhancement. Every page must retain all content, styling, navigation and essential behavior with JavaScript disabled; the prototype must not depend on JavaScript.
- Pages must open directly from the folder (`open index.html`, no server, no network needed).
- Every page starts with: `<!doctype html>`, `<html lang="vi">`, `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, a unique `<title>`, and `<link rel="stylesheet" href="style.css">`.
- Font: system font stack only (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`). It must render Vietnamese diacritics.
- Spacing scale, defined once in `:root` and used for all margin, padding and gap:
  `--space-1: 4px; --space-2: 8px; --space-3: 16px; --space-4: 24px; --space-5: 32px; --space-6: 48px;`
  Do not write other spacing values (no `13px`, no random `margin: 22px`). `0` and `auto` are fine.
- Colours, radius and `--tap-min: 44px` are also custom properties in `:root`. Check every text/background pair in the DevTools colour picker.

## 3. Responsive layout (mobile-first)

- Write base CSS mobile-first for 360px. Use `@media (min-width: 768px)` and `@media (min-width: 1280px)` as the layout grows; at 768px, add columns only when the content remains readable, and use the wider layout at 1280px. Avoid `max-width` media queries.
- Layout must change with the screen, not just stretch: one column at 360px, adding columns at 768px only when content remains readable, and using the wider layout at 1280px. Put page content in a centred wrapper with `max-width` (for example `80rem`); never stretch a phone column across a laptop.
- No fixed `width`/`height` on pages, cards, chat or calendar labels. Use `max-width`, `min-width: 0`, `%`, `rem`, `fr`, `auto`.
- Long text wraps: set `overflow-wrap: anywhere` on text containers. Each page must contain at least one long item (for example `Nguyễn Thị Thúy Linh · Lớp Kỷ yếu 12A3 Trường THPT Chuyên Lê Hồng Phong` or `Gói Tốt nghiệp Premium · 2 giờ · 30 ảnh chỉnh`) to prove it does not break the layout.
- Images and SVG: `max-width: 100%; height: auto`.
- Only a table may scroll horizontally, and only inside its own wrapper (`overflow-x: auto`, with a visible label). Never put `overflow-x: hidden` on `html`, `body` or any wrapper to hide overflow.
- Do not use `position: fixed` or `position: sticky`, `100vh`/`100vw` heights or widths, or `overflow: auto/scroll` on columns. All content is read by scrolling the page.
- Never truncate text: no `text-overflow: ellipsis`, no `line-clamp`, no clipped labels.

## 4. Semantics and valid HTML (0 errors on validator.w3.org/nu)

- Landmarks on every page: one `<header>`, one `<nav>` with `aria-label`, one `<main>`, one `<footer>`.
- Exactly one `<h1>` per page. Headings go in order (`h1` → `h2` → `h3`), never skipping a level. Every `<section>` and `<aside>` has a heading.
- `<a href>` = go to another page. `<button type="...">` = an action. Never a `<div>` or `<span>` clickable, never `onclick`, never a `<button>` inside an `<a>` (or the reverse).
- Moving to the next screen: `<a href="studio.html">` or a `<form action="booking.html">` with a submit button. Relative file names only: `studio.html`, never `/studio.html`, never `studio/`, never `#`.
- Every input, select and textarea has a visible `<label for>` matching a unique `id`. Placeholders do not count as labels.
- Every `<img>` has `alt`: meaningful alt, or `alt=""` if decorative. Decorative inline SVG gets `aria-hidden="true"`.
- No duplicate `id`. No obsolete tags or attributes. Lists use `<ul>`/`<ol>`; tables only for tabular data, with `<th scope>`.
- Valid is not the same as semantic: check both the W3C result and the DevTools Accessibility pane.

## 5. Design system

- Body text ≥ 16px (`1rem`). Use `rem`, not `px`, for font sizes. Smaller secondary text is allowed when it remains readable and meets the contrast requirement.
- Contrast ≥ 4.5:1 for body text, button text and disabled-button text (verify in the DevTools colour picker; do not use pale grey).
- At every width, every standalone button and link has `min-height: var(--tap-min)` and `min-width: var(--tap-min)`; this includes nav links, disabled buttons and footer items. Links inside a sentence are exempt.
- Each page has one clearly most important thing (Screen 1: the studio reply to Linh's question and the three services; Screen 2: Booking mới with Tạo booking; Screen 3: the booking card with the deposit). Make it visually dominant.
- Never use `!important` in `style.css`.
- Every focusable element has a visible focus style.

## 6. Content and states (one story on all pages)

Story: **Linh** wants a graduation shoot with make-up on Saturday **24/10/2026 at 09:00**. Make-up artist **Mai** is busy 08:00–12:00, so the studio proposes make-up 13:00–14:00 with **Mai** and a shoot 14:00–16:00 with **Tuấn** in **Phòng B**. Admin **Thảo** creates booking **GS-1024**, package **Gói Tốt nghiệp Premium** (2 giờ, 30 ảnh chỉnh), shoot type **Tốt nghiệp cá nhân**, price **1.800.000đ**, deposit 30% **540.000đ**, remaining **1.260.000đ**. Use real Vietnamese sample content; never Lorem ipsum.

Status names (use exactly these):
- Conversations: `Chưa trả lời`, `Đang tư vấn`, `Đã chốt lịch`, `Hoàn thành`.
- Bookings: `Chờ cọc 30%` (Screen 3 may show `Đã thống nhất lịch · Chờ cọc 30%`), `Đã đặt lịch`, `Hoàn thành`. Never `Đã xác nhận` for a conversation.

State each page shows when opened directly:
- **`index.html`**: hero and intro, three services (Kỷ yếu lớp từ 350.000đ/người; Tốt nghiệp từ 1.800.000đ; Chân dung/CV từ 690.000đ), and the chat with Linh's message "Gói tốt nghiệp có makeup còn lịch 24/10 lúc 09:00 không?" and the studio reply that it will check. The chat is a normal block in the page flow, never a floating overlay. The process section must not say the studio holds the time at "Chốt lịch"; say the slot is held only after the 30% deposit succeeds and resources are re-checked.
- **`studio.html`**: the moment after Linh agrees. Conversation `Đã chốt lịch`; 14:00 selected; `Tạo booking` enabled; note "09:00 trùng lịch vì Mai bận 08:00–12:00". Three areas (conversation list, chat with the full `Booking mới` form below it, resource calendar with suggested times) stacked in one column at 360px and side by side at 1280px, all in normal page flow. The resource calendar is a readable list or table where every booking shows full text (person/room, customer, time, type); a clash is always written in words, never only colour or hatching.
- **`booking.html`**: `Lịch chụp của tôi`; GS-1024 `Đã thống nhất lịch · Chờ cọc 30%`; week view marking 24/10; timeline with 09:00 struck through (plus the text "không khả dụng") and make-up 13:00–14:00 with Mai, shoot 14:00–16:00 with Tuấn; package, price, deposit, remainder. Never say the slot is held before the deposit succeeds.

Main-flow links (labels a user understands, who continues stated):
- `index.html` → `studio.html`: "Studio staff: open this conversation".
- `studio.html` → `booking.html`: the enabled `Tạo booking` submit button (form `action="booking.html"`) plus a note "Customer (Linh): see it in Lịch chụp của tôi".
- `booking.html`: the final flow button links back to `index.html` ("Dịch vụ"); payment itself remains a disabled not-wired action.

Not-wired controls: `Thanh toán cọc 30%`, sending a message, and any action without a page are `<button type="button" disabled>` with a short visible note (for example "Chưa có ở bản mẫu này"). Nav, footer and other controls that lead nowhere (Booking, Lịch studio, Tài nguyên, Nhân sự, Xem đường đi, Ảnh đã chọn, footer links) are removed, or shown as plain text marked "Chưa có", never as links. List them in `PROTOTYPE.md` section "Not wired yet".

Remove all demo controls: `Màn 1 / Màn 2 / Màn 3`, `Đặt lại demo`, `Mô phỏng phản hồi của Linh`, `Mô phỏng thanh toán`.

People images: no photos of real people. Use initials avatars or illustrations. A licensed photo is allowed only if its source is named in `PROTOTYPE.md`.

## 7. Files and workflow

Repository root: `index.html`, `studio.html`, `booking.html`, `style.css`, `AGENTS.md`, `PROTOTYPE.md`, `brief.md`, `AI-LOG.md`, `SELF_ASSESSMENT_REPORT.md`, `docs/pa1/`, `screenshots/`, `checks/`, `.git/`.

- First commit contains this rules file. Then one commit per page, one commit for the responsive pass, one for docs. Messages say what changed ("Add studio.html with clash note and Booking mới form"), never "update".
- Each team member sets `git config user.name` and `user.email` and commits their own work.
- `brief.md` holds the real prompts given to the assistant, pasted in order, not a later summary.
- `AI-LOG.md`: one entry per page or task: tool, request, **Changed**, **Rejected**, what the assistant got wrong, which check caught it (a width, W3C, Accessibility pane), and what we told it to fix. Never write it after the fact; never write "none" everywhere.
- `PROTOTYPE.md` has 6 sections: Team (full names + MSSV), How to open it, Screens, Changed since the brief, Not wired yet, CSS (plain CSS, spacing scale, breakpoints).
- `SELF_ASSESSMENT_REPORT.md`: one row per rubric criterion (7), our score, and evidence (file, screenshot, checker result or commit), plus "What we did not do". The total equals the number in the ZIP name. Score honestly: the gap must stay within ±10.
- Zip the whole repository folder with `.git`, without `node_modules`.

## NEVER list

- NEVER add a framework, dependency, CDN link, icon library or build step. NEVER make content, styling, navigation or essential behavior depend on JavaScript; any JavaScript must be optional progressive enhancement.
- NEVER omit the viewport meta tag, hide overflow with `overflow-x: hidden`, or use fixed-width layouts.
- NEVER use `href="#"`, root-relative links, links to missing files, `onclick`, or clickable `<div>`/`<span>`. NEVER make the final flow button on `booking.html` a payment-only dead end; it returns to `index.html`.
- NEVER skip heading levels, use more than one `<h1>`, drop landmarks, or use a placeholder instead of a label.
- NEVER put body text under 16px, a standalone mobile tap target under 44px tall, or body/button text below 4.5:1 contrast.
- NEVER use `!important`, spacing values outside the scale, `position: fixed/sticky`, or independent column scrollbars.
- NEVER truncate calendar or booking labels, or show a clash only by colour or pattern.
- NEVER say a slot is held before the deposit succeeds, or change names, times, package, prices, booking code or status names between pages.
- NEVER leave demo controls, Lorem ipsum, real-person photos without a named licence, or an unexplained difference from the brief.
- NEVER claim a check passed without running it.

## Done checks (run before calling a page complete)

1. Open the page straight from the folder with JavaScript disabled (DevTools → Ctrl+Shift+P → Disable JavaScript → reload). Its required state is visible and every main-flow link opens.
2. For each width 360, 768 and 1280, in the Console:
   - `document.documentElement.clientWidth` equals the width you set.
   - `document.documentElement.scrollWidth > document.documentElement.clientWidth` prints `false`.
   - `[...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth)` prints `[]` (except inside a table's scroll wrapper).
3. At 360px, every standalone link and button is ≥ 44px tall; body text ≥ 16px; contrast ≥ 4.5:1.
4. DevTools → Elements → Accessibility: landmarks, one `<h1>`, heading order, labels, alt.
5. Run each page through validator.w3.org/nu (File upload), 0 errors. Save `checks/validator-index.png`, `checks/validator-studio.png`, `checks/validator-booking.png` (or `.txt`).
6. Compare with the brief and go through every "Fix these" item.
7. Save 9 full-page screenshots with JavaScript off: `screenshots/index-360.png`, `index-768.png`, `index-1280.png`, `studio-360.png`, `studio-768.png`, `studio-1280.png`, `booking-360.png`, `booking-768.png`, `booking-1280.png` (DevTools device toolbar → ⋮ → Capture full size screenshot).


