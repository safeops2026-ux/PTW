export interface Permit {
    id?: string
    title: string
    status: string
    createdAt: string
    updatedAt: string
    siteId?: string
    createdBy?: string
    assignedTo?: string[]
}

export interface AuditLog {
    id?: string
    permitId: string
    action: string
    message: string
    createdAt: string
    actorId?: string
}
