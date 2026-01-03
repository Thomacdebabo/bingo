Frontend for the Bingo Predictions app.

Quick start:
1. Start the backend (see backend/README.md).
2. Serve the `frontend/` directory or open `frontend/index.html` in your browser.

If you open the file directly, some browsers block `fetch` from `file://` origins — prefer serving the folder with a static server, for example:

```bash
# Python 3
python -m http.server 5500 --directory frontend
# Then open http://localhost:5500 in your browser
```

The frontend expects the backend at `http://localhost:8000` by default.
