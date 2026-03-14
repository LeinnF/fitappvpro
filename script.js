// Load settings from localStorage or use defaults
const defaultSettings = {
    cal: 2500,
    protein: 140,
    carb: 350,
    fat: 70,
    water: 4
};
let target = JSON.parse(localStorage.getItem('userSettings')) || defaultSettings;

let allData = JSON.parse(localStorage.getItem('dailyData')) || {};
let today = new Date().toISOString().split('T')[0];
let currentDate = today;
let isDeleteMode = false;
let isEditMode = false;
let currentEditingFood = null;
let currentUser = null;

// Auth State Listener
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('user-info').style.display = 'flex';
        document.getElementById('user-photo').src = user.photoURL;
        document.getElementById('user-name').textContent = user.displayName;
        
        // Load data from Firebase
        loadFromFirebase();
    } else {
        currentUser = null;
        document.getElementById('login-btn').style.display = 'block';
        document.getElementById('user-info').style.display = 'none';
        
        // Load data from localStorage (guest mode)
        allData = JSON.parse(localStorage.getItem('dailyData')) || {};
        target = JSON.parse(localStorage.getItem('userSettings')) || defaultSettings;
        loadFavorites();
        updateTable(currentDate);
        renderQuickButtons();
    }
});

function login() {
    auth.signInWithPopup(provider).catch(error => {
        console.error("Login Error:", error);
        alert("Giriş yapılamadı: " + error.message);
    });
}

function logout() {
    auth.signOut().then(() => {
        location.reload(); // Clean state
    });
}

function loadFromFirebase() {
    if (!currentUser) return;
    
    // Load Daily Data
    db.collection('users').doc(currentUser.uid).collection('data').doc('dailyData').get().then(doc => {
        if (doc.exists) {
            allData = doc.data();
            // Handle migration if local is newer (optional, but let's keep it simple for now)
        } else {
            // New user or no cloud data, use local
            allData = JSON.parse(localStorage.getItem('dailyData')) || {};
        }
        if (!allData[today]) allData[today] = { foodData: [], water: 0 };
        updateTable(currentDate);
    });

    // Load Settings
    db.collection('users').doc(currentUser.uid).collection('data').doc('userSettings').get().then(doc => {
        if (doc.exists) {
            target = doc.data();
        } else {
            target = JSON.parse(localStorage.getItem('userSettings')) || defaultSettings;
        }
        updateTable(currentDate); // Refresh chart with new targets
    });

    // Load Favorites
    db.collection('users').doc(currentUser.uid).collection('data').doc('customFavorites').get().then(doc => {
        if (doc.exists) {
            const cloudFavs = doc.data();
            
            // Merge cloud favorites into memories, cloud takes priority
            for (const [name, data] of Object.entries(cloudFavs)) {
                presetFoods[name] = data;
            }
            renderQuickButtons();
        } else {
            loadFavorites();
        }
    });
}

function syncToFirebase(type, data) {
    if (!currentUser) return;
    db.collection('users').doc(currentUser.uid).collection('data').doc(type).set(data)
        .catch(err => console.error("Firebase Sync Error:", err));
}

if (!allData[today]) allData[today] = { foodData: [], water: 0 };

const presetFoods = {
    'Pankek': { cal: 1010, protein: 29.8, carb: 39.5, fat: 18, category: 'breakfast' },
    'Yumurta(L)': { cal: 90, protein: 7.5, carb: 0.3, fat: 6.5, category: 'breakfast' },
    'Tost': { cal: 920, protein: 44.5, carb: 99, fat: 39, category: 'breakfast' },
    'Menemen Harcı(350g)': { cal: 180, protein: 5.6, carb: 15, fat: 10, category: 'breakfast' },
    'Kaşar Peynir(Dilim)': { cal: 66, protein: 4.6, carb: 0.4, fat: 5, category: 'breakfast' },
    'Nescafe 3’ü 1 Arada': { cal: 81, protein: 0.51, carb: 15.6, fat: 1.94, category: 'supplements' },

    'Tam Döner': { cal: 680, protein: 32, carb: 203, fat: 13, category: 'main' },
    'Makarna(100g)': { cal: 158, protein: 5.8, carb: 30.8, fat: 0.9, category: 'main' },
    'Pilav(100g)': { cal: 132, protein: 2.9, carb: 30.9, fat: 0, category: 'main' },
    'Tavuk(100g)': { cal: 163, protein: 28, carb: 1, fat: 5.3, category: 'main' },
    'Tavuk Schnitzel(100g)': { cal: 296, protein: 10, carb: 22.5, fat: 18.5, category: 'main' },
    'Yoğurt(100g)': { cal: 46, protein: 3.4, carb: 4.1, fat: 1.5, category: 'main' },

    'Protein Tozu(25g)': { cal: 85, protein: 18.3, carb: 1.9, fat: 0.3, category: 'supplements' },
    'Creatin(5g)': { cal: 0, protein: 0, carb: 0, fat: 0, category: 'supplements' },
    'Shake': { cal: 775, protein: 40, carb: 113, fat: 18, category: 'supplements' }
};

