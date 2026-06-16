# Attijari Decision Hub Design System

## Tokens

- Primary brand: `#E85654`
- Background charcoal: `#1A1F35`
- Page background: `#F5F7FA`
- Surface: `#FFFFFF`
- Positive data: `#10B981`
- Warning: `#F59E0B`
- Critical: `#EF4444`
- Premium highlight: `#8B5CF6`

Typography uses Inter for interface text and JetBrains Mono for badges, IDs and compact data labels.

## Components

- `.btn`, `.btn-primary`, `.btn-secondary` for commands.
- `.panel`, `.panel-padding` for cards and framed analytical surfaces.
- `.pill-*` for category and severity badges.
- Sidebar supports desktop full mode, desktop mini mode, tablet drawer mode and mobile bottom navigation.
- KPI and dashboard cards use hover elevation, stable padding and responsive grids.

## Responsive Behavior

- Desktop: persistent sidebar, 12-column style content grids, maximum content width `1440px`.
- Tablet: sidebar drawer, two-column KPI/dashboard layouts.
- Mobile: single-column layout and bottom navigation with four primary destinations.

## Accessibility

Interactive controls expose visible focus states through `:focus-visible`. Core text colors target WCAG AA contrast on light and dark themes. Motion is reduced automatically when the system preference asks for reduced motion.
