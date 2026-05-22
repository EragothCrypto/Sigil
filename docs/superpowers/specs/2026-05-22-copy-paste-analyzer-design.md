# Copy/Paste Analyzer Design

## Goal

Build Phase 3's Copy/Paste Analyzer as a Chrome-extension-first standalone feature: users explicitly paste suspicious text into Sigil and get a lightweight classification plus optional scan.

## Scope

### In Scope

- Extension popup paste box.
- Local classification for EVM addresses, transaction hashes, calldata, approval calldata, URLs/domains, typed-data-like JSON, and unknown text.
- Immediate local summary and risk hint before network calls.
- Optional API scan only after the user clicks Analyze.
- Use `/api/sigil/analyze` for addresses and hashes.
- Use `/api/sigil/simulate` for calldata, approval calldata, typed data, and unknown raw payloads.
- Use local site reputation for URLs/domains.
- Store no passive clipboard data.
- Add tests for classification.

### Out Of Scope For V1

- Silent clipboard monitoring.
- `clipboardRead` permission.
- Content-script interception of every paste event.
- Notifications.
- Wallet integration.

## Design

The extension core gets a pure `classifyPastedInput()` helper. The popup uses it to render a compact preview with kind, summary, and warnings. If the user clicks Analyze, the popup sends the pasted content to the existing Sigil production API using the configured endpoint.

This keeps Chrome Store posture clean because users intentionally paste content into the extension and explicitly request analysis.

## Testing

- Addresses classify as `address`.
- 32-byte hashes classify as `hash`.
- `approve()` calldata classifies as `approval_calldata`.
- Other calldata classifies as `calldata`.
- URLs classify as `url`.
- Typed-data-like JSON classifies as `typed_data`.
- Existing extension/store/Vercel/typecheck/build checks pass.