let currentCategory = null;

document.addEventListener('DOMContentLoaded', () => {
    // Set date picker value
    const datePicker = document.getElementById('date-picker');
    if (datePicker) {
        datePicker.value = currentDate;
    }

    // Load custom favorites
    loadFavorites();

    // Initial Render
    updateTable(currentDate);
    renderQuickButtons();

    // Add default category filter
    filterCategory('breakfast');

    // Collapse input section by default (user opens when needed)
    const collapsible = document.getElementById('input-collapsible');
    const icon = document.getElementById('input-toggle-icon');
    const h2 = collapsible ? collapsible.closest('section').querySelector('h2') : null;
    if (collapsible) collapsible.classList.add('collapsed');
    if (icon) icon.classList.add('rotated');
    if (h2) h2.classList.remove('open');
});

function toggleInputSection() {
    const collapsible = document.getElementById('input-collapsible');
    const icon = document.getElementById('input-toggle-icon');
    const h2 = document.querySelector('#input-section h2');
    if (!collapsible) return;

    const isCollapsed = collapsible.classList.toggle('collapsed');
    icon.classList.toggle('rotated', isCollapsed);
    h2.classList.toggle('open', !isCollapsed);
}


/* Category Logic */
function filterCategory(category) {
    currentCategory = category;

    // Update active class
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${category}'`)) {
            btn.classList.add('active');
        }
    });

    renderQuickButtons();
}

/* Custom Dropdown Logic */
function toggleDropdown() {
    const dropdown = document.getElementById('custom-category-dropdown');
    dropdown.classList.toggle('active');
}

function selectOption(value, text) {
    // Update displayed text
    const display = document.querySelector('.dropdown-selected');
    display.textContent = text;

    // Update hidden select value
    const select = document.getElementById('food-category-input');
    select.value = value;

    // Update active class on options
    document.querySelectorAll('.dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.textContent === text) {
            opt.classList.add('selected');
        }
    });

    // Close dropdown
    toggleDropdown();
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('custom-category-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

function renderQuickButtons() {
    const container = document.querySelector('.quick-food-grid');
    container.innerHTML = ''; // Clear existing

    // If no category selected, show nothing
    if (!currentCategory) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); font-size: 0.9rem;">Lütfen bir kategori seçin.</p>';
        return;
    }

    for (const [name, data] of Object.entries(presetFoods)) {
        // Filter logic
        let shouldShow = false;

        if (currentCategory === 'favorites') {
            if (data.category === 'custom') shouldShow = true;
        } else {
            if (data.category === currentCategory) shouldShow = true;
        }

        if (shouldShow) {
            renderQuickFoodButton(name, container);
        }
    }
}

// ... existing code ...

document.getElementById('date-picker').value = today;

function changeDate() {
    currentDate = document.getElementById('date-picker').value;
    if (!allData[currentDate]) allData[currentDate] = { foodData: [], water: 0 };
    updateTable(currentDate);
}

function changeDateBy(days) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + days);
    currentDate = date.toISOString().split('T')[0];
    document.getElementById('date-picker').value = currentDate;
    changeDate();
}

