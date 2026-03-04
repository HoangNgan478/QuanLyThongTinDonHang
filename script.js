const ADMIN_PASSWORD = "23682578"; 
const scriptURL = 'https://script.google.com/macros/s/AKfycbxa07Iz4YOE7QJ6sUipVgCPYHVLwWGID5kWoGkLR6FK34kcpxUl7n9W1K9qEu_EFUPL/exec';
const allFields = ['hoTen', 'sanPham', 'kichThuoc', 'soLuong', 'donGia', 'ghiChu', 'nguoi', 'ngay', 'tinhTrang', 'thanhToan', 'daTra'];

// 1. Biến cờ để biết khi nào đang gửi dữ liệu lên Sheet
let isLockSync = false; 

// 2. Chỉnh thời gian quét (Nên để 3-5 giây để tránh bị Google khóa do spam request)
setInterval(() => {
    if (!isLockSync) loadMonitorTable();
}, 5000); 

async function loadMonitorTable() {
    // Nếu đang lưu thì KHÔNG được tải dữ liệu cũ đè lên
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
    } catch (e) { 
        console.error("Lỗi đồng bộ:", e);
    }
}

function getStatusClass(status) {
    if (status === 'Đang làm') return 'status-working';
    if (status === 'Hoàn thành') return 'status-done';
    return 'status-pending';
}

// Cập nhật trạng thái: Đã sửa lỗi giựt
async function updateStatusOnly(hoTen, ngayTao, newStatus, selectElement) {
    // BƯỚC 1: Khóa đồng bộ ngay để tránh bị setInterval nạp đè dữ liệu cũ
    isLockSync = true; 

    // BƯỚC 2: Đổi màu giao diện ngay lập tức để người dùng thấy mượt (UI Optimistic)
    selectElement.className = `status-select ${getStatusClass(newStatus)}`;

    const payload = { action: "updateStatus", hoTen: hoTen, ngayTao: ngayTao, status: newStatus };
    
    try {
        await fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        
        // BƯỚC 3: Đợi 2 giây cho Sheet cập nhật xong rồi mới mở khóa cho loadMonitorTable chạy tiếp
        setTimeout(() => {
            isLockSync = false;
        }, 2500);
        
    } catch (e) { 
        alert("Lỗi cập nhật!"); 
        isLockSync = false;
    }
}

window.addEventListener('load', loadMonitorTable);

// --- 1. CHUYỂN TAB ---
function showTab(tabId, element) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    document.getElementById('content-' + tabId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active-nav'));
    element.classList.add('active-nav');
    if (tabId === 'tab2') fetchCustomerList();
}

// --- 2. TÍNH TOÁN TAB 1 ---
function updateCalculation() {
    const kichThuocInput = document.getElementById('kichThuoc');
    if (!kichThuocInput) return;

    let val = kichThuocInput.value.trim().replace(/,/g, '.').toLowerCase();
    const parts = val.split(/[x*]/); 

    if (parts.length >= 2) {
        const numbers = parts.map(p => parseFloat(p.trim())).filter(n => !isNaN(n));

        if (numbers.length >= 2) {
            // Nhân tất cả các số trong mảng lại với nhau
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

// --- 3. LƯU & TẢI TRẠNG THÁI ---
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
}

allFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateCalculation);
});

// --- 4. GỬI DỮ LIỆU (NHẬP MỚI) ---
document.getElementById('mainForm').addEventListener('submit', async (e) => {
    e.preventDefault();
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
        ['sanPham', 'kichThuoc', 'ghiChu', 'soLuong', 'donGia', 'daTra', 'nguoi', 'ngay'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        updateCalculation(); saveAllFields(); fetchCustomerList();
    } catch (error) { btn.innerText = 'Lỗi!'; }
    finally { setTimeout(() => { btn.innerText = originalText; btn.style.backgroundColor = ''; btn.disabled = false; }, 1500); }
});

// --- 5. TAB 2: TRA CỨU & SỬA ĐỔI ---
let currentTableData = []; 

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
    let html = `<div id="billArea">`;
    html += `<h3>Lịch sử đơn hàng: ${name}</h3>`;
    html += `<table class="bill-table">
                <thead>
                    <tr>
                        <th>Ngày</th><th>Sản phẩm</th><th>Kích thước</th><th>Đơn giá</th><th>SL</th><th>Đã trả</th><th>Tổng</th><th>Xóa</th>
                    </tr>
                </thead>
                <tbody>`;
    
    let tAll = 0, pAll = 0;

    currentTableData.forEach((row, index) => {
        // ... (Giữ nguyên phần xử lý displayDate, dg, sl, p, rowTotal như cũ) ...
        const rowTotal = (Number(row[6]) || 0) * (Number(row[5]) || 0);
        tAll += rowTotal;
        pAll += (Number(row[12]) || 0);

        html += `<tr>
            <td data-label="Ngày" class="date-cell">${displayDate}</td>
            <td data-label="Sản phẩm"><input class="bill-input bold" value="${row[2]}" oninput="currentTableData[${index}][2]=this.value"></td>
            <td data-label="Kích thước"><input class="bill-input" value="${row[3] || '-'}" oninput="handleTableSizeChange(${index}, this.value)"></td>
            <td data-label="Đơn giá"><input class="bill-input" type="number" value="${dg}" oninput="handleTablePriceChange(${index}, this.value)"></td>
            <td data-label="Số lượng"><input id="table-sl-${index}" class="bill-input" type="number" value="${sl}" oninput="currentTableData[${index}][5]=this.value; updateTableSummary()"></td>
            <td data-label="Đã trả"><input class="bill-input paid" type="number" value="${p}" oninput="currentTableData[${index}][12]=this.value; updateTableSummary()"></td>
            <td data-label="Tổng" class="bold" id="table-total-${index}">${rowTotal.toLocaleString()}</td>
            
            <td style="text-align:center;">
                <button onclick="deleteSingleRow('${name}', '${row[0]}', this)" style="border:none; background:none; color:var(--red); cursor:pointer; font-size:1.1rem;">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>`;
    });

    const debt = tAll - pAll;
    html += `</tbody></table>`;
    html += `<div class="bill-summary">
            <p>Tổng cộng: <b id="summary-tAll">${tAll.toLocaleString()} VND</b></p>
            <p class="paid">Đã thanh toán: <b id="summary-pAll">${pAll.toLocaleString()} VND</b></p>
            <p class="total-row" id="summary-debt-row" style="color: ${debt > 0 ? 'var(--red)' : 'green'}">Còn nợ: <span id="summary-debt">${debt.toLocaleString()}</span> VND</p>
        </div>
        <p class="bill-footer">Thời gian xuất bill: ${new Date().toLocaleTimeString('vi-VN')} ${new Date().toLocaleDateString('vi-VN')}</p>
    </div>`;

    html += `
    <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
        <button onclick="saveChangesToSheet('${name}')" class="btn" style="background: #2ecc71; flex: 1; margin: 0;">
            <i class="fas fa-save"></i> LƯU THAY ĐỔI
        </button>
        <button onclick="clearCustomerData('${name}')" class="btn" style="background: #34495e; flex: 1; margin: 0;">
            <i class="fas fa-check-double"></i> XÁC NHẬN THANH TOÁN & XÓA LỊCH SỬ
        </button>
        <button onclick="downloadBillImage('${name}')" class="btn btn-download" style="flex: 1; margin: 0;">
            <i class="fas fa-camera"></i> XUẤT HÓA ĐƠN
        </button>
    </div>`;
    resultDiv.innerHTML = html;
}

async function deleteSingleRow(hoTen, ngayTao, btnElement) {
    // Bước 1: Yêu cầu mật khẩu
    const userPassword = prompt(`XÁC NHẬN XÓA ĐƠN LẺ:\nNhập mật khẩu để xóa đơn hàng của khách "${hoTen}":`);
    
    if (userPassword === null) return; // Bấm Hủy
    
    if (userPassword !== ADMIN_PASSWORD) {
        alert("Mật khẩu không chính xác! Không thể xóa dòng này.");
        return;
    }

    // Bước 2: Xác nhận lần cuối
    const finalConfirm = confirm("Mật khẩu đúng. Bạn chắc chắn muốn xóa vĩnh viễn dòng này chứ?");
    if (!finalConfirm) return;

    const rowElement = btnElement.closest('tr');
    rowElement.style.backgroundColor = '#ffeef0'; // Tô màu cảnh báo dòng đang xóa
    
    try {
        await fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ 
                action: "deleteSingle", 
                hoTen: hoTen,
                ngayTao: ngayTao 
            })
        });

        alert("Đã xóa đơn hàng thành công!");
        // Refresh lại dữ liệu Tab 2 để tính lại tổng tiền nợ
        searchCustomer(); 
        // Cập nhật lại kho ở Tab 1
        if (typeof loadMonitorTable === 'function') loadMonitorTable(); 

    } catch (e) {
        alert("Lỗi kết nối khi xóa dòng!");
        rowElement.style.backgroundColor = '';
    }
}

