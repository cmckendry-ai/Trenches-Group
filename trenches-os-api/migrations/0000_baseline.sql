-- Baseline schema exported from D1 trenches-production on 2026-10-01. Tables first, then indexes. Idempotent.

CREATE TABLE IF NOT EXISTS addons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
, is_custom_quote INTEGER NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES admin_users(email) ON DELETE CASCADE,
  impersonate_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  totp_secret TEXT NOT NULL,
  totp_enabled_at TEXT,
  totp_last_step INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT,
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  status TEXT NOT NULL CHECK (status IN ('RUNNING','SUCCESS','FAILED','HUMAN_REVIEW')),
  tokens_used INTEGER,
  cost_usd REAL,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS analytics_reports (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  visitors INTEGER,
  sessions INTEGER,
  pageviews INTEGER,
  avg_engagement_sec INTEGER,
  leads INTEGER,
  scroll_depth_pct REAL,
  rage_click_pct REAL,
  dead_click_pct REAL,
  quick_back_pct REAL,
  top_pages_json TEXT,
  top_sources_json TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(member_id, period)
);

CREATE TABLE IF NOT EXISTS analytics_sources (
  member_id TEXT PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  ga4_property_id TEXT,
  clarity_project_id TEXT
);

CREATE TABLE IF NOT EXISTS approval_tokens (
  token TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaign_prospects (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  external_id TEXT,
  ingest_status TEXT NOT NULL DEFAULT 'ACCEPTED',
  created_at TEXT NOT NULL,
  UNIQUE(campaign_id, lead_id),
  FOREIGN KEY(campaign_id) REFERENCES prospecting_campaigns(id),
  FOREIGN KEY(lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  requested_at TEXT NOT NULL,
  actionized_at TEXT,
  admin_notes TEXT
);

CREATE TABLE IF NOT EXISTS client_onboarding (
  proposal_id TEXT PRIMARY KEY REFERENCES client_proposals(id) ON DELETE CASCADE,
  details_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_orders (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  domain_addon INTEGER NOT NULL DEFAULT 0 CHECK (domain_addon IN (0,1)),
  amount_total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','EXPIRED','CANCELLED','REFUNDED')),
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  stripe_customer_email TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_projects (
  lead_id TEXT PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES client_orders(id),
  domain_addon INTEGER NOT NULL DEFAULT 0 CHECK (domain_addon IN (0,1)),
  retainer_status TEXT NOT NULL DEFAULT 'NONE' CHECK (retainer_status IN ('NONE','OFFERED','ACTIVE','DECLINED','CANCELLED')),
  retainer_stripe_subscription_id TEXT,
  launched_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_proposals (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  options_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  deposit_session_id TEXT UNIQUE,
  final_session_id TEXT UNIQUE,
  final_due_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, payment_method TEXT NOT NULL DEFAULT 'card');

CREATE TABLE IF NOT EXISTS cron_leases (
  name TEXT PRIMARY KEY,
  holder TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deferred_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_json TEXT NOT NULL,
  reason TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DEFERRED' CHECK (status IN ('DEFERRED','REPLAYED','ABANDONED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_events (
  id TEXT PRIMARY KEY,
  demo_site_id TEXT NOT NULL REFERENCES demo_sites(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('VIEW','CTA_CLICK','DEMO_SENT','BUILD_STARTED','BUILD_FAILED','QA_PASSED','QA_FAILED')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_jobs (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CLAIMED','BUILDING','QA','READY','FAILED','CANCELLED')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  qa_attempt_count INTEGER NOT NULL DEFAULT 0,
  max_qa_attempts INTEGER NOT NULL DEFAULT 2,
  next_retry_at TEXT,
  claimed_by TEXT,
  claimed_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  provider TEXT,
  model TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, lease_expires_at TEXT, reclaim_count INTEGER NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS demo_sites (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  demo_job_id TEXT REFERENCES demo_jobs(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','QA','READY','PUBLISHED','ARCHIVED')),
  html TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  qa_score INTEGER CHECK (qa_score IS NULL OR (qa_score >= 0 AND qa_score <= 100)),
  qa_report_json TEXT NOT NULL DEFAULT '{}',
  provider TEXT,
  model TEXT,
  published_at TEXT,
  last_viewed_at TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  cta_click_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data_json TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL,
  actor TEXT,
  old_state TEXT,
  new_state TEXT,
  idempotency_key TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gmail_connections (
  id TEXT PRIMARY KEY,
  email_address TEXT NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  scopes TEXT NOT NULL,
  history_id TEXT,
  status TEXT NOT NULL DEFAULT 'CONNECTED' CHECK (status IN ('CONNECTED','ERROR','DISCONNECTED')),
  connected_at TEXT NOT NULL,
  last_sync_at TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS health_counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0,
  last_incremented_at TEXT
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  resource_id TEXT,
  response_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  hosted_invoice_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','RUNNING','SUCCESS','FAILED','HUMAN_REVIEW','CANCELLED')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_research (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  services_json TEXT,
  service_area_json TEXT,
  business_hours_json TEXT,
  owner_name TEXT,
  years_in_business INTEGER,
  brand_colors_json TEXT,
  logo_url TEXT,
  research_confidence REAL CHECK (research_confidence IS NULL OR (research_confidence >= 0 AND research_confidence <= 1)),
  source_data_json TEXT,
  researched_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, is_operating INTEGER CHECK (is_operating IS NULL OR is_operating IN (0,1)), is_local_independent INTEGER CHECK (is_local_independent IS NULL OR is_local_independent IN (0,1)), is_supplier INTEGER CHECK (is_supplier IS NULL OR is_supplier IN (0,1)), is_franchise_hq INTEGER CHECK (is_franchise_hq IS NULL OR is_franchise_hq IN (0,1)), last_review_at TEXT, primary_service TEXT, social_activity TEXT CHECK (social_activity IS NULL OR social_activity IN ('ACTIVE','DORMANT','NONE','UNKNOWN')), source_count INTEGER NOT NULL DEFAULT 0, website_evidence_json TEXT NOT NULL DEFAULT '[]', contradiction_flags_json TEXT NOT NULL DEFAULT '[]');

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  phone TEXT,
  phone_type TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (phone_type IN ('MOBILE','LANDLINE','UNKNOWN')),
  email TEXT,
  website TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  google_url TEXT,
  google_rating REAL,
  google_reviews INTEGER,
  website_quality TEXT CHECK (website_quality IS NULL OR website_quality IN ('NONE','POOR','OUTDATED','AVERAGE','MODERN','UNKNOWN')),
  opportunity_score INTEGER CHECK (opportunity_score IS NULL OR (opportunity_score >= 0 AND opportunity_score <= 100)),
  priority TEXT CHECK (priority IS NULL OR priority IN ('A','B','C','PASS')),
  current_state TEXT NOT NULL DEFAULT 'NEW',
  automation_paused INTEGER NOT NULL DEFAULT 0 CHECK (automation_paused IN (0,1)),
  human_required INTEGER NOT NULL DEFAULT 0 CHECK (human_required IN (0,1)),
  assigned_to TEXT,
  last_action_at TEXT,
  next_action_at TEXT,
  last_error TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, validation_status TEXT CHECK (validation_status IS NULL OR validation_status IN ('PENDING','VALID','INVALID','NEEDS_RESEARCH','HUMAN_REVIEW')), qualification_reason TEXT, score_breakdown_json TEXT, research_source_count INTEGER NOT NULL DEFAULT 0, last_researched_at TEXT, outreach_eligible INTEGER NOT NULL DEFAULT 0 CHECK (outreach_eligible IN (0,1)), street_address TEXT, postal_code TEXT, website_status TEXT CHECK (website_status IS NULL OR website_status IN ('NONE','ACTIVE','BROKEN','PARKED','SOCIAL_ONLY','PLACEHOLDER','UNKNOWN')), phone_verified INTEGER NOT NULL DEFAULT 0 CHECK (phone_verified IN (0,1)), email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0,1)), website_gap_status TEXT NOT NULL DEFAULT 'UNKNOWN'
  CHECK (website_gap_status IN ('ELIGIBLE','INELIGIBLE','REVIEW','MANUAL_OVERRIDE','UNKNOWN')), website_gap_reason TEXT, manual_state_reason TEXT, manual_state_updated_at TEXT, manual_state_updated_by TEXT, previous_state_before_disqualification TEXT, phone_e164 TEXT);

CREATE TABLE IF NOT EXISTS member_addons (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  addon_id TEXT NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_item_id TEXT,
  added_at TEXT NOT NULL
, stripe_subscription_id TEXT, canceled_at TEXT);

CREATE TABLE IF NOT EXISTS member_services (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS member_sessions (
  token TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, pricing_unlocked INTEGER NOT NULL DEFAULT 0, pricing_unlocked_at TEXT, email_verified_at TEXT);

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_conversation_state (
  lead_id TEXT PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'NEW',
  last_intent TEXT,
  last_inbound_at TEXT,
  last_outbound_at TEXT,
  followup_sequence INTEGER NOT NULL DEFAULT 0,
  human_takeover INTEGER NOT NULL DEFAULT 0 CHECK (human_takeover IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_email_messages (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
  provider TEXT NOT NULL DEFAULT 'GMAIL',
  provider_message_id TEXT,
  provider_thread_id TEXT,
  rfc_message_id TEXT,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  intent TEXT,
  is_test INTEGER NOT NULL DEFAULT 1 CHECK (is_test IN (0,1)),
  error_code TEXT,
  error_message TEXT,
  raw_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_email_test_allowlist (
  email TEXT PRIMARY KEY,
  label TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_escalations (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  intent TEXT,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','HIGH','URGENT')),
  reason TEXT NOT NULL,
  summary TEXT,
  recommended_action TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT
);

CREATE TABLE IF NOT EXISTS outreach_followups (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence_step INTEGER NOT NULL,
  due_at TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DRAFTED','CANCELLED','SENT','SKIPPED','FAILED')),
  reason TEXT,
  is_test INTEGER NOT NULL DEFAULT 1 CHECK (is_test IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_intake (
  order_id TEXT PRIMARY KEY REFERENCES outreach_orders(id) ON DELETE CASCADE,
  details_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_messages (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
  channel TEXT NOT NULL DEFAULT 'SMS' CHECK (channel IN ('SMS')),
  provider TEXT NOT NULL DEFAULT 'TWILIO',
  provider_message_sid TEXT,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  intent TEXT,
  is_test INTEGER NOT NULL DEFAULT 1 CHECK (is_test IN (0,1)),
  error_code TEXT,
  error_message TEXT,
  raw_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_orders (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  plan_key TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  due_today_cents INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'card',
  commitment_months INTEGER NOT NULL DEFAULT 0,
  terms_accepted_at TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  checkout_session_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_permissions (
  lead_id TEXT PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  sms_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (sms_status IN ('UNKNOWN','OPTED_IN','OPTED_OUT')),
  consent_source TEXT,
  consent_evidence TEXT,
  consent_at TEXT,
  revoked_at TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_provider_credentials (
  provider TEXT PRIMARY KEY,
  client_id TEXT,
  encrypted_client_secret TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_reply_drafts (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  inbound_message_id TEXT REFERENCES outreach_messages(id) ON DELETE SET NULL,
  intent TEXT NOT NULL,
  action TEXT NOT NULL,
  body TEXT,
  confidence REAL NOT NULL DEFAULT 0.8,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','CANCELLED','SENT')),
  is_test INTEGER NOT NULL DEFAULT 1 CHECK (is_test IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, channel TEXT NOT NULL DEFAULT 'SIMULATION', provider_thread_id TEXT);

CREATE TABLE IF NOT EXISTS outreach_sequence_steps (
  id TEXT PRIMARY KEY,
  sequence_id TEXT NOT NULL REFERENCES outreach_sequences(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  step_no INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('EMAIL','SMS','VOICE','SOCIAL')),
  due_at TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','RUNNING','SENT','SKIPPED','FAILED','CANCELLED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  sent_message_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(sequence_id, step_no)
);

CREATE TABLE IF NOT EXISTS outreach_sequences (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL DEFAULT 'EMAIL_FIRST',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','COMPLETED','CANCELLED','FAILED')),
  current_step INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  next_action_at TEXT,
  stop_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_test_allowlist (
  phone TEXT PRIMARY KEY,
  label TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_unsubscribe_tokens (
  token TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS prospect_candidate_events (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY(candidate_id) REFERENCES prospect_candidates(id) ON DELETE CASCADE,
  FOREIGN KEY(campaign_id) REFERENCES prospecting_campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prospect_candidates (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  external_id TEXT,
  business_name TEXT NOT NULL,
  category TEXT,
  phone TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  google_url TEXT,
  google_rating REAL,
  google_reviews INTEGER,
  website_presence TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (website_presence IN ('NONE','HAS_WEBSITE','UNKNOWN')),
  website_url TEXT,
  source_url TEXT,
  target_match TEXT NOT NULL DEFAULT 'MATCH' CHECK (target_match IN ('MATCH','ADJACENT','OFF_TARGET')),
  status TEXT NOT NULL DEFAULT 'DISCOVERED' CHECK (status IN ('DISCOVERED','DUPLICATE','FILTERED','QUEUED','ENRICHING','ENRICHED','FAILED')),
  filter_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TEXT,
  last_error TEXT,
  enriched_lead_id TEXT,
  discovered_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(campaign_id) REFERENCES prospecting_campaigns(id),
  FOREIGN KEY(enriched_lead_id) REFERENCES leads(id),
  UNIQUE(campaign_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS prospect_provider_usage (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  candidate_id TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('CLAUDE','OPENAI','HYPERAGENT')),
  stage TEXT NOT NULL CHECK (stage IN ('DISCOVERY','ENRICHMENT')),
  status TEXT NOT NULL CHECK (status IN ('SUCCESS','FAILED')),
  model TEXT,
  input_units INTEGER,
  output_units INTEGER,
  estimated_cost_usd REAL,
  error TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(campaign_id) REFERENCES prospecting_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY(candidate_id) REFERENCES prospect_candidates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS prospecting_campaigns (
  id TEXT PRIMARY KEY,
  industry TEXT NOT NULL,
  geography_json TEXT NOT NULL DEFAULT '[]',
  provider TEXT NOT NULL DEFAULT 'EXTERNAL',
  status TEXT NOT NULL CHECK (status IN ('DRAFT','READY','RUNNING','COMPLETED','FAILED','PAUSED')),
  requested_count INTEGER,
  raw_count INTEGER NOT NULL DEFAULT 0,
  ingested_count INTEGER NOT NULL DEFAULT 0,
  qualified_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, min_rating REAL, min_reviews INTEGER, runner_id TEXT, claimed_at TEXT, started_at TEXT, completed_at TEXT, last_error TEXT, model TEXT NOT NULL DEFAULT 'sonnet', updated_by TEXT, archived_at TEXT, archived_by TEXT, discovery_passes INTEGER NOT NULL DEFAULT 0, last_stage TEXT NOT NULL DEFAULT 'LEGACY', geography_mode TEXT NOT NULL DEFAULT 'LOCATIONS' CHECK (geography_mode IN ('LOCATIONS','RADIUS')), center_location TEXT, radius_miles INTEGER CHECK (radius_miles IS NULL OR (radius_miles >= 1 AND radius_miles <= 100)), discovery_provider TEXT NOT NULL DEFAULT 'CLAUDE' CHECK (discovery_provider IN ('AUTO','CLAUDE','OPENAI','HYPERAGENT')), enrichment_provider TEXT NOT NULL DEFAULT 'CLAUDE' CHECK (enrichment_provider IN ('AUTO','CLAUDE','OPENAI','HYPERAGENT')), fallback_enabled INTEGER NOT NULL DEFAULT 1 CHECK (fallback_enabled IN (0,1)), offering TEXT NOT NULL DEFAULT 'WEBSITE' CHECK (offering IN ('WEBSITE','CONCIERGE')));

CREATE TABLE IF NOT EXISTS prospector_jobs (
  id TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  category TEXT NOT NULL,
  radius_miles INTEGER NOT NULL DEFAULT 15,
  target_count INTEGER NOT NULL DEFAULT 20,
  cadence_days INTEGER NOT NULL DEFAULT 21,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  last_run_at TEXT,
  last_campaign_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL, offering TEXT NOT NULL DEFAULT 'WEBSITE' CHECK (offering IN ('WEBSITE','CONCIERGE')),
  UNIQUE(city, state, category),
  FOREIGN KEY(last_campaign_id) REFERENCES prospecting_campaigns(id)
);

CREATE TABLE IF NOT EXISTS quote_events (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  send_token TEXT,
  event_type TEXT NOT NULL,
  source TEXT,
  email TEXT,
  user_agent TEXT,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quote_sends (
  token TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  recipient_name TEXT,
  included_invite INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('SENT','FAILED')),
  provider_message_id TEXT,
  error TEXT,
  open_count INTEGER NOT NULL DEFAULT 0,
  first_opened_at TEXT,
  last_opened_at TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  first_viewed_at TEXT,
  last_viewed_at TEXT,
  sent_by TEXT,
  sent_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  title TEXT NOT NULL,
  message TEXT,
  terms TEXT,

  line_items_json TEXT NOT NULL DEFAULT '[]',
  one_time_cents INTEGER NOT NULL DEFAULT 0,
  monthly_cents INTEGER NOT NULL DEFAULT 0,
  valid_until TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','VIEWED','ACCEPTED','DECLINED','VOID')),
  first_sent_at TEXT,
  last_sent_at TEXT,
  open_count INTEGER NOT NULL DEFAULT 0,
  first_opened_at TEXT,
  last_opened_at TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  first_viewed_at TEXT,
  last_viewed_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, view_alert_sent_at TEXT);

CREATE TABLE IF NOT EXISTS runner_status (
  runner_id TEXT PRIMARY KEY,
  hostname TEXT,
  claude_version TEXT,
  claude_login TEXT,
  status TEXT NOT NULL DEFAULT 'ONLINE',
  current_campaign_id TEXT,
  last_seen_at TEXT NOT NULL,
  last_error TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
, price_cents INTEGER NOT NULL DEFAULT 0, is_custom_quote INTEGER NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS social_accounts (
  member_id TEXT PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  vista_profile_group_id TEXT
);

CREATE TABLE IF NOT EXISTS social_intake (
  order_id TEXT PRIMARY KEY REFERENCES social_orders(id) ON DELETE CASCADE,
  details_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS social_orders (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  plan_key TEXT NOT NULL DEFAULT 'none',
  plan_name TEXT,
  setup_included INTEGER NOT NULL DEFAULT 0,
  monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  due_today_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  checkout_session_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, payment_method TEXT NOT NULL DEFAULT 'card', commitment_months INTEGER NOT NULL DEFAULT 0, terms_accepted_at TEXT, ad_spend_cents INTEGER NOT NULL DEFAULT 0, ad_management_fee_cents INTEGER NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  member_id TEXT PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT,
  plan_name TEXT,
  current_period_end TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppressions (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  phone TEXT,
  email TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('OPT_OUT','CUSTOMER','BAD_NUMBER','LEGAL_BLOCK','MANUAL_BLOCK')),
  source TEXT NOT NULL,
  created_at TEXT NOT NULL, phone_e164 TEXT,
  CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS system_flags (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_outreach_sequence_per_lead ON outreach_sequences(lead_id) WHERE status IN ('ACTIVE','PAUSED');

CREATE INDEX IF NOT EXISTS idx_admin_sessions_email ON admin_sessions(email);

CREATE INDEX IF NOT EXISTS idx_agent_runs_lead ON agent_runs(lead_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_reports_member ON analytics_reports(member_id, period DESC);

CREATE INDEX IF NOT EXISTS idx_approval_tokens_member ON approval_tokens(member_id);

CREATE INDEX IF NOT EXISTS idx_campaign_prospects_campaign ON campaign_prospects(campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_prospects_lead ON campaign_prospects(lead_id);

CREATE INDEX IF NOT EXISTS idx_candidate_events_campaign ON prospect_candidate_events(campaign_id, created_at);

CREATE INDEX IF NOT EXISTS idx_candidate_events_candidate ON prospect_candidate_events(candidate_id, created_at);

CREATE INDEX IF NOT EXISTS idx_candidates_campaign_status ON prospect_candidates(campaign_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_candidates_name_city ON prospect_candidates(business_name, city, state);

CREATE INDEX IF NOT EXISTS idx_candidates_phone ON prospect_candidates(phone);

CREATE INDEX IF NOT EXISTS idx_candidates_retry ON prospect_candidates(status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_change_requests_member ON change_requests(member_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_orders_lead ON client_orders(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_proposals_status ON client_proposals(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_deferred_events_status ON deferred_events(status, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deferred_events_unique
  ON deferred_events(lead_id, reason) WHERE status = 'DEFERRED';

CREATE INDEX IF NOT EXISTS idx_demo_events_lead_created ON demo_events(lead_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_demo_events_site_created ON demo_events(demo_site_id,created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_demo_jobs_active_lead
ON demo_jobs(lead_id) WHERE status IN ('PENDING','CLAIMED','BUILDING','QA','READY');

CREATE INDEX IF NOT EXISTS idx_demo_jobs_lease ON demo_jobs(status, lease_expires_at);

CREATE INDEX IF NOT EXISTS idx_demo_jobs_status_retry ON demo_jobs(status,next_retry_at,created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_demo_sites_lead_current ON demo_sites(lead_id) WHERE status IN ('READY','PUBLISHED');

CREATE INDEX IF NOT EXISTS idx_demo_sites_status ON demo_sites(status,updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_from_created ON outreach_email_messages(from_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_lead_created ON outreach_email_messages(lead_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_provider_message_id ON outreach_email_messages(provider_message_id) WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_thread ON outreach_email_messages(provider_thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_escalations_lead_created ON outreach_escalations(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_escalations_status_created ON outreach_escalations(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_idempotency ON events(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_lead_created ON events(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

CREATE INDEX IF NOT EXISTS idx_followups_due ON outreach_followups(status, due_at);

CREATE INDEX IF NOT EXISTS idx_followups_lead ON outreach_followups(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_member ON invoices(member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_lead ON jobs(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, created_at);

CREATE INDEX IF NOT EXISTS idx_lead_research_lead ON lead_research(lead_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_research_unique_lead ON lead_research(lead_id);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

CREATE INDEX IF NOT EXISTS idx_leads_next_action ON leads(next_action_at);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

CREATE INDEX IF NOT EXISTS idx_leads_phone_e164 ON leads(phone_e164);

CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);

CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(current_state);

CREATE INDEX IF NOT EXISTS idx_leads_website_gap_status ON leads(website_gap_status);

CREATE INDEX IF NOT EXISTS idx_member_addons_member ON member_addons(member_id);

CREATE INDEX IF NOT EXISTS idx_member_services_member ON member_services(member_id);

CREATE INDEX IF NOT EXISTS idx_member_sessions_member ON member_sessions(member_id);

CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

CREATE INDEX IF NOT EXISTS idx_outreach_messages_lead_created ON outreach_messages(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_messages_phone_created ON outreach_messages(from_number, to_number, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_messages_provider_sid ON outreach_messages(provider_message_sid) WHERE provider_message_sid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_orders_status ON outreach_orders(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_sequences_status_next ON outreach_sequences(status, next_action_at);

CREATE INDEX IF NOT EXISTS idx_outreach_steps_due ON outreach_sequence_steps(status, due_at);

CREATE INDEX IF NOT EXISTS idx_outreach_steps_lead ON outreach_sequence_steps(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prospecting_campaigns_offering ON prospecting_campaigns(offering, status);

CREATE INDEX IF NOT EXISTS idx_prospecting_campaigns_status ON prospecting_campaigns(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prospector_jobs_due ON prospector_jobs(active, last_run_at);

CREATE INDEX IF NOT EXISTS idx_prospector_jobs_offering ON prospector_jobs(offering, active, last_run_at);

CREATE INDEX IF NOT EXISTS idx_provider_usage_campaign ON prospect_provider_usage(campaign_id, created_at);

CREATE INDEX IF NOT EXISTS idx_provider_usage_provider ON prospect_provider_usage(provider, stage, status, created_at);

CREATE INDEX IF NOT EXISTS idx_quote_events_quote ON quote_events(quote_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quote_sends_email ON quote_sends(email);

CREATE INDEX IF NOT EXISTS idx_quote_sends_quote ON quote_sends(quote_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_lead ON quotes(lead_id);

CREATE INDEX IF NOT EXISTS idx_quotes_updated ON quotes(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reply_drafts_lead_created ON outreach_reply_drafts(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reply_drafts_status_created ON outreach_reply_drafts(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_orders_status ON social_orders(status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppressions_email ON suppressions(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suppressions_email_lower ON suppressions(lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppressions_phone ON suppressions(phone) WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suppressions_phone_e164 ON suppressions(phone_e164);

CREATE INDEX IF NOT EXISTS idx_unsubscribe_lead ON outreach_unsubscribe_tokens(lead_id);
