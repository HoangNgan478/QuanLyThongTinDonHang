const scriptURL = 'https://script.google.com/macros/s/AKfycbyfqNkqkjtxdQhUJuEbGawJG2HizNUMjRvoAy-aP-mkdKPwBOIlVp3Sjf48kDnyPHCZ/exec';

// --- 1. CHUYỂN TAB ---
function showTab(tabId, element) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    document.getElementById('content-' + tabId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active-nav');
    });
    element.classList.add('active-nav');

    if (tabId === 'tab2') {
        fetchCustomerList();
    }
}

// --- 2. HÀM TÍNH SỐ LƯỢNG TỪ KÍCH THƯỚC ---
function calculateQuantity(sizeStr) {
    const str = sizeStr.toLowerCase().trim();
    const regex = /^(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)$/;
    const match = str.match(regex);
    if (match) {
        const a = parseFloat(match[1]);
        const b = parseFloat(match[2]);
        return a * b;
    }
    return null; 
}

// --- 3. HÀM LƯU TẤT CẢ FIELDS VÀO LOCALSTORAGE ---
function saveAllFields() {
    const dataToSave = {
        h1: document.getElementById('h1').value,
        s1: document.getElementById('s1').value,
        k1: document.getElementById('k1').value,
        g1: document.getElementById('g1').value, 
        sl1: document.getElementById('sl1').value,
        dg1: document.getElementById('dg1').value,
        h2: document.getElementById('h2').value,
        s2: document.getElementById('s2').value,
        k2: document.getElementById('k2').value,
        g2: document.getElementById('g2').value, 
        sl2: document.getElementById('sl2').value,
        dg2: document.getElementById('dg2').value,
        nguoi: document.getElementById('nguoi').value,
        ngay: document.getElementById('ngay').value,
        tinhTrang: document.getElementById('tinhTrang').value,
        thanhToan: document.getElementById('thanhToan').value,
        daTra: document.getElementById('daTra').value
    };
    localStorage.setItem('ngan_last_session', JSON.stringify(dataToSave));
}

// --- 4. LOGIC DANH BẠ KHÁCH HÀNG ---
function saveCustomerToDB(name) {
    if (!name || name.trim() === "") return;
    let db = JSON.parse(localStorage.getItem('customerDatabase') || '{}');
    db[name.trim().toLowerCase()] = {
        s1: document.getElementById('s1').value,
        k1: document.getElementById('k1').value,
        g1: document.getElementById('g1').value,
        dg1: document.getElementById('dg1').value
    };
    localStorage.setItem('customerDatabase', JSON.stringify(db));
}

function autoFillByCustomer(name) {
    let db = JSON.parse(localStorage.getItem('customerDatabase') || '{}');
    let data = db[name.trim().toLowerCase()];
    if (data) {
        document.getElementById('s1').value = data.s1 || '';
        document.getElementById('k1').value = data.k1 || '';
        document.getElementById('g1').value = data.g1 || '';
        document.getElementById('dg1').value = data.dg1 || '';
        syncAllToForm2();
        updateTong();
    }
}

// --- 5. HÀM ĐỔ DỮ LIỆU CŨ RA KHI MỞ WEB ---
function loadAllFields() {
    const savedData = JSON.parse(localStorage.getItem('ngan_last_session'));
    if (savedData) {
        Object.keys(savedData).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = savedData[id];
        });
        updateTong();
    }
}

// --- 6. TÍNH TỔNG TIỀN & ĐỒNG BỘ ---
function updateTong() {
    const sl = document.getElementById('sl1').value;
    const dg = document.getElementById('dg1').value;
    const total = (Number(sl) || 0) * (Number(dg) || 0);
    document.getElementById('tongTienHienThi').value = total.toLocaleString('vi-VN') + " VND";
}

function syncAllToForm2() {
    const map = { 'h1': 'h2', 's1': 's2', 'k1': 'k2', 'g1': 'g2', 'sl1': 'sl2', 'dg1': 'dg2' };
    Object.keys(map).forEach(id1 => {
        document.getElementById(map[id1]).value = document.getElementById(id1).value;
    });
}

// --- LẮNG NGHE THAY ĐỔI ---
const fieldsMap = { 'h1': 'h2', 's1': 's2', 'k1': 'k2', 'g1': 'g2', 'sl1': 'sl2', 'dg1': 'dg2' };
Object.keys(fieldsMap).forEach(id1 => {
    document.getElementById(id1).addEventListener('input', (e) => {
        const val = e.target.value;
        if (id1 === 'k1') {
            const autoQty = calculateQuantity(val);
            if (autoQty !== null) {
                document.getElementById('sl1').value = autoQty;
                document.getElementById('sl2').value = autoQty;
            }
        }
        document.getElementById(fieldsMap[id1]).value = val;
        if (id1 === 'h1' && val.length > 2) autoFillByCustomer(val);
        if (id1 === 'sl1' || id1 === 'dg1' || id1 === 'k1') updateTong();
        saveAllFields();
    });
});

