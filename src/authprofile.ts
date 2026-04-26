import { Authorize } from "./Authorize";
import { MessageUI } from "./MessageUi";
import { auth } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

// const ulele = document.getElementById("userinfo") as HTMLElement;
// const logoutbtn = document.getElementById("logoutbtn") as HTMLButtonElement;


// const ulele = document.getElementById("userinfo") as HTMLElement | null;
// const logoutbtn = document.getElementById("logoutbtn") as HTMLButtonElement | null;
// if(!ulele || !logoutbtn){
//     throw new Error("Required DOM elements not found.");
// }


const ulele = document.querySelector<HTMLElement>("#userinfo");
const logoutbtn = document.querySelector<HTMLButtonElement>("#logoutbtn");
if(!ulele || !logoutbtn){
    throw new Error("Required DOM elements not found.");
}


const authObj = new Authorize();

// wait for auth to get UID
onAuthStateChanged(auth,(user)=>{
    if(user){
        const msguiObj = new MessageUI(ulele, user.uid);
        msguiObj.userInfo(user);
    }
});

// logout
logoutbtn.addEventListener("click",()=>{
    authObj.logoutUser();
});
