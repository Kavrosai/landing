# Campaign 1 technical brief — working outline

**Campaign:** "Can you prove what your AI agent touched?"
**Audience:** CISOs, security architects, platform engineering leads, AI product owners
**Format:** 6–8 pages (~2,500–3,500 words + 3 diagrams). Public page on kavros.ai (`brief.html`) + PDF export. No lead gate — the CTA is the 20-minute assessment, per the campaign plan.
**Claims rule:** every technical statement maps to a shipped 0.2.22 capability and the assurance coverage map. Release stamp in the footer. The honesty section is prominent, not buried.

---

## Page 1 — Executive summary (½–1 page)

**Hook.** Your agents have credentials. Logs tell you what happened next — they do not tell you what was *allowed*, what was *refused*, or whether the thing that enforced the decision is the thing you approved.

**The three questions every agent deployment should answer:**
1. What is this workload allowed to touch — and who approved that?
2. When it acts, what exactly was evaluated, by what code, under what policy?
3. After the fact, what evidence can you hand an auditor that they can verify themselves?

**The Kavros answer in one paragraph.** Self-hosted governance plane. Every model request and governed tool call is evaluated inside an AWS Nitro Enclave whose measurement is pinned and human-verified. Decisions carry enclave-signed receipts whose attestation is fully appraised on-path — before anything is forwarded. Evidence is hash-chained, exportable, and independently checkable.

**The evidence chain (diagram 1):** signed release → approved measurement → per-request enclave receipt → hash-chained audit → export. One line under it: *each link is verifiable independently of the previous one.*

**CTA strip:** 20-minute architecture assessment → security@kavros.ai.

---

## Page 2 — The problem: agents have credentials, not judgment (1 page)

- The agent threat model in enterprise terms: legitimate credentials + manipulable behavior. Untrusted content (retrieved documents, DB rows, tool output, web pages) can attempt to redirect a model while every trusted instruction stays byte-for-byte unchanged.
- Why existing controls don't answer the questions:
  - Network controls see destinations, not decisions.
  - Application logs record outcomes, not the policy that produced them — and logs are editable by the system that wrote them.
  - Egress proxies can't attribute spend to a workload, stop one agent without stopping all, or explain what the DLP boundary redacted.
- The governance gap is *evidence*, not more rules: an auditor asks "how do you know?" — today's honest answer is usually "we have logs."

**Key message:** logs are an account of what a system says it did. Proof binds the account to something the system cannot forge after the fact.

---

## Page 3 — Architecture: the enforcement boundary (1–1.5 pages)

**Diagram 2:** agent/workflow/managed-inference → control plane (policy, identity, metering) → data plane (in customer AWS) → Nitro Enclave (allowlist + DLP + decision) → provider.

Content blocks:
- **Signed policy.** Ed25519-signed runtime policies, two-person approval, version history, simulation, rollback. Policy signature verified inside the enclave; unsigned runtime policy is ignored (baked policy only).
- **The enclave is the only path.** The data plane is the sole vsock client of the enclave gateway; every mediated provider call crosses it. The enclave decides on the exact action, target, and content — allowlist matching and DLP regexes run in isolated memory, not in a shared process.
- **Fail-closed posture.** Missing receipt, stale challenge, digest mismatch, or unparseable decision → nothing is forwarded. Redirects come back for a fresh decision; they are never followed silently.
- **Self-hosted boundary.** Control plane, data plane, database, and enclave all run in the customer's AWS account. Provider keys stay customer-held (BYOK) and encrypted at rest.

---

## Page 4 — Attestation you can check (1–1.5 pages)

Plain-language mechanics, no hand-waving:
- **Measurement.** At deploy, the enclave image is built on the customer's Nitro host and measured (PCR0/1/2). The measurement is registered in a release registry.
- **Human approval with a mechanical gate.** The registration is approved automatically when it matches the measurement the runtime itself pins at deploy time (`DP_APPROVED_PCR0`); anything else — malformed, mismatched, missing — routes to administrator review with a server-side comparison gate before it can become the deployment reference.
- **Per-request proof.** Each decision receipt is enclave-signed (Ed25519) and accompanied by an NSM attestation document: a COSE quote whose ES384 signature chains — order-agnostically — to the pinned AWS Nitro root of trust. The quote binds the one-use challenge (anti-replay), the receipt-signature digest (receipt↔quote binding), and the enclave's public key.
- **On-path appraisal, fail closed.** The data plane verifies all of the above *before forwarding*. A quote from any other enclave image — even a valid AWS quote — is refused. This is enforced per request, not at boot.

**Signed releases.** Release artifacts ship with a signed manifest, SBOM, and build provenance; deployment hosts verify checksums and pull digest-pinned images from the customer's own registry. The chain starts before the enclave does.

---

