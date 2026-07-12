// js/auth.js
import { auth } from './firebase.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Handle Signup
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Capture all inputs including the new fullname field
        const fullname = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('error-msg');

        // Reset error message state
        errorMsg.classList.add('hidden');

        try {
            // 1. Create the user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // 2. Attach their real name to their Firebase profile
            await updateProfile(userCredential.user, {
                displayName: fullname
            });

            // 3. Redirect to the dashboard
            window.location.href = "dashboard.html";
        } catch (error) {
            errorMsg.innerText = error.message.replace("Firebase:", "").trim();
            errorMsg.classList.remove('hidden');
        }
    });
}

// Handle Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('error-msg');

        errorMsg.classList.add('hidden');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "dashboard.html";
        } catch (error) {
            errorMsg.innerText = "Invalid email or password. Please try again.";
            errorMsg.classList.remove('hidden');
        }
    });
}

// Route Protection Logic
export const checkAuthStatus = (requireAuth = false) => {
    onAuthStateChanged(auth, (user) => {
        if (requireAuth && !user) {
            window.location.href = "login.html";
        } else if (!requireAuth && user) {
            window.location.href = "dashboard.html"; 
        }
    });
};