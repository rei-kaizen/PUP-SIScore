chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'applyRating') {
    sendResponse(applyRating(msg.rating));
  }
  return true; // keep port open for async sendResponse
});

function applyRating(targetRating) {
  const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));

  if (allRadios.length === 0) {
    return { success: false, message: 'No radio buttons found on this page.' };
  }

  // Group by `name` attribute — each named group represents one survey question.
  const groups = {};
  allRadios.forEach(r => {
    const key = r.name;
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  // Only consider groups that have at least 2 options (genuine question groups).
  const questionGroups = Object.values(groups).filter(g => g.length >= 2);

  if (questionGroups.length === 0) {
    return { success: false, message: 'No question groups found — are you on the survey page?' };
  }

  let applied = 0;

  questionGroups.forEach(radios => {
    const target = pickRadio(radios, targetRating);
    if (!target || target.disabled) return;

    target.checked = true;
    target.click();
    // Fire change event for React/Vue/Angular-driven forms that suppress native events.
    target.dispatchEvent(new Event('change', { bubbles: true }));
    applied++;
  });

  return {
    success: applied > 0,
    count: applied,
    message: applied === 0 ? 'Could not select any radio buttons.' : null,
  };
}

/*
 * Three strategies, tried in order:
 *   1. Exact numeric value match (value="4" → rating 4)
 *   2. Sort all values numerically, pick by 1-based index (lowest value = 1)
 *   3. DOM order: pick the Nth element in document order
 */
function pickRadio(radios, targetRating) {
  // Strategy 1 — value matches the rating directly
  const byValue = radios.find(r => parseFloat(r.value) === targetRating);
  if (byValue) return byValue;

  // Strategy 2 — all values are numbers, sort ascending and index in
  const allNumeric = radios.every(r => !isNaN(parseFloat(r.value)));
  if (allNumeric) {
    const sorted = [...radios].sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
    if (sorted.length >= targetRating) return sorted[targetRating - 1];
  }

  // Strategy 3 — DOM order fallback
  const byDom = [...radios].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  return byDom[targetRating - 1] ?? null;
}
