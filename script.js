// ===== نظام إدارة الموظفين والأماكن =====
// ===== دالة لإزالة التكرارات =====
function removeDuplicatesFromStorage() {
    console.log('🔄 فحص وإزالة التكرارات...');
    
    // للموظفين
    const employees = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const uniqueEmployees = [];
    const seenEmployees = new Set();
    
    employees.forEach(emp => {
        // استخدام الاسم والوظيفة كمعرف فريد
        const uniqueKey = `${emp.name}-${emp.role}-${emp.gender}`;
        if (!seenEmployees.has(uniqueKey)) {
            seenEmployees.add(uniqueKey);
            uniqueEmployees.push(emp);
        }
    });
    
    // للأماكن
    const places = JSON.parse(localStorage.getItem(PLACES_STORAGE_KEY) || '[]');
    const uniquePlaces = [];
    const seenPlaces = new Set();
    
    places.forEach(place => {
        const uniqueKey = `${place.name}-${place.building}`;
        if (!seenPlaces.has(uniqueKey)) {
            seenPlaces.add(uniqueKey);
            uniquePlaces.push(place);
        }
    });
    
    // حفظ البيانات بعد إزالة التكرارات
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueEmployees));
    localStorage.setItem(PLACES_STORAGE_KEY, JSON.stringify(uniquePlaces));
    
    console.log(`✅ تم تنظيف:
    - الموظفين: ${employees.length} → ${uniqueEmployees.length}
    - الأماكن: ${places.length} → ${uniquePlaces.length}`);
    
    return { uniqueEmployees, uniquePlaces };
}

// مفاتيح التخزين في localStorage
const STORAGE_KEY = 'employees_data';
const PLACES_STORAGE_KEY = 'places_data';


// ===== النظام الأساسي =====
let employees = [];
let places = [];
let currentDistribution = null;
let isEditing = false;
let isEditingPlace = false;

// ===== متغيرات Pagination والبحث =====
let currentPage = 1;
let pageSize = 10;
let filteredEmployees = [];
let currentSearchTerm = '';
let currentRoleFilter = '';

// ===== متغيرات لحفظ التحديدات والبيانات =====
let selectedEmployeeIds = new Set();
let committeesData = [];


// دالة لتحميل مكتبة SheetJS ديناميكياً
function loadSheetJS() {
    return new Promise((resolve, reject) => {
        if (window.XLSX) {
            resolve(window.XLSX);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => resolve(window.XLSX);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}











// ===== تحميل البيانات =====
function loadEmployeesFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    } else {
        return [];
    }
}

function loadPlacesFromStorage() {
    const stored = localStorage.getItem(PLACES_STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    } else {
        return [];
    }
}

function saveEmployeesToStorage(employeesList) {
    // فحص التكرارات قبل الحفظ
    const uniqueEmployees = [];
    const seen = new Set();
    
    employeesList.forEach(emp => {
        const uniqueKey = `${emp.name}-${emp.role}-${emp.gender}`;
        if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            uniqueEmployees.push(emp);
        } else {
            console.warn('⚠️ تم تجاهل موظف مكرر:', emp.name);
        }
    });
    
    // حفظ البيانات النظيفة
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueEmployees));
    updateStatistics(uniqueEmployees);
    
    // تحديث المتغير العام
    employees = uniqueEmployees;
    
    console.log('💾 تم حفظ', uniqueEmployees.length, 'موظف');
}

function savePlacesToStorage(placesList) {
    // نفس الفكرة للأماكن
    const uniquePlaces = [];
    const seen = new Set();
    
    placesList.forEach(place => {
        const uniqueKey = `${place.name}-${place.building}`;
        if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            uniquePlaces.push(place);
        } else {
            console.warn('⚠️ تم تجاهل مكان مكرر:', place.name);
        }
    });
    
    localStorage.setItem(PLACES_STORAGE_KEY, JSON.stringify(uniquePlaces));
    updatePlacesStatistics(uniquePlaces);
    places = uniquePlaces;
}

// ===== تهيئة التطبيق =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تحميل النظام...');
    
    // تنظيف التكرارات أولاً
    removeDuplicatesFromStorage();
    
    // تحميل البيانات بعد التنظيف
    employees = loadEmployeesFromStorage();
    places = loadPlacesFromStorage();
    
    // ... باقي الكود كما هو
    setTodayDate();
    buildCommittees();
    updateStatistics(employees);
    updatePlacesStatistics(places);
    filterEmployees();
});

// ===== وظائف التبويبات =====
function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
    
    if (tabName === 'employees') {
        loadEmployeeList();
        updateStatistics(employees);
    } else if (tabName === 'places') {
        loadPlacesList();
        updatePlacesStatistics(places);
    } else if (tabName === 'distribution') {
        setTodayDate();
        filterEmployees();
    }
}

// ===== وظائف التاريخ =====
function setTodayDate() {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('examDate').value = formattedDate;
}

// ===== وظائف Pagination محسنة =====
function changePageSize() {
    pageSize = parseInt(document.getElementById('pageSizeSelect').value);
    currentPage = 1;
    renderEmployeesTable();
    updatePaginationControls();
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderEmployeesTable();
        updatePaginationControls();
    }
}

function nextPage() {
    const totalPages = pageSize > 0 ? Math.ceil(filteredEmployees.length / pageSize) : 1;
    if (currentPage < totalPages) {
        currentPage++;
        renderEmployeesTable();
        updatePaginationControls();
    }
}

function updatePaginationControls() {
    const totalPages = pageSize > 0 ? Math.ceil(filteredEmployees.length / pageSize) : 1;
    const pageInfo = document.getElementById('pageInfo');
    const paginationControls = document.getElementById('paginationControls');
    
    if (pageSize === 0) {
        paginationControls.style.display = 'none';
        pageInfo.textContent = `عرض الكل (${filteredEmployees.length} موظف)`;
    } else {
        paginationControls.style.display = 'flex';
        pageInfo.textContent = `الصفحة ${currentPage} من ${totalPages}`;
        
        // تعطيل الأزرار عند الحاجة
        const prevBtn = document.querySelector('button[onclick="prevPage()"]');
        const nextBtn = document.querySelector('button[onclick="nextPage()"]');
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }
}

