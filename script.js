const scriptURL = 'https://script.google.com/macros/s/AKfycbzUzMW7o7mN32CSU2wUoA3aJ7ey1E2XeIqDzx9ie5UP95gGt2ES0DvH3XMSJtLpxcQL/exec';

// --- 1. CHUYỂN TAB ---
function showTab(tabId, element) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    document.getElementById('content-' + tabId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active-nav');
    });
    element.classList.add('active-nav');
}

// --- 2. HÀM LƯU TẤT CẢ FIELDS VÀO LOCALSTORAGE ---
function saveAllFields() {
    const dataToSave = {
        h1: document.getElementById('h1').value,
        s1: document.getElementById('s1').value,
        k1: document.getElementById('k1').value,
        g1: document.getElementById('g1').value, 
        sl1: document.getElementById('sl1').value,
        dg1: document.getElementById('dg1').value,
        // Form 2
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

// --- 3. LOGIC DANH BẠ KHÁCH HÀNG (Ghi nhớ theo tên) ---
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
        // Cập nhật ngay sang form 2
        syncAllToForm2();
        updateTong();
    }
}

// --- 4. HÀM ĐỔ DỮ LIỆU CŨ RA KHI MỞ WEB ---
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

// --- 5. TÍNH TỔNG TIỀN & ĐỒNG BỘ ---
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

// Lắng nghe thay đổi
const fieldsMap = { 'h1': 'h2', 's1': 's2', 'k1': 'k2', 'g1': 'g2', 'sl1': 'sl2', 'dg1': 'dg2' };
Object.keys(fieldsMap).forEach(id1 => {
    document.getElementById(id1).addEventListener('input', (e) => {
        document.getElementById(fieldsMap[id1]).value = e.target.value;
        if (id1 === 'h1' && e.target.value.length > 2) autoFillByCustomer(e.target.value);
        if (id1 === 'sl1' || id1 === 'dg1') updateTong();
        saveAllFields();
    });
});

['nguoi', 'ngay', 'tinhTrang', 'thanhToan', 'daTra', 'g2'].forEach(id => {
    document.getElementById(id).addEventListener('input', saveAllFields);
});

// --- 6. GỬI DỮ LIỆU ---
document.getElementById('formSheet1').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('h1').value;
    saveCustomerToDB(name); // Lưu vào danh bạ khách
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

    btn.innerText = 'Đang lưu...';
    btn.disabled = true;

    saveAllFields();
    const savedData = JSON.parse(localStorage.getItem('ngan_last_session'));
    let payload = { target: target };

    if (target === 'sheet1') {
        payload.hoTen = savedData.h1;
        payload.sanPham = savedData.s1;
        payload.kichThuoc = savedData.k1;
        payload.ghiChu = savedData.g1; // Gửi ghi chú 1
        payload.soLuong = savedData.sl1;
        payload.donGia = savedData.dg1;
    } else {
        payload.hoTen = savedData.h2;
        payload.sanPham = savedData.s2;
        payload.kichThuoc = savedData.k2;
        payload.ghiChu = savedData.g2; // Gửi ghi chú 2
        payload.soLuong = savedData.sl2;
        payload.donGia = savedData.dg2;
        payload.nguoiPhanCong = savedData.nguoi;
        payload.ngayGiao = savedData.ngay;
        payload.tinhTrang = savedData.tinhTrang;
        payload.thanhToan = savedData.thanhToan;
        payload.daTra = savedData.daTra;
    }

    try {
        await fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload) });
        btn.innerText = 'Thành công ✓';
        btn.style.backgroundColor = '#2ecc71';
    } catch (error) {
        btn.innerText = 'Lỗi kết nối!';
        btn.style.backgroundColor = '#e63946';
    } finally {
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.backgroundColor = '';
            btn.disabled = false;
        }, 2000);
    }
}

// --- 7. TRUY XUẤT TAB 2 (GIỮ NGUYÊN) ---
async function searchCustomer() {
    const nameInput = document.getElementById('searchName');
    const name = nameInput.value.trim();
    if (!name) { alert("Vui lòng nhập tên khách hàng"); return; }
    const resultDiv = document.getElementById('invoiceResult');
    resultDiv.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Đang truy xuất dữ liệu từ Sheet...</div>`;

    try {
        const response = await fetch(scriptURL + "?ten=" + encodeURIComponent(name));
        const data = await response.json();
        if (!data || data.length === 0) {
            resultDiv.innerHTML = `<div style="text-align:center; color:#e63946; padding:20px; border:1px dashed #e63946; border-radius:10px;">Không tìm thấy dữ liệu cho khách hàng: <b>${name}</b> trên Sheet TrangThai.</div>`;
            return;
        }

        let html = `<div class="fade-in"><h3 style="color:#1d3557; margin-bottom:15px;">Lịch sử đơn hàng: ${name}</h3><table><thead><tr><th>Ngày</th><th>Sản phẩm</th><th>SL</th><th>Tổng tiền</th><th>Đã trả</th></tr></thead><tbody>`;
        let totalAll = 0, paidAll = 0;

        data.forEach(row => {
            const rawTotal = row[6].toString().replace(/[^0-9]/g, '');
            const rawPaid = row[11].toString().replace(/[^0-9]/g, '');
            const total = Number(rawTotal) || 0;
            const paid = Number(rawPaid) || 0;
            html += `<tr><td>${row[0]}</td><td>${row[2]}</td><td>${row[4]}</td><td>${total.toLocaleString()}</td><td>${paid.toLocaleString()}</td></tr>`;
            totalAll += total;
            paidAll += paid;
        });

        const debt = totalAll - paidAll;
        html += `</tbody></table><div class="invoice-summary" style="background:#f8f9fa; padding:15px; border-radius:10px; margin-top:15px;"><p>Tổng tiền tích lũy: <b style="font-size:1.1rem">${totalAll.toLocaleString()} VND</b></p><p>Tổng đã thanh toán: <b style="color:#2ecc71">${paidAll.toLocaleString()} VND</b></p><hr><p class="debt-text" style="color:${debt > 0 ? '#e63946' : '#1d3557'}">${debt > 0 ? 'Số dư còn nợ: ' : 'Tình trạng: '} <b>${debt.toLocaleString()} VND</b></p></div></div>`;
        resultDiv.innerHTML = html;
    } catch (error) {
        resultDiv.innerHTML = `<p style="text-align:center; color:red;">Lỗi kết nối hệ thống!</p>`;
    }
}

window.onload = loadAllFields;