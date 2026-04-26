import { Chatroom, chatRoomInfo } from "./Chatroom";
import { MessageUI } from "./MessageUi";
import { TypingIndicator } from "./TypingIndicator";
import { PresenceManager } from "./PresenceManager";
import { auth, storage } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


// get UI elements
const chatsidebar = document.querySelector<HTMLElement>(".chat-sidebars");
const updatemsg = document.querySelector<HTMLElement>(".update-msg");
const newnameform = document.querySelector<HTMLFormElement>(".new-nameform");
const chatlistgroup = document.querySelector<HTMLElement>(".chat-lists");
const newchatform = document.querySelector<HTMLFormElement>(".new-chatform");
const profilename = document.querySelector<HTMLElement>("#profilename");
const roomtitle = document.querySelector<HTMLElement>("#roomtitle");
const chatcontent = document.querySelector<HTMLElement>(".chat-contents");
const typingEl = document.querySelector<HTMLElement>(".typing-indicator");
const emojiPicker = document.querySelector<HTMLElement>("#emojiPicker");
const emojiToggleBtn = document.querySelector<HTMLElement>("#emojiToggleBtn");
const themeToggleBtn = document.querySelector<HTMLElement>("#themeToggleBtn");
const soundToggleBtn = document.querySelector<HTMLElement>("#soundToggleBtn");
const mentionPopup = document.querySelector<HTMLElement>("#mentionPopup");
const searchToggleBtn = document.querySelector<HTMLElement>("#searchToggleBtn");
const searchInput = document.querySelector<HTMLInputElement>("#searchInput");
const reactionPicker = document.querySelector<HTMLElement>("#reactionPicker");
const pinnedBar = document.querySelector<HTMLElement>("#pinnedBar");
const pinnedCount = document.querySelector<HTMLElement>("#pinnedCount");
const pinnedToggleBtn = document.querySelector<HTMLElement>("#pinnedToggleBtn");
const pinnedMessagesList = document.querySelector<HTMLElement>("#pinnedMessagesList");
const replyBar = document.querySelector<HTMLElement>("#replyBar");
const replyPreviewText = document.querySelector<HTMLElement>("#replyPreviewText");
const replyCancelBtn = document.querySelector<HTMLElement>("#replyCancelBtn");
const newRoomForm = document.querySelector<HTMLFormElement>("#newRoomForm");
const newRoomNameInput = document.querySelector<HTMLInputElement>("#newRoomName");
const roomListEl = document.querySelector<HTMLElement>("#roomList");
const onlineUsersList = document.querySelector<HTMLElement>("#onlineUsersList");
const onlineCountEl = document.querySelector<HTMLElement>("#onlineCount");
const fileUploadBtn = document.querySelector<HTMLElement>("#fileUploadBtn");
const fileInput = document.querySelector<HTMLInputElement>("#fileInput");

if (!chatsidebar || !updatemsg || !newnameform || !chatlistgroup || !newchatform || !profilename || !roomtitle || !chatcontent || !typingEl || !emojiPicker || !emojiToggleBtn || !themeToggleBtn || !soundToggleBtn || !mentionPopup || !searchToggleBtn || !searchInput || !reactionPicker || !pinnedBar || !pinnedCount || !pinnedToggleBtn || !pinnedMessagesList || !replyBar || !replyPreviewText || !replyCancelBtn || !newRoomForm || !newRoomNameInput || !roomListEl || !onlineUsersList || !onlineCountEl || !fileUploadBtn || !fileInput) {
    throw new Error("One or more required DOM elements are missing.");
}


// ===== Auto-scroll helpers =====
function isNearBottom():boolean{
    const threshold = 100;
    return chatcontent!.scrollHeight - chatcontent!.scrollTop - chatcontent!.clientHeight < threshold;
}

function scrollToBottom():void{
    chatcontent!.scrollTop = chatcontent!.scrollHeight;
}


