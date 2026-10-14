# Solana developer onboarding: the C4 model of the Zama protocol

Date: 2026-10-14. Model: `likec4/` (pins: fhevm feature/solana @ db2feb81f, kms solana @ 294802eb,
tech-spec main). Modelling rules: the header comment of `likec4/spec.c4`.

**Diagrams: <https://kitkhat-docs.github.io/onboarding-zama/diagrams/>** (a static build of the model;
how to run it locally is in § 3 at the end).

## 1. Reading order

Principle: boundaries and flows first, then the internals of what you will touch, and only then the
EVM middle (relayer, Gateway, Ethereum), which is a black box for Solana code. On every view read the
container `description`: the "Decides …" sentence names the trust decision that unit owns, and that is
the main thing to take away from the diagram.

How to read a view: the left panel lists every view; the view ids in parentheses below are what you
type into its search box. Click a container to zoom into its Components view. Dashed edges are reads,
solid edges are state-changing calls, every edge label is "verb + object" with the source as the
subject. Every container and component carries one or more `GitHub: <repo>/<path>` links: click the
element, choose **Open details** in the toolbar that appears, and the details card lists them under
**Links**. They open github.com at the pinned commit (`blob/<sha>` for a file, `tree/<sha>` for a
directory), so what you see is exactly the code the diagram describes, not the current branch head.
`tech-spec` is a private repo: its links return 404 without a GitHub session.

### Step 1. Boundaries

- [ ] **Context · Zama Protocol** (`index`). Who surrounds the protocol: user, dApp developer,
      governance, operator; the external chains and the S3 key store. The question this view answers:
      what the protocol treats as its own and what as foreign.
- [ ] **Containers · Zama Protocol** (`containers`). Twelve deployable units. Find the green group
      "Host chains and dApps" and the zama-host program (Solana): every edge entering it is one of
      the ways someone reads or writes Solana on-chain state.

### Step 2. The two flows everything rests on

- [ ] **Flow · Encrypted input → FHE execution (Solana)** (`inputToComputeSolana`). The write path:
      encryption in the SDK → ZKPoK through the relayer and the Gateway → coprocessor attestation
      comes back to the user → the user sends the application instruction carrying the attestation,
      the program CPIs `fhe_execute` and the host re-verifies the attestation → the coprocessor
      reconstructs the execution from the transaction bytes and computes. Remember: a program never
      acts on its own, and on-chain code works with handles, never with ciphertexts.
- [ ] **Flow · User decryption (Solana)** (`userDecryptionSolana`). The read path: ed25519 permit →
      the relayer pre-checks → Gateway → the KMS connector re-verifies the permit, the ACL and the
      MMR proof → KMS core. Remember: the relayer decides nothing, the connector does.

### Step 3. The program you will change

- [ ] **Components · zama-host program (Solana)** (`solHost`). Eight roles: Admin & pause ·
      Input attestation · Symbolic execution · Compute metering · ACL & grants · Decryption
      authorization · KMS result verification · Events for off-chain, plus two build variants
      tagged `#feature` (Off-chain codec, Cleartext simulator). Component links point at the
      concrete files under `programs/zama-host/src`.
- [ ] **Cross-cut · Host-chain roles, EVM vs Solana** (`hostRoles`). The same roles next to the EVM
      contracts. Useful if you come from the EVM world or read the tech-spec, where much is phrased
      in EVM terms; otherwise skip it.

### Step 4. How an application calls the program

- [ ] **Components · confidential-token (Solana)** (`confidentialToken`). The reference application:
      the `zama-fhe` crate builds one `fhe_execute`, `zama-host (cpi feature)` provides the account
      types and instruction builders.
- [ ] **Components · Specimen programs (Solana)** (`solSpecimens`). Test programs: which ones link
      `zama-fhe` and which call zama-host directly (decryption delegation, pause).
- [ ] **Components · JS SDK** (`sdk`). The `solana` module: permit, userDecrypt, encryptInput,
      submitInputProof, revokePermits. This is the client side of what you implement on-chain.

### Step 5. Who reads your transactions off-chain

- [ ] **Components · Coprocessor** (`coprocessor`). Solana ingestion (Yellowstone gRPC) → Solana
      reconstruction (the same derivation logic as the program, via `zama-solana-acl` and
      `zama-host (decode feature)`) → DB writer; the Leaf-proof server serves MMR proofs to the
      connector. Any change to the instruction or leaf format breaks this chain.
- [ ] **Components · KMS connector** (`kmsConnector`). The Solana authorization pipeline: delegation,
      encrypted_store, handle_binding, snapshot, watermark, proof. Everything you checked on-chain
      is checked here a second time.
- [ ] **Cross-cut · Shared code** (`sharedCode`). The crates tagged `#shared` and the containers they
      sit in: `zama-solana-acl`, `zama-solana-permit`, `zama-solana-request`, `zama-host` in its
      off-chain builds. A change there changes the program, the connector, the relayer and the
      coprocessor at once.

### Step 6. The EVM middle, when needed

- [ ] **Components · Relayer** (`relayer`), **Components · Gateway contracts** (`gateway`),
      **Components · Protocol contracts (Ethereum)** (`protocolContracts`). Needed when your change
      touches the request wire format (`zama-solana-request`) or the relayer pre-checks.
- [ ] **Components · Host contracts (EVM)** (`evmHost`), **Components · dApp contracts (EVM)**
      (`evmApps`) — reference only, for reading EVM-oriented RFCs.

### What the model does not contain

EVM flows, KMS core components, the internals of the `gw-listener` / FHE worker /
`transaction-sender` binaries, the zama-host PDA layout.

## 2. Stakeholders: who owns what you will touch

**Main point of contact among the engineers: Elias Tazartes.** He is the most active committer on
every Solana-facing path (program, crates, SDK, relayer, coprocessor ingestion, connector pipeline)
and can route a request onward to the right team when the table does not answer it.

Teams are the GitHub teams from `fhevm/.github/CODEOWNERS` and `kms/.github/CODEOWNERS` at the pinned
commits. Where decisions are written is the place to read before proposing a change.

| Area (C4 container / component) | Review team | Where decisions are written |
|---|---|---|
| zama-host program, `solana/crates/*`, confidential-token, specimens | `@zama-ai/fhevm-devs` (no dedicated `/solana/` rule) | `solana/docs/DESIGN_DECISIONS.md` (DD-nnn), `solana/docs/INVARIANTS.md`, `solana/docs/GLOSSARY.md` |
| Solana security surface: `solana/docs/AUTHORITY.md`, `INVARIANTS.md`, `authority_table.py`, capability invariants, planted bugs | `@zama-ai/security-team` | the files themselves; a change there needs a security-team review |
| JS SDK (`sdk/js-sdk`, incl. the `solana` module), relayer, library-solidity | `@zama-ai/dev-ex` | relayer `README`, RFC 033 (connector HTTP endpoint) |
| Coprocessor (`coprocessor/`): host-listener Solana ingestion, reconstruction, leaf-proof server, workers | `@zama-ai/fhevm-coprocessor` | `coprocessor/fhevm-engine/host-listener/README.md`, DD-064 (leaf-proof server) in `solana/docs/DESIGN_DECISIONS.md` |
| KMS connector (`kms-connector/`), incl. the Solana authorization pipeline | `@zama-ai/mpc-devs` | RFC 036 (Solana user decryption), `kms-connector/README.md` |
| KMS core (`kms` repo) | `@zama-ai/mpc-devs` (CI and charts: `@zama-ai/mpc-devops`) | `kms/core/service` docs, RFC 036 § KMS side |
| Shared crates `shared/ciphertext-attestation`, `shared/user-decryption-signature`, `test-suite/` | `@zama-ai/fhevm-devs` + `@zama-ai/mpc-devs` (both) | the crate READMEs; a change needs both teams |
| Host contracts (EVM), Gateway contracts, protocol contracts | `@zama-ai/fhevm-protocol-contracts` | `tech-spec/architecture/*`, contract NatSpec |
| Cross-cutting design (RFCs, ADRs) | authors listed in each RFC header | `tech-spec/rfcs/` (private repo) |
| Production Dockerfiles, deployment | `@zama-ai/fhevm-devops` | `fhevm/**/Dockerfile`, Helm charts in `kms/charts` |

Practical rule for a Solana change: the on-chain side goes through `fhevm-devs`; if it changes the
request wire format, the permit or the ACL leaf format, the same PR touches the connector
(`mpc-devs`) and the coprocessor (`fhevm-coprocessor`), so ask those teams before, not after.

## 3. Running the diagrams locally

The hosted build above is rebuilt by GitHub Actions from
<https://github.com/kitkhat-docs/onboarding-zama> on every push to `main`. To run the model
yourself, for example after editing it:

Prerequisites: Node.js 22.22.3 or newer (LikeC4 1.59 refuses older versions).

```bash
git clone https://github.com/kitkhat-docs/onboarding-zama
cd onboarding-zama
npm ci
npm run validate         # must print "✓ Valid (5 files)"
npm start                # dev server on http://localhost:5173
```

Without the repo: `npx likec4@1 validate .` then `npx likec4@1 start` inside the `likec4/` directory
does the same. Do not save manual layouts from the UI (`.likec4/*.likec4.snap`): the model keeps
layout automatic.
