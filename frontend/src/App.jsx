import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, BedDouble, CheckCircle2, ChevronDown, ClipboardList,
  Clock3, Edit3, Filter, HeartPulse, LayoutDashboard, Loader2,
  Plus, Search, ShieldCheck, Stethoscope, Trash2, Users, X,
  AlertCircle, CalendarDays, UserRound, RefreshCw
} from 'lucide-react'

const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const EMPTY_FORM = {
  name: '', age: '', gender: '', ward: '', department: '',
  doctor: '', admission_date: new Date().toISOString().slice(0, 10),
  status: 'Admitted'
}

async function apiRequest(path, options = {}) {
  let response
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    })
  } catch {
    throw new Error('Cannot connect to the server. Check that the backend is running and the API URL is correct.')
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = data.detail
    const message = Array.isArray(detail)
      ? detail.map(item => `${item.loc?.slice(-1)[0] || 'Field'}: ${item.msg}`).join(' ')
      : (detail || 'Something went wrong.')
    throw new Error(message)
  }
  return data
}

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Name is required.'
  else if (!/^[A-Za-z ]+$/.test(form.name.trim())) errors.name = 'Use letters and spaces only.'
  if (form.age === '' || form.age === null) errors.age = 'Age is required.'
  else if (!Number.isInteger(Number(form.age)) || Number(form.age) < 0 || Number(form.age) > 120) errors.age = 'Age must be a whole number from 0 to 120.'
  ;['gender', 'ward', 'department', 'doctor'].forEach(key => {
    if (!form[key]) errors[key] = 'Please select an option.'
  })
  if (!form.admission_date) errors.admission_date = 'Admission date is required.'
  else if (form.admission_date > new Date().toISOString().slice(0, 10)) errors.admission_date = 'Admission date cannot be in the future.'
  return errors
}

function StatCard({ icon: Icon, label, value, note, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={20} /></div>
      <div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
    </div>
  )
}

function PatientModal({ patient, options, onClose, onSave }) {
  const [form, setForm] = useState(patient ? { ...patient, age: String(patient.age) } : EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')

  const change = (key, value) => {
    setForm(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: '' }))
  }

  const submit = async event => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    setServerError('')
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    try {
      await onSave({ ...form, name: form.name.trim(), age: Number(form.age) })
    } catch (error) {
      setServerError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const selectField = (key, label, values) => (
    <label className="field">
      <span>{label} <b>*</b></span>
      <div className="select-wrap">
        <select value={form[key]} onChange={e => change(key, e.target.value)} className={errors[key] ? 'invalid' : ''}>
          <option value="">Select {label.toLowerCase()}</option>
          {values.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        <ChevronDown size={16} />
      </div>
      {errors[key] && <small className="field-error">{errors[key]}</small>}
    </label>
  )

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div><span className="eyebrow">{patient ? 'PATIENT RECORD' : 'NEW REGISTRATION'}</span><h2 id="modal-title">{patient ? 'Edit patient' : 'Add new patient'}</h2><p>Enter the patient details below.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <label className="field full"><span>Patient name <b>*</b></span><input value={form.name} onChange={e => change('name', e.target.value)} placeholder="e.g. Rahul Sharma" className={errors.name ? 'invalid' : ''} />{errors.name && <small className="field-error">{errors.name}</small>}</label>
            <label className="field"><span>Age <b>*</b></span><input type="number" min="0" max="120" value={form.age} onChange={e => change('age', e.target.value)} placeholder="Enter age" className={errors.age ? 'invalid' : ''} />{errors.age && <small className="field-error">{errors.age}</small>}</label>
            {selectField('gender', 'Gender', options.genders || [])}
            {selectField('ward', 'Ward', options.wards || [])}
            {selectField('department', 'Department', options.departments || [])}
            {selectField('doctor', 'Doctor', options.doctors || [])}
            <label className="field"><span>Admission date <b>*</b></span><input type="date" max={new Date().toISOString().slice(0, 10)} value={form.admission_date} onChange={e => change('admission_date', e.target.value)} className={errors.admission_date ? 'invalid' : ''} />{errors.admission_date && <small className="field-error">{errors.admission_date}</small>}</label>
            <label className="field"><span>Status</span><div className="select-wrap"><select value={form.status} onChange={e => change('status', e.target.value)}><option>Admitted</option><option>Discharged</option></select><ChevronDown size={16} /></div></label>
          </div>
          {serverError && <div className="form-alert"><AlertCircle size={17} />{serverError}</div>}
          <div className="modal-actions"><button type="button" className="btn btn-light" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? <><Loader2 className="spin" size={17} /> Saving...</> : patient ? 'Save changes' : <><Plus size={17} /> Add patient</>}</button></div>
        </form>
      </section>
    </div>
  )
}

