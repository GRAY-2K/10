// Initialize Firebase Auth
const auth = firebase.auth();
const db = firebase.firestore();
let isSignIn = true;

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
    .then((userCredential) => {
      // Check if user is approved
      return db.collection('pendingUsers').doc(userCredential.user.uid).get()
        .then((doc) => {
          if (doc.exists && doc.data().status === 'pending') {
            // User is not approved yet
            auth.signOut();
            throw new Error('approval_pending');
          }
          return userCredential;
        });
    })
    .then(() => {
      showStatus("Successfully logged in!", "success");
      document.getElementById('password-input').value = '';
    })
    .catch((error) => {
      console.error("Error logging in:", error);
      let errorMessage;
      
      if (error.message === 'approval_pending') {
        errorMessage = "Your account is pending approval. Please try again later.";
      } else {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-login-credentials':
            errorMessage = "Invalid email or password. Please try again.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            break;
          case 'auth/user-disabled':
            errorMessage = "This account has been disabled. Please contact support.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many failed attempts. Please try again later or reset your password.";
            break;
          default:
            errorMessage = "Login failed. Please try again.";
        }
      }
      
      showStatus(errorMessage, "error");
      document.getElementById('password-input').value = '';
    });
}

// Signup Function
function signupWithEmail(email, password) {
  if (!email || !password) {
    showStatus("Please provide both email and password", "error");
    return;
  }

  // Add password validation
  if (password.length < 8 || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    showStatus("Your password must contain at least 8 characters including 1 special character", "error");
    return;
  }

  showStatus("Creating account...", "info");
  
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Add user to pending users collection first
      return db.collection('pendingUsers').doc(userCredential.user.uid).set({
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending'
      }).then(() => {
        // Important: Sign out the user immediately after adding to pending
        return auth.signOut();
      });
    })
    .then(() => {
      showStatus("Account created! Please wait for admin approval.", "success");
      // Clear the form
      document.getElementById('email-input').value = '';
      document.getElementById('password-input').value = '';
    })
    .catch((error) => {
      console.error("Error creating account:", error);
      let errorMessage = "Signup failed";
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "This email is already registered. Please login instead.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Please enter a valid email address.";
          break;
        case 'auth/weak-password':
        case 'auth/password-does-not-meet-requirements':
          errorMessage = "Your password must contain at least 8 characters including 1 special character";
          break;
        default:
          errorMessage = "Signup failed. Please try again.";
      }
      
      showStatus(errorMessage, "error");
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
      let errorMessage = "Password reset failed";
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = "Please enter a valid email address.";
          break;
        case 'auth/user-not-found':
          errorMessage = "No account found with this email address.";
          break;
        default:
          errorMessage = `Password reset failed: ${error.message}`;
      }
      
      showStatus(errorMessage, "error");
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

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Add tab switching functionality
  const signinTab = document.getElementById('signin-tab');
  const signupTab = document.getElementById('signup-tab');
  const authSubmitButton = document.getElementById('auth-submit-button');
  const logoutButton = document.getElementById('logout-button');

  if (signinTab && signupTab && authSubmitButton) {
    signinTab.addEventListener('click', () => {
      isSignIn = true;
      signinTab.classList.add('active');
      signupTab.classList.remove('active');
      authSubmitButton.textContent = 'Sign In';
      
      // Clear error messages and form
      clearAuthForm();
    });

    signupTab.addEventListener('click', () => {
      isSignIn = false;
      signupTab.classList.add('active');
      signinTab.classList.remove('active');
      authSubmitButton.textContent = 'Sign Up';
      
      // Clear error messages and form
      clearAuthForm();
    });
  }

  // Add logout handler
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  // Add file input handler
  const fileInput = document.getElementById("fileInput");
  if (fileInput) {
    fileInput.addEventListener("change", async function (e) {
      const file = e.target.files[0];
      if (!file) {
        showStatus("Please select a file", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        await processExcelFile(data);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Initialize Authentication Check
  checkAuth();

  // Add this after your DOM content loaded event listener
  document.getElementById('password-input').addEventListener('input', function(e) {
    const password = e.target.value;
    const requirements = document.getElementById('password-requirements');
    const lengthReq = document.getElementById('length-requirement');
    const specialReq = document.getElementById('special-requirement');
    
    // Show requirements when user starts typing
    if (password.length > 0) {
      requirements.style.display = 'block';
    } else {
      requirements.style.display = 'none';
    }
    
    // Check length requirement
    if (password.length >= 8) {
      lengthReq.classList.add('met');
    } else {
      lengthReq.classList.remove('met');
    }
    
    // Check special character requirement
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      specialReq.classList.add('met');
    } else {
      specialReq.classList.remove('met');
    }
  });
});

// Your Existing Code for Medical Equipment Details
let workbookData = null;
let historyData = null;
let headers = [];
let historyHeaders = [];
let dateColumns = [];
const textColumns = ["BME", "MODEL"];

function isDate(value) {
  if (!value) return false;
  if (textColumns.includes(headers[arguments[1]])) return false;
  const date = new Date(value);
  return date instanceof Date && !isNaN(date);
}

function formatDate(value) {
  const date = new Date(value);
  if (date instanceof Date && !isNaN(date)) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return value;
}

async function fetchExcelFile(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const data = await response.arrayBuffer();
    return data;
  } catch (error) {
    console.error("Error fetching file:", error);
    showStatus(error.message, "error");
    return null;
  }
}

async function processExcelFile(data) {
  try {
    showStatus("Processing file...", "info");
    
    const workbook = XLSX.read(data, {
      type: "array",
      cellDates: true,
      cellText: false,
    });

    if (workbook.SheetNames.length < 2) {
      throw new Error("Excel file must contain at least 2 sheets");
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const secondSheet = workbook.Sheets[workbook.SheetNames[1]];

    if (!firstSheet || !secondSheet) {
      throw new Error("Unable to read sheets from the Excel file");
    }

    const equipmentData = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      raw: false,
      dateNF: "dd/mm/yyyy",
      defval: "",
      rawNumbers: false,
    });

    const historyJsonData = XLSX.utils.sheet_to_json(secondSheet, {
      header: 1,
      raw: false,
      dateNF: "dd/mm/yyyy",
      defval: "",
      rawNumbers: false,
    });

    if (!equipmentData || equipmentData.length === 0) {
      throw new Error("No data found in the first sheet");
    }

    headers = equipmentData[0];
    workbookData = processWorkbookData(equipmentData);

    if (historyJsonData && historyJsonData.length > 0) {
      historyHeaders = historyJsonData[0];
      historyData = historyJsonData.slice(1);
    }

    showStatus("File processed successfully!", "success");
    
    // Update UI elements
    const fileUploadLabel = document.querySelector(".custom-file-upload");
    const searchContainer = document.getElementById("searchContainer");
    const searchInput = document.getElementById("searchInput");
    
    if (fileUploadLabel) fileUploadLabel.style.display = "none";
    if (searchContainer) searchContainer.style.display = "block";
    if (searchInput) searchInput.style.display = "block";

  } catch (error) {
    console.error("Error processing file:", error);
    showStatus(`Error processing file: ${error.message}`, "error");
    throw error;
  }
}

