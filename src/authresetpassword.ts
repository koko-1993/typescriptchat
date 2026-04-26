import { Authorize } from "./Authorize";

// UI elements
// const resetform = document.getElementById("passwordresetform") as HTMLFormElement;
// const msgElement = document.getElementById("msg") as HTMLElement;
// const googleloginbtn = document.getElementById("googleloginbtn") as HTMLButtonElement;


const resetform = document.getElementById("passwordresetform") as HTMLFormElement | null;
const msgElement = document.getElementById("msg") as HTMLElement | null;
const googleloginbtn = document.getElementById("googleloginbtn") as HTMLButtonElement | null;

if(!resetform || !msgElement || !googleloginbtn){
    throw new Error("Required DOM elements not found.");
}

const authObj = new Authorize();

// reset
resetform.addEventListener("submit",(e:SubmitEvent)=>{
    e.preventDefault();

    const emailinput = document.getElementById("signinemail") as HTMLInputElement | null;

    if(!emailinput){
        alert("Form inputs not found.");
        return;
    }

    const email:string = emailinput.value.trim();

    authObj.resetPassword(email,msgElement);
});

// google login
googleloginbtn.addEventListener("click",()=>{
    authObj.googleLogin();
});

