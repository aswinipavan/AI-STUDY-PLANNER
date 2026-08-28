# API Status

| Endpoint | Status | Verified | Tested | Broken | Owner |
|----------|--------|----------|--------|--------|-------|
| `GET /api/students/me` | Implemented & Persisted | Yes | Yes | No | Agent |
| `PUT /api/students/me` | Implemented & Persisted | Yes | Yes | No | Agent |
| `PUT /api/students/me/notifications` | Implemented & Persisted | Yes | Yes | No | Agent |
| `POST /api/auth/login` | Implemented | Yes | Yes | No | Agent |
| `POST /api/auth/refresh` | Implemented | Yes | Yes | No | Agent |
| `POST /api/auth/logout` | Implemented | Yes | Yes | No | Agent |
| `GET /api/materials/` | Implemented | Yes | Yes | No | Agent |
| `GET /api/materials?subjectId={id}` | Implemented & Filtered | Yes | Yes | No | Agent |
| `GET /api/materials/subject/{id}` | Implemented & Filtered | Yes | Yes | No | Agent |
| `POST /api/materials/upload` | Implemented & Subject Validated | Yes | Yes | No | Agent |
| `GET /api/materials/upload-url` | Implemented | Yes | Yes | No | Agent |
| `POST /api/timetable/generate` | Implemented & Full Horizon | Yes | Yes | No | Agent |
| `GET /api/timetable/active` | Implemented & Enriched Slots | Yes | Yes | No | Agent |
| `POST /api/timetable/slots/{id}/toggle` | Implemented & History Preserved | Yes | Yes | No | Agent |
| `POST /api/timetable/adapt` | Implemented & Rescheduled | Yes | Yes | No | Agent |
