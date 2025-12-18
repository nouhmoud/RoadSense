$env:PYTHONPATH = "c:\Intel\road-defect-api"
..\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8082 --host 127.0.0.1
