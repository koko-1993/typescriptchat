import { db } from "./firebaseConfig";
import { doc, setDoc, deleteDoc, onSnapshot, collection, query, where, Timestamp, Unsubscribe } from "firebase/firestore";

export class TypingIndicator{

    private typingTimeout:ReturnType<typeof setTimeout> | null = null;
    private typingRef = collection(db,"typing");


    // set typing status
    async setTyping(room:string, uid:string, username:string):Promise<void>{

        // clear existing timeout
        if(this.typingTimeout){
            clearTimeout(this.typingTimeout);
        }

        try{
            await setDoc(doc(db,"typing",`${room}_${uid}`),{
                room,
                uid,
                username,
                timestamp: Timestamp.now()
            });
        }catch(err){
            console.error("Error setting typing:",err);
        }

        // auto-clear after 2 seconds of no input
        this.typingTimeout = setTimeout(()=>{
            this.clearTyping(room,uid);
        },2000);

    }


    // clear typing status
    async clearTyping(room:string, uid:string):Promise<void>{
        try{
            await deleteDoc(doc(db,"typing",`${room}_${uid}`));
        }catch(err){
            console.error("Error clearing typing:",err);
        }

        if(this.typingTimeout){
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
    }


    // listen for typing users in a room
    listenTyping(room:string, currentUid:string, callback:(users:string[])=>void):Unsubscribe{

        const qry = query(this.typingRef, where('room','==',room));

        const unsubscribe = onSnapshot(qry,(snapshot)=>{

            const typingUsers:string[] = [];

            snapshot.forEach((doc)=>{
                const data = doc.data();
                if(data.uid !== currentUid){
                    typingUsers.push(data.username);
                }
            });

            callback(typingUsers);

        });

        return unsubscribe;

    }

}
