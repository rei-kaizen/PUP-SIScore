chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'applyScore')  sendResponse(applyScore(msg.score));
  if (msg.action === 'applyRating') sendResponse(applyUniform(msg.rating));
  return true;
});

// --- Score-based: distribute floor/ceil values across questions ---

function applyScore(score) {
  const groups = getQuestionGroups();
  if (!groups.length) return noGroupsError();

  // Survey score formula: displayed% = avg × 20, so avg = score / 20.
  const avg = score / 20;

  // Assign a shuffled mix of floor(avg) and ceil(avg) so the
  // overall distribution reflects the exact decimal score.
  const values = distributeValues(groups.length, avg);

  let applied = 0;
  groups.forEach((radios, i) => {
    const target = pickRadio(radios, values[i]);
    if (target && !target.disabled) { fireClick(target); applied++; }
  });

  return applied > 0
    ? { success: true, count: applied }
    : { success: false, message: 'Could not select any radio buttons.' };
}

// --- Rating-based: same integer value for every question (dropdown / Randomize) ---

function applyUniform(rating) {
  const groups = getQuestionGroups();
  if (!groups.length) return noGroupsError();

  let applied = 0;
  groups.forEach(radios => {
    const target = pickRadio(radios, rating);
    if (target && !target.disabled) { fireClick(target); applied++; }
  });

  return applied > 0
    ? { success: true, count: applied }
    : { success: false, message: 'Could not select any radio buttons.' };
}

// --- Helpers ---

function getQuestionGroups() {
  const map = {};
  document.querySelectorAll('input[type="radio"]').forEach(r => {
    if (!r.name) return;
    (map[r.name] ??= []).push(r);
  });
  return Object.values(map).filter(g => g.length >= 2);
}

function noGroupsError() {
  return { success: false, message: 'No question groups found — are you on the survey page?' };
}

/*
 * Generates `count` integers (each floor(avg) or ceil(avg)) whose expected
 * mean matches `avg`, then shuffles them so questions get varied values.
 */
function distributeValues(count, avg) {
  avg = Math.max(1, Math.min(5, avg));
  const lo = Math.floor(avg);
  const hi = Math.ceil(avg);

  if (lo === hi) return Array(count).fill(lo);

  const hiCount = Math.round(count * (avg - lo));
  const values  = [
    ...Array(hiCount).fill(hi),
    ...Array(count - hiCount).fill(lo),
  ];

  // Fisher-Yates shuffle so adjacent questions get different values.
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  return values;
}

/*
 * Three strategies in priority order:
 *   1. Exact numeric value match  (value="4")
 *   2. Numerically sorted index   (sorted ascending, pick index rating-1)
 *   3. DOM order fallback
 */
function pickRadio(radios, targetRating) {
  const byValue = radios.find(r => parseFloat(r.value) === targetRating);
  if (byValue) return byValue;

  const allNumeric = radios.every(r => !isNaN(parseFloat(r.value)));
  if (allNumeric) {
    const sorted = [...radios].sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
    return sorted[targetRating - 1] ?? null;
  }

  const byDom = [...radios].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  return byDom[targetRating - 1] ?? null;
}

function fireClick(radio) {
  radio.checked = true;
  radio.click();
  radio.dispatchEvent(new Event('change', { bubbles: true }));
}