function processWorkbookData(jsonData) {
  if (jsonData.length <= 1) return [];

  const headers = jsonData[0];
  const firstDataRow = jsonData[1];

  dateColumns = [];
  headers.forEach((header, index) => {
    if (
      !textColumns.includes(header) &&
      header !== "PPM FREQUENCY" &&
      isDate(firstDataRow[index], index)
    ) {
      dateColumns.push(header);
    }
  });

  return jsonData.slice(1).map((row) => {
    let obj = {};
    headers.forEach((header, i) => {
      if (header === "PPM FREQUENCY") {
        let freqValue = row[i];
        if (freqValue instanceof Date) {
          freqValue = 180;
        } else if (
          typeof freqValue === "string" ||
          typeof freqValue === "number"
        ) {
          freqValue = String(freqValue).match(/\d+/)?.[0] || 180;
        }
        obj[header] = freqValue;
      } else if (dateColumns.includes(header) && row[i]) {
        obj[header] = formatDate(row[i]);
      } else {
        obj[header] = row[i] || "";
      }
    });
    return obj;
  });
}

function showStatus(message, type) {
  const status = document.getElementById("status");
  if (status) {
    status.textContent = message;
    status.className = type; // Reset classes
    status.classList.add(type); // Add the type class
    status.style.display = "block";
    
    if (type === "success") {
      setTimeout(() => {
        status.style.display = "none";
      }, 5000);
    }
  } else {
    console.error("Status element not found");
  }
}

