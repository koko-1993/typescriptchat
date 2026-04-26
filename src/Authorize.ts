import { auth, provider } from "./firebaseConfig";
import { User } from "firebase/auth";
import {
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signInWithPopup,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult
} from "firebase/auth";


export class Authorize {

    private defaultprofileimg:string;
    private recaptchaVerifier:RecaptchaVerifier | null;
    private recaptchaContainerId:string | null;

    constructor() {
        this.defaultprofileimg = "https://static.thenounproject.com/png/65476-200.png";
        this.recaptchaVerifier = null;
        this.recaptchaContainerId = null;

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

    private getRecaptchaVerifier(containerId:string):RecaptchaVerifier {
        if(this.recaptchaVerifier && this.recaptchaContainerId === containerId){
            return this.recaptchaVerifier;
        }

        if(this.recaptchaVerifier){
            this.recaptchaVerifier.clear();
        }

        this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
            size: "invisible"
        });
        this.recaptchaContainerId = containerId;

        return this.recaptchaVerifier;
    }

    clearPhoneVerifier():void {
        if(this.recaptchaVerifier){
            this.recaptchaVerifier.clear();
            this.recaptchaVerifier = null;
            this.recaptchaContainerId = null;
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
            const message = error instanceof Error ? error.message : "Unknown error";
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
            const message = error instanceof Error ? error.message : "Unknown error";
            window.alert(message);
        }

    }


    async sendPhoneVerification(phoneNumber:string, containerId:string):Promise<ConfirmationResult> {

        try{
            const appVerifier = this.getRecaptchaVerifier(containerId);
            return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        }catch(error:unknown){
            console.error("Error sending phone verification:", error);
            this.clearPhoneVerifier();
            const message = error instanceof Error ? error.message : "Unknown error";
            window.alert(message);
            throw error;
        }

    }


    async completePhoneRegistration(
        fullname:string,
        verificationCode:string,
        confirmationResult:ConfirmationResult
    ):Promise<void> {

        try{
            const userCredential = await confirmationResult.confirm(verificationCode);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: fullname,
                photoURL: user.photoURL || this.defaultprofileimg
            });

            this.setLocalName(auth.currentUser || user);
            this.clearPhoneVerifier();
            this.redirectTo("index.html");
        }catch(error:unknown){
            console.error("Error completing phone registration:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            window.alert(message);
            throw error;
        }

    }


    async completePhoneLogin(
        verificationCode:string,
        confirmationResult:ConfirmationResult
    ):Promise<void> {

        try{
            const userCredential = await confirmationResult.confirm(verificationCode);
            const user = userCredential.user;

            this.setLocalName(user);
            this.clearPhoneVerifier();
            this.redirectTo("index.html");
        }catch(error:unknown){
            console.error("Error completing phone login:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            window.alert(message);
            throw error;
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
            const message = error instanceof Error ? error.message : "Unknown error";
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
            const message = error instanceof Error ? error.message : "Unknown error";
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
            const message = error instanceof Error ? error.message : "Unknown error";
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
        localStorage.setItem("username", userdata.displayName || userdata.phoneNumber || "Guest");
    }


    private unsetLocalName():void {
        localStorage.removeItem("username");
    }

}
