import {db} from "./firebaseConfig";
import {collection,addDoc,onSnapshot,Timestamp,query,where, Unsubscribe, orderBy, doc, deleteDoc, updateDoc, getDocs, setDoc, arrayUnion, arrayRemove, getDoc, writeBatch, WriteBatch, deleteField} from "firebase/firestore";
import {FirebaseError} from "firebase/app";

export interface messageReference{
    id:string;
    username:string;
    message:string;
}

export interface chatMessage{
    id?:string;          // Firestore document ID (added after fetch)
    message:string;
    username:string;
    uid:string;          // Firebase Auth UID
    photoURL?:string;    // User avatar URL
    room:string;
    createdAt:Timestamp;
    edited?:boolean;     // Flag for edited messages
    pinned?:boolean;     // Pinned message flag
    reactions?:{[emoji:string]:string[]};  // emoji -> uid[]
    readBy?:string[];    // UIDs that have read this message
    replyTo?:messageReference;   // Reply reference
    quoteTo?:messageReference;   // Quote reference
}

export interface chatRoomInfo{
    name:string;
    createdBy:string;
    createdByName:string;
    type?:string;
    archived?:boolean;
    participants?:string[];
    participantNames?:string[];
    members?:string[];
    admins?:string[];
    memberProfiles?:Record<string,string>;
    inviteCode?:string;
}

export class Chatroom{

    private room:string;
    private username:string;
    private uid:string;
    private photoURL:string;
    // private unsubscribe:null | (()=>void) = null;
    private unsubscribe:null | Unsubscribe = null;

    private chats = collection(db,"chats");
    private rooms = collection(db,"rooms");
    private typing = collection(db,"typing");

    constructor(room:string,username:string,uid:string, photoURL:string = ""){
        this.room = room;
        this.username = username;
        this.uid = uid;
        this.photoURL = photoURL;
    }

    // Helper: get a readable error message form unknown
    private getErrorMessage(error:unknown):string{

        if(error instanceof FirebaseError){
            return error.message;
        }

        if(error instanceof Error){
            return error.message;
        }

        return String(error);
    }


    // create chat message
    async addChat(message:string, replyTo?:messageReference, quoteTo?:messageReference):Promise<void>{

        const now = new Date();
        const chatdata:chatMessage = {
            message,
            username:this.username,
            uid:this.uid,
            photoURL:this.photoURL,
            room:this.room,
            createdAt:Timestamp.fromDate(now)
        }

        if(replyTo){
            chatdata.replyTo = replyTo;
        }

        if(quoteTo){
            chatdata.quoteTo = quoteTo;
        }

        try{
            await addDoc(this.chats,chatdata);
        }catch(error:unknown){
            console.error("Error adding chate :",error);
            const msg = this.getErrorMessage(error);
            window.alert(msg);
        }


    }


    private async commitInChunks(operations:Array<(batch:WriteBatch)=>void>):Promise<void>{
        const chunkSize = 400;

        for(let i = 0; i < operations.length; i += chunkSize){
            const batch = writeBatch(db);
            const chunk = operations.slice(i, i + chunkSize);

            chunk.forEach((operation)=>{
                operation(batch);
            });

            await batch.commit();
        }
    }


    // get chat messages (supports added, modified, removed)
    getChats(
        callback:(data:chatMessage, type:'added'|'modified'|'removed')=>void,
        onStateChange?:(isEmpty:boolean)=>void
    ):void{

        const qry = query(this.chats,where('room',"==",this.room),orderBy('createdAt'));

        this.unsubscribe = onSnapshot(qry,(docSnap)=>{

            onStateChange?.(docSnap.empty);

            docSnap.docChanges().forEach((item)=>{

                const data = item.doc.data() as chatMessage;
                data.id = item.doc.id;
                callback(data, item.type);

            });

        });

    }


    // delete chat message
    async deleteChat(docId:string):Promise<void>{
        try{
            await deleteDoc(doc(db,"chats",docId));
        }catch(error:unknown){
            console.error("Error deleting chat:",error);
            const msg = this.getErrorMessage(error);
            window.alert(msg);
        }
    }


    // edit chat message
    async editChat(docId:string, newMessage:string):Promise<void>{
        try{
            await updateDoc(doc(db,"chats",docId),{
                message: newMessage,
                edited: true
            });
        }catch(error:unknown){
            console.error("Error editing chat:",error);
            const msg = this.getErrorMessage(error);
            window.alert(msg);
        }
    }


    // ===== Reactions =====
    async addReaction(docId:string, emoji:string, uid:string):Promise<void>{
        try{
            await updateDoc(doc(db,"chats",docId),{
                [`reactions.${emoji}`]: arrayUnion(uid)
            });
        }catch(error:unknown){
            console.error("Error adding reaction:",error);
        }
    }

