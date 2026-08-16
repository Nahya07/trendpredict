/**
 * Starter keyword set the scheduled jobs track out of the box. In production this list
 * should be sourced from the `keywords` table (seeded by the Trend Discovery / keyword
 * expansion engine described in docs/ROADMAP.md — Req #10), not hard-coded. Keeping a
 * small static list here means the app has something real to collect/score on first boot,
 * even before that engine is built.
 */
export const TRACKED_KEYWORDS: string[] = [
  'mini fan portable',
  'mini vacuum cleaner',
  'powerbank magnetik',
  'lampu tidur karakter',
  'botol minum lipat',
  'organizer kabel magnetik',
  'sunscreen stick',
  'tumbler self stirring',
  'holder hp mobil magnetik',
  'kipas leher portable',
];
