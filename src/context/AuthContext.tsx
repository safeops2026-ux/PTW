import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
    type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'

export interface UserProfile {
    uid: string
    email: string | null
    role: string
    name?: string | null
    phone?: string | null
    createdAt: string
}

interface AuthContextValue {
    user: User | null
    profile: UserProfile | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<void>
    signInWithGoogle: () => Promise<void>
    signUp: (email: string, password: string, name: string, phone: string) => Promise<void>
    resetPassword: (email: string) => Promise<void>
    signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchUserProfile = async (firebaseUser: User) => {
        const userRef = doc(db, 'companies', 'demo-company', 'users', firebaseUser.uid)
        const snapshot = await getDoc(userRef)
        if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile
            setProfile({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: data.role || 'Field Supervisor',
                name: data.name || firebaseUser.displayName || null,
                phone: data.phone || firebaseUser.phoneNumber || null,
                createdAt: data.createdAt || new Date().toISOString(),
            })
            return
        }

        const fallbackProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'Field Supervisor',
            name: firebaseUser.displayName || null,
            phone: firebaseUser.phoneNumber || null,
            createdAt: new Date().toISOString(),
        }

        await setDoc(userRef, fallbackProfile)
        setProfile(fallbackProfile)
    }

    const ensureUserProfile = async (firebaseUser: User, role: string, name: string, phone: string) => {
        const userRef = doc(db, 'companies', 'demo-company', 'users', firebaseUser.uid)
        const profileData: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role,
            name,
            phone,
            createdAt: new Date().toISOString(),
        }
        await setDoc(userRef, profileData, { merge: true })
        setProfile(profileData)
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
            setUser(nextUser)
            if (nextUser) {
                await fetchUserProfile(nextUser)
            } else {
                setProfile(null)
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const signIn = async (email: string, password: string) => {
        const result = await signInWithEmailAndPassword(auth, email, password)
        await fetchUserProfile(result.user)
        setUser(result.user)
    }

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider()
        const result = await signInWithPopup(auth, provider)
        await fetchUserProfile(result.user)
        setUser(result.user)
    }

    const signUp = async (email: string, password: string, name: string, phone: string) => {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(result.user, { displayName: name })
        await ensureUserProfile(result.user, 'Field Supervisor', name, phone)
        setUser(result.user)
    }

    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email)
    }

    const signOutUser = async () => {
        await signOut(auth)
        setUser(null)
        setProfile(null)
    }

    const value = useMemo<AuthContextValue>(
        () => ({ user, profile, loading, signIn, signInWithGoogle, signUp, resetPassword, signOutUser }),
        [loading, profile, user],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used inside an AuthProvider')
    }

    return context
}
