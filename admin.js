document.addEventListener('DOMContentLoaded', () => {
    
    // Screens
    const loginScreen = document.getElementById('admin-login-screen');
    const dashboardScreen = document.getElementById('admin-dashboard-screen');
    
    // Login Form
    const loginForm = document.getElementById('admin-login-form');
    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password');
    const loginError = document.getElementById('login-error');
    
    // Dashboard Elements
    const tbody = document.getElementById('results-table-body');
    const noDataMsg = document.getElementById('no-data-msg');
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Stats Elements
    const statTotal = document.getElementById('stat-total');
    const statHired = document.getElementById('stat-hired');
    const statNotHired = document.getElementById('stat-nothired');

    // Admin Authentication (Hardcoded for demonstration)
    const ADMIN_CREDS = { username: "admin", password: "password123" };
    
    // Check session
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showDashboard();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const usr = usernameInput.value.trim();
        const pwd = passwordInput.value;
        
        if (usr === ADMIN_CREDS.username && pwd === ADMIN_CREDS.password) {
            sessionStorage.setItem('adminLoggedIn', 'true');
            showDashboard();
        } else {
            loginError.textContent = "Invalid username or password.";
            passwordInput.value = '';
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('adminLoggedIn');
        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';
        usernameInput.value = '';
        passwordInput.value = '';
        loginError.textContent = '';
    });

    refreshBtn.addEventListener('click', () => {
        fetchAdminData();
    });

    function showDashboard() {
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'flex';
        fetchAdminData();
    }

    async function fetchAdminData() {
        refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...';
        refreshBtn.disabled = true;

        try {
            const res = await fetch('/api/admin/results');
            if (!res.ok) throw new Error("Failed to fetch data");
            const data = await res.json();
            
            renderTable(data);
            updateStats(data);
        } catch (err) {
            console.error(err);
            alert("Error fetching admin data");
        } finally {
            refreshBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh Data';
            refreshBtn.disabled = false;
        }
    }

    function renderTable(data) {
        tbody.innerHTML = '';
        if (data.length === 0) {
            noDataMsg.style.display = 'block';
            document.querySelector('.table-scroll-wrapper').style.display = 'none';
            return;
        }
        noDataMsg.style.display = 'none';
        document.querySelector('.table-scroll-wrapper').style.display = 'block';

        // Sort by newest first
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        data.forEach((record, index) => {
            const tr = document.createElement('tr');
            
            // Format Date
            const dateObj = new Date(record.timestamp);
            const formattedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Status Badge
            const statusClass = record.hired ? 'badge-hired' : 'badge-nothired';
            const statusText = record.hired ? 'Hired' : 'Not Hired';

            // Calculate sequential ID formatting
            const displayId = data.length - index;

            tr.innerHTML = `
                <td style="color: var(--text-secondary);">INV-${String(displayId).padStart(3, '0')}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="https://ui-avatars.com/api/?name=${record.candidateName || 'U'}&background=random&color=fff&size=32" style="border-radius: 50%;" alt="user">
                        <span style="font-weight: 600; color: #fff;">${record.candidateName || 'Unknown'}</span>
                    </div>
                </td>
                <td style="color: #fff;">${record.score !== undefined ? record.score : 0} <span style="color: var(--text-secondary); font-size:13px;">/ ${record.total || '-'}</span></td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td style="color: var(--text-secondary); font-size: 13px;"><i class="fa-regular fa-clock" style="margin-right: 5px;"></i> ${formattedDate}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="icon-btn info-btn" onclick="toggleDetails('details-${record.id || record.timestamp}')" title="View Transcript">
                            <i class="fa-solid fa-list-check"></i>
                        </button>
                        <button class="icon-btn delete-btn" onclick="deleteRecord('${record.id || record.timestamp}')" title="Delete Record">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);

            // Detailed History Row
            let detailsContent = '<div class="no-data" style="padding: 20px;">No detailed transcript available for this candidate.</div>';
            if (record.answers && record.answers.length > 0) {
                detailsContent = '<div class="transcript-list">';
                record.answers.forEach((ans, i) => {
                    const statusColor = ans.isCorrect ? '#34d399' : '#f87171';
                    const statusIcon = ans.isCorrect ? '<i class="fa-solid fa-check" style="color:#34d399"></i>' : '<i class="fa-solid fa-xmark" style="color:#f87171"></i>';
                    detailsContent += `
                    <div class="transcript-item">
                        <div class="t-question"><strong>Q${i+1}:</strong> ${ans.question}</div>
                        <div class="t-answer">" ${ans.answer} "</div>
                        <div class="t-feedback" style="border-left-color: ${statusColor}">
                            <span>${statusIcon} AI Feedback:</span> ${ans.feedback}
                        </div>
                    </div>`;
                });
                detailsContent += '</div>';
            }

            const detailsTr = document.createElement('tr');
            detailsTr.id = `details-${record.id || record.timestamp}`;
            detailsTr.className = 'details-row';
            detailsTr.style.display = 'none';
            detailsTr.innerHTML = `<td colspan="6" style="padding: 0; border: none;"><div class="details-container">${detailsContent}</div></td>`;
            
            tbody.appendChild(detailsTr);
        });
    }

    function updateStats(data) {
        // Simple counter animation
        animateValue(statTotal, 0, data.length, 500);
        
        const hiredCount = data.filter(r => r.hired).length;
        animateValue(statHired, 0, hiredCount, 500);
        
        animateValue(statNotHired, 0, data.length - hiredCount, 500);
    }
    
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Toggle Transcript Details
    window.toggleDetails = function(rowId) {
        const detailRow = document.getElementById(rowId);
        if (detailRow) {
            if (detailRow.style.display === 'none') {
                detailRow.style.display = 'table-row';
            } else {
                detailRow.style.display = 'none';
            }
        }
    };

    // Attach delete function to global scope
    window.deleteRecord = async function(id) {
        if (!id || id === 'undefined') {
            alert("Cannot delete this record (missing ID)");
            return;
        }
        
        if (confirm("Are you sure you want to delete this interview record? This action cannot be undone.")) {
            try {
                const res = await fetch(`/api/admin/results/${id}`, {
                    method: 'DELETE'
                });
                const result = await res.json();
                if (result.success) {
                    fetchAdminData();
                } else {
                    alert("Failed to delete record: " + (result.error || "Unknown error"));
                }
            } catch (err) {
                console.error(err);
                alert("Error deleting record");
            }
        }
    };

});
