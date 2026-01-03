const API_BASE = 'http://localhost:8000';

function el(id) { return document.getElementById(id) }

let card = null;
let predictions = [];

function showOut(txt) { el('out').textContent = typeof txt === 'string' ? txt : JSON.stringify(txt, null, 2) }

function stateClass(s) { if (s === true) return 'true'; if (s === false) return 'false'; return 'none' }
function stateSymbol(s) {
    // return inline SVG for nicer icons; neutral returns empty
    if (s === true) return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#fff" d="M9.00039 16.2L4.80039 12.0L3.40039 13.4L9.00039 19.0L21.0004 7.00001L19.6004 5.60001L9.00039 16.2Z"/></svg>';
    if (s === false) return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#fff" d="M18.3 5.71L12 12.01L5.7 5.71L4.29 7.12L10.59 13.41L4.29 19.71L5.7 21.12L12 14.82L18.3 21.12L19.71 19.71L13.41 13.41L19.71 7.12L18.3 5.71Z"/></svg>';
    return ''
}

function cycleState(s) { // neutral -> true -> false -> neutral
    if (s === null || s === undefined) return true
    if (s === true) return false
    return null
}

function renderGrid() {
    const wrap = el('gridWrap');
    if (!predictions) { wrap.innerHTML = ''; return }
    const n = predictions.length;
    const size = Math.round(Math.sqrt(n)) || 1;
    const grid = document.createElement('div'); grid.className = 'grid';
    grid.style.gridTemplateColumns = `repeat(${size}, minmax(80px, 1fr))`;
    grid.style.gridAutoRows = '1fr';
    for (let i = 0; i < n; i++) {
        const p = predictions[i] || { name: '', description: '', state: null }
        const cell = document.createElement('div');
        cell.className = 'cell ' + stateClass(p.state);
        cell.title = p.description || '';
        const name = document.createElement('div'); name.textContent = p.name || '\u2014';
        const st = document.createElement('div'); st.className = 'state'; st.innerHTML = stateSymbol(p.state);
        cell.appendChild(name); cell.appendChild(st);
        cell.addEventListener('click', async () => {
            p.state = cycleState(p.state);
            st.innerHTML = stateSymbol(p.state);
            cell.className = 'cell ' + stateClass(p.state);
            // optimistic save: persist state change immediately (include card name)
            try {
                if (card && card.id) {
                    await fetch(`${API_BASE}/cards/${encodeURIComponent(card.id)}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: card.name, predictions })
                    });
                }
            } catch (e) {
                console.warn('Failed to save state:', e);
            }
        });
        grid.appendChild(cell);
    }
    wrap.innerHTML = '';
    wrap.appendChild(grid);
}

function renderList() {
    const out = el('entries'); out.innerHTML = '';
    // timeouts for debounced note saves per item
    const noteTimeouts = {};
    predictions.forEach((p, idx) => {
        const row = document.createElement('div'); row.className = 'list-item';
        const title = document.createElement('div'); title.textContent = `${idx + 1}. ${p.name || '\u2014'}`;
        const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = p.description || '';
        row.appendChild(title); row.appendChild(desc);

        // note input
        const note = document.createElement('input');
        note.type = 'text'; note.className = 'note'; note.placeholder = 'Add a short note...';
        note.value = p.note || '';
        note.addEventListener('input', (ev) => {
            p.note = ev.target.value;
            // debounce save
            if (noteTimeouts[idx]) clearTimeout(noteTimeouts[idx]);
            noteTimeouts[idx] = setTimeout(() => {
                if (card && card.id) saveCard();
            }, 600);
        });
        note.addEventListener('blur', () => {
            if (noteTimeouts[idx]) { clearTimeout(noteTimeouts[idx]); noteTimeouts[idx] = null }
            if (card && card.id) saveCard();
        });
        row.appendChild(note);
        out.appendChild(row);
    })
}

async function loadCard(id) {
    const cardId = (id || '').trim();
    if (!cardId) { showOut('Provide card id'); return }
    try {
        const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(cardId)}`);
        if (!res.ok) { showOut('Failed to load: ' + res.status); return }
        const data = await res.json();
        card = data; predictions = data.predictions || [];
        // display card name
        const nameEl = el('cardNameDisplay'); if (nameEl) nameEl.textContent = card.name || '';
        // ensure predictions length matches a grid size (9/16/25) by padding blanks if needed
        const allowed = [9, 16, 25];
        let target = predictions.length;
        if (!allowed.includes(target)) {
            // choose nearest allowed >= length, or max
            target = allowed.find(v => v >= predictions.length) || allowed[allowed.length - 1];
        }
        while (predictions.length < target) predictions.push({ name: '', description: '', state: null });
        renderGrid(); renderList(); showOut('Loaded card ' + cardId);
    } catch (err) { showOut(err) }
}

async function saveCard() {
    if (!card) { showOut('No card loaded'); return }
    const id = card.id;
    try {
        const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: card.name, predictions }) });
        const data = await res.json();
        if (!res.ok) { showOut('Save failed: ' + JSON.stringify(data)); return }
        showOut('Saved');
    } catch (err) { showOut(err) }
}

// manual save button removed; changes are saved automatically on interaction

// allow clicking on list entries to focus cell (optional)

// auto-load id from query string if present
(function () {
    const params = new URLSearchParams(window.location.search);
    const qid = params.get('id');
    if (qid) {
        loadCard(qid);
    }
})();

