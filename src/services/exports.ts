export async function exportPermitsToPdf(rows: Array<Record<string, unknown>>) {
    const [{ default: jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ])

    const autoTable = (autoTableModule as any).default ?? autoTableModule
    const doc = new jsPDF()
    doc.text('SafeLink PTW Permit Report', 14, 16)
    autoTable(doc, {
        head: [Object.keys(rows[0] ?? {}).slice(0, 5)],
        body: rows.map((row) => Object.values(row).slice(0, 5).map((value) => String(value ?? ''))),
    })
    doc.save('permits-report.pdf')
}

export async function exportPermitsToExcel(rows: Array<Record<string, unknown>>) {
    const XLSX = await import('xlsx')
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Permits')
    XLSX.writeFile(workbook, 'permits-report.xlsx')
}

export async function exportPermitsToImage(rows: Array<Record<string, unknown>>) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        throw new Error('Unable to create canvas context.')
    }

    const columns = Object.keys(rows[0] ?? {})
    const rowHeight = 28
    const margin = 16
    const width = 900
    const height = margin * 2 + rowHeight * (rows.length + 1)

    canvas.width = width
    canvas.height = height

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 16px Arial'
    ctx.fillText('SafeLink PTW Permit Report', margin, 30)
    ctx.font = '14px Arial'

    const startY = 60
    columns.forEach((column, index) => {
        ctx.fillText(column.toString(), margin + index * 180, startY)
    })

    rows.forEach((row, rowIndex) => {
        const y = startY + rowHeight * (rowIndex + 1)
        columns.forEach((column, columnIndex) => {
            const text = String(row[column] ?? '')
            ctx.fillText(text, margin + columnIndex * 180, y)
        })
    })

    return new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to render image.'))
                return
            }
            const anchor = document.createElement('a')
            anchor.href = URL.createObjectURL(blob)
            anchor.download = 'permits-report.png'
            anchor.click()
            URL.revokeObjectURL(anchor.href)
            resolve()
        })
    })
}
