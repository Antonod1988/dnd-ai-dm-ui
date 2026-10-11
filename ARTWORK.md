# Optional artwork

Use **Scene artwork** above the scene, click the hero portrait, or choose **Portrait** on an NPC card. Upload PNG, JPEG or WebP, select existing campaign art or unlink it. Unlinking keeps the file for reuse. Each location/person retains its binding after travel or reopening.

Artwork operations do not roll dice, advance time, change inventory or request text AI. Files, gallery labels and binding metadata never enter the game master's text context. The game master does not analyze uploaded pictures in this implementation.

## Storage

Files live in private `data/images/` (or `DND_DATA_DIR/images`). Campaign metadata stores UUIDs, dimensions, size and bindings. Filenames are labels, never paths. The endpoint checks campaign membership and retains loopback/origin protections.

- Up to 5 MiB and 32 million pixels per image; SVG is unsupported.
- Up to 20 distinct pictures / 50 MiB per campaign and 250 MiB across local campaign art.
- Reusing identical bytes in one campaign avoids a second file. Unlinking does not free disk space. Permanent deletion/export management remains a follow-up; quota exhaustion stops uploads/generation.
- Back up the whole private data directory, including images and rules. Pictures, saves and credentials are excluded from Git.

## Explicit generation

Generation stays disabled until separately configured in the private `.env.local`, then restart:

```dotenv
IMAGE_PROVIDER=openai
IMAGE_MODEL=gpt-image-2.5-flare
IMAGE_API_KEY=your_own_image_provider_key
```

It never borrows ChatGPT OAuth, the text key or a fallback provider. Text responses keep the selected GPT-6-Luna.

Alternatives use `IMAGE_PROVIDER=openai_compatible` and `IMAGE_BASE_URL=https://your-provider.example/v1`, with their own model/key. Loopback HTTP can omit the key. The endpoint must implement `/images/generations` with GPT Image style parameters and return PNG in `data[0].b64_json`; arbitrary image URLs/provider-specific APIs are unsupported. Clients cannot choose another endpoint; redirects are rejected.

The UI identifies the provider/model and explains possible charges. Each manual click requests one low-quality image: landscape scene or square portrait. No automatic generation per turn, retry or provider switch. Implementation follows the [official OpenAI Images API reference](https://developers.openai.com/api/reference/resources/images/methods/generate). Availability/charges depend on the account/provider. A timeout or malformed response may occur after a charge; retry is a new request. Campaign text counters exclude image costs.

## Verification boundary

Tests cover upload/read, campaign separation, stale revisions, replay, deduplication, malformed/oversized pictures, quotas, independent configuration and mocked generation response/failure. Actual UI upload/reuse/unlink, hero binding, reload and responsive layouts were exercised with an existing project illustration in Lira's test campaign. No real image API request was made; that still needs verification after provider configuration.
