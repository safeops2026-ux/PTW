import { useEffect, useState, type FormEvent } from 'react'
import { createPermit, ensurePermitConfig } from '../services/ptw'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import type { CompanyConfig } from '../types/permit'

const presetFields = [
    { key: 'Hazard identification', value: 'Describe the hazard' },
    { key: 'JSA reference', value: 'Enter JSA or job safety analysis' },
    { key: 'Isolation point', value: 'Enter isolation location' },
]

export function PermitComposer({ onCreated }: { onCreated: () => void }) {
    const { user, profile } = useAuth()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [permitType, setPermitType] = useState('Hot Work')
    const [siteId, setSiteId] = useState('Main Plant')
    const [customFieldLabel, setCustomFieldLabel] = useState('')
    const [customFieldValue, setCustomFieldValue] = useState('')
    const [customFields, setCustomFields] = useState<Record<string, string>>({})
    const [message, setMessage] = useState('')
    const [config, setConfig] = useState<CompanyConfig | null>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        void loadConfig()
    }, [])

    const loadConfig = async () => {
        const data = await ensurePermitConfig()
        if (data) {
            const typed = data as CompanyConfig
            setConfig(typed)
            setPermitType(typed.permitTypes?.[0] ?? 'Hot Work')
            setSiteId(typed.sites?.[0] ?? 'Main Plant')
        }
    }

    const { notify } = useNotification()

    const handleAddCustomField = () => {
        const key = customFieldLabel.trim()
        const value = customFieldValue.trim()

        if (!key || !value) {
            setMessage('Enter both a field name and a value.')
            return
        }

        setCustomFields((prev) => ({ ...prev, [key]: value }))
        setCustomFieldLabel('')
        setCustomFieldValue('')
        setMessage('Custom field added.')
    }

    const handleAddPresetField = (key: string, value: string) => {
        setCustomFields((prev) => ({ ...prev, [key]: value }))
        setMessage(`${key} field added.`)
    }

    const handleRemoveCustomField = (key: string) => {
        setCustomFields((prev) => {
            const next = { ...prev }
            delete next[key]
            return next
        })
    }

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

        try {
            setSubmitting(true)
            await ensurePermitConfig()
            await createPermit({
                title: trimmedTitle,
                description: trimmedDescription,
                permitType: permitType.trim() || 'Hot Work',
                siteId: trimmedSite || (config?.sites?.[0] ?? 'Main Plant'),
                status: 'Draft',
                createdBy: user.uid,
                assignedTo: [profile.role],
                customFields,
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

    return (
        <form className="card" onSubmit={handleSubmit}>
            <h3>Create permit</h3>
            <p className="muted">Raise a new permit with site, type, description, and optional custom data.</p>
            <label className="field-label" htmlFor="permit-title">Permit title</label>
            <input
                id="permit-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Permit title"
                required
            />

            <label className="field-label" htmlFor="permit-description">Description</label>
            <textarea
                id="permit-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the work, hazards, and controls"
                rows={4}
            />

            <div className="select-row">
                <div>
                    <label className="field-label" htmlFor="permit-type">Permit type</label>
                    <select
                        id="permit-type"
                        value={permitType}
                        onChange={(event) => setPermitType(event.target.value)}
                    >
                        {(config?.permitTypes ?? ['Hot Work', 'Cold Work', 'Confined Space Entry', 'Electrical Isolation / LOTO', 'Mechanical Isolation', 'Excavation / Earthworks', 'Working at Height', 'Temporary Power', 'Permit Extension / Revalidation', 'Inspection / Maintenance']).map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="field-label" htmlFor="permit-site">Site / location</label>
                    <select
                        id="permit-site"
                        value={siteId}
                        onChange={(event) => setSiteId(event.target.value)}
                    >
                        {(config?.sites ?? ['Main Plant', 'Boiler House', 'Pump House', 'Compressor Station', 'Control Room', 'Storage Yard', 'Workshop', 'Tank Farm', 'Loading Bay', 'Service Platform']).map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="permit-guide card guide-card">
                <h4>Permit type guide</h4>
                <ul>
                    <li><strong>Hot Work</strong>: welding, cutting, grinding or anything that creates sparks.</li>
                    <li><strong>Cold Work</strong>: non-sparking maintenance, inspections, and general tasks.</li>
                    <li><strong>Confined Space Entry</strong>: work inside tanks, vessels, booths, or enclosed areas.</li>
                    <li><strong>Electrical Isolation / LOTO</strong>: locking out power sources before maintenance.</li>
                    <li><strong>Mechanical Isolation</strong>: isolating valves, pipes, and moving machinery.</li>
                    <li><strong>Excavation / Earthworks</strong>: digging, trenching, or ground work near equipment.</li>
                    <li><strong>Working at Height</strong>: scaffolding, ladders, platforms, or rooftop access.</li>
                    <li><strong>Temporary Power</strong>: portable generator, temporary supply, or electrical extensions.</li>
                    <li><strong>Inspection / Maintenance</strong>: routine checks, calibrations, and preventive work.</li>
                    <li><strong>Permit Extension / Revalidation</strong>: extend or renew an active permit.</li>
                </ul>
            </div>

            <div className="field-suggestions">
                {presetFields.map((preset) => (
                    <button
                        type="button"
                        key={preset.key}
                        className="tertiary-button"
                        onClick={() => handleAddPresetField(preset.key, preset.value)}
                    >
                        Add {preset.key}
                    </button>
                ))}
            </div>

            <div className="custom-field-row">
                <input
                    value={customFieldLabel}
                    onChange={(event) => setCustomFieldLabel(event.target.value)}
                    placeholder="Field name"
                />
                <input
                    value={customFieldValue}
                    onChange={(event) => setCustomFieldValue(event.target.value)}
                    placeholder="Field value"
                />
                <button type="button" className="secondary-button" onClick={handleAddCustomField}>
                    Add field
                </button>
            </div>

            {Object.keys(customFields).length > 0 ? (
                <div className="custom-field-list">
                    <strong>Additional fields</strong>
                    {Object.entries(customFields).map(([key, value]) => (
                        <div key={key} className="custom-field-item">
                            <span>{key}: {value}</span>
                            <button type="button" className="tertiary-button" onClick={() => handleRemoveCustomField(key)}>
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}

            <div className="action-row">
                <button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Raise permit'}
                </button>
                <button type="button" className="secondary-button" onClick={() => void loadConfig()}>
                    Refresh config
                </button>
            </div>

            {message ? <p className="message">{message}</p> : null}
        </form>
    )
}
