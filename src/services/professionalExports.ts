import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PermitRecord } from '../types/permit'

/**
 * Generates a professional, multi-page PDF report for a list of permits.
 * Includes a header, footer, summary metrics, and a styled table of permit data.
 *
 * @param permits - The array of permit records to include in the report.
 * @param columns - The specific columns to display in the table.
 */
export const exportToProfessionalPdf = async (permits: PermitRecord[], columns: string[]) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    })

    const reportTitle = 'Safety Compliance Report'
    const generationDate = new Date().toLocaleString()
    const totalPermits = permits.length
    const openPermits = permits.filter(p => !['Closed', 'Cancelled', 'Rejected'].includes(p.status)).length
    const pendingPermits = permits.filter(p => p.status.includes('Pending')).length

    // Define Header
    const header = (data: any) => {
        doc.setFontSize(18)
        doc.setTextColor(40)
        doc.setFont('helvetica', 'normal') // Use a standard font
        // You can add a logo here, e.g., doc.addImage(logo, 'PNG', data.settings.margin.left, 15, 10, 10)
        doc.text(reportTitle, data.settings.margin.left, 22)

        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.text(`Generated: ${generationDate}`, data.settings.margin.left, 28)
    }

    // Define Footer
    const footer = (data: any) => {
        const pageCount = (doc.internal as any).getNumberOfPages()
        doc.setFontSize(8)
        doc.setTextColor(100)
        const pageNumText = `Page ${data.pageNumber} of ${pageCount}`
        doc.text(pageNumText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })
    }

    // Summary "Bento Grid"
    const drawSummaryBoxes = () => {
        const startY = 35
        const boxWidth = 60
        const boxHeight = 20
        const margin = 5

        const summaryData = [
            { label: 'Total Permits in Report', value: totalPermits },
            { label: 'Open / Active Permits', value: openPermits },
            { label: 'Permits Awaiting Action', value: pendingPermits },
        ]

        summaryData.forEach((item, index) => {
            const x = doc.internal.pageSize.getWidth() / 2 - (boxWidth * 1.5 + margin) + (index * (boxWidth + margin))
            doc.setFillColor(248, 250, 252) // background-light
            doc.setDrawColor(203, 213, 225) // border-color
            doc.roundedRect(x, startY, boxWidth, boxHeight, 3, 3, 'FD')

            doc.setFontSize(16)
            doc.setTextColor(15, 23, 42) // text-color
            doc.text(String(item.value), x + boxWidth / 2, startY + 11, { align: 'center' })

            doc.setFontSize(9)
            doc.setTextColor(100, 116, 139) // text-muted
            doc.text(item.label, x + boxWidth / 2, startY + 16, { align: 'center' })
        })
    }

    // Prepare table data
    const head = [columns]
    const body = permits.map(permit => {
        const row: any[] = []
        const toDate = (ts: any) => {
            if (!ts) return 'N/A'
            if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString()
            return new Date(ts).toLocaleString()
        }
        const data = {
            ...permit,
            ...permit.customFields,
            createdAt: toDate(permit.createdAt),
            updatedAt: toDate(permit.updatedAt),
        }
        columns.forEach(col => {
            // Ensure every value is a string to prevent rendering errors
            const value = Object.prototype.hasOwnProperty.call(data, col) ? data[col as keyof typeof data] : ''
            row.push(String(value ?? ''))
        })
        return row
    })

    // Generate the table with professional styling
    autoTable(doc, {
        head,
        body,
        startY: 65,
        didDrawPage: (data) => {
            header(data)
            footer(data)
        },
        margin: { top: 35, bottom: 20 },
        styles: {
            font: 'helvetica', // Ensure font is consistent
            fontSize: 8,
        },
        headStyles: { fillColor: [37, 99, 235] }, // primary-color
        alternateRowStyles: { fillColor: [248, 250, 252] }, // background-light
    })

    drawSummaryBoxes()

    doc.save('HSE_Safelink_Report.pdf')
}