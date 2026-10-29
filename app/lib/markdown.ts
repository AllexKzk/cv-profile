import MarkdownIt from 'markdown-it'

// Assistant answers are model output, so the renderer is the security boundary:
// - html: false escapes raw HTML instead of passing it through;
// - the built-in validateLink drops javascript:, vbscript: and most data: links;
// - images are off: no requests to hosts the model names.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true }).disable('image')

md.renderer.rules.link_open = (tokens, index, options, _env, self) => {
  const token = tokens[index]!
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer')
  return self.renderToken(tokens, index, options)
}

export function renderMarkdown(text: string): string {
  return md.render(text)
}
