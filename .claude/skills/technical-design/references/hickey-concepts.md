# Hickey concepts — extended reference

Read this when a design touches one of these topics specifically. The main SKILL.md gives you the overall posture; this file is for going deeper when the problem calls for it.

## Table of contents
1. [Values, identity, state, time](#1-values-identity-state-time)
2. [Place-Oriented Programming (PLOP)](#2-place-oriented-programming-plop)
3. [Polymorphism à la carte](#3-polymorphism-à-la-carte)
4. [Transducers / decoupling algorithm from collection](#4-transducers--decoupling-algorithm-from-collection)
5. [Spec — specifying *what*, not *how*](#5-spec--specifying-what-not-how)
6. [Design, composition, performance](#6-design-composition-performance)
7. [Effects, time, and the world](#7-effects-time-and-the-world)
8. [The "easy trap" with familiar tools](#8-the-easy-trap-with-familiar-tools)

---

## 1. Values, identity, state, time

These four are frequently braided in software. Pull them apart:

- **Value** — An immutable fact. The number 42. The string "BTCUSDT". A map describing a trade at 10:31:04. A value never changes; if you have a new fact, that's a new value.
- **Identity** — A stable name for a *series* of values. "The current price of BTC" is an identity. The value it refers to changes; the identity does not.
- **State** — The value an identity refers to *at a given moment*. State is not a thing you mutate; it's a snapshot of an identity at a point in time.
- **Time** — The succession of values for an identity. Time is the relationship between states.

Practical consequences:
- Prefer passing values around. They are immutable, comparable by content, safe to share across threads, easy to test, easy to serialize.
- Reserve mutability for *identities* that genuinely have continuous existence across changes — a database, an in-memory cache, a counter.
- When you mutate, do so *transactionally* — replace the value at the identity in one step, not field-by-field.
- A common mistake: treating a domain entity (a "User", an "Order") as a mutable bag. Most domain entities are actually values; the *aggregate that holds them over time* is the identity.

When in doubt: model the data as a value first. Add mutable identity only when the problem demands it.

---

## 2. Place-Oriented Programming (PLOP)

A "place" is a slot in memory whose contents can be overwritten. Variables, struct fields, array cells, database columns. Place-oriented thinking treats programs as a collection of slots you write to and read from.

The hidden cost of places:
- You lose history. Once you overwrite, the old value is gone.
- You can't reason locally — what's true at this place depends on who else has touched it.
- Concurrency becomes painful, because two threads writing to the same place is a race.
- You conflate identity with current value.

Antidote: prefer values over places. When you do need places, make them few, named, and well-bounded. Don't sprinkle mutable state through a program — concentrate it.

This doesn't mean "never mutate". It means: be deliberate about every place you introduce, and treat each as a small piece of state that the rest of the program can read from but doesn't depend on the *layout* of.

---

## 3. Polymorphism à la carte

Classical OO bundles three things together under "polymorphism": who answers, what's asked, how it's answered. Specifically:

- **Dispatch** — *Who* should handle this call? (Type-based, value-based, context-based...)
- **Interface** — *What* operations are available? (The signature.)
- **Implementation** — *How* is each operation realized? (The body.)

Class-based polymorphism welds these together: the class declares all three at once. This is convenient and often fine — but when a problem has interesting structure along any one of these axes, the welding becomes the obstacle.

"À la carte" means: choose what you need.
- Want different implementations of the same interface? Functions with the same signature.
- Want type-based dispatch without inheritance? Multimethods, protocols, traits, type classes.
- Want value-based dispatch (different code for different *data*, not types)? A dispatch function over data.
- Want to add a new operation to existing types without modifying them? Extension methods, protocols, traits.

When a problem feels awkward in classical OO, ask: which of the three did I actually want to vary? Then pick the construct that lets just that vary.

---

## 4. Transducers / decoupling algorithm from collection

A common braid: an algorithm gets tangled up with the container it's applied to. `array.map(...).filter(...).reduce(...)` only works because Array has `map` and `filter` and `reduce`. Want to do the same thing over a stream? A channel? A generator? A custom collection? You have to reimplement.

The decomplecting move: separate the *transformation* (what you do to each item) from the *traversal* (how you walk the container) from the *reduction* (how you combine results). Each can be expressed independently.

Even without Clojure's specific `transducer` primitive, the principle generalizes: when you write an algorithm, ask whether it secretly assumes a particular container. If you can express it as "given a function that consumes one item and produces one item, here's a function that consumes-many and produces-many", you have decoupled it.

Languages and libraries do this differently — iterators, generators, observable pipelines, transducers, stream APIs. The point is: notice when you're about to braid algorithm with container, and consider pulling them apart.

---

## 5. Spec — specifying *what*, not *how*

A specification describes what is true about data. It is not an implementation, not a type definition (necessarily), not a serialization format. It is a *predicate* — a statement about which values are legitimate.

Useful properties of specs:
- They are values themselves — you can compose them, store them, pass them around.
- They can be used for validation (does this value match?), generation (give me a value that matches), and documentation (what is a legitimate value here?).
- They separate "what is a valid order" from "the order class" from "the order schema in the database".

Even in a language without a formal spec library, you can apply this thinking:
- Write down what's true about your data — invariants, ranges, required fields, relationships.
- Keep these specifications separate from the implementations that produce/consume the data.
- Validate at the boundary: parse untrusted input into a value that meets the spec; trust the spec inside.

This isn't a call for ceremonious type gymnastics. It's a call for *being explicit about what your data is*, separately from how it's used.

---

## 6. Design, composition, performance

From "Design, Composition, and Performance":

- **Design** = pulling things apart into independent pieces.
- **Composition** = putting those pieces together to do useful work.
- **Performance** = the result of executing a well-designed, well-composed system.

The order matters. You design *first*, then compose, then run. Trying to perform without designing produces brittle code that "kind of works".

A useful diagnostic: when something feels hard to compose, the design is wrong. Don't paper over the composition with adapter layers — go back and redesign the pieces.

Another useful diagnostic: if you're trying to reuse a piece and you keep needing to drag along context, the piece had hidden dependencies you didn't separate cleanly.

---

## 7. Effects, time, and the world

The world is full of effects: I/O, the network, the clock, randomness, persistence, other processes. The temptation is to scatter effects everywhere — sprinkle `requests.get(...)`, `datetime.now()`, `random.random()`, `db.save(...)` throughout the code.

Cost: nothing is pure. Every function is implicitly time-dependent, network-dependent, IO-dependent. You can't test in isolation. You can't reason locally.

The decomplecting move: **push effects to the edges**. The center of the program is pure transformations of values. The edges talk to the world. The edges are thin.

Concretely:
- Pass current time as an argument rather than calling `now()` inside.
- Pass the database as a parameter rather than reaching for a global.
- Return *descriptions of effects* from pure functions, and execute them at the edge.
- Don't ban effects — concentrate them.

This is just-enough functional discipline, not zealotry. The goal is testable, reasonable code, not purity for purity's sake.

---

## 8. The "easy trap" with familiar tools

A specific failure mode worth calling out: when an LLM (or a developer) reaches for the most familiar tool — ORM, big framework, all-in-one library — because it's near at hand. The familiar tool often comes with strong opinions that braid concerns together. Once adopted, those braids constrain everything downstream.

Examples:
- ORMs braid identity, value, persistence, and behavior into one object.
- Web frameworks often braid routing, serialization, business logic, and persistence into one controller.
- "Smart" client libraries braid network calls with retry policy with serialization with auth.

This isn't a blanket rejection of these tools — they exist because they solve real problems, and rebuilding from scratch is also expensive. But each time you reach for one, **state the braids you're accepting**. Then the user knows what they're paying.

If the answer to "what braids am I accepting?" is "I'm not sure" — that's a signal to learn the tool more deeply or to choose a simpler one.

---

## Further reading (Hickey's talks)

If a deeper question comes up, these are the source talks. The skill encodes the gist of each but the originals are worth recommending to a user who's curious:

- *Simple Made Easy* — simple vs easy, the catalog of braids.
- *Hammock Driven Development* — thinking as the work; the role of unfocused time.
- *The Value of Values* — values vs places; why immutability matters for systems and reasoning.
- *Are We There Yet?* — time, identity, state, concurrency.
- *Design, Composition, and Performance* — what design actually is.
- *Spec-ulation* — versioning, growth, and not breaking things.
- *Maybe Not* — the case against optional fields and against welding presence into schema.
- *Effective Programs* — a meta-talk on what makes programs good in the large.