function addToFavorites() {
    const name = document.getElementById('food-name').value.trim();
    const cal = parseFloat(document.getElementById('food-cal').value);
    const protein = parseFloat(document.getElementById('food-protein').value);
    const carb = parseFloat(document.getElementById('food-carb').value);
    const fat = parseFloat(document.getElementById('food-fat').value);

    if (!name || isNaN(cal) || isNaN(protein) || isNaN(carb) || isNaN(fat)) {
        alert('Lütfen tüm alanları doldurun!');
        return;
    }

    const category = document.getElementById('food-category-input').value;

    if (presetFoods[name]) {
        alert('Bu besin zaten hızlı ekle menüsünde mevcut!');
        return;
    }

    // Save with selected category
    presetFoods[name] = { cal, protein, carb, fat, category: category };

    // Save to localStorage
    const customFavorites = JSON.parse(localStorage.getItem('customFavorites')) || {};
    customFavorites[name] = { cal, protein, carb, fat, category: category };
    localStorage.setItem('customFavorites', JSON.stringify(customFavorites));

    // Cloud Sync
    syncToFirebase('customFavorites', customFavorites);

    // Update UI
    renderQuickButtons();
    // Switch to selected category so user sees the new item
    filterCategory(category);
    alert(`${name} favorilere eklendi!`);
}

function loadFavorites() {
    const customFavorites = JSON.parse(localStorage.getItem('customFavorites')) || {};
    for (const [name, data] of Object.entries(customFavorites)) {
        if (!presetFoods[name]) {
            // Use saved category or default to 'custom' if missing
            presetFoods[name] = { ...data, category: data.category || 'custom' };
        }
    }
}

function renderQuickFoodButton(name, containerElement) {
    const container = containerElement || document.querySelector('.quick-food-grid');
    const food = presetFoods[name];

    const wrapper = document.createElement('div');
    wrapper.className = 'quick-food-wrapper';

    const btn = document.createElement('button');
    btn.onclick = () => addPresetFood(name);

    let icon = 'fa-utensils';
    const lowerName = name.toLowerCase();
    if (lowerName.includes('pankek') || lowerName.includes('pan')) icon = 'fa-cookie';
    else if (lowerName.includes('tost') || lowerName.includes('ekmek')) icon = 'fa-bread-slice';
    else if (lowerName.includes('yumurta')) icon = 'fa-egg';
    else if (lowerName.includes('peynir') || lowerName.includes('kaşar')) icon = 'fa-cheese';
    else if (lowerName.includes('shake') || lowerName.includes('içecek')) icon = 'fa-blender';
    else if (lowerName.includes('kahve') || lowerName.includes('nescafe')) icon = 'fa-mug-hot';
    else if (lowerName.includes('protein') || lowerName.includes('creatin')) icon = 'fa-dumbbell';
    else if (lowerName.includes('makarna')) icon = 'fa-bowl-food';
    else if (lowerName.includes('pilav')) icon = 'fa-bowl-rice';
    else if (lowerName.includes('tavuk')) icon = 'fa-drumstick-bite';
    else if (lowerName.includes('döner') || lowerName.includes('et')) icon = 'fa-hotdog';

    const displayName = name.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ0-9])\(/g, '$1 (');

    if (food.category === 'custom') {
        icon = 'fa-star';
        btn.innerHTML = `<i class="fas ${icon}" style="color: #FBBF24;"></i> <span>${displayName}</span>`;
    } else {
        btn.innerHTML = `<i class="fas ${icon}"></i> <span>${displayName}</span>`;
    }

    wrapper.appendChild(btn);

    // Add info icon if recipe exists
    if (food.recipe) {
        const infoBtn = document.createElement('div');
        infoBtn.className = 'info-icon';
        infoBtn.innerHTML = '<i class="fas fa-info"></i>';
        infoBtn.onclick = (e) => {
            e.stopPropagation();
            showRecipePopup(name, food.recipe);
        };
        wrapper.appendChild(infoBtn);
    }

    container.appendChild(wrapper);
}

function showRecipePopup(name, recipe) {
    const popup = document.getElementById('recipe-popup');
    document.getElementById('recipe-title').textContent = name;
    document.getElementById('recipe-ingredients').textContent = recipe.ingredients;
    document.getElementById('recipe-instructions').textContent = recipe.instructions;
    popup.style.display = 'block';
}

function closeRecipePopup() {
    document.getElementById('recipe-popup').style.display = 'none';
}

/* Edit Recipe Mode */
function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('edit-mode-btn');
    const grid = document.querySelector('.quick-food-grid');

    if (isEditMode) {
        isDeleteMode = false; // Turn off delete mode if on
        document.getElementById('delete-mode-btn').classList.remove('active');
        grid.classList.remove('delete-mode');
        
        btn.classList.add('active');
        grid.classList.add('edit-mode');
    } else {
        btn.classList.remove('active');
        grid.classList.remove('edit-mode');
    }
}

