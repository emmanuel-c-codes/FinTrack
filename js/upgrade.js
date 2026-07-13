// js/upgrade.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, updateDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const paystackBtn = document.getElementById('paystackBtn');
const devTestBtn = document.getElementById('devTestBtn'); 
let currentUser = null;

// Your exact Paystack Test Public Key
const PAYSTACK_PUBLIC_KEY = 'pk_test_5b0c077814199b9a84d209bb26592f6dc6ab3860'; 

// Verify user is logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        window.location.href = "login.html";
    }
});

// Real Paystack Flow (WITH BUILT-IN ERROR CHECKING)
paystackBtn.addEventListener('click', () => {
    console.log("Paystack button clicked.");

    if (!currentUser) {
        alert("You must be logged in to upgrade.");
        return;
    }

    // CRITICAL CHECK: Did an adblocker stop Paystack from loading?
    if (typeof PaystackPop === 'undefined') {
        console.error("PaystackPop is undefined. The script was blocked.");
        alert("Paystack could not load. Please TURN OFF your Ad Blocker or Brave Shields, then refresh the page.");
        return;
    }

    try {
        const handler = PaystackPop.setup({
            key: PAYSTACK_PUBLIC_KEY,
            email: currentUser.email,
            amount: 1500 * 100, // 1500 NGN in Kobo
            currency: 'NGN',
            ref: 'EXP_' + Math.floor((Math.random() * 1000000000) + 1),
            
            callback: function(response) {
                console.log("Payment successful! Reference:", response.reference);
                paystackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upgrading...';
                paystackBtn.disabled = true;
                
                // Call the database function normally inside a standard function
                upgradeUserInDatabase();
            },
            
            onClose: function() { 
                console.log("User closed the payment window.");
                alert('Payment window closed. Your account was not charged.'); 
            }
        });
        
        console.log("Opening Paystack Iframe...");
        handler.openIframe();

    } catch (error) {
        console.error("Error setting up Paystack:", error);
        alert("An error occurred starting the payment gateway. See console for details.");
    }
});

// Developer Test Bypass Flow
devTestBtn.addEventListener('click', async () => {
    devTestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bypassing...';
    devTestBtn.disabled = true;
    await upgradeUserInDatabase();
});

// The Database Upgrade Logic (UPDATED FOR 30-DAY MONTHLY SUBSCRIPTION)
async function upgradeUserInDatabase() {
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userRef);
        
        // 1. Calculate the exact time 30 days from right now
        const now = new Date();
        const expiryDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // Adds 30 days in milliseconds

        // 2. Package the subscription data
        const subscriptionData = {
            isPro: true,
            upgradedAt: now,
            proExpiresAt: expiryDate // This tells expenses.js that the user is valid!
        };
        
        if (docSnap.exists()) {
            await updateDoc(userRef, subscriptionData);
        } else {
            await setDoc(userRef, { 
                email: currentUser.email, 
                ...subscriptionData
            });
        }

        alert("Success! Your account is now Pro for the next 30 days. Returning to Dashboard...");
        window.location.href = "dashboard.html";
        
    } catch (error) {
        console.error("Error upgrading:", error);
        alert("Database error. Please check your console.");
        
        paystackBtn.innerHTML = '<i class="fas fa-lock text-sm"></i> Pay Securely with Paystack';
        paystackBtn.disabled = false;
        devTestBtn.innerHTML = '<i class="fas fa-code"></i> Developer: Force Upgrade to Pro';
        devTestBtn.disabled = false;
    }
}