// ===== عرض الموظفين مع حفظ التحديد =====
function renderEmployeesTable() {
    const empTable = document.getElementById("empTable");
    let employeesToShow = [...filteredEmployees];
    
    if (pageSize > 0) {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        employeesToShow = employeesToShow.slice(startIndex, endIndex);
    }
    
    empTable.innerHTML = "";
    employeesToShow.forEach(e => {
        const isChecked = selectedEmployeeIds.has(e.id) ? 'checked' : '';
        empTable.innerHTML += `
        <tr>
            <td><input type="checkbox" class="emp" value="${e.id}" ${isChecked} onchange="toggleEmployeeSelection(${e.id})"></td>
            <td>${e.name}</td>
            <td>${e.role}</td>
        </tr>`;
    });
    
    updateSelectedCount();
    updatePaginationControls();
}

// ===== البحث والتصفية مع فلتر الوظيفة =====
function filterEmployees() {
    currentSearchTerm = document.getElementById("search").value.toLowerCase();
    currentRoleFilter = document.getElementById("roleFilterDistribution").value;
    
    filteredEmployees = employees.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(currentSearchTerm);
        const matchesRole = currentRoleFilter ? e.role === currentRoleFilter : true;
        return matchesSearch && matchesRole;
    });
    
    currentPage = 1;
    renderEmployeesTable();
}

// ===== إدارة تحديد الموظفين =====
function toggleEmployeeSelection(id) {
    const checkbox = document.querySelector(`.emp[value="${id}"]`);
    if (checkbox) {
        if (checkbox.checked) {
            selectedEmployeeIds.add(id);
        } else {
            selectedEmployeeIds.delete(id);
        }
    }
    updateSelectedCount();
}

function updateSelectedCount() {
    document.getElementById("selectedCount").innerText = selectedEmployeeIds.size;
}

function selectAll() {
    const checkboxes = document.querySelectorAll('.emp');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedEmployeeIds.add(parseInt(checkbox.value));
    });
    updateSelectedCount();
}

function clearAll() {
    const checkboxes = document.querySelectorAll('.emp');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        selectedEmployeeIds.delete(parseInt(checkbox.value));
    });
    updateSelectedCount();
}

// ===== إدارة اللجان مع حفظ البيانات =====
function saveCommitteesData() {
    committeesData = [];
    const rows = document.querySelectorAll("#committeeTable tr");
    
    rows.forEach(row => {
        const committeeNumber = row.querySelector("td:first-child")?.textContent || "";
        const minInput = row.querySelector(".perCommittee");
        const locationSelect = row.querySelector(".location");
        
        if (minInput && locationSelect) {
            committeesData.push({
                number: committeeNumber,
                min: minInput.value,
                location: locationSelect.value
            });
        }
    });
}

function buildCommittees() {
    saveCommitteesData();
    
    const committeeCount = parseInt(document.getElementById("committeeCount").value);
    const committeeTable = document.getElementById("committeeTable");
    
    let placesOptions = '<option value="">اختر مكان اللجنة</option>';
    places.filter(p => p.status === 'متاح').forEach(place => {
        placesOptions += `<option value="${place.name}">${place.name}</option>`;
    });
    
    committeeTable.innerHTML = "";
    
    for(let i = 1; i <= committeeCount; i++) {
        const savedData = committeesData.find(data => data.number === `لجنة ${i}`);
        const minValue = savedData ? savedData.min : 3;
        const locationValue = savedData ? savedData.location : "";
        
        committeeTable.innerHTML += `
        <tr>
            <td>لجنة ${i}</td>
            <td><input type="number" class="perCommittee" value="${minValue}" min="1" max="10"></td>
            <td>
                <select class="location">
                    ${placesOptions}
                </select>
            </td>
        </tr>`;
    }
    
    setTimeout(() => {
        const locationSelects = document.querySelectorAll(".location");
        locationSelects.forEach((select, index) => {
            if (committeesData[index]) {
                select.value = committeesData[index].location;
            }
        });
    }, 100);
}

// ===== وظائف إدارة الموظفين =====
document.getElementById('employeeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const id = document.getElementById('employeeId').value;
    const name = document.getElementById('empName').value.trim();
    const role = document.getElementById('empRole').value.trim();
    const gender = document.getElementById('empGender').value;
    const department = document.getElementById('empDepartment').value.trim();
    const notes = document.getElementById('empNotes').value.trim();
    
    if (!name || !role || !gender) {
        alert('الرجاء ملء جميع الحقول المطلوبة (الاسم، الوظيفة، النوع)');
        return;
    }
    
    if (isEditing && id) {
        const index = employees.findIndex(e => e.id == id);
        if (index !== -1) {
            employees[index] = { ...employees[index], name, role, gender, department, notes };
            saveEmployeesToStorage(employees);
            showMessage('تم تحديث بيانات الموظف بنجاح', 'success');
        }
    } else {
        const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
        employees.push({ id: newId, name, role, gender, department, notes });
        saveEmployeesToStorage(employees);
        showMessage('تم إضافة الموظف بنجاح', 'success');
    }
    
    loadEmployeeList();
    clearForm();
    filterEmployees();
});

function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success' : 'alert';
    messageDiv.textContent = message;
    
    const form = document.getElementById('employeeForm');
    form.parentNode.insertBefore(messageDiv, form);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

function clearForm() {
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';
    document.getElementById('formTitle').textContent = 'إضافة موظف جديد';
    document.getElementById('submitBtn').textContent = 'حفظ الموظف';
    document.getElementById('cancelBtn').style.display = 'none';
    isEditing = false;
}

function editEmployee(id) {
    const employee = employees.find(e => e.id == id);
    if (!employee) return;
    
    document.getElementById('employeeId').value = employee.id;
    document.getElementById('empName').value = employee.name;
    document.getElementById('empRole').value = employee.role;
    document.getElementById('empGender').value = employee.gender;
    document.getElementById('empDepartment').value = employee.department || '';
    document.getElementById('empNotes').value = employee.notes || '';
    
    document.getElementById('formTitle').textContent = 'تعديل بيانات الموظف';
    document.getElementById('submitBtn').textContent = 'تحديث البيانات';
    document.getElementById('cancelBtn').style.display = 'inline-block';
    isEditing = true;


        // التمرير السلس للفورم
        document.getElementById('formTitle').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function deleteEmployee(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    employees = employees.filter(e => e.id != id);
    saveEmployeesToStorage(employees);
    loadEmployeeList();
    filterEmployees();
    selectedEmployeeIds.delete(id);
    updateSelectedCount();
    
    showMessage('تم حذف الموظف بنجاح', 'success');
}

function loadEmployeeList() {
    const container = document.getElementById('employeesList');
    const searchTerm = document.getElementById('empSearch').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    const genderFilter = document.getElementById('genderFilter').value;
    
    let filtered = employees;
    
    if (searchTerm) filtered = filtered.filter(e => e.name.toLowerCase().includes(searchTerm));
    if (roleFilter) filtered = filtered.filter(e => e.role === roleFilter);
    if (genderFilter) filtered = filtered.filter(e => e.gender === genderFilter);
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="alert">لا توجد نتائج</div>';
        return;
    }
    
    let html = `
    <table>
        <thead>
            <tr>
                <th>م</th><th>الاسم</th><th>الوظيفة</th><th>النوع</th><th>القسم</th><th>الإجراءات</th>
            </tr>
        </thead>
        <tbody>`;
    
    filtered.forEach((employee, index) => {
        html += `
        <tr>
            <td>${index + 1}</td>
            <td>${employee.name}</td>
            <td>${employee.role}</td>
            <td>${employee.gender}</td>
            <td>${employee.department || '-'}</td>
            <td>
                <button class="btn-blue" onclick="editEmployee(${employee.id})" style="padding:5px 10px; margin:2px;">تعديل</button>
                <button class="btn-red" onclick="deleteEmployee(${employee.id})" style="padding:5px 10px; margin:2px;">حذف</button>
            </td>
        </tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function searchEmployees() {
    loadEmployeeList();
}

// ===== وظائف إدارة الأماكن =====
document.getElementById('placeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const id = document.getElementById('placeId').value;
    const name = document.getElementById('placeName').value.trim();
    const capacity = document.getElementById('placeCapacity').value;
    const building = document.getElementById('placeBuilding').value.trim();
    const status = document.getElementById('placeStatus').value;
    const notes = document.getElementById('placeNotes').value.trim();
    
    if (!name) {
        alert('الرجاء إدخال اسم المكان');
        return;
    }
    
    if (isEditingPlace && id) {
        const index = places.findIndex(p => p.id == id);
        if (index !== -1) {
            places[index] = { ...places[index], name, capacity: capacity ? parseInt(capacity) : null, building, status, notes };
            savePlacesToStorage(places);
            showPlaceMessage('تم تحديث بيانات المكان بنجاح', 'success');
        }
    } else {
        const newId = places.length > 0 ? Math.max(...places.map(p => p.id)) + 1 : 1;
        places.push({ id: newId, name, capacity: capacity ? parseInt(capacity) : null, building, status, notes });
        savePlacesToStorage(places);
        showPlaceMessage('تم إضافة المكان بنجاح', 'success');
    }
    
    loadPlacesList();
    clearPlaceForm();
    buildCommittees();
});

function showPlaceMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success' : 'alert';
    messageDiv.textContent = message;
    
    const form = document.getElementById('placeForm');
    form.parentNode.insertBefore(messageDiv, form);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

function clearPlaceForm() {
    document.getElementById('placeForm').reset();
    document.getElementById('placeId').value = '';
    document.getElementById('placeFormTitle').textContent = 'إضافة مكان جديد';
    document.getElementById('placeSubmitBtn').textContent = 'حفظ المكان';
    document.getElementById('placeCancelBtn').style.display = 'none';
    isEditingPlace = false;
}

function editPlace(id) {
    const place = places.find(p => p.id == id);
    if (!place) return;
    
    document.getElementById('placeId').value = place.id;
    document.getElementById('placeName').value = place.name;
    document.getElementById('placeCapacity').value = place.capacity || '';
    document.getElementById('placeBuilding').value = place.building || '';
    document.getElementById('placeStatus').value = place.status;
    document.getElementById('placeNotes').value = place.notes || '';
    
    document.getElementById('placeFormTitle').textContent = 'تعديل بيانات المكان';
    document.getElementById('placeSubmitBtn').textContent = 'تحديث البيانات';
    document.getElementById('placeCancelBtn').style.display = 'inline-block';
    isEditingPlace = true;
}

function deletePlace(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المكان؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    places = places.filter(p => p.id != id);
    savePlacesToStorage(places);
    loadPlacesList();
    buildCommittees();
    
    showPlaceMessage('تم حذف المكان بنجاح', 'success');
}

function loadPlacesList() {
    const container = document.getElementById('placesList');
    const searchTerm = document.getElementById('placeSearch').value.toLowerCase();
    const statusFilter = document.getElementById('placeStatusFilter').value;
    
    let filtered = places;
    
    if (searchTerm) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm));
    if (statusFilter) filtered = filtered.filter(p => p.status === statusFilter);
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="alert">لا توجد نتائج</div>';
        return;
    }
    
    let html = `
    <table>
        <thead>
            <tr>
                <th>م</th><th>اسم المكان</th><th>السعة</th><th>المبنى</th><th>الحالة</th><th>ملاحظات</th><th>الإجراءات</th>
            </tr>
        </thead>
        <tbody>`;
    
    filtered.forEach((place, index) => {
        html += `
        <tr>
            <td>${index + 1}</td>
            <td>${place.name}</td>
            <td>${place.capacity || '-'}</td>
            <td>${place.building || '-'}</td>
            <td>${place.status}</td>
            <td>${place.notes || '-'}</td>
            <td>
                <button class="btn-blue" onclick="editPlace(${place.id})" style="padding:5px 10px; margin:2px;">تعديل</button>
                <button class="btn-red" onclick="deletePlace(${place.id})" style="padding:5px 10px; margin:2px;">حذف</button>
            </td>
        </tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function searchPlaces() {
    loadPlacesList();
}

// ===== تصدير Excel للموظفين =====
async function exportDataExcel() {
    try {
        const XLSX = await loadSheetJS();
        
        // تحويل البيانات إلى ورقة عمل
        const worksheet = XLSX.utils.json_to_sheet(employees.map(emp => ({
            'الرقم': emp.id,
            'الاسم': emp.name,
            'الوظيفة': emp.role,
            'النوع': emp.gender,
            'القسم': emp.department || '',
            'ملاحظات': emp.notes || ''
        })));
        
        // إنشاء مصنف جديد
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'الموظفين');
        
        // توليد ملف Excel
        XLSX.writeFile(workbook, 'موظفين_المراقبة.xlsx');
        
        showMessage('تم تصدير البيانات إلى ملف Excel بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في تصدير Excel:', error);
        alert('حدث خطأ أثناء تصدير ملف Excel. تأكد من اتصال الإنترنت لتحميل المكتبة المطلوبة.');
    }
}

// ===== تصدير CSV للموظفين =====
function exportDataCSV() {
    try {
        // رأس الأعمدة
        const headers = ['الرقم', 'الاسم', 'الوظيفة', 'النوع', 'القسم', 'ملاحظات'];
        
        // البيانات
        const csvData = employees.map(emp => [
            emp.id,
            emp.name,
            emp.role,
            emp.gender,
            emp.department || '',
            emp.notes || ''
        ]);
        
        // إنشاء محتوى CSV
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        // إنشاء ملف CSV
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'موظفين_المراقبة.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('تم تصدير البيانات إلى ملف CSV بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في تصدير CSV:', error);
        alert('حدث خطأ أثناء تصدير ملف CSV.');
    }
}

// ===== تصدير Excel للأماكن =====
async function exportPlacesExcel() {
    try {
        const XLSX = await loadSheetJS();
        
        const worksheet = XLSX.utils.json_to_sheet(places.map(place => ({
            'الرقم': place.id,
            'اسم المكان': place.name,
            'السعة': place.capacity || '',
            'المبنى': place.building || '',
            'الحالة': place.status,
            'ملاحظات': place.notes || ''
        })));
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'الأماكن');
        
        XLSX.writeFile(workbook, 'أماكن_اللجان.xlsx');
        
        showPlaceMessage('تم تصدير الأماكن إلى ملف Excel بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في تصدير Excel للأماكن:', error);
        alert('حدث خطأ أثناء تصدير ملف Excel للأماكن.');
    }
}

// ===== تصدير CSV للأماكن =====
function exportPlacesCSV() {
    try {
        const headers = ['الرقم', 'اسم المكان', 'السعة', 'المبنى', 'الحالة', 'ملاحظات'];
        
        const csvData = places.map(place => [
            place.id,
            place.name,
            place.capacity || '',
            place.building || '',
            place.status,
            place.notes || ''
        ]);
        
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'أماكن_اللجان.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showPlaceMessage('تم تصدير الأماكن إلى ملف CSV بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في تصدير CSV للأماكن:', error);
        alert('حدث خطأ أثناء تصدير ملف CSV للأماكن.');
    }
}





// ===== استيراد بيانات الموظفين من Excel/CSV =====
async function importData(input) {
    const file = input.files[0];
    if (!file) return;
    
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    try {
        let importedData;
        
        if (fileExt === 'csv') {
            importedData = await readCSVFile(file);
        } else if (fileExt === 'xlsx' || fileExt === 'xls') {
            importedData = await readExcelFile(file);
        } else {
            alert('نوع الملف غير مدعوم. يرجى استخدام ملف Excel (.xlsx, .xls) أو CSV.');
            input.value = '';
            return;
        }
        
        if (!importedData || importedData.length === 0) {
            alert('الملف فارغ أو لا يحتوي على بيانات صالحة.');
            input.value = '';
            return;
        }
        
        // تحقق من صحة البيانات
        const validationResult = validateEmployeeData(importedData);
        if (!validationResult.isValid) {
            alert(`خطأ في البيانات:\n${validationResult.errors.join('\n')}\n\nيرجى تعديل الملف وحاول مرة أخرى.`);
            input.value = '';
            return;
        }
        
        if (confirm(`سيتم استيراد ${importedData.length} موظف. هل تريد المتابعة؟`)) {
            const existingIds = new Set(employees.map(e => e.id));
            let nextId = existingIds.size > 0 ? Math.max(...existingIds) + 1 : 1;
            
            importedData.forEach(item => {
                if (!item.id || existingIds.has(item.id)) {
                    item.id = nextId++;
                }
                employees.push(item);
            });
            
            saveEmployeesToStorage(employees);
            loadEmployeeList();
            filterEmployees();
            showMessage(`تم استيراد ${importedData.length} موظف بنجاح`, 'success');
        }
    } catch (error) {
        console.error('خطأ في استيراد الملف:', error);
        alert(`حدث خطأ أثناء قراءة الملف:\n${error.message}\n\nتأكد من:\n1. صيغة الملف صحيحة\n2. البيانات مرتبة بشكل صحيح\n3. الملف غير تالف`);
    }
    
    input.value = '';
}

// ===== استيراد بيانات الأماكن من Excel/CSV =====
async function importPlacesData(input) {
    const file = input.files[0];
    if (!file) return;
    
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    try {
        let importedData;
        
        if (fileExt === 'csv') {
            importedData = await readCSVFile(file, 'places');
        } else if (fileExt === 'xlsx' || fileExt === 'xls') {
            importedData = await readExcelFile(file, 'places');
        } else {
            alert('نوع الملف غير مدعوم. يرجى استخدام ملف Excel (.xlsx, .xls) أو CSV.');
            input.value = '';
            return;
        }
        
        if (!importedData || importedData.length === 0) {
            alert('الملف فارغ أو لا يحتوي على بيانات صالحة.');
            input.value = '';
            return;
        }
        
        const validationResult = validatePlaceData(importedData);
        if (!validationResult.isValid) {
            alert(`خطأ في البيانات:\n${validationResult.errors.join('\n')}\n\nيرجى تعديل الملف وحاول مرة أخرى.`);
            input.value = '';
            return;
        }
        
        if (confirm(`سيتم استيراد ${importedData.length} مكان. هل تريد المتابعة؟`)) {
            const existingIds = new Set(places.map(p => p.id));
            let nextId = existingIds.size > 0 ? Math.max(...existingIds) + 1 : 1;
            
            importedData.forEach(item => {
                if (!item.id || existingIds.has(item.id)) {
                    item.id = nextId++;
                }
                places.push(item);
            });
            
            savePlacesToStorage(places);
            loadPlacesList();
            buildCommittees();
            showPlaceMessage(`تم استيراد ${importedData.length} مكان بنجاح`, 'success');
        }
    } catch (error) {
        console.error('خطأ في استيراد الملف:', error);
        alert(`حدث خطأ أثناء قراءة الملف:\n${error.message}\n\nتأكد من:\n1. صيغة الملف صحيحة\n2. البيانات مرتبة بشكل صحيح\n3. الملف غير تالف`);
    }
    
    input.value = '';
}

// ===== دوال مساعدة للقراءة =====
async function readCSVFile(file, type = 'employees') {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const lines = content.split('\n').filter(line => line.trim() !== '');
                
                if (lines.length < 2) {
                    reject(new Error('الملف لا يحتوي على بيانات كافية'));
                    return;
                }
                
                // قراءة العناوين (السطر الأول)
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                
                // تحليل البيانات
                const data = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i]);
                    
                    if (type === 'employees') {
                        const employee = {
                            id: parseInt(values[0]) || 0,
                            name: values[1] || '',
                            role: values[2] || '',
                            gender: values[3] || 'ذكر',
                            department: values[4] || '',
                            notes: values[5] || ''
                        };
                        data.push(employee);
                    } else {
                        const place = {
                            id: parseInt(values[0]) || 0,
                            name: values[1] || '',
                            capacity: values[2] ? parseInt(values[2]) : null,
                            building: values[3] || '',
                            status: values[4] || 'متاح',
                            notes: values[5] || ''
                        };
                        data.push(place);
                    }
                }
                
                resolve(data);
            } catch (error) {
                reject(new Error(`خطأ في تحليل ملف CSV: ${error.message}`));
            }
        };
        
        reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
        reader.readAsText(file, 'UTF-8');
    });
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current.trim());
    return values.map(v => v.replace(/^"|"$/g, ''));
}

