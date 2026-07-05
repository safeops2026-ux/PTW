import { useState } from 'react'
import { exportPermitsToExcel, exportPermitsToPdf, exportPermitsToImage } from '../services/exports'
import type { PermitRecord } from '../types/permit'

export function ExportPanel({ permits }: { permits: PermitRecord[] }) {
    const [message, setMessage] = useState('')

    const getRows = () => permits.map((permit) => ({
        title: permit.title,
        status: permit.status,
        permitType: permit.permitType,
        description: permit.description,
        siteId: permit.siteId,
        ...permit.customFields,
    }))

    const handleExport = async (format: 'pdf' | 'excel' | 'image') => {
        if (!permits.length) {
            setMessage('No permits available to export.')
            return
        }

        const rows = getRows()
        try {
            if (format === 'pdf') {
                await exportPermitsToPdf(rows)
                setMessage('PDF export generated.')
            } else if (format === 'excel') {
                await exportPermitsToExcel(rows)
                setMessage('Excel export generated.')
            } else if (format === 'image') {
                await exportPermitsToImage(rows)
                setMessage('PNG export generated.')
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Export failed.'
            setMessage(errorMessage)
        }
    }

    return (
        <div className="card export-card">
            <div className="card-header">
                <h3>Export permit data</h3>
                <p className="muted">Download the current permit dataset with all custom fields.</p>
            </div>
            <div className="export-actions">
                <button type="button" onClick={() => void handleExport('pdf')}>PDF</button>
                <button type="button" onClick={() => void handleExport('excel')}>Excel</button>
                <button type="button" onClick={() => void handleExport('image')}>PNG</button>
            </div>
            {message ? <p className="message">{message}</p> : null}
        </div>
    )
}
