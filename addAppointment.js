/**
 * addAppointment.js — ARCHIVE
 *
 * This file contains the removed "+ Add appointment" modal code from
 * AppointmentsPage.jsx. It is preserved here for reference but is not
 * connected to anything and does not need to be syntactically valid.
 *
 * Original location: adminPage/src/pages/Appointments/AppointmentsPage.jsx
 * Removed during the migration to SQLite/D1 database backend.
 */

// ============================================================
// SECTION 1: "+ Add appointment" button in Topbar actions
// ============================================================
// Topbar actions prop:
//   actions={<Button variant="primary" size="sm" onClick={openAddModal}>+ Add appointment</Button>}

// ============================================================
// SECTION 2: Modal isOpen={isAddModalOpen}
// ============================================================
// <Modal isOpen={isAddModalOpen} onClose={closeAddModal} title="Add Appointment" size="lg">
//   <div className="appointments-page__modal-form">
//     <div className="appointments-page__modal-grid">

//       <div className="form-field">
//         <label>Patient</label>
//         <input type="text" value={form.patientSearch} onChange={...} placeholder="Search patient by name or ID" />
//       </div>

//       <div className="form-field">
//         <label>Assigned caregiver</label>
//         <input type="text" value={form.caregiverId} onChange={...} placeholder="Search by name, ID, area, language or skill" />
//       </div>

//       <div className="form-field">
//         <label>Caregiver gender preference</label>
//         <select value={form.caregiverGenderPreference} onChange={...}>
//           <option value="Male">Male</option>
//           <option value="Female">Female</option>
//           <option value="No preference">No preference</option>
//         </select>
//       </div>

//       <div className="form-field">
//         <label>Appointment Type</label>
//         <select value={form.appointmentType} onChange={...}>
//           <option value="Home Visit">Home Visit</option>
//           <option value="Care Center">Care Center</option>
//         </select>
//       </div>

//       <div className="form-field">
//         <label>Booking Type</label>
//         <select value={form.bookingType} onChange={...}>
//           <option value="One time">One time</option>
//           <option value="Recurring">Recurring</option>
//         </select>
//       </div>

//       <div className="form-field">
//         <label>Date of appointment</label>
//         <input type="date" value={form.date} onChange={...} />
//       </div>

//       <div className="form-field">
//         <label>Start time</label>
//         <select value={form.startTime} onChange={...}>
//           {TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}
//         </select>
//       </div>

//       <div className="form-field">
//         <label>End time</label>
//         <select value={form.endTime} onChange={...}>
//           {TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}
//         </select>
//       </div>

//       <div className="form-field form-field--full">
//         <label>Duration</label>
//         <input readOnly value={`${getDurationMinutes(form.startTime, form.endTime)} minutes`} />
//       </div>

//       <div className="form-field">
//         <label>Location mode</label>
//         <select value={form.locationMode} onChange={...}>
//           <option value="address">Typed address</option>
//           <option value="pinpoint">Pinpoint on map</option>
//         </select>
//       </div>

//       <div className="form-field form-field--full">
//         <label>Exact address</label>
//         <input type="text" value={form.locationAddress} onChange={...} placeholder="e.g. 12 Jalan Ampang, Kuala Lumpur" />
//       </div>

//       <div className="form-field form-field--full">
//         <label>Tasks for caregiver</label>
//         <div className="appointments-page__task-editor">
//           {form.tasks.map((task, index) => (
//             <div key={`task-${index}`} className="appointments-page__task-row">
//               <input type="text" value={task} onChange={(e) => updateTask(index, e.target.value)} placeholder="Task description" />
//               <button type="button" onClick={() => removeTask(index)} aria-label="Remove task">×</button>
//             </div>
//           ))}
//           <button type="button" className="appointments-page__inline-add" onClick={addTask}>+ Add task</button>
//         </div>
//       </div>

//       <div className="form-field form-field--full">
//         <label>Special instructions</label>
//         <textarea value={form.specialInstructions} maxLength={240} onChange={...} placeholder="Write any custom caregiver instructions for this visit." />
//         <span className="form-field__hint">{form.specialInstructions.length}/240 characters</span>
//       </div>
//     </div>

//     <div className="appointments-page__modal-actions">
//       <Button onClick={closeAddModal}>Cancel</Button>
//       <Button variant="primary" size="sm" onClick={handleNewAppointment}
//         disabled={!form.selectedPatientId || !form.startTime || !form.endTime}>
//         Save appointment
//       </Button>
//     </div>
//   </div>
// </Modal>
