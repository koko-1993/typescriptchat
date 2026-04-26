import { db } from "./firebaseConfig";
import { doc, setDoc, deleteDoc, onSnapshot, collection, query, where, Timestamp, Unsubscribe, serverTimestamp } from "firebase/firestore";

export interface OnlineUser {
    uid: string;
    username: string;
    photoURL: string;
    lastSeen: Timestamp;
}

export class PresenceManager {

    private presenceRef = collection(db, "presence");
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    // Set user as online
    async setOnline(uid: string, username: string, photoURL: string = ""): Promise<void> {
        try {
            await setDoc(doc(db, "presence", uid), {
                uid,
                username,
                photoURL,
                lastSeen: Timestamp.now(),
                online: true
            });

            // Heartbeat every 30 seconds
            this.heartbeatInterval = setInterval(async () => {
                try {
                    await setDoc(doc(db, "presence", uid), {
                        uid,
                        username,
                        photoURL,
                        lastSeen: Timestamp.now(),
                        online: true
                    });
                } catch (err) {
                    console.warn("Heartbeat failed:", err);
                }
            }, 30000);

            // Set offline on page unload
            window.addEventListener("beforeunload", () => {
                this.setOffline(uid);
            });

        } catch (err) {
            console.error("Error setting online:", err);
        }
    }

    // Set user as offline
    async setOffline(uid: string): Promise<void> {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        try {
            await deleteDoc(doc(db, "presence", uid));
        } catch (err) {
            console.error("Error setting offline:", err);
        }
    }

    // Listen for online users
    listenOnlineUsers(callback: (users: OnlineUser[]) => void): Unsubscribe {
        return onSnapshot(this.presenceRef, (snapshot) => {
            const users: OnlineUser[] = [];
            const now = Date.now();

            snapshot.forEach((doc) => {
                const data = doc.data();
                // Consider user online if heartbeat within last 60 seconds
                const lastSeen = data.lastSeen?.toDate?.()?.getTime() || 0;
                if (now - lastSeen < 60000) {
                    users.push({
                        uid: data.uid,
                        username: data.username,
                        photoURL: data.photoURL || "",
                        lastSeen: data.lastSeen
                    });
                }
            });

            callback(users);
        });
    }

}