## Page 5 — Evidence: from decision to export (1–1.5 pages)

- **What a receipt contains:** decision, request digest (exact content), policy digest (exact effective policy), request ID, TTL, enclave public key, signature.
- **Hash-chained audit trail.** Administrative actions, approvals, denials, and attestation records chain cryptographically; the dashboard verifies the chain and exports carry it.
- **Exports.** SOC 2-style JSON/CSV bundles: audit records with chain hashes, policy approval timelines with proposer/approver identities, incident timelines, attestation records, the measurement registry with its approval history.
- **Model coverage.** A coverage view shows every provider-bound model request the data plane observed, by the governed surface that sent it (managed inference, employee chat, workflow) — plus explicit gap signals: unattributed provider calls and managed-inference requests that never reached the enclave path.
- **Verify it yourself** (boxed example):
  ```
  kavros explain 403 --body '{"error":"Blocked by Kavros", ...}'
  # → what happened, whether anything reached the target, what to do next
  ```

---

## Page 6 — What this does not prove (½–1 page — the differentiator)

Stated as prominently as the claims:
- Attestation proves the enclave code and configuration — not that the policy is correct, that an allowed action is wise, or that the model provider is trustworthy.
- A measured runtime can still be prompt-injected. Injection changes model *behavior*, not instruction *bytes*; no boundary observation rules it out.
- Coverage counts what Kavros observed. Traffic that never crosses the data plane — a workload calling a provider directly, where network controls allow — is not counted and is labeled as unobservable. A clean panel is not a no-bypass claim.
- Kavros supports compliance evidence collection; it does not make an organization SOC 2, ISO 42001, or EU AI Act compliant by itself.
- Control plane: the evidence chain lives in customer infrastructure. Where the threat model includes a privileged database administrator, anchor summaries to an external system.

**Key message:** every vendor claims the top of this list. The differentiator is stating the bottom of it.

---

## Page 7 — Deployment and evaluation (½–1 page)

- Tiers in three lines each (Business / Enterprise / Regulated) — deployment scope, support, evidence surface; no per-rule pricing.
- AWS footprint summary: control plane + data plane + enclave on Nitro instances; Terraform with hardened defaults; private hosts, no SSH, RDS deletion protection.
- **The 15-day proof** (Campaign 2 teaser): one workload onboarded, one approved policy, one blocked-unsafe-action demonstration, one DLP redaction test, one metering report, one evidence export, one operator handoff.
- Pre-flight checklist (the plan's): agent inventory, policy ownership, DLP boundary, spend attribution, halt path.

## Page 8 — CTA (¼ page)

- 20-minute architecture assessment (calendar link + security@kavros.ai).
- Links: security.html (claims, release-stamped), docs compliance page (evidence mechanics), the blog posts (drift, scheduled runs, CVE-2026-21852 disclosure).
- Footer: release stamp 0.2.22 · September 2026 · trademark pending notice.

---

## Diagrams to produce (3 total)

1. **Evidence chain** (p.1): release → measurement → receipt → audit chain → export; "verifiable independently" annotation.
2. **Enforcement boundary** (p.3): request flow with the enclave as the decision point; blocked-path branch shown; everything inside the customer AWS box.
3. **Attestation verification** (p.4): receipt + quote + challenge + PCR0 pin, with the four fail-closed checks enumerated.

## Internal claims-to-source mapping (fact-check appendix — not published)

| Brief claim | Source of truth |
|---|---|
| On-path quote appraisal: chain to AWS root, challenge/user_data/key bindings, PCR0 pin, fail closed | Coverage map row 1 (A2+A1); DP `quote_appraisal.rs` (PR #123) |
| Measurement registry: staged → approved; deploy-pin auto-verification; comparison-gated review | Coverage map "Release registry review surface (F-02)"; PRs #122, #126 |
| Signed releases: manifest, SBOM, provenance, digest-pinned pulls | Coverage map "Release provenance (F-06 step 3)"; PRs #118/#119 |
| Model coverage: channel attribution, unattributed/unreachable signals, observed-only scope | Coverage map "Model coverage (F-07)"; PRs #128/#129 |
| Signed policy, two-person approval, hash-chained audit, exports | security.html (release-stamped), docs compliance page |
| Tiers/pricing hypothesis | Marketing plan §Pricing ($2.5k / $7.5k / $18k starting points) |

## Open decisions before writing prose

1. Diagram style (match landing's Tailwind/dark aesthetic vs. neutral PDF line art — recommend neutral for print, brand colors online).
2. Whether the 15-day proof section names a price ($7,500 fixed per the plan) or says "fixed-scope, credited toward conversion."
3. Trademark footnote wording ("Kavros is a trademark of …, pending registration" — confirm with counsel).
4. Whether `kavros explain` ships in the CLI today — verify before the "verify it yourself" box goes to print.
