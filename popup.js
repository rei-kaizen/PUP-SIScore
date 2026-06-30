const RATINGS = {
  5: { label: 'Always manifested',       range: '91–100%' },
  4: { label: 'Often manifested',        range: '61–90%'  },
  3: { label: 'Sometimes manifested',    range: '31–60%'  },
  2: { label: 'Seldom manifested',       range: '11–30%'  },
  1: { label: 'Never/Rarely manifested', range: '0–10%'   },
};

function percentageToRating(pct) {
  if (pct >= 91) return 5;
  if (pct >= 61) return 4;
  if (pct >= 31) return 3;
  if (pct >= 11) return 2;
  return 1;
}

function renderPreview(rawInput) {
  const el = document.getElementById('preview');
  const n = parseFloat(rawInput);

  if (rawInput === '' || isNaN(n)) {
    el.innerHTML = '<span style="color:#bbb">Enter your desired total score above.</span>';
    return;
  }
  if (n < 0 || n > 100) {
    el.innerHTML = '<span style="color:#c62828">Score must be between 0 and 100.</span>';
    return;
  }

  const { label } = RATINGS[percentageToRating(n)];
  el.innerHTML = `
    <span class="badge">${n}%</span>
    <span class="label">${label}</span>
  `;
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `status ${type}`;
  if (type === 'success') setTimeout(() => { el.className = 'status'; }, 4500);
}

document.getElementById('scoreInput').addEventListener('input', e => {
  renderPreview(e.target.value);
});

document.getElementById('applyBtn').addEventListener('click', () => {
  const raw = document.getElementById('scoreInput').value;

  if (raw === '') {
    showStatus('Enter your desired total score first.', 'error');
    return;
  }

  const score = parseFloat(raw);
  if (isNaN(score) || score < 0 || score > 100) {
    showStatus('Score must be a number between 0 and 100.', 'error');
    return;
  }

  applyScore(score);
});

document.getElementById('randomBtn').addEventListener('click', () => {
  const score = Math.round(Math.random() * 10000) / 100; // 0.00–100.00
  document.getElementById('scoreInput').value = score;
  renderPreview(score);
  applyScore(score);
});

function applyScore(score) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];

    if (!tab?.url?.includes('survey.pup.edu.ph')) {
      showStatus('Please open the PUP survey page first.', 'error');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'applyScore', score }, response => {
      if (chrome.runtime.lastError) {
        showStatus('Cannot reach the survey page — try refreshing it.', 'error');
        return;
      }
      if (!response?.success) {
        showStatus(response?.message || 'No radio buttons found on this page.', 'error');
        return;
      }
      showStatus(
        `✓ Applied to ${response.count} questions. Survey will show ≈ ${response.actualScore}%.`,
        'success'
      );
    });
  });
}
