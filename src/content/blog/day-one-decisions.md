---
title: "The twenty decisions that get expensive in month six"
description: "Tenancy, audit and money are cheap to decide before the first module and painful to change once there is data. What I learned shipping eight production systems in a year."
date: 2026-08-26
category: "Backend Architecture"
draft: false
---

Every backend project I have worked on had a moment, somewhere around month six, where
someone asked a question that should have been answered on day one. Can this user see
another branch's data? Is that column a float? Who changed this row?

By then the answer is never "let me fix that." It is "let me fix that, and backfill
forty thousand rows, and check every query that touches this table."

The fix is not more discipline later. It is twenty questions answered in writing before
the first module exists. Here are the ones that have actually cost me something.

## Tenancy is not one decision, it is four

"Is this multi-tenant?" is the easy part. The expensive parts come after.

**Scoped by what?** Branch, company, workspace, customer. These are not
interchangeable. A system scoped by branch where someone later wants company-level
reporting is a rewrite, not a feature.

**Which tables are scoped, and which are deliberately shared?** "Scope everything" is
wrong and it is the default mistake. Configuration, permission definitions and reference
data are usually shared. Writing the list forces you to notice the tables that do not
fit either category, and those are where the bugs live.

**Can a user cross tenants?** If yes, the same query returns different rows for
different people. That is the hardest part of the whole feature and it should be a
decision, not a discovery.

**Does the database enforce it, or does every query?** Row-level security in Postgres
costs you some flexibility. Application-side scoping costs you a silent data leak the
first time someone forgets a filter. Pick knowingly.

## The audit trail has to be append-only, and it has to be early

Retrofitting an audit trail gives you a table that starts on the day you added it. Every
question anyone actually asks — who changed this, when did it become that — is about the
period before.

Append-only is the part people skip. If a row in the audit log can be updated or deleted
by application code, it is not an audit log, it is a table with optimistic naming. Record
the actor, the action, the resource and a detail payload, and never expose an update path.

## What a document remembers about the day it was issued

This one cost me the most, and it is not obvious until it bites.

A purchase order shows a vendor's name and address. The natural implementation joins to
the vendor table. Then the vendor moves office, someone updates the address, and every
purchase order you ever issued now shows an address that was not true when you issued it.

Documents that have been sent to someone else need a **snapshot** of the identity they
were issued against, frozen at issue time. Live reads are correct for a screen. They are
wrong for anything that has already left the building.

The general rule I use now: if a person outside the company has a copy of it, the data on
it stops being a query and starts being a record.

## Money is a decimal with a currency, always

Float money is a well-known mistake and people still ship it, usually because the first
feature is a quantity field that seemed harmless.

Decide the type and the scale once, store the currency alongside every amount even in a
single-currency system, and decide where rounding happens. Rounding in three places with
two different rules is a reconciliation bug that surfaces as a customer complaint.

## Why writing them down is the actual mechanism

You could hold all of this in your head on a small project. The point is not that the
decisions are hard. The point is that in month six there will be someone else on the
codebase, and their instinct will be different from yours, and the only thing that
settles it is a document with a date on it.

I keep these as one short decision record each — the question, the answer, and what it
cost to decide. Not because anyone enjoys writing them, but because the alternative is
having the same argument three times and losing the reasoning each time.

The twenty questions take an afternoon. Month six takes a week.
