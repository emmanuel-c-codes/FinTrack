// js/settings.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { uploadImageToImgBB } from './imgbb.js';

// DOM Elements
const headerAvatar = document.getElementById('headerAvatar');
const profileAvatar = document.getElementById('profileAvatar');
const avatarUpload = document.getElementById('avatarUpload');
const uploadStatus = document.getElementById('uploadStatus');

const profileForm = document.getElementById('profileForm');
const fullNameInput = document.getElementById('fullName');
const emailAddressInput = document.getElementById('emailAddress');
const saveProfileBtn = document.getElementById('saveProfileBtn');

const preferencesForm = document.getElementById('preferencesForm');
const currencySelect = document.getElementById('currencySelect');
const savePrefsBtn = document.getElementById('savePrefsBtn');

const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const logoutBtn = document.getElementById('logoutBtn');

let currentUser = null;

// Helper: Show Toast Notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-zinc-900' : 'bg-red-600';
    const icon = type === 'success' ? '<i class="fas fa-check-circle text-brand-400 text-xl"></i>' : '<i class="fas fa-exclamation-circle text-white text-xl"></i>';
    
    toast.className = `fixed bottom-10 right-10 ${bgClass} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all translate-y-20 opacity-0 z-[100] font-medium`;
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.remove('translate-y-20', 'opacity-0'); }, 10);
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
}

// 1. Authenticate and Load Data
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // Populate Profile UI
        const displayName = user.displayName || "User";
        fullNameInput.value = displayName;
        emailAddressInput.value = user.email;

        const photoUrl = user.photoURL ? user.photoURL : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=fff&bold=true`;
        headerAvatar.src = photoUrl;
        profileAvatar.src = photoUrl;

        // Fetch User Preferences from Firestore
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().currency) {
                currencySelect.value = userDoc.data().currency;
            }
        } catch (error) {
            console.error("Failed to load preferences:", error);
        }

    } else {
        window.location.href = "login.html";
    }
});

// 2. Handle Profile Picture Upload
avatarUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file || !currentUser) return;

    profileAvatar.style.opacity = '0.5';
    uploadStatus.classList.remove('hidden');

    try {
        const imageUrl = await uploadImageToImgBB(file);
        
        await updateProfile(currentUser, { photoURL: imageUrl });
        
        profileAvatar.src = imageUrl;
        headerAvatar.src = imageUrl;
        showToast("Profile picture updated!");
    } catch (error) {
        console.error(error);
        showToast("Failed to upload image.", "error");
    } finally {
        profileAvatar.style.opacity = '1';
        uploadStatus.classList.add('hidden');
    }
});

// 3. Handle Profile Form Update
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const originalBtnText = saveProfileBtn.innerHTML;
    saveProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    saveProfileBtn.disabled = true;

    try {
        const newName = fullNameInput.value.trim();
        await updateProfile(currentUser, { displayName: newName });
        
        // Update avatars if they are relying on initials
        if (!currentUser.photoURL) {
            const newPhotoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=10b981&color=fff&bold=true`;
            headerAvatar.src = newPhotoUrl;
            profileAvatar.src = newPhotoUrl;
        }

        showToast("Profile updated successfully!");
    } catch (error) {
        console.error(error);
        showToast("Failed to update profile.", "error");
    } finally {
        saveProfileBtn.innerHTML = originalBtnText;
        saveProfileBtn.disabled = false;
    }
});

// 4. Handle App Preferences Update
preferencesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const originalBtnText = savePrefsBtn.innerHTML;
    savePrefsBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    savePrefsBtn.disabled = true;

    try {
        const selectedCurrency = currencySelect.value;
        
        // Save to the 'users' collection using setDoc with merge: true
        await setDoc(doc(db, "users", currentUser.uid), {
            currency: selectedCurrency,
            updatedAt: new Date()
        }, { merge: true });

        showToast("Preferences saved!");
    } catch (error) {
        console.error(error);
        showToast("Failed to save preferences.", "error");
    } finally {
        savePrefsBtn.innerHTML = originalBtnText;
        savePrefsBtn.disabled = false;
    }
});

// 5. Handle Password Reset
resetPasswordBtn.addEventListener('click', async () => {
    const originalText = resetPasswordBtn.innerText;
    resetPasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    resetPasswordBtn.disabled = true;

    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        showToast("Password reset link sent to your email!");
    } catch (error) {
        console.error(error);
        showToast("Failed to send reset link.", "error");
    } finally {
        resetPasswordBtn.innerText = originalText;
        resetPasswordBtn.disabled = false;
    }
});

// 6. Handle Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}