export default function App() {
  const [patients, setPatients] = useState([])
  const [options, setOptions] = useState({ genders: [], wards: [], departments: [], doctors: [] })
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ ward: '', department: '', doctor: '' })
  const [modalPatient, setModalPatient] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [notice, setNotice] = useState('')

  const loadPatients = useCallback(async () => {
    setLoading(true)
    setPageError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value))
      const data = await apiRequest(`/api/patients?${params.toString()}`)
      setPatients(data)
    } catch (error) {
      setPageError(error.message)
    } finally {
      setLoading(false)
    }
  }, [search, filters])

  useEffect(() => {
    apiRequest('/api/options').then(setOptions).catch(error => setPageError(error.message))
  }, [])

  useEffect(() => {
    const timer = setTimeout(loadPatients, 250)
    return () => clearTimeout(timer)
  }, [loadPatients])

  const allStats = useMemo(() => ({
    total: patients.length,
    admitted: patients.filter(p => p.status === 'Admitted').length,
    discharged: patients.filter(p => p.status === 'Discharged').length,
    wards: new Set(patients.map(p => p.ward)).size
  }), [patients])

  const savePatient = async data => {
    if (modalPatient) await apiRequest(`/api/patients/${modalPatient.id}`, { method: 'PUT', body: JSON.stringify(data) })
    else await apiRequest('/api/patients', { method: 'POST', body: JSON.stringify(data) })
    setModalOpen(false)
    setNotice(modalPatient ? 'Patient details updated successfully.' : 'Patient added successfully.')
    await loadPatients()
  }

  const deletePatient = async patient => {
    if (!window.confirm(`Delete ${patient.name}'s record? This action cannot be undone.`)) return
    try {
      await apiRequest(`/api/patients/${patient.id}`, { method: 'DELETE' })
      setNotice('Patient record deleted.')
      await loadPatients()
    } catch (error) { setPageError(error.message) }
  }

  const dischargePatient = async patient => {
    if (!window.confirm(`Mark ${patient.name} as discharged?`)) return
    try {
      await apiRequest(`/api/patients/${patient.id}/discharge`, { method: 'PATCH' })
      setNotice(`${patient.name} marked as discharged.`)
      await loadPatients()
    } catch (error) { setPageError(error.message) }
  }

  const openAdd = () => { setModalPatient(null); setModalOpen(true) }
  const openEdit = patient => { setModalPatient(patient); setModalOpen(true) }
  const clearFilters = () => { setSearch(''); setFilters({ ward: '', department: '', doctor: '' }) }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><HeartPulse size={23} /></div><div><strong>CareFlow</strong><small>HOSPITAL MANAGEMENT</small></div></div>
        <div className="side-label">WORKSPACE</div>
        <div className="nav-item active"><LayoutDashboard size={18} /> Patient admissions</div>
        <div className="sidebar-bottom"><div className="secure-card"><ShieldCheck size={19} /><div><strong>Patient data</strong><span>Managed securely</span></div></div><div className="profile"><div className="avatar">HS</div><div><strong>Hospital Staff</strong><span>Admission desk</span></div></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="mobile-brand"><div className="brand-mark"><HeartPulse size={20} /></div><strong>CareFlow</strong></div><div className="breadcrumb">Workspace <span>/</span> <strong>Patient admissions</strong></div><div className="topbar-right"><span className="live-dot"></span><span>Admission desk</span><div className="avatar small">HS</div></div></header>
        <div className="page-wrap">
          <section className="page-heading"><div><div className="eyebrow">HOSPITAL OVERVIEW</div><h1>Patient admissions</h1><p>Manage patient records, track admissions and coordinate care.</p></div><button className="btn btn-primary add-btn" onClick={openAdd}><Plus size={18} /> Add patient</button></section>

          <section className="stats-grid">
            <StatCard icon={Users} label="Total patients" value={allStats.total} note="Matching current view" tone="blue" />
            <StatCard icon={Activity} label="Currently admitted" value={allStats.admitted} note="Active patient stays" tone="green" />
            <StatCard icon={CheckCircle2} label="Discharged" value={allStats.discharged} note="Completed admissions" tone="purple" />
            <StatCard icon={BedDouble} label="Wards occupied" value={allStats.wards} note="Wards in current view" tone="orange" />
          </section>

          <section className="list-panel">
            <div className="panel-heading"><div><h2>All patients</h2><p>Review and manage patient admission records</p></div><div className="record-count"><span></span>{patients.length} records</div></div>
            <div className="toolbar">
              <div className="search-box"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient name..." aria-label="Search patient name" /></div>
              <div className="filter-label"><Filter size={16} /> Filters</div>
              <select aria-label="Filter by ward" value={filters.ward} onChange={e => setFilters(v => ({ ...v, ward: e.target.value }))}><option value="">All wards</option>{options.wards.map(v => <option key={v}>{v}</option>)}</select>
              <select aria-label="Filter by department" value={filters.department} onChange={e => setFilters(v => ({ ...v, department: e.target.value }))}><option value="">All departments</option>{options.departments.map(v => <option key={v}>{v}</option>)}</select>
              <select aria-label="Filter by doctor" value={filters.doctor} onChange={e => setFilters(v => ({ ...v, doctor: e.target.value }))}><option value="">All doctors</option>{options.doctors.map(v => <option key={v}>{v}</option>)}</select>
              <button className="reset-btn" onClick={clearFilters}>Reset</button>
            </div>

            {notice && <div className="notice"><CheckCircle2 size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
            {pageError && <div className="error-banner"><AlertCircle size={17} /><span>{pageError}</span><button onClick={loadPatients}><RefreshCw size={15} /> Retry</button></div>}

            <div className="table-scroll">
              <table>
                <thead><tr><th>PATIENT</th><th>AGE / GENDER</th><th>WARD</th><th>DEPARTMENT</th><th>DOCTOR</th><th>ADMISSION DATE</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan="8"><div className="loading-state"><Loader2 className="spin" size={22} /> Loading patient records...</div></td></tr> :
                    patients.length === 0 ? <tr><td colSpan="8"><div className="empty-state"><div className="empty-icon"><ClipboardList size={25} /></div><strong>No patient records found</strong><span>{search || Object.values(filters).some(Boolean) ? 'Try changing your search or filters.' : 'Add your first patient to get started.'}</span>{!search && !Object.values(filters).some(Boolean) && <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add patient</button>}</div></td></tr> :
                    patients.map(patient => <tr key={patient.id}>
                      <td><div className="patient-cell"><div className="patient-avatar">{patient.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}</div><div><strong>{patient.name}</strong><small>Patient ID · #{String(patient.id).padStart(4, '0')}</small></div></div></td>
                      <td><strong>{patient.age}</strong><span className="muted-inline"> / {patient.gender}</span></td>
                      <td><span className="ward-tag"><BedDouble size={13} />{patient.ward}</span></td>
                      <td>{patient.department}</td><td>{patient.doctor}</td>
                      <td><span className="date-cell"><CalendarDays size={14} />{new Date(`${patient.admission_date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></td>
                      <td><span className={`status ${patient.status.toLowerCase()}`}><i></i>{patient.status}</span></td>
                      <td><div className="actions"><button title="Edit patient" aria-label={`Edit ${patient.name}`} onClick={() => openEdit(patient)}><Edit3 size={16} /></button>{patient.status === 'Admitted' && <button title="Mark discharged" aria-label={`Discharge ${patient.name}`} onClick={() => dischargePatient(patient)}><CheckCircle2 size={16} /></button>}<button className="delete-action" title="Delete patient" aria-label={`Delete ${patient.name}`} onClick={() => deletePatient(patient)}><Trash2 size={16} /></button></div></td>
                    </tr>)
                  }
                </tbody>
              </table>
            </div>
            <div className="table-footer"><span>Showing <strong>{patients.length}</strong> patient record{patients.length === 1 ? '' : 's'}</span><span><ShieldCheck size={14} /> Data synced with hospital records</span></div>
          </section>
          <footer className="footer"><span>CareFlow Patient Admission Management</span><span>Built for DScribe · Round 1</span></footer>
        </div>
      </main>
      {modalOpen && <PatientModal patient={modalPatient} options={options} onClose={() => setModalOpen(false)} onSave={savePatient} />}
    </div>
  )
}
