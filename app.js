<script>
let auth0Client = null;
async function initAuth0() {
    auth0Client = await createAuth0Client({
        domain: 'dev-t73j0xka47yjehi4.us.auth0.com',
        clientId: 'TCtcOqtPEDBHHlYRG9RYBXysifAxGRMp',
        authorizationParams: {
            redirect_uri: window.location.origin
        }
    });

    const isAuthenticated = await auth0Client.isAuthenticated();
    if (!isAuthenticated) {
        await auth0Client.loginWithRedirect();
    }
}
initAuth0();
</script>
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

async function processExcelFile(file) {
  try {
    // Extract version from filename
    const version = file.name.split(".").slice(0, -1).join(".");
    document.querySelector(".version").textContent = `V ${version}`;

    const data = await file.arrayBuffer();
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

document
  .getElementById("fileInput")
  .addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) {
      showStatus("Please select a file", "error");
      return;
    }
    await processExcelFile(file);
  });

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
    showStatus("Please select a file", "error");
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
    "PPM FREQUENCY", // Added here at the bottom
  ];

  const rightFields = [
    "STATUS", // Added here at the top
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

      // Store records in a data attribute
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

      // Navigation controls
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

      // Add navigation event handlers after the content is added to DOM
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

          // Handle prev/next buttons visibility
          prevBtn.style.opacity = currentPage === 0 ? "0.5" : "1";
          prevBtn.disabled = currentPage === 0;
          nextBtn.style.opacity =
            currentPage === records.length - 1 ? "0.5" : "1";
          nextBtn.disabled = currentPage === records.length - 1;

          // Handle first/last buttons visibility
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
