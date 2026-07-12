// js/landing.js
import { auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// DOM Elements
const authNavContainer = document.getElementById('authNavContainer');
const heroCtaContainer = document.getElementById('heroCtaContainer');

// Listen for Auth State to dynamically update the UI
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User IS logged in
        
        // Update Navbar
        authNavContainer.innerHTML = `
            <a href="dashboard.html" class="bg-brand-50 text-brand-600 font-bold px-5 py-2.5 rounded-xl hover:bg-brand-100 transition shadow-sm border border-brand-100/50 flex items-center gap-2">
                Go to Dashboard <i class="fas fa-arrow-right text-sm"></i>
            </a>
        `;
        
        // Update Hero CTA
        heroCtaContainer.innerHTML = `
            <a href="dashboard.html" class="w-full sm:w-auto bg-zinc-900 text-white font-bold px-8 py-4 rounded-xl hover:bg-zinc-800 transition shadow-xl shadow-zinc-900/20 text-lg flex items-center justify-center gap-2">
                Open Dashboard <i class="fas fa-arrow-right"></i>
            </a>
        `;
        
    } else {
        // User is NOT logged in
        
        // Render Login/Signup buttons in Navbar
        authNavContainer.innerHTML = `
            <a href="login.html" class="text-sm font-bold text-zinc-600 hover:text-zinc-900 transition mr-2">Log In</a>
            <a href="signup.html" class="bg-zinc-900 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-zinc-800 transition shadow-md shadow-zinc-900/20">Sign Up</a>
        `;
        
        // Hero CTA remains as defined in HTML (Get Started for Free)
    }
});