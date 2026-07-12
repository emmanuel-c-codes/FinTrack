// js/budget.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const budgetContainer = document.getElementById('budgetContainer');
const budgetForm = document.getElementById('budgetForm');
const saveBudgetBtn = document.getElementById('saveBudgetBtn');
const userAvatar = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');

let currentUser = null;

// Formatter for Naira
const formatNGN = (amount) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

// Helper: Show Success Toast Notification
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

// 1. Authenticate User
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        
        if (userAvatar) {
            const displayName = user.displayName || "User";
            userAvatar.src = user.photoURL ? user.photoURL : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=fff&bold=true`;
        }

        loadBudgets();
    } else {
        window.location.href = "login.html";
    }
});

// 2. Fetch and Render Budgets
async function loadBudgets() {
    try {
        // Step A: Fetch Budgets for this user
        const budgetsQuery = query(collection(db, "budgets"), where("userId", "==", currentUser.uid));
        const budgetSnapshot = await getDocs(budgetsQuery);
        
        // Step B: Fetch ALL expenses for this user (to calculate how much is spent)
        // Note: Filtering by month happens in JS to avoid complex Firestore indexes
        const txnQuery = query(collection(db, "transactions"), where("userId", "==", currentUser.uid), where("type", "==", "expense"));
        const txnSnapshot = await getDocs(txnQuery);
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        let expensesThisMonth = [];

        txnSnapshot.forEach(doc => {
            const data = doc.data();
            const txnDate = new Date(data.date);
            if (txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear) {
                expensesThisMonth.push(data);
            }
        });

        budgetContainer.innerHTML = ''; // Clear loading state

        if (budgetSnapshot.empty) {
            budgetContainer.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-zinc-200 border-dashed">
                    <div class="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-400 mb-4 text-2xl">
                        <i class="fas fa-bullseye"></i>
                    </div>
                    <h3 class="text-lg font-bold text-zinc-900 mb-1">No budgets set</h3>
                    <p class="text-zinc-500 font-medium mb-4">Create a budget to monitor your spending limits.</p>
                    <button onclick="toggleBudgetModal()" class="text-brand-600 font-bold hover:text-brand-700 transition">Create Budget</button>
                </div>`;
            return;
        }

        // Render Cards
        budgetSnapshot.forEach((doc) => {
            const budgetData = doc.data();
            
            // Calculate total spent for this specific category
            const totalSpent = expensesThisMonth
                .filter(txn => txn.category === budgetData.category)
                .reduce((sum, txn) => sum + txn.amount, 0);

            const limit = budgetData.limit;
            let percentage = (totalSpent / limit) * 100;
            if (percentage > 100) percentage = 100; // Cap visual bar at 100%

            // Determine Progress Bar Color
            let barColor = "bg-brand-500"; // Safe (Green)
            if (percentage >= 80) barColor = "bg-red-500"; // Danger (Red)
            else if (percentage >= 50) barColor = "bg-amber-400"; // Warning (Yellow)

            const remaining = limit - totalSpent;
            const remainingText = remaining >= 0 ? `${formatNGN(remaining)} remaining` : `${formatNGN(Math.abs(remaining))} over budget`;
            const remainingColor = remaining >= 0 ? "text-zinc-500" : "text-red-500 font-bold";

            const cardHTML = `
                <div class="bg-white rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/30 p-6 flex flex-col relative group hover:-translate-y-1 transition-all duration-300">
                    
                    <button class="delete-btn absolute top-6 right-6 text-zinc-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100" data-id="${doc.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>

                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-600 text-lg">
                            <i class="fas fa-tag"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-zinc-900">${budgetData.category}</h3>
                            <p class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Monthly Limit</p>
                        </div>
                    </div>
                    
                    <div class="mb-2 flex justify-between items-end">
                        <h2 class="text-2xl font-extrabold text-zinc-900">${formatNGN(totalSpent)}</h2>
                        <span class="text-sm font-semibold text-zinc-400">/ ${formatNGN(limit)}</span>
                    </div>

                    <div class="w-full bg-zinc-100 rounded-full h-3 mb-3 overflow-hidden">
                        <div class="${barColor} h-3 rounded-full transition-all duration-1000 ease-out" style="width: ${percentage}%"></div>
                    </div>

                    <p class="text-sm ${remainingColor} mt-auto">${remainingText}</p>
                </div>
            `;
            budgetContainer.innerHTML += cardHTML;
        });

        // Attach delete listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });

    } catch (error) {
        console.error("Error loading budgets:", error);
        budgetContainer.innerHTML = `<div class="col-span-full text-center text-red-500 font-medium py-10">Failed to load budgets.</div>`;
    }
}

// 3. Handle Form Submission
budgetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const originalBtnText = saveBudgetBtn.innerHTML;
    saveBudgetBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    saveBudgetBtn.disabled = true;

    try {
        const category = document.getElementById('budgetCategory').value;
        const limit = parseFloat(document.getElementById('budgetLimit').value);

        // Save to 'budgets' collection
        await addDoc(collection(db, "budgets"), {
            userId: currentUser.uid,
            category: category,
            limit: limit,
            createdAt: serverTimestamp()
        });

        budgetForm.reset();
        
        if (typeof window.toggleBudgetModal === 'function') {
            window.toggleBudgetModal();
        }
        
        loadBudgets();
        showSuccessToast("Budget limit set successfully!");

    } catch (error) {
        console.error("Error adding budget:", error);
        alert(error.message);
    } finally {
        saveBudgetBtn.innerHTML = originalBtnText;
        saveBudgetBtn.disabled = false;
    }
});

// 4. Handle Deleting Budget
async function handleDelete(e) {
    const btn = e.currentTarget;
    const docId = btn.getAttribute('data-id');

    if (confirm("Remove this budget limit? Your expenses will not be deleted.")) {
        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            await deleteDoc(doc(db, "budgets", docId));
            
            showSuccessToast("Budget removed.");
            loadBudgets();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Failed to delete budget.");
            btn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        }
    }
}

// 5. Handle Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}