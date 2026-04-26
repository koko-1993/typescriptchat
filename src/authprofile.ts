import { Authorize } from "./Authorize";
import { MessageUI } from "./MessageUi";

// ui
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
const msguiObj = new MessageUI(ulele);

authObj.getUser((data)=>{
    if(data){
        // console.log(data);
        msguiObj.userInfo(data);
    }
})

// logout
logoutbtn.addEventListener("click",()=>{
    authObj.logoutUser();
});
