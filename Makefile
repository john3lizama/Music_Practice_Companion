# Run from repo root. Assumes api/.venv is the single project venv.
VENV=api/.venv/bin

.PHONY: dev test install lint

install:
	$(VENV)/pip install -r api/requirements.txt

dev:
	cd api && .venv/bin/uvicorn app.main:app --reload

test:
	cd api && .venv/bin/python -m pytest -v

lint:
	cd api && .venv/bin/python -m ruff check app tests || true
