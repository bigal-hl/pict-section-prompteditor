# Pict Section PromptEditor

> Craft, curate, and generate AI prompts as a team

A self-contained Pict section where prompts are markdown organized by type into segments, word list matrices with weights drive a `{~WordListEntry:Name~}` template expression, and one crafted prompt generates endless concrete variants you can browse and download as a zip.

- **Typed prompts** -- segments like Context / Request / Success Criteria, with locked team preambles
- **Weighted word lists** -- `[["Tyrannosaurus", 3], ["Diplodocus", 1]]` draws 75/25, live shares as you curate
- **Real template engine** -- every pict expression works inside a prompt, not just word lists
- **Generate and ship** -- inline preview with reroll, batch generation, zip of markdown files
- **Pluggable data seam** -- in-memory by default; implement one provider class to back it with your API

[Quickstart](getting-started.md)
[API Reference](api.md)
[Developer Functions](functions.md)
[GitHub](https://github.com/fable-retold/pict-section-prompteditor)

<!-- docuserve:examples:start -->
| Example | Complexity | Launch |
|---------|------------|--------|
| [Prompt Workshop](examples/prompt%5Fworkshop/README.md) | Intermediate | [Launch](examples/prompt%5Fworkshop/index.html) |
<!-- docuserve:examples:end -->
