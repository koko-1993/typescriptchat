import {Authorize} from "./Authorize";

const authObj = new Authorize();

const signupform = document.querySelector<HTMLFormElement>("#signupform");

if(!signupform){
    throw new Error("Signup form not found.");
}
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
