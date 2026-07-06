import { useEffect, useState, useRef, type FormEvent, useMemo } from 'react'
import { createPermit, ensurePermitConfig, subscribeToConfig, uploadAttachments } from '../services/ptw'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import type { CompanyConfig } from '../types/permit'

const presetFields = [
    { key: 'Hazard identification', value: 'Describe the hazard' },
    { key: 'JSA reference', value: 'Enter JSA or job safety analysis' },
    { key: 'Isolation point', value: 'Enter isolation location' },
]

const defaultSiteOptions = [
    'Main Plant',
    'Boiler House',
    'Pump House',
    'Compressor Station',
    'Control Room',
    'Storage Yard',
    'Workshop',
    'Tank Farm',
    'Loading Bay',
    'Service Platform',
    'Warehouse',
    'Office Block',
    'Drilling Pad',
    'Jetty',
    'Substation',
    'Wastewater Plant',
    'Utility Corridor',
    'North Access Road',
    'South Access Road',
]

const templates: Record<string, { title: string; description: string; fields?: Record<string, string> }> = {
    'Hot Work': {
        title: 'Hot work permit',
        description: 'Welding, cutting or grinding. Ensure fire watch and permit controls are in place.',
        fields: { 'Hazard identification': 'Heat, sparks, fire risk', 'Control measures': 'Fire watch, extinguishers nearby' },
    },
    'Confined Space': {
        title: 'Confined space entry',
        description: 'Entry into tank or enclosed space. Ensure gas testing and rescue plan.',
        fields: { 'Atmosphere test': 'Record gas readings', 'Entry supervisor': '' },
    },
    'Electrical Isolation / LOTO': {
        title: 'Electrical isolation',
        description: 'Lockout/tagout required before maintenance. Verify isolation points.',
        fields: { 'Isolation point': 'Main switch / panel', 'LOTO reference': '' },
    },
    'Working at Height': {
        title: 'Working at height permit',
        description: 'Work above ground level or near exposed edges. Verify scaffolding, fall arrest, and rescue readiness.',
        fields: { 'Fall protection': 'Harness, lanyard, anchor point', 'Work platform': 'Scaffold / MEWP / ladder' },
    },
    'Excavation / Earthworks': {
        title: 'Excavation permit',
        description: 'Excavation or trenching work. Confirm underground services, shoring and access controls.',
        fields: { 'Excavation depth': 'Record depth and location', 'Underground services': 'Utility check completed' },
    },
    'Line Breaking / Pipeline Maintenance': {
        title: 'Line breaking permit',
        description: 'Pipeline isolation or hazardous line break operations. Verify pressure relief and lockout.',
        fields: { 'Isolation verified': 'Confirm blinds and valves', 'Pressure relief': 'Relief method and location' },
    },
    'Mechanical Isolation': {
        title: 'Mechanical isolation permit',
        description: 'Mechanical maintenance requiring isolation, guarding, and zero energy verification.',
        fields: { 'Energy source': 'Mechanical energy / moving parts', 'Isolation method': 'Block, lock, disconnect' },
    },
    'Permit Extension / Revalidation': {
        title: 'Permit extension',
        description: 'Extend an existing permit after work duration has changed or conditions require revalidation.',
        fields: { 'Original permit reference': 'Enter reference number', 'Revalidation reason': 'Reason for extension' },
    },
    'Shutdown / Outage': {
        title: 'Shutdown / outage permit',
        description: 'Planned shutdown or outage activity. Coordinate isolation, communications, and safe restoration.',
        fields: { 'Shutdown scope': 'Systems and units affected', 'Restoration plan': 'How normal operation will be restored' },
    },
}

const commonHazards = [
    'Slips, trips, and falls', 'Working at height', 'Electrical shock', 'Fire and explosion',
    'Chemical exposure', 'Noise', 'Dust / Fumes', 'Moving machinery', 'Dropped objects',
    'Confined space', 'Excavation collapse', 'High/low temperature', 'Manual handling'
]

const commonControls = [
    'Personal Protective Equipment (PPE)', 'Lockout/Tagout (LOTO)', 'Guarding / Barricades',
    'Ventilation', 'Fire extinguisher', 'Gas detection', 'Fall arrest system',
    'Safe work procedure / JSA', 'Emergency rescue plan', 'Shoring / Benching',
    'First aid kit', 'Communication (radios)'
]

const approvalRoles = [
    'Area Authority',
    'HSE Officer',
    'Supervisor',
    'Manager',
    'Site Manager',
    'Issuer',
    'Admin'
]



