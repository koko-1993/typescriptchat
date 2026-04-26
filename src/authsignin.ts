import { Authorize } from "./Authorize";

const signinform = document.getElementById("signinform") as HTMLFormElement | null;
const googleloginbtn = document.getElementById("googleloginbtn") as HTMLButtonElement | null;

if(!signinform || !googleloginbtn){
    throw new Error("Required DOM elements not found.");
}

const authObj = new Authorize();

signinform.addEventListener("submit",(e:SubmitEvent)=>{
    e.preventDefault();

    const emailinput = document.getElementById("signinemail") as HTMLInputElement | null;
    const passwordinput = document.getElementById("signinpassword") as HTMLInputElement | null;

    if(!emailinput || !passwordinput){
        throw new Error("Form inputs not found.");
    }

    const email:string = emailinput.value.trim();
    const password:string = passwordinput.value.trim();

    
    if(!email || !password){
        alert("Please enter both email and password");
        return;
    }

    authObj.loginUser(email,password);
});

// google login
googleloginbtn.addEventListener("click",()=>{
    authObj.googleLogin();
});
