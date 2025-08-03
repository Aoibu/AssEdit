// تحسين تجربة المستخدم
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const submitBtn = document.getElementById('submitBtn');
    const fileInput = document.getElementById('file');
    
    // معالجة رفع الملف
    if (uploadForm && submitBtn) {
        uploadForm.addEventListener('submit', function(e) {
            const file = fileInput.files[0];
            
            // التحقق من وجود ملف
            if (!file) {
                e.preventDefault();
                showAlert('يرجى اختيار ملف أولاً', 'error');
                return;
            }
            
            // التحقق من نوع الملف
            if (!file.name.toLowerCase().endsWith('.ass')) {
                e.preventDefault();
                showAlert('يجب أن يكون الملف من نوع .ass فقط', 'error');
                return;
            }
            
            // التحقق من حجم الملف (16MB)
            const maxSize = 16 * 1024 * 1024;
            if (file.size > maxSize) {
                e.preventDefault();
                showAlert('حجم الملف كبير جداً. الحد الأقصى المسموح هو 16 ميجابايت', 'error');
                return;
            }
            
            // إظهار حالة التحميل
            showLoadingState();
        });
    }
    
    // معالجة سحب وإفلات الملفات
    const fileInputContainer = fileInput?.parentElement;
    if (fileInputContainer) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileInputContainer.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            fileInputContainer.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            fileInputContainer.addEventListener(eventName, unhighlight, false);
        });
        
        fileInputContainer.addEventListener('drop', handleDrop, false);
    }
    
    // تحديث معلومات الملف عند الاختيار
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                updateFileInfo(file);
            }
        });
    }
    
    // إغلاق التنبيهات تلقائياً
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        if (!alert.querySelector('.btn-close')) {
            setTimeout(() => {
                fadeOut(alert);
            }, 5000);
        }
    });
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    e.target.closest('.form-control').classList.add('drag-highlight');
}

function unhighlight(e) {
    e.target.closest('.form-control').classList.remove('drag-highlight');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    const fileInput = document.getElementById('file');
    
    if (files.length > 0 && fileInput) {
        fileInput.files = files;
        updateFileInfo(files[0]);
    }
}

function updateFileInfo(file) {
    const formText = document.querySelector('.form-text');
    if (formText) {
        const size = formatFileSize(file.size);
        const isValid = file.name.toLowerCase().endsWith('.ass');
        const validityIcon = isValid ? 
            '<i class="fas fa-check-circle text-success me-1"></i>' : 
            '<i class="fas fa-exclamation-triangle text-danger me-1"></i>';
        
        formText.innerHTML = `
            ${validityIcon}
            <strong>${file.name}</strong> (${size})
            ${isValid ? '- ملف صالح' : '- نوع ملف غير صحيح'}
        `;
        
        if (!isValid) {
            formText.classList.add('text-danger');
        } else {
            formText.classList.remove('text-danger');
            formText.classList.add('text-success');
        }
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 بايت';
    
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showLoadingState() {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        if (btnText && btnLoading) {
            btnText.classList.add('d-none');
            btnLoading.classList.remove('d-none');
            submitBtn.setAttribute('disabled', 'disabled');
        }
    }
}

function showAlert(message, type = 'info') {
    const alertContainer = document.createElement('div');
    alertContainer.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    alertContainer.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const cardBody = document.querySelector('.card-body');
    if (cardBody) {
        cardBody.insertBefore(alertContainer, cardBody.firstChild);
        
        // إغلاق تلقائي بعد 5 ثوان
        setTimeout(() => {
            fadeOut(alertContainer);
        }, 5000);
    }
}

function fadeOut(element) {
    element.style.transition = 'opacity 0.5s';
    element.style.opacity = '0';
    setTimeout(() => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }, 500);
}

// تحسين تجربة التنقل
window.addEventListener('beforeunload', function(e) {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn && submitBtn.hasAttribute('disabled')) {
        e.preventDefault();
        e.returnValue = 'جاري معالجة الملف. هل أنت متأكد من إغلاق الصفحة؟';
    }
});

// تحسين الأداء - تأخير تحديث النماذج
let debounceTimer;
function debounce(func, delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(func, delay);
}

// إضافة ستايلات ديناميكية للسحب والإفلات
const style = document.createElement('style');
style.textContent = `
    .drag-highlight {
        border-color: var(--bs-primary) !important;
        box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25) !important;
        background-color: rgba(13, 110, 253, 0.05) !important;
    }
`;
document.head.appendChild(style);
