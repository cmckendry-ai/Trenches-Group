# Quote templates

JSON bodies for `POST /api/quotes` (see `recovered/quotes.js`). Add `businessName`,
`contactName`, optional `leadId` and `validUntil` (YYYY-MM-DD), then POST. Prices match
`docs/PRICING.md` (proposal dated 2026-10-09). Keys starting with `_` are notes, strip
them before sending. Line item unit prices cannot be negative, so package discounts are
baked into one bundled line.
