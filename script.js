document.addEventListener('DOMContentLoaded', () => {
    // --- Constants & Config ---
    const TARGETS = {
        cal: 2700,
        protein: 150,
        carb: 350,
        fat: 70,
        water: 4
    };

    const PRESET_FOODS = {
        'Pankek': { cal: 1010, protein: 29.8, carb: 39.5, fat: 18, icon: 'fa-bread-slice' },
        'Tost': { cal: 920, protein: 44.5, carb: 99, fat: 39, icon: 'fa-bread-slice' },
        'Menemen Harcı(350g)': { cal: 180, protein: 5.6, carb: 15, fat: 10, icon: 'fa-utensils' },
        'Yumurta(L)': { cal: 90, protein: 7.5, carb: 0.3, fat: 6.5, icon: 'fa-egg' },
        'Kaşar Peynir(Dilim)': { cal: 66, protein: 4.6, carb: 0.4, fat: 5, icon: 'fa-cheese' },
        'Tam Döner': { cal: 680, protein: 32, carb: 203, fat: 13, icon: 'fa-utensils' },
        'Makarna(100g)': { cal: 158, protein: 5.8, carb: 30.8, fat: 0.9, icon: 'fa-utensils' },
        'Pilav(100g)': { cal: 132, protein: 2.9, carb: 30.9, fat: 0, icon: 'fa-utensils' },
        'Tavuk(100g)': { cal: 163, protein: 28, carb: 1, fat: 5.3, icon: 'fa-drumstick-bite' },
        'Tavuk Schnitzel(100g)': { cal: 296, protein: 10, carb: 22.5, fat: 18.5, icon: 'fa-drumstick-bite' },
        'Yoğurt(100g)': { cal: 46, protein: 3.4, carb: 4.1, fat: 1.5, icon: 'fa-utensils' },
        'Shake': { cal: 775, protein: 40, carb: 113, fat: 18, icon: 'fa-blender' },
        'Nescafe 3’ü 1 Arada': { cal: 81, protein: 0.51, carb: 15.6, fat: 1.94, icon: 'fa-mug-hot' },
        'Protein Tozu(25g)': { cal: 85, protein: 18.3, carb: 1.9, fat: 0.3, icon: 'fa-dumbbell' },
        'Creatin(5g)': { cal: 0, protein: 0, carb: 0, fat: 0, icon: 'fa-dumbbell' }
    };

    // --- State Management ---
    let allData = JSON.parse(localStorage.getItem('dailyData')) || {};
    const today = new Date().toISOString().split('T')[0];
    let currentDate = today;

    // Ensure today's entry exists
    if (!allData[today]) {
        allData[today] = { foodData: [], water: 0 };
    }

    // --- UI Elements ---
    const elements = {
        datePicker: document.getElementById('date-picker'),
        foodName: document.getElementById('food-name'),
        foodCal: document.getElementById('food-cal'),
        foodProtein: document.getElementById('food-protein'),
        foodCarb: document.getElementById('food-carb'),
        foodFat: document.getElementById('food-fat'),
        foodMultiplier: document.getElementById('food-multiplier'),
        addFoodBtn: document.getElementById('add-food-btn'),
        quickFoodContainer: document.getElementById('quick-food-container'),
        tableBody: document.getElementById('food-table-body'),
        totals: document.getElementById('totals'),
        remaining: document.getElementById('remaining'),
        waterTotal: document.getElementById('water-total'),
        waterProgress: document.getElementById('water-progress'),
        addWaterBtn: document.getElementById('add-water-btn'),
        removeWaterBtn: document.getElementById('remove-water-btn'),
        recipesHeader: document.getElementById('recipes-header'),
        recipesContent: document.getElementById('recipes-content'),
        recipesIcon: document.getElementById('recipes-icon')
    };

    // --- Initialization ---
    elements.datePicker.value = currentDate;
    renderQuickFoodButtons();
    updateUI();

    // --- Event Listeners ---
    elements.datePicker.addEventListener('change', (e) => {
        currentDate = e.target.value;
        if (!allData[currentDate]) {
            allData[currentDate] = { foodData: [], water: 0 };
        }
        updateUI();
    });

    elements.addFoodBtn.addEventListener('click', handleAddFood);

    elements.addWaterBtn.addEventListener('click', () => updateWater(0.5));
    elements.removeWaterBtn.addEventListener('click', () => updateWater(-0.5));

    elements.recipesHeader.addEventListener('click', toggleRecipes);

    document.querySelectorAll('.recipe-toggle').forEach(btn => {
        btn.addEventListener('click', function () {
            const content = this.nextElementSibling;
            const icon = this.querySelector('i');
            content.classList.toggle('open');

            if (content.classList.contains('open')) {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            } else {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            }
        });
    });

    // --- Functions ---

    function renderQuickFoodButtons() {
        elements.quickFoodContainer.innerHTML = '';
        Object.keys(PRESET_FOODS).forEach(name => {
            const food = PRESET_FOODS[name];
            const btn = document.createElement('button');
            const iconClass = food.icon || 'fa-utensils';
            btn.innerHTML = `<i class="fas ${iconClass}"></i> ${name}`;
            btn.addEventListener('click', () => addPresetFood(name));
            elements.quickFoodContainer.appendChild(btn);
        });
    }

    function handleAddFood() {
        const name = elements.foodName.value.trim();
        const cal = parseFloat(elements.foodCal.value);
        const protein = parseFloat(elements.foodProtein.value);
        const carb = parseFloat(elements.foodCarb.value);
        const fat = parseFloat(elements.foodFat.value);
        const multiplier = parseFloat(elements.foodMultiplier.value) || 1;

        if (!name || isNaN(cal) || isNaN(protein) || isNaN(carb) || isNaN(fat)) {
            alert('Lütfen tüm alanları doldurun!');
            return;
        }

        addFoodEntry({ name, cal, protein, carb, fat, multiplier });
        clearInputs();
    }

    function addPresetFood(name) {
        if (!PRESET_FOODS[name]) return;
        const food = PRESET_FOODS[name];
        addFoodEntry({
            name,
            cal: food.cal,
            protein: food.protein,
            carb: food.carb,
            fat: food.fat,
            multiplier: 1
        });
    }

    function addFoodEntry(foodItem) {
        allData[currentDate].foodData.push(foodItem);
        saveData();
        updateUI();
    }

    function removeFood(index) {
        if (confirm('Bu besini silmek istediğinize emin misiniz?')) {
            allData[currentDate].foodData.splice(index, 1);
            saveData();
            updateUI();
        }
    }

    // Expose removeFood to global scope for inline onclick (or better, use event delegation on table)
    // Using delegation on table body:
    elements.tableBody.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) {
            const index = e.target.closest('.delete-btn').dataset.index;
            removeFood(index);
        }
    });

    // Delegate change event for multiplier inputs
    elements.tableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('multiplier-input')) {
            const index = e.target.dataset.index;
            const newVal = parseFloat(e.target.value);
            if (newVal > 0) {
                updateMultiplier(index, newVal);
            }
        }
    });

    function updateMultiplier(index, value) {
        allData[currentDate].foodData[index].multiplier = value;
        saveData();
        updateUI();
    }

    function updateWater(amount) {
        const currentWater = allData[currentDate].water || 0;
        const newWater = Math.max(0, currentWater + amount);
        allData[currentDate].water = newWater;
        saveData();
        updateUI();
    }

    function saveData() {
        localStorage.setItem('dailyData', JSON.stringify(allData));
    }

    function updateUI() {
        renderTable();
        updateSummaries();
        updateWaterProgress();
    }

    function renderTable() {
        elements.tableBody.innerHTML = '';
        const data = allData[currentDate].foodData;

        data.forEach((food, index) => {
            const totalCal = Math.round(food.cal * food.multiplier);
            const totalProtein = (food.protein * food.multiplier).toFixed(1);
            const totalCarb = (food.carb * food.multiplier).toFixed(1);
            const totalFat = (food.fat * food.multiplier).toFixed(1);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Besin">${food.name}</td>
                <td data-label="Kalori">${totalCal}</td>
                <td data-label="Protein">${totalProtein}</td>
                <td data-label="Karb.">${totalCarb}</td>
                <td data-label="Yağ">${totalFat}</td>
                <td data-label="Porsiyon">
                    <input type="number" step="0.1" min="0.1" value="${food.multiplier}" 
                        class="multiplier-input" data-index="${index}">
                </td>
                <td data-label="İşlem">
                    <button class="delete-btn" data-index="${index}" style="background-color: #dc3545; padding: 5px 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            elements.tableBody.appendChild(row);
        });
    }

    function updateSummaries() {
        let totalCal = 0, totalProtein = 0, totalCarb = 0, totalFat = 0;

        allData[currentDate].foodData.forEach(food => {
            totalCal += food.cal * food.multiplier;
            totalProtein += food.protein * food.multiplier;
            totalCarb += food.carb * food.multiplier;
            totalFat += food.fat * food.multiplier;
        });

        const water = allData[currentDate].water || 0;

        elements.totals.innerHTML = `
            <span style="color: var(--primary-color);">Toplam:</span> 
            ${Math.round(totalCal)} kcal | 
            P: ${totalProtein.toFixed(1)}g | 
            K: ${totalCarb.toFixed(1)}g | 
            Y: ${totalFat.toFixed(1)}g
        `;

        elements.remaining.innerHTML = `
            <span style="color: var(--accent-color);">Kalan:</span> 
            ${Math.round(TARGETS.cal - totalCal)} kcal | 
            P: ${(TARGETS.protein - totalProtein).toFixed(1)}g | 
            K: ${(TARGETS.carb - totalCarb).toFixed(1)}g | 
            Y: ${(TARGETS.fat - totalFat).toFixed(1)}g
        `;

        elements.waterTotal.innerHTML = `Su: ${water.toFixed(1)} L / ${TARGETS.water} L`;
    }

    function updateWaterProgress() {
        const water = allData[currentDate].water || 0;
        const percent = Math.min((water / TARGETS.water) * 100, 100);
        elements.waterProgress.style.width = `${percent}%`;
    }

    function toggleRecipes() {
        elements.recipesContent.classList.toggle('open');
        if (elements.recipesContent.classList.contains('open')) {
            elements.recipesIcon.classList.remove('fa-chevron-down');
            elements.recipesIcon.classList.add('fa-chevron-up');
        } else {
            elements.recipesIcon.classList.remove('fa-chevron-up');
            elements.recipesIcon.classList.add('fa-chevron-down');
        }
    }

    function clearInputs() {
        elements.foodName.value = '';
        elements.foodCal.value = '';
        elements.foodProtein.value = '';
        elements.foodCarb.value = '';
        elements.foodFat.value = '';
        elements.foodMultiplier.value = '1';
    }

    // --- AI Feature Logic ---
    const aiModal = document.getElementById('ai-modal');
    const scanBtn = document.getElementById('scan-food-btn');
    const closeBtn = document.querySelector('.close-modal');
    const apiKeySection = document.getElementById('api-key-section');
    const imageSection = document.getElementById('image-section');
    const loadingSection = document.getElementById('loading-section');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const galleryBtn = document.getElementById('gallery-btn');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const analyzeBtn = document.getElementById('analyze-btn');

    let currentBase64Image = null;

    // Open Modal
    scanBtn.addEventListener('click', () => {
        aiModal.style.display = 'flex';
        checkApiKey();
    });

    // Close Modal
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === aiModal) closeModal();
    });

    function closeModal() {
        aiModal.style.display = 'none';
        resetModal();
    }

    function checkApiKey() {
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            apiKeySection.style.display = 'block';
            imageSection.style.display = 'none';
        } else {
            apiKeySection.style.display = 'none';
            imageSection.style.display = 'block';
        }
        loadingSection.style.display = 'none';
    }

    saveApiKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            checkApiKey();
        } else {
            alert('Lütfen geçerli bir API anahtarı girin.');
        }
    });

    // Image Handling
    cameraBtn.addEventListener('click', () => fileInput.click()); // Simplify: both trigger file input (mobile handles camera option)
    galleryBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                currentBase64Image = e.target.result.split(',')[1]; // Remove header
                imagePreview.src = e.target.result;
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    analyzeBtn.addEventListener('click', async () => {
        if (!currentBase64Image) return;

        imageSection.style.display = 'none';
        loadingSection.style.display = 'block';

        const apiKey = localStorage.getItem('gemini_api_key');

        try {
            const result = await analyzeImageWithGemini(apiKey, currentBase64Image);
            if (result) {
                populateForm(result);
                closeModal();
            }
        } catch (error) {
            alert('Hata: ' + error.message);
            loadingSection.style.display = 'none';
            imageSection.style.display = 'block';
        }
    });

    async function analyzeImageWithGemini(apiKey, base64Image) {
        // Denenecek modellerin listesi (Öncelik sırasına göre)
        const KNOWN_MODELS = [
            'gemini-1.5-flash-001',      // En güncel ve hızlı
            'gemini-1.5-flash',          // Alias
            'gemini-1.5-pro-001',        // Pro versiyon
            'gemini-1.5-pro',            // Pro Alias
            'gemini-pro-vision',         // Eski görsel modeli
        ];

        let lastError = null;

        loadingSection.innerHTML = '<div class="spinner"></div><p>Uygun AI modeli ile deneniyor...</p>';

        for (const modelName of KNOWN_MODELS) {
            try {
                // console.log(`Model deneniyor: ${modelName}`); // Debug için
                const result = await attemptAnalysis(apiKey, base64Image, modelName);
                if (result) return result;
            } catch (error) {
                console.warn(`Model başarısız (${modelName}):`, error.message);
                lastError = error;
                // Bir sonraki modele geç
            }
        }

        // Hiçbiri çalışmazsa
        throw new Error('Hiçbir yapay zeka modeli ile sonuç alınamadı. Lütfen API anahtarınızı kontrol edin veya daha sonra deneyin.\nSon Hata: ' + (lastError?.message || 'Bilinmiyor'));
    }

    async function attemptAnalysis(apiKey, base64Image, modelName) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const prompt = `
            Analyze this food image. Identify the main food item and estimate its nutritional values for the visible portion.
            Return ONLY a JSON object (no markdown, no extra text) with these keys:
            - name (string, in Turkish)
            - cal (number, total calories)
            - protein (number, grams)
            - carb (number, grams)
            - fat (number, grams)
            
            Example: {"name": "Izgara Tavuk", "cal": 250, "protein": 30, "carb": 5, "fat": 10}
        `;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                    ]
                }]
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            // 404 (Model yok) veya 400 (Desteklenmiyor) ise hata fırlat ki döngü devam etsin
            throw new Error(errData.error?.message || `API Hatası: ${response.status}`);
        }

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('Model boş sonuç döndürdü.');
        }

        const text = data.candidates[0].content.parts[0].text;
        const jsonStr = text.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    }

    function populateForm(data) {
        elements.foodName.value = data.name || '';
        elements.foodCal.value = data.cal || '';
        elements.foodProtein.value = data.protein || '';
        elements.foodCarb.value = data.carb || '';
        elements.foodFat.value = data.fat || '';
        elements.foodMultiplier.value = '1';
    }

    function resetModal() {
        fileInput.value = '';
        currentBase64Image = null;
        previewContainer.style.display = 'none';
        imagePreview.src = '';
    }
});
