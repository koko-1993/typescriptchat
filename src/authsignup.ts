import {Authorize} from "./Authorize";

const authObj = new Authorize();

// const signupform = document.querySelector("#signupform") as HTMLFormElement;

// const signupform = document.querySelector("#signupform") as HTMLFormElement | null;

const signupform = document.querySelector<HTMLFormElement>("#signupform");

if(!signupform){
    throw new Error("Signup form not found.");
}

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