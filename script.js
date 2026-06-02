const ADMIN_PASSWORD = "12346"; 
const scriptURL = 'https://script.google.com/macros/s/AKfycbwnZc6Q95DJvRpy-udroL0ldYaBWYKSjqu2HW0aqwwY9wkIkAKTlWkI7y7vxZC3Fhy_/exec';
const allFields = ['hoTen', 'sanPham', 'kichThuoc', 'soLuong', 'donGia', 'ghiChu', 'nguoi', 'ngayNhap', 'ngay', 'tinhTrang', 'thanhToan', 'daTra'];

let isLockSync = false; 

// --- 1. KHỞI TẠO & ĐIỀN NGÀY MẶC ĐỊNH ---
function setDefaultDate() {
    const ngayGiaoInput = document.getElementById('ngay');
    const ngayNhapInput = document.getElementById('ngayNhap');
    
    if (ngayGiaoInput || ngayNhapInput) {
        // Tạo định dạng ngày hôm nay làm mặc định phòng hờ
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const formattedToday = `${year}-${month}-${day}`;
        
        // CẢI TIẾN: Kiểm tra xem có ngày nhập gần nhất được lưu lại trong bộ nhớ không
        const lastNgayNhap = localStorage.getItem('last_ngay_nhap_session');

        if (ngayGiaoInput) ngayGiaoInput.value = formattedToday; // Ngày giao vẫn mặc định là hôm nay
        
        if (ngayNhapInput) {
            // Nếu có ngày đặt gần nhất thì giữ nguyên, không có thì mới dùng ngày hôm nay
            ngayNhapInput.value = lastNgayNhap ? lastNgayNhap : formattedToday;
        }
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
    setDefaultDate(); 
}

// --- 2. XỬ LÝ TAB 1: THEO DÕI KHO ---
setInterval(() => {
    if (!isLockSync) loadMonitorTable();
}, 5000); 

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
            html += `<tr>
                <td class="customer-cell" style="white-space: normal; word-break: break-word; vertical-align: top; text-align: left; padding: 8px;"><b>${row[1]}</b></td>
                <td style="white-space: normal; word-break: break-word; vertical-align: top; text-align: left; padding: 8px;">${row[2]}</td>
                <td style="white-space: normal; word-break: break-word; vertical-align: top; text-align: center; padding: 8px;"><span class="size-tag">${row[3] || '-'}</span></td>
                <td class="qty-cell" style="white-space: normal; word-break: break-word; vertical-align: top; text-align: center; padding: 8px;">${row[5]}</td>
                <td style="vertical-align: top; padding: 8px; text-align: center;">
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
    try {
        await fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "updateStatus", hoTen: hoTen, ngayTao: ngayTao, status: newStatus }) });
        setTimeout(() => { isLockSync = false; }, 2500);
    } catch (e) { alert("Lỗi cập nhật!"); isLockSync = false; }
}

// --- 3. XỬ LÝ FORM NHẬP LIỆU ---
function updateCalculation() {
    const kichThuocInput = document.getElementById('kichThuoc');
    const soLuongInput = document.getElementById('soLuong');
    const donGiaInput = document.getElementById('donGia');
    if (!kichThuocInput || !soLuongInput) return;

    let ktVal = kichThuocInput.value.trim().replace(/,/g, '.').toLowerCase();
    const parts = ktVal.split(/[x*]/); 
    let area = 1;

    if (parts.length >= 2) {
        const numbers = parts.map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
        if (numbers.length >= 2) {
            area = numbers.reduce((total, num) => total * num, 1);
        }
    } else if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
        area = parseFloat(parts[0]);
    }

    const sl = parseFloat(soLuongInput.value.toString().replace(/,/g, '.')) || 0;
    const dg = parseFloat(donGiaInput.value.toString().replace(/,/g, '.')) || 0;
    
    const total = area * sl * dg;
    const hienThiTotal = document.getElementById('tongTienHienThi');
    if (hienThiTotal) {
        hienThiTotal.value = total.toLocaleString('vi-VN') + " VND";
    }
    saveAllFields();
}

document.getElementById('mainForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    updateCalculation();
    const requiredFields = ['hoTen', 'sanPham', 'soLuong', 'donGia', 'nguoi', 'ngayNhap', 'ngay'];
    let hasError = false;
    requiredFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el || !el.value.trim()) {
            if (!hasError) el.focus();
            el.style.borderBottom = "2px solid #e63946";
            hasError = true;
        } else { el.style.borderBottom = "2px solid #eee"; }
    });

    if (hasError) { alert("Chưa điền đủ thông tin!"); return; }

    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Đang lưu...'; btn.disabled = true;

    // Lấy giá trị ngày nhập hiện tại trước khi form bị xóa trống để lưu vào bộ nhớ tạm
    const currentNgayNhapVal = document.getElementById('ngayNhap').value;

    const payload = {
        hoTen: document.getElementById('hoTen').value,
        sanPham: document.getElementById('sanPham').value,
        kichThuoc: document.getElementById('kichThuoc').value,
        soLuong: parseFloat(document.getElementById('soLuong').value) || 0,
        donGia: parseFloat(document.getElementById('donGia').value) || 0,
        ghiChu: document.getElementById('ghiChu').value,
        nguoiPhanCong: document.getElementById('nguoi').value, 
        ngayNhap: currentNgayNhapVal,
        ngayGiao: document.getElementById('ngay').value,
        tinhTrang: document.getElementById('tinhTrang').value,
        thanhToan: document.getElementById('thanhToan').value,
        daTra: document.getElementById('daTra').value
    };

    try {
        await fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        btn.innerText = 'Thành công ✓';
        btn.style.backgroundColor = '#2ecc71';
        
        // CẢI TIẾN: Ghi nhớ lại chuỗi ngày nhập vừa chốt đơn thành công vào LocalStorage
        if (currentNgayNhapVal) {
            localStorage.setItem('last_ngay_nhap_session', currentNgayNhapVal);
        }

        ['sanPham', 'kichThuoc', 'ghiChu', 'soLuong', 'donGia', 'daTra'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        
        setDefaultDate(); // Hàm này chạy lại sẽ tự động giữ lại ngày đặt gần nhất vừa lưu ở trên
        updateCalculation(); 
        saveAllFields(); 
        fetchCustomerList();
    } catch (error) { btn.innerText = 'Lỗi!'; }
    finally { setTimeout(() => { btn.innerText = originalText; btn.style.backgroundColor = ''; btn.disabled = false; }, 1500); }
});

// --- 4. TRA CỨU & HÓA ĐƠN ---
function showTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('content-' + tabId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active-nav'));
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
        if (names) {
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
    let html = `<div id="billArea" style="width: 100%; font-family: sans-serif; overflow-x: auto;">
    <h3>Lịch sử đơn hàng: ${name}</h3>
    <table class="bill-table" style="width:100%; table-layout: fixed; border-collapse: collapse; min-width: 650px;">
    <thead>
        <tr style="background-color: #f8f9fa;">
            <th style="width: 16%; padding: 8px; border-bottom: 2px solid #ddd; text-align: center;">Ngày nhập</th>
            <th style="width: 23%; padding: 8px; border-bottom: 2px solid #ddd; text-align: left;">Sản phẩm</th>
            <th style="width: 16%; padding: 8px; border-bottom: 2px solid #ddd; text-align: center;">Kích thước</th>
            <th style="width: 13%; padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Đơn giá</th>
            <th style="width: 9%; padding: 8px; border-bottom: 2px solid #ddd; text-align: center;">SL</th>
            <th style="width: 11%; padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Đã trả</th>
            <th style="width: 14%; padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Tổng</th>
            <th style="width: 8%; padding: 8px; border-bottom: 2px solid #ddd; text-align: center;">Xóa</th>
        </tr>
    </thead><tbody>`;
    let tAll = 0, pAll = 0;

    currentTableData.forEach((row, index) => {
        let displayDate = row[0] ? row[0].toString() : "";
        let inputDateVal = ""; 
        
        if (displayDate.includes('T')) {
            let dObj = new Date(displayDate);
            inputDateVal = dObj.getFullYear() + '-' + String(dObj.getMonth() + 1).padStart(2, '0') + '-' + String(dObj.getDate()).padStart(2, '0');
        } else {
            let pureDateStr = displayDate.includes(' ') ? displayDate.split(' ')[0] : displayDate;
            let dateParts = pureDateStr.split('/');
            if (dateParts.length === 3) {
                inputDateVal = dateParts[2] + '-' + dateParts[1] + '-' + dateParts[0];
            }
        }

        const dg = Number(row[6]?.toString().replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
        let slRaw = row[5] ? row[5].toString().replace(/,/g, '.') : "0";
        let sl = parseFloat(slRaw) || 0;
        const p = Number(row[12]?.toString().replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
        
        let ktVal = row[3] ? row[3].toString().trim().replace(/,/g, '.').toLowerCase() : "";
        const parts = ktVal.split(/[x*]/);
        let currentArea = 1;
        if (parts.length >= 2) {
            const numbers = parts.map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
            if (numbers.length >= 2) currentArea = numbers.reduce((a, b) => a * b, 1);
        } else if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
            currentArea = parseFloat(parts[0]);
        }

        const rowTotal = currentArea * sl * dg;
        tAll += rowTotal; pAll += p;

        html += `<tr style="border-bottom: 1px solid #eee;">
            <td style="vertical-align: top; text-align: center; padding: 6px 4px;">
                <input type="date" id="table-date-${index}" class="bill-input" value="${inputDateVal}" oninput="handleTableDateChange(${index}, this.value)" style="width: 100%; box-sizing: border-box; font-size: 12px; text-align: center; font-family: sans-serif;">
            </td>
            <td style="white-space: normal; word-break: break-word; vertical-align: top; text-align: left; padding: 6px 4px;"><input class="bill-input bold" value="${row[2]}" oninput="currentTableData[${index}][2]=this.value"></td>
            <td style="white-space: normal; word-break: break-word; vertical-align: top; text-align: center; padding: 6px 4px;"><input class="bill-input" value="${row[3] || '-'}" oninput="currentTableData[${index}][3]=this.value; updateTableSummary()"></td>
            <td style="white-space: normal; word-break: break-word; vertical-align: top; text-align: right; padding: 6px 4px;"><input class="bill-input" type="number" step="any" value="${dg}" oninput="currentTableData[${index}][6]=this.value; updateTableSummary()"></td>
            <td style="white-space: normal; word-break: break-word; vertical-align: top; text-align: center; padding: 6px 4px;"><input id="table-sl-${index}" class="bill-input" type="number" step="any" value="${sl}" oninput="currentTableData[${index}][5]=this.value.replace(/,/g, '.'); updateTableSummary()"></td>
            <td style="white-space: normal; word-break: break-word; vertical-align: top; text-align: right; padding: 6px 4px;"><input class="bill-input paid" type="number" step="any" value="${p}" oninput="currentTableData[${index}][12]=this.value.replace(/,/g, '.'); updateTableSummary()"></td>
            <td class="bold" id="table-total-${index}" style="white-space: normal; word-break: break-word; vertical-align: top; text-align: right; padding: 12px 4px; font-size: 13px;">${rowTotal.toLocaleString('vi-VN')}</td>
            <td style="text-align:center; vertical-align: top; padding: 10px 4px;"><button onclick="deleteSingleRow('${name}', '${row[0]}', this)" style="border:none; background:none; color:var(--red); cursor:pointer;"><i class="fas fa-trash-alt"></i></button></td>
        </tr>`;
    });

    const debt = tAll - pAll;
    html += `</tbody></table><div class="bill-summary"><p>Tổng cộng: <b id="summary-tAll">${tAll.toLocaleString('vi-VN')} VND</b></p><p class="paid">Đã thanh toán: <b id="summary-pAll">${pAll.toLocaleString('vi-VN')} VND</b></p><p class="total-row" id="summary-debt-row" style="color: ${debt > 0 ? 'var(--red)' : 'green'}">Còn nợ: <span id="summary-debt">${debt.toLocaleString('vi-VN')}</span> VND</p></div><p class="bill-footer">Thời gian xuất bill: ${new Date().toLocaleTimeString('vi-VN')} ${new Date().toLocaleDateString('vi-VN')}</p></div>`;
    
    html += `<div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
        <button onclick="recalculateAllRows()" class="btn" style="background: #f39c12; flex: 1; margin: 0;">
            <i class="fas fa-sync-alt"></i> CẬP NHẬT TÍNH TOÁN
        </button>
        <button onclick="saveChangesToSheet('${name}')" class="btn" style="background: #2ecc71; flex: 1; margin: 0;">
            <i class="fas fa-save"></i> LƯU THAY ĐỔI
        </button>
        <button onclick="clearCustomerData('${name}')" class="btn" style="background: #34495e; flex: 1; margin: 0;">
            <i class="fas fa-check-double"></i> THANH TOÁN XONG & XÓA THÔNG TIN 
        </button>
        <button onclick="downloadBillExcel('${name}')" class="btn" style="background: #1f7244; color: white; flex: 1; margin: 0;">
            <i class="fas fa-file-excel"></i> XUẤT HÓA ĐƠN EXCEL
        </button>
    </div>`;

    resultDiv.innerHTML = html;
}

// --- 5. LOGIC BẢNG & ĐỒNG BỘ ---
function handleTableDateChange(index, val) {
    if (!val) return;
    let parts = val.split('-'); 
    if (parts.length === 3) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        currentTableData[index][0] = `${parts[2]}/${parts[1]}/${parts[0]} ${hh}:${mm}:${ss}`;
    }
}

function handleTableSizeChange(index, val) {
    currentTableData[index][3] = val;
    updateTableSummary();
}

function handleTablePriceChange(index, val) {
    currentTableData[index][6] = val;
    updateTableSummary();
}

function updateTableSummary() {
    let tAll = 0, pAll = 0;
    currentTableData.forEach((row, index) => {
        const dg = Number(row[6]?.toString().replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
        const sl = Number(row[5]?.toString().replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
        
        let ktVal = row[3] ? row[3].toString().trim().replace(/,/g, '.').toLowerCase() : "";
        const parts = ktVal.split(/[x*]/);
        let currentArea = 1;
        if (parts.length >= 2) {
            const numbers = parts.map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
            if (numbers.length >= 2) currentArea = numbers.reduce((a, b) => a * b, 1);
        } else if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
            currentArea = parseFloat(parts[0]);
        }

        const total = currentArea * sl * dg;
        tAll += total; 
        pAll += Number(row[12]?.toString().replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
        
        const el = document.getElementById(`table-total-${index}`);
        if (el) el.innerText = total.toLocaleString('vi-VN');
    });
    const debt = tAll - pAll;
    document.getElementById('summary-tAll').innerText = tAll.toLocaleString('vi-VN') + " VND";
    document.getElementById('summary-pAll').innerText = pAll.toLocaleString('vi-VN') + " VND";
    document.getElementById('summary-debt').innerText = debt.toLocaleString('vi-VN');
}

function recalculateAllRows() {
    updateTableSummary();
    alert("Đã cập nhật lại toàn bộ tính toán dựa trên Kích thước x Số lượng x Đơn giá!");
}

async function saveChangesToSheet(customerName) {
    const pass = prompt("Nhập mật khẩu:");
    if (pass !== ADMIN_PASSWORD) return;
    
    const updatedList = currentTableData.map(row => {
        let cleanNgayTao = row[0] ? row[0].toString().trim() : "";
        
        if (cleanNgayTao.includes('-') && !cleanNgayTao.includes('/')) {
            let parts = cleanNgayTao.split('-');
            if (parts.length === 3) {
                let now = new Date();
                let hh = String(now.getHours()).padStart(2, '0');
                let mm = String(now.getMinutes()).padStart(2, '0');
                let ss = String(now.getSeconds()).padStart(2, '0');
                cleanNgayTao = `${parts[2]}/${parts[1]}/${parts[0]} ${hh}:${mm}:${ss}`;
            }
        }
        
        return {
            ngayTao: cleanNgayTao,
            hoTen: customerName,
            sanPham: row[2],
            kichThuoc: row[3],
            ghiChu: row[4] || "",
            soLuong: parseFloat(row[5]) || 0,
            donGia: parseFloat(row[6]) || 0,
            nguoiPhanCong: row[8] || "",
            ngayGiao: row[9] || "",
            tinhTrang: row[10] || "Duyệt",
            thanhToan: row[11] || "Chưa thanh toán",
            daTra: parseFloat(row[12]) || 0
        };
    });

    try {
        await fetch(scriptURL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ action: "update", hoTen: customerName, list: updatedList }) 
        });
        alert("Đã cập nhật!"); 
        searchCustomer();
    } catch (e) { 
        alert("Lỗi!"); 
    }
}

function downloadBillExcel(name) {
    const table = document.querySelector("#billArea table");
    if (!table) { alert("Không tìm thấy dữ liệu bảng!"); return; }
    
    let totalAll = 0, paidAll = 0;
    
    currentTableData.forEach((row) => {
        const dg = Number(row[6]?.toString().replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
        const sl = Number(row[5]?.toString().replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
        const p = Number(row[12]?.toString().replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
        
        let ktVal = row[3] ? row[3].toString().trim().replace(/,/g, '.').toLowerCase() : "";
        const parts = ktVal.split(/[x*]/);
        let area = 1;
        if (parts.length >= 2) {
            const numbers = parts.map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
            if (numbers.length >= 2) area = numbers.reduce((a, b) => a * b, 1);
        } else if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
            area = parseFloat(parts[0]);
        }
        
        totalAll += (currentArea * sl * dg);
        paidAll += p;
    });
    
    const debtAll = totalAll - paidAll;

    let excelTemplate = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta charset="UTF-8">
        <style>
            .money-format { x:num; mso-number-format:"\\#\\,\\#\\#0"; text-align: right; }
            .qty-format { x:num; mso-number-format:"\\#\\,\\#\\#0\\.00"; text-align: center; }
            .txt-center { text-align: center; }
            .txt-left { text-align: left; }
        </style>
    </head>
    <body>
        <h3>Lịch sử đơn hàng: ${name}</h3>
        <table border="1" style="border-collapse: collapse; font-family: sans-serif;">
            <thead>
                <tr style="background-color: #f2f2f2; font-weight: bold;">
                    <th style="padding: 6px; width: 120px;">Ngày nhập</th>
                    <th style="padding: 6px; width: 200px;">Sản phẩm</th>
                    <th style="padding: 6px; width: 120px;">Kích thước</th>
                    <th style="padding: 6px; width: 100px;">Đơn giá</th>
                    <th style="padding: 6px; width: 80px;">Số lượng</th>
                    <th style="padding: 6px; width: 100px;">Đã trả</th>
                    <th style="padding: 6px; width: 120px;">Tổng cộng</th>
                </tr>
            </thead>
            <tbody>`;

    currentTableData.forEach((row) => {
        let displayDate = row[0] ? row[0].toString() : "";
        if (displayDate.includes('-') && !displayDate.includes('/')) {
            let p = displayDate.split('-');
            displayDate = p[2] + '/' + p[1] + '/' + p[0];
        } else if (displayDate.includes(' ')) {
            displayDate = displayDate.split(' ')[0];
        }
        
        const dg = Number(row[6]?.toString().replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
        const sl = Number(row[5]?.toString().replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
        const paid = Number(row[12]?.toString().replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
        
        let ktVal = row[3] ? row[3].toString().trim().replace(/,/g, '.').toLowerCase() : "";
        const parts = ktVal.split(/[x*]/);
        let area = 1;
        if (parts.length >= 2) {
            const numbers = parts.map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
            if (numbers.length >= 2) area = numbers.reduce((a, b) => a * b, 1);
        } else if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
            area = parseFloat(parts[0]);
        }
        
        const total = area * sl * dg;

        excelTemplate += `<tr>
            <td class="txt-center" style="padding: 4px;">${displayDate}</td>
            <td class="txt-left" style="padding: 4px;">${row[2]}</td>
            <td class="txt-center" style="padding: 4px;">${row[3] || '-'}</td>
            <td class="money-format" style="padding: 4px;">${dg}</td>
            <td class="qty-format" style="padding: 4px;">${sl}</td>
            <td class="money-format" style="padding: 4px;">${paid}</td>
            <td class="money-format" style="padding: 4px; font-weight: bold;">${total}</td>
        </tr>`;
    });

    excelTemplate += `<tr><td colspan="7" style="border: none; padding: 8px;"></td></tr>
                      <tr><td colspan="5" style="border: none;"></td><td style="padding: 4px; background-color: #f9f9f9;"><b>Tổng cộng:</b></td><td class="money-format" style="padding: 4px; background-color: #f9f9f9; font-weight: bold;">${totalAll}</td></tr>
                      <tr><td colspan="5" style="border: none;"></td><td style="padding: 4px; background-color: #f9f9f9;"><b>Đã trả:</b></td><td class="money-format" style="padding: 4px; background-color: #f9f9f9; font-weight: bold;">${paidAll}</td></tr>
                      <tr><td colspan="5" style="border: none;"></td><td style="padding: 4px; background-color: #fff2f2; color: red;"><b>Còn nợ:</b></td><td class="money-format" style="padding: 4px; background-color: #fff2f2; font-weight: bold; color: red;">${debtAll}</td></tr>
                      </tbody></table></body></html>`;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Bill_${name.replace(/\s+/g, '_')}.xls`;
    link.click();
}

async function deleteSingleRow(hoTen, ngayTao, btn) {
    if (prompt("Nhập mật khẩu để xóa đơn lẻ:") !== ADMIN_PASSWORD) return;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        await fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "deleteSingle", hoTen: hoTen, ngayTao: ngayTao }) });
        setTimeout(() => { alert("Đã xóa xong!"); searchCustomer(); loadMonitorTable(); }, 1500);
    } catch (e) { alert("Lỗi kết nối!"); btn.innerHTML = originalContent; }
}

async function clearCustomerData(name) {
    if (prompt("Nhập mật khẩu:") !== ADMIN_PASSWORD) return;
    try {
        await fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "delete", hoTen: name, pass: ADMIN_PASSWORD }) });
        document.getElementById('invoiceResult').innerHTML = ""; fetchCustomerList(); loadMonitorTable();
    } catch (e) { alert("Lỗi!"); }
}

// --- 6. KHỞI CHẠY ---
window.addEventListener('load', () => {
    loadAllFields();
    loadMonitorTable();
});

allFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
        if(['kichThuoc', 'soLuong', 'donGia'].includes(id)) updateCalculation();
        saveAllFields();
    });
});
