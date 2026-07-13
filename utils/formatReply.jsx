import React from 'react';

// Turns **bold** plus numbered/bulleted lines into real React nodes.
// No dangerouslySetInnerHTML: React escapes all text content by default,
// so LLM output can never inject markup here.
function renderInline(text, keyPrefix) {
  return text.split(/(\*\*.+?\*\*)/g).filter(Boolean).map((part, i) => {
    const match = part.match(/^\*\*(.+)\*\*$/);
    return match
      ? <b key={`${keyPrefix}-b-${i}`}>{match[1]}</b>
      : <React.Fragment key={`${keyPrefix}-t-${i}`}>{part}</React.Fragment>;
  });
}

export function formatReply(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  const blocks = [];
  let listBuffer = [];
  let listType = null;

  function flushList() {
    if (listBuffer.length) {
      const Tag = listType === 'ol' ? 'ol' : 'ul';
      const key = `list-${blocks.length}`;
      blocks.push(
        <Tag key={key} className="reply-list">
          {listBuffer.map((item, i) => (
            <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
          ))}
        </Tag>
      );
    }
    listBuffer = [];
    listType = null;
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    const numMatch = trimmed.match(/^\d+[.)]\s+(.*)/);
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)/);

    if (numMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listBuffer.push(numMatch[1]);
    } else if (bulletMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listBuffer.push(bulletMatch[1]);
    } else {
      flushList();
      if (trimmed) blocks.push(<p key={`p-${blocks.length}`}>{renderInline(trimmed, `p-${blocks.length}`)}</p>);
    }
  });
  flushList();

  return blocks.length ? blocks : [<p key="empty">MediAgent didn&rsquo;t return a response.</p>];
}