function searchBME() {
  const searchTerm = document.getElementById("searchInput").value.trim().toLowerCase();
  const formResult = document.getElementById("formResult");

  if (!workbookData) {
    showStatus("Please select a file first", "error");
    return;
  }

  if (searchTerm === "") {
    formResult.style.display = "none";
    return;
  }

  // Allow partial matches and match against multiple fields
  const filteredData = workbookData.filter((row) => {
    const bmeMatch = row["BME"]?.toString().toLowerCase().includes(searchTerm);
    const titleMatch = row["TITLE"]?.toString().toLowerCase().includes(searchTerm);
    const modelMatch = row["MODEL"]?.toString().toLowerCase().includes(searchTerm);
    return bmeMatch || titleMatch || modelMatch;
  });

  if (filteredData.length > 0) {
    displayFormResult(filteredData[0]);
  } else {
    formResult.innerHTML = "No matching equipment found";
    formResult.style.display = "block";
  }
}

function displayFormResult(row) {
  const formResult = document.getElementById("formResult");

  if (!row) {
    formResult.innerHTML = "No results found";
    formResult.style.display = "block";
    return;
  }

  let formHTML =
    '<h3 class="history-title">EQUIPMENT DETAILS</h3><div class="equipment-details-container"><table class="details-table">';

  const leftFields = [
    "BME",
    "TITLE",
    "MODEL",
    "MANUFACTURER",
    "SERIAL",
    "SITE",
    "DEPARTMENT",
    "AREA",
    "RISK CLASS",
    "ELECTRICAL CLASS TYPE",
    "ELECTRICAL DATA",
    "MONTH OF PPM",
    "PPM FREQUENCY",
  ];

  const rightFields = [
    "STATUS",
    "VENDOR",
    "VENDOR CONTACTS",
    "CONTRACT STATUS",
    "CONTRACTOR",
    "CONTRACTOR CONTACTS",
    "CONTRACT START DATE",
    "CONTRACT END DATE",
    "ACCEPTANCE",
    "LAST PPM DATE",
    "PPM DUE DATE",
    "WARRANTY START DATE",
    "WARRANTY END DATE",
  ];

  for (let i = 0; i < leftFields.length; i++) {
    formHTML += "<tr>";
    formHTML += `
              <td class="details-label">${leftFields[i]}:</td>
              <td class="details-value">${row[leftFields[i]] || ""}</td>
          `;
    if (i < rightFields.length) {
      formHTML += `
                  <td class="details-label">${rightFields[i]}:</td>
                  <td class="details-value">${
                    row[rightFields[i]] || ""
                  }</td>
              `;
    }
    formHTML += "</tr>";
  }

  formHTML += "</table></div>";

  let currentPageIndex = 0;

  if (historyData && historyData.length > 0) {
    const matchingHistoryRecords = historyData.filter((record) => {
      return (
        record[0] &&
        record[0].toString().toLowerCase() ===
          row["BME"].toString().toLowerCase()
      );
    });

    if (matchingHistoryRecords.length > 0) {
      formHTML += '<h3 class="history-title">EQUIPMENT HISTORY</h3>';
      formHTML += '<div class="history-container">';

      const record = matchingHistoryRecords[0];

      formHTML += `<div data-records='${JSON.stringify(
        matchingHistoryRecords
      )}' data-current-page="0">`;
      formHTML += `
                      <table class="history-table">
                          <tr>
                              <th style="width: 25%;">DATE</th>
                              <th style="width: 25%;">WORK ORDER</th>
                              <th style="width: 25%;">TYPE OF JOB</th>
                              <th style="width: 25%;">TECHNICIAN</th>
                          </tr>
                          <tr>
                              <td style="width: 25%;">${
                                formatDate(record[1]) || ""
                              }</td>
                              <td style="width: 25%;">${record[2] || ""}</td>
                              <td style="width: 25%;">${record[3] || ""}</td>
                              <td style="width: 25%;">${record[6] || ""}</td>
                          </tr>
                          <tr>
                              <th colspan="4">PROBLEM</th>
                          </tr>
                          <tr>
                              <td colspan="4" class="text-left">${
                                record[4] || ""
                              }</td>
                          </tr>
                          <tr>
                              <th colspan="4">WORK DETAILS</th>
                          </tr>
                          <tr>
                              <td colspan="4" class="text-left">${
                                record[5] || ""
                              }</td>
                          </tr>
                      </table>`;

      formHTML += `
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                      <div style="display: flex; gap: 0.5rem;">
                          <button class="nav-btn first-btn" style="padding: 0.5rem; background: var(--primary-color); color: white; border: none; border-radius: 0.25rem; cursor: pointer; width: 40px;">&lt;&lt;</button>
                          <button class="nav-btn prev-btn" style="padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 0.25rem; cursor: pointer; width: 100px;">Next</button>
                      </div>
                      <span class="page-indicator" style="font-size: 0.875rem;">1/${matchingHistoryRecords.length}</span>
                      <div style="display: flex; gap: 0.5rem;">
                          <button class="nav-btn next-btn" style="padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 0.25rem; cursor: pointer; width: 100px;">Previous ></button>
                          <button class="nav-btn last-btn" style="padding: 0.5rem; background: var(--primary-color); color: white; border: none; border-radius: 0.25rem; cursor: pointer; width: 40px;">&gt;&gt;</button>
                      </div>
                  </div>
              </div></div>`;

      setTimeout(() => {
        const container = document.querySelector("[data-records]");
        if (!container) return;

        const records = JSON.parse(container.dataset.records);
        const prevBtn = document.querySelector(".prev-btn");
        const nextBtn = document.querySelector(".next-btn");
        const firstBtn = document.querySelector(".first-btn");
        const lastBtn = document.querySelector(".last-btn");
        const pageIndicator = document.querySelector(".page-indicator");
        let currentPage = 0;

        function updateButtons() {
          const nextBtnText = currentPage === 0 ? "Next" : "< Next";
          const prevBtnText =
            currentPage === records.length - 1
              ? "Previous"
              : "Previous >";

          prevBtn.innerHTML = nextBtnText;
          nextBtn.innerHTML = prevBtnText;

          prevBtn.style.opacity = currentPage === 0 ? "0.5" : "1";
          prevBtn.disabled = currentPage === 0;
          nextBtn.style.opacity =
            currentPage === records.length - 1 ? "0.5" : "1";
          nextBtn.disabled = currentPage === records.length - 1;

          firstBtn.disabled = currentPage === 0;
          lastBtn.disabled = currentPage === records.length - 1;
          firstBtn.style.opacity = firstBtn.disabled ? "0.5" : "1";
          lastBtn.style.opacity = lastBtn.disabled ? "0.5" : "1";

          pageIndicator.textContent = `${currentPage + 1}/${
            records.length
          }`;
        }

        function updateRecord() {
          const record = records[currentPage];
          const table = container.querySelector(".history-table");
          if (!table || !record) return;

          const cells = table.querySelectorAll("tr:nth-child(2) td");
          cells[0].textContent = formatDate(record[1]) || "";
          cells[1].textContent = record[2] || "";
          cells[2].textContent = record[3] || "";
          cells[3].textContent = record[6] || "";
          table.querySelector("tr:nth-child(4) td").textContent =
            record[4] || "";
          table.querySelector("tr:nth-child(6) td").textContent =
            record[5] || "";
        }

        firstBtn.addEventListener("click", () => {
          if (currentPage !== 0) {
            currentPage = 0;
            updateRecord();
            updateButtons();
          }
        });

        lastBtn.addEventListener("click", () => {
          if (currentPage !== records.length - 1) {
            currentPage = records.length - 1;
            updateRecord();
            updateButtons();
          }
        });

        prevBtn.addEventListener("click", () => {
          if (currentPage > 0) {
            currentPage--;
            updateRecord();
            updateButtons();
          }
        });

        nextBtn.addEventListener("click", () => {
          if (currentPage < records.length - 1) {
            currentPage++;
            updateRecord();
            updateButtons();
          }
        });

        updateButtons();
      }, 0);
    }
  }

  formResult.innerHTML = formHTML;
  formResult.style.display = "block";
}

document.getElementById("searchInput").addEventListener("input", searchBME);

function handleAuth(e) {
  if (e) e.preventDefault();
  
  const email = document.getElementById('email-input').value.trim();
  const password = document.getElementById('password-input').value;
  
  if (!email || !password) {
    showStatus("Please fill in both email and password fields", "error");
    return;
  }

  if (isSignIn) {
    login(email, password);
  } else {
    signupWithEmail(email, password);
  }
}

// Add this new function to handle clearing the form
function clearAuthForm() {
  // Clear input fields
  document.getElementById('email-input').value = '';
  document.getElementById('password-input').value = '';
  
  // Hide error messages
  const status = document.getElementById('status');
  if (status) {
    status.style.display = 'none';
    status.textContent = '';
  }
  
  // Hide password requirements
  const requirements = document.getElementById('password-requirements');
  if (requirements) {
    requirements.style.display = 'none';
  }
}
