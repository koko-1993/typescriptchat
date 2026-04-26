import { Chatroom, chatRoomInfo, messageReference } from "./Chatroom";
import { MessageUI } from "./MessageUi";
import { TypingIndicator } from "./TypingIndicator";
import { PresenceManager, OnlineUser } from "./PresenceManager";
import { auth, storage } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type ComposerMode = "reply" | "quote";

interface ComposerContext{
    mode:ComposerMode;
    reference:messageReference;
}

interface RoomMemberView{
    uid:string;
    username:string;
    isAdmin:boolean;
    isOwner:boolean;
}

const chatsidebar = document.querySelector<HTMLElement>(".chat-sidebars")!;
const updatemsg = document.querySelector<HTMLElement>(".update-msg")!;
const newnameform = document.querySelector<HTMLFormElement>(".new-nameform")!;
const chatlistgroup = document.querySelector<HTMLElement>(".chat-lists")!;
const newchatform = document.querySelector<HTMLFormElement>(".new-chatform")!;
const profilename = document.querySelector<HTMLElement>("#profilename")!;
const roomtitle = document.querySelector<HTMLElement>("#roomtitle")!;
const roomsubtitle = document.querySelector<HTMLElement>("#roomsubtitle")!;
const chatcontent = document.querySelector<HTMLElement>(".chat-contents")!;
const typingEl = document.querySelector<HTMLElement>(".typing-indicator")!;
const emojiPicker = document.querySelector<HTMLElement>("#emojiPicker")!;
const emojiToggleBtn = document.querySelector<HTMLElement>("#emojiToggleBtn")!;
const themeToggleBtn = document.querySelector<HTMLElement>("#themeToggleBtn")!;
const soundToggleBtn = document.querySelector<HTMLElement>("#soundToggleBtn")!;
const mentionPopup = document.querySelector<HTMLElement>("#mentionPopup")!;
const searchToggleBtn = document.querySelector<HTMLElement>("#searchToggleBtn")!;
const searchInput = document.querySelector<HTMLInputElement>("#searchInput")!;
const reactionPicker = document.querySelector<HTMLElement>("#reactionPicker")!;
const pinnedBar = document.querySelector<HTMLElement>("#pinnedBar")!;
const pinnedCount = document.querySelector<HTMLElement>("#pinnedCount")!;
const pinnedToggleBtn = document.querySelector<HTMLElement>("#pinnedToggleBtn")!;
const pinnedMessagesList = document.querySelector<HTMLElement>("#pinnedMessagesList")!;
const replyBar = document.querySelector<HTMLElement>("#replyBar")!;
const replyPreviewText = document.querySelector<HTMLElement>("#replyPreviewText")!;
const replyCancelBtn = document.querySelector<HTMLElement>("#replyCancelBtn")!;
const replyContextLabel = document.querySelector<HTMLElement>("#replyContextLabel")!;
const replyContextIcon = document.querySelector<HTMLElement>("#replyContextIcon")!;
const newRoomForm = document.querySelector<HTMLFormElement>("#newRoomForm")!;
const newRoomNameInput = document.querySelector<HTMLInputElement>("#newRoomName")!;
const roomListEl = document.querySelector<HTMLElement>("#roomList")!;
const dmListEl = document.querySelector<HTMLElement>("#dmList")!;
const onlineUsersList = document.querySelector<HTMLElement>("#onlineUsersList")!;
const onlineCountEl = document.querySelector<HTMLElement>("#onlineCount")!;
const fileUploadBtn = document.querySelector<HTMLElement>("#fileUploadBtn")!;
const fileInput = document.querySelector<HTMLInputElement>("#fileInput")!;
const manageRoomBtn = document.querySelector<HTMLButtonElement>("#manageRoomBtn")!;
const mobileBackBtn = document.querySelector<HTMLButtonElement>("#mobileBackBtn")!;
const roomMetaBar = document.querySelector<HTMLElement>("#roomMetaBar")!;
const roomVisibilityLabel = document.querySelector<HTMLElement>("#roomVisibilityLabel")!;
const roomMemberCount = document.querySelector<HTMLElement>("#roomMemberCount")!;
const roomAdminCount = document.querySelector<HTMLElement>("#roomAdminCount")!;
const roomAdminPanel = document.querySelector<HTMLElement>("#roomAdminPanel")!;
const roomInviteLinkInput = document.querySelector<HTMLInputElement>("#roomInviteLink")!;
const generateInviteBtn = document.querySelector<HTMLButtonElement>("#generateInviteBtn")!;
const copyInviteBtn = document.querySelector<HTMLButtonElement>("#copyInviteBtn")!;
const addMemberForm = document.querySelector<HTMLFormElement>("#addMemberForm")!;
const memberSelect = document.querySelector<HTMLSelectElement>("#memberSelect")!;
const roomMemberList = document.querySelector<HTMLElement>("#roomMemberList")!;

if(
    !chatsidebar ||
    !updatemsg ||
    !newnameform ||
    !chatlistgroup ||
    !newchatform ||
    !profilename ||
    !roomtitle ||
    !roomsubtitle ||
    !chatcontent ||
    !typingEl ||
    !emojiPicker ||
    !emojiToggleBtn ||
    !themeToggleBtn ||
    !soundToggleBtn ||
    !mentionPopup ||
    !searchToggleBtn ||
    !searchInput ||
    !reactionPicker ||
    !pinnedBar ||
    !pinnedCount ||
    !pinnedToggleBtn ||
    !pinnedMessagesList ||
    !replyBar ||
    !replyPreviewText ||
    !replyCancelBtn ||
    !replyContextLabel ||
    !replyContextIcon ||
    !newRoomForm ||
    !newRoomNameInput ||
    !roomListEl ||
    !dmListEl ||
    !onlineUsersList ||
    !onlineCountEl ||
    !fileUploadBtn ||
    !fileInput ||
    !manageRoomBtn ||
    !mobileBackBtn ||
    !roomMetaBar ||
    !roomVisibilityLabel ||
    !roomMemberCount ||
    !roomAdminCount ||
    !roomAdminPanel ||
    !roomInviteLinkInput ||
    !generateInviteBtn ||
    !copyInviteBtn ||
    !addMemberForm ||
    !memberSelect ||
    !roomMemberList
){
    throw new Error("One or more required DOM elements are missing.");
}

function isNearBottom():boolean{
    const threshold = 100;
    return chatcontent.scrollHeight - chatcontent.scrollTop - chatcontent.clientHeight < threshold;
}

function scrollToBottom():void{
    chatcontent.scrollTop = chatcontent.scrollHeight;
}

function updateTypingDisplay(users:string[]):void{
    if(users.length > 0){
        typingEl.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span> <span>${users.join(", ")} typing...</span>`;
        typingEl.style.display = "flex";
    }else{
        typingEl.style.display = "none";
    }
}

function escapeHtml(value:string):string{
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function highlightMessageById(messageId:string):void{
    const li = chatlistgroup.querySelector<HTMLElement>(`li[data-id="${messageId}"]`);
    if(!li) return;

    li.scrollIntoView({behavior:"smooth", block:"center"});
    li.classList.add("highlight-flash");
    setTimeout(()=> li.classList.remove("highlight-flash"), 1500);
}

function getBasePageUrl():string{
    return `${window.location.origin}${window.location.pathname}`;
}

async function copyText(value:string):Promise<boolean>{
    try{
        await navigator.clipboard.writeText(value);
        return true;
    }catch{
        return false;
    }
}

function clearUrlParams():void{
    window.history.replaceState({}, document.title, window.location.pathname);
}

function isMobileViewport():boolean{
    return window.matchMedia("(max-width: 767px)").matches;
}

function setMobileConversationView(mode:"list"|"thread"):void{
    if(!isMobileViewport()){
        chatsidebar.classList.remove("mobile-list-hidden");
        document.body.classList.remove("mobile-thread-active");
        return;
    }

    document.body.classList.toggle("mobile-thread-active", mode === "thread");
    chatsidebar.classList.toggle("mobile-list-hidden", mode === "thread");
}

let soundEnabled = localStorage.getItem("soundEnabled") !== "false";

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
    }catch(error){
        console.warn("Audio not available", error);
    }
}

soundToggleBtn.addEventListener("click",()=>{
    soundEnabled = !soundEnabled;
    localStorage.setItem("soundEnabled", String(soundEnabled));
    soundToggleBtn.innerHTML = soundEnabled
        ? '<i class="fa-solid fa-volume-high me-2"></i>Sound: ON'
        : '<i class="fa-solid fa-volume-xmark me-2"></i>Sound: OFF';
});

soundToggleBtn.innerHTML = soundEnabled
    ? '<i class="fa-solid fa-volume-high me-2"></i>Sound: ON'
    : '<i class="fa-solid fa-volume-xmark me-2"></i>Sound: OFF';

function setTheme(theme:string):void{
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    themeToggleBtn.innerHTML = theme === "light"
        ? '<i class="fa-solid fa-sun me-2"></i>Light Mode'
        : '<i class="fa-solid fa-moon me-2"></i>Dark Mode';
}

const savedTheme = localStorage.getItem("theme") || "dark";
setTheme(savedTheme);

themeToggleBtn.addEventListener("click",()=>{
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(current === "dark" ? "light" : "dark");
});

emojiToggleBtn.addEventListener("click",(event)=>{
    event.stopPropagation();
    emojiPicker.style.display = emojiPicker.style.display === "none" ? "block" : "none";
});

emojiPicker.addEventListener("click",(event)=>{
    const target = event.target as HTMLElement;
    if(!target.classList.contains("emoji-item")) return;

    const messageInput = getMessageComposer();
    if(messageInput){
        messageInput.value += target.textContent || "";
        resizeComposer();
        messageInput.focus();
    }
});

document.addEventListener("click",(event)=>{
    const target = event.target as HTMLElement;
    if(!emojiPicker.contains(target) && !emojiToggleBtn.contains(target)){
        emojiPicker.style.display = "none";
    }
});

let searchActive = false;

function getMessageComposer():HTMLTextAreaElement | null{
    return newchatform.querySelector<HTMLTextAreaElement>("#message");
}

function resizeComposer():void{
    const composer = getMessageComposer();
    if(!composer) return;

    composer.style.height = "auto";
    const nextHeight = Math.min(composer.scrollHeight, 140);
    composer.style.height = `${nextHeight}px`;
    composer.style.overflowY = composer.scrollHeight > 140 ? "auto" : "hidden";
}

searchToggleBtn.addEventListener("click",()=>{
    searchActive = !searchActive;
    searchInput.style.display = searchActive ? "block" : "none";

    if(searchActive){
        searchInput.focus();
        return;
    }

    searchInput.value = "";
    chatlistgroup.querySelectorAll("li").forEach((li)=>{
        (li as HTMLElement).style.display = "";
    });
});

searchInput.addEventListener("input",()=>{
    const query = searchInput.value.toLowerCase().trim();
    const items = chatlistgroup.querySelectorAll("li");

    items.forEach((li)=>{
        const message = li.querySelector(".message")?.textContent?.toLowerCase() || "";
        const user = li.querySelector(".username")?.textContent?.toLowerCase() || "";
        (li as HTMLElement).style.display = message.includes(query) || user.includes(query) || query === "" ? "" : "none";
    });
});

function getUnreadKey(room:string):string{
    return `unread_lastRead_${room}`;
}

function markRoomAsRead(room:string):void{
    localStorage.setItem(getUnreadKey(room), String(Date.now()));
}

function getLastReadTime(room:string):number{
    return parseInt(localStorage.getItem(getUnreadKey(room)) || "0");
}

const unreadCounts:Map<string, number> = new Map();
const systemRooms = new Map<string,string>([
    ["general", "fa-solid fa-comments"],
    ["laravel", "fa-brands fa-laravel"],
    ["nodejs", "fa-brands fa-node-js"]
]);

function updateUnreadBadge(room:string, count:number):void{
    unreadCounts.set(room, count);
    const button = document.querySelector(`#roomList button[id="${room}"]`);
    if(!button) return;

    let badge = button.querySelector(".unread-badge");
    if(count > 0){
        if(!badge){
            badge = document.createElement("span");
            badge.className = "unread-badge";
            button.appendChild(badge);
        }
        badge.textContent = String(count > 99 ? "99+" : count);
    }else if(badge){
        badge.remove();
    }
}

function sanitizeRoomName(value:string):string{
    return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
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

let composerContext:ComposerContext | null = null;

function setComposerContext(mode:ComposerMode, id:string, username:string, message:string):void{
    composerContext = {
        mode,
        reference: {id, username, message}
    };

    replyContextLabel.textContent = mode === "reply" ? "Replying to" : "Quoting";
    replyContextIcon.className = mode === "reply" ? "fa-solid fa-reply" : "fa-solid fa-quote-left";
    replyPreviewText.textContent = `${username}: ${message.substring(0, 60)}${message.length > 60 ? "..." : ""}`;
    replyBar.style.display = "flex";

    const messageInput = getMessageComposer();
    messageInput?.focus();
}

function clearComposerContext():void{
    composerContext = null;
    replyBar.style.display = "none";
}

replyCancelBtn.addEventListener("click", clearComposerContext);

let reactionTargetId:string | null = null;
let currentChatroom:Chatroom;
let currentUid = "";

reactionPicker.addEventListener("click",(event)=>{
    const target = event.target as HTMLElement;
    const option = target.closest<HTMLElement>(".reaction-option");
    if(!option || !reactionTargetId || !currentChatroom) return;

    const emoji = option.getAttribute("data-emoji") || "";
    void currentChatroom.addReaction(reactionTargetId, emoji, currentUid);
    reactionPicker.style.display = "none";
    reactionTargetId = null;
});

document.addEventListener("click",(event)=>{
    const target = event.target as HTMLElement;
    if(!reactionPicker.contains(target) && !target.closest(".react-btn")){
        reactionPicker.style.display = "none";
    }
});

pinnedToggleBtn.addEventListener("click",()=>{
    const isHidden = pinnedMessagesList.style.display === "none";
    pinnedMessagesList.style.display = isHidden ? "block" : "none";
    pinnedToggleBtn.innerHTML = isHidden
        ? '<i class="fa-solid fa-chevron-up"></i>'
        : '<i class="fa-solid fa-chevron-down"></i>';
});

let initialized = false;

onAuthStateChanged(auth,(user)=>{
    if(!user || initialized) return;
    initialized = true;

    currentUid = user.uid;
    const photoURL = user.photoURL || "";
    let currentUsername = localStorage.username ? localStorage.username : (user.displayName || "Guest");
    const pendingRoomParam = new URLSearchParams(window.location.search).get("room");
    const pendingInviteParam = new URLSearchParams(window.location.search).get("invite");
    let pendingNavigationHandled = false;

    profilename.textContent = currentUsername;

    const chatroomObj = new Chatroom("general", currentUsername, currentUid, photoURL);
    currentChatroom = chatroomObj;
    const messageuiObj = new MessageUI(chatlistgroup, currentUid);
    const typingObj = new TypingIndicator();
    const presenceObj = new PresenceManager();

    let availableRooms:chatRoomInfo[] = [];
    let onlineUsers:OnlineUser[] = [];
    let roomPanelOpen = false;

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
            if(room.archived){
                return;
            }
            mergedRooms.set(room.name, room);
        });

        return Array.from(mergedRooms.values());
    }

    function isRoomVisible(room:chatRoomInfo):boolean{
        if(room.type === "dm"){
            return (room.participants || []).includes(currentUid);
        }

        if(room.type === "system" || systemRooms.has(room.name)){
            return true;
        }

        const members = room.members || [];
        if(members.length === 0){
            return true;
        }

        return members.includes(currentUid) || (room.admins || []).includes(currentUid) || room.createdBy === currentUid;
    }

    function canManageRoom(room:chatRoomInfo):boolean{
        return room.type !== "dm" && room.type !== "system" && !systemRooms.has(room.name) && ((room.admins || []).includes(currentUid) || room.createdBy === currentUid);
    }

    function getRoomByName(roomName:string):chatRoomInfo | undefined{
        return availableRooms.find((room)=> room.name === roomName);
    }

    function getDisplayNameForUid(uid:string, room?:chatRoomInfo):string{
        const memberName = room?.memberProfiles?.[uid];
        if(memberName){
            return memberName;
        }

        if(room?.type === "dm"){
            const participantIndex = (room.participants || []).findIndex((item)=> item === uid);
            if(participantIndex !== -1){
                return room.participantNames?.[participantIndex] || "Direct Message";
            }
        }

        const onlineUser = onlineUsers.find((item)=> item.uid === uid);
        if(onlineUser){
            return onlineUser.username;
        }

        return messageuiObj.knownUsers.get(uid) || (uid === currentUid ? currentUsername : "Member");
    }

    function getRoomMembers(room:chatRoomInfo):RoomMemberView[]{
        const uniqueMembers = new Set<string>();

        if(room.type === "dm"){
            (room.participants || []).forEach((uid)=> uniqueMembers.add(uid));
        }else{
            (room.members || []).forEach((uid)=> uniqueMembers.add(uid));
            Object.keys(room.memberProfiles || {}).forEach((uid)=> uniqueMembers.add(uid));
            if(room.createdBy){
                uniqueMembers.add(room.createdBy);
            }
        }

        return Array.from(uniqueMembers).map((uid)=>({
            uid,
            username: getDisplayNameForUid(uid, room),
            isAdmin: uid === room.createdBy || (room.admins || []).includes(uid),
            isOwner: uid === room.createdBy
        })).sort((left, right)=>{
            if(left.isOwner !== right.isOwner){
                return left.isOwner ? -1 : 1;
            }
            if(left.isAdmin !== right.isAdmin){
                return left.isAdmin ? -1 : 1;
            }
            return left.username.localeCompare(right.username);
        });
    }

    function getDmDisplayName(room:chatRoomInfo):string{
        const participants = room.participants || [];
        const otherUid = participants.find((uid)=> uid !== currentUid) || participants[0];
        return otherUid ? getDisplayNameForUid(otherUid, room) : "Direct Message";
    }

    function getRoomDisplayName(roomName:string):string{
        const room = getRoomByName(roomName);
        return room?.type === "dm" ? getDmDisplayName(room) : roomName;
    }

    function getRoomSubtitle(roomName:string):string{
        const room = getRoomByName(roomName);

        if(room?.type === "dm"){
            const otherUid = (room.participants || []).find((uid)=> uid !== currentUid);
            const otherUser = onlineUsers.find((member)=> member.uid === otherUid);
            return otherUser ? "Online now" : "Private conversation";
        }

        if(room?.type === "system" || systemRooms.has(roomName)){
            return "Shared room conversation";
        }

        const memberCount = getRoomMembers(room || {
            name: roomName,
            createdBy: "",
            createdByName: ""
        }).length;
        return `${memberCount} member${memberCount === 1 ? "" : "s"} in this room`;
    }

    function buildInviteLink(room:chatRoomInfo):string{
        if(!room.inviteCode){
            return "";
        }

        return `${getBasePageUrl()}?room=${encodeURIComponent(room.name)}&invite=${encodeURIComponent(room.inviteCode)}`;
    }

    function renderAddMemberOptions(room:chatRoomInfo):void{
        const currentMembers = new Set((room.members || []).concat(room.createdBy ? [room.createdBy] : []));
        const selectableUsers = onlineUsers
            .filter((item)=> item.uid !== currentUid && !currentMembers.has(item.uid))
            .sort((left, right)=> left.username.localeCompare(right.username));

        memberSelect.innerHTML = `<option value="">${selectableUsers.length > 0 ? "Select an online user" : "No online users available"}</option>`;
        selectableUsers.forEach((member)=>{
            const option = document.createElement("option");
            option.value = member.uid;
            option.textContent = member.username;
            memberSelect.appendChild(option);
        });
    }

    function renderRoomMembers(room:chatRoomInfo):void{
        const members = getRoomMembers(room);
        if(members.length === 0){
            roomMemberList.innerHTML = '<div class="room-member-empty">No members found for this room yet.</div>';
            return;
        }

        roomMemberList.innerHTML = members.map((member)=>{
            const badges:string[] = [];

            if(member.isOwner){
                badges.push('<span class="room-role-badge owner">Owner</span>');
            }else if(member.isAdmin){
                badges.push('<span class="room-role-badge">Admin</span>');
            }

            if(member.uid === currentUid){
                badges.push('<span class="room-role-badge">You</span>');
            }

            const canEditMember = canManageRoom(room) && member.uid !== room.createdBy && member.uid !== currentUid;
            const adminAction = canEditMember
                ? `<button type="button" class="room-member-btn" data-action="toggle-admin" data-room="${room.name}" data-uid="${member.uid}">${member.isAdmin ? "Remove Admin" : "Make Admin"}</button>`
                : "";
            const removeAction = canEditMember
                ? `<button type="button" class="room-member-btn remove" data-action="remove-member" data-room="${room.name}" data-uid="${member.uid}">Remove</button>`
                : "";

            return `
                <div class="room-member-item">
                    <div class="room-member-main">
                        <span class="room-member-name">${escapeHtml(member.username)}</span>
                        <div class="room-member-meta">${badges.join("")}</div>
                    </div>
                    <div class="room-member-actions">
                        ${adminAction}
                        ${removeAction}
                    </div>
                </div>
            `;
        }).join("");
    }

    function renderRoomMeta(roomName:string):void{
        const room = getRoomByName(roomName);

        if(!room || room.type === "dm" || room.type === "system" || systemRooms.has(room.name)){
            roomMetaBar.style.display = "none";
            roomAdminPanel.style.display = "none";
            manageRoomBtn.style.display = "none";
            roomPanelOpen = false;
            return;
        }

        const members = getRoomMembers(room);
        const adminTotal = members.filter((member)=> member.isAdmin).length;
        const manageable = canManageRoom(room);

        roomMetaBar.style.display = "flex";
        roomVisibilityLabel.textContent = room.members && room.members.length > 0 ? "Private Room" : "Group Room";
        roomMemberCount.textContent = `${members.length} member${members.length === 1 ? "" : "s"}`;
        roomAdminCount.textContent = `${adminTotal} admin${adminTotal === 1 ? "" : "s"}`;
        manageRoomBtn.style.display = manageable ? "inline-flex" : "none";

        if(!manageable){
            roomPanelOpen = false;
            roomAdminPanel.style.display = "none";
            return;
        }

        roomInviteLinkInput.value = buildInviteLink(room);
        renderAddMemberOptions(room);
        renderRoomMembers(room);
        roomAdminPanel.style.display = roomPanelOpen ? "block" : "none";
    }

    function createRoomButton(room:chatRoomInfo):HTMLButtonElement{
        const roomButton = document.createElement("button");
        const activeRoom = currentChatroom.getRoom();

        roomButton.type = "button";
        roomButton.id = room.name;
        roomButton.className = "btn room-btn";

        if(room.name === activeRoom){
            roomButton.classList.add("active-room");
        }

        if(room.type === "dm"){
            roomButton.innerHTML = `<i class="fa-regular fa-message"></i><span class="room-btn-label">${escapeHtml(getDmDisplayName(room))}</span>`;
        }else{
            const iconClass = systemRooms.get(room.name) || ((room.members || []).length > 0 ? "fa-solid fa-lock" : "fa-solid fa-hashtag");
            const prefix = systemRooms.has(room.name) ? "" : "#";
            roomButton.innerHTML = `<i class="${iconClass}"></i><span class="room-btn-label">${prefix}${escapeHtml(room.name)}</span>`;
        }

        const unreadCount = unreadCounts.get(room.name) || 0;
        if(unreadCount > 0){
            const badge = document.createElement("span");
            badge.className = "unread-badge";
            badge.textContent = String(unreadCount > 99 ? "99+" : unreadCount);
            roomButton.appendChild(badge);
        }

        return roomButton;
    }

    async function startDirectMessage(targetUid:string, targetUsername:string):Promise<void>{
        const roomId = await chatroomObj.createDMRoom(targetUid, targetUsername);
        switchToRoom(roomId);
    }

    function renderRoomList(rooms:chatRoomInfo[]):void{
        const activeRoom = currentChatroom.getRoom();
        const visibleRooms = rooms.filter((room)=> isRoomVisible(room));
        const groupRooms = visibleRooms.filter((room)=> room.type !== "dm");
        const dmRooms = visibleRooms.filter((room)=> room.type === "dm");

        roomListEl.innerHTML = "";
        dmListEl.innerHTML = "";

        groupRooms.forEach((room)=>{
            const roomItem = document.createElement("div");
            roomItem.className = "room-list-item";
            roomItem.appendChild(createRoomButton(room));

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

            roomListEl.appendChild(roomItem);
        });

        dmRooms.forEach((room)=>{
            const roomItem = document.createElement("div");
            roomItem.className = "room-list-item";
            const roomButton = createRoomButton(room);

            if(room.name === activeRoom){
                roomButton.classList.add("active-room");
            }

            roomItem.appendChild(roomButton);
            dmListEl.appendChild(roomItem);
        });
    }

    function resetSearchUi():void{
        searchInput.value = "";
        searchInput.style.display = "none";
        searchActive = false;
    }

    function switchToRoom(roomName:string):void{
        const room = getRoomByName(roomName);
        if(room && !isRoomVisible(room)){
            alert("You no longer have access to this room.");
            return;
        }

        messageuiObj.clearli();
        typingUnsub();
        void typingObj.clearTyping(chatroomObj.getRoom(), currentUid);

        chatroomObj.updateRoom(roomName);
        startChatListener();
        setTimeout(()=> scrollToBottom(), 500);

        typingUnsub = typingObj.listenTyping(roomName, currentUid, updateTypingDisplay);
        roomtitle.textContent = getRoomDisplayName(roomName);
        roomsubtitle.textContent = getRoomSubtitle(roomName);
        markRoomAsRead(roomName);
        updateUnreadBadge(roomName, 0);

        document.querySelectorAll(".room-btn").forEach((button)=> button.classList.remove("active-room"));
        document.querySelector<HTMLElement>(`.room-btn[id="${roomName}"]`)?.classList.add("active-room");

        resetSearchUi();
        clearComposerContext();
        reactionPicker.style.display = "none";
        mentionPopup.style.display = "none";
        renderRoomMeta(roomName);
        setMobileConversationView("thread");
    }

    async function handlePendingNavigation():Promise<void>{
        if(pendingNavigationHandled || !pendingRoomParam) return;
        pendingNavigationHandled = true;

        if(pendingInviteParam){
            const joined = await chatroomObj.joinRoomWithInvite(pendingRoomParam, pendingInviteParam, currentUsername);
            clearUrlParams();
            if(joined){
                updatemsg.innerText = `Joined #${pendingRoomParam} via invite link`;
                setTimeout(()=> updatemsg.innerText = "", 3000);
                switchToRoom(pendingRoomParam);
            }
            return;
        }

        const room = getRoomByName(pendingRoomParam);
        if(room && isRoomVisible(room)){
            clearUrlParams();
            switchToRoom(pendingRoomParam);
        }
    }

    markRoomAsRead("general");
    void presenceObj.setOnline(currentUid, currentUsername, photoURL);

    presenceObj.listenOnlineUsers((users)=>{
        onlineUsers = users;
        onlineCountEl.textContent = String(users.length);
        onlineUsersList.innerHTML = users.map((member)=>{
            const initials = member.username.split(" ").map((word)=> word[0]).join("").substring(0,2).toUpperCase();
            return `
                <div class="online-user-item">
                    <div class="online-avatar">${member.photoURL ? `<img src="${member.photoURL}" class="avatar-img-sm" />` : initials}</div>
                    <span class="online-username">${escapeHtml(member.username)}</span>
                    ${member.uid === currentUid
                        ? '<span class="online-you">(you)</span>'
                        : `<button type="button" class="start-dm-btn" data-uid="${member.uid}" data-username="${escapeHtml(member.username)}" title="Chat privately"><i class="fa-regular fa-message"></i></button>`}
                </div>
            `;
        }).join("");

        renderRoomMeta(chatroomObj.getRoom());
        roomsubtitle.textContent = getRoomSubtitle(chatroomObj.getRoom());
    });

    onlineUsersList.addEventListener("click", async (event)=>{
        const target = event.target as HTMLElement;
        const dmBtn = target.closest<HTMLElement>(".start-dm-btn");
        if(!dmBtn) return;

        const targetUid = dmBtn.getAttribute("data-uid");
        const targetUsername = dmBtn.getAttribute("data-username");
        if(!targetUid || !targetUsername) return;

        await startDirectMessage(targetUid, targetUsername);
    });

    manageRoomBtn.addEventListener("click",()=>{
        const room = getRoomByName(chatroomObj.getRoom());
        if(!room || !canManageRoom(room)) return;

        roomPanelOpen = !roomPanelOpen;
        renderRoomMeta(room.name);
    });

    mobileBackBtn.addEventListener("click",()=>{
        setMobileConversationView("list");
    });

    window.addEventListener("resize",()=>{
        setMobileConversationView(document.body.classList.contains("mobile-thread-active") ? "thread" : "list");
    });

    generateInviteBtn.addEventListener("click", async ()=>{
        const room = getRoomByName(chatroomObj.getRoom());
        if(!room || !canManageRoom(room)) return;

        const inviteLink = await chatroomObj.generateInviteLink(room.name, getBasePageUrl());
        roomInviteLinkInput.value = inviteLink;
        roomPanelOpen = true;
        renderRoomMeta(room.name);
    });

    copyInviteBtn.addEventListener("click", async ()=>{
        if(!roomInviteLinkInput.value){
            alert("Generate an invite link first.");
            return;
        }

        const copied = await copyText(roomInviteLinkInput.value);
        if(copied){
            updatemsg.innerText = "Invite link copied to clipboard";
            setTimeout(()=> updatemsg.innerText = "", 2500);
            return;
        }

        window.prompt("Copy this invite link", roomInviteLinkInput.value);
    });

    addMemberForm.addEventListener("submit", async (event)=>{
        event.preventDefault();

        const room = getRoomByName(chatroomObj.getRoom());
        const memberUid = memberSelect.value;
        if(!room || !canManageRoom(room) || !memberUid) return;

        const selectedUser = onlineUsers.find((member)=> member.uid === memberUid);
        if(!selectedUser) return;

        await chatroomObj.addMemberToRoom(room.name, selectedUser.uid, selectedUser.username);
        memberSelect.value = "";
    });

    roomMemberList.addEventListener("click", async (event)=>{
        const target = event.target as HTMLElement;
        const actionBtn = target.closest<HTMLElement>("[data-action]");
        if(!actionBtn) return;

        const action = actionBtn.getAttribute("data-action");
        const roomName = actionBtn.getAttribute("data-room");
        const memberUid = actionBtn.getAttribute("data-uid");
        const room = roomName ? getRoomByName(roomName) : undefined;

        if(!action || !roomName || !memberUid || !room || !canManageRoom(room)) return;
        if(memberUid === room.createdBy){
            alert("The room owner cannot be changed here.");
            return;
        }

        if(action === "toggle-admin"){
            const member = getRoomMembers(room).find((item)=> item.uid === memberUid);
            await chatroomObj.setRoomAdminStatus(roomName, memberUid, !(member?.isAdmin));
            return;
        }

        if(action === "remove-member"){
            const memberName = getDisplayNameForUid(memberUid, room);
            if(!window.confirm(`Remove ${memberName} from #${roomName}?`)){
                return;
            }
            await chatroomObj.removeMemberFromRoom(roomName, memberUid);
        }
    });

    fileUploadBtn.addEventListener("click",()=>{
        fileInput.click();
    });

    fileInput.addEventListener("change", async ()=>{
        const file = fileInput.files?.[0];
        if(!file) return;

        if(!file.type.startsWith("image/")){
            alert("Only image files are allowed.");
            fileInput.value = "";
            return;
        }

        if(file.size > 5 * 1024 * 1024){
            alert("File size must be under 5MB.");
            fileInput.value = "";
            return;
        }

        try{
            const fileName = `chat_images/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const replyTo = composerContext?.mode === "reply" ? composerContext.reference : undefined;
            const quoteTo = composerContext?.mode === "quote" ? composerContext.reference : undefined;
            await chatroomObj.addChat(`[image](${downloadURL})`, replyTo, quoteTo);
            clearComposerContext();
            fileInput.value = "";
        }catch(error){
            console.error("Upload error:", error);
            alert("Failed to upload image.");
            fileInput.value = "";
        }
    });

    chatroomObj.listenRooms((rooms)=>{
        availableRooms = getAllRooms(rooms);
        renderRoomList(availableRooms);
        renderRoomMeta(chatroomObj.getRoom());
        roomsubtitle.textContent = getRoomSubtitle(chatroomObj.getRoom());

        const currentRoom = chatroomObj.getRoom();
        const room = getRoomByName(currentRoom);
        if(room && !isRoomVisible(room)){
            switchToRoom("general");
        }

        void handlePendingNavigation();
    });

    const messageInput = getMessageComposer();

    function showMentionSuggestions(filter:string):void{
        const users = Array.from(messageuiObj.knownUsers.values())
            .filter((name)=> name.toLowerCase().includes(filter.toLowerCase()) && name !== currentUsername);

        if(users.length === 0 || filter === ""){
            mentionPopup.style.display = "none";
            return;
        }

        mentionPopup.innerHTML = users.slice(0, 5).map((name)=> `<div class="mention-item" data-name="${escapeHtml(name)}">@${escapeHtml(name)}</div>`).join("");
        mentionPopup.style.display = "block";
    }

    if(messageInput){
        messageInput.addEventListener("input",()=>{
            const value = messageInput.value;
            const atIndex = value.lastIndexOf("@");

            if((atIndex !== -1 && atIndex === value.length - 1) || (atIndex !== -1 && !value.substring(atIndex).includes(" "))){
                showMentionSuggestions(value.substring(atIndex + 1));
            }else{
                mentionPopup.style.display = "none";
            }

            void typingObj.setTyping(chatroomObj.getRoom(), currentUid, currentUsername);
            resizeComposer();
        });

        messageInput.addEventListener("focus",()=>{
            setTimeout(()=> scrollToBottom(), 120);
        });
    }

    mentionPopup.addEventListener("click",(event)=>{
        const target = event.target as HTMLElement;
        const item = target.closest<HTMLElement>(".mention-item");
        if(!item || !messageInput) return;

        const name = item.getAttribute("data-name") || "";
        const value = messageInput.value;
        const atIndex = value.lastIndexOf("@");
        messageInput.value = value.substring(0, atIndex) + "@" + name + " ";
        resizeComposer();
        messageInput.focus();
        mentionPopup.style.display = "none";
    });

    const pinnedMessages:Map<string,{username:string;message:string}> = new Map();

    function updatePinnedBar():void{
        const count = pinnedMessages.size;
        if(count === 0){
            pinnedBar.style.display = "none";
            return;
        }

        pinnedBar.style.display = "block";
        pinnedCount.textContent = String(count);
        pinnedMessagesList.innerHTML = "";

        pinnedMessages.forEach((message, id)=>{
            const div = document.createElement("div");
            div.className = "pinned-msg-item";
            div.innerHTML = `<strong>${escapeHtml(message.username)}</strong>: ${escapeHtml(message.message.substring(0, 80))}${message.message.length > 80 ? "..." : ""}`;
            div.addEventListener("click",()=> highlightMessageById(id));
            pinnedMessagesList.appendChild(div);
        });
    }

    function startChatListener():void{
        pinnedMessages.clear();
        updatePinnedBar();
        chatlistgroup.classList.add("is-loading");
        chatlistgroup.classList.remove("is-empty");

        chatroomObj.getChats((data, type)=>{
            if(type === "added"){
                const shouldScroll = isNearBottom();
                messageuiObj.renderli(data);

                if(data.id && data.uid !== currentUid && data.createdAt.toMillis() > getLastReadTime(chatroomObj.getRoom())){
                    const nextUnread = (unreadCounts.get(chatroomObj.getRoom()) || 0) + 1;
                    if(document.visibilityState === "visible"){
                        updateUnreadBadge(chatroomObj.getRoom(), 0);
                    }else{
                        updateUnreadBadge(chatroomObj.getRoom(), nextUnread);
                    }
                }

                if(shouldScroll){
                    scrollToBottom();
                }

                if(data.uid !== currentUid){
                    playNotificationSound();
                }

                if(data.pinned && data.id){
                    pinnedMessages.set(data.id, {username:data.username, message:data.message});
                    updatePinnedBar();
                }

                if(data.id && data.uid !== currentUid){
                    void chatroomObj.markAsRead(data.id, currentUid);
                }
            }

            if(type === "modified"){
                messageuiObj.updateMessage(data);
                if(data.id){
                    if(data.pinned){
                        pinnedMessages.set(data.id, {username:data.username, message:data.message});
                    }else{
                        pinnedMessages.delete(data.id);
                    }
                    updatePinnedBar();
                }
            }

            if(type === "removed" && data.id){
                messageuiObj.removeMessage(data.id);
                pinnedMessages.delete(data.id);
                updatePinnedBar();
            }
        }, (isEmpty)=>{
            chatlistgroup.classList.remove("is-loading");
            chatlistgroup.classList.toggle("is-empty", isEmpty);
        });
    }

    startChatListener();
    setTimeout(()=> scrollToBottom(), 500);
    roomsubtitle.textContent = getRoomSubtitle("general");
    setMobileConversationView("list");

    let typingUnsub = typingObj.listenTyping("general", currentUid, updateTypingDisplay);

    newchatform.addEventListener("submit", async (event)=>{
        event.preventDefault();

        const input = getMessageComposer();
        const message = input?.value.trim() ?? "";
        if(!message) return;

        try{
            const replyTo = composerContext?.mode === "reply" ? composerContext.reference : undefined;
            const quoteTo = composerContext?.mode === "quote" ? composerContext.reference : undefined;
            await chatroomObj.addChat(message, replyTo, quoteTo);
            newchatform.reset();
            resizeComposer();
            void typingObj.clearTyping(chatroomObj.getRoom(), currentUid);
            emojiPicker.style.display = "none";
            mentionPopup.style.display = "none";
            clearComposerContext();
        }catch(error){
            console.error(error);
        }
    });

    newRoomForm.addEventListener("submit", async (event)=>{
        event.preventDefault();

        const roomName = sanitizeRoomName(newRoomNameInput.value);
        if(!roomName) return;

        if(availableRooms.some((room)=> room.name === roomName)){
            alert("A room with this name already exists.");
            return;
        }

        await chatroomObj.createRoom(roomName);
        newRoomNameInput.value = "";
    });

    roomListEl.addEventListener("click", async (event)=>{
        const target = event.target as HTMLElement;
        const manageBtn = target.closest<HTMLElement>(".room-manage-btn");

        if(manageBtn){
            event.preventDefault();
            event.stopPropagation();

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

                if(availableRooms.some((room)=> room.name === nextRoomName)){
                    alert("A room with this name already exists.");
                    return;
                }

                await chatroomObj.renameRoom(roomName, nextRoomName);
                renameRoomTracking(roomName, nextRoomName);
                availableRooms = availableRooms.map((room)=> room.name === roomName ? {...room, name: nextRoomName} : room);
                renderRoomList(availableRooms);

                if(chatroomObj.getRoom() === roomName){
                    switchToRoom(nextRoomName);
                }
                return;
            }

            if(action === "delete"){
                if(!window.confirm(`Delete #${roomName}? The room will be hidden, but chat history will be kept.`)){
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
            return;
        }

        const roomButton = target.closest<HTMLElement>("button.room-btn");
        const roomId = roomButton?.getAttribute("id");
        if(roomId){
            switchToRoom(roomId);
        }
    });

    dmListEl.addEventListener("click",(event)=>{
        const target = event.target as HTMLElement;
        const roomButton = target.closest<HTMLElement>("button.room-btn");
        const roomId = roomButton?.getAttribute("id");
        if(roomId){
            switchToRoom(roomId);
        }
    });

    chatlistgroup.addEventListener("click", async (event)=>{
        const target = event.target as HTMLElement;

        const reference = target.closest<HTMLElement>(".message-reference");
        if(reference){
            const refId = reference.getAttribute("data-ref-id");
            if(refId){
                highlightMessageById(refId);
            }
            return;
        }

        const deleteBtn = target.closest<HTMLElement>(".delete-btn");
        if(deleteBtn){
            const docId = deleteBtn.getAttribute("data-id");
            if(docId && window.confirm("ဒီ message ကို ဖျက်ချင်တာ သေချာလား?")){
                await chatroomObj.deleteChat(docId);
            }
            return;
        }

        const editBtn = target.closest<HTMLElement>(".edit-btn");
        if(editBtn){
            const docId = editBtn.getAttribute("data-id");
            if(!docId) return;

            const li = chatlistgroup.querySelector(`li[data-id="${docId}"]`);
            if(!li || li.querySelector(".edit-container")) return;

            const messageSpan = li.querySelector(".message") as HTMLElement | null;
            if(!messageSpan) return;

            const currentText = messageSpan.textContent || "";
            const editInput = document.createElement("input");
            editInput.type = "text";
            editInput.className = "edit-input form-control";
            editInput.value = currentText;

            const saveBtn = document.createElement("button");
            saveBtn.className = "msg-action-btn save-btn";
            saveBtn.innerHTML = '<i class="fa-solid fa-check"></i>';

            const cancelBtn = document.createElement("button");
            cancelBtn.className = "msg-action-btn cancel-btn";
            cancelBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';

            messageSpan.style.display = "none";
            const actionsDiv = li.querySelector(".message-actions") as HTMLElement | null;
            if(actionsDiv){
                actionsDiv.style.display = "none";
            }

            const editContainer = document.createElement("div");
            editContainer.className = "edit-container";
            editContainer.append(editInput, saveBtn, cancelBtn);
            li.appendChild(editContainer);
            editInput.focus();

            const saveEdit = async ()=>{
                const newText = editInput.value.trim();
                if(newText && newText !== currentText){
                    await chatroomObj.editChat(docId, newText);
                }
                editContainer.remove();
                messageSpan.style.display = "";
                if(actionsDiv){
                    actionsDiv.style.display = "";
                }
            };

            const cancelEdit = ()=>{
                editContainer.remove();
                messageSpan.style.display = "";
                if(actionsDiv){
                    actionsDiv.style.display = "";
                }
            };

            saveBtn.addEventListener("click",()=> void saveEdit());
            cancelBtn.addEventListener("click", cancelEdit);
            editInput.addEventListener("keydown",(keyEvent)=>{
                if(keyEvent.key === "Enter"){
                    void saveEdit();
                }
                if(keyEvent.key === "Escape"){
                    cancelEdit();
                }
            });
            return;
        }

        const reactBtn = target.closest<HTMLElement>(".react-btn");
        if(reactBtn){
            const docId = reactBtn.getAttribute("data-id");
            if(!docId) return;

            reactionTargetId = docId;
            const rect = reactBtn.getBoundingClientRect();
            reactionPicker.style.position = "fixed";
            reactionPicker.style.top = `${rect.top - 50}px`;
            reactionPicker.style.left = `${rect.left}px`;
            reactionPicker.style.display = "flex";
            return;
        }

        const reactionPill = target.closest<HTMLElement>(".reaction-pill");
        if(reactionPill){
            const docId = reactionPill.getAttribute("data-id");
            const emoji = reactionPill.getAttribute("data-emoji");
            if(!docId || !emoji) return;

            if(reactionPill.classList.contains("reacted")){
                await chatroomObj.removeReaction(docId, emoji, currentUid);
            }else{
                await chatroomObj.addReaction(docId, emoji, currentUid);
            }
            return;
        }

        const pinBtn = target.closest<HTMLElement>(".pin-btn");
        if(pinBtn){
            const docId = pinBtn.getAttribute("data-id");
            if(!docId) return;

            const li = chatlistgroup.querySelector(`li[data-id="${docId}"]`);
            const isPinned = li?.classList.contains("pinned-message");
            if(isPinned){
                await chatroomObj.unpinMessage(docId);
            }else{
                await chatroomObj.pinMessage(docId);
            }
            return;
        }

        const replyBtn = target.closest<HTMLElement>(".reply-btn");
        if(replyBtn){
            setComposerContext(
                "reply",
                replyBtn.getAttribute("data-id") || "",
                replyBtn.getAttribute("data-username") || "",
                replyBtn.getAttribute("data-message") || ""
            );
            return;
        }

        const quoteBtn = target.closest<HTMLElement>(".quote-btn");
        if(quoteBtn){
            setComposerContext(
                "quote",
                quoteBtn.getAttribute("data-id") || "",
                quoteBtn.getAttribute("data-username") || "",
                quoteBtn.getAttribute("data-message") || ""
            );
        }
    });

    newnameform.addEventListener("submit",(event)=>{
        event.preventDefault();

        const input = newnameform.querySelector<HTMLInputElement>("#name");
        const newName = input?.value.trim() ?? "";
        if(!newName) return;

        currentUsername = newName;
        chatroomObj.updateName(newName);
        newnameform.reset();

        updatemsg.innerText = `Your name was update to ${newName}`;
        setTimeout(()=> updatemsg.innerText = "", 3000);

        profilename.textContent = newName;

        const memberSyncRooms = availableRooms.filter((room)=> room.type !== "system" && ((room.members || []).includes(currentUid) || (room.participants || []).includes(currentUid)));
        memberSyncRooms.forEach((room)=>{
            void chatroomObj.addMemberToRoom(room.name, currentUid, newName).catch(()=> undefined);
        });

        typingUnsub();
        void typingObj.clearTyping(chatroomObj.getRoom(), currentUid);

        messageuiObj.clearli();
        chatroomObj.updateRoom("general");
        startChatListener();

        typingUnsub = typingObj.listenTyping("general", currentUid, updateTypingDisplay);
        roomtitle.textContent = "general";
        roomsubtitle.textContent = getRoomSubtitle("general");
        renderRoomList(availableRooms);
        renderRoomMeta("general");
        setMobileConversationView("list");
    });

    resizeComposer();
});
