import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import {
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    onAuthStateChanged,
    sendPasswordResetEmail,
    setPersistence,
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

function getFriendlyAuthErrorMessage(error: unknown) {
    if (typeof error !== 'object' || error === null) {
        return 'Authentication failed. Please try again.'
    }

    const code = 'code' in error && typeof error.code === 'string' ? error.code : ''

    switch (code) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.'
        case 'auth/user-disabled':
            return 'This account has been disabled.'
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Email or password is incorrect.'
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please sign in instead.'
        case 'auth/weak-password':
            return 'Please choose a stronger password with at least 6 characters.'
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection and try again.'
        case 'auth/popup-closed-by-user':
            return 'Google sign-in was cancelled.'
        default:
            return error instanceof Error ? error.message : 'Authentication failed. Please try again.'
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchUserProfile = async (firebaseUser: User) => {
        const userRef = doc(db, 'companies', 'demo-company', 'users', firebaseUser.uid)
        const fallbackProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'Field Supervisor',
            name: firebaseUser.displayName || null,
            phone: firebaseUser.phoneNumber || null,
            createdAt: new Date().toISOString(),
        }

        try {
            const snapshot = await getDoc(userRef)
            if (snapshot.exists()) {
                const data = snapshot.data() as UserProfile
                const nextProfile: UserProfile = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    role: data.role || 'Field Supervisor',
                    name: data.name || firebaseUser.displayName || null,
                    phone: data.phone || firebaseUser.phoneNumber || null,
                    createdAt: data.createdAt || new Date().toISOString(),
                }
                setProfile(nextProfile)
                return
            }

            await setDoc(userRef, fallbackProfile, { merge: true })
            setProfile(fallbackProfile)
        } catch (error) {
            console.error('Unable to sync user profile:', error)
            setProfile(fallbackProfile)
        }
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

        try {
            await setDoc(userRef, profileData, { merge: true })
        } catch (error) {
            console.error('Unable to persist profile:', error)
        }

        setProfile(profileData)
    }

    useEffect(() => {
        let isMounted = true

        const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
            if (!isMounted) return
            setUser(nextUser)
            if (nextUser) {
                await fetchUserProfile(nextUser)
            } else {
                setProfile(null)
            }
            if (isMounted) {
                setLoading(false)
            }
        })

        return () => {
            isMounted = false
            unsubscribe()
        }
    }, [])

    const signIn = async (email: string, password: string) => {
        setLoading(true)
        try {
            await setPersistence(auth, browserLocalPersistence)
            const result = await signInWithEmailAndPassword(auth, email, password)
            await fetchUserProfile(result.user)
            setUser(result.user)
        } catch (error) {
            throw new Error(getFriendlyAuthErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    const signInWithGoogle = async () => {
        setLoading(true)
        try {
            await setPersistence(auth, browserLocalPersistence)
            const provider = new GoogleAuthProvider()
            const result = await signInWithPopup(auth, provider)
            await fetchUserProfile(result.user)
            setUser(result.user)
        } catch (error) {
            throw new Error(getFriendlyAuthErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    const signUp = async (email: string, password: string, name: string, phone: string) => {
        setLoading(true)
        try {
            await setPersistence(auth, browserLocalPersistence)
            const result = await createUserWithEmailAndPassword(auth, email, password)
            await updateProfile(result.user, { displayName: name })
            await ensureUserProfile(result.user, 'Field Supervisor', name, phone)
            setUser(result.user)
        } catch (error) {
            throw new Error(getFriendlyAuthErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email)
        } catch (error) {
            throw new Error(getFriendlyAuthErrorMessage(error))
        }
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
