// js/auth.js
import { auth, db } from './firebase.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const authForm = document.getElementById('authForm');
const googleAuthBtn = document.getElementById('googleAuthBtn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const fullNameInput = document.getElementById('fullName'); // Only exists on signup
const submitBtn = document.getElementById('submitBtn');

// Detect if we are on the Signup page or Login page
const isSignupPage = fullNameInput !== null;

// Initialize Google Provider
const googleProvider = new GoogleAuthProvider();

// Custom UI Error Alert
function showError(message) {
    // Basic alert for now, can be upgraded to a toast notification later
    alert(message);
}

// 1. Handle Email/Password Submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (isSignupPage) {
            // SIGN UP LOGIC
            const name = fullNameInput.value.trim();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Add display name
            await updateProfile(userCredential.user, { displayName: name });
            
            // Create user document in Firestore
            await setDoc(doc(db, "users", userCredential.user.uid), {
                email: email,
                name: name,
                createdAt: new Date(),
                isPro: false // Perfect setup for future monetization
            });
            
        } else {
            // LOG IN LOGIC
            await signInWithEmailAndPassword(auth, email, password);
        }

        // Redirect on success
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Auth Error:", error);
        let errorMsg = "Authentication failed. Please try again.";
        if (error.code === 'auth/email-already-in-use') errorMsg = "This email is already registered.";
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') errorMsg = "Invalid email or password.";
        
        showError(errorMsg);
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});

// 2. Handle Google Authentication
googleAuthBtn.addEventListener('click', async () => {
    const originalBtnHTML = googleAuthBtn.innerHTML;
    googleAuthBtn.innerHTML = '<i class="fas fa-spinner fa-spin text-zinc-500"></i> Connecting...';
    googleAuthBtn.disabled = true;

    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check if this is their first time logging in by checking the database
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            // If they are new, initialize their database profile
            await setDoc(userDocRef, {
                email: user.email,
                name: user.displayName,
                createdAt: new Date(),
                isPro: false 
            });
        }

        // Redirect on success
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Google Auth Error:", error);
        showError("Failed to sign in with Google. Please try again.");
    } finally {
        googleAuthBtn.innerHTML = originalBtnHTML;
        googleAuthBtn.disabled = false;
    }
});