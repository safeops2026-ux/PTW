import { useEffect, useState } from 'react'
import { getPermitConfig, updatePermitStatus } from '../services/ptw'
import type { PermitRecord } from '../types/permit'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'

export function PermitBoard({ permits, onUpdated }: { permits: PermitRecord[]; onUpdated: () => void }) {
    const { user } = useAuth()
    const { notify } = useNotification()
    const [message, setMessage] = useState('')
    const [workflow, setWorkflow] = useState<string[]>([])

    useEffect(() => {
        const loadConfig = async () => {
            const data = await getPermitConfig()
            if (data?.workflow) {
                setWorkflow(data.workflow)
            } else {
                setWorkflow(['Draft', 'Pending Review', 'Pending Approval', 'Approved'])
            }
        }

        void loadConfig()
    }, [])

    const handleUpdateStatus = async (permitId: string, status: string) => {
        const permit = permits.find((item) => item.id === permitId)
        if (!permit || !user) {
            setMessage('Sign in to update a permit.')
            return
        }

        if (status === permit.status) {
            setMessage('Permit is already at that status.')
            return
        }

        try {
            await updatePermitStatus(permitId, status, `Status updated to ${status} from dashboard`, user.uid)
            const successMessage = `Permit moved to ${status}.`
            setMessage(successMessage)
            notify(successMessage, 'success')
            onUpdated()
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Update failed'
            setMessage(errorMessage)
            notify(errorMessage, 'error')
        }
    }

    return (
        <section className="card">
            <h3>Permit board</h3>
            <p className="muted">Track live permit workflow progress and move permits forward.</p>
            {message ? <p className="message">{message}</p> : null}
            {permits.length === 0 ? (
                <div className="empty-state">
                    <p>No permits yet. Raise the first permit to start the workflow.</p>
                </div>
            ) : (
                <div className="permit-list">
                    {permits.map((permit) => {
                        const currentIndex = workflow.indexOf(permit.status)
                        const availableStatuses = currentIndex === -1 ? workflow : workflow.filter((status) => status !== permit.status)
                        const canMove = Boolean(user) && availableStatuses.length > 0

                        return (
                            <article key={permit.id} className="permit-item">
                                <div>
                                    <strong>{permit.title}</strong>
                                    <p>{permit.description}</p>
                                </div>
                                <div className="permit-meta">
                                    <span className="status-badge">{permit.status}</span>
                                    {workflow.length > 0 ? (
                                        <select
                                            value={permit.status}
                                            onChange={(event) => void handleUpdateStatus(permit.id ?? '', event.target.value)}
                                            disabled={!canMove}
                                        >
                                            {workflow.map((status) => (
                                                <option key={status} value={status}>
                                                    {status}
                                                </option>
                                            ))}
                                        </select>
                                    ) : null}
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
