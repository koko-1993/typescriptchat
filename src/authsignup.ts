import {Authorize} from "./Authorize";
import { ConfirmationResult } from "firebase/auth";

const authObj = new Authorize();

// const signupform = document.querySelector("#signupform") as HTMLFormElement;

// const signupform = document.querySelector("#signupform") as HTMLFormElement | null;

const signupform = document.querySelector<HTMLFormElement>("#signupform");

if(!signupform){
    throw new Error("Signup form not found.");
}

const phoneSignupForm = document.querySelector<HTMLFormElement>("#phoneSignupForm");
const phoneSignupSendBtn = document.querySelector<HTMLButtonElement>("#phoneSignupSendBtn");
const phoneSignupCodeInput = document.querySelector<HTMLInputElement>("#phoneSignupCode");
const phoneSignupStatus = document.querySelector<HTMLElement>("#phoneSignupStatus");

if(!phoneSignupForm || !phoneSignupSendBtn || !phoneSignupCodeInput || !phoneSignupStatus){
    throw new Error("Phone signup elements not found.");
}

let phoneSignupConfirmation:ConfirmationResult | null = null;

// Method 1
// signupform.addEventListener("submit",(e:SubmitEvent)=>{
//     e.preventDefault();

//     const form = e.target as HTMLFormElement;

//     // const fullnameinput = form.fullname as HTMLInputElement;
//     // const emailinput = form.email as HTMLInputElement;
//     // const passwordinput = form.password as HTMLInputElement;


//     const fullnameinput = form.querySelector<HTMLInputElement>('input[name="fullname"]');
//     const emailinput = form.querySelector<HTMLInputElement>('input[name="email"]');
//     const passwordinput = form.querySelector<HTMLInputElement>('input[name="password"]');

//     if(!fullnameinput || !emailinput || !passwordinput){
//         throw new Error("One or more input fields are missing");
//     }

//     const fullname:string = fullnameinput.value.trim();
//     const email:string = emailinput.value.trim();
//     const password:string = passwordinput.value.trim();

//     // console.log(fullname,email,password);

//     if(!fullname || !email || !password){
//         alert("All fields are required.");
//         return;
//     }

//     authObj.registerUser(fullname,email,password);
// });



// method 2
signupform.addEventListener("submit",(e:SubmitEvent)=>{
    e.preventDefault();

    const form = e.target as HTMLFormElement;

    const formData = new FormData(form);

    const fullname = String(formData.get("fullname") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    // console.log(fullname,email,password);

    if(!fullname || !email || !password){
        alert("All fields are required.");
        return;
    }

    authObj.registerUser(fullname,email,password);
});

phoneSignupSendBtn.addEventListener("click", async ()=>{
    const fullnameInput = document.querySelector<HTMLInputElement>("#phoneFullname");
    const phoneInput = document.querySelector<HTMLInputElement>("#phoneNumber");

    if(!fullnameInput || !phoneInput){
        throw new Error("Phone signup inputs not found.");
    }

    const fullname = fullnameInput.value.trim();
    const phoneNumber = phoneInput.value.trim();

    if(!fullname || !phoneNumber){
        phoneSignupStatus.textContent = "Full name and phone number are required.";
        phoneSignupStatus.className = "auth-status auth-status-error";
        return;
    }

    try{
        phoneSignupSendBtn.disabled = true;
        phoneSignupStatus.textContent = "Sending verification code...";
        phoneSignupStatus.className = "auth-status auth-status-info";

        phoneSignupConfirmation = await authObj.sendPhoneVerification(phoneNumber, "phoneSignupRecaptcha");
        phoneSignupCodeInput.disabled = false;
        phoneSignupStatus.textContent = "Verification code sent. Enter the OTP to finish sign up.";
        phoneSignupStatus.className = "auth-status auth-status-success";
    }catch{
        phoneSignupStatus.textContent = "Could not send verification code. Please check the phone number.";
        phoneSignupStatus.className = "auth-status auth-status-error";
    }finally{
        phoneSignupSendBtn.disabled = false;
    }
});

phoneSignupForm.addEventListener("submit", async (e:SubmitEvent)=>{
    e.preventDefault();

    const fullnameInput = document.querySelector<HTMLInputElement>("#phoneFullname");
    if(!fullnameInput){
        throw new Error("Phone signup name input not found.");
    }

    const fullname = fullnameInput.value.trim();
    const verificationCode = phoneSignupCodeInput.value.trim();

    if(!phoneSignupConfirmation){
        phoneSignupStatus.textContent = "Send a verification code first.";
        phoneSignupStatus.className = "auth-status auth-status-error";
        return;
    }

    if(!fullname || !verificationCode){
        phoneSignupStatus.textContent = "Full name and verification code are required.";
        phoneSignupStatus.className = "auth-status auth-status-error";
        return;
    }

    try{
        phoneSignupStatus.textContent = "Verifying code...";
        phoneSignupStatus.className = "auth-status auth-status-info";
        await authObj.completePhoneRegistration(fullname, verificationCode, phoneSignupConfirmation);
    }catch{
        phoneSignupStatus.textContent = "Invalid OTP. Please try again.";
        phoneSignupStatus.className = "auth-status auth-status-error";
    }
});
