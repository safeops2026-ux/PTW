import { useNotification } from '../context/NotificationContext'

export function Notifications() {
    const { notifications, removeNotification } = useNotification()

    return (
        <div className="notifications">
            {notifications.map((notification) => (
                <div key={notification.id} className={`notification ${notification.type}`}>
                    <span>{notification.message}</span>
                    <button type="button" onClick={() => removeNotification(notification.id)}>
                        ×
                    </button>
                </div>
            ))}
        </div>
    )
}
