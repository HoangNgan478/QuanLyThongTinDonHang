const ADMIN_PASSWORD = "23682578"; 
const scriptURL = 'https://script.google.com/macros/s/AKfycbyaHHOQTMpDoXY9nqu49zDNXgVnUVLSYtd3dwL232x2q332PKQQrlLV_ZyqD-kJg-kE/exec';
const allFields = ['hoTen', 'sanPham', 'kichThuoc', 'soLuong', 'donGia', 'ghiChu', 'nguoi', 'ngay', 'tinhTrang', 'thanhToan', 'daTra'];

let isLockSync = false; 

// --- 1. KHỞI TẠO & ĐỒNG BỘ ---
setInterval(() => {
    if (!isLockSync) loadMonitorTable();
}, 5000); 

// Tự động điền ngày hiện tại vào ô Ngày giao
function setDefaultDate() {
    const ngayGiaoInput = document.getElementById('ngay');
    if (ngayGiaoInput) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        ngayGiaoInput.value = `${year}-${month}-${day}`;
    }
}

function saveAllFields() {
    let data = {};
    allFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    });
    localStorage.setItem('ngan_one_form_session', JSON.stringify(data));
}

function loadAllFields() {
    const savedData = JSON.parse(localStorage.getItem('ngan_one_form_session'));
    if (savedData) {
        allFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = savedData[id] || '';
        });
        updateCalculation();
    }
    // Sau khi load dữ liệu cũ, nếu ô ngày vẫn trống thì điền ngày hôm nay
    setDefaultDate(); 
}

// --- 2. XỬ LÝ TAB 1: THEO DÕI KHO ---
async function loadMonitorTable() {
    if (isLockSync) return;
    const body = document.getElementById('monitorBody');
    if (!body) return;
    
    try {
        const response = await fetch(scriptURL + "?allData=true&v=" + new Date().getTime());
        const data = await response.json();
        
        if (!data || data.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Kho hàng đang trống.</td></tr>';
            return;
        }

        let html = "";
        const allData = [...data].reverse(); 
        allData.forEach((row) => {
            const status = row[10] || 'Duyệt';
            const dateOnly = row[0].includes(' ') ? row[0].split(' ')[0] : row[0];

            html += `<tr>
                <td class="customer-cell"><b>${row[1]}</b></td>
                <td>${row[2]}</td>
                <td><span class="size-tag">${row[3] || '-'}</span></td>
                <td class="qty-cell">${row[5]}</td>
                <td>
                    <select onchange="updateStatusOnly('${row[1]}', '${row[0]}', this.value, this)" 
                            class="status-select ${getStatusClass(status)}">
                        <option value="Duyệt" ${status === 'Duyệt' ? 'selected' : ''}>Duyệt</option>
                        <option value="Đang làm" ${status === 'Đang làm' ? 'selected' : ''}>Đang làm</option>
                        <option value="Hoàn thành" ${status === 'Hoàn thành' ? 'selected' : ''}>Hoàn thành</option>
                    </select>
                </td>
            </tr>`;
        });
        body.innerHTML = html;
    } catch (e) { console.error("Lỗi đồng bộ:", e); }
}

function getStatusClass(status) {
    if (status === 'Đang làm') return 'status-working';
    if (status === 'Hoàn thành') return 'status-done';
    return 'status-pending';
}

async function updateStatusOnly(hoTen, ngayTao, newStatus, selectElement) {
    isLockSync = true; 
    selectElement.className = `status-select ${getStatusClass(newStatus)}`;
    const payload = { action: "updateStatus", hoTen: hoTen, ngayTao: ngayTao, status: newStatus };
    try {
        await fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        setTimeout(() => { isLockSync = false; }, 2500);
    } catch (e) { alert("Lỗi cập nhật!"); isLockSync = false; }
}

