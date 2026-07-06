import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore'
import { db, storage } from './firebase'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import type { AuditEntry, CompanyConfig, PermitRecord } from '../types/permit'

const companyId = 'demo-company'
const siteId = 'demo-site'

export async function ensurePermitConfig() {
    const configRef = collection(db, 'companies', companyId, 'config')
    const snapshot = await getDocs(configRef)
    if (!snapshot.empty) {
        return snapshot.docs[0].data()
    }

    const defaultConfig = {
        roles: ['Field Supervisor', 'Area Authority', 'HSE Officer', 'Supervisor', 'Manager', 'Admin'],
        workflow: ['Draft', 'Pending Review', 'Pending Approval', 'Approved', 'Work in Progress', 'Closed', 'Rejected', 'Cancelled'],
        permitTypes: [
            'Hot Work',
            'Confined Space',
            'Electrical Isolation',
            'Working at Height',
            'Excavation / Earthworks',
            'Line Breaking / Pipeline Maintenance',
            'Mechanical Isolation',
            'Permit Extension / Revalidation',
            'Shutdown / Outage',
            'Chemical Handling',
            'Inspection / Survey',
            'Temporary Power',
        ],
        sites: ['Main Plant', 'Boiler House', 'Pump House', 'Compressor Station', 'Control Room', 'Storage Yard', 'Workshop', 'Tank Farm', 'Loading Bay', 'Service Platform', 'Warehouse', 'Office Block', 'Drilling Pad', 'Jetty', 'Substation', 'Wastewater Plant', 'Utility Corridor', 'North Access Road', 'South Access Road'],
    }

    const configDocRef = doc(configRef, 'default')
    if (snapshot.empty) {
        await setDoc(configDocRef, defaultConfig)
        return defaultConfig
    }

    const existingConfig = snapshot.docs[0].data() as CompanyConfig
    const mergedConfig: CompanyConfig = {
        roles: Array.from(new Set([...(existingConfig.roles ?? []), ...defaultConfig.roles])),
        workflow: existingConfig.workflow?.length ? existingConfig.workflow : defaultConfig.workflow,
        permitTypes: Array.from(new Set([...(existingConfig.permitTypes ?? []), ...defaultConfig.permitTypes])),
        sites: Array.from(new Set([...(existingConfig.sites ?? []), ...defaultConfig.sites])),
    }

    const needsUpdate =
        mergedConfig.roles.length !== (existingConfig.roles?.length ?? 0) ||
        mergedConfig.workflow.length !== (existingConfig.workflow?.length ?? 0) ||
        mergedConfig.permitTypes.length !== (existingConfig.permitTypes?.length ?? 0) ||
        mergedConfig.sites.length !== (existingConfig.sites?.length ?? 0)

    if (needsUpdate) {
        await setDoc(configDocRef, mergedConfig)
    }

    return mergedConfig
}

export async function getPermitConfig(): Promise<CompanyConfig | null> {
    const configRef = collection(db, 'companies', companyId, 'config')
    const snapshot = await getDocs(configRef)
    return snapshot.docs.map((doc) => doc.data() as CompanyConfig)[0] ?? null
}

export function subscribeToPermits(onChange: (permits: PermitRecord[]) => void) {
    const permitsRef = collection(db, 'companies', companyId, 'sites', siteId, 'permits')
    const q = query(permitsRef, orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const permits = snapshot.docs.map((document) => ({ id: document.id, ...document.data() } as PermitRecord))
        onChange(permits)
    })
    return unsubscribe
}

export function subscribeToConfig(onChange: (config: CompanyConfig) => void) {
    const configDoc = doc(db, 'companies', companyId, 'config', 'default')
    const unsubscribe = onSnapshot(configDoc, (snap) => {
        if (snap.exists()) {
            onChange(snap.data() as CompanyConfig)
        }
    })
    return unsubscribe
}

export async function updatePermitConfig(patch: Partial<CompanyConfig>) {
    const configDoc = doc(db, 'companies', companyId, 'config', 'default')
    await setDoc(configDoc, patch, { merge: true })
    return true
}

