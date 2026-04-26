import { Authorize } from "./Authorize";
import { ConfirmationResult } from "firebase/auth";

// UI elements
// const signinform = document.getElementById("signinform") as HTMLFormElement;
// const googleloginbtn = document.getElementById("googleloginbtn") as HTMLButtonElement;

const signinform = document.getElementById("signinform") as HTMLFormElement | null;
const googleloginbtn = document.getElementById("googleloginbtn") as HTMLButtonElement | null;
const phoneSigninForm = document.getElementById("phoneSigninForm") as HTMLFormElement | null;
const phoneSigninSendBtn = document.getElementById("phoneSigninSendBtn") as HTMLButtonElement | null;
const phoneSigninCodeInput = document.getElementById("phoneSigninCode") as HTMLInputElement | null;
const phoneSigninStatus = document.getElementById("phoneSigninStatus") as HTMLElement | null;

if(!signinform || !googleloginbtn || !phoneSigninForm || !phoneSigninSendBtn || !phoneSigninCodeInput || !phoneSigninStatus){
    throw new Error("Required DOM elements not found.");
}

const authObj = new Authorize();
let phoneSigninConfirmation:ConfirmationResult | null = null;

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

phoneSigninSendBtn.addEventListener("click", async ()=>{
    const phoneInput = document.getElementById("signinPhoneNumber") as HTMLInputElement | null;

    if(!phoneInput){
        throw new Error("Phone sign-in input not found.");
    }

    const phoneNumber = phoneInput.value.trim();

    if(!phoneNumber){
        phoneSigninStatus.textContent = "Phone number is required.";
        phoneSigninStatus.className = "auth-status auth-status-error";
        return;
    }

    try{
        phoneSigninSendBtn.disabled = true;
        phoneSigninStatus.textContent = "Sending verification code...";
        phoneSigninStatus.className = "auth-status auth-status-info";

        phoneSigninConfirmation = await authObj.sendPhoneVerification(phoneNumber, "phoneSigninRecaptcha");
        phoneSigninCodeInput.disabled = false;
        phoneSigninStatus.textContent = "Verification code sent. Enter the OTP to sign in.";
        phoneSigninStatus.className = "auth-status auth-status-success";
    }catch{
        phoneSigninStatus.textContent = "Could not send verification code. Please check the phone number.";
        phoneSigninStatus.className = "auth-status auth-status-error";
    }finally{
        phoneSigninSendBtn.disabled = false;
    }
});

phoneSigninForm.addEventListener("submit", async (e:SubmitEvent)=>{
    e.preventDefault();

    const verificationCode = phoneSigninCodeInput.value.trim();

    if(!phoneSigninConfirmation){
        phoneSigninStatus.textContent = "Send a verification code first.";
        phoneSigninStatus.className = "auth-status auth-status-error";
        return;
    }

    if(!verificationCode){
        phoneSigninStatus.textContent = "Verification code is required.";
        phoneSigninStatus.className = "auth-status auth-status-error";
        return;
    }

    try{
        phoneSigninStatus.textContent = "Verifying code...";
        phoneSigninStatus.className = "auth-status auth-status-info";
        await authObj.completePhoneLogin(verificationCode, phoneSigninConfirmation);
    }catch{
        phoneSigninStatus.textContent = "Invalid OTP. Please try again.";
        phoneSigninStatus.className = "auth-status auth-status-error";
    }
});
