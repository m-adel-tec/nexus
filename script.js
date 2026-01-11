// ===== نظام إدارة الموظفين والأماكن =====
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

function saveEmployeesToStorage(employees) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    updateStatistics(employees);
}

function savePlacesToStorage(places) {
    localStorage.setItem(PLACES_STORAGE_KEY, JSON.stringify(places));
    updatePlacesStatistics(places);
}

// ===== تهيئة التطبيق =====
document.addEventListener('DOMContentLoaded', function() {
    employees = loadEmployeesFromStorage();
    places = loadPlacesFromStorage();
    
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

// ===== استيراد وتصدير البيانات =====
function exportData() {
    const dataStr = JSON.stringify(employees, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'موظفين_المراقبة.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function exportPlacesData() {
    const dataStr = JSON.stringify(places, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'أماكن_اللجان.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedData)) {
                throw new Error('تنسيق الملف غير صحيح');
            }
            
            // التحقق من صحة البيانات
            const isValid = importedData.every(item => item.name && item.role && item.gender);
            if (!isValid) {
                alert('الملف يحتوي على بيانات غير صالحة');
                return;
            }
            
            if (confirm(`سيتم استيراد ${importedData.length} موظف. سيتم حذف جميع البيانات الحالية! هل تريد المتابعة؟`)) {
                // أولاً: نمسح كل الموظفين الحاليين
                employees = [];
                
                // نبدأ الـID من 1 تاني
                let nextId = 1;
                
                importedData.forEach(item => {
                    // نعطي ID جديد
                    item.id = nextId++;
                    
                    // نضيف حقل isActive لو مش موجود
                    if (item.isActive === undefined) {
                        item.isActive = true;
                    }
                    
                    employees.push(item);
                });
                
                // نحفظ ونحدث العرض
                saveEmployeesToStorage(employees);
                loadEmployeeList();
                filterEmployees();
                showMessage(`تم استيراد ${importedData.length} موظف بنجاح`, 'success');
            }
        } catch (error) {
            alert('خطأ في قراءة الملف: ' + error.message);
        }
    };
    
    reader.readAsText(file);
    input.value = '';
}

function importPlacesData(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedData)) {
                throw new Error('تنسيق الملف غير صحيح');
            }
            
            // التحقق من البيانات الأساسية
            const isValid = importedData.every(item => item.name);
            if (!isValid) {
                alert('الملف يحتوي على بيانات غير صالحة');
                return;
            }
            
            if (confirm(`سيتم استيراد ${importedData.length} مكان. سيتم حذف جميع الأماكن الحالية! هل تريد المتابعة؟`)) {
                // أولاً: نمسح كل الأماكن الحالية
                places = [];
                
                // نبدأ الـID من 1 تاني
                let nextId = 1;
                
                importedData.forEach(item => {
                    // نعطي ID جديد
                    item.id = nextId++;
                    
                    // نضمن وجود الحقول الأساسية
                    if (item.status === undefined) {
                        item.status = 'متاح';
                    }
                    if (item.capacity === undefined) {
                        item.capacity = null;
                    }
                    if (item.building === undefined) {
                        item.building = '';
                    }
                    if (item.notes === undefined) {
                        item.notes = '';
                    }
                    
                    places.push(item);
                });
                
                // نحفظ ونحدث العرض
                savePlacesToStorage(places);
                loadPlacesList();
                buildCommittees();
                showPlaceMessage(`تم استيراد ${importedData.length} مكان بنجاح`, 'success');
            }
        } catch (error) {
            alert('خطأ في قراءة الملف: ' + error.message);
        }
    };
    
    reader.readAsText(file);
    input.value = '';
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


