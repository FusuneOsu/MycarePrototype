# Shared UI kit

One design system for both apps (`adminPage` and `caregiverPage`). The look is
the caregiver workspace's: DM Sans at 14px, bold 700 emphasis, green `#128a69`,
mint highlights, 8px radii and a soft card shadow.

## Files

| File | What it is |
|---|---|
| `tokens.css` | Colour, type, spacing, radius and shadow tokens (`--ui-*`). The only place a palette value should be defined. |
| `ui.css` | Styles for every component below (`ui-` class prefix). Imports `tokens.css`. |
| `index.js` | Import point for the React components. |

Each app loads `ui.css` once from its `styles/global.css`, and maps its older
variable names onto the tokens in `styles/variables.css` (`--color-*` in admin,
`--green`/`--ink`/… in caregiver), so existing CSS follows the same palette.

## Components

```jsx
import { Button, Card, PageHeader, StatCard, Table } from '../../../../shared/ui/index.js';
```

| Component | Use it for |
|---|---|
| `Sidebar` | The system sidebar. Router-agnostic: pass `items` with `active` + `onSelect`. |
| `PageHeader`, `NotificationBell`, `HeaderProfile`, `todayLabel` | Top of every page: date eyebrow, title, subtitle, actions. |
| `Card`, `SectionHeader` | White panels; `title`/`action` for a header row, `padded` for page cards. |
| `StatCard`, `StatGrid` | Dashboard metric tiles. `tone`: `warn` / `gold`. |
| `Button` | `variant`: `primary` · `secondary` · `danger` · `link`; `size="sm"`; `href` renders a link. |
| `Tabs`, `Segmented` | Underlined tabs (`fill` spreads them evenly) and compact Month/Week/Day switches. |
| `Table`, `CellStack` | Data tables with the uppercase header row; `empty` shows an empty state. |
| `Pill`, `Tag` | Status labels (`success` · `info` · `warning` · `pending` · `danger` · `neutral`). |
| `Field`, `Input`, `Select`, `Textarea`, `Toolbar` | Form controls; `size="sm"` for filters and toolbars. |
| `Modal` | Dialogs with a title, optional `description`, and a sticky `footer` for actions. |
| `Avatar` | Initials in a circle (`tone`: `blue` / `coral`). |

In the admin app, `StatusPill` maps every status word (Active, Pending approval,
Booked, Paid…) onto a `Pill` tone, so a given status looks the same on every page.

## Rules of thumb

- New colours go in `tokens.css`, never inline hex in a page stylesheet.
- Reach for a component before writing page CSS; page stylesheets should only
  hold layout that is genuinely unique to that page (calendar grids, charts).
- Buttons that sit on a page are `secondary` unless they are *the* action.
