import {
    addDoc,
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore'
import { db } from './firebase'
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
        roles: ['Field Supervisor', 'Area Authority', 'HSE Officer', 'Admin'],
        workflow: ['Draft', 'Pending Review', 'Pending Approval', 'Approved', 'Work in Progress', 'Closed', 'Rejected', 'Cancelled'],
        permitTypes: ['Hot Work', 'Confined Space', 'Electrical Isolation'],
        sites: ['demo-site'],
    }

    await setDoc(doc(configRef, 'default'), defaultConfig)
    return defaultConfig
}

export async function getPermitConfig(): Promise<CompanyConfig | null> {
    const configRef = collection(db, 'companies', companyId, 'config')
    const snapshot = await getDocs(configRef)
    return snapshot.docs.map((doc) => doc.data() as CompanyConfig)[0] ?? null
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
