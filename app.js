// Initialize Firebase Auth
const auth = firebase.auth();

// Check Authentication Status
function checkAuth() {
  auth.onAuthStateChanged((user) => {
    const authContainer = document.getElementById("auth-container");
    const logoutButton = document.getElementById("logout-button");
    const appContent = document.getElementById("app-content");
    const uploadContainer = document.querySelector(".upload-container");

    if (!authContainer || !logoutButton || !appContent) {
      console.error("Required DOM elements not found");
      return;
    }

    if (user) {
      // User is signed in
      authContainer.style.display = "none";
      logoutButton.style.display = "block";
      appContent.style.display = "block";
      if (uploadContainer) uploadContainer.style.display = "flex";
      showStatus(`Welcome ${user.email}!`, "success");
    } else {
      // User is signed out
      authContainer.style.display = "block";
      logoutButton.style.display = "none";
      appContent.style.display = "none";
      if (uploadContainer) uploadContainer.style.display = "none";
    }
  });
}

// Login Function
function login(email, password) {
  if (!email || !password) {
    showStatus("Please provide both email and password", "error");
    return;
  }

  showStatus("Logging in...", "info");
  
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      showStatus("Successfully logged in!", "success");
      document.getElementById('password-input').value = ''; // Clear password for security
    })
    .catch((error) => {
      console.error("Error logging in:", error);
      let errorMessage = "Invalid email or password. Please try again.";
      showStatus(errorMessage, "error");
      document.getElementById('password-input').value = ''; // Clear password on error
    });
}

// Password Reset Function
function resetPassword(email) {
  if (!email) {
    showStatus("Please provide an email address", "error");
    return;
  }

  showStatus("Sending password reset email...", "info");
  
  const actionCodeSettings = {
    url: 'https://10-bb4.pages.dev',  // Your Cloudflare Pages domain
    handleCodeInApp: false
  };
  
  auth.sendPasswordResetEmail(email, actionCodeSettings)
    .then(() => {
      showStatus("Password reset email sent! Check your inbox.", "success");
    })
    .catch((error) => {
      console.error("Error sending reset email:", error);
      showStatus("Failed to send reset email. Please try again.", "error");
    });
}

// Logout Function
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

// Handle Auth Form Submit
function handleAuth(e) {
  if (e) e.preventDefault();
  
  const email = document.getElementById('email-input').value.trim();
  const password = document.getElementById('password-input').value;
  
  if (!email || !password) {
    showStatus("Please fill in both email and password fields", "error");
    return;
  }

  login(email, password);
}

// Initialize auth check and add logout handler
document.addEventListener('DOMContentLoaded', function() {
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  checkAuth();
});

// Status Message Function
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

// Excel File Processing Functions
[... Rest of your existing Excel processing code stays exactly the same, 
    from the let workbookData = null declaration 
    to the end of the file, including all the 
    functions for processing Excel files, searching, 
    and displaying results ...]