function openRecipeEditor(name) {
    currentEditingFood = name;
    const food = presetFoods[name];
    const modal = document.getElementById('edit-recipe-modal');
    
    document.getElementById('recipe-edit-target').textContent = name;
    
    // Fill values
    document.getElementById('edit-cal').value = food.cal || 0;
    document.getElementById('edit-pro').value = food.protein || 0;
    document.getElementById('edit-carb').value = food.carb || 0;
    document.getElementById('edit-fat').value = food.fat || 0;
    
    document.getElementById('edit-ingredients').value = food.recipe ? food.recipe.ingredients : '';
    document.getElementById('edit-instructions').value = food.recipe ? food.recipe.instructions : '';
    
    modal.style.display = 'block';
}

function closeEditRecipeModal() {
    document.getElementById('edit-recipe-modal').style.display = 'none';
    currentEditingFood = null;
}

function saveRecipe() {
    if (!currentEditingFood) return;
    
    const cal = parseFloat(document.getElementById('edit-cal').value) || 0;
    const protein = parseFloat(document.getElementById('edit-pro').value) || 0;
    const carb = parseFloat(document.getElementById('edit-carb').value) || 0;
    const fat = parseFloat(document.getElementById('edit-fat').value) || 0;
    
    const ingredients = document.getElementById('edit-ingredients').value.trim();
    const instructions = document.getElementById('edit-instructions').value.trim();
    
    // Update memory
    presetFoods[currentEditingFood].cal = cal;
    presetFoods[currentEditingFood].protein = protein;
    presetFoods[currentEditingFood].carb = carb;
    presetFoods[currentEditingFood].fat = fat;
    
    if (ingredients || instructions) {
        presetFoods[currentEditingFood].recipe = {
            ingredients: ingredients,
            instructions: instructions
        };
    } else {
        delete presetFoods[currentEditingFood].recipe;
    }
    
    // Save to localStorage
    const customFavorites = JSON.parse(localStorage.getItem('customFavorites')) || {};
    customFavorites[currentEditingFood] = presetFoods[currentEditingFood];
    localStorage.setItem('customFavorites', JSON.stringify(customFavorites));
    
    // Cloud Sync
    syncToFirebase('customFavorites', customFavorites);
    
    closeEditRecipeModal();
    renderQuickButtons();
    alert('Besin bilgileri başarıyla güncellendi!');
}

function deleteRecipe() {
    if (!currentEditingFood) return;
    
    if (presetFoods[currentEditingFood].recipe) {
        delete presetFoods[currentEditingFood].recipe;
        
        // Update localStorage
        const customFavorites = JSON.parse(localStorage.getItem('customFavorites')) || {};
        if (customFavorites[currentEditingFood]) {
            delete customFavorites[currentEditingFood].recipe;
            localStorage.setItem('customFavorites', JSON.stringify(customFavorites));
            syncToFirebase('customFavorites', customFavorites);
        }
    }
    
    closeEditRecipeModal();
    renderQuickButtons();
    alert('Tarif silindi.');
}

function addFood() {
    const name = document.getElementById('food-name').value.trim();
    const cal = parseFloat(document.getElementById('food-cal').value);
    const protein = parseFloat(document.getElementById('food-protein').value);
    const carb = parseFloat(document.getElementById('food-carb').value);
    const fat = parseFloat(document.getElementById('food-fat').value);
    const multiplier = parseFloat(document.getElementById('food-multiplier').value) || 1;

    if (!name || isNaN(cal) || isNaN(protein) || isNaN(carb) || isNaN(fat)) {
        alert('Lütfen tüm alanları doldurun!');
        return;
    }

    allData[currentDate].foodData.push({ name, cal, protein, carb, fat, multiplier });
    saveData();
    updateTable(currentDate);
    clearFoodInputs();
}

function addPresetFood(name) {
    if (isDeleteMode) {
        deleteFavorite(name);
        return;
    }

    if (isEditMode) {
        openRecipeEditor(name);
        return;
    }

    if (!presetFoods[name]) return;
    const food = presetFoods[name];

    allData[currentDate].foodData.push({
        name,
        cal: food.cal,
        protein: food.protein,
        carb: food.carb,
        fat: food.fat,
        multiplier: 1
    });
    saveData();
    updateTable(currentDate);
}

