import { format, formatDistance } from 'date-fns'
import { chatMessage, messageReference } from "./Chatroom";
import { User } from "firebase/auth";

export class MessageUI{

    private ul:HTMLElement;
    private currentUid:string;
    public knownUsers:Map<string,string> = new Map(); // uid -> username

    constructor(ul:HTMLElement, currentUid:string){
        this.ul = ul;
        this.currentUid = currentUid;
    }


    // ===== Message Parser (Link Preview, @Mention, Code Block) =====

    private escapeHtml(text:string):string{
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    parseMessage(text:string):string{
        let html = this.escapeHtml(text);

        // Image messages [image](url)
        html = html.replace(/\[image\]\((https?:\/\/[^\s)]+)\)/g, '<div class="chat-image-wrap"><img src="$1" class="chat-image" alt="Shared image" loading="lazy" onclick="window.open(\'$1\',\'_blank\')" /></div>');

        // Code blocks (```)
        html = html.replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>');

        // Inline code (`)
        html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

        // URLs -> clickable links with preview styling
        html = html.replace(/(https?:\/\/[^\s<"]+)/g, (match) => {
            // Skip URLs already inside tags (href, src, onclick)
            return `<a href="${match}" target="_blank" rel="noopener" class="msg-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${match}</a>`;
        });

        // @mentions -> highlighted
        html = html.replace(/@(\w+)/g, '<span class="mention">@$1</span>');

        return html;
    }


    // ===== Avatar helper =====
    private getInitials(name:string):string{
        return name.split(" ").map(w => w[0]).join("").substring(0,2).toUpperCase();
    }

    private getAvatarColor(uid:string):string{
        const colors = [
            '#6c63ff','#e94560','#4ecdc4','#f7b731','#a55eea',
            '#26de81','#fc5c65','#45aaf2','#fd9644','#2bcbba'
        ];
        let hash = 0;
        for(let i=0;i<uid.length;i++){
            hash = uid.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    private createAvatar(dataobj:chatMessage):HTMLElement{
        const avatar = document.createElement("div");
        avatar.className = "msg-avatar";

        if(dataobj.photoURL){
            const img = document.createElement("img");
            img.src = dataobj.photoURL;
            img.alt = dataobj.username;
            img.className = "avatar-img";
            avatar.appendChild(img);
        }else{
            avatar.textContent = this.getInitials(dataobj.username);
            avatar.style.background = this.getAvatarColor(dataobj.uid);
        }

        return avatar;
    }


    // ===== Reaction bar =====
    private createReactionBar(dataobj:chatMessage):HTMLElement{
        const bar = document.createElement("div");
        bar.className = "reaction-bar";

        if(!dataobj.reactions) return bar;

        for(const [emoji, uids] of Object.entries(dataobj.reactions)){
            if(!uids || uids.length === 0) continue;

            const pill = document.createElement("button");
            pill.className = "reaction-pill";
            if(uids.includes(this.currentUid)){
                pill.classList.add("reacted");
            }
            pill.setAttribute("data-emoji", emoji);
            pill.setAttribute("data-id", dataobj.id || "");
            pill.innerHTML = `${emoji} <span class="reaction-count">${uids.length}</span>`;
            bar.appendChild(pill);
        }

        return bar;
    }


    // ===== Reply preview =====
    private createReferencePreview(reference:messageReference, variant:'reply'|'quote'):HTMLElement{
        const div = document.createElement("div");
        div.className = `message-reference ${variant}-preview`;
        div.setAttribute("data-ref-id", reference.id);
        div.innerHTML = `
            <span class="reference-label">${variant === "reply" ? "Reply" : "Quote"}</span>
            <i class="fa-solid ${variant === "reply" ? "fa-reply" : "fa-quote-left"}"></i>
            <strong>${this.escapeHtml(reference.username)}</strong>
            <span>${this.escapeHtml(reference.message).substring(0,80)}${reference.message.length > 80 ? '...' : ''}</span>
        `;
        return div;
    }


    // clear li 
    clearli():void{
        this.ul.innerHTML = "";
    }


    // render li
    renderli(dataobj:chatMessage):void{

        // track known users
        this.knownUsers.set(dataobj.uid, dataobj.username);

        const when = formatDistance(dataobj.createdAt.toDate(),new Date(),{addSuffix:true});

        const isOwn = dataobj.uid === this.currentUid;

        const li = document.createElement("li");
        li.className = `list-group-item ${isOwn ? 'own-message' : 'other-message'}`;
        if(dataobj.id){
            li.setAttribute("data-id", dataobj.id);
        }
        if(dataobj.pinned){
            li.classList.add("pinned-message");
        }

        // Avatar (only for other messages)
        if(!isOwn){
            li.appendChild(this.createAvatar(dataobj));
        }

        // Message content wrapper
        const contentWrap = document.createElement("div");
        contentWrap.className = "msg-content-wrap";

        // Reply preview
        if(dataobj.replyTo){
            contentWrap.appendChild(this.createReferencePreview(dataobj.replyTo, "reply"));
        }

        if(dataobj.quoteTo){
            contentWrap.appendChild(this.createReferencePreview(dataobj.quoteTo, "quote"));
        }

        const usernameSpan = document.createElement("span");
        usernameSpan.className = "username";
        usernameSpan.textContent = dataobj.username;

        const messageSpan = document.createElement("span");
        messageSpan.className = "message";
        messageSpan.innerHTML = this.parseMessage(dataobj.message);

        const timeSpan = document.createElement("span");
        timeSpan.className = "time small text-muted";
        let timeText = when + (dataobj.edited ? ' (edited)' : '');
        if(dataobj.pinned){
            timeText = '📌 ' + timeText;
        }
        timeSpan.textContent = timeText;

        // Read receipts for own messages
        if(isOwn){
            const readSpan = document.createElement("span");
            readSpan.className = "read-receipt";
            const readCount = (dataobj.readBy || []).filter(u => u !== this.currentUid).length;
            if(readCount > 0){
                readSpan.innerHTML = '<i class="fa-solid fa-check-double read-seen"></i>';
                readSpan.title = `Seen by ${readCount}`;
            }else{
                readSpan.innerHTML = '<i class="fa-solid fa-check read-sent"></i>';
                readSpan.title = 'Sent';
            }
            timeSpan.appendChild(readSpan);
        }

        contentWrap.append(usernameSpan, messageSpan, timeSpan);

        // Reaction bar
        const reactionBar = this.createReactionBar(dataobj);
        if(reactionBar.children.length > 0){
            contentWrap.appendChild(reactionBar);
        }

        li.appendChild(contentWrap);

        // Own avatar on the right
        if(isOwn){
            li.appendChild(this.createAvatar(dataobj));
        }

        // Action buttons (edit/delete/pin/react/reply)
        if(dataobj.id){
            const actionsDiv = document.createElement("div");
            actionsDiv.className = "message-actions";

            // Reply button (for all messages)
            const replyBtn = document.createElement("button");
            replyBtn.className = "msg-action-btn reply-btn";
            replyBtn.setAttribute("data-id", dataobj.id);
            replyBtn.setAttribute("data-username", dataobj.username);
            replyBtn.setAttribute("data-message", dataobj.message);
            replyBtn.innerHTML = '<i class="fa-solid fa-reply"></i>';
            replyBtn.title = "Reply";
            actionsDiv.appendChild(replyBtn);

            const quoteBtn = document.createElement("button");
            quoteBtn.className = "msg-action-btn quote-btn";
            quoteBtn.setAttribute("data-id", dataobj.id);
            quoteBtn.setAttribute("data-username", dataobj.username);
            quoteBtn.setAttribute("data-message", dataobj.message);
            quoteBtn.innerHTML = '<i class="fa-solid fa-quote-left"></i>';
            quoteBtn.title = "Quote";
            actionsDiv.appendChild(quoteBtn);

            // Reaction button
            const reactBtn = document.createElement("button");
            reactBtn.className = "msg-action-btn react-btn";
            reactBtn.setAttribute("data-id", dataobj.id);
            reactBtn.innerHTML = '<i class="fa-solid fa-face-smile"></i>';
            reactBtn.title = "React";
            actionsDiv.appendChild(reactBtn);

            // Pin button
            const pinBtn = document.createElement("button");
            pinBtn.className = "msg-action-btn pin-btn";
            pinBtn.setAttribute("data-id", dataobj.id);
            pinBtn.innerHTML = dataobj.pinned ? '<i class="fa-solid fa-thumbtack" style="color:var(--accent-secondary)"></i>' : '<i class="fa-solid fa-thumbtack"></i>';
            pinBtn.title = dataobj.pinned ? "Unpin" : "Pin";
            actionsDiv.appendChild(pinBtn);

            // Edit/Delete for own messages
            if(isOwn){
                const editBtn = document.createElement("button");
                editBtn.className = "msg-action-btn edit-btn";
                editBtn.setAttribute("data-id", dataobj.id);
                editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
                editBtn.title = "Edit";

                const deleteBtn = document.createElement("button");
                deleteBtn.className = "msg-action-btn delete-btn";
                deleteBtn.setAttribute("data-id", dataobj.id);
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                deleteBtn.title = "Delete";

                actionsDiv.append(editBtn, deleteBtn);
            }

            li.appendChild(actionsDiv);
        }

        this.ul.appendChild(li);
    }


    // update existing message (for edit)
    updateMessage(dataobj:chatMessage):void{
        if(!dataobj.id) return;

        const li = this.ul.querySelector(`li[data-id="${dataobj.id}"]`);
        if(!li) return;

        const messageSpan = li.querySelector(".message");
        if(messageSpan){
            messageSpan.innerHTML = this.parseMessage(dataobj.message);
        }

        const timeSpan = li.querySelector(".time");
        if(timeSpan){
            const when = formatDistance(dataobj.createdAt.toDate(),new Date(),{addSuffix:true});
            let timeText = when + (dataobj.edited ? ' (edited)' : '');
            if(dataobj.pinned){
                timeText = '📌 ' + timeText;
            }
            timeSpan.textContent = timeText;
        }

        // Update pinned class
        if(dataobj.pinned){
            li.classList.add("pinned-message");
        }else{
            li.classList.remove("pinned-message");
        }

        // Update pin button
        const pinBtn = li.querySelector(".pin-btn");
        if(pinBtn){
            pinBtn.innerHTML = dataobj.pinned ? '<i class="fa-solid fa-thumbtack" style="color:var(--accent-secondary)"></i>' : '<i class="fa-solid fa-thumbtack"></i>';
            pinBtn.setAttribute("title", dataobj.pinned ? "Unpin" : "Pin");
        }

        // Update reactions
        const existingBar = li.querySelector(".reaction-bar");
        const contentWrap = li.querySelector(".msg-content-wrap");
        if(existingBar) existingBar.remove();
        if(contentWrap){
            const newBar = this.createReactionBar(dataobj);
            if(newBar.children.length > 0){
                contentWrap.appendChild(newBar);
            }
        }
    }


    // remove message (for delete)
    removeMessage(docId:string):void{
        const li = this.ul.querySelector(`li[data-id="${docId}"]`);
        if(li){
            li.classList.add('msg-removing');
            setTimeout(()=> li.remove(), 300);
        }
    }


    // show user info on profile page
    userInfo(data:User):void{

        console.log(data);

        const uid:string = data.uid;
        const email:string = data.email ?? "No email";
        const fullname:string = data.displayName ?? "Anonymous";
        const photourl:string = data.photoURL ?? "https://static.thenounproject.com/png/65476-200.png";
        const createdtime:string = data.metadata.creationTime ?? "Unknown";

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
