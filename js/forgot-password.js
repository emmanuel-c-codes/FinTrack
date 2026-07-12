// js/forgot-password.js
import { auth } from './firebase.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// DOM Elements
const resetForm = document.getElementById('resetForm');
const emailInput = document.getElementById('email');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');

// Helper: Show Toast Notification
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-zinc-900' : 'bg-red-600';
    const icon = type === 'success' ? '<i class="fas fa-check-circle text-brand-400 text-xl"></i>' : '<i class="fas fa-exclamation-circle text-white text-xl"></i>';
    
    toast.className = `fixed bottom-10 right-10 ${bgClass} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all translate-y-20 opacity-0 z-[100] font-medium border border-zinc-700/50`;
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.remove('translate-y-20', 'opacity-0'); }, 10);
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300); 
    }, 4000);
}

// Handle Form Submission
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // UI Loading State
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Sending...';
    submitBtn.disabled = true;
    successMessage.style.display = 'none';

    try {
        const email = emailInput.value.trim();
        
        // Trigger Firebase Password Reset Email
        await sendPasswordResetEmail(auth, email);
        
        // Success UI changes
        resetForm.reset();
        successMessage.style.display = 'block';
        showToast("Reset link sent to your email!", "success");

    } catch (error) {
        console.error("Password Reset Error:", error);
        
        // Display user-friendly error messages
        let errorMsg = "Failed to send reset link. Please try again.";
        if (error.code === 'auth/invalid-email') errorMsg = "Please enter a valid email address.";
        if (error.code === 'auth/user-not-found') errorMsg = "No account found with this email address.";
        
        showToast(errorMsg, "error");
    } finally {
        // Reset Button UI
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});