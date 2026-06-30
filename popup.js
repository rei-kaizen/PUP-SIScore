const RATINGS = {
  5: { label: 'Always manifested',       range: '91–100%' },
  4: { label: 'Often manifested',        range: '61–90%'  },
  3: { label: 'Sometimes manifested',    range: '31–60%'  },
  2: { label: 'Seldom manifested',       range: '11–30%'  },
  1: { label: 'Never/Rarely manifested', range: '0–10%'   },
};

// Score is always a percentage (0–100). No dual-mode guessing.
function percentageToRating(pct) {
  if (pct >= 91) return 5;
  if (pct >= 61) return 4;
  if (pct >= 31) return 3;
  if (pct >= 11) return 2;
  return 1;
}

function renderScorePreview(rawInput) {
  const el = document.getElementById('preview');
  const n = parseFloat(rawInput);

  if (rawInput === '' || isNaN(n)) {
    el.innerHTML = '<span style="color:#bbb">Enter a score or pick a description above.</span>';
    return;
  }
  if (n < 0 || n > 100) {
    el.innerHTML = '<span style="color:#c62828">Score must be between 0 and 100.</span>';
    return;
  }

  const rating = percentageToRating(n);
  const { label } = RATINGS[rating];
  el.innerHTML = `
    <span class="badge">${n}%</span>
    <span class="label">${label}</span>
    <span class="range">${rating}/5</span>
  `;
}

function renderRatingPreview(rating) {
  const el = document.getElementById('preview');
  if (!rating) {
    el.innerHTML = '<span style="color:#bbb">Enter a score or pick a description above.</span>';
    return;
  }
  const { label, range } = RATINGS[rating];
  el.innerHTML = `
    <span class="badge">${rating}/5</span>
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

// --- Input listeners (mutually exclusive) ---

document.getElementById('scoreInput').addEventListener('input', e => {
  document.getElementById('qualSelect').value = '';
  renderScorePreview(e.target.value);
});

document.getElementById('qualSelect').addEventListener('change', e => {
  document.getElementById('scoreInput').value = '';
  renderRatingPreview(e.target.value ? parseInt(e.target.value) : null);
});

// --- Buttons ---

document.getElementById('applyBtn').addEventListener('click', () => {
  const scoreRaw = document.getElementById('scoreInput').value;
  const qual     = document.getElementById('qualSelect').value;

  if (qual) {
    sendMessage({ action: 'applyRating', rating: parseInt(qual) });
    return;
  }

  if (scoreRaw === '') {
    showStatus('Enter a score or select a description first.', 'error');
    return;
  }

  const score = parseFloat(scoreRaw);
  if (isNaN(score) || score < 0 || score > 100) {
    showStatus('Score must be a number between 0 and 100.', 'error');
    return;
  }

  sendMessage({ action: 'applyScore', score });
});

document.getElementById('randomBtn').addEventListener('click', () => {
  const rating = Math.floor(Math.random() * 5) + 1;
  renderRatingPreview(rating);
  sendMessage({ action: 'applyRating', rating });
});

// --- Messaging ---

function sendMessage(payload) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];

    if (!tab?.url?.includes('survey.pup.edu.ph')) {
      showStatus('Please open the PUP survey page first.', 'error');
      return;
    }

    chrome.tabs.sendMessage(tab.id, payload, response => {
      if (chrome.runtime.lastError) {
        showStatus('Cannot reach the survey page — try refreshing it.', 'error');
        return;
      }

      if (!response?.success) {
        showStatus(response?.message || 'No radio buttons found on this page.', 'error');
        return;
      }

      if (payload.action === 'applyScore') {
        const rating = percentageToRating(payload.score);
        showStatus(
          `✓ ${payload.score}% → "${RATINGS[rating].label}" applied to ${response.count} question(s).`,
          'success'
        );
      } else {
        showStatus(
          `✓ "${RATINGS[payload.rating].label}" (${payload.rating}/5) applied to ${response.count} question(s).`,
          'success'
        );
      }
    });
  });
}