// ===== Typing indicator display helper =====
function updateTypingDisplay(users:string[]):void{
    if(users.length > 0){
        typingEl!.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span> <span>${users.join(", ")} typing...</span>`;
        typingEl!.style.display = "flex";
    }else{
        typingEl!.style.display = "none";
    }
}


// ===== Sound Notification =====
let soundEnabled = localStorage.getItem("soundEnabled") !== "false"; // default on

function playNotificationSound():void{
    if(!soundEnabled) return;
    try{
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.08;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.stop(ctx.currentTime + 0.2);
    }catch(e){
        console.warn("Audio not available", e);
    }
}

// sound toggle button
soundToggleBtn.addEventListener("click",()=>{
    soundEnabled = !soundEnabled;
    localStorage.setItem("soundEnabled", String(soundEnabled));
    soundToggleBtn!.innerHTML = soundEnabled
        ? '<i class="fa-solid fa-volume-high me-2"></i>Sound: ON'
        : '<i class="fa-solid fa-volume-xmark me-2"></i>Sound: OFF';
});
// init sound button text
soundToggleBtn.innerHTML = soundEnabled
    ? '<i class="fa-solid fa-volume-high me-2"></i>Sound: ON'
    : '<i class="fa-solid fa-volume-xmark me-2"></i>Sound: OFF';


// ===== Dark/Light Theme Toggle =====
function setTheme(theme:string):void{
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    themeToggleBtn!.innerHTML = theme === "light"
        ? '<i class="fa-solid fa-sun me-2"></i>Light Mode'
        : '<i class="fa-solid fa-moon me-2"></i>Dark Mode';
}

// init theme from localStorage
const savedTheme = localStorage.getItem("theme") || "dark";
setTheme(savedTheme);

themeToggleBtn.addEventListener("click",()=>{
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(current === "dark" ? "light" : "dark");
});


// ===== Emoji Picker =====
emojiToggleBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    emojiPicker.style.display = emojiPicker.style.display === "none" ? "block" : "none";
});

emojiPicker.addEventListener("click",(e)=>{
    const target = e.target as HTMLElement;
    if(target.classList.contains("emoji-item")){
        const messageInput = newchatform.querySelector<HTMLInputElement>("#message");
        if(messageInput){
            messageInput.value += target.textContent;
            messageInput.focus();
        }
    }
});

// close emoji picker when clicking outside
document.addEventListener("click",(e)=>{
    const target = e.target as HTMLElement;
    if(!emojiPicker.contains(target) && !emojiToggleBtn.contains(target)){
        emojiPicker.style.display = "none";
    }
});


// ===== Search Toggle =====
let searchActive = false;

searchToggleBtn.addEventListener("click",()=>{
    searchActive = !searchActive;
    searchInput.style.display = searchActive ? "block" : "none";
    if(searchActive){
        searchInput.focus();
    }else{
        searchInput.value = "";
        // Show all messages
        const items = chatlistgroup.querySelectorAll("li");
        items.forEach(li => (li as HTMLElement).style.display = "");
    }
});

searchInput.addEventListener("input",()=>{
    const query = searchInput.value.toLowerCase().trim();
    const items = chatlistgroup.querySelectorAll("li");
    items.forEach(li =>{
        const msg = li.querySelector(".message")?.textContent?.toLowerCase() || "";
        const user = li.querySelector(".username")?.textContent?.toLowerCase() || "";
        if(msg.includes(query) || user.includes(query) || query === ""){
            (li as HTMLElement).style.display = "";
        }else{
            (li as HTMLElement).style.display = "none";
        }
    });
});


// ===== Unread Badge Helpers =====
function getUnreadKey(room:string):string{
    return `unread_lastRead_${room}`;
}

function markRoomAsRead(room:string):void{
    localStorage.setItem(getUnreadKey(room), String(Date.now()));
}

function getLastReadTime(room:string):number{
    return parseInt(localStorage.getItem(getUnreadKey(room)) || "0");
}

// Track unread counts per room
const unreadCounts:Map<string, number> = new Map();
const systemRooms = new Map<string,string>([
    ["general", "fa-solid fa-comments"],
    ["laravel", "fa-brands fa-laravel"],
    ["nodejs", "fa-brands fa-node-js"]
]);

function updateUnreadBadge(room:string, count:number):void{
    unreadCounts.set(room, count);
    const btn = document.querySelector(`#roomList button[id="${room}"]`);
    if(!btn) return;
    let badge = btn.querySelector(".unread-badge");
    if(count > 0){
        if(!badge){
            badge = document.createElement("span");
            badge.className = "unread-badge";
            btn.appendChild(badge);
        }
        badge.textContent = String(count > 99 ? "99+" : count);
    }else{
        if(badge) badge.remove();
    }
}

function sanitizeRoomName(value:string):string{
    return value.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-_]/g,"");
}