// --- LOGIC ĐỒNG BỘ BẢNG ---
function handleTableSizeChange(index, val) {
    currentTableData[index][3] = val;
    const regex = /^(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)$/;
    const match = val.toLowerCase().trim().match(regex);
    if (match) {
        const autoQty = parseFloat((parseFloat(match[1]) * parseFloat(match[2])).toFixed(2));
        currentTableData[index][5] = autoQty;
        document.getElementById(`table-sl-${index}`).value = autoQty;
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

// --- HÀM QUAN TRỌNG: LƯU LẠI LÊN GOOGLE SHEET ---
async function saveChangesToSheet(customerName) {
    const userPassword = prompt("Vui lòng nhập mật khẩu để lưu thay đổi:");
    if (userPassword === null) return; 
    if (userPassword !== ADMIN_PASSWORD) {
        alert("Mật khẩu không chính xác!");
        return;
    }
    if (!confirm("Xác nhận cập nhật dữ liệu lên Sheet?")) return;

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...'; 
    btn.disabled = true;

    // SỬA TẠI ĐÂY: Khớp chính xác tên cột với GAS nhận diện
    const updatedList = currentTableData.map(row => ({
        ngayTao: row[0],
        sanPham: row[2],
        kichThuoc: row[3],
        ghiChu: row[4],
        soLuong: row[5],
        donGia: row[6],
        nguoiPhanCong: row[8],
        ngayGiao: row[9],
        tinhTrang: row[10],
        thanhToan: row[11],
        daTra: row[12]
    }));

    const payload = { 
        action: "update", 
        hoTen: customerName, 
        list: updatedList 
    };

    try {
        await fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors', // Sử dụng no-cors cho Google Script
            body: JSON.stringify(payload)
        });

        btn.innerHTML = '<i class="fas fa-check"></i> Đang cập nhật...';
        setTimeout(() => {
            alert("Đã cập nhật xong!");
            searchCustomer();
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000); 

    } catch (e) {
        alert("Lỗi khi lưu!");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function downloadBillImage(customerName) {
    const element = document.getElementById('billArea');
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo ảnh...'; btn.disabled = true;

    html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Bill_${customerName}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        btn.innerHTML = originalContent; btn.disabled = false;
    });
}

async function clearCustomerData(customerName) {
    // Bước 1: Nhập mật khẩu
    const userPassword = prompt(`Vui lòng nhập mật khẩu để XÓA VĨNH VIỄN khách hàng "${customerName}":`);
    
    if (userPassword === null) return; // Bấm Hủy
    
    if (userPassword !== ADMIN_PASSWORD) {
        alert("Mật khẩu không chính xác! Hành động xóa bị từ chối.");
        return;
    }

    // Bước 2: Xác nhận lần cuối
    const finalConfirm = confirm("Mật khẩu đúng. Bạn có chắc chắn muốn xóa sạch dữ liệu khách này không?");
    if (!finalConfirm) return;

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xóa...';
    btn.disabled = true;

    try {
        await fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ 
                action: "delete", 
                hoTen: customerName,
                pass: userPassword // Gửi pass xuống để GAS kiểm tra thêm 1 lần nữa
            })
        });

        alert("Hệ thống đã dọn dẹp xong dữ liệu khách hàng!");
        document.getElementById('invoiceResult').innerHTML = ""; 
        fetchCustomerList(); 
        if (typeof loadMonitorTable === 'function') loadMonitorTable(); 

    } catch (e) {
        alert("Lỗi kết nối khi xóa!");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

window.onload = loadAllFields;