// --- 3. XỬ LÝ FORM NHẬP LIỆU ---
function updateCalculation() {
    const kichThuocInput = document.getElementById('kichThuoc');
    if (!kichThuocInput) return;

    let val = kichThuocInput.value.trim().replace(/,/g, '.').toLowerCase();
    const parts = val.split(/[x*]/); 

    if (parts.length >= 2) {
        const numbers = parts.map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
        if (numbers.length >= 2) {
            const result = numbers.reduce((total, num) => total * num, 1);
            document.getElementById('soLuong').value = parseFloat(result.toFixed(2));
        }
    }

    const sl = document.getElementById('soLuong').value;
    const dg = document.getElementById('donGia').value;
    const total = (Number(sl) || 0) * (Number(dg) || 0);
    document.getElementById('tongTienHienThi').value = total.toLocaleString('vi-VN') + " VND";
    saveAllFields();
}

document.getElementById('mainForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    updateCalculation(); // Đảm bảo tính toán lại trước khi gửi

    const requiredFields = ['hoTen', 'sanPham', 'soLuong', 'donGia', 'nguoi', 'ngay'];
    let missingFields = [];
    requiredFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el || !el.value.trim()) {
            missingFields.push(id);
            el.style.borderBottom = "2px solid #e63946";
        } else { el.style.borderBottom = "2px solid #eee"; }
    });

    if (missingFields.length > 0) {
        alert("Chưa điền đủ thông tin quan trọng!");
        document.getElementById(missingFields[0]).focus();
        return; 
    }

    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Đang lưu...'; btn.disabled = true;

    const payload = {
        hoTen: document.getElementById('hoTen').value,
        sanPham: document.getElementById('sanPham').value,
        kichThuoc: document.getElementById('kichThuoc').value,
        soLuong: document.getElementById('soLuong').value,
        donGia: document.getElementById('donGia').value,
        ghiChu: document.getElementById('ghiChu').value,
        nguoiPhanCong: document.getElementById('nguoi').value, 
        ngayGiao: document.getElementById('ngay').value,
        tinhTrang: document.getElementById('tinhTrang').value,
        thanhToan: document.getElementById('thanhToan').value,
        daTra: document.getElementById('daTra').value
    };

    try {
        await fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        btn.innerText = 'Thành công ✓';
        btn.style.backgroundColor = '#2ecc71';
        
        // Reset các ô nhập liệu nhưng GIỮ LẠI ô Ngày và Người phân công nếu muốn
        ['sanPham', 'kichThuoc', 'ghiChu', 'soLuong', 'donGia', 'daTra'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        
        setDefaultDate(); // Reset xong thì điền lại ngày hôm nay
        updateCalculation(); 
        saveAllFields(); 
        fetchCustomerList();
    } catch (error) { btn.innerText = 'Lỗi!'; }
    finally { setTimeout(() => { btn.innerText = originalText; btn.style.backgroundColor = ''; btn.disabled = false; }, 1500); }
});

// --- 4. XỬ LÝ TAB 2: TRA CỨU & HÓA ĐƠN ---
let currentTableData = []; 

function showTab(tabId, element) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    document.getElementById('content-' + tabId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active-nav'));
    element.classList.add('active-nav');
    if (tabId === 'tab2') fetchCustomerList();
}

async function fetchCustomerList() {
    const listContainer = document.getElementById('customerButtonsList');
    if (!listContainer) return;
    listContainer.innerHTML = '<p style="font-size:12px; color:gray;">Đang cập nhật...</p>';
    try {
        const response = await fetch(scriptURL + "?listNames=true&v=" + new Date().getTime());
        const names = await response.json();
        if (names && names.length > 0) {
            localStorage.setItem('ngan_customer_cache', JSON.stringify(names));
            renderCustomerButtons(names);
        }
    } catch (e) {
        const cached = localStorage.getItem('ngan_customer_cache');
        if (cached) renderCustomerButtons(JSON.parse(cached));
    }
}

function renderCustomerButtons(names) {
    const listContainer = document.getElementById('customerButtonsList');
    listContainer.innerHTML = '';
    names.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'customer-btn';
        btn.innerText = name;
        btn.onclick = () => { document.getElementById('searchName').value = name; searchCustomer(); };
        listContainer.appendChild(btn);
    });
}