async function readExcelFile(file, type = 'employees') {
    const XLSX = await loadSheetJS();
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // الحصول على الورقة الأولى
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // تحويل إلى JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                if (type === 'employees') {
                    const employeesData = jsonData.map(row => ({
                        id: parseInt(row['الرقم']) || 0,
                        name: row['الاسم'] || '',
                        role: row['الوظيفة'] || '',
                        gender: row['النوع'] || 'ذكر',
                        department: row['القسم'] || '',
                        notes: row['ملاحظات'] || ''
                    }));
                    resolve(employeesData);
                } else {
                    const placesData = jsonData.map(row => ({
                        id: parseInt(row['الرقم']) || 0,
                        name: row['اسم المكان'] || '',
                        capacity: row['السعة'] ? parseInt(row['السعة']) : null,
                        building: row['المبنى'] || '',
                        status: row['الحالة'] || 'متاح',
                        notes: row['ملاحظات'] || ''
                    }));
                    resolve(placesData);
                }
            } catch (error) {
                reject(new Error(`خطأ في تحليل ملف Excel: ${error.message}`));
            }
        };
        
        reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
        reader.readAsArrayBuffer(file);
    });
}

// ===== دوال التحقق من صحة البيانات =====
function validateEmployeeData(data) {
    const errors = [];
    
    if (!Array.isArray(data)) {
        errors.push('البيانات يجب أن تكون في شكل جدول');
        return { isValid: false, errors };
    }
    
    data.forEach((item, index) => {
        const rowNum = index + 2;
        
        if (!item.name || item.name.trim() === '') {
            errors.push(`الصف ${rowNum}: حقل الاسم مطلوب`);
        }
        
        if (!item.role || item.role.trim() === '') {
            errors.push(`الصف ${rowNum}: حقل الوظيفة مطلوب`);
        }
        
        if (!item.gender || !['ذكر', 'أنثى'].includes(item.gender)) {
            errors.push(`الصف ${rowNum}: النوع يجب أن يكون "ذكر" أو "أنثى"`);
        }
        
        if (item.id && (isNaN(item.id) || item.id <= 0)) {
            errors.push(`الصف ${rowNum}: الرقم يجب أن يكون رقماً صحيحاً موجباً`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function validatePlaceData(data) {
    const errors = [];
    
    if (!Array.isArray(data)) {
        errors.push('البيانات يجب أن تكون في شكل جدول');
        return { isValid: false, errors };
    }
    
    data.forEach((item, index) => {
        const rowNum = index + 2;
        
        if (!item.name || item.name.trim() === '') {
            errors.push(`الصف ${rowNum}: حقل اسم المكان مطلوب`);
        }
        
        if (!item.status || !['متاح', 'تحت الصيانة', 'محجوز'].includes(item.status)) {
            errors.push(`الصف ${rowNum}: الحالة يجب أن تكون "متاح"، "تحت الصيانة"، أو "محجوز"`);
        }
        
        if (item.id && (isNaN(item.id) || item.id <= 0)) {
            errors.push(`الصف ${rowNum}: الرقم يجب أن يكون رقماً صحيحاً موجباً`);
        }
        
        if (item.capacity && (isNaN(item.capacity) || item.capacity < 0)) {
            errors.push(`الصف ${rowNum}: السعة يجب أن تكون رقماً صحيحاً موجباً`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// ===== التوزيع الذكي =====
function shuffle(a) {
    return a.sort(() => Math.random() - 0.5);
}

function distribute() {
    const selected = employees.filter(e => selectedEmployeeIds.has(e.id));
    
    if (!selected.length) {
        alert("يرجى اختيار مراقبين أولاً");
        return;
    }
    
    const mins = [...document.querySelectorAll(".perCommittee")].map(i => +i.value);
    const minTotal = mins.reduce((a, b) => a + b, 0);
    
    if (selected.length < minTotal) {
        alert("عدد المراقبين أقل من الحد الأدنى المطلوب");
        return;
    }
    
    const females = selected.filter(e => e.gender === 'أنثى');
    const teachingAssistants = selected.filter(e => e.role === 'معيد');
    const committeesCount = mins.length;
    
    if (females.length < committeesCount) {
        alert(`تنبيه: يوجد ${committeesCount} لجنة عدد الإناث ${females.length} . سيتم التوزيع بدون اشتراط وجود أنثى في كل لجنة.`);
    }
    
    if (teachingAssistants.length < committeesCount) {
        alert(`تنبيه: يوجد ${committeesCount} لجنة عدد المعيدون ${teachingAssistants.length} . سيتم التوزيع بدون اشتراط وجود معيد في كل لجنة.`);
    }
    
    let pool = shuffle([...selected]);
    const committees = mins.map((n, i) => {
        const locationSelect = document.querySelectorAll(".location")[i];
        const location = locationSelect ? locationSelect.value : "";
        return { members: [], location: location, minRequired: n };
    });
    
    // توزيع الإناث أولاً
    for (let i = 0; i < committees.length && females.length > 0; i++) {
        const femaleIndex = Math.floor(Math.random() * females.length);
        const female = females[femaleIndex];
        const poolIndex = pool.findIndex(e => e.id === female.id);
        
        if (poolIndex !== -1) {
            committees[i].members.push(pool.splice(poolIndex, 1)[0]);
            females.splice(femaleIndex, 1);
        }
    }
    
    // توزيع المعيدين
    for (let i = 0; i < committees.length && teachingAssistants.length > 0; i++) {
        const hasTeachingAssistant = committees[i].members.some(m => m.role === 'معيد');
        
        if (!hasTeachingAssistant) {
            const taIndex = Math.floor(Math.random() * teachingAssistants.length);
            const ta = teachingAssistants[taIndex];
            const poolIndex = pool.findIndex(e => e.id === ta.id);
            
            if (poolIndex !== -1) {
                committees[i].members.push(pool.splice(poolIndex, 1)[0]);
                teachingAssistants.splice(taIndex, 1);
            }
        }
    }
    
    // إكمال الحد الأدنى لكل لجنة
    committees.forEach(committee => {
        while (committee.members.length < committee.minRequired && pool.length > 0) {
            committee.members.push(pool.shift());
        }
    });
    
    // توزيع الفائض
    if (pool.length > 0) {
        const distributeExtra = confirm("هناك فائض في عدد المراقبين (" + pool.length + ")، هل تريد توزيعهم على اللجان؟");
        
        if (distributeExtra) {
            let i = 0;
            while (pool.length) {
                committees[i % committees.length].members.push(pool.shift());
                i++;
            }
        }
    }
    
    currentDistribution = {
        committees: committees,
        period: document.getElementById("period").value,
        date: document.getElementById("examDate").value,
        totalMembers: selected.length
    };
    
    displayResults(committees);
}

function displayResults(committees) {
    let out = `
    <div class="alert">
        <strong>ملخص التوزيع:</strong><br>
        الفترة: ${document.getElementById("period").value} | 
        التاريخ: ${document.getElementById("examDate").value} | 
        عدد اللجان: ${committees.length} | 
        إجمالي المراقبين: ${currentDistribution.totalMembers}
    </div>`;
    
    committees.forEach((c, i) => {
        const femalesCount = c.members.filter(m => m.gender === 'أنثى').length;
        const teachingAssistantsCount = c.members.filter(m => m.role === 'معيد').length;
        
        out += `
        <div class="committee-block">
            <div class="committee-header">
                لجنة ${i + 1} ${c.location ? `( ${c.location} )` : ''}
                <span style="float:left;font-size:14px;">(${c.members.length} مراقب)</span>
            </div>
            <div style="font-size:12px; color:#666; margin-bottom:5px;">
               معيدون: ${teachingAssistantsCount}
            </div>
            ${c.members.map((e, j) => `${j + 1}. ${e.name} (${e.role})`).join('<br>')}
        </div>`;
    });
    
    document.getElementById("result").innerHTML = out;
}

// ===== وظائف PDF والطباعة =====
function exportSelectedToPDF() {
    const selected = employees.filter(e => selectedEmployeeIds.has(e.id));
    
    if (!selected.length) {
        alert("يرجى اختيار مراقبين أولاً");
        return;
    }
    
    const printWindow = window.open('', '_blank');
    let employeesHTML = '';
    
    selected.forEach((employee, index) => {
        employeesHTML += `
        <tr>
            <td>${index + 1}</td>
            <td>${employee.name}</td>
            <td>${employee.role}</td>
            <td>${employee.department || '-'}</td>
        </tr>`;
    });
    
    printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <title>تقرير المراقبين المحددين</title>
        <style>
            body{font-family:'Segoe UI', Tahoma, sans-serif; padding:20px; color:#333;}
            .header{text-align:center; border-bottom:2px solid #1e40af; padding-bottom:15px; margin-bottom:25px;}
            .header h1{color:#1e40af; margin-bottom:5px;}
            .summary{background:#f1f5f9; padding:15px; border-radius:8px; margin-bottom:20px;}
            table{width:100%; border-collapse:collapse; margin:20px 0;}
            th, td{border:1px solid #ccc; padding:8px; text-align:center;}
            th{background:#f8fafc;}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>معهد أكتوبر العالي للهندسة والتكنولوجيا</h1>
            <h2>تقرير المراقبين المحددين</h2>
        </div>
        <div class="summary">
            <strong>تفاصيل التقرير:</strong><br>
            تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-EG')}<br>
            عدد المراقبين المحددين: ${selected.length}<br>
            الوقت: ${new Date().toLocaleTimeString('ar-EG')}
        </div>
        <h2 style="color:#075985;">قائمة المراقبين المحددين:</h2>
        <table>
            <thead>
                <tr>
                    <th>م</th><th>الاسم</th><th>الوظيفة</th><th>القسم</th>
                </tr>
            </thead>
            <tbody>${employeesHTML}</tbody>
        </table>
        <div style="margin-top:30px; padding-top:15px; border-top:1px solid #ccc; text-align:center; color:#666;">
            <p>تم الإنشاء بواسطة نظام توزيع المراقبين</p>
        </div>
    </body>
    </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

function savePDF() {
    if (!currentDistribution) {
        alert("يرجى تنفيذ التوزيع أولاً لعرض التقرير");
        return;
    }
    
    const printWindow = window.open('', '_blank');
    let committeeHTML = '';
    
    currentDistribution.committees.forEach((c, i) => {
        committeeHTML += `
        <div style="border:1px solid #666; padding:10px; margin:10px 0; border-radius:5px; background:#f9f9f9; page-break-inside: avoid;">
            <h3 style="color:#075985; margin:0 0 8px 0;">لجنة ${i + 1} ${c.location ? `- ${c.location}` : ''} (${c.members.length} مراقب)</h3>
            <p style="margin:0;">${c.members.map((e, j) => `${j + 1}. ${e.name} - ${e.role}`).join('<br>')}</p>
        </div>`;
    });
    
    const totalFemales = currentDistribution.committees.reduce((sum, c) => sum + c.members.filter(m => m.gender === 'أنثى').length, 0);
    const totalTeachingAssistants = currentDistribution.committees.reduce((sum, c) => sum + c.members.filter(m => m.role === 'معيد').length, 0);
    
    printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <title>تقرير توزيع المراقبين</title>
        <style>
            body{font-family:'Segoe UI', Tahoma, sans-serif; padding:15px; color:#333; font-size:12pt;}
            .header{text-align:center; border-bottom:2px solid #1e40af; padding-bottom:15px; margin-bottom:25px; page-break-after: avoid;}
            .header h1{color:#1e40af; margin-bottom:5px;}
            .summary{background:#f1f5f9; padding:15px; border-radius:8px; margin-bottom:20px; page-break-inside: avoid;}
            .footer{margin-top:30px; padding-top:15px; border-top:1px solid #ccc; text-align:center; color:#666; font-size:10pt; page-break-before: avoid;}
            @page {size:A4; margin:1.5cm;}
            @media print {
                .header{display:block !important;}
                h1, h2, h3{page-break-after: avoid;}
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>معهد أكتوبر العالي للهندسة والتكنولوجيا</h1>
            <h2>تقرير توزيع مراقبين الامتحانات</h2>
        </div>
        <div class="summary">
            <strong>تفاصيل الامتحان:</strong><br>
            الفترة: ${currentDistribution.period}<br>
            التاريخ: ${currentDistribution.date}<br>
            عدد اللجان: ${currentDistribution.committees.length}<br>
            إجمالي المراقبين: ${currentDistribution.totalMembers}<br>
            تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-EG')}<br>
        </div>
        <h2 style="color:#075985; page-break-before: avoid;">نتيجة التوزيع:</h2>
        ${committeeHTML}
        <div class="footer">
            <p>تم الإنشاء بواسطة نظام توزيع المراقبين - جميع الحقوق محفوظة © 2026</p>
            <p>تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</p>
        </div>
    </body>
    </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// ===== وظائف إضافية =====
function resetAll() {
    if (confirm("هل تريد إعادة تعيين جميع بيانات التوزيع؟")) {
        document.getElementById("committeeCount").value = 2;
        document.getElementById("period").selectedIndex = 0;
        setTodayDate();
        document.getElementById("search").value = "";
        document.getElementById("roleFilterDistribution").value = "";
        selectedEmployeeIds.clear();
        committeesData = [];
        buildCommittees();
        filterEmployees();
        document.getElementById("result").innerHTML = "";
        currentDistribution = null;
    }
}

function updateStatistics(employees) {
    const total = employees.length;
    const admin = employees.filter(e => e.role === 'إداري').length;
    const staff = employees.filter(e => e.role).length - admin;
    
    document.getElementById('totalEmployees').textContent = total;
    document.getElementById('adminEmployees').textContent = admin;
    document.getElementById('staffEmployees').textContent = staff;

}

function updatePlacesStatistics(places) {
    document.getElementById('totalPlaces').textContent = places.length;
}

function cleanupData() {
    if (confirm('هل تريد تنظيف جميع البيانات المكررة؟ هذا الإجراء لا يمكن التراجع عنه.')) {
        removeDuplicatesFromStorage();
        alert('✅ تم تنظيف البيانات المكررة بنجاح');
        location.reload(); // إعادة تحميل الصفحة
    }
}

// ===== تصدير البيانات للموظفين (Excel) =====
async function exportDataExcel() {
    try {
        // تحميل مكتبة SheetJS
        const XLSX = await loadSheetJS();
        
        // تحضير البيانات
        const worksheetData = employees.map(emp => ({
            'الرقم': emp.id,
            'الاسم': emp.name,
            'الوظيفة': emp.role,
            'النوع': emp.gender,
            'القسم': emp.department || '',
            'ملاحظات': emp.notes || ''
        }));
        
        // إنشاء ورقة العمل
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        
        // إنشاء المصنف
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'الموظفين');
        
        // حفظ الملف
        XLSX.writeFile(workbook, 'موظفين_المراقبة.xlsx');
        
        //alert('✅ تم تصدير البيانات إلى ملف Excel بنجاح');
    } catch (error) {
        console.error('خطأ في التصدير:', error);
        alert('حدث خطأ في التصدير. تأكد من اتصال الإنترنت.');
    }
}

// ===== تصدير البيانات للأماكن (Excel) =====
async function exportPlacesExcel() {
    try {
        const XLSX = await loadSheetJS();
        
        const worksheetData = places.map(place => ({
            'الرقم': place.id,
            'اسم المكان': place.name,
            'السعة': place.capacity || '',
            'المبنى': place.building || '',
            'الحالة': place.status,
            'ملاحظات': place.notes || ''
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'الأماكن');
        
        XLSX.writeFile(workbook, 'أماكن_اللجان.xlsx');
        
        alert('✅ تم تصدير الأماكن إلى ملف Excel بنجاح');
    } catch (error) {
        console.error('خطأ في التصدير:', error);
        alert('❌ حدث خطأ في التصدير.');
    }
}

// ===== تصدير CSV للموظفين =====
function exportDataCSV() {
    try {
        // رأس الأعمدة
        const headers = ['الرقم', 'الاسم', 'الوظيفة', 'النوع', 'القسم', 'ملاحظات'];
        
        // البيانات
        const csvData = employees.map(emp => [
            emp.id,
            `"${emp.name}"`,
            `"${emp.role}"`,
            `"${emp.gender}"`,
            `"${emp.department || ''}"`,
            `"${emp.notes || ''}"`
        ]);
        
        // إنشاء محتوى CSV
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.join(','))
        ].join('\n');
        
        // إنشاء ملف CSV
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'موظفين_المراقبة.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        //alert('✅ تم تصدير البيانات إلى ملف CSV بنجاح');
    } catch (error) {
        console.error('خطأ في تصدير CSV:', error);
        alert('حدث خطأ في التصدير.');
    }
}

// ===== تصدير CSV للأماكن =====
function exportPlacesCSV() {
    try {
        const headers = ['الرقم', 'اسم المكان', 'السعة', 'المبنى', 'الحالة', 'ملاحظات'];
        
        const csvData = places.map(place => [
            place.id,
            `"${place.name}"`,
            place.capacity || '',
            `"${place.building || ''}"`,
            `"${place.status}"`,
            `"${place.notes || ''}"`
        ]);
        
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'أماكن_اللجان.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        //alert('✅ تم تصدير الأماكن إلى ملف CSV بنجاح');
    } catch (error) {
        console.error('خطأ في تصدير CSV:', error);
        alert('حدث خطأ في التصدير.');
    }
}

// ===== تنزيل نموذج Excel للاستيراد =====
async function downloadTemplate() {
    try {
        const XLSX = await loadSheetJS();
        
        // بيانات نموذجية
        const templateData = [
            {
                'الرقم': 1,
                'الاسم': 'أحمد محمد',
                'الوظيفة': 'معيد',
                'النوع': 'ذكر',
                'القسم': 'قسم الحاسبات',
                'ملاحظات': ''
            },
            {
                'الرقم': 2,
                'اسم المكان': 'قاعة 101',
                'السعة': 50,
                'المبنى': 'المبنى الرئيسي',
                'الحالة': 'متاح',
                'ملاحظات': 'قاعة امتحانات'
            }
        ];
        
        // إنشاء ورقتين
        const employeeWorksheet = XLSX.utils.json_to_sheet([
            {
                'الرقم': '(اتركه فارغاً لتعيين رقم تلقائي)',
                'الاسم': 'أحمد محمد',
                'الوظيفة': 'معيد',
                'النوع': 'ذكر',
                'القسم': 'قسم الحاسبات',
                'ملاحظات': ''
            }
        ]);
        
        const placeWorksheet = XLSX.utils.json_to_sheet([
            {
                'الرقم': '(اتركه فارغاً لتعيين رقم تلقائي)',
                'اسم المكان': 'قاعة 101',
                'السعة': 50,
                'المبنى': 'المبنى الرئيسي',
                'الحالة': 'متاح',
                'ملاحظات': 'قاعة امتحانات'
            }
        ]);
        
        // إنشاء المصنف
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, employeeWorksheet, 'نموذج_موظفين');
        XLSX.utils.book_append_sheet(workbook, placeWorksheet, 'نموذج_أماكن');
        
        // حفظ الملف
        XLSX.writeFile(workbook, 'نموذج_استيراد_البيانات.xlsx');
        
        //alert('✅ تم تنزيل نموذج Excel للاستيراد');
    } catch (error) {
        console.error('خطأ في إنشاء النموذج:', error);
        alert('حدث خطأ. تأكد من اتصال الإنترنت.');
    }
}

