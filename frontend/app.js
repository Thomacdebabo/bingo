const API_BASE = "http://localhost:8000";

function el(id) { return document.getElementById(id); }

function show(obj) {
    el('output').textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
}

const ALLOWED_COUNTS = [9, 16, 25];

function chooseAllowedCount(n) {
    for (const v of ALLOWED_COUNTS) if (v >= n) return v;
    return ALLOWED_COUNTS[ALLOWED_COUNTS.length - 1];
}

function getCount() {
    const sel = el('countSelect');
    if (!sel) return 16;
    const v = parseInt(sel.value, 10);
    if (Number.isNaN(v) || !ALLOWED_COUNTS.includes(v)) return 16;
    return v;
}

function readPredictionsFromForm() {
    const preds = [];
    const n = getCount();
    for (let i = 0; i < n; i++) {
        const name = (el(`name-${i}`)?.value || '').trim();
        const desc = (el(`desc-${i}`)?.value || '').trim();
        // always include a prediction entry (empty name/description allowed)
        preds.push({ name: name || '', description: desc || '' });
    }
    return preds;
}

function generateRows(n) {
    const container = el('predictionsGrid');
    // preserve existing values
    const existing = [];
    const cur = container.querySelectorAll('[id^="name-"]');
    for (let i = 0; i < cur.length; i++) existing.push({ name: cur[i].value || '', desc: (el(`desc-${i}`)?.value || '') });
    // clamp
    n = Math.max(1, Math.min(128, n));
    container.innerHTML = '';
    for (let i = 0; i < n; i++) {
        const row = document.createElement('div'); row.className = 'pred-row';
        const name = document.createElement('input'); name.type = 'text'; name.id = `name-${i}`; name.className = 'pred-name'; name.placeholder = `Name ${i + 1}`;
        const desc = document.createElement('input'); desc.type = 'text'; desc.id = `desc-${i}`; desc.className = 'pred-desc'; desc.placeholder = 'Description (optional)';
        if (existing[i]) { name.value = existing[i].name; desc.value = existing[i].desc; }
        row.appendChild(name); row.appendChild(desc);
        container.appendChild(row);
    }
}

function populateFormFromPredictions(preds) {
    preds = preds || [];
    if (preds.length > getCount()) {
        const opt = chooseAllowedCount(preds.length);
        if (el('countSelect')) el('countSelect').value = String(opt);
        generateRows(opt);
    }
    // ensure rows exist
    generateRows(getCount());
    // Clear and fill
    const n = getCount();
    for (let i = 0; i < n; i++) { if (el(`name-${i}`)) el(`name-${i}`).value = ''; if (el(`desc-${i}`)) el(`desc-${i}`).value = ''; }
    for (let i = 0; i < Math.min(n, preds.length); i++) {
        const p = preds[i];
        el(`name-${i}`).value = p.name || '';
        el(`desc-${i}`).value = p.description || '';
    }
}

async function createCard() {
    const preds = readPredictionsFromForm();
    const name = (el('cardName')?.value || '').trim();
    if (!name) { show('Provide a card name'); return; }
    try {
        const res = await fetch(`${API_BASE}/cards`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, predictions: preds })
        });
        const data = await res.json();
        if (!res.ok) throw data;
        el('cardId').value = data.id;
        if (data.name && el('cardName')) el('cardName').value = data.name;
        show(data);
        // redirect to viewer for the created card
        const id = data.id;
        // navigate to view page with id in query
        window.location.href = `/view.html?id=${encodeURIComponent(id)}`;
    } catch (err) { show(err); }
}

async function getCard() {
    const id = el('cardId').value.trim();
    if (!id) { show('Provide card id.'); return; }
    try {
        const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) throw data;
        populateFormFromPredictions(data.predictions);
        // set name
        if (el('cardName')) el('cardName').value = data.name || '';
        // ensure hidden cardId stored
        el('cardId').value = data.id;
        show(data);
    } catch (err) { show(err); }
}

async function updateCard() {
    const id = el('cardId').value.trim();
    if (!id) { show('Provide card id.'); return; }
    const preds = readPredictionsFromForm();
    const name = (el('cardName')?.value || '').trim();
    if (!name) { show('Provide a card name'); return; }
    try {
        const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(id)}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, predictions: preds })
        });
        const data = await res.json();
        if (!res.ok) throw data;
        show(data);
        // after successful save, open the viewer for this card
        window.location.href = `/view.html?id=${encodeURIComponent(id)}`;
    } catch (err) { show(err); }
}

document.addEventListener('DOMContentLoaded', () => {
    el('createBtn').addEventListener('click', createCard);
    el('updateBtn').addEventListener('click', updateCard);
    // top Create button clears the form for a fresh card
    // top Create: show empty form
    el('createTopBtn')?.addEventListener('click', () => {
        el('mainButtons').style.display = 'none';
        el('formArea').style.display = 'block';
        if (el('cardId')) el('cardId').value = '';
        if (el('cardName')) el('cardName').value = '';
        generateRows(getCount());
        show('Ready to create new card');
    });
    // top Change: load id from idInput and open form for editing
    el('changeTopBtn')?.addEventListener('click', async () => {
        const id = (el('idInput')?.value || '').trim();
        if (!id) return show('enter id to change');
        try {
            const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(id)}`);
            if (!res.ok) { show(`Failed to load: ${res.status}`); return; }
            const data = await res.json();
            if (el('cardId')) el('cardId').value = data.id;
            if (el('cardName')) el('cardName').value = data.name || '';
            populateFormFromPredictions(data.predictions);
            el('mainButtons').style.display = 'none';
            el('formArea').style.display = 'block';
            show(`Loaded card ${data.id} for editing`);
        } catch (e) { show(e); }
    });
    // top View: open viewer directly (error if invalid)
    el('viewTopBtn')?.addEventListener('click', async () => {
        const id = (el('idInput')?.value || '').trim();
        if (!id) return show('enter id to view');
        try {
            const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(id)}`);
            if (!res.ok) { show(`Not found (${res.status})`); return; }
            window.location.href = `/view.html?id=${encodeURIComponent(id)}`;
        } catch (e) { show(e); }
    });
    el('regenBtn').addEventListener('click', () => generateRows(getCount()));
    const countSel = el('countSelect');
    if (countSel) countSel.addEventListener('change', () => generateRows(getCount()));
    // if id provided in URL, set it into the idInput and trigger change (load into form)
    const params = new URLSearchParams(window.location.search);
    const qid = params.get('id');
    if (qid) { el('idInput').value = qid; const changeBtn = el('changeTopBtn'); if (changeBtn) changeBtn.click(); }
    // initial generation
    generateRows(getCount());
});