export function PermitComposer({ onCreated }: { onCreated: () => void }) {
    const { user, profile } = useAuth()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [permitType, setPermitType] = useState('Hot Work')
    const [siteId, setSiteId] = useState('Main Plant')

    const [selections, setSelections] = useState<Record<string, string[]>>({ hazards: [], controls: [] })
    const [customFields, setCustomFields] = useState<Record<string, string>>({})
    const [attachments, setAttachments] = useState<Array<{ name: string; url: string }> | null>(null)
    const [message, setMessage] = useState('')
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [config, setConfig] = useState<CompanyConfig | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const siteOptions = Array.from(new Set([...(config?.sites ?? []), ...defaultSiteOptions])).filter(Boolean)
    const [touched, setTouched] = useState<Record<string, boolean>>({})

    useEffect(() => {
        let unsub: (() => void) | undefined
        void (async () => {
            // ensure default config exists and then subscribe to realtime updates
            await ensurePermitConfig()
            unsub = subscribeToConfig((data) => {
                setConfig(data)
                setPermitType((prev) => prev || (data.permitTypes?.[0] ?? 'Hot Work'))
                setSiteId((prev) => prev || (data.sites?.[0] ?? 'Main Plant'))
            })
        })()

        return () => unsub?.()
    }, [])

    const { notify } = useNotification()

    const isFormValid = useMemo(() => {
        return title.trim() !== '' && description.trim() !== '' && siteId.trim() !== ''
    }, [title, description, siteId])


    const handleAddPresetField = (key: string, value: string) => {
        setCustomFields((prev) => ({ ...prev, [key]: value }))
        setMessage(`${key} field added.`)
    }

    const handleSelectionToggle = (category: 'hazards' | 'controls', item: string) => {
        setSelections(prev => {
            const current = prev[category]
            const newSelections = current.includes(item)
                ? current.filter(i => i !== item)
                : [...current, item]

            return { ...prev, [category]: newSelections }
        })
    }

    // custom field helpers are handled inline in the guided form

    const allowedCreatorRoles = ['Field Supervisor', 'Technician', 'Requester', 'Supervisor', 'Admin']

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault()
        setMessage('')

        const trimmedTitle = title.trim()
        const trimmedDescription = description.trim()
        const trimmedSite = siteId.trim()

        if (!isFormValid) {
            setMessage('Please fill in all required fields: Title, Work details, and Site.')
            setTouched({ title: true, description: true, siteId: true })
            return
        }

        if (!user || !profile) {
            setMessage('Sign in before raising a permit.')
            return
        }

        if (!allowedCreatorRoles.includes(profile.role)) {
            setMessage('Your account does not have permission to raise permits. Contact your administrator.')
            return
        }

        try {
            setSubmitting(true)
            await ensurePermitConfig()
            let uploaded: any[] | undefined
            if ((fileInputRef.current?.files?.length ?? 0) > 0) {
                uploaded = await uploadAttachments(fileInputRef.current!.files!, 'permits')
            }

            await createPermit({
                title: trimmedTitle,
                description: trimmedDescription,
                permitType: permitType.trim() || 'Hot Work',
                siteId: trimmedSite || (config?.sites?.[0] ?? 'Main Plant'),
                status: 'Draft',
                createdBy: user.uid,
                assignedTo: [profile.role],
                customFields: {
                    ...customFields,
                    'Identified Hazards': selections.hazards.join(', '),
                    'Implemented Controls': selections.controls.join(', ')
                },
                attachments: uploaded ?? [],
            })
            const successMessage = 'Permit raised and saved to Firestore.'
            setMessage(successMessage)
            notify(successMessage, 'success')
            setTitle('')
            setDescription('')
            setPermitType(config?.permitTypes?.[0] ?? 'General')
            setSiteId(config?.sites?.[0] ?? 'demo-site')
            setSelections({ hazards: [], controls: [] })
            setCustomFields({})
            onCreated()
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create permit.'
            setMessage(errorMessage)
            notify(errorMessage, 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const steps = ['Work details', 'Hazards', 'Controls & Isolation', 'Approvals', 'Review']

    const [step, setStep] = useState(0)

    const applyTemplate = (name: string) => {
        const t = templates[name]
        if (!t) return
        setPermitType(name)
        setTitle(t.title)
        setDescription(t.description)
        if (t.fields) setCustomFields((prev) => ({ ...prev, ...t.fields }))
        setMessage(`${name} template applied.`)
    }

    return (
        <form className="card" onSubmit={handleSubmit} aria-label="Permit composer">
            <h3>Create permit</h3>
            <p className="muted">Step-by-step guided permit creation. Use templates to prefill common permit types.</p>

            <div className="select-row">
                <div>
                    <label className="field-label" htmlFor="template-select">Template</label>
                    <select id="template-select" value={permitType} onChange={(e) => applyTemplate(e.target.value)} title="Choose a template to prefill fields">
                        <option value="">-- pick a template --</option>
                        {Object.keys(templates).map((key) => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="field-label" htmlFor="permit-site">Site / location</label>
                    <input
                        id="permit-site"
                        list="site-options"
                        value={siteId}
                        onChange={(event) => setSiteId(event.target.value)}
                        placeholder="Select or type a site/location"
                        title="Select or type a site or location for this permit"
                    />
                    <datalist id="site-options">
                        {siteOptions.map((item) => (
                            <option key={item} value={item} />
                        ))}
                    </datalist>
                </div>
            </div>

            <div className="stepper">
                <div className="step-labels">
                    {steps.map((label, idx) => {
                        const isActive = idx === step
                        const isCompleted = idx < step
                        return (
                            <button key={label} type="button" className={`step-pill ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`} onClick={() => setStep(idx)}>
                                <span className="step-number">{idx + 1}</span> {label}
                            </button>
                        )
                    })}
                </div>

                <div className="step-content">
                    {step === 0 && (
                        <div>
                            <label className="field-label" htmlFor="permit-title">Permit title</label>
                            <input
                                id="permit-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                                className={touched.title && !title.trim() ? 'input-invalid' : ''}
                                placeholder="Permit title"
                                required
                                title="Short descriptive title for the permit"
                            />

                            <label className="field-label" htmlFor="permit-description">Work details</label>
                            <textarea
                                id="permit-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                                className={touched.description && !description.trim() ? 'input-invalid' : ''}
                                placeholder="Describe the work to be done"
                                rows={4}
                                title="Describe the work, location, and main tasks"
                                required
                            />
                        </div>
                    )}

                    {step === 1 && (
                        <div>
                            <label className="field-label">Hazards</label>
                            <p className="muted">List hazards and select preset suggestions.</p>
                            <div className="field-suggestions">
                                <div className="tooltip-container">
                                    JSA reference
                                    <span className="tooltip-icon">?</span>
                                    <div className="tooltip-text">Job Safety Analysis: A document that breaks a job into steps to identify and control hazards.</div>
                                </div>
                                {presetFields.filter(f => f.key !== 'JSA reference').map((preset) => (
                                    <button type="button" key={preset.key} className="tertiary-button" onClick={() => handleAddPresetField(preset.key, preset.value)}>{preset.key}</button>
                                ))}
                            </div>

                            <div className="checklist-group">
                                <label className="field-label">Common Hazards</label>
                                <div className="checklist-grid">
                                    {commonHazards.map(hazard => (
                                        <div key={hazard} className="checkbox-item">
                                            <input type="checkbox" id={`hazard-${hazard}`} checked={selections.hazards.includes(hazard)} onChange={() => handleSelectionToggle('hazards', hazard)} />
                                            <label htmlFor={`hazard-${hazard}`}>{hazard}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <textarea value={customFields['Other hazards'] ?? ''} onChange={(e) => setCustomFields((p) => ({ ...p, 'Other hazards': e.target.value }))} placeholder="Describe any other hazards not listed above" rows={3} />

                            {/* Dynamic fields based on permit type */}
                            {permitType === 'Excavation / Earthworks' && (
                                <div className="dynamic-field">
                                    <label htmlFor="excavation-depth">Excavation Depth (meters)</label>
                                    <input id="excavation-depth" value={customFields['Excavation depth'] ?? ''} onChange={(e) => setCustomFields((p) => ({ ...p, 'Excavation depth': e.target.value }))} placeholder="e.g., 1.5m" />
                                </div>
                            )}
                            {permitType === 'Confined Space' && (
                                <div className="dynamic-field">
                                    <label htmlFor="gas-readings">Gas Test Readings (O2, LEL, H2S, CO)</label>
                                    <input id="gas-readings" value={customFields['Atmosphere test'] ?? ''} onChange={(e) => setCustomFields((p) => ({ ...p, 'Atmosphere test': e.target.value }))} placeholder="e.g., 20.9%, 0%, 0ppm, 5ppm" />
                                </div>
                            )}
                            {permitType === 'Hot Work' && (
                                <p className="guidance-text"><strong>Guidance:</strong> Ensure a designated Fire Watch is assigned and gas testing is completed before starting work.</p>
                            )}

                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <label className="field-label">Controls & Isolation</label>
                            <p className="muted">Specify controls, PPE, and isolation points.</p>
                            <div className="tooltip-container">
                                LOTO
                                <span className="tooltip-icon">?</span>
                                <div className="tooltip-text">Lockout/Tagout: A safety procedure to ensure dangerous machines are properly shut off and not started up again prior to the completion of maintenance or repair work.</div>
                            </div>

                            <div className="checklist-group">
                                <label className="field-label">Common Controls</label>
                                <div className="checklist-grid">
                                    {commonControls.map(control => (
                                        <div key={control} className="checkbox-item">
                                            <input type="checkbox" id={`control-${control}`} checked={selections.controls.includes(control)} onChange={() => handleSelectionToggle('controls', control)} />
                                            <label htmlFor={`control-${control}`}>{control}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <textarea value={customFields['Other controls'] ?? ''} onChange={(e) => setCustomFields((p) => ({ ...p, 'Other controls': e.target.value }))} placeholder="Describe any other controls not listed above" rows={3} />

                            {/* Dynamic fields for controls */}
                            {permitType === 'Working at Height' && (
                                <div className="dynamic-field">
                                    <label htmlFor="fall-protection">Fall Protection Method</label>
                                    <input id="fall-protection" value={customFields['Fall protection'] ?? ''} onChange={(e) => setCustomFields((p) => ({ ...p, 'Fall protection': e.target.value }))} placeholder="e.g., Full-body harness with SRL" />
                                </div>
                            )}
                            {permitType.includes('Isolation') && (
                                <div className="dynamic-field">
                                    <label htmlFor="loto-ref">LOTO Reference / Tag Numbers</label>
                                    <input id="loto-ref" value={customFields['LOTO reference'] ?? ''} onChange={(e) => setCustomFields((p) => ({ ...p, 'LOTO reference': e.target.value }))} placeholder="e.g., LOTO-123, Tag #456" />
                                </div>
                            )}
                            <input value={customFields['Isolation point'] ?? ''} onChange={(e) => setCustomFields((p) => ({ ...p, 'Isolation point': e.target.value }))} placeholder="Isolation point" />
                            <div className="attachment-field">
                                <label className="field-label" htmlFor="file-input">Attachments</label>
                                <input ref={fileInputRef} type="file" multiple onChange={() => {
                                    const files = fileInputRef.current?.files
                                    if (files && files.length > 0) {
                                        setAttachments(Array.from(files).map((f) => ({ name: f.name, url: '' })))
                                    } else {
                                        setAttachments(null)
                                    }
                                }} id="file-input" />
                                {attachments && attachments.length > 0 ? (
                                    <div className="muted">{attachments.length} file(s) selected</div>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <label className="field-label">Approvals</label>
                            <p className="muted">Assign approvers and add review notes.</p>
                            <label className="field-label" htmlFor="approver-select">Approver Role</label>
                            <select
                                id="approver-select"
                                value={customFields['Approver'] ?? ''}
                                onChange={(e) => setCustomFields((p) => ({ ...p, Approver: e.target.value }))}
                            >
                                <option value="">-- Select Approver Role --</option>
                                {approvalRoles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>

                            <label className="field-label" htmlFor="approval-notes">Notes for Approver</label>
                            <textarea value={customFields['Approval notes'] ?? ''} onChange={(e) => setCustomFields((p) => ({ ...p, 'Approval notes': e.target.value }))} placeholder="Notes for approvers" rows={2} />
                        </div>
                    )}

                    {step === 4 && (
                        <div>
                            <h4>Review</h4>
                            <p className="muted">Confirm details before raising the permit.</p>
                            <div className="review-summary">
                                <div><strong>Title:</strong> {title}</div>
                                <div><strong>Type:</strong> {permitType}</div>
                                <div><strong>Site:</strong> {siteId}</div>
                                <div><strong>Description:</strong> {description}</div>
                                {selections.hazards.length > 0 && (
                                    <div><strong>Identified Hazards:</strong> {selections.hazards.join(', ')}</div>
                                )}
                                {selections.controls.length > 0 && (
                                    <div><strong>Implemented Controls:</strong> {selections.controls.join(', ')}</div>
                                )}
                                {Object.entries(customFields).map(([k, v]) => (
                                    <div key={k}><strong>{k}:</strong> {v}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="step-actions">
                    <div style={{ display: 'flex', gap: 8 }}>
                        {step > 0 && <button type="button" className="tertiary-button" onClick={() => setStep((s) => s - 1)}>Back</button>}
                        {step < steps.length - 1 && <button type="button" onClick={() => setStep((s) => s + 1)}>Next</button>}
                        {step === steps.length - 1 && (
                            <button type="submit" disabled={submitting || !isFormValid}>{submitting ? 'Saving...' : 'Raise permit'}</button>
                        )}
                        <button type="button" className="secondary-button" onClick={() => { void (async () => { await ensurePermitConfig(); setMessage('Config refreshed') })() }}>Refresh config</button>
                    </div>
                </div>
            </div>

            {message ? <p className="message">{message}</p> : null}
        </form>
    )
}