async function searchCustomer() {
    const name = document.getElementById('searchName').value.trim();
    if (!name) return;
    const resultDiv = document.getElementById('invoiceResult');
    resultDiv.innerHTML = `<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--red)"></i></div>`;
    try {
        const response = await fetch(scriptURL + "?ten=" + encodeURIComponent(name) + "&v=" + new Date().getTime());
        currentTableData = await response.json();
        if (!currentTableData || currentTableData.length === 0) {
            resultDiv.innerHTML = '<p style="text-align:center; color:red;">Không có dữ liệu.</p>';
            return;
        }
        renderEditableTable(name);
    } catch (e) { resultDiv.innerHTML = 'Lỗi kết nối!'; }
}

function renderEditableTable(name) {
    const resultDiv = document.getElementById('invoiceResult');
    let html = `<div id="billArea"><h3>Lịch sử đơn hàng: ${name}</h3><table class="bill-table"><thead><tr><th>Ngày</th><th>Sản phẩm</th><th>Kích thước</th><th>Đơn giá</th><th>SL</th><th>Đã trả</th><th>Tổng</th><th>Xóa</th></tr></thead><tbody>`;
    let tAll = 0, pAll = 0;

    currentTableData.forEach((row, index) => {
        let displayDate = row[0] ? row[0].toString() : "";
        if (displayDate.includes('T')) {
            displayDate = new Date(displayDate).toLocaleDateString('vi-VN');
        } else if (displayDate.includes(' ')) {
            displayDate = displayDate.split(' ')[0];
        }

        const dg = Number(row[6]?.toString().replace(/[^0-9]/g, '')) || 0;
        const sl = Number(row[5]) || 0;
        const p = Number(row[12]?.toString().replace(/[^0-9]/g, '')) || 0;
        const rowTotal = dg * sl;
        tAll += rowTotal; pAll += p;

        html += `<tr>
            <td data-label="Ngày" class="date-cell">${displayDate}</td>
            <td data-label="Sản phẩm"><input class="bill-input bold" value="${row[2]}" oninput="currentTableData[${index}][2]=this.value"></td>
            <td data-label="Kích thước"><input class="bill-input" value="${row[3] || '-'}" oninput="handleTableSizeChange(${index}, this.value)"></td>
            <td data-label="Đơn giá"><input class="bill-input" type="number" value="${dg}" oninput="handleTablePriceChange(${index}, this.value)"></td>
            <td data-label="Số lượng"><input id="table-sl-${index}" class="bill-input" type="number" value="${sl}" oninput="currentTableData[${index}][5]=this.value; updateTableSummary()"></td>
            <td data-label="Đã trả"><input class="bill-input paid" type="number" value="${p}" oninput="currentTableData[${index}][12]=this.value; updateTableSummary()"></td>
            <td data-label="Tổng" class="bold" id="table-total-${index}">${rowTotal.toLocaleString()}</td>
            <td style="text-align:center;"><button onclick="deleteSingleRow('${name}', '${row[0]}', this)" style="border:none; background:none; color:var(--red); cursor:pointer;"><i class="fas fa-trash-alt"></i></button></td>
        </tr>`;
    });

    const debt = tAll - pAll;
    html += `</tbody></table><div class="bill-summary"><p>Tổng cộng: <b id="summary-tAll">${tAll.toLocaleString()} VND</b></p><p class="paid">Đã thanh toán: <b id="summary-pAll">${pAll.toLocaleString()} VND</b></p><p class="total-row" id="summary-debt-row" style="color: ${debt > 0 ? 'var(--red)' : 'green'}">Còn nợ: <span id="summary-debt">${debt.toLocaleString()}</span> VND</p></div><p class="bill-footer">Thời gian xuất bill: ${new Date().toLocaleTimeString('vi-VN')} ${new Date().toLocaleDateString('vi-VN')}</p></div>`;
    html += `<div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;"><button onclick="saveChangesToSheet('${name}')" class="btn" style="background: #2ecc71; flex: 1; margin: 0;"><i class="fas fa-save"></i> LƯU THAY ĐỔI</button><button onclick="clearCustomerData('${name}')" class="btn" style="background: #34495e; flex: 1; margin: 0;"><i class="fas fa-check-double"></i> XÓA LỊCH SỬ</button><button onclick="downloadBillImage('${name}')" class="btn btn-download" style="flex: 1; margin: 0;"><i class="fas fa-camera"></i> XUẤT HÓA ĐƠN</button></div>`;
    resultDiv.innerHTML = html;
}