export async function getPermits() {
    const permitsRef = collection(db, 'companies', companyId, 'sites', siteId, 'permits')
    const q = query(permitsRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() } as PermitRecord))
}

export async function createPermit(permit: Omit<PermitRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    const permitsRef = collection(db, 'companies', companyId, 'sites', siteId, 'permits')
    const permitDoc = await addDoc(permitsRef, {
        ...permit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    // if attachments were included (client may have uploaded and passed urls)
    if ((permit as any).attachments && Array.isArray((permit as any).attachments)) {
        const permitRef = doc(db, 'companies', companyId, 'sites', siteId, 'permits', permitDoc.id)
        await updateDoc(permitRef, { attachments: (permit as any).attachments })
    }

    const auditRef = collection(db, 'companies', companyId, 'sites', siteId, 'auditTrail')
    await addDoc(auditRef, {
        permitId: permitDoc.id,
        action: 'permit-created',
        message: 'Permit created',
        actorId: permit.createdBy,
        createdAt: serverTimestamp(),
    })

    return permitDoc
}

export async function uploadAttachment(file: File, permitFolder?: string) {
    const path = `companies/${companyId}/sites/${siteId}/attachments/${permitFolder ?? 'temp'}/${Date.now()}-${file.name}`
    const r = storageRef(storage, path)
    await uploadBytes(r, file)
    const url = await getDownloadURL(r)
    return { name: file.name, url, path }
}

export async function uploadAttachments(files: File[] | FileList, permitFolder?: string) {
    const arr = Array.from(files as any as File[])
    const results = []
    for (const f of arr) {
        // eslint-disable-next-line no-await-in-loop
        const meta = await uploadAttachment(f, permitFolder)
        results.push(meta)
    }
    return results
}

export async function updatePermitStatus(permitId: string, status: string, message: string, actorId: string) {
    const permitRef = doc(db, 'companies', companyId, 'sites', siteId, 'permits', permitId)
    await updateDoc(permitRef, {
        status,
        updatedAt: serverTimestamp(),
    })

    const auditRef = collection(db, 'companies', companyId, 'sites', siteId, 'auditTrail')
    await addDoc(auditRef, {
        permitId,
        action: 'status-update',
        message,
        actorId,
        createdAt: serverTimestamp(),
    })
}

export async function getAuditTrail(permitId: string) {
    const auditRef = collection(db, 'companies', companyId, 'sites', siteId, 'auditTrail')
    const q = query(auditRef, where('permitId', '==', permitId), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() } as AuditEntry))
}

export async function bulkUpdatePermitStatus(permitIds: string[], status: string, message: string, actorId: string) {
    const batch = writeBatch(db)

    permitIds.forEach(permitId => {
        // Update permit status
        const permitRef = doc(db, 'companies', companyId, 'sites', siteId, 'permits', permitId)
        batch.update(permitRef, {
            status,
            updatedAt: serverTimestamp(),
        })

        // Add audit trail entry
        const auditRef = doc(collection(db, 'companies', companyId, 'sites', siteId, 'auditTrail'))
        batch.set(auditRef, {
            permitId,
            actorId,
            action: `Status changed to ${status}`,
            message,
            createdAt: serverTimestamp(),
        })
    })

    await batch.commit()
}

export async function bulkDeletePermits(permitIds: string[], actorId: string) {
    const batch = writeBatch(db)

    permitIds.forEach(permitId => {
        // Delete the permit
        const permitRef = doc(db, 'companies', companyId, 'sites', siteId, 'permits', permitId)
        batch.delete(permitRef)

        // Add a final audit trail entry for deletion
        const auditRef = doc(collection(db, 'companies', companyId, 'sites', siteId, 'auditTrail'))
        batch.set(auditRef, {
            permitId,
            actorId,
            action: 'Permit deleted',
            message: `Permit with ID ${permitId} was permanently deleted.`,
            createdAt: serverTimestamp(),
        })
    })

    await batch.commit()
}
