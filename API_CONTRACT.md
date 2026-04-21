# Suraksha Health API Contract

## Authentication (Existing)
* `POST /api/auth/register` - Register a new user
* `POST /api/auth/login` - Authenticate user
* `POST /api/auth/refresh` - Refresh access token
* `POST /api/auth/logout` - Clear tokens
* `POST /api/auth/forgot-password` - Request password reset
* `POST /api/auth/reset-password` - Complete password reset

---

## Health Records API (Dev 2)

All endpoints require `Authorization: Bearer <token>`

### Create Record
* **Endpoint:** `POST /api/records`
* **Role Required:** `doctor`
* **Request Body:**
```json
{
  "patientId": "uuid",
  "title": "Visit Summary",
  "content": "Patient complains of headache..."
}
```
* **Response (201):**
```json
{
  "message": "Record created successfully",
  "record": {
    "id": "uuid",
    "patient_id": "uuid",
    "doctor_id": "uuid",
    "title": "Visit Summary",
    "content": "Patient complains of headache...",
    "created_at": "datetime",
    "patient": { "id": "uuid", "full_name": "John Doe", "email": "john@example.com" },
    "doctor": { "id": "uuid", "full_name": "Dr. Smith", "email": "smith@example.com" }
  }
}
```

### Get Records
* **Endpoint:** `GET /api/records`
* **Role Required:** `patient` or `doctor`
* **Query Params (Doctor only):** `?patientId=<uuid>`
* **Description:** Patients see their own records. Doctors must provide `patientId` and must have active emergency access to view records.
* **Response (200):**
```json
{
  "records": [
    {
      "id": "uuid",
      "title": "Visit Summary",
      "content": "Patient complains of headache...",
      "created_at": "datetime"
    }
  ]
}
```

### Get Single Record
* **Endpoint:** `GET /api/records/:id`
* **Role Required:** `patient` or `doctor`
* **Response (200):** Single record object.

---

## Emergency Access API (Dev 2)

### Request Emergency Access
* **Endpoint:** `POST /api/emergency`
* **Role Required:** `doctor`
* **Request Body:**
```json
{
  "patientId": "uuid",
  "reason": "Emergency room admit - severe chest pain"
}
```
* **Response (201):** Request object with `status: "pending"`.

### List Emergency Requests
* **Endpoint:** `GET /api/emergency`
* **Role Required:** `patient` or `doctor`
* **Description:** Patients see incoming requests. Doctors see their outbound requests.

### Update Request Status
* **Endpoint:** `PATCH /api/emergency/:id/status`
* **Role Required:** `patient`
* **Request Body:**
```json
{
  "status": "approved" // or "rejected", "revoked"
}
```
* **Response (200):** Updated request.
