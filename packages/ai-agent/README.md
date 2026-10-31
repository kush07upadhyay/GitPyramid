# packages/ai-agent

Status: planned (R2 Architect). Nothing is built here yet.

The Stack Architect: retrieval, the LLM adapter with a fallback chain, schema-constrained output,
the deterministic SPDX license rules and the budget cap that fails closed.

Rules that apply from day one ([constitution principle VI](../../.specify/memory/constitution.md)):

- Manifest text is untrusted. The model may only choose brick ids that were in its prompt.
- License advice comes from a rule table, never from the model, and says it is not legal advice.
- Providers sit behind one small interface so a free-tier change is not a rewrite.
