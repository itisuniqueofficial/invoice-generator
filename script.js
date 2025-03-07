// Cached DOM elements
const elements = {
    companyName: document.getElementById('companyName'),
    companyAddress: document.getElementById('companyAddress'),
    clientName: document.getElementById('clientName'),
    clientAddress: document.getElementById('clientAddress'),
    invoiceDate: document.getElementById('invoiceDate'),
    taxRate: document.getElementById('taxRate'),
    discountRate: document.getElementById('discountRate'),
    paymentTerms: document.getElementById('paymentTerms'),
    notes: document.getElementById('notes'),
    itemList: document.getElementById('itemList'),
    invoicePreview: document.getElementById('invoicePreview'),
    previewCompanyName: document.getElementById('previewCompanyName'),
    previewCompanyAddress: document.getElementById('previewCompanyAddress'),
    previewClientName: document.getElementById('previewClientName'),
    previewClientAddress: document.getElementById('previewClientAddress'),
    previewNumber: document.getElementById('previewNumber'),
    previewDate: document.getElementById('previewDate'),
    previewTerms: document.getElementById('previewTerms'),
    previewItems: document.getElementById('previewItems'),
    subtotal: document.getElementById('subtotal'),
    discountAmount: document.getElementById('discountAmount'),
    taxAmount: document.getElementById('taxAmount'),
    grandTotal: document.getElementById('grandTotal'),
    previewNotes: document.getElementById('previewNotes'),
    notesContent: document.getElementById('notesContent'),
    saveNotice: document.getElementById('saveNotice')
};

// Undo/Redo Stack (limited to 20 states)
let history = [];
let historyIndex = -1;
const MAX_HISTORY = 20;

function saveState() {
    const state = getFormState();
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    history.push(state);
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
    localStorage.setItem('invoiceData', JSON.stringify(state));
    showSaveNotice();
}

function getFormState() {
    return {
        companyName: elements.companyName.value,
        companyAddress: elements.companyAddress.value,
        clientName: elements.clientName.value,
        clientAddress: elements.clientAddress.value,
        invoiceDate: elements.invoiceDate.value,
        taxRate: elements.taxRate.value,
        discountRate: elements.discountRate.value,
        paymentTerms: elements.paymentTerms.value,
        notes: elements.notes.value,
        items: Array.from(elements.itemList.querySelectorAll('.item-row')).map(row => ({
            name: row.querySelector('.item-name').value,
            hsn: row.querySelector('.hsn-code').value,
            qty: row.querySelector('.quantity').value,
            price: row.querySelector('.price').value,
        })),
    };
}

