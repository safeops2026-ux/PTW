import { useEffect, useState, type FormEvent } from 'react'
import { createPermit, getPermitConfig, ensurePermitConfig } from '../services/ptw'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import type { CompanyConfig } from '../types/permit'

export function PermitComposer({ onCreated }: { onCreated: () => void }) {
    const { user, profile } = useAuth()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [permitType, setPermitType] = useState('General')
    const [siteId, setSiteId] = useState('demo-site')
    const [customFieldLabel, setCustomFieldLabel] = useState('Custom field')
    const [customFieldValue, setCustomFieldValue] = useState('')
    const [customFields, setCustomFields] = useState<Record<string, string>>({})
    const [message, setMessage] = useState('')
    const [config, setConfig] = useState<CompanyConfig | null>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        void loadConfig()
    }, [])

    const loadConfig = async () => {
        const data = await getPermitConfig()
        if (data) {
            setConfig(data as unknown as CompanyConfig)
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
        setCustomFieldLabel('Custom field')
        setCustomFieldValue('')
        setMessage('Custom field added.')
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
                permitType: permitType.trim() || 'General',
                siteId: trimmedSite || 'demo-site',
                status: 'Draft',
                createdBy: user.uid,
                assignedTo: [profile.role],
                customFields: customFields,
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
            <p className="muted">Capture the permit details and save them directly to Firestore.</p>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Permit title" required />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
            <input
                value={permitType}
                onChange={(event) => setPermitType(event.target.value)}
                placeholder="Permit type (e.g. Hot Work, Electrical Isolation)"
            />
            <input value={siteId} onChange={(event) => setSiteId(event.target.value)} placeholder="Site or location" />
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
