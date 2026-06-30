const RATINGS = {
  5: { label: 'Always manifested',       range: '91–100%' },
  4: { label: 'Often manifested',        range: '61–90%'  },
  3: { label: 'Sometimes manifested',    range: '31–60%'  },
  2: { label: 'Seldom manifested',       range: '11–30%'  },
  1: { label: 'Never/Rarely manifested', range: '0–10%'   },
};

// Accepts 0–100 (percentage) or 1–5 (direct scale with decimals).
function scoreToRating(raw) {
  const n = parseFloat(raw);
  if (isNaN(n) || n < 0 || n > 100) return null;

  if (n <= 5) {
    // Direct 1–5 scale
    if (n >= 4.51) return 5;
    if (n >= 3.51) return 4;
    if (n >= 2.51) return 3;
    if (n >= 1.51) return 2;
    return 1;
  }

  // Percentage 0–100
  if (n >= 91) return 5;
  if (n >= 61) return 4;
  if (n >= 31) return 3;
  if (n >= 11) return 2;
  return 1;
}

function renderPreview(rating) {
  const el = document.getElementById('preview');
  if (!rating) {
    el.innerHTML = '<span style="color:#bbb">Enter a score or pick a description above.</span>';
    return;
  }
  const { label, range } = RATINGS[rating];
  el.innerHTML = `
    <span class="badge">${rating}</span>
    <span class="label">${label}</span>
    <span class="range">${range}</span>
  `;
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `status ${type}`;
  if (type === 'success') setTimeout(() => { el.className = 'status'; }, 3500);
}

// --- Input listeners ---

document.getElementById('scoreInput').addEventListener('input', e => {
  document.getElementById('qualSelect').value = '';
  renderPreview(scoreToRating(e.target.value));
});

document.getElementById('qualSelect').addEventListener('change', e => {
  document.getElementById('scoreInput').value = '';
  renderPreview(e.target.value ? parseInt(e.target.value) : null);
});

// --- Buttons ---

document.getElementById('applyBtn').addEventListener('click', () => {
  const qual   = document.getElementById('qualSelect').value;
  const score  = document.getElementById('scoreInput').value;

  let rating = null;
  if (qual)               rating = parseInt(qual);
  else if (score !== '')  rating = scoreToRating(score);

  if (!rating) {
    showStatus('Enter a score or select a description first.', 'error');
    return;
  }
  dispatch(rating);
});

document.getElementById('randomBtn').addEventListener('click', () => {
  const rating = Math.floor(Math.random() * 5) + 1;
  renderPreview(rating);
  dispatch(rating);
});

// --- Messaging ---

function dispatch(rating) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];

    if (!tab?.url?.includes('survey.pup.edu.ph')) {
      showStatus('Please open the PUP survey page first.', 'error');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'applyRating', rating }, response => {
      if (chrome.runtime.lastError) {
        showStatus('Cannot reach the survey page — try refreshing it.', 'error');
        return;
      }
      if (response?.success) {
        showStatus(
          `✓ Applied "${RATINGS[rating].label}" (${rating}/5) to ${response.count} question(s).`,
          'success'
        );
      } else {
        showStatus(response?.message || 'No radio buttons found on this page.', 'error');
      }
    });
  });
}
