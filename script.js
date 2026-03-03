const scriptURL = 'https://script.google.com/macros/s/AKfycbzWnTtgsMYvyczB_dxDQBUPw16BWRgC0kqlHadNc5G8eCnf-A7b3Lxgp3gxT7_c7Mc/exec';
const allFields = ['hoTen', 'sanPham', 'kichThuoc', 'soLuong', 'donGia', 'ghiChu', 'nguoi', 'ngay', 'tinhTrang', 'thanhToan', 'daTra'];

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
    const sizeVal = document.getElementById('kichThuoc').value;
    const regex = /^(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)$/;
    const match = sizeVal.toLowerCase().trim().match(regex);
    if (match) {
        const autoQty = parseFloat((parseFloat(match[1]) * parseFloat(match[2])).toFixed(2));
        document.getElementById('soLuong').value = autoQty;
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
    } catch (e) { 
        resultDiv.innerHTML = 'Lỗi kết nối!'; 
    }
}

function renderEditableTable(name) {
    const resultDiv = document.getElementById('invoiceResult');
    let html = `<div id="billArea">`;
    html += `<h3>Lịch sử đơn hàng: ${name}</h3>`;
    html += `<table class="bill-table">
                <thead>
                    <tr>
                        <th>Ngày</th><th>Sản phẩm</th><th>Kích thước</th><th>Đơn giá</th><th>Số Lượng</th><th>Đã trả</th><th>Tổng</th>
                    </tr>
                </thead>
                <tbody>`;
    
    let tAll = 0, pAll = 0;
    currentTableData.forEach((row, index) => {
        const dg = Number(row[6]?.toString().replace(/[^0-9]/g, '')) || 0;
        const sl = Number(row[5]) || 0;
        const p = Number(row[12]?.toString().replace(/[^0-9]/g, '')) || 0;
        const rowTotal = dg * sl;

        html += `<tr>
            <td data-label="Ngày" class="date">${row[0].split(' ')[0]}</td>
            <td data-label="Sản phẩm"><input class="bill-input bold" value="${row[2]}" oninput="currentTableData[${index}][2]=this.value"></td>
            <td data-label="Kích thước"><input class="bill-input" value="${row[3] || '-'}" oninput="handleTableSizeChange(${index}, this.value)"></td>
            <td data-label="Đơn giá"><input class="bill-input" type="number" value="${dg}" oninput="handleTablePriceChange(${index}, this.value)"></td>
            <td data-label="Số lượng"><input id="table-sl-${index}" class="bill-input" type="number" value="${sl}" oninput="currentTableData[${index}][5]=this.value; updateTableSummary()"></td>
            <td data-label="Đã trả"><input class="bill-input paid" type="number" value="${p}" oninput="currentTableData[${index}][12]=this.value; updateTableSummary()"></td>
            <td data-label="Tổng" class="bold" id="table-total-${index}">${rowTotal.toLocaleString()}</td>
        </tr>`;
        tAll += rowTotal; pAll += p;
    });

    const debt = tAll - pAll;
    html += `</tbody></table>`;
    html += `<div class="bill-summary">
            <p>Tổng cộng: <b id="summary-tAll">${tAll.toLocaleString()} VND</b></p>
            <p class="paid">Đã thanh toán: <b id="summary-pAll">${pAll.toLocaleString()} VND</b></p>
            <p class="total-row" id="summary-debt-row">Còn nợ: <span id="summary-debt">${debt.toLocaleString()}</span> VND</p>
        </div>
        <p class="bill-footer">Thời gian xuất bill: ${new Date().toLocaleTimeString('vi-VN')} ${new Date().toLocaleDateString('vi-VN')}</p>
    </div>`;

    // CỤM NÚT BẤM MỚI: CÓ THÊM NÚT LƯU SHEET
    html += `
    <div style="display: flex; gap: 10px; margin-top: 15px;">
        <button onclick="saveChangesToSheet('${name}')" class="btn" style="background: #2ecc71; flex: 1; margin: 0;">
            <i class="fas fa-save"></i> LƯU THAY ĐỔI
        </button>
        <button onclick="downloadBillImage('${name}')" class="btn btn-download" style="flex: 1; margin: 0;">
            <i class="fas fa-camera"></i> XUẤT HÓA ĐƠN
        </button>
    </div>`;
    
    resultDiv.innerHTML = html;
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
    if (!confirm("Cập nhật dữ liệu lên Sheet ngay?")) return;

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...'; 
    btn.disabled = true;

    const updatedList = currentTableData.map(row => ({
        ngayTao: row[0], sanPham: row[2], kichThuoc: row[3], ghiChu: row[4],
        soLuong: row[5], donGia: row[6], nguoiPhanCong: row[8],
        ngayGiao: row[9], tinhTrang: row[10], thanhToan: row[11], daTra: row[12]
    }));

    const payload = { action: "update", hoTen: customerName, list: updatedList };

    try {
        const response = await fetch(scriptURL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        await searchCustomer(); 
        alert("Đã cập nhật xong!");

    } catch (e) {
        setTimeout(() => { searchCustomer(); }, 1000);
    } finally {
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

window.onload = loadAllFields;
