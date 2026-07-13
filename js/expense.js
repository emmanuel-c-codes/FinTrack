// js/expense.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { uploadImageToImgBB } from './imgbb.js';

const expenseForm = document.getElementById('expenseForm');
const expenseList = document.getElementById('expenseList'); // Changed target ID
const saveExpenseBtn = document.getElementById('saveExpenseBtn');
const userAvatar = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');

let currentUser = null;

const formatNGN = (amount) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = "fixed bottom-10 right-10 bg-zinc-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all translate-y-20 opacity-0 z-[100] font-medium border border-zinc-700/50";
    toast.innerHTML = `<i class="fas fa-check-circle text-brand-400 text-xl"></i> <span>${message}</span>`;
    
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.remove('translate-y-20', 'opacity-0'); }, 10);
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if (userAvatar) {
            const displayName = user.displayName || "User";
            userAvatar.src = user.photoURL ? user.photoURL : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=fff&bold=true`;
        }
        loadExpenses();
    } else {
        window.location.href = "login.html";
    }
});

async function loadExpenses() {
    try {
        const transactionsRef = collection(db, "transactions");
        const q = query(
            transactionsRef, 
            where("userId", "==", currentUser.uid),
            where("type", "==", "expense"),
            orderBy("date", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        expenseList.innerHTML = '';

        if (querySnapshot.empty) {
            expenseList.innerHTML = `<div class="p-8 text-center text-zinc-400 font-medium bg-white rounded-2xl border border-zinc-200">No expenses recorded yet.</div>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Dynamic styling
            let badgeClass = "bg-zinc-100 text-zinc-700";
            let iconClass = "fa-receipt text-zinc-500";
            let iconBgClass = "bg-zinc-50 border-zinc-100";

            if(data.category === "Food & Dining") { badgeClass = "bg-orange-100 text-orange-700"; iconClass = "fa-utensils text-orange-500"; iconBgClass = "bg-orange-50 border-orange-100"; }
            if(data.category === "Transportation") { badgeClass = "bg-blue-100 text-blue-700"; iconClass = "fa-car text-blue-500"; iconBgClass = "bg-blue-50 border-blue-100"; }
            if(data.category === "Utilities") { badgeClass = "bg-purple-100 text-purple-700"; iconClass = "fa-bolt text-purple-500"; iconBgClass = "bg-purple-50 border-purple-100"; }
            if(data.category === "Technology & Software") { badgeClass = "bg-indigo-100 text-indigo-700"; iconClass = "fa-laptop text-indigo-500"; iconBgClass = "bg-indigo-50 border-indigo-100"; }
            if(data.category === "Rent & Housing") { badgeClass = "bg-rose-100 text-rose-700"; iconClass = "fa-house text-rose-500"; iconBgClass = "bg-rose-50 border-rose-100"; }

            const receiptHTML = data.receiptUrl 
                ? `<a href="${data.receiptUrl}" target="_blank" class="text-brand-500 hover:text-brand-700 bg-brand-50 border border-brand-100 p-1.5 rounded-md inline-flex ml-2 transition" title="View Receipt"><i class="fas fa-image text-xs"></i></a>` 
                : '';

            // Render Card Layout
            const cardHTML = `
                <div class="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow group relative">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${iconBgClass}">
                           <i class="fas ${iconClass} text-lg"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-zinc-900 text-base flex items-center">${data.description} ${receiptHTML}</h3>
                            <div class="flex items-center gap-2 text-xs font-semibold text-zinc-500 mt-1">
                                <span>${data.date}</span>
                                <span>•</span>
                                <span class="${badgeClass} px-2 py-0.5 rounded-md">${data.category}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                        <span class="font-extrabold text-zinc-900 text-lg">${formatNGN(data.amount)}</span>
                        <button class="delete-btn text-zinc-400 hover:text-red-500 p-2 sm:p-0 bg-zinc-50 sm:bg-transparent hover:bg-red-50 sm:hover:bg-transparent rounded-lg transition sm:opacity-0 sm:group-hover:opacity-100" data-id="${doc.id}">
                            <i class="fas fa-trash-alt sm:text-lg"></i>
                        </button>
                    </div>
                </div>
            `;
            expenseList.innerHTML += cardHTML;
        });

        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDelete));

    } catch (error) {
        console.error("Error loading expenses:", error);
        expenseList.innerHTML = `<div class="p-8 text-center text-red-500 font-medium bg-white rounded-2xl border border-zinc-200">Failed to load data.</div>`;
    }
}

// 3. MONTHLY SUBSCRIPTION PAYWALL
expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const originalBtnText = saveExpenseBtn.innerHTML;
    saveExpenseBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Verifying...';
    saveExpenseBtn.disabled = true;

    try {
        const receiptFile = document.getElementById('expReceipt').files[0];

        // Only block if they are trying to use the Pro feature (Receipt Upload)
        if (receiptFile) {
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const isPro = userData.isPro || false;
                
                // Convert Firestore Timestamp to JS Date
                const expiresAt = userData.proExpiresAt ? userData.proExpiresAt.toDate() : null;
                const now = new Date();

                // Check if they are completely Free OR if their 30 days have expired
                if (!isPro || !expiresAt || now > expiresAt) {
                    if (typeof window.toggleExpenseModal === 'function') window.toggleExpenseModal();
                    
                    if (isPro && expiresAt && now > expiresAt) {
                        alert("Your Pro subscription has expired! Please renew your plan to continue uploading receipts.");
                    } else {
                        alert("Receipt Image Uploads are a Pro feature! Upgrade to unlock the Receipt Vault.");
                    }
                    
                    window.location.href = "upgrade.html";
                    return; // Stop the form submission entirely
                }
            }
        }

        saveExpenseBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';

        const amount = parseFloat(document.getElementById('expAmount').value);
        const date = document.getElementById('expDate').value;
        const desc = document.getElementById('expDesc').value;
        const category = document.getElementById('expCategory').value;

        const receiptUrl = receiptFile ? await uploadImageToImgBB(receiptFile) : null;

        await addDoc(collection(db, "transactions"), {
            userId: currentUser.uid,
            type: "expense",
            description: desc,
            amount: amount,
            category: category,
            date: date,
            receiptUrl: receiptUrl || null,
            createdAt: serverTimestamp()
        });

        expenseForm.reset();
        document.getElementById('expDate').valueAsDate = new Date();
        
        if (typeof window.toggleExpenseModal === 'function') window.toggleExpenseModal();
        
        loadExpenses();
        showSuccessToast("Expense saved successfully!");

    } catch (error) {
        console.error("Error adding expense:", error);
        alert(error.message);
    } finally {
        saveExpenseBtn.innerHTML = originalBtnText;
        saveExpenseBtn.disabled = false;
    }
});

async function handleDelete(e) {
    const btn = e.currentTarget;
    const docId = btn.getAttribute('data-id');

    if (confirm("Delete this expense permanently?")) {
        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            await deleteDoc(doc(db, "transactions", docId));
            
            showSuccessToast("Expense deleted.");
            loadExpenses();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Failed to delete expense.");
            loadExpenses(); // Reset UI
        }
    }
}

if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));