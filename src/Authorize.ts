import { auth, provider } from "./firebaseConfig";
import { User } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import {
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signInWithPopup
} from "firebase/auth";


export class Authorize {

    private defaultprofileimg:string;

    constructor() {
        this.defaultprofileimg = "https://static.thenounproject.com/png/65476-200.png";

        // console.log(window.location.pathname); // /signin.html
        // console.log(window.location.pathname.replace(/\/[^/]*$/,'/')); 
        // console.log(window.location.pathname.replace(/[^/]*$/,'')); 

        // ^ start with             = '/^abc/'      = abc...
        // $ end with               = '/abc$/'      = ...abc
        // * qunaitfier 0 or more   = '/a*/'        = aaa
        // *$ qunaitfier + end      = '/[0-9]*$/'   =  

        // console.log(/^a/.test("abc")); // true      => start with a
        // console.log(/^a/.test("bca")); // false     => start with a

        // console.log(/[^a]/.test("abc")); // true    => b and c are not a
        // console.log(/[^a]/.test("bc")); // true    => b and c are not a
        // console.log(/[^a]/.test("bac")); // true    => b and c are not a
        // console.log(/[^a]/.test("bca")); // true    => b and c are not a
        // console.log(/[^a]/.test("a")); // false    => a
        // console.log(/[^a]/.test("aa")); // false    => a

        // $ ->     = until end of string
        // [^/]*    = zero or more characters that are not / 
        // /[^/]*$/


    }

    private getAuthErrorMessage(error:unknown):string {
        if(!(error instanceof FirebaseError)){
            return error instanceof Error ? error.message : "Unknown error";
        }

        switch(error.code){
        case "auth/invalid-credential":
            return "Email or password is incorrect. If you signed up with Google, use Google login instead.";
        case "auth/user-not-found":
            return "No account was found with that email.";
        case "auth/wrong-password":
            return "Password is incorrect.";
        case "auth/email-already-in-use":
            return "That email is already registered.";
        case "auth/invalid-email":
            return "Email address format is invalid.";
        case "auth/weak-password":
            return "Password is too weak. Use at least 6 characters.";
        case "auth/too-many-requests":
            return "Too many attempts. Please wait a moment and try again.";
        default:
            return error.message;
        }
    }

    // helper to redirect relative to current directory
    redirectTo(page:string):void {
        const base = window.location.pathname.replace(/\/[^/]*$/, '/');
        window.location.href = base + page;
    }

    // Register user with fullname, email and password
    async registerUser(fullname:string, email:string, password:string):Promise<void> {

        try {

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update user profile
            await updateProfile(user, {
                displayName: fullname,
                photoURL: this.defaultprofileimg
            })

            // Save username locally
            this.setLocalName(user);


            // Redirect to index.html
            // window.location.href = "../index.html";

            this.redirectTo("index.html");

        } catch (error:unknown) {
            console.error("Error registering users : ", error);
            const message = this.getAuthErrorMessage(error);
            window.alert(message);
        }

    }


    // Login user with email and password
    async loginUser(email:string, password:string):Promise<void> {

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save username locally
            this.setLocalName(user);

            // Redirect to index.html
            // window.location.href = "../index.html";

            this.redirectTo("index.html");

        } catch (error:unknown) {
            console.error("Error Login users : ", error);
            const message = this.getAuthErrorMessage(error);
            throw new Error(message);
        }

    }
    // Logout user
    async logoutUser():Promise<void> {

        try {
            await signOut(auth);

            // unset name from localStorage
            this.unsetLocalName();

            // Redirect to signin.html
            // window.location.href = "../signin.html";

            this.redirectTo("signin.html");

        } catch (error:unknown) {
            console.error("Error Logout users : ", error);
            const message = this.getAuthErrorMessage(error);
            window.alert(message);
        }

    }

    // Reset password
    async resetPassword(email:string, msgElement:HTMLElement):Promise<void> {

        try {
            
            await sendPasswordResetEmail(auth, email);

            msgElement.textContent = "Password reset email send. Please check your inbox.";
            msgElement.style.color = "green";
            msgElement.style.fontSize = "11px";

        } catch (error:unknown) {

            console.error("Error sending password reset email = ", error);
            const message = this.getAuthErrorMessage(error);
            window.alert(message);

            msgElement.textContent = `Error : ${message}`;
            msgElement.style.color = "red";
            msgElement.style.fontSize = "11px";
        }

    }


    // Google Login
    async googleLogin():Promise<void> {

        try {

            const result = await signInWithPopup(auth, provider);

            // set name to localstorage
            this.setLocalName(result.user);

            // Redirect to index.html
            // window.location.href = "../index.html";
            this.redirectTo("index.html");

        } catch (error:unknown) {
            console.error("Error with Google sign-in = ", error);
            const message = this.getAuthErrorMessage(error);
            window.alert(message);
        }

    }


    // Check if user is logged in
    isLoggedIn():void {

        onAuthStateChanged(auth, (user) => {
            if (!user) {
                // Redirect to signin.html
                // window.location.href = "../signin.html";
                this.redirectTo("signin.html");
            }
        });

    }


    // Get current user Info
    getUser(callback:(user:User)=>void):void {
        onAuthStateChanged(auth, (user) => {
            if (user) callback(user);
        });
    }


    // Local storage helper methods (firebase.com > Docs > javascript-modular > User)
    private setLocalName(userdata:User):void {
        localStorage.setItem("username", userdata.displayName || "Guest");
    }


    private unsetLocalName():void {
        localStorage.removeItem("username");
    }

}
