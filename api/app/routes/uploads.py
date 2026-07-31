"""REMOVED — this router had a path-traversal vulnerability
(`UPLOAD_DIR / file.filename` trusted the client-supplied filename) and no
auth, size, or type checks.

Audio uploads now go through `POST /analyze` (see routes/analyze.py), which:
- requires authentication
- validates extension + content type against an allowlist
- enforces a size cap while streaming to disk
- stores files under server-generated UUID names, never client filenames
"""