function applyState(state) {
    elements.companyName.value = state.companyName || '';
    elements.companyAddress.value = state.companyAddress || '';
    elements.clientName.value = state.clientName || '';
    elements.clientAddress.value = state.clientAddress || '';
    elements.invoiceDate.value = state.invoiceDate || '2025-03-07';
    elements.taxRate.value = state.taxRate || '';
    elements.discountRate.value = state.discountRate || '0';
    elements.paymentTerms.value = state.paymentTerms || 'Due on Receipt';
    elements.notes.value = state.notes || '';
    elements.itemList.innerHTML = '';
    state.items.forEach(item => {
        const row = createItemRow(item.name, item.hsn, item.qty, item.price);
        elements.itemList.appendChild(row);
    });
    calculateTotals();
    elements.companyName.focus();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        applyState(history[historyIndex]);
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        applyState(history[historyIndex]);
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const debouncedCalculateTotals = debounce(calculateTotals, 200);

function calculateItemTotals(items) {
    let subtotal = 0;
    items.forEach(row => {
        const qty = sanitizeNumber(row.querySelector('.quantity').value);
        const price = sanitizeNumber(row.querySelector('.price').value);
        const total = qty * price;
        row.querySelector('.item-total').value = total.toFixed(2);
        subtotal += total;
    });
    return subtotal;
}

function calculateTotals() {
    const items = elements.itemList.querySelectorAll('.item-row');
    const subtotal = calculateItemTotals(items);
    generateInvoice(subtotal);
}

function sanitizeNumber(value) {
    const num = parseFloat(value) || 0;
    return Math.min(Math.max(num, 0), 999999);
}

function createItemRow(name = '', hsn = '', qty = '', price = '') {
    const row = document.createElement('tr');
    row.className = 'item-row';
    row.setAttribute('role', 'row');
    row.innerHTML = `
        <td><input type="text" class="item-name" value="${name}" placeholder="Item name" required aria-required="true" aria-label="Item name"></td>
        <td><input type="text" class="hsn-code" value="${hsn}" placeholder="HSN/SAC" aria-label="HSN or SAC code"></td>
        <td><input type="number" class="quantity" value="${qty}" placeholder="0" min="0" max="999999" aria-label="Quantity"></td>
        <td><input type="number" class="price" value="${price}" placeholder="0.00" min="0" max="999999" step="0.01" aria-label="Unit price"></td>
        <td><input type="number" class="item-total" readonly aria-label="Item total"></td>
        <td>
            <button class="btn btn-danger" onclick="removeItem(this)" aria-label="Remove this item">X</button>
            <button class="btn btn-primary" onclick="duplicateItem(this)" aria-label="Duplicate this item">D</button>
        </td>
    `;
    attachEventListeners(row);
    return row;
}

function addItem() {
    saveState();
    const newRow = createItemRow();
    elements.itemList.appendChild(newRow);
    newRow.querySelector('.item-name').focus();
}

function duplicateItem(button) {
    saveState();
    const row = button.closest('tr');
    const newRow = row.cloneNode(true);
    elements.itemList.insertBefore(newRow, row.nextSibling);
    attachEventListeners(newRow);
    calculateTotals();
}

function removeItem(button) {
    const rows = elements.itemList.querySelectorAll('.item-row');
    if (rows.length > 1) {
        saveState();
        button.closest('tr').remove();
        calculateTotals();
    }
}

function attachEventListeners(row) {
    const inputs = row.querySelectorAll('.quantity, .price');
    inputs.forEach(input => input.oninput = debouncedCalculateTotals);
}

function clearForm() {
    saveState();
    elements.companyName.value = '';
    elements.companyAddress.value = '';
    elements.clientName.value = '';
    elements.clientAddress.value = '';
    elements.invoiceDate.value = '2025-03-07';
    elements.taxRate.value = '';
    elements.discountRate.value = '0';
    elements.paymentTerms.value = 'Due on Receipt';
    elements.notes.value = '';
    elements.itemList.innerHTML = '';
    elements.itemList.appendChild(createItemRow());
    elements.invoicePreview.style.display = 'none';
    localStorage.removeItem('invoiceData');
}

function validateField(input) {
    const errorDiv = input.nextElementSibling && input.nextElementSibling.className === 'error-message' 
        ? input.nextElementSibling 
        : document.createElement('div');
    errorDiv.className = 'error-message';
    const value = input.type === 'number' ? parseFloat(input.value) : input.value;
    if (!input.value && input.required) {
        input.style.borderColor = '#e74c3c';
        errorDiv.textContent = `${input.previousElementSibling.textContent} is required.`;
    } else if (input.type === 'number' && (value < 0 || value > parseFloat(input.max))) {
        input.style.borderColor = '#e74c3c';
        errorDiv.textContent = `Value must be between ${input.min} and ${input.max}.`;
    } else if (input.type === 'date' && (value < input.min || value > input.max)) {
        input.style.borderColor = '#e74c3c';
        errorDiv.textContent = 'Date must be between 2000 and 2100.';
    } else {
        input.style.borderColor = '#e0e6ed';
        errorDiv.textContent = '';
    }
    if (!input.nextElementSibling || input.nextElementSibling.className !== 'error-message') {
        input.parentNode.appendChild(errorDiv);
    }
    return !errorDiv.textContent;
}

function showAlert(message) {
    const alert = document.createElement('div');
    alert.className = 'alert';
    alert.textContent = message;
    document.body.appendChild(alert);
    alert.onclick = () => alert.remove();
    setTimeout(() => alert.remove(), 5000);
}

function showSaveNotice() {
    elements.saveNotice.classList.add('visible');
    setTimeout(() => elements.saveNotice.classList.remove('visible'), 2000);
}

function generateInvoice(subtotal = 0) {
    const requiredFields = document.querySelectorAll('[required]');
    let isValid = true;
    requiredFields.forEach(field => {
        if (!validateField(field)) isValid = false;
    });

    if (!isValid) {
        showAlert('Please correct all errors before generating the invoice.');
        return;
    }

    const companyName = elements.companyName.value || 'Your Company';
    const companyAddress = elements.companyAddress.value || 'Company Address';
    const clientName = elements.clientName.value || 'Client Name';
    const clientAddress = elements.clientAddress.value || 'Client Address';
    const invoiceDate = elements.invoiceDate.value;
    const taxRate = sanitizeNumber(elements.taxRate.value);
    const discountRate = sanitizeNumber(elements.discountRate.value);
    const paymentTerms = elements.paymentTerms.value;
    const notes = elements.notes.value;
    const invoiceNumber = Math.floor(Date.now() / 1000);
    const items = elements.itemList.querySelectorAll('.item-row');

    let previewItems = '';
    items.forEach(item => {
        const name = item.querySelector('.item-name').value || 'Unnamed Item';
        const hsn = item.querySelector('.hsn-code').value || '-';
        const qty = sanitizeNumber(item.querySelector('.quantity').value);
        const price = sanitizeNumber(item.querySelector('.price').value);
        const itemTotal = qty * price;
        previewItems += `
            <tr role="row">
                <td>${name}</td>
                <td>${hsn}</td>
                <td>${qty}</td>
                <td>₹${price.toFixed(2)}</td>
                <td>₹${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    const discountAmount = subtotal * (discountRate / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const grandTotal = taxableAmount + taxAmount;

    elements.previewCompanyName.textContent = companyName;
    elements.previewCompanyAddress.innerHTML = companyAddress.replace(/\n/g, '<br>');
    elements.previewClientName.textContent = clientName;
    elements.previewClientAddress.innerHTML = clientAddress.replace(/\n/g, '<br>');
    elements.previewNumber.innerHTML = `Invoice #: ${invoiceNumber}`;
    elements.previewDate.innerHTML = `Date: ${invoiceDate}`;
    elements.previewTerms.innerHTML = `Terms: ${paymentTerms}`;
    elements.previewItems.innerHTML = previewItems;
    elements.subtotal.innerHTML = `Subtotal: ₹${subtotal.toFixed(2)}`;
    elements.discountAmount.innerHTML = `Discount (${discountRate}%): ₹${discountAmount.toFixed(2)}`;
    elements.taxAmount.innerHTML = `Tax (${taxRate}%): ₹${taxAmount.toFixed(2)}`;
    elements.grandTotal.innerHTML = `Grand Total: ₹${grandTotal.toFixed(2)}`;
    
    if (notes) {
        elements.previewNotes.style.display = 'block';
        elements.notesContent.innerHTML = notes.replace(/\n/g, '<br>');
    } else {
        elements.previewNotes.style.display = 'none';
    }

    elements.invoicePreview.style.display = 'block';
    window.scrollTo({ top: elements.invoicePreview.offsetTop, behavior: 'smooth' });
}

function printInvoice() {
    window.print();
}

function loadFormData() {
    const savedData = JSON.parse(localStorage.getItem('invoiceData'));
    if (savedData) {
        applyState(savedData);
        history = [savedData];
        historyIndex = 0;
    }
}

// Event Listeners
const inputs = document.querySelectorAll('input, textarea, select');
inputs.forEach(input => {
    input.addEventListener('input', () => {
        validateField(input);
        saveState();
    });
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        generateInvoice();
    } else if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        printInvoice();
    } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
    }
});

window.addEventListener('load', () => {
    loadFormData();
    elements.itemList.querySelectorAll('.item-row').forEach(attachEventListeners);
});