    async removeReaction(docId:string, emoji:string, uid:string):Promise<void>{
        try{
            await updateDoc(doc(db,"chats",docId),{
                [`reactions.${emoji}`]: arrayRemove(uid)
            });
        }catch(error:unknown){
            console.error("Error removing reaction:",error);
        }
    }


    // ===== Pin/Unpin =====
    async pinMessage(docId:string):Promise<void>{
        try{
            await updateDoc(doc(db,"chats",docId),{ pinned: true });
        }catch(error:unknown){
            console.error("Error pinning:",error);
        }
    }

    async unpinMessage(docId:string):Promise<void>{
        try{
            await updateDoc(doc(db,"chats",docId),{ pinned: false });
        }catch(error:unknown){
            console.error("Error unpinning:",error);
        }
    }


    // ===== Room Management =====
    async createRoom(roomName:string):Promise<void>{
        try{
            const roomRef = doc(db,"rooms",roomName);
            const existingRoom = await getDoc(roomRef);

            if(existingRoom.exists()){
                const existingData = existingRoom.data();

                if(existingData.archived){
                    await updateDoc(roomRef,{
                        archived: false,
                        archivedAt: null,
                        archivedBy: null,
                        restoredAt: Timestamp.now()
                    });
                    return;
                }

                throw new Error("A room with this name already exists.");
            }

            await setDoc(roomRef,{
                name: roomName,
                createdBy: this.uid,
                createdByName: this.username,
                createdAt: Timestamp.now(),
                admins: [this.uid],
                members: [this.uid],
                memberProfiles: {
                    [this.uid]: this.username
                }
            });
        }catch(error:unknown){
            console.error("Error creating room:",error);
            const msg = this.getErrorMessage(error);
            window.alert(msg);
        }
    }

    listenRooms(callback:(rooms:chatRoomInfo[])=>void):Unsubscribe{
        return onSnapshot(this.rooms,(snapshot)=>{
            const roomsList:chatRoomInfo[] = [];
            snapshot.forEach((doc)=>{
                const data = doc.data();
                roomsList.push({
                    name: data.name || doc.id,
                    createdBy: data.createdBy || "",
                    createdByName: data.createdByName || "Unknown",
                    type: data.type || "room",
                    archived: Boolean(data.archived),
                    participants: data.participants || [],
                    participantNames: data.participantNames || [],
                    members: data.members || [],
                    admins: data.admins || [],
                    memberProfiles: data.memberProfiles || {},
                    inviteCode: data.inviteCode || ""
                });
            });
            callback(roomsList);
        });
    }


    async addMemberToRoom(roomName:string, memberUid:string, memberName:string):Promise<void>{
        try{
            const roomRef = doc(db,"rooms",roomName);
            const roomSnap = await getDoc(roomRef);

            if(!roomSnap.exists()){
                throw new Error("Room not found.");
            }

            await updateDoc(roomRef,{
                members: arrayUnion(memberUid),
                [`memberProfiles.${memberUid}`]: memberName,
                updatedAt: Timestamp.now()
            });
        }catch(error:unknown){
            console.error("Error adding room member:",error);
            const msg = this.getErrorMessage(error);
            window.alert(msg);
            throw error;
        }
    }


    async removeMemberFromRoom(roomName:string, memberUid:string):Promise<void>{
        try{
            const roomRef = doc(db,"rooms",roomName);
            await updateDoc(roomRef,{
                members: arrayRemove(memberUid),
                admins: arrayRemove(memberUid),
                [`memberProfiles.${memberUid}`]: deleteField(),
                updatedAt: Timestamp.now()
            });
        }catch(error:unknown){
            console.error("Error removing room member:",error);
            const msg = this.getErrorMessage(error);
            window.alert(msg);
            throw error;
        }
    }


    async setRoomAdminStatus(roomName:string, memberUid:string, isAdmin:boolean):Promise<void>{
        try{
            const roomRef = doc(db,"rooms",roomName);
            await updateDoc(roomRef,{
                admins: isAdmin ? arrayUnion(memberUid) : arrayRemove(memberUid),
                updatedAt: Timestamp.now()
            });
        }catch(error:unknown){
            console.error("Error updating room admin status:",error);
            const msg = this.getErrorMessage(error);
            window.alert(msg);
            throw error;
        }
    }


    async generateInviteLink(roomName:string, baseUrl:string):Promise<string>{
        try{
            const inviteCode = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0,8)}`;
            await updateDoc(doc(db,"rooms",roomName),{
                inviteCode,
                inviteCreatedAt: Timestamp.now(),
                inviteCreatedBy: this.uid
            });
            return `${baseUrl}?room=${encodeURIComponent(roomName)}&invite=${encodeURIComponent(inviteCode)}`;
        }catch(error:unknown){
            console.error("Error generating invite link:",error);
            const msg = this.getErrorMessage(error);
            window.alert(msg);
            throw error;
        }
    }


    async joinRoomWithInvite(roomName:string, inviteCode:string, memberName:string):Promise<boolean>{
        try{
            const roomRef = doc(db,"rooms",roomName);
            const roomSnap = await getDoc(roomRef);

            if(!roomSnap.exists()){
                throw new Error("Room not found.");
            }

            const roomData = roomSnap.data();

            if(roomData.type === "dm"){
                throw new Error("Invite links are not available for direct messages.");
            }

            if(roomData.inviteCode !== inviteCode){
                throw new Error("Invite link is invalid or expired.");
            }

            await updateDoc(roomRef,{
                members: arrayUnion(this.uid),
                [`memberProfiles.${this.uid}`]: memberName,
                updatedAt: Timestamp.now()
            });

            return true;
        }catch(error:unknown){
            console.error("Error joining room with invite:",error);
            const msg = this.getErrorMessage(error);
            window.alert(msg);
            return false;
        }
    }


    async renameRoom(oldRoomName:string, newRoomName:string):Promise<void>{
        try{
            const oldRoomRef = doc(db,"rooms",oldRoomName);
            const newRoomRef = doc(db,"rooms",newRoomName);
            const oldRoomSnap = await getDoc(oldRoomRef);
            const newRoomSnap = await getDoc(newRoomRef);

            if(!oldRoomSnap.exists()){
                throw new Error("Room not found.");
            }

            if(newRoomSnap.exists()){
                throw new Error("A room with this name already exists.");
            }

            const oldRoomData = oldRoomSnap.data();
            const roomChatsSnap = await getDocs(query(this.chats, where("room", "==", oldRoomName)));
            const roomTypingSnap = await getDocs(query(this.typing, where("room", "==", oldRoomName)));

            const operations:Array<(batch:WriteBatch)=>void> = [
                (batch)=> batch.set(newRoomRef, {
                    ...oldRoomData,
                    name: newRoomName,
                    updatedAt: Timestamp.now()
                })
            ];

            roomChatsSnap.forEach((chatDoc)=>{
                operations.push((batch)=> batch.update(chatDoc.ref, { room: newRoomName }));
            });

            roomTypingSnap.forEach((typingDoc)=>{
                operations.push((batch)=> batch.delete(typingDoc.ref));
            });

            operations.push((batch)=> batch.delete(oldRoomRef));

            await this.commitInChunks(operations);
        }catch(error:unknown){
            console.error("Error renaming room:",error);
            const msg = this.getErrorMessage(error);
            window.alert(msg);
            throw error;
        }
    }


    async deleteRoom(roomName:string):Promise<void>{
        try{
            const roomRef = doc(db,"rooms",roomName);
            const roomChatsSnap = await getDocs(query(this.chats, where("room", "==", roomName)));
            const roomTypingSnap = await getDocs(query(this.typing, where("room", "==", roomName)));
            const operations:Array<(batch:WriteBatch)=>void> = [];

            roomTypingSnap.forEach((typingDoc)=>{
                operations.push((batch)=> batch.delete(typingDoc.ref));
            });

            operations.push((batch)=> batch.update(roomRef, {
                archived: true,
                archivedAt: Timestamp.now(),
                archivedBy: this.uid,
                chatCount: roomChatsSnap.size
            }));

            await this.commitInChunks(operations);
        }catch(error:unknown){
            console.error("Error deleting room:",error);
            const msg = this.getErrorMessage(error);
            window.alert(msg);
            throw error;
        }
    }


    // get current room
    getRoom():string{
        return this.room;
    }


    // change chat room
    updateRoom(room:string):void{

        this.room = room;

        if(this.unsubscribe){
            this.unsubscribe();
        }

    }


    // update user name 
    updateName(username:string){

        // method 1
        this.username = username;
        localStorage.setItem("username",username);

    }


    // ===== Read Receipts =====
    async markAsRead(docId:string, uid:string):Promise<void>{
        try{
            await updateDoc(doc(db,"chats",docId),{
                readBy: arrayUnion(uid)
            });
        }catch(error:unknown){
            console.error("Error marking as read:",error);
        }
    }


    // ===== Direct Messages =====
    static getDMRoomId(uid1:string, uid2:string):string{
        return [uid1, uid2].sort().join('_dm_');
    }

    async createDMRoom(targetUid:string, targetUsername:string):Promise<string>{
        const roomId = Chatroom.getDMRoomId(this.uid, targetUid);
        try{
            await setDoc(doc(db,"rooms",roomId),{
                name: roomId,
                type: 'dm',
                participants: [this.uid, targetUid],
                participantNames: [this.username, targetUsername],
                admins: [this.uid, targetUid],
                members: [this.uid, targetUid],
                memberProfiles: {
                    [this.uid]: this.username,
                    [targetUid]: targetUsername
                },
                createdBy: this.uid,
                createdByName: this.username,
                createdAt: Timestamp.now()
            });
        }catch(error:unknown){
            console.error("Error creating DM:",error);
        }
        return roomId;
    }

    getUid():string{
        return this.uid;
    }

}


// 5WP 
