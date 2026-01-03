// Shared helpers and constants for frontend pages
/* eslint-disable */
// Use the page origin so the frontend works from other devices
const API_BASE = window.location.origin || 'http://localhost:8000';

function el(id) { return document.getElementById(id); }

function show(obj) {
    const o = document.getElementById('output') || document.getElementById('out');
    if (!o) return;
    o.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
}

function showOut(txt) {
    const o = document.getElementById('out') || document.getElementById('output');
    if (!o) return;
    o.textContent = typeof txt === 'string' ? txt : JSON.stringify(txt, null, 2);
}

const ALLOWED_COUNTS = [9, 16, 25];
function chooseAllowedCount(n) { for (const v of ALLOWED_COUNTS) if (v >= n) return v; return ALLOWED_COUNTS[ALLOWED_COUNTS.length - 1]; }

/* Expose helpers on window for legacy code that expects them */
window.API_BASE = API_BASE;
window.el = el;
window.show = show;
window.showOut = showOut;
window.ALLOWED_COUNTS = ALLOWED_COUNTS;
window.chooseAllowedCount = chooseAllowedCount;

/* End common.js */
