import {db} from "./firebaseConfig";
import {collection,addDoc,onSnapshot,Timestamp,query,where, Unsubscribe, orderBy} from "firebase/firestore";
import {FirebaseError} from "firebase/app";

export interface chatMessage{
    message:string;
    username:string;
    room:string;
    createdAt:Timestamp;
}

export class Chatroom{

    private room:string;
    private username:string;
    // private unsubscribe:null | (()=>void) = null;
    private unsubscribe:null | Unsubscribe = null;

    private chats = collection(db,"chats");

    constructor(room:string,username:string){
        this.room = room;
        this.username = username;
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
    async addChat(message:string):Promise<void>{

        const now = new Date();
        const chatdata:chatMessage = {
            message,
            username:this.username,
            room:this.room,
            createdAt:Timestamp.fromDate(now)
        }

        try{
            await addDoc(this.chats,chatdata);
        }catch(error:unknown){
            console.error("Error adding chate :",error);
            const msg = this.getErrorMessage(error);
            window.alert(msg);
        }


    }


    // get chat messages ****
    getChats(callback:(data:chatMessage)=>void):void{

        const qry = query(this.chats,where('room',"==",this.room),orderBy('createdAt'));

        this.unsubscribe = onSnapshot(qry,(docSnap)=>{

            docSnap.docChanges().forEach((item)=>{

                // console.log(item);

                if(item.type === "added"){
                    callback(item.doc.data() as chatMessage);
                }

            });

        });

    }


    // change chat room
    updateRoom(room:string):void{

        this.room = room;

        // console.log("room updated = ",this.room);

        if(this.unsubscribe){
            this.unsubscribe();
        }

    }


    // update user name 
    updateName(username:string){

        // method 1
        this.username = username;
        localStorage.setItem("username",username);


        // method 2
        // return new Promise(resolve=>{
        //     this.username = username;
        //     localStorage.setItem("username",username);
        //     resolve();
        // });
    }

}


// 5WP 