function handleTableSizeChange(index, val) {
    currentTableData[index][3] = val;
    const parts = val.toLowerCase().replace(/,/g, '.').split(/[x*]/);
    if (parts.length >= 2) {
        const nums = parts.map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
        if (nums.length >= 2) {
            const res = nums.reduce((a, b) => a * b, 1);
            currentTableData[index][5] = parseFloat(res.toFixed(2));
            document.getElementById(`table-sl-${index}`).value = currentTableData[index][5];
        }
    }
    updateTableSummary();
}

function handleTablePriceChange(index, val) {
    currentTableData[index][6] = val;
    updateTableSummary();
}

function updateTableSummary() {
    let tAll = 0, pAll = 0;
    currentTableData.forEach((row, index) => {
        const dg = Number(row[6]) || 0;
        const sl = Number(row[5]) || 0;
        const p = Number(row[12]) || 0;
        const total = dg * sl;
        tAll += total; pAll += p;
        document.getElementById(`table-total-${index}`).innerText = total.toLocaleString();
    });
    const debt = tAll - pAll;
    document.getElementById('summary-tAll').innerText = tAll.toLocaleString() + " VND";
    document.getElementById('summary-pAll').innerText = pAll.toLocaleString() + " VND";
    document.getElementById('summary-debt').innerText = debt.toLocaleString();
    document.getElementById('summary-debt-row').style.color = debt > 0 ? 'var(--red)' : 'green';
}

// --- 5. CÁC HÀM XÓA & LƯU ---
async function saveChangesToSheet(customerName) {
    const userPassword = prompt("Nhập mật khẩu để lưu:");
    if (userPassword !== ADMIN_PASSWORD) { if (userPassword !== null) alert("Sai mật khẩu!"); return; }
    if (!confirm("Cập nhật lên Sheet?")) return;
    const btn = event.currentTarget;
    btn.disabled = true;
    const updatedList = currentTableData.map(row => ({
        ngayTao: row[0], sanPham: row[2], kichThuoc: row[3], ghiChu: row[4], soLuong: row[5], donGia: row[6], nguoiPhanCong: row[8], ngayGiao: row[9], tinhTrang: row[10], thanhToan: row[11], daTra: row[12]
    }));
    try {
        await fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "update", hoTen: customerName, list: updatedList }) });
        alert("Đã cập nhật!"); searchCustomer();
    } catch (e) { alert("Lỗi!"); }
    finally { btn.disabled = false; }
}

async function deleteSingleRow(hoTen, ngayTao, btnElement) {
    const userPassword = prompt("Nhập mật khẩu để xóa dòng:");
    if (userPassword !== ADMIN_PASSWORD) { if (userPassword !== null) alert("Sai mật khẩu!"); return; }
    if (!confirm("Xóa dòng này trên Sheet?")) return;
    try {
        await fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "deleteSingle", hoTen: hoTen, ngayTao: ngayTao }) });
        setTimeout(() => { searchCustomer(); loadMonitorTable(); }, 1500);
    } catch (e) { alert("Lỗi!"); }
}

async function clearCustomerData(customerName) {
    const userPassword = prompt("Nhập mật khẩu để xóa TOÀN BỘ:");
    if (userPassword !== ADMIN_PASSWORD) { if (userPassword !== null) alert("Sai mật khẩu!"); return; }
    if (!confirm("Xóa sạch lịch sử khách này?")) return;
    try {
        await fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "delete", hoTen: customerName, pass: userPassword }) });
        alert("Đã xóa!"); document.getElementById('invoiceResult').innerHTML = ""; fetchCustomerList(); loadMonitorTable();
    } catch (e) { alert("Lỗi!"); }
}

function downloadBillImage(customerName) {
    const element = document.getElementById('billArea');
    html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Bill_${customerName}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
}

// --- 6. KHỞI CHẠY ---
window.addEventListener('load', () => {
    loadAllFields();
    loadMonitorTable();
});

// Lắng nghe thay đổi để tự động lưu form nháp
allFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
        if(id === 'kichThuoc' || id === 'soLuong' || id === 'donGia') updateCalculation();
        saveAllFields();
    });
});
