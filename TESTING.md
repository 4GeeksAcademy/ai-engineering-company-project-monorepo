# Testing

## Automated tests

The project uses `pytest` for automated API testing.

The current test suite covers:

- API health check
- Incident analysis validation
- Authentication validation
- Protected profile endpoints
- Protected user endpoints
- User registration validation

## Running the tests

From the project root:

```powershell
$env:PYTHONPATH="services/api"
python -m pytest -v