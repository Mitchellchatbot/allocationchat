# Demo Data Cleanup Guide

**User:** James@scaledai.org  
**User ID:** `6f73e4bd-d333-4502-97cb-c3626a18c643`  
**Created:** 2026-03-10

---

## Property

| Name | ID |
|---|---|
| Horizon Behavioral Health Center | `a1b2c3d4-0001-4000-8000-000000000001` |

## Visitors

| Name | ID | Lead Source |
|---|---|---|
| Maria Santos | `a1b2c3d4-1001-4000-8000-000000000001` | Google Ads |
| David Chen | `a1b2c3d4-1001-4000-8000-000000000002` | Organic |
| Ashley Morgan | `a1b2c3d4-1001-4000-8000-000000000003` | Organic |
| Robert Williams | `a1b2c3d4-1001-4000-8000-000000000004` | Google Ads |
| Jennifer Park | `a1b2c3d4-1001-4000-8000-000000000005` | Google Ads |
| Marcus Thompson | `a1b2c3d4-1001-4000-8000-000000000006` | Organic |
| Lisa Nguyen | `a1b2c3d4-1001-4000-8000-000000000007` | Google Ads |

## Conversations

| Topic | ID | Status |
|---|---|---|
| PHP intake inquiry (Maria) | `a1b2c3d4-2001-4000-8000-000000000001` | active |
| Insurance verification (David) | `a1b2c3d4-2001-4000-8000-000000000002` | active |
| Anxiety support chat (Ashley) | `a1b2c3d4-2001-4000-8000-000000000003` | active |
| Urgent detox request (Robert) | `a1b2c3d4-2001-4000-8000-000000000004` | pending |
| IOP step-down inquiry (Jennifer) | `a1b2c3d4-2001-4000-8000-000000000005` | active |
| Family counseling (Marcus) | `a1b2c3d4-2001-4000-8000-000000000006` | closed |
| Residential admission (Lisa) | `a1b2c3d4-2001-4000-8000-000000000007` | pending |

## Messages

IDs: `a1b2c3d4-3001-4000-8000-000000000001` through `a1b2c3d4-3001-4000-8000-000000000029` (29 total)

## Analytics Events

120 `page_analytics_events` rows linked to property `a1b2c3d4-0001-4000-8000-000000000001` (randomly generated UUIDs).

---

## Cleanup SQL

```sql
-- Run in this exact order (respects foreign keys)

-- 1. Delete messages
DELETE FROM messages WHERE conversation_id IN (
  'a1b2c3d4-2001-4000-8000-000000000001',
  'a1b2c3d4-2001-4000-8000-000000000002',
  'a1b2c3d4-2001-4000-8000-000000000003',
  'a1b2c3d4-2001-4000-8000-000000000004',
  'a1b2c3d4-2001-4000-8000-000000000005',
  'a1b2c3d4-2001-4000-8000-000000000006',
  'a1b2c3d4-2001-4000-8000-000000000007'
);

-- 2. Delete analytics events
DELETE FROM page_analytics_events WHERE property_id = 'a1b2c3d4-0001-4000-8000-000000000001';

-- 3. Delete conversations
DELETE FROM conversations WHERE property_id = 'a1b2c3d4-0001-4000-8000-000000000001';

-- 4. Delete visitors
DELETE FROM visitors WHERE property_id = 'a1b2c3d4-0001-4000-8000-000000000001';

-- 5. Delete property
DELETE FROM properties WHERE id = 'a1b2c3d4-0001-4000-8000-000000000001';
```
