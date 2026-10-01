# trenches-os-api migrations

`0000_baseline.sql` is the full schema of the live D1 database `trenches-production`
(id `2261ffe8-712f-4b07-aec2-73bba0ad155e`), exported from `sqlite_master` on 2026-10-01.
It is idempotent (`IF NOT EXISTS` everywhere) and replaces the historical migrations, whose
files were never committed and are lost. The prod `d1_migrations` table lists 30 applied, in order:

0001_initial, 0002_phase2, 0003_native_prospector, 0004_prospector_v14, 0005_radius_campaigns, 0006_outreach_phase3a, 0007_phase3b_conversation, 0008_provider_routing, 0009_autonomous_outreach, 0010_demo_fulfillment, 0011_website_gap_controls, 0012_demo_quality_router, 0001_client_portal, 0013_reliability_and_compliance, 0014_prospector_orchestration, 0015_stripe_checkout, 0016_offering_tracks, 0002_member_portal, 0003_social_orders, 0003_pricing_gate, 0004_processing_fee, 0005_paid_ads_addon, 0006_custom_quote, 0007_addon_subscriptions, 0008_estimate_portal, 0009_outreach_orders, 0017_quotes, 0018_quote_view_alerts, 0010_analytics_reports, 0011_admin_auth (all `.sql`).

Do not apply this baseline to prod (every object already exists); use it to rebuild a local or
staging D1. New migrations start at `0001_` and must be committed with the deploy that runs them.
