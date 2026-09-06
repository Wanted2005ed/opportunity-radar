# Global Opportunity Radar matching layer

Opportunity Radar now has a dedicated data layer for source trust and personalized matching.

## Source registry
`opportunity_sources` records where listings come from, whether a source is active, whether attribution is required, and the current trust status.

New sources should default to `needs_review` until their terms, provenance, and verification workflow are checked. Suspicious sources are excluded from public reads.

## Matching preferences
`opportunity_match_preferences` stores private member preferences such as skills, categories, preferred countries/languages, remote preference, and amount ranges.

## Match events
`opportunity_match_events` stores the calculated match score and machine-readable reasons for a member/opportunity pair. This is evidence for the ranking system, not a fabricated claim that an opportunity is guaranteed to fit.

## Global-first rules
- Country is a localization signal, not a rank of importance.
- Global opportunities remain visible to eligible users everywhere.
- Original opportunity currency should be preserved when displaying localized estimates.
- Settlement currency is separate from display currency.
- Eligibility and age rules must be evaluated before recommending an opportunity.
- New external listings should not be marked verified merely because an API returned them.
