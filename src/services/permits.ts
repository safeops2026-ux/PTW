import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { Permit, AuditLog } from '../types'

export async function createPermit(permit: Omit<Permit, 'id' | 'createdAt' | 'updatedAt'>) {
    const permitsCol = collection(db, 'companies', 'demo-company', 'sites', 'demo-site', 'permits')
    return addDoc(permitsCol, {
        ...permit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
}

export async function updatePermitStatus(permitId: string, status: string, message: string) {
    const permitRef = doc(db, 'companies', 'demo-company', 'sites', 'demo-site', 'permits', permitId)
    await updateDoc(permitRef, { status, updatedAt: serverTimestamp() })

    const auditTrailCol = collection(db, 'companies', 'demo-company', 'sites', 'demo-site', 'auditTrail')
    const log: Omit<AuditLog, 'id'> = {
        permitId,
        action: 'status-update',
        message,
        createdAt: new Date().toISOString(),
    }

    await addDoc(auditTrailCol, log)
}
