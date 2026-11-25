# Quick backend validation checks

Start the backend, then use Swagger at `http://127.0.0.1:8000/docs`.

Example valid request body:

```json
{
  "name": "Rahul Sharma",
  "age": 28,
  "gender": "Male",
  "ward": "General",
  "department": "Cardiology",
  "doctor": "Dr. Ananya Rao",
  "admission_date": "2026-11-25",
  "status": "Admitted"
}
```

Try changing the name to `Rahul123`, age to `130`, or admission date to a future date. The backend should reject those requests with a validation response.
