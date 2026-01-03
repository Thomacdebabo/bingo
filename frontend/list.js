const API_BASE = 'http://localhost:8000';

function el(id) { return document.getElementById(id) }

async function loadList() {
    try {
        const res = await fetch(`${API_BASE}/cards`);
        if (!res.ok) { el('cardsList').textContent = 'Failed to load cards'; return }
        const cards = await res.json();
        if (!cards.length) { el('cardsList').textContent = 'No cards found.'; return }
        const wrap = document.createElement('div');
        wrap.style.display = 'grid';
        wrap.style.gap = '10px';
        cards.forEach(c => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const title = document.createElement('div'); title.style.display = 'flex'; title.style.justifyContent = 'space-between';
            const left = document.createElement('div'); left.textContent = c.name || `(unnamed)`;
            const right = document.createElement('div'); right.style.color = 'var(--muted)'; right.textContent = `${c.count} items`;
            title.appendChild(left); title.appendChild(right);
            const actions = document.createElement('div'); actions.style.marginTop = '6px';
            const view = document.createElement('a'); view.href = `/view.html?id=${encodeURIComponent(c.id)}`; view.textContent = 'View'; view.className = 'btn secondary'; view.style.marginRight = '8px';
            const edit = document.createElement('a'); edit.href = `/index.html?id=${encodeURIComponent(c.id)}`; edit.textContent = 'Edit'; edit.className = 'btn secondary'; edit.style.marginRight = '8px';
            const dl = document.createElement('button'); dl.textContent = 'Download'; dl.className = 'btn secondary'; dl.style.marginRight = '8px';
            dl.addEventListener('click', async () => {
                try {
                    const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(c.id)}`);
                    if (!res.ok) { alert('Failed to fetch card'); return }
                    const data = await res.json();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `${c.id}.json`;
                    document.body.appendChild(a); a.click(); a.remove();
                    URL.revokeObjectURL(url);
                } catch (e) { alert('Download failed: ' + e) }
            });
            actions.appendChild(view); actions.appendChild(edit); actions.appendChild(dl);
            item.appendChild(title); item.appendChild(actions);
            wrap.appendChild(item);
        });
        const container = el('cardsList'); container.innerHTML = ''; container.appendChild(wrap);
    } catch (e) { el('cardsList').textContent = '' + e }
}

window.addEventListener('DOMContentLoaded', loadList);
