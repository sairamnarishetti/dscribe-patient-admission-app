import os
import re
import sqlite3
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator

APP_DIR = Path(__file__).resolve().parent
DATABASE_PATH = os.getenv("DATABASE_PATH", str(APP_DIR / "patients.db"))

OPTIONS = {
    "genders": ["Male", "Female", "Other"],
    "wards": ["General", "ICU", "Emergency", "Maternity", "Pediatrics"],
    "departments": [
        "Cardiology", "Neurology", "Orthopedics",
        "Pediatrics", "General Medicine", "Oncology"
    ],
    "doctors": [
        "Dr. Ananya Rao", "Dr. Arjun Reddy", "Dr. Meera Shah",
        "Dr. Vikram Kumar", "Dr. Priya Nair"
    ],
    "statuses": ["Admitted", "Discharged"],
}


def get_connection():
    path = Path(DATABASE_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(path), timeout=20)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                gender TEXT NOT NULL,
                ward TEXT NOT NULL,
                department TEXT NOT NULL,
                doctor TEXT NOT NULL,
                admission_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Admitted',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)


class PatientInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=80)
    age: int = Field(ge=0, le=120)
    gender: str
    ward: str
    department: str
    doctor: str
    admission_date: date
    status: str = "Admitted"

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise ValueError("Name is required and must contain letters and spaces only.")
        return value

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, value: str) -> str:
        if value not in OPTIONS["genders"]:
            raise ValueError("Please select a valid gender.")
        return value

    @field_validator("ward")
    @classmethod
    def validate_ward(cls, value: str) -> str:
        if value not in OPTIONS["wards"]:
            raise ValueError("Please select a valid ward.")
        return value

    @field_validator("department")
    @classmethod
    def validate_department(cls, value: str) -> str:
        if value not in OPTIONS["departments"]:
            raise ValueError("Please select a valid department.")
        return value

    @field_validator("doctor")
    @classmethod
    def validate_doctor(cls, value: str) -> str:
        if value not in OPTIONS["doctors"]:
            raise ValueError("Please select a valid doctor.")
        return value

    @field_validator("admission_date")
    @classmethod
    def validate_admission_date(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Admission date cannot be in the future.")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in OPTIONS["statuses"]:
            raise ValueError("Status must be Admitted or Discharged.")
        return value


app = FastAPI(
    title="DScribe Patient Admission API",
    description="Backend API for the Patient Admission Management App.",
    version="1.0.0",
)

origins = [
    item.strip()
    for item in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if item.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    initialize_database()


def patient_dict(row):
    return dict(row)


def get_patient_or_404(patient_id: int):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM patients WHERE id = ?", (patient_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return patient_dict(row)


@app.get("/health")
def health():
    return {"status": "ok", "service": "DScribe Patient Admission API"}


@app.get("/api/options")
def get_options():
    return OPTIONS


@app.get("/api/patients")
def list_patients(
    search: Optional[str] = Query(default=None, max_length=80),
    ward: Optional[str] = None,
    department: Optional[str] = None,
    doctor: Optional[str] = None,
):
    sql = "SELECT * FROM patients WHERE 1=1"
    params = []

    if search and search.strip():
        sql += " AND name LIKE ? COLLATE NOCASE"
        params.append(f"%{search.strip()}%")
    if ward:
        if ward not in OPTIONS["wards"]:
            raise HTTPException(status_code=400, detail="Invalid ward filter.")
        sql += " AND ward = ?"
        params.append(ward)
    if department:
        if department not in OPTIONS["departments"]:
            raise HTTPException(status_code=400, detail="Invalid department filter.")
        sql += " AND department = ?"
        params.append(department)
    if doctor:
        if doctor not in OPTIONS["doctors"]:
            raise HTTPException(status_code=400, detail="Invalid doctor filter.")
        sql += " AND doctor = ?"
        params.append(doctor)

    sql += " ORDER BY id DESC"
    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [patient_dict(row) for row in rows]


@app.get("/api/patients/{patient_id}")
def read_patient(patient_id: int):
    return get_patient_or_404(patient_id)


@app.post("/api/patients", status_code=201)
def create_patient(patient: PatientInput):
    data = patient.model_dump()
    data["admission_date"] = data["admission_date"].isoformat()
    with get_connection() as conn:
        cursor = conn.execute("""
            INSERT INTO patients
            (name, age, gender, ward, department, doctor, admission_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["name"], data["age"], data["gender"], data["ward"],
            data["department"], data["doctor"], data["admission_date"], data["status"]
        ))
        patient_id = cursor.lastrowid
    return get_patient_or_404(patient_id)


@app.put("/api/patients/{patient_id}")
def update_patient(patient_id: int, patient: PatientInput):
    get_patient_or_404(patient_id)
    data = patient.model_dump()
    data["admission_date"] = data["admission_date"].isoformat()
    with get_connection() as conn:
        conn.execute("""
            UPDATE patients
            SET name=?, age=?, gender=?, ward=?, department=?, doctor=?,
                admission_date=?, status=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        """, (
            data["name"], data["age"], data["gender"], data["ward"],
            data["department"], data["doctor"], data["admission_date"],
            data["status"], patient_id
        ))
    return get_patient_or_404(patient_id)


@app.patch("/api/patients/{patient_id}/discharge")
def discharge_patient(patient_id: int):
    get_patient_or_404(patient_id)
    with get_connection() as conn:
        conn.execute("""
            UPDATE patients
            SET status='Discharged', updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        """, (patient_id,))
    return get_patient_or_404(patient_id)


@app.delete("/api/patients/{patient_id}", status_code=204)
def delete_patient(patient_id: int):
    get_patient_or_404(patient_id)
    with get_connection() as conn:
        conn.execute("DELETE FROM patients WHERE id=?", (patient_id,))
    return Response(status_code=204)