// ================= PROTECTION AGAINST DEVTOOLS =================
(function() {
    'use strict';
    
    // متغير لتتبع حالة الحماية
    let devToolsOpened = false;
    
    // حالة الحماية الافتراضية (تفعيل/تعطيل)
    const protectionEnabled = true;
    
    // لا تفعل الحماية في بيئة التطوير المحلي
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    if (!protectionEnabled || isLocalhost) {
        return; // لا تفعل الحماية
    }
    
    // طرق اكتشاف فتح أدوات المطورين
    function detectDevTools() {
        const threshold = 160; // العتبة لاكتشاف DevTools
        
        // الطريقة 1: الفرق بين الأبعاد الداخلية والخارجية
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        // الطريقة 2: تحقق من وجود أدوات المطورين
        const devtools = /./;
        devtools.toString = function() {
            devToolsOpened = true;
        };
        console.log('%c', devtools);
        
        // الطريقة 3: وقت التنفيذ (أدوات المطورين تبطئ التنفيذ)
        let start = performance.now();
        debugger;
        let end = performance.now();
        const debuggerTime = end - start > 100;
        
        return widthThreshold || heightThreshold || devToolsOpened || debuggerTime;
    }
    
    // إنشاء رسالة الحماية
    function createProtectionMessage() {
        const overlay = document.createElement('div');
        overlay.id = 'devtools-protection-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, #0d3b66, #1c77c3);
            color: white;
            z-index: 999999;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            text-align: center;
            padding: 20px;
            font-family: 'Cairo', sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 600px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
        `;
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-shield-alt';
        icon.style.cssText = `
            font-size: 80px;
            margin-bottom: 20px;
            color: #ff6b6b;
        `;
        
        const title = document.createElement('h1');
        title.textContent = '⚠️ الحماية مفعلة ⚠️';
        title.style.cssText = `
            font-size: 32px;
            margin-bottom: 20px;
            color: #ffd166;
        `;
        
        const message = document.createElement('p');
        message.textContent = 'عذراً، لا يمكن فتح أدوات المطورين على هذا الموقع. هذه الميزة موجودة لحماية حقوق الملكية الفكرية والمحتوى الحصري للشركة.';
        message.style.cssText = `
            font-size: 18px;
            margin-bottom: 25px;
            line-height: 1.6;
        `;
        
        const contact = document.createElement('p');
        contact.textContent = 'للتواصل أو الاستفسار: 01092217756';
        contact.style.cssText = `
            font-size: 16px;
            color: #aad4ff;
            margin-top: 20px;
        `;
        
        content.appendChild(icon);
        content.appendChild(title);
        content.appendChild(message);
        content.appendChild(contact);
        overlay.appendChild(content);
        
        return overlay;
    }
    
    // منع حق النقر بزر الماوس الأيمن
    document.addEventListener('contextmenu', function(e) {
        if (protectionEnabled && !isLocalhost) {
            e.preventDefault();
            
            // عرض رسالة تنبيه صغيرة
            const warning = document.createElement('div');
            warning.textContent = '❌ غير مسموح بنسخ المحتوى';
            warning.style.cssText = `
                position: fixed;
                top: ${e.clientY}px;
                left: ${e.clientX}px;
                background: #ff4757;
                color: white;
                padding: 8px 15px;
                border-radius: 5px;
                font-size: 14px;
                z-index: 10000;
                animation: fadeOut 2s forwards;
            `;
            
            // إضافة أنيميشن
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeOut {
                    0% { opacity: 1; transform: translateY(0); }
                    70% { opacity: 1; transform: translateY(-20px); }
                    100% { opacity: 0; transform: translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(warning);
            setTimeout(() => warning.remove(), 2000);
        }
    });
    
    // منع اختصارات لوحة المفاتيح
    document.addEventListener('keydown', function(e) {
        // منع Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, F12
        if (protectionEnabled && !isLocalhost) {
            const blockedKeys = [
                e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'),
                e.ctrlKey && (e.key === 'U' || e.key === 'u'),
                e.key === 'F12',
                e.key === 'F11' && e.ctrlKey
            ];
            
            if (blockedKeys.some(Boolean)) {
                e.preventDefault();
                
                // عرض رسالة تنبيه
                const warning = document.createElement('div');
                warning.textContent = '🚫 هذا الأمر غير مسموح به';
                warning.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #ff4757;
                    color: white;
                    padding: 15px 30px;
                    border-radius: 10px;
                    font-size: 18px;
                    z-index: 10000;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                `;
                
                document.body.appendChild(warning);
                setTimeout(() => warning.remove(), 2000);
            }
        }
    });
    
    // مراقبة فتح أدوات المطورين
    function monitorDevTools() {
        if (detectDevTools()) {
            if (!document.getElementById('devtools-protection-overlay')) {
                const overlay = createProtectionMessage();
                document.body.appendChild(overlay);
                
                // تعطيل التفاعل مع الصفحة
                document.body.style.overflow = 'hidden';
                
                // إغلاق أي DevTools مفتوحة
                setTimeout(() => {
                    window.location.href = window.location.href;
                }, 3000);
            }
        } else {
            const overlay = document.getElementById('devtools-protection-overlay');
            if (overlay) {
                overlay.remove();
                document.body.style.overflow = '';
            }
        }
    }
    
    // بدء المراقبة
    setInterval(monitorDevTools, 1000);
    
    // حماية إضافية: منع السحب والإسقاط للصور
    document.addEventListener('dragstart', function(e) {
        if (protectionEnabled && !isLocalhost && e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });
    
    // منع اختيار النصوص (اختياري)
    if (protectionEnabled && !isLocalhost) {
        document.addEventListener('selectstart', function(e) {
            e.preventDefault();
        });
        
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.msUserSelect = 'none';
        document.body.style.mozUserSelect = 'none';
    }
    
    // حماية ضد فحص العناصر عبر console
    Object.defineProperty(window, 'console', {
        get: function() {
            if (protectionEnabled && !isLocalhost) {
                return {
                    log: function() {
                        // لا تفعل شيء
                    },
                    warn: function() {
                        // لا تفعل شيء
                    },
                    error: function() {
                        // لا تفعل شيء
                    },
                    info: function() {
                        // لا تفعل شيء
                    },
                    clear: function() {
                        // لا تفعل شيء
                    }
                };
            }
            return console;
        }
    });
    
    console.log('✅ حماية الموقع مفعلة');
})();
// ================= END PROTECTION =================
