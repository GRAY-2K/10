const auth = firebase.auth();
const db = firebase.firestore();

// Check if user is admin
function checkAdminAuth() {
    auth.onAuthStateChanged((user) => {
        const adminContainer = document.getElementById("admin-container");
        const authContainer = document.getElementById("auth-container");
        const logoutButton = document.getElementById("logout-button");

        if (user && isAdmin(user.email)) {
            // Admin is signed in
            adminContainer.style.display = "block";
            authContainer.style.display = "none";
            logoutButton.style.display = "block";
            loadPendingUsers();
        } else {
            // Not admin or signed out
            adminContainer.style.display = "none";
            authContainer.style.display = "block";
            logoutButton.style.display = "none";
        }
    });
}

// List of admin emails
function isAdmin(email) {
    const adminEmails = [
        "xer444@gmail.com"  // Admin email
    ];
    return adminEmails.includes(email);
}

// Load pending users
function loadPendingUsers() {
    const pendingUsersList = document.getElementById("pending-users-list");
    
    console.log('Loading pending users...');
    
    db.collection('pendingUsers')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            console.log('Pending users snapshot:', snapshot.size);
            pendingUsersList.innerHTML = '';
            
            if (snapshot.empty) {
                pendingUsersList.innerHTML = '<p>No pending users</p>';
                return;
            }

            snapshot.forEach((doc) => {
                const user = doc.data();
                console.log('Pending user:', user);
                const userDiv = document.createElement('div');
                userDiv.className = 'pending-user';
                userDiv.innerHTML = `
                    <p>Email: ${user.email}</p>
                    <p>Requested: ${user.createdAt ? new Date(user.createdAt.toDate()).toLocaleString() : 'N/A'}</p>
                    <button onclick="approveUser('${doc.id}', '${user.email}')">Approve</button>
                    <button onclick="rejectUser('${doc.id}')" class="reject">Reject</button>
                `;
                pendingUsersList.appendChild(userDiv);
            });
        }, (error) => {
            console.error('Error loading pending users:', error);
            pendingUsersList.innerHTML = '<p>Error loading pending users</p>';
        });
}

// Approve user
async function approveUser(userId, userEmail) {
    try {
        await db.collection('pendingUsers').doc(userId).delete();
        showStatus("User approved successfully!", "success");
    } catch (error) {
        console.error("Error approving user:", error);
        showStatus("Error approving user", "error");
    }
}

// Reject user
async function rejectUser(userId) {
    try {
        await db.collection('pendingUsers').doc(userId).delete();
        showStatus("User rejected successfully!", "success");
    } catch (error) {
        console.error("Error rejecting user:", error);
        showStatus("Error rejecting user", "error");
    }
}

// Admin login
function handleAdminLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value;

    if (!isAdmin(email)) {
        showStatus("Access denied. Admin only.", "error");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            showStatus("Admin logged in successfully!", "success");
        })
        .catch((error) => {
            console.error("Login error:", error);
            showStatus("Login failed: " + error.message, "error");
        });
}

// Logout
function logout() {
    auth.signOut()
        .then(() => {
            showStatus("Logged out successfully", "success");
        })
        .catch((error) => {
            console.error("Error logging out:", error);
            showStatus("Logout failed: " + error.message, "error");
        });
}

// Show status messages
function showStatus(message, type) {
    const status = document.getElementById("status");
    if (status) {
        status.textContent = message;
        status.className = type;
        status.style.display = "block";
        
        if (type === "success") {
            setTimeout(() => {
                status.style.display = "none";
            }, 5000);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
}); 
