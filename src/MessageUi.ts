import { format, formatDistance } from 'date-fns'
import { chatMessage } from "./Chatroom";
import { User } from "firebase/auth";

export class MessageUI{

    private ul:HTMLElement;

    constructor(ul:HTMLElement){
        this.ul = ul
    }

    // clear li 
    clearli():void{
        this.ul.innerHTML = "";
    }


    // render li
    renderli(dataobj:chatMessage):void{

        // console.log(dataobj);

        // for can 
        // const when = (window as any).dateFns.formatDistance(dataobj.createdAt.toDate(),new Date(),{addSuffix:true}); // {addSuffix:true} = ago

        // for package
        const when = formatDistance(dataobj.createdAt.toDate(),new Date(),{addSuffix:true}); // {addSuffix:true} = ago
        const li = document.createElement("li");
        li.className = "list-group-item";

        const usernameSpan = document.createElement("span");
        usernameSpan.className = "username";
        usernameSpan.textContent = dataobj.username;

        const messageSpan = document.createElement("span");
        messageSpan.className = "message";
        messageSpan.textContent = dataobj.message;

        const timeSpan = document.createElement("span");
        timeSpan.className = "time small text-muted";
        timeSpan.textContent = when;

        li.append(usernameSpan, messageSpan, timeSpan);
        this.ul.appendChild(li);
    }

    userInfo(data:User):void{

        console.log(data);

        const uid:string = data.uid;
        const email:string = data.email ?? "No email";
        const fullname:string = data.displayName ?? "Anonymous";
        const photourl:string = data.photoURL ?? "https://static.thenounproject.com/png/65476-200.png";
        const createdtime:string = data.metadata.creationTime ?? "Unknown";

        // cdn
        // const formattedate = dateFns.format(new Date(createdtime),"dd MMM yyyy");

        const formattedate = createdtime !== "Unknown" ? format(new Date(createdtime),"dd MMM yyyy") : createdtime;

        const html = `
            <li class="list-group-item"><img src="${photourl}" width="50" alt="Profile Picture" /></li>
            <li class="list-group-item">UID : ${uid}</li>
            <li class="list-group-item">Display Name : ${fullname}</li>
            <li class="list-group-item">Email : ${email}</li>
            <li class="list-group-item">Created At : ${formattedate}</li>
        `;

        this.ul.innerHTML = html;

    }

}


