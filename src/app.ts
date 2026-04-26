import { Chatroom } from "./Chatroom";
import { MessageUI } from "./MessageUi";

// get UI elements method 1
// const chatsidebar = document.querySelector(".chat-sidebars") as HTMLElement;
// const updatemsg = document.querySelector(".update-msg") as HTMLElement;
// const newnameform = document.querySelector(".new-nameform") as HTMLFormElement;
// const chatlistgroup = document.querySelector(".chat-lists") as HTMLElement;
// const newchatform = document.querySelector(".new-chatform") as HTMLFormElement;


// get UI elements method 2
// const chatsidebar = document.querySelector(".chat-sidebars") as HTMLElement | null;
// const updatemsg = document.querySelector(".update-msg") as HTMLElement | null;
// const newnameform = document.querySelector(".new-nameform") as HTMLFormElement | null;
// const chatlistgroup = document.querySelector(".chat-lists") as HTMLElement | null;
// const newchatform = document.querySelector(".new-chatform") as HTMLFormElement | null;

// if(!chatsidebar || !updatemsg || !newnameform || !chatlistgroup || !newchatform){
//     throw new Error("One or more required DOM elements are missing.");
// }


// get UI elements method 3 (with generics) ** Note only querySelector are  generics, not getElementById.
const chatsidebar = document.querySelector<HTMLElement>(".chat-sidebars");
const updatemsg = document.querySelector<HTMLElement>(".update-msg");
const newnameform = document.querySelector<HTMLFormElement>(".new-nameform");
const chatlistgroup = document.querySelector<HTMLElement>(".chat-lists");
const newchatform = document.querySelector<HTMLFormElement>(".new-chatform");
const profilename = document.querySelector<HTMLElement>("#profilename");
const roomtitle = document.querySelector<HTMLElement>("#roomtitle");

if (!chatsidebar || !updatemsg || !newnameform || !chatlistgroup || !newchatform || !profilename || !roomtitle) {
    throw new Error("One or more required DOM elements are missing.");
}


const username = localStorage.username ? localStorage.username : "Guest";
profilename.textContent = username;

// instance Chatroom obj & MesssageUI
const chatroomObj = new Chatroom("general", username);
const messageuiObj = new MessageUI(chatlistgroup);


// add new message
newchatform.addEventListener('submit', async (e: Event) => {
    e.preventDefault();

    // const input = newchatform.querySelector("#message") as HTMLInputElement;
    // const message = input.value.trim();
    // console.log(message);


    const input = newchatform.querySelector<HTMLInputElement>("#message");
    // const message = input?.value.trim();
    const message = input?.value.trim() ?? ""; // coalescing operator

    if (!message) return;

    try {

        await chatroomObj.addChat(message);
        newchatform.reset();

    } catch (err) {
        console.error(err);
    }

});


// change chat room
chatsidebar.addEventListener('click', (e: Event) => {

    // method 1
    // const target = e.target as HTMLElement;

    // if (target.tagName === "BUTTON") {
    //     // console.log("i am btn");
    //     // console.log(e.target.getAttribute('id'));

    //     messageuiObj.clearli();

    //     const roomid = target.getAttribute('id');

    //     if (roomid) {
    //         chatroomObj.updateRoom(roomid);
    //         chatroomObj.getChats(data => messageuiObj.renderli(data));
    //     }
    // }


    // method 2 with closest()
    const target = e.target as HTMLElement;
    const getbutton = target.closest("button");
    if (!getbutton) return;

    messageuiObj.clearli();
    const roomid = getbutton.getAttribute('id');
    if (!roomid) return;

    chatroomObj.updateRoom(roomid);
    chatroomObj.getChats(data => messageuiObj.renderli(data));

    // room title
    roomtitle.textContent = roomid;

});



// get chat & render li 
chatroomObj.getChats((data) => {
    // console.log(data);

    messageuiObj.renderli(data);
});



// update username
newnameform.addEventListener('submit', (e: Event) => {
    e.preventDefault();

    // const input = newnameform.querySelector("#name") as HTMLInputElement;
    // const newname = input.value.trim();
    // console.log(newname);


    const input = newnameform.querySelector<HTMLInputElement>("#name");
    // const newname = input?.value.trim();
    const newname = input?.value.trim() ?? "";  // coalescing operator

    if (!newname) return;

    // method 1
    chatroomObj.updateName(newname);
    newnameform.reset();

    // method 2
    // chatroomObj.updateName(newname)
    //     .then(()=>newnameform.reset())
    //     .catch(err=>console.log(err));

    updatemsg.innerText = `Your name was update to ${newname}`;
    setTimeout(() => updatemsg.innerText = '', 3000);

    profilename.textContent = newname;

    // switch to #general room
    messageuiObj.clearli();
    chatroomObj.updateRoom("general");
    chatroomObj.getChats(data=>messageuiObj.renderli(data));

    // room title
    roomtitle.textContent = "general";

});



 // coalescing operator ?? (null or undefined (right) , 0 false "" NaN (left))

//  const num = 0;
//  console.log(num || 100); // 100 ( because 0 is false )
//  console.log(num ?? 100); // 0 ( because 0 is not null ) 

//  const emptystring = "";
//  console.log(emptystring || "default"); // default ( emptystring is false )
//  console.log(emptystring ?? "default"); // "" ( empty string is not nulllish )

//  const nullvalue = null;
//  console.log(nullvalue || "default"); // default
//  console.log(nullvalue ?? "default"); // default


// npm run webpack
// npm run dev


