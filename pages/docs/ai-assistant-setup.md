# Public Page AI Assistant

The assistant is configured per business. It answers from the current public page content, readable public URLs and PDFs linked from that page, and, when supplied, documents in that business's private OpenAI vector store.

## Deployment

1. Apply `supabase/migrations/20260827_create_business_ai_assistant.sql`.
2. Set `OPENAI_API_KEY` on the website server. Optionally set `OPENAI_CHAT_MODEL`; the default is `gpt-5-mini`.
3. Deploy the website.
4. In Account Settings (website) or Business Settings (mobile app), choose a business, add documents, customize the welcome message, and enable the assistant.

The API key must never be exposed through an `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variable. Visitors do not need an account and chat messages are not persisted by CrownPages. Responses are sent with `store: false`.

## Grounding and isolation

- Each business receives a separate vector store.
- Public chat requests can only retrieve documents associated with that page's business.
- Public URLs are read only when they are explicitly linked from the current CrownPage. Private-network URLs are blocked, linked content is treated as untrusted, and social-media content is best-effort because platforms may require login or block automated access.
- The prompt requires the assistant to use page information and retrieved documents, and to direct visitors to the facility when an answer is unsupported.
- The public API limits question size, conversation history, response size, and requests per minute.

OpenAI implementation reference: https://developers.openai.com/api/docs/guides/tools-file-search
