# GPT-5.6 Migration

This branch migrates Elevate360's OpenAI-backed flows from Chat Completions to the Responses API and maps workloads across the GPT-5.6 model family.

## Model routing

- `gpt-5.6-sol`: flagship concierge and highest-value interactions
- `gpt-5.6-terra`: balanced brand copy, digests, and general production workloads
- `gpt-5.6-luna`: intent classification, summaries, and high-volume follow-up generation

## API changes

- Uses `client.responses.create(...)`
- Reads final text from `response.output_text`
- Uses `max_output_tokens`
- Configures `reasoning.effort`
- Configures `text.verbosity`
- Sets `store: false`

## Required verification before merge

1. `npm run check`
2. `npm run build`
3. Test concierge reply generation
4. Test intent classification JSON parsing
5. Test OpenAI-routed newsletter generation
6. Confirm DeepSeek automation routing and fallback remain functional
7. Confirm the deployed OpenAI account has access to the selected GPT-5.6 model slugs

## Environment

Optional override:

```text
OPENAI_MODEL=gpt-5.6-terra
```
