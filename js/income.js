// js/income.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const incomeForm = document.getElementById('incomeForm');
const incomeTableBody = document.getElementById('incomeTableBody');
const saveIncomeBtn = document.getElementById('saveIncomeBtn');
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

        loadIncome();
    } else {
        window.location.href = "login.html";
    }
});

// 2. Fetch and Render Income
async function loadIncome() {
    try {
        const transactionsRef = collection(db, "transactions");
        // Query only 'income' types
        const q = query(
            transactionsRef, 
            where("userId", "==", currentUser.uid),
            where("type", "==", "income"),
            orderBy("date", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        incomeTableBody.innerHTML = '';

        if (querySnapshot.empty) {
            incomeTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="p-8 text-center text-zinc-400 font-medium">No income recorded yet.</td>
                </tr>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const tr = document.createElement('tr');
            tr.className = "hover:bg-zinc-50/50 transition-colors group cursor-default";
            
            // Generate distinct badge colors for income categories
            let badgeClass = "bg-zinc-100 text-zinc-700";
            if(data.category === "Salary") badgeClass = "bg-emerald-100 text-emerald-700";
            if(data.category === "Freelance") badgeClass = "bg-blue-100 text-blue-700";
            if(data.category === "Investments") badgeClass = "bg-purple-100 text-purple-700";
            if(data.category === "Business") badgeClass = "bg-orange-100 text-orange-700";
            if(data.category === "Gift") badgeClass = "bg-pink-100 text-pink-700";

            tr.innerHTML = `
                <td class="p-4 px-6 text-zinc-500 font-medium whitespace-nowrap">${data.date}</td>
                <td class="p-4 px-6 font-bold text-zinc-800">${data.description}</td>
                <td class="p-4 px-6">
                    <span class="${badgeClass} text-xs font-bold px-3 py-1.5 rounded-lg tracking-wide">${data.category}</span>
                </td>
                <td class="p-4 px-6 text-right font-extrabold text-emerald-600">+${formatNGN(data.amount)}</td>
                <td class="p-4 px-6 text-center">
                    <button class="delete-btn text-zinc-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100" data-id="${doc.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            incomeTableBody.appendChild(tr);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });

    } catch (error) {
        console.error("Error loading income:", error);
        incomeTableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 font-medium">Failed to load data.</td></tr>`;
    }
}

// 3. Handle Form Submission
incomeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const originalBtnText = saveIncomeBtn.innerHTML;
    saveIncomeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    saveIncomeBtn.disabled = true;

    try {
        const amount = parseFloat(document.getElementById('incAmount').value);
        const date = document.getElementById('incDate').value;
        const source = document.getElementById('incSource').value;
        const category = document.getElementById('incCategory').value;

        // Save to the same transactions collection, but flag it as "income"
        await addDoc(collection(db, "transactions"), {
            userId: currentUser.uid,
            type: "income",
            description: source,
            amount: amount,
            category: category,
            date: date,
            createdAt: serverTimestamp()
        });

        incomeForm.reset();
        document.getElementById('incDate').valueAsDate = new Date();
        
        if (typeof window.toggleIncomeModal === 'function') {
            window.toggleIncomeModal();
        }
        
        loadIncome();
        showSuccessToast("Income recorded successfully!");

    } catch (error) {
        console.error("Error adding income:", error);
        alert(error.message);
    } finally {
        saveIncomeBtn.innerHTML = originalBtnText;
        saveIncomeBtn.disabled = false;
    }
});

// 4. Handle Deleting Income
async function handleDelete(e) {
    const btn = e.currentTarget;
    const docId = btn.getAttribute('data-id');

    if (confirm("Delete this income record permanently?")) {
        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            await deleteDoc(doc(db, "transactions", docId));
            
            showSuccessToast("Record deleted.");
            loadIncome();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Failed to delete record.");
            btn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        }
    }
}

// 5. Handle Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}