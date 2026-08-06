// Minimal **bold** -> rich-text nodes converter, just enough for the two
// policy documents (no other markdown syntax appears in them).
function parseBold(str) {
  const nodes = [];
  const re = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = re.exec(str))) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: str.slice(lastIndex, match.index) });
    }
    nodes.push({
      name: 'text',
      attrs: { style: 'font-weight:700;color:var(--text-0);' },
      children: [{ type: 'text', text: match[1] }]
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < str.length) {
    nodes.push({ type: 'text', text: str.slice(lastIndex) });
  }
  return nodes;
}

module.exports = { parseBold };
