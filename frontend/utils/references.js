// Parse the trailing "References: Org - Topic; Org - Topic" line the backend
// prompt asks the model to emit, and turn each entry into a real link to that
// institution's own search page. The model never writes URLs (LLMs invent
// dead ones) and never names individual doctors — only these organizations.

const ORG_SEARCH_URLS = {
  who: (q) => `https://www.who.int/home/search?indexCatalogue=genericsearchindex1&searchQuery=${q}&wordsMode=AnyWord`,
  cdc: (q) => `https://search.cdc.gov/search/?query=${q}`,
  nhs: (q) => `https://www.nhs.uk/search/results?q=${q}`,
  'mayo clinic': (q) => `https://www.mayoclinic.org/search/search-results?q=${q}`,
  medlineplus: (q) => `https://medlineplus.gov/search.html?query=${q}`,
};

function orgKey(name) {
  const n = name.trim().toLowerCase();
  if (n.includes('mayo')) return 'mayo clinic';
  if (n.includes('medline')) return 'medlineplus';
  if (n.includes('who') || n.includes('world health')) return 'who';
  if (n.includes('cdc')) return 'cdc';
  if (n.includes('nhs')) return 'nhs';
  return null;
}

const ORG_LABELS = {
  who: 'WHO',
  cdc: 'CDC',
  nhs: 'NHS',
  'mayo clinic': 'Mayo Clinic',
  medlineplus: 'MedlinePlus',
};

/**
 * Split a model reply into { body, refs }.
 * refs: [{ org, topic, url }] — only recognized organizations are kept.
 */
export function splitReferences(text) {
  const raw = text || '';
  const match = raw.match(/^\s*\**\s*References?\s*\**\s*:\s*(.+)$/im);
  if (!match) return { body: raw, refs: [] };

  const refs = [];
  for (const entry of match[1].split(/[;|]/)) {
    const m = entry.match(/^\s*(.+?)\s*[-–—:]\s*(.+?)\s*$/);
    if (!m) continue;
    const key = orgKey(m[1]);
    const topic = m[2].replace(/[.]+$/, '').trim();
    if (!key || !topic) continue;
    refs.push({
      org: ORG_LABELS[key],
      topic,
      url: ORG_SEARCH_URLS[key](encodeURIComponent(topic)),
    });
  }

  const body = raw.replace(match[0], '').replace(/\n{3,}/g, '\n\n').trim();
  return refs.length ? { body, refs } : { body: raw, refs: [] };
}