function renameRoomTracking(oldRoom:string, newRoom:string):void{
    const oldKey = getUnreadKey(oldRoom);
    const newKey = getUnreadKey(newRoom);
    const oldValue = localStorage.getItem(oldKey);
    const unreadCount = unreadCounts.get(oldRoom) || 0;

    if(oldValue !== null){
        localStorage.setItem(newKey, oldValue);
        localStorage.removeItem(oldKey);
    }

    unreadCounts.delete(oldRoom);

    if(unreadCount > 0){
        unreadCounts.set(newRoom, unreadCount);
    }
}

function removeRoomTracking(room:string):void{
    unreadCounts.delete(room);
    localStorage.removeItem(getUnreadKey(room));
}


// ===== Reply State =====
let currentReply:{id:string; username:string; message:string} | null = null;

function setReply(id:string, username:string, message:string):void{
    currentReply = {id, username, message};
    replyPreviewText!.textContent = `${username}: ${message.substring(0,50)}${message.length > 50 ? '...' : ''}`;
    replyBar!.style.display = "flex";
    const messageInput = newchatform!.querySelector<HTMLInputElement>("#message");
    if(messageInput) messageInput.focus();
}

function clearReply():void{
    currentReply = null;
    replyBar!.style.display = "none";
}

replyCancelBtn.addEventListener("click", clearReply);


// ===== Reaction Picker State =====
let reactionTargetId:string | null = null;

reactionPicker.addEventListener("click",(e)=>{
    const target = e.target as HTMLElement;
    const option = target.closest<HTMLElement>(".reaction-option");
    if(option && reactionTargetId && typeof currentChatroom !== 'undefined'){
        const emoji = option.getAttribute("data-emoji") || "";
        currentChatroom.addReaction(reactionTargetId, emoji, currentUid);
        reactionPicker.style.display = "none";
        reactionTargetId = null;
    }
});

document.addEventListener("click",(e)=>{
    const target = e.target as HTMLElement;
    if(!reactionPicker.contains(target) && !target.closest(".react-btn")){
        reactionPicker.style.display = "none";
    }
});


// ===== Pinned Messages =====
pinnedToggleBtn.addEventListener("click",()=>{
    const isHidden = pinnedMessagesList.style.display === "none";
    pinnedMessagesList.style.display = isHidden ? "block" : "none";
    pinnedToggleBtn.innerHTML = isHidden ? '<i class="fa-solid fa-chevron-up"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
});


// ===== Wait for Firebase Auth to resolve =====
let initialized = false;
let currentChatroom:Chatroom;
let currentUid:string = "";

