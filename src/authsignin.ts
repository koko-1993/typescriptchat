import { Authorize } from "./Authorize";

const signinform = document.getElementById("signinform") as HTMLFormElement | null;
const googleloginbtn = document.getElementById("googleloginbtn") as HTMLButtonElement | null;
const signinStatus = document.getElementById("signinStatus") as HTMLElement | null;
const signinSubmitBtn = document.getElementById("signinSubmitBtn") as HTMLButtonElement | null;

if(!signinform || !googleloginbtn || !signinStatus || !signinSubmitBtn){
    throw new Error("Required DOM elements not found.");
}

const authObj = new Authorize();

signinform.addEventListener("submit", async (e:SubmitEvent)=>{
    e.preventDefault();

    const emailinput = document.getElementById("signinemail") as HTMLInputElement | null;
    const passwordinput = document.getElementById("signinpassword") as HTMLInputElement | null;

    if(!emailinput || !passwordinput){
        throw new Error("Form inputs not found.");
    }

    const email:string = emailinput.value.trim().toLowerCase();
    const password:string = passwordinput.value;

    
    if(!email || !password.trim()){
        signinStatus.textContent = "Please enter both email and password.";
        signinStatus.className = "auth-status auth-status-error";
        return;
    }

    try{
        signinSubmitBtn.disabled = true;
        signinStatus.textContent = "Signing you in...";
        signinStatus.className = "auth-status auth-status-info";
        await authObj.loginUser(email, password);
    }catch(error:unknown){
        signinStatus.textContent = error instanceof Error ? error.message : "Could not sign in.";
        signinStatus.className = "auth-status auth-status-error";
    }finally{
        signinSubmitBtn.disabled = false;
    }
});

// google login
googleloginbtn.addEventListener("click",()=>{
    authObj.googleLogin();
});
