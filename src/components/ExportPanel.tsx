import { useMemo, useState } from 'react'
import { exportPermitsToExcel, exportPermitsToImage } from '../services/exports'
import type { PermitRecord } from '../types/permit'
import { useNotification } from '../context/NotificationContext'

import { exportToProfessionalPdf } from '../services/professionalExports'
const columnGroups = {
    'Core Details': ['title', 'status', 'permitType', 'description', 'siteId'],
    'Compliance Data': ['Approver', 'JSA reference', 'LOTO reference', 'Revalidation reason'],
    'Operational Data': ['Identified Hazards', 'Implemented Controls', 'Other hazards', 'Other controls', 'Excavation depth', 'Atmosphere test', 'Fall protection', 'createdBy', 'createdAt', 'updatedAt'],
}

const presets = {
    'Safety Auditor': [...columnGroups['Core Details'], ...columnGroups['Compliance Data'], ...columnGroups['Operational Data']],
    'Operations Manager': ['title', 'status', 'permitType', 'siteId', 'Approver'],
}

export function ExportPanel({ permits }: { permits: PermitRecord[] }) {
    const { notify } = useNotification()
    const [message, setMessage] = useState('')
    const [showColumns, setShowColumns] = useState(false)
    const [exporting, setExporting] = useState(false)

    const allColumns = useMemo(() => {
        const standard = [
            ...columnGroups['Core Details'],
            ...columnGroups['Compliance Data'],
            ...columnGroups['Operational Data'],
        ]
        const custom = new Set<string>()
        permits.forEach((p) => {
            if (p.customFields) {
                Object.keys(p.customFields).forEach((key) => custom.add(key))
            }
        })
        return [...standard, ...Array.from(custom).sort()]
    }, [permits])

    const [selectedColumns, setSelectedColumns] = useState<string[]>(columnGroups['Core Details'])

    const handleColumnToggle = (column: string) => {
        setSelectedColumns((prev) => (prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]))
    }

    const handleGroupToggle = (groupName: keyof typeof columnGroups, select: boolean) => {
        const groupCols = columnGroups[groupName]
        setSelectedColumns(prev => {
            const otherCols = prev.filter(c => !groupCols.includes(c))
            return select ? [...otherCols, ...groupCols] : otherCols
        })
    }

    const applyPreset = (presetName: keyof typeof presets) => {
        const presetCols = presets[presetName]
        // Filter to only include columns that actually exist in the data
        setSelectedColumns(presetCols.filter(c => allColumns.includes(c)))
        notify(`Applied "${presetName}" preset.`, 'info')
    }

    const getRows = () => {
        return permits.map((permit) => {
            // Create a comprehensive data object for each permit
            const toDate = (ts: any) => {
                if (!ts) return 'N/A'
                if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString()
                return new Date(ts).toLocaleString()
            }
            const data = {
                ...permit,
                ...permit.customFields, // Spread all custom fields
                createdAt: toDate(permit.createdAt),
                updatedAt: toDate(permit.updatedAt),
            }

            const row: Record<string, any> = {}
            // Build the row object based on the selected columns to ensure consistent structure
            for (const col of selectedColumns) {
                // Use `hasOwnProperty` to check if the property exists on the combined data object
                // If it exists, use its value; otherwise, provide an empty string for consistency in the report.
                row[col] = Object.prototype.hasOwnProperty.call(data, col)
                    ? data[col as keyof typeof data] ?? ''
                    : ''
            }
            return row
        })
    }

    const handleExport = async (format: 'pdf' | 'excel' | 'image') => {
        setExporting(true)
        if (!permits.length) {
            setMessage('No permits available to export.')
            return
        }

        if (selectedColumns.length === 0) {
            setMessage('Please select at least one column to export.')
            return
        }

        const rows = getRows()
        try {
            const start = Date.now()
            notify(`Generating ${format.toUpperCase()} report...`, 'info')
            if (format === 'pdf') {
                await exportToProfessionalPdf(permits, selectedColumns)
            } else if (format === 'excel') {
                await exportPermitsToExcel(rows)
            } else if (format === 'image') {
                await exportPermitsToImage(rows)
            }
            const duration = (Date.now() - start) / 1000
            notify(`${format.toUpperCase()} report generated in ${duration.toFixed(1)}s.`, 'success')
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Export failed.'
            setMessage(errorMessage)
            notify(errorMessage, 'error')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="card export-card">
            <div className="card-header">
                <h3>Report Generation Hub</h3>
                <p className="muted">Build and export reports from the filtered permit data.</p>
            </div>
            <div className="export-presets">
                <label className="field-label">Presets</label>
                <div className="action-row">
                    {Object.keys(presets).map(p => (
                        <button key={p} type="button" className="tertiary-button" onClick={() => applyPreset(p as keyof typeof presets)}>{p}</button>
                    ))}
                </div>
            </div>
            <div className="export-config">
                <button type="button" className="tertiary-button" onClick={() => setShowColumns(!showColumns)}>
                    {showColumns ? 'Hide' : 'Customize'} Columns ({selectedColumns.length} selected)
                </button>
                {showColumns ? (
                    <div className="column-builder">
                        {Object.entries(columnGroups).map(([groupName, columns]) => (
                            <div key={groupName} className="column-group">
                                <div className="column-group-header">
                                    <h4>{groupName}</h4>
                                    <div className="action-row">
                                        <button type="button" className="link-button" onClick={() => handleGroupToggle(groupName as keyof typeof columnGroups, true)}>All</button>
                                        <button type="button" className="link-button" onClick={() => handleGroupToggle(groupName as keyof typeof columnGroups, false)}>None</button>
                                    </div>
                                </div>
                                <div className="column-selector-grid">
                                    {columns.filter(c => allColumns.includes(c)).map((col) => (
                                        <div key={col} className="checkbox-item">
                                            <input type="checkbox" id={`col-${col}`} checked={selectedColumns.includes(col)} onChange={() => handleColumnToggle(col)} />
                                            <label htmlFor={`col-${col}`}>{col}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
            <div className="export-actions">
                <button type="button" onClick={() => void handleExport('pdf')} disabled={exporting}>{exporting ? 'Generating...' : 'Generate PDF'}</button>
                <button type="button" onClick={() => void handleExport('excel')} disabled={exporting}>{exporting ? 'Generating...' : 'Generate Excel'}</button>
                <button type="button" onClick={() => void handleExport('image')} disabled={exporting}>{exporting ? 'Generating...' : 'Generate PNG'}</button>
            </div>
            {message ? <p className="message">{message}</p> : null}
        </div>
    )
}