function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;
    const btn = document.getElementById('delete-mode-btn');
    const grid = document.querySelector('.quick-food-grid');

    if (isDeleteMode) {
        isEditMode = false; // Turn off edit mode if on
        document.getElementById('edit-mode-btn').classList.remove('active');
        grid.classList.remove('edit-mode');
        
        btn.classList.add('active');
        grid.classList.add('delete-mode');
    } else {
        btn.classList.remove('active');
        grid.classList.remove('delete-mode');
    }
}

function deleteFavorite(name) {
    const customFavorites = JSON.parse(localStorage.getItem('customFavorites')) || {};

    if (customFavorites[name]) {
        if (confirm(`${name} favorilerden silinsin mi?`)) {
            // Delete from storage
            delete customFavorites[name];
            localStorage.setItem('customFavorites', JSON.stringify(customFavorites));
            
            // Cloud Sync
            syncToFirebase('customFavorites', customFavorites);

            // Delete from memory
            if (presetFoods[name]) {
                delete presetFoods[name];
            }

            // Remove from UI
            renderQuickButtons();
        }
    } else {
        alert('Bu öğe varsayılan bir besin ve silinemez. Sadece kendi eklediklerinizi silebilirsiniz.');
    }
}

function updateTable(selectedDate) {
    const tbody = document.getElementById('food-table-body');
    tbody.innerHTML = '';

    let totalCal = 0, totalProtein = 0, totalCarb = 0, totalFat = 0;

    allData[selectedDate].foodData.forEach((food, index) => {
        const cal = food.cal * food.multiplier;
        const protein = food.protein * food.multiplier;
        const carb = food.carb * food.multiplier;
        const fat = food.fat * food.multiplier;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Besin">${food.name}</td>
            <td data-label="Cal">${cal}</td>
            <td data-label="Pro">${protein.toFixed(1)}</td>
            <td data-label="Karb">${carb.toFixed(1)}</td>
            <td data-label="Yağ">${fat.toFixed(1)}</td>
            <td data-label="Por.">
                <input type="number" min="1" value="${food.multiplier}" 
                    onchange="updateMultiplier(${index}, this.value)">
            </td>
            <td data-label="Sil"><button class="delete-btn" onclick="removeFood(${index})">Sil</button></td>
        `;
        tbody.appendChild(row);

        totalCal += cal;
        totalProtein += protein;
        totalCarb += carb;
        totalFat += fat;
    });

    const water = allData[selectedDate].water || 0;
    document.getElementById('water-count').textContent = water.toFixed(1);

    animateProgressBar();


    // Update Totals (Top Row)
    document.getElementById('tot-cal').textContent = Math.round(totalCal) + ' kcal';
    document.getElementById('tot-pro').textContent = totalProtein.toFixed(1) + ' g';
    document.getElementById('tot-carb').textContent = totalCarb.toFixed(1) + ' g';
    document.getElementById('tot-fat').textContent = totalFat.toFixed(1) + ' g';

    // Update Remaining (Bottom Row)
    document.getElementById('rem-cal').textContent = Math.round(target.cal - totalCal) + ' kcal';
    document.getElementById('rem-pro').textContent = (target.protein - totalProtein).toFixed(1) + ' g';
    document.getElementById('rem-carb').textContent = (target.carb - totalCarb).toFixed(1) + ' g';
    document.getElementById('rem-fat').textContent = (target.fat - totalFat).toFixed(1) + ' g';

    updateChart(totalProtein, totalCarb, totalFat);
}

function updateChart(p, c, f) {
    const total = p + c + f;

    if (total === 0) {
        document.getElementById('circle-protein').style.strokeDasharray = "0, 100";
        document.getElementById('circle-carb').style.strokeDasharray = "0, 100";
        document.getElementById('circle-fat').style.strokeDasharray = "0, 100";
        return;
    }

    const pPct = (p / total) * 100;
    const cPct = (c / total) * 100;
    const fPct = (f / total) * 100;

    const circleP = document.getElementById('circle-protein');
    const circleC = document.getElementById('circle-carb');
    const circleF = document.getElementById('circle-fat');

    circleP.style.strokeDasharray = `${pPct}, 100`;

    circleC.style.strokeDasharray = `${cPct}, 100`;
    circleC.style.strokeDashoffset = `-${pPct}`;

    circleF.style.strokeDasharray = `${fPct}, 100`;
    circleF.style.strokeDashoffset = `-${pPct + cPct}`;
}

function updateMultiplier(index, value) {
    const multiplier = parseFloat(value);
    if (multiplier < 1 || isNaN(multiplier)) return;
    allData[currentDate].foodData[index].multiplier = multiplier;
    saveData();
    updateTable(currentDate);
}

function removeFood(index) {
    allData[currentDate].foodData.splice(index, 1);
    saveData();
    updateTable(currentDate);
}

function updateWater() {
    allData[currentDate].water = (allData[currentDate].water || 0) + 0.5;
    saveData();
    updateTable(currentDate);
}

function removeWater() {
    allData[currentDate].water = Math.max(0, (allData[currentDate].water || 0) - 0.5);
    saveData();
    updateTable(currentDate);
}
function animateProgressBar() {
    const water = allData[currentDate].water || 0;
    const percent = Math.min((water / target.water) * 100, 100);
    const bar = document.getElementById('water-progress');
    if (bar) {
        bar.style.width = percent + '%';
    }
}


function saveData() {
    localStorage.setItem('dailyData', JSON.stringify(allData));
    syncToFirebase('dailyData', allData);
}


/* AI Modal Logic */
function openAIModal() {
    const modal = document.getElementById('ai-modal');
    modal.style.display = 'flex';
    document.getElementById('ai-prompt').focus();

    // Check for API Key
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
        document.getElementById('api-key-section').style.display = 'block';
    } else {
        document.getElementById('api-key-section').style.display = 'none';
    }
}

function closeAIModal() {
    document.getElementById('ai-modal').style.display = 'none';
    document.getElementById('ai-result').style.display = 'none';
    document.getElementById('ai-prompt').value = '';
}

async function analyzeFood() {
    const promptText = document.getElementById('ai-prompt').value.trim();
    let apiKey = localStorage.getItem('geminiApiKey');
    const apiKeyInput = document.getElementById('api-key-input').value.trim();

    if (!apiKey) {
        if (apiKeyInput) {
            apiKey = apiKeyInput;
            localStorage.setItem('geminiApiKey', apiKey);
        } else {
            alert('Lütfen Gemini API anahtarınızı girin.');
            return;
        }
    }

    if (!promptText) {
        alert('Lütfen ne yediğinizi yazın.');
        return;
    }

    // Show loading
    document.getElementById('ai-loading').style.display = 'block';
    document.getElementById('analyze-btn').disabled = true;
    document.getElementById('ai-result').style.display = 'none';

    // Construct the prompt using Gemini format
    const systemPrompt = `
    Sen bir beslenme uzmanısın. Kullanıcının yazdığı yemeği analiz et ve aşağıdaki JSON formatında tek bir nesne döndür. 
    Sadece JSON döndür, başka açıklama yapma.
    Format:
    {
        "name": "Yemek Adı (Kısa ve öz)",
        "cal": toplam_kalori (sayı),
        "protein": toplam_protein_gram (sayı),
        "carb": toplam_karbonhidrat_gram (sayı),
        "fat": toplam_yag_gram (sayı)
    }
    
    Kullanıcı girdisi: "${promptText}"
    `;

    // Use confirmed working model
    const selectedModel = 'gemini-flash-lite-latest';

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: systemPrompt }]
                }]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        let textResponse = data.candidates[0].content.parts[0].text;
        // Clean markdown code blocks if present
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(textResponse);

        // Fill inputs
        document.getElementById('ai-food-name').value = result.name;
        document.getElementById('ai-food-cal').value = result.cal;
        document.getElementById('ai-food-protein').value = result.protein;
        document.getElementById('ai-food-carb').value = result.carb;
        document.getElementById('ai-food-fat').value = result.fat;

        // Show result
        document.getElementById('ai-result').style.display = 'block';

    } catch (error) {
        console.error('AI Error:', error);

        let errorMessage = 'Analiz sırasında bir hata oluştu: ' + error.message;

        // Try to list models if generateContent failed
        if (error.message.includes('not found') || error.message.includes('not supported')) {
            try {
                const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                const listData = await listResponse.json();

                if (listData.models) {
                    const validModels = listData.models
                        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                        .map(m => m.name.replace('models/', ''))
                        .join('\n');

                    errorMessage += `\n\nKullanılabilir Modeller:\n${validModels}\n\nLütfen API anahtarınızın bu modellerden birini desteklediğinden emin olun.`;
                }
            } catch (listError) {
                console.error('List Models Error:', listError);
                errorMessage += '\n(Model listesi de alınamadı.)';
            }
        }

        alert(errorMessage);

        // If error is related to key, clear it
        if (error.message.includes('API key') || error.message.includes('UNAUTHENTICATED')) {
            localStorage.removeItem('geminiApiKey');
            document.getElementById('api-key-section').style.display = 'block';
        }
    } finally {
        document.getElementById('ai-loading').style.display = 'none';
        document.getElementById('analyze-btn').disabled = false;
    }
}

function confirmAIResult() {
    const name = document.getElementById('ai-food-name').value;
    const cal = parseFloat(document.getElementById('ai-food-cal').value);
    const protein = parseFloat(document.getElementById('ai-food-protein').value);
    const carb = parseFloat(document.getElementById('ai-food-carb').value);
    const fat = parseFloat(document.getElementById('ai-food-fat').value);
    const saveFavorite = document.getElementById('ai-save-favorite').checked;

    if (!name || isNaN(cal)) {
        alert('Lütfen değerleri kontrol edin.');
        return;
    }

    // Add to daily log
    allData[currentDate].foodData.push({ name, cal, protein, carb, fat, multiplier: 1 });
    saveData();
    updateTable(currentDate);

    // Save to favorites if checked
    if (saveFavorite) {
        const customFavorites = JSON.parse(localStorage.getItem('customFavorites')) || {};
        if (!customFavorites[name] && !presetFoods[name]) {
            customFavorites[name] = { cal, protein, carb, fat, category: 'custom' };
            localStorage.setItem('customFavorites', JSON.stringify(customFavorites));

            // Update memory and UI
            presetFoods[name] = { cal, protein, carb, fat, category: 'custom' };
            renderQuickButtons();
        }
    }

    closeAIModal();
    alert('Besin eklendi!');
}

// Close modal on outside click
// Settings Modal Functions
function openSettingsModal() {
    document.getElementById('target-cal').value = target.cal;
    document.getElementById('target-pro').value = target.protein;
    document.getElementById('target-carb').value = target.carb;
    document.getElementById('target-fat').value = target.fat;
    document.getElementById('target-water').value = target.water;
    document.getElementById('settings-modal').style.display = 'block';
}

function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

function saveTargetSettings() {
    const newCal = parseInt(document.getElementById('target-cal').value);
    const newPro = parseFloat(document.getElementById('target-pro').value);
    const newCarb = parseFloat(document.getElementById('target-carb').value);
    const newFat = parseFloat(document.getElementById('target-fat').value);
    const newWater = parseFloat(document.getElementById('target-water').value);

    target = {
        ...target,
        cal: newCal,
        protein: newPro,
        carb: newCarb,
        fat: newFat,
        water: newWater
    };

    localStorage.setItem('userSettings', JSON.stringify(target));
    syncToFirebase('userSettings', target);
    updateTable(currentDate);
    closeSettingsModal();
}

window.onclick = function (event) {
    const aiModal = document.getElementById('ai-modal');
    const settingsModal = document.getElementById('settings-modal');
    if (event.target == aiModal) {
        closeAIModal();
    } else if (event.target == settingsModal) {
        closeSettingsModal();
    }
}

/* Recipe Section Logic */
function toggleRecipe(btn) {
    const recipeCard = btn.closest('.recipe');
    recipeCard.classList.toggle('active');

    // Toggle the chevron icon
    const icon = btn.querySelector('.fa-chevron-right, .fa-chevron-down');
    if (recipeCard.classList.contains('active')) {
        icon.classList.replace('fa-chevron-right', 'fa-chevron-down');
    } else {
        icon.classList.replace('fa-chevron-down', 'fa-chevron-right');
    }
}

// Global Recipes Header Toggle
const recipesHeader = document.getElementById('recipes-header');
if (recipesHeader) {
    recipesHeader.addEventListener('click', function () {
        const content = document.getElementById('recipes-content');
        const icon = this.querySelector('i');

        if (content.style.display === 'none' || content.style.display === '') {
            content.style.display = 'block';
            if (icon) icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
        } else {
            content.style.display = 'none';
            if (icon) icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        }
    });
}

// Initial Render


