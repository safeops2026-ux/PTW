export interface PermitRecord {
    id?: string
    title: string
    description: string
    permitType: string
    siteId: string
    status: string
    createdBy: string
    assignedTo: string[]
    createdAt: string
    updatedAt: string
    customFields?: Record<string, string>
    attachments?: Array<{ name: string; url: string; path?: string }>
}

export interface AuditEntry {
    id?: string
    permitId: string
    action: string
    message: string
    actorId: string
    createdAt: string
}

export interface CompanyConfig {
    roles: string[]
    workflow: string[]
    permitTypes: string[]
    sites: string[]
}
