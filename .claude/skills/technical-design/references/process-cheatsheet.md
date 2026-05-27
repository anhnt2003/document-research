# Process cheatsheet — load when actively designing

This is the operational companion to SKILL.md. SKILL.md teaches the posture; this file gives you the lookup tables. Load this when you're in the middle of a design and need a concrete list to scan.

## Decomplecting checklist

When evaluating a design, scan for these common braids. Each is something you can pull apart.

| Braided | Pull apart into |
|---|---|
| State + identity | A value (now) + an identity (which can refer to different values over time) |
| Data + behavior | Data as values + functions that operate on them |
| What + how | Specification (what must be true) + implementation (one way to make it true) |
| Policy + mechanism | The rule + the means of enforcing it |
| Reading + validating | Parse into a typed value at the edge; trust it inside |
| Dispatch + interface + implementation | "Polymorphism à la carte" — separate who answers from what's asked from how it's answered |
| Algorithm + collection | Transformations that don't care about the container |
| Computation + time | Pure functions vs scheduled effects |
| Process + place | Where the work is defined vs where it runs |
| Configuration + deployment | What the system does vs which environment it's in |

You don't have to decomplect everything. You have to be able to *see* the braids and choose deliberately.

## Anti-patterns to actively avoid

- **Jumping to implementation.** "Let me show you the code..." before stating the problem. State the problem first.
- **Planning the execution of an unverified solution.** The user proposes a rewrite, a new service, a migration. You start designing how. Stop — first check whether the proposed solution actually addresses the stated problem.
- **Pattern-matching to a framework.** "This is just a CRUD app, so we'll use [framework]." Maybe — but state the problem first, then check whether the framework's shape actually fits.
- **Confusing familiarity for simplicity.** "Everyone knows ORMs, so let's use one." Familiar ≠ simple. Name the braids.
- **Defending a design with adjectives.** "It's clean, scalable, maintainable, robust." These are aspirations, not properties. Describe what is *separated from what* and what is *composed with what*.
- **Hiding decisions inside cleverness.** A clever one-liner that conflates three concerns is not a design — it is a postponed debugging session.
- **Asking ten questions at once.** If you must ask, ask the load-bearing question first and follow up.
- **Asking no questions at all.** If you make ten silent assumptions, the user will discover them at the worst possible time. Flag them.
- **"Future-proofing" abstractions.** Don't design for a hypothetical second use case. Design for the actual problem; the second use case will tell you what shape it actually needed.
- **Resume-driven design.** Don't introduce a new technology because it's interesting. Introduce it because it specifically cuts a braid that matters.

## Sources of incidental complexity

When asking "what's incidental vs essential?", these are common sources:

- A framework's conventions leaking into the domain model
- Mixing "what the data is" with "how it's stored"
- Mixing "what is true" with "when it became true"
- Inheritance hierarchies imposed where composition would do
- Conflating identity with state, value, time, or place
- Synchronous coupling between things that don't actually need to happen together
- Behavior braided into data ("the object knows how to save itself")

When you spot incidental complexity, name it explicitly: "We could couple X and Y here — I chose not to because Z."

## Design output template (full form)

For multi-week designs. Scale down ruthlessly for smaller tasks — see SKILL.md's calibration guidance.

```
## Problem
[2–5 sentences in plain language. No jargon, no implementation.]

## What we know / what's assumed
- Known constraints, requirements, data shapes
- Things I'm assuming (flag these explicitly so the user can correct)
- Open questions (if any — and if any are load-bearing, stop and ask before continuing)

## Shape of the data
[Describe the values and how they flow. Data first, behavior second.]

## Design
[The actual proposal. Include:
 - What's separated from what, and why
 - What's intentionally kept simple (and what easy thing we're declining)
 - Where the boundaries are (process, persistence, trust, time)
 - What's left for later]

## Trade-offs
- What this design is good at
- What it gives up
- What alternative we considered and why we didn't pick it

## Risks / things to watch
- Failure modes
- Decisions that are sticky / hard to reverse
- Anything we should escalate before implementing
```
