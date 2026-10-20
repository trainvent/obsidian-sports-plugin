# Repository agent resources

Repository-wide instructions live in [AGENTS.md](../AGENTS.md).
Reusable project workflows live in `skills/<skill-name>/SKILL.md`, with YAML
`name` and `description` fields followed by concise task-specific instructions.

- [sports-workbook](skills/sports-workbook/SKILL.md): XLSX import, schedule display,
  sync, and generated-note preservation.

Keep this directory free of credentials, local plugin settings, generated bundles,
and copies of external manuals. Add supporting scripts or references only when a
workflow needs them.

Layout reference: [OpenAI skill documentation](https://learn.chatgpt.com/docs/build-skills).