onAuthStateChanged(auth,(user)=>{

    if(!user || initialized) return;
    initialized = true;

    currentUid = user.uid;
    const photoURL = user.photoURL || "";
    const username = localStorage.username ? localStorage.username : (user.displayName || "Guest");
    profilename.textContent = username;


    // ===== Instance Chatroom, MessageUI, TypingIndicator =====
    const chatroomObj = new Chatroom("general", username, currentUid, photoURL);
    currentChatroom = chatroomObj;
    const messageuiObj = new MessageUI(chatlistgroup, currentUid);
    const typingObj = new TypingIndicator();
    const presenceObj = new PresenceManager();
    let availableRooms:chatRoomInfo[] = [];

    function getAllRooms(snapshotRooms:chatRoomInfo[]):chatRoomInfo[]{
        const mergedRooms = new Map<string, chatRoomInfo>();

        systemRooms.forEach((_, roomName)=>{
            mergedRooms.set(roomName, {
                name: roomName,
                createdBy: "system",
                createdByName: "System",
                type: "system"
            });
        });

        snapshotRooms.forEach((room)=>{
            mergedRooms.set(room.name, room);
        });

        return Array.from(mergedRooms.values());
    }

    function canManageRoom(room:chatRoomInfo):boolean{
        return !systemRooms.has(room.name) && room.createdBy === currentUid;
    }

    function renderRoomList(rooms:chatRoomInfo[]):void{
        const activeRoom = currentChatroom.getRoom();
        roomListEl!.innerHTML = "";

        rooms.forEach((room)=>{
            const roomItem = document.createElement("div");
            roomItem.className = "room-list-item";

            const roomButton = document.createElement("button");
            roomButton.type = "button";
            roomButton.id = room.name;
            roomButton.className = "btn room-btn";
            if(room.name === activeRoom){
                roomButton.classList.add("active-room");
            }

            const iconClass = systemRooms.get(room.name) || "fa-solid fa-hashtag";
            roomButton.innerHTML = `<i class="${iconClass}"></i><span class="room-btn-label">#${room.name}</span>`;

            const unreadCount = unreadCounts.get(room.name) || 0;
            if(unreadCount > 0){
                const badge = document.createElement("span");
                badge.className = "unread-badge";
                badge.textContent = String(unreadCount > 99 ? "99+" : unreadCount);
                roomButton.appendChild(badge);
            }

            roomItem.appendChild(roomButton);

            if(canManageRoom(room)){
                const actions = document.createElement("div");
                actions.className = "room-manage-actions";
                actions.innerHTML = `
                    <button type="button" class="room-manage-btn" data-action="rename" data-room="${room.name}" title="Rename room">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button type="button" class="room-manage-btn delete-room-btn" data-action="delete" data-room="${room.name}" title="Delete room">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
                roomItem.appendChild(actions);
            }

            roomListEl!.appendChild(roomItem);
        });
    }

    function switchToRoom(roomName:string):void{
        messageuiObj.clearli();

        typingUnsub();
        typingObj.clearTyping(chatroomObj.getRoom(), currentUid);

        chatroomObj.updateRoom(roomName);
        startChatListener();
        setTimeout(()=> scrollToBottom(), 500);

        typingUnsub = typingObj.listenTyping(roomName, currentUid, updateTypingDisplay);

        roomtitle!.textContent = roomName;
        markRoomAsRead(roomName);
        updateUnreadBadge(roomName, 0);

        roomListEl!.querySelectorAll(".room-btn").forEach(btn => btn.classList.remove("active-room"));
        const activeButton = roomListEl!.querySelector<HTMLElement>(`button.room-btn[id="${roomName}"]`);
        activeButton?.classList.add("active-room");

        searchInput!.value = "";
        searchInput!.style.display = "none";
        searchActive = false;
        clearReply();
    }

    // Mark general as read initially
    markRoomAsRead("general");

    // Set user online
    presenceObj.setOnline(currentUid, username, photoURL);

    // Listen for online users
    presenceObj.listenOnlineUsers((users)=>{
        onlineCountEl!.textContent = String(users.length);
        onlineUsersList!.innerHTML = users.map(u => {
            const initials = u.username.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
            return `<div class="online-user-item">
                <div class="online-avatar">${u.photoURL ? `<img src="${u.photoURL}" class="avatar-img-sm" />` : initials}</div>
                <span class="online-username">${u.username}</span>
                ${u.uid === currentUid ? '<span class="online-you">(you)</span>' : ''}
            </div>`;
        }).join('');
    });


    // ===== File/Image Upload =====
    fileUploadBtn!.addEventListener("click",()=>{
        fileInput!.click();
    });

    fileInput!.addEventListener("change", async ()=>{
        const file = fileInput!.files?.[0];
        if(!file) return;

        // Only allow images
        if(!file.type.startsWith('image/')){
            alert('Only image files are allowed.');
            fileInput!.value = '';
            return;
        }

        // Max 5MB
        if(file.size > 5 * 1024 * 1024){
            alert('File size must be under 5MB.');
            fileInput!.value = '';
            return;
        }

        try{
            const fileName = `chat_images/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Send as a message with image markdown
            await chatroomObj.addChat(`[image](${downloadURL})`, currentReply || undefined);
            clearReply();
            fileInput!.value = '';
        }catch(err){
            console.error('Upload error:', err);
            alert('Failed to upload image.');
            fileInput!.value = '';
        }
    });


    // ===== Dynamic Room List =====
    chatroomObj.listenRooms((rooms)=>{
        availableRooms = getAllRooms(rooms);
        renderRoomList(availableRooms);
    });


    // ===== @Mention Suggestions =====
    const messageInput = newchatform.querySelector<HTMLInputElement>("#message");

    function showMentionSuggestions(filter:string):void{
        const users = Array.from(messageuiObj.knownUsers.values())
            .filter(name => name.toLowerCase().includes(filter.toLowerCase()) && name !== username);

        if(users.length === 0 || filter === ""){
            mentionPopup!.style.display = "none";
            return;
        }

        mentionPopup!.innerHTML = users.slice(0,5).map(u =>
            `<div class="mention-item" data-name="${u}">@${u}</div>`
        ).join("");
        mentionPopup!.style.display = "block";
    }

    if(messageInput){
        messageInput.addEventListener("input",()=>{
            const val = messageInput.value;
            const atIndex = val.lastIndexOf("@");
            if(atIndex !== -1 && atIndex === val.length - 1 || (atIndex !== -1 && !val.substring(atIndex).includes(" "))){
                const partial = val.substring(atIndex + 1);
                showMentionSuggestions(partial);
            }else{
                mentionPopup!.style.display = "none";
            }
            // typing indicator
            typingObj.setTyping(chatroomObj.getRoom(), currentUid, username);
        });
    }

    mentionPopup.addEventListener("click",(e)=>{
        const target = e.target as HTMLElement;
        const item = target.closest<HTMLElement>(".mention-item");
        if(item && messageInput){
            const name = item.getAttribute("data-name") || "";
            const val = messageInput.value;
            const atIndex = val.lastIndexOf("@");
            messageInput.value = val.substring(0, atIndex) + "@" + name + " ";
            messageInput.focus();
            mentionPopup!.style.display = "none";
        }
    });


    // ===== Track pinned messages =====
    const pinnedMessages:Map<string,{username:string;message:string}> = new Map();

    function updatePinnedBar():void{
        const count = pinnedMessages.size;
        if(count > 0){
            pinnedBar!.style.display = "block";
            pinnedCount!.textContent = String(count);
            pinnedMessagesList!.innerHTML = "";
            pinnedMessages.forEach((msg, id)=>{
                const div = document.createElement("div");
                div.className = "pinned-msg-item";
                div.innerHTML = `<strong>${msg.username}</strong>: ${msg.message.substring(0,80)}${msg.message.length > 80 ? '...' : ''}`;
                div.addEventListener("click",()=>{
                    const li = chatlistgroup!.querySelector(`li[data-id="${id}"]`);
                    if(li){
                        li.scrollIntoView({behavior:'smooth', block:'center'});
                        li.classList.add('highlight-flash');
                        setTimeout(()=> li.classList.remove('highlight-flash'), 1500);
                    }
                });
                pinnedMessagesList!.appendChild(div);
            });
        }else{
            pinnedBar!.style.display = "none";
        }
    }


    // ===== Start chat listener (reusable) =====
    function startChatListener():void{
        pinnedMessages.clear();
        updatePinnedBar();
        chatlistgroup!.classList.add("is-loading");
        chatlistgroup!.classList.remove("is-empty");

        chatroomObj.getChats((data, type)=>{

            if(type === "added"){
                const shouldScroll = isNearBottom();
                messageuiObj.renderli(data);
                if(shouldScroll) scrollToBottom();
                // sound notification for other users' messages
                if(data.uid !== currentUid){
                    playNotificationSound();
                }
                // Track pinned
                if(data.pinned && data.id){
                    pinnedMessages.set(data.id, {username:data.username, message:data.message});
                    updatePinnedBar();
                }
            }

            if(type === "modified"){
                messageuiObj.updateMessage(data);
                // Update pinned tracking
                if(data.id){
                    if(data.pinned){
                        pinnedMessages.set(data.id, {username:data.username, message:data.message});
                    }else{
                        pinnedMessages.delete(data.id);
                    }
                    updatePinnedBar();
                }
            }

            if(type === "removed"){
                if(data.id){
                    messageuiObj.removeMessage(data.id);
                    pinnedMessages.delete(data.id);
                    updatePinnedBar();
                }
            }

        }, (isEmpty)=>{
            chatlistgroup!.classList.remove("is-loading");
            chatlistgroup!.classList.toggle("is-empty", isEmpty);
        });
    }

    startChatListener();
    setTimeout(()=> scrollToBottom(), 500);


    // ===== Typing indicator listener =====
    let typingUnsub = typingObj.listenTyping("general", currentUid, updateTypingDisplay);


    // ===== Add new message =====
    newchatform.addEventListener('submit', async (e: Event) => {
        e.preventDefault();

        const input = newchatform.querySelector<HTMLInputElement>("#message");
        const message = input?.value.trim() ?? "";

        if (!message) return;

        try {
            await chatroomObj.addChat(message, currentReply || undefined);
            newchatform.reset();
            typingObj.clearTyping(chatroomObj.getRoom(), currentUid);
            emojiPicker.style.display = "none";
            mentionPopup!.style.display = "none";
            clearReply();
        } catch (err) {
            console.error(err);
        }

    });


    // ===== Create New Room =====
    newRoomForm.addEventListener("submit", async (e:Event)=>{
        e.preventDefault();
        const roomName = sanitizeRoomName(newRoomNameInput.value);
        if(!roomName) return;

        if(availableRooms.some(room => room.name === roomName)){
            alert("A room with this name already exists.");
            return;
        }

        await chatroomObj.createRoom(roomName);
        newRoomNameInput.value = "";
    });


    roomListEl.addEventListener("click", async (e:Event)=>{
        const target = e.target as HTMLElement;
        const manageBtn = target.closest<HTMLElement>(".room-manage-btn");

        if(!manageBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const action = manageBtn.getAttribute("data-action");
        const roomName = manageBtn.getAttribute("data-room");

        if(!action || !roomName) return;

        if(action === "rename"){
            const nextNameInput = window.prompt("Enter a new room name", roomName);
            if(nextNameInput === null) return;

            const nextRoomName = sanitizeRoomName(nextNameInput);
            if(!nextRoomName){
                alert("Room name cannot be empty.");
                return;
            }

            if(nextRoomName === roomName){
                return;
            }

            if(availableRooms.some(room => room.name === nextRoomName)){
                alert("A room with this name already exists.");
                return;
            }

            await chatroomObj.renameRoom(roomName, nextRoomName);
            renameRoomTracking(roomName, nextRoomName);
            availableRooms = availableRooms.map((room)=>
                room.name === roomName ? { ...room, name: nextRoomName } : room
            );
            renderRoomList(availableRooms);

            if(chatroomObj.getRoom() === roomName){
                switchToRoom(nextRoomName);
            }
            return;
        }

        if(action === "delete"){
            if(!window.confirm(`Delete #${roomName}? All messages in this room will be removed.`)){
                return;
            }

            await chatroomObj.deleteRoom(roomName);
            removeRoomTracking(roomName);
            availableRooms = availableRooms.filter((room)=> room.name !== roomName);
            renderRoomList(availableRooms);

            if(chatroomObj.getRoom() === roomName){
                switchToRoom("general");
            }
        }
    });


    // ===== Change chat room =====
    roomListEl.addEventListener('click', (e: Event) => {

        const target = e.target as HTMLElement;
        const getbutton = target.closest("button.room-btn");
        if (!getbutton) return;
        const roomid = getbutton.getAttribute('id');
        if (!roomid) return;
        switchToRoom(roomid);
    });


    // ===== Delete, Edit, React, Pin, Reply handlers (event delegation) =====
    chatlistgroup.addEventListener('click', async (e: Event) => {

        const target = e.target as HTMLElement;

        // --- Delete button ---
        const deleteBtn = target.closest<HTMLElement>('.delete-btn');
        if(deleteBtn){
            const docId = deleteBtn.getAttribute('data-id');
            if(docId && confirm('ဒီ message ကို ဖျက်ချင်တာ သေချာလား?')){
                await chatroomObj.deleteChat(docId);
            }
            return;
        }

        // --- Edit button ---
        const editBtn = target.closest<HTMLElement>('.edit-btn');
        if(editBtn){
            const docId = editBtn.getAttribute('data-id');
            if(!docId) return;

            const li = chatlistgroup.querySelector(`li[data-id="${docId}"]`);
            if(!li) return;

            if(li.querySelector('.edit-container')) return;

            const messageSpan = li.querySelector('.message') as HTMLElement | null;
            if(!messageSpan) return;

            const currentText = messageSpan.textContent || '';

            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'edit-input form-control';
            editInput.value = currentText;

            const saveBtn = document.createElement('button');
            saveBtn.className = 'msg-action-btn save-btn';
            saveBtn.innerHTML = '<i class="fa-solid fa-check"></i>';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'msg-action-btn cancel-btn';
            cancelBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';

            messageSpan.style.display = 'none';
            const actionsDiv = li.querySelector('.message-actions') as HTMLElement | null;
            if(actionsDiv) actionsDiv.style.display = 'none';

            const editContainer = document.createElement('div');
            editContainer.className = 'edit-container';
            editContainer.append(editInput, saveBtn, cancelBtn);
            li.appendChild(editContainer);
            editInput.focus();

            const saveEdit = async ()=>{
                const newText = editInput.value.trim();
                if(newText && newText !== currentText){
                    await chatroomObj.editChat(docId, newText);
                }
                editContainer.remove();
                messageSpan.style.display = '';
                if(actionsDiv) actionsDiv.style.display = '';
            };

            const cancelEdit = ()=>{
                editContainer.remove();
                messageSpan.style.display = '';
                if(actionsDiv) actionsDiv.style.display = '';
            };

            saveBtn.addEventListener('click', saveEdit);
            cancelBtn.addEventListener('click', cancelEdit);
            editInput.addEventListener('keydown',(e)=>{
                if(e.key === 'Enter') saveEdit();
                if(e.key === 'Escape') cancelEdit();
            });

            return;
        }

        // --- React button ---
        const reactBtn = target.closest<HTMLElement>('.react-btn');
        if(reactBtn){
            const docId = reactBtn.getAttribute('data-id');
            if(!docId) return;
            reactionTargetId = docId;
            // Position picker near the button
            const rect = reactBtn.getBoundingClientRect();
            const containerRect = chatcontent.getBoundingClientRect();
            reactionPicker.style.position = "fixed";
            reactionPicker.style.top = `${rect.top - 50}px`;
            reactionPicker.style.left = `${rect.left}px`;
            reactionPicker.style.display = "flex";
            return;
        }

        // --- Reaction pill click (toggle own reaction) ---
        const reactionPill = target.closest<HTMLElement>('.reaction-pill');
        if(reactionPill){
            const docId = reactionPill.getAttribute('data-id');
            const emoji = reactionPill.getAttribute('data-emoji');
            if(!docId || !emoji) return;
            if(reactionPill.classList.contains('reacted')){
                await chatroomObj.removeReaction(docId, emoji, currentUid);
            }else{
                await chatroomObj.addReaction(docId, emoji, currentUid);
            }
            return;
        }

        // --- Pin button ---
        const pinBtn = target.closest<HTMLElement>('.pin-btn');
        if(pinBtn){
            const docId = pinBtn.getAttribute('data-id');
            if(!docId) return;
            const li = chatlistgroup.querySelector(`li[data-id="${docId}"]`);
            const isPinned = li?.classList.contains('pinned-message');
            if(isPinned){
                await chatroomObj.unpinMessage(docId);
            }else{
                await chatroomObj.pinMessage(docId);
            }
            return;
        }

        // --- Reply button ---
        const replyBtn = target.closest<HTMLElement>('.reply-btn');
        if(replyBtn){
            const docId = replyBtn.getAttribute('data-id') || "";
            const replyUsername = replyBtn.getAttribute('data-username') || "";
            const replyMessage = replyBtn.getAttribute('data-message') || "";
            setReply(docId, replyUsername, replyMessage);
            return;
        }

    });


    // ===== Update username =====
    newnameform.addEventListener('submit', (e: Event) => {
        e.preventDefault();

        const input = newnameform.querySelector<HTMLInputElement>("#name");
        const newname = input?.value.trim() ?? "";

        if (!newname) return;

        chatroomObj.updateName(newname);
        newnameform.reset();

        updatemsg.innerText = `Your name was update to ${newname}`;
        setTimeout(() => updatemsg.innerText = '', 3000);

        profilename.textContent = newname;

        typingUnsub();
        typingObj.clearTyping(chatroomObj.getRoom(), currentUid);

        messageuiObj.clearli();
        chatroomObj.updateRoom("general");
        startChatListener();

        typingUnsub = typingObj.listenTyping("general", currentUid, updateTypingDisplay);

        roomtitle.textContent = "general";
        renderRoomList(availableRooms);

    });

});
