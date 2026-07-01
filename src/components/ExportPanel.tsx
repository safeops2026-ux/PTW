import { useState } from 'react'
import { exportPermitsToExcel, exportPermitsToPdf, exportPermitsToDocx, exportPermitsToImage } from '../services/exports'
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

    const handleExport = async (format: 'pdf' | 'excel' | 'docx' | 'image') => {
        if (!permits.length) {
            setMessage('No permits available to export.')
            return
        }

        const rows = getRows()
        try {
            if (format === 'pdf') {
                exportPermitsToPdf(rows)
                setMessage('PDF export generated.')
            } else if (format === 'excel') {
                exportPermitsToExcel(rows)
                setMessage('Excel export generated.')
            } else if (format === 'docx') {
                await exportPermitsToDocx(rows)
                setMessage('Word export generated.')
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
        <div className="card">
            <h3>Export</h3>
            <div className="export-actions">
                <button type="button" onClick={() => void handleExport('pdf')}>Export PDF</button>
                <button type="button" onClick={() => void handleExport('excel')}>Export Excel</button>
                <button type="button" onClick={() => void handleExport('docx')}>Export Word</button>
                <button type="button" onClick={() => void handleExport('image')}>Export PNG</button>
            </div>
            {message ? <p>{message}</p> : null}
        </div>
    )
}
