import { useEffect, useState, useRef, type FormEvent } from 'react'
import { createPermit, ensurePermitConfig, subscribeToConfig, uploadAttachments } from '../services/ptw'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import type { CompanyConfig } from '../types/permit'

const presetFields = [
    { key: 'Hazard identification', value: 'Describe the hazard' },
    { key: 'JSA reference', value: 'Enter JSA or job safety analysis' },
    { key: 'Isolation point', value: 'Enter isolation location' },
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
}

export function PermitComposer({ onCreated }: { onCreated: () => void }) {
    const { user, profile } = useAuth()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [permitType, setPermitType] = useState('Hot Work')
    const [siteId, setSiteId] = useState('Main Plant')

    const [customFields, setCustomFields] = useState<Record<string, string>>({})
    const [attachments, setAttachments] = useState<Array<{ name: string; url: string }> | null>(null)
    const [message, setMessage] = useState('')
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [config, setConfig] = useState<CompanyConfig | null>(null)
    const [submitting, setSubmitting] = useState(false)

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


    const handleAddPresetField = (key: string, value: string) => {
        setCustomFields((prev) => ({ ...prev, [key]: value }))
        setMessage(`${key} field added.`)
    }

    // custom field helpers are handled inline in the guided form

    const allowedCreatorRoles = ['Field Supervisor', 'Technician', 'Requester', 'Supervisor', 'Admin']

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault()
        setMessage('')

        const trimmedTitle = title.trim()
        const trimmedDescription = description.trim()
        const trimmedSite = siteId.trim()

        if (!trimmedTitle) {
            setMessage('Please enter a permit title.')
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
                customFields,
                attachments: uploaded ?? [],
            })
            const successMessage = 'Permit raised and saved to Firestore.'
            setMessage(successMessage)
            notify(successMessage, 'success')
            setTitle('')
            setDescription('')
            setPermitType(config?.permitTypes?.[0] ?? 'General')
            setSiteId(config?.sites?.[0] ?? 'demo-site')
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
                    <select
                        id="permit-site"
                        value={siteId}
                        onChange={(event) => setSiteId(event.target.value)}
                        title="Select site or location for this permit"
                    >
                        {(config?.sites ?? ['Main Plant', 'Boiler House', 'Pump House']).map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="stepper">
                <div className="step-labels">
                    {steps.map((label, idx) => (
                        <button key={label} type="button" className={`step-pill ${idx === step ? 'active' : ''}`} onClick={() => setStep(idx)}>
                            {label}
                        </button>
                    ))}
                </div>

                <div className="step-content">
                    {step === 0 && (
                        <div>
                            <label className="field-label" htmlFor="permit-title">Permit title</label>
                            <input id="permit-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Permit title" required title="Short descriptive title for the permit" />

                            <label className="field-label" htmlFor="permit-description">Work details</label>
                            <textarea id="permit-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the work to be done" rows={4} title="Describe the work, location, and main tasks" />
                        </div>
                    )}

                    {step === 1 && (
                        <div>
                            <label className="field-label">Hazards</label>
                            <p className="muted">List hazards and select preset suggestions.</p>
                            <div className="field-suggestions">
                                {presetFields.map((preset) => (
                                    <button type="button" key={preset.key} className="tertiary-button" onClick={() => handleAddPresetField(preset.key, preset.value)}>{preset.key}</button>
                                ))}
                            </div>
                            <textarea value={customFields['Hazard identification'] ?? ''} onChange={(e) => setCustomFields((p) => ({ ...p, 'Hazard identification': e.target.value }))} placeholder="Describe hazards" rows={3} />
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <label className="field-label">Controls & Isolation</label>
                            <p className="muted">Specify controls, PPE, and isolation points.</p>
                            <textarea value={customFields['Control measures'] ?? ''} onChange={(e) => setCustomFields((p) => ({ ...p, 'Control measures': e.target.value }))} placeholder="Control measures" rows={3} />
                            <input value={customFields['Isolation point'] ?? ''} onChange={(e) => setCustomFields((p) => ({ ...p, 'Isolation point': e.target.value }))} placeholder="Isolation point" />
                            <div style={{ marginTop: 8 }}>
                                <label className="field-label">Attachments</label>
                                <input ref={fileInputRef} type="file" multiple onChange={() => {
                                    const files = fileInputRef.current?.files
                                    if (files && files.length > 0) {
                                        setAttachments(Array.from(files).map((f) => ({ name: f.name, url: '' })))
                                    } else {
                                        setAttachments(null)
                                    }
                                }} />
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
                            <input value={customFields['Approver'] ?? profile?.role ?? ''} onChange={(e) => setCustomFields((p) => ({ ...p, Approver: e.target.value }))} placeholder="Approver role or user" />
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
                            <button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Raise permit'}</button>
                        )}
                        <button type="button" className="secondary-button" onClick={() => { void (async () => { await ensurePermitConfig(); setMessage('Config refreshed') })() }}>Refresh config</button>
                    </div>
                </div>
            </div>

            {message ? <p className="message">{message}</p> : null}
        </form>
    )
}
