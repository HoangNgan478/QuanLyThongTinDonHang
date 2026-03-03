const scriptURL = 'https://script.google.com/macros/s/AKfycbwAZCfqjJbAcobP9k0jr3gpTaZm-Wj45X9bJ9C6zkIkWTZhQVJf368DIWiV6VjS2iKK/exec';

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

// --- 2. TÍNH TOÁN ---
function updateCalculation() {
    const sizeVal = document.getElementById('kichThuoc').value;
    const regex = /^(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)$/;
    const match = sizeVal.toLowerCase().trim().match(regex);
    
    // Nếu nhập axb, tự tính và làm tròn 2 chữ số
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

// Lắng nghe sự kiện nhập liệu
allFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateCalculation);
});

// --- 4. GỬI DỮ LIỆU & KIỂM TRA ĐIỀN THIẾU ---
document.getElementById('mainForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // DANH SÁCH CÁC Ô BẮT BUỘC PHẢI ĐIỀN
    const requiredFields = ['hoTen', 'sanPham', 'soLuong', 'donGia', 'nguoi', 'ngay'];
    let missingFields = [];

    requiredFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el || !el.value.trim()) {
            missingFields.push(id);
            el.style.borderBottom = "2px solid #e63946";
        } else {
            el.style.borderBottom = "2px solid #eee";
        }
    });

    if (missingFields.length > 0) {
        alert("Chưa điền đủ thông tin quan trọng!");
        document.getElementById(missingFields[0]).focus();
        return; 
    }

    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Đang lưu...'; btn.disabled = true;

    // --- PAYLOAD: Khớp chính xác với tên biến trong file GAS của Ngân ---
    const payload = {
        hoTen: document.getElementById('hoTen').value,
        sanPham: document.getElementById('sanPham').value,
        kichThuoc: document.getElementById('kichThuoc').value,
        soLuong: document.getElementById('soLuong').value,
        donGia: document.getElementById('donGia').value,
        ghiChu: document.getElementById('ghiChu').value,
        // Chuyển 'nguoi' thành 'nguoiPhanCong' và 'ngay' thành 'ngayGiao' để GAS nhận được
        nguoiPhanCong: document.getElementById('nguoi').value, 
        ngayGiao: document.getElementById('ngay').value,
        tinhTrang: document.getElementById('tinhTrang').value,
        thanhToan: document.getElementById('thanhToan').value,
        daTra: document.getElementById('daTra').value
    };

    try {
        // Gửi dữ liệu cực nhanh không chờ phản hồi CORS
        fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        
        btn.innerText = 'Thành công ✓';
        btn.style.backgroundColor = '#2ecc71';

        // Xóa trắng đơn (giữ lại Tên khách hoTen)
        ['sanPham', 'kichThuoc', 'ghiChu', 'soLuong', 'donGia', 'daTra', 'nguoi', 'ngay'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        updateCalculation();
        saveAllFields();
        fetchCustomerList();
    } catch (error) { 
        btn.innerText = 'Lỗi!'; 
    } finally {
        setTimeout(() => { 
            btn.innerText = originalText; 
            btn.style.backgroundColor = ''; 
            btn.disabled = false; 
        }, 1500);
    }
});

// --- 5. TRUY XUẤT TAB 2 (NÚT BẤM & TÌM KIẾM) ---
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
        const response = await fetch(scriptURL + "?ten=" + encodeURIComponent(name));
        const data = await response.json();
        if (!data || data.length === 0) {
            resultDiv.innerHTML = '<p style="text-align:center; color:red;">Không có dữ liệu.</p>';
            return;
        }

        // JS chỉ tạo khung HTML, class CSS sẽ lo phần làm đẹp
        let html = `<div id="billArea">`;
        html += `<h3>Lịch sử đơn hàng: ${name}</h3>`;
        html += `<table class="bill-table">
                    <thead>
                        <tr>
                            <th>Ngày</th>
                            <th>Sản phẩm</th>
                            <th>Kích thước</th>
                            <th>Đơn giá</th>
                            <th>Số lượng</th>
                            <th>Đã trả</th>
                            <th>Tổng</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        let tAll = 0, pAll = 0;
        data.forEach(row => {
            const dg = Number(row[6]?.toString().replace(/[^0-9]/g, '')) || 0;
            const t = Number(row[7]?.toString().replace(/[^0-9]/g, '')) || 0;
            const p = Number(row[12]?.toString().replace(/[^0-9]/g, '')) || 0;
            
            html += `<tr>
                <td class="date">${row[0].split(' ')[0]}</td>
                <td class="bold">${row[2]}</td>
                <td>${row[3] || "-"}</td>
                <td>${dg.toLocaleString()}</td>
                <td>${row[5]}</td>
                <td class="paid">${p > 0 ? p.toLocaleString() : "-"}</td>
                <td class="bold">${t.toLocaleString()}</td>
            </tr>`;
            tAll += t; pAll += p;
        });

        const debt = tAll - pAll;
        html += `</tbody></table>`;
        
        html += `<div class="bill-summary">
            <p>Tổng cộng: <b>${tAll.toLocaleString()} VND</b></p>
            <p class="paid">Đã thanh toán: <b>${pAll.toLocaleString()} VND</b></p>
            <p class="total-row" style="color:${debt > 0 ? 'var(--red)' : 'green'}">
                Còn nợ: ${debt.toLocaleString()} VND
            </p>
            <p class="bill-footer">Thời gian xuất bill: ${new Date().toLocaleString('vi-VN')}</p>
        </div></div>`;

        html += `<button onclick="downloadBillImage('${name}')" class="btn btn-download">
                    <i class="fas fa-camera"></i> TẢI ẢNH BILL GỬI KHÁCH
                 </button>`;
        
        resultDiv.innerHTML = html;
        resultDiv.scrollIntoView({ behavior: 'smooth' });
    } catch (e) { resultDiv.innerHTML = 'Lỗi kết nối!'; }
}

// HÀM BỔ SUNG: CHỤP ẢNH VÙNG BILL
function downloadBillImage(customerName) {
    const element = document.getElementById('billArea');
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo ảnh...';
    btn.disabled = true;

    html2canvas(element, { 
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Bill_${customerName}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        
        btn.innerHTML = originalContent;
        btn.disabled = false;
    });
}

window.onload = loadAllFields;