window.renderGrid = renderGrid; // expose for debug
window.renderList = renderList;

async function exportImage() {
    if (!card) { showOut('No card loaded'); return }
    const n = predictions.length || 1;
    const size = Math.round(Math.sqrt(n)) || 1;

    // canvas layout
    const padding = 24;
    const cellBase = Math.max(80, Math.min(240, Math.floor((Math.min(1200, window.innerWidth * 0.9) - padding * 2) / size)));
    const gridWidth = cellBase * size + (size - 1) * 8;
    const titleHeight = 60;
    const notesHeight = 0; // not drawing notes below to keep single page
    const canvasW = gridWidth + padding * 2;
    const canvasH = titleHeight + gridWidth + padding * 2 + notesHeight;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW * 2; // high res
    canvas.height = canvasH * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // get theme colors from stylesheet / computed styles
    const root = getComputedStyle(document.documentElement);
    const pageBg = (root.getPropertyValue('--bg-0') || '#071226').trim() || '#071226';
    const cardBg = (root.getPropertyValue('--card') || '#0f1722').trim() || '#0f1722';
    // try to pick up actual computed styles from page elements so export matches theme
    const sampleCell = document.querySelector('.cell') || document.querySelector('.card') || document.body;
    const cellStyles = sampleCell ? getComputedStyle(sampleCell) : null;
    const cellBg = (cellStyles && (cellStyles.backgroundColor || cellStyles.background)) || 'rgba(255,255,255,0.02)';
    const cellTextColor = (cellStyles && cellStyles.color) || '#e6eef6';
    const trueColor = (root.getPropertyValue('--accent-2') || '#34d399').trim() || '#34d399';
    // use a clear red for false state (accent is cyan in this theme)
    const falseColor = (root.getPropertyValue('--danger') || '#ef4444').trim() || '#ef4444';
    const titleColor = getComputedStyle(document.querySelector('h1') || document.body).color || '#dff7fb';

    // background (match site background)
    ctx.fillStyle = pageBg;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // card container
    const cardX = padding;
    const cardY = padding;
    const cardW = canvasW - padding * 2;
    const cardH = canvasH - padding * 2;
    // outer card background
    ctx.fillStyle = cardBg;
    roundRect(ctx, cardX, cardY, cardW, cardH, 12, true, false);

    // title
    ctx.fillStyle = titleColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.name || 'Bingo Card', canvasW / 2, cardY + 30);

    // grid origin
    const startX = padding;
    const startY = padding + titleHeight;
    const gap = 8;

    // draw cells
    for (let i = 0; i < n; i++) {
        const row = Math.floor(i / size);
        const col = i % size;
        const x = startX + col * (cellBase + gap);
        const y = startY + row * (cellBase + gap);
        const p = predictions[i] || { name: '', description: '', state: null };

        // cell background (use computed background)
        ctx.fillStyle = cellBg;
        roundRect(ctx, x, y, cellBase, cellBase, 8, true, false);
        // border (slightly lighter/darker depending on theme)
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cellBase - 1, cellBase - 1);

        // state badge
        if (p.state === true || p.state === false) {
            const badgeR = 18;
            const bx = x + cellBase - badgeR - 6;
            const by = y + 6;
            ctx.beginPath();
            ctx.arc(bx + badgeR / 2, by + badgeR / 2, badgeR / 2, 0, Math.PI * 2);
            ctx.fillStyle = p.state === true ? trueColor : falseColor;
            ctx.fill();
            ctx.closePath();
            // icon
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.state === true ? '✓' : '✕', bx + badgeR / 2, by + badgeR / 2 + 1);
        }

        // text name centered
        ctx.fillStyle = cellTextColor;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        wrapText(ctx, p.name || p.description || '', x + cellBase / 2, y + cellBase / 2, cellBase - 16, 16);
    }

    // open image in new tab and trigger download
    const url = canvas.toDataURL('image/png');
    const w = window.open('about:blank');
    if (!w) { showOut('Popup blocked — allow popups to export image.'); return }
    const img = new Image();
    img.src = url;
    img.onload = () => {
        w.document.title = (card.name || 'bingo') + '.png';
        w.document.body.style.margin = '0';
        w.document.body.style.background = '#ffffff';
        w.document.body.appendChild(img);
        // add download link
        const a = w.document.createElement('a');
        a.href = url; a.download = (card.name || 'bingo') + '.png';
        a.textContent = 'Download image';
        a.style.display = 'block'; a.style.margin = '8px';
        w.document.body.appendChild(a);
    };
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'undefined') r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(/\s+/);
    let line = '';
    let lines = [];
    for (let n = 0; n < words.length; n++) {
        const testLine = line + (line ? ' ' : '') + words[n];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) { lines.push(line); line = words[n]; } else { line = testLine }
    }
    lines.push(line);
    // vertical center the block
    const blockHeight = lines.length * lineHeight;
    let startY = y - blockHeight / 2 + lineHeight / 2;
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, startY + i * lineHeight);
    }
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

el('exportBtn')?.addEventListener('click', exportImage);

async function downloadJSON() {
    if (!card) { showOut('No card loaded'); return }
    try {
        const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(card.id)}`);
        if (!res.ok) { showOut('Failed to fetch card: ' + res.status); return }
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${card.id}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        showOut('Downloaded ' + (card.id || 'card'));
    } catch (e) { showOut('Download failed: ' + e) }
}

el('downloadBtn')?.addEventListener('click', downloadJSON);
