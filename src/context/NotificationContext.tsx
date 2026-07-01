import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type NotificationType = 'success' | 'error' | 'info'

export interface Notification {
    id: string
    type: NotificationType
    message: string
}

interface NotificationContextValue {
    notify: (message: string, type?: NotificationType) => void
    notifications: Notification[]
    removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([])

    const removeNotification = useCallback((id: string) => {
        setNotifications((current) => current.filter((notification) => notification.id !== id))
    }, [])

    const notify = useCallback((message: string, type: NotificationType = 'info') => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const notification: Notification = { id, type, message }

        setNotifications((current) => [...current, notification])
        window.setTimeout(() => removeNotification(id), 4500)
    }, [removeNotification])

    const value = useMemo(
        () => ({ notify, notifications, removeNotification }),
        [notify, notifications, removeNotification],
    )

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotification() {
    const context = useContext(NotificationContext)
    if (!context) {
        throw new Error('useNotification must be used inside a NotificationProvider')
    }
    return context
}
