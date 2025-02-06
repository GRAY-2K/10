// Auth0 Configuration
const auth0Config = {
  domain: "dev-t73j0xka47yjehi4.us.auth0.com", // Replace with your Auth0 domain
  clientId: "TCtcOqtPEDBHHlYRG9RYBXysifAxGRMp", // Replace with your Auth0 client ID
  authorizationParams: {
    redirect_uri: window.location.origin, // Redirect to the current page after login
  },
};

// Initialize Auth0 Client
const auth0 = new Auth0Client(auth0Config);

// Check Authentication Status on Page Load
async function checkAuth() {
  const isAuthenticated = await auth0.isAuthenticated();
  if (isAuthenticated) {
    // User is authenticated, show the app content
    document.getElementById("login-button").style.display = "none";
    document.getElementById("logout-button").style.display = "block";
    document.getElementById("app-content").style.display = "block";
  } else {
    // User is not authenticated, show login button
    document.getElementById("login-button").style.display = "block";
    document.getElementById("logout-button").style.display = "none";
    document.getElementById("app-content").style.display = "none";
  }
}

// Login Function
async function login() {
  await auth0.loginWithRedirect();
}

// Logout Function
async function logout() {
  await auth0.logout({
    returnTo: window.location.origin,
  });
}

// Handle Authentication Callback
async function handleAuthCallback() {
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {
    await auth0.handleRedirectCallback();
    window.history.replaceState({}, document.title, "/");
    checkAuth();
  }
}

// Add Event Listeners for Login and Logout Buttons
document.getElementById("login-button").addEventListener("click", login);
document.getElementById("logout-button").addEventListener("click", logout);

// Check Authentication Status on Page Load
window.addEventListener("load", async () => {
  await handleAuthCallback();
  await checkAuth();
});

// Your Existing Code (with minor adjustments to ensure it only runs when authenticated)
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
    const workbook = XLSX.read(data, {
      type: "array",
      cellDates: true,
      cellText: false,
    });

    if (workbook.SheetNames.length < 2) {
      throw new Error("Excel file must contain 2 sheets");
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const equipmentData = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      raw: false,
      dateNF: "dd/mm/yyyy",
      defval: "",
      rawNumbers: false,
    });

    const secondSheet = workbook.Sheets[workbook.SheetNames[1]];
    const historyJsonData = XLSX.utils.sheet_to_json(secondSheet, {
      header: 1,
      raw: false,
      dateNF: "dd/mm/yyyy",
      defval: "",
      rawNumbers: false,
    });

    if (equipmentData.length > 0) {
      headers = equipmentData[0];
      workbookData = processWorkbookData(equipmentData);
    }

    if (historyJsonData.length > 0) {
      historyHeaders = historyJsonData[0];
      historyData = historyJsonData.slice(1);
    }

    document.querySelector(".custom-file-upload").style.display = "none";
    document.getElementById("searchContainer").style.display = "block";
    document.getElementById("searchInput").style.display = "block";
  } catch (error) {
    console.error("Error processing file:", error);
    showStatus(error.message, "error");
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

async function loadExcelFromUrl(url) {
  const data = await fetchExcelFile(url);
  if (data) {
    await processExcelFile(data);
  }
}

function showStatus(message, type) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = type;
}

function searchBME() {
  const searchTerm = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();

  if (!workbookData) {
    showStatus("Please load a file first", "error");
    return;
  }

  if (searchTerm === "") {
    document.getElementById("formResult").style.display = "none";
    return;
  }

  const filteredData = workbookData.filter(
    (row) => row["BME"].toString().toLowerCase() === searchTerm
  );

  displayFormResult(filteredData[0]);
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

document
  .getElementById("searchInput")
  .addEventListener("input", searchBME);

// Example usage:
// Replace 'your-file-url.xlsx' with the actual URL of your Excel file
loadExcelFromUrl('https://public.boxcloud.com/d/1/b1!H9DKocMv20z-_jneN5BCsO-III5ukPI5eKExjHNjqm8jS-UQu2cpfVDTnhkShw5sOVF2VxoF7YHFZOPkQ5PGWEmH_RCqpY2FoYiAH-3tlqt4wiy3XAOaoYES3zQ-fKeCEKXD-kY6FtQnI-l_e05JV2RTi863I0NP4ig2ytt4M_0Fa8Os1lmBQ3GzYd4F198cT6mRSeNQnWVN-fENxEsHWbQJmGcKx0WeR8j1VhSSgFfV0m1OBaQzNQmKex0RiBTM3bGKKCkh7ZNntOk-1W91iFqXXXYqBmeio_Q5hgddvSRqpe74837Qyhj_pbPYQbkGNAJWaN50WOHsiQ6JKu3Sipubz46C_-nxmXGUJ_zWWE-HUhbGOzyE5EjPzUQSfMowZ72LkV4lsh_fqacJ5o5SvhsoYZcCBO9rOGaPdtTIRTbh1bg1Bxw0t6bVkISbLyAgjBBo6fTDFYKRdW2ECzjtMyYsKOo7GQnGhez7MWr2Xm_QzJMn2f3DfWAxt8gE2aU9TUj4AQydM09HOyxUS7pYFjy9O45h8U9H54wbUmeVcb4VvOp2cQzMnel2M0XMtlfBjVD9R-kFDkRZVB9Vn6G4xLrEfh-JNPjN2pljoAcXJlVOJxZC83SsiSYWf2cYNU_P_manlP6XcnNAy-XY4XyeZB6mjfvMjR-lUEsE-8AMD017MQkKdwpgR6MSrPjSMsQUtMrzY_kLDWNi_TnnIDNfQE-kIvGjkkoxkbJXxBa9v7am6s-R2VSYx9-lJR8sI22qU92B4RqXi8Dqud3QlBDJyzhEtVH8nfvLZVG9JxhxbrCJYrzJBCchguDdbLGJb7EiSKzCKd_5m1z-_bEEcBqbpq2psZulqx7Co2hcQiWoNxoNwXxIRGiTc4t4SaiOQcBDJbmkgF2sFcZERKWkFQdLiQV9xbQwMsRRpPJKetShimt1D1i1nzLV61MDaO0tq6o9a3ucNFdLFH-yyGKLEFAnDly_7RvAICcn30veGpIV-dvuaaMO9E5QnVH8OBwbMTIq4dJbDJdxXGA6t3LWQpUBXsdxaVhL5j3Vakr8pnuMWXhHr-4kywa_vyp6TNh3M9Fu3mn7qA4VATEwRs9K_3d17WXpDIzqakyj5owqheHeopX7EO2ojCYQaw4CAWeoRNoXBJ_8001QHCrEJARvNla-JkhRdaU0XJhuoJI1mIjAsk_w13o_I11JcXallnNShszLb9kvJ8IqcQyuYW6BTsvV94x6fBW0hzWr_QMjOHg3VgKDIhUrn409cggvUfaImYxPsxWGC9nt2HpWNoxZkJdy1AMsdhf5jn0f68KP91if77X9kvRT6yeAORf-wNoaavpLCUTHnK4xM-8BzC377_P4TRknFI3j-62GxiIkAdU81_uzVX37tWu6hE4HiPsY4z0HDNG9a2Uls05CdbHeEU1jRdPsEzwZht0m3qlXrxiaVKp_5bAc5zSow1yTMvGJ4nlapkp85Uu6SuokemrXj_hKWKEKEHYccCdC5Q-Tyw_599Hu1ANF0flelYkjfZXTVtR9fd6SLt7G5neqC_mAOAwN2E895DnPabeXs0fL9ZYJ/download');