['nguoi', 'ngay', 'tinhTrang', 'thanhToan', 'daTra', 'g2'].forEach(id => {
    document.getElementById(id).addEventListener('input', saveAllFields);
});

// --- 7. GỬI DỮ LIỆU ---
document.getElementById('formSheet1').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('h1').value;
    saveCustomerToDB(name);
    submitData('formSheet1', 'sheet1');
});

document.getElementById('formSheet2').addEventListener('submit', e => {
    e.preventDefault();
    submitData('formSheet2', 'sheet2');
});

async function submitData(formId, target) {
    const form = document.getElementById(formId);
    const btn = form.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Đang lưu...'; btn.disabled = true;
    saveAllFields();
    const savedData = JSON.parse(localStorage.getItem('ngan_last_session'));
    let payload = { target: target };
    if (target === 'sheet1') {
        payload.hoTen = savedData.h1; payload.sanPham = savedData.s1;
        payload.kichThuoc = savedData.k1; payload.ghiChu = savedData.g1;
        payload.soLuong = savedData.sl1; payload.donGia = savedData.dg1;
    } else {
        payload.hoTen = savedData.h2; payload.sanPham = savedData.s2;
        payload.kichThuoc = savedData.k2; payload.ghiChu = savedData.g2;
        payload.soLuong = savedData.sl2; payload.donGia = savedData.dg2;
        payload.nguoiPhanCong = savedData.nguoi; payload.ngayGiao = savedData.ngay;
        payload.tinhTrang = savedData.tinhTrang; payload.thanhToan = savedData.thanhToan;
        payload.daTra = savedData.daTra;
    }
    try {
        await fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload) });
        btn.innerText = 'Thành công ✓'; btn.style.backgroundColor = '#2ecc71';
    } catch (error) {
        btn.innerText = 'Lỗi!'; btn.style.backgroundColor = '#e63946';
    } finally {
        setTimeout(() => { btn.innerText = originalText; btn.style.backgroundColor = ''; btn.disabled = false; }, 2000);
    }
}

// --- 8. TRUY XUẤT TAB 2 ---

async function fetchCustomerList() {
    const listContainer = document.getElementById('customerButtonsList');
    if (!listContainer) return;
    try {
        const response = await fetch(scriptURL + "?listNames=true");
        const names = await response.json();
        if (!names || names.length === 0) {
            listContainer.innerHTML = '<p>Chưa có dữ liệu khách hàng.</p>';
            return;
        }
        listContainer.innerHTML = ''; 
        names.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'customer-btn';
            btn.innerText = name;
            btn.onclick = function() {
                document.getElementById('searchName').value = name; 
                searchCustomer(); 
            };
            listContainer.appendChild(btn);
        });
    } catch (e) {
        listContainer.innerHTML = '<p style="color:red;">Lỗi tải danh sách khách.</p>';
    }
}

async function searchCustomer() {
    const nameInput = document.getElementById('searchName');
    const name = nameInput.value.trim();
    if (!name) return;
    
    const resultDiv = document.getElementById('invoiceResult');
    resultDiv.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Đang lấy lịch sử đơn hàng của ${name}...</div>`;

    try {
        const response = await fetch(scriptURL + "?ten=" + encodeURIComponent(name));
        const data = await response.json();
        
        if (!data || data.length === 0) {
            resultDiv.innerHTML = `<p style="text-align:center; color:red;">Không tìm thấy dữ liệu.</p>`;
            return;
        }

        let html = `<table><thead><tr><th>Ngày</th><th>Sản phẩm</th><th>SL</th><th>Tổng tiền</th><th>Đã trả</th></tr></thead><tbody>`;
        let totalAll = 0, paidAll = 0;

        data.forEach(row => {
            const t = Number(row[7].toString().replace(/[^0-9]/g, '')) || 0;
            const p = Number(row[12].toString().replace(/[^0-9]/g, '')) || 0;
            
            html += `<tr><td>${row[0]}</td><td>${row[2]}</td><td>${row[5]}</td><td>${t.toLocaleString()}</td><td>${p.toLocaleString()}</td></tr>`;
            totalAll += t; 
            paidAll += p;
        });

        const debt = totalAll - paidAll;
        html += `</tbody></table><div class="invoice-summary" style="background:#f8f9fa; padding:15px; border-radius:10px; margin-top:15px;">
            <p>Tổng tích lũy: <b>${totalAll.toLocaleString()} VND</b></p>
            <p>Đã trả: <b style="color:green">${paidAll.toLocaleString()} VND</b></p><hr>
            <p class="debt-text" style="color:${debt > 0 ? 'red' : 'green'}">Còn nợ: <b>${debt.toLocaleString()} VND</b></p>
        </div>`;
        resultDiv.innerHTML = html;
        resultDiv.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        resultDiv.innerHTML = `<p style="text-align:center; color:red;">Lỗi kết nối!</p>`;
    }
}

window.onload = loadAllFields;
