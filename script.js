const FALLBACK_COVER = '/images/book-1.jpg';

let products = [];
let cart = loadCart();
let orderPlaced = false; // показуємо "Дякуємо" після оформлення

const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const pageCategory = productsGrid ? productsGrid.getAttribute('data-page-category') : "all";
let searchQuery = "";

const prices = {
  1: 450,  2: 600,  3: 600,  4: 600,  5: 750,
  6: 500,  7: 450,  8: 400,  9: 500,  10: 400,
  11: 350, 12: 450, 13: 450, 14: 500, 15: 450,
  16: 450, 17: 450, 18: 500, 19: 450, 20: 550,
  21: 450, 22: 400, 23: 400, 24: 450, 25: 150,
  26: 400, 27: 300, 28: 300, 29: 150, 30: 400,
  31: 650, 32: 650, 33: 700, 34: 750, 35: 800,
  36: 650, 37: 650, 38: 700, 39: 900, 40: 950,
  41: 450, 42: 450, 43: 600, 44: 600, 45: 750,
  46: 800, 47: 650, 48: 700, 49: 900, 50: 1200,
  51: 450, 52: 450, 53: 450, 54: 450, 55: 450,
  56: 400, 57: 400, 58: 400, 59: 400, 60: 400,
  61: 550, 62: 450, 63: 450, 64: 450, 65: 400,
  66: 400, 67: 400, 68: 500, 69: 500, 70: 450,
  71: 250, 72: 200, 73: 250, 74: 350, 75: 300,
  76: 350, 77: 450, 78: 400, 79: 250, 80: 250,
  81: 900, 82: 900, 83: 900, 84: 900, 85: 950,
  86: 750, 87: 700, 88: 800, 89: 700, 90: 700,
  91: 700, 92: 800, 93: 800, 94: 800, 95: 800,
  96: 500, 97: 500, 98: 550, 99: 650, 100: 1400
};

/* ===================== ДОПОМІЖНІ ФУНКЦІЇ ===================== */

function loadCart() {
    try {
        const saved = JSON.parse(localStorage.getItem('endelit_cart'));
        return Array.isArray(saved) ? saved : [];
    } catch (e) {
        return [];
    }
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function formatPrice(n) {
    return n.toLocaleString('uk-UA') + ' грн';
}

// Обкладинка: поле "cover" з bd.json. Порожнє значення або шлях до папки
// (наприклад "/images/cover/") вважаємо відсутнім — показуємо запасне фото.
function getBookCoverUrl(book) {
    const cover = book && book.cover;
    if (cover && !cover.endsWith('/')) return cover;
    return FALLBACK_COVER;
}

// Якщо картинка не завантажилась або це "пустушка" 1x1 — підставляємо запасну
const IMG_FALLBACK_ATTRS =
    `onerror="this.onerror=null;this.src='${FALLBACK_COVER}'" ` +
    `onload="if(this.naturalWidth<50){this.onload=null;this.src='${FALLBACK_COVER}'}"`;

/* ===================== КАТАЛОГ ===================== */

async function fetchProducts() {
    try {
        const response = await fetch('/bd.json');
        if (!response.ok) throw new Error("Не вдалося завантажити базу книг");

        const data = await response.json();
        products = data.map(book => ({ ...book, price: prices[book.id] ?? 0 }));
        updateDisplay();
        updateCartUI(); // тепер відомі ціни та обкладинки
    } catch (error) {
        console.error(error);
        if (productsGrid) productsGrid.innerHTML = "<p>Помилка завантаження книг</p>";
    }
}

function createProductCard(product) {
    return `
        <div class="card">
            <img src="${escapeHtml(getBookCoverUrl(product))}" class="card-img-top"
                 alt="${escapeHtml(product.title)}" loading="lazy" ${IMG_FALLBACK_ATTRS}>
            <div class="card-body">
                <h5 class="card-title">${escapeHtml(product.title)}</h5>
                <p class="card-description">${escapeHtml(product.description || "")}</p>
                <p class="card-price">${formatPrice(product.price)}</p>
                <button type="button" class="add-cart" data-id="${product.id}">В кошик</button>
            </div>
        </div>
    `;
}

function displayProducts(booksToDisplay) {
    if (!productsGrid) return;

    if (booksToDisplay.length === 0) {
        productsGrid.innerHTML = '<p>Книг не знайдено</p>';
        return;
    }
    productsGrid.innerHTML = booksToDisplay.map(createProductCard).join('');
}

function filterProducts() {
    return products.filter(book => {
        const matchesCategory = (pageCategory === "all") || (book.categories === pageCategory);
        const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });
}

function updateDisplay() {
    displayProducts(filterProducts());
}

if (searchInput) {
    searchInput.addEventListener('input', (event) => {
        searchQuery = event.target.value.trim();
        updateDisplay();
    });
}

// Кнопки "В кошик" (делегування подій — працює і після перемальовування карток)
if (productsGrid) {
    productsGrid.addEventListener('click', (event) => {
        const btn = event.target.closest('.add-cart');
        if (!btn) return;

        addToCart(Number(btn.dataset.id));

        // коротке підтвердження на кнопці
        btn.textContent = 'Додано ✓';
        btn.classList.add('added');
        setTimeout(() => {
            btn.textContent = 'В кошик';
            btn.classList.remove('added');
        }, 1000);
    });
}

/* ===================== КОШИК: ДАНІ ===================== */

function saveCart() {
    localStorage.setItem('endelit_cart', JSON.stringify(cart));
    updateCartUI();
}

function addToCart(id) {
    const book = products.find(p => p.id === id);
    if (!book) return;

    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id: book.id, title: book.title, isbn: book.isbn, quantity: 1 });
    }
    saveCart();

    // невелика анімація кнопки кошика в шапці
    if (cartBtn) {
        cartBtn.classList.remove('bump');
        void cartBtn.offsetWidth; // перезапуск анімації
        cartBtn.classList.add('bump');
    }
}

function changeQuantity(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== id);
    }
    saveCart();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
}

/* ===================== КОШИК: ВІКНО ===================== */

// Вікно будується тут, тому окремий HTML не потрібен і воно однакове на всіх сторінках.
// Якщо в HTML лишився старий блок #cartModal — він просто замінюється.
function buildCartModal() {
    const old = document.getElementById('cartModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'cartModal';
    modal.className = 'cart-modal';
    modal.innerHTML = `
        <div class="cart-modal-content" role="dialog" aria-modal="true" aria-labelledby="cartTitle">
            <div class="cart-modal-header">
                <h2 id="cartTitle">Ваш кошик</h2>
                <button type="button" id="closeCartBtn" class="close-cart" aria-label="Закрити">&times;</button>
            </div>
            <div id="cartItemsContainer" class="cart-items"></div>
            <div id="cartFooter" class="cart-modal-footer">
                <div class="cart-total">
                    <span>Разом</span>
                    <strong id="cartTotal">0 грн</strong>
                </div>
                <div class="cart-actions">
                    <button type="button" id="clearCartBtn" class="clear-cart-btn">Очистити кошик</button>
                    <button type="button" id="checkoutBtn" class="checkout-btn">Оформити замовлення</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

buildCartModal();

const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartModal = document.getElementById('cartModal');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartFooter = document.getElementById('cartFooter');
const cartTotal = document.getElementById('cartTotal');
const clearCartBtn = document.getElementById('clearCartBtn');
const checkoutBtn = document.getElementById('checkoutBtn');

function openCart() {
    orderPlaced = false;
    updateCartUI();
    cartModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartModal.classList.remove('open');
    document.body.style.overflow = '';
}

function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) cartCount.textContent = totalCount;

    if (orderPlaced) {
        cartFooter.hidden = true;
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <p>Дякуємо за замовлення!</p>
                <span>Ми зв'яжемося з вами найближчим часом.</span>
                <button type="button" class="checkout-btn" data-action="close">Продовжити покупки</button>
            </div>
        `;
        return;
    }

    if (cart.length === 0) {
        cartFooter.hidden = true;
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <p>Кошик порожній</p>
                <span>Додайте книги з каталогу — вони з'являться тут.</span>
                <button type="button" class="checkout-btn" data-action="close">До каталогу</button>
            </div>
        `;
        return;
    }

    cartFooter.hidden = false;
    let total = 0;

    cartItemsContainer.innerHTML = cart.map(item => {
        const book = products.find(p => p.id === item.id);
        const title = book ? book.title : item.title;
        const unit = book ? book.price : 0;
        const sum = unit * item.quantity;
        total += sum;

        return `
            <div class="cart-item">
                <img src="${escapeHtml(getBookCoverUrl(book))}" alt="${escapeHtml(title)}" ${IMG_FALLBACK_ATTRS}>
                <div class="cart-item-details">
                    <span class="cart-item-title">${escapeHtml(title)}</span>
                    <span class="cart-item-price">${book ? formatPrice(unit) : ''}</span>
                </div>
                <div class="cart-item-controls">
                    <button type="button" data-action="dec" data-id="${item.id}" aria-label="Менше">−</button>
                    <span class="qty">${item.quantity}</span>
                    <button type="button" data-action="inc" data-id="${item.id}" aria-label="Більше">+</button>
                </div>
                <div class="cart-item-sum">${book ? formatPrice(sum) : ''}</div>
                <button type="button" class="cart-item-remove" data-action="remove" data-id="${item.id}"
                        aria-label="Видалити" title="Видалити">&times;</button>
            </div>
        `;
    }).join('');

    cartTotal.textContent = formatPrice(total);
}

/* ===================== КОШИК: ПОДІЇ ===================== */

if (cartBtn) cartBtn.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);

// клік повз вікно закриває його
cartModal.addEventListener('click', (event) => {
    if (event.target === cartModal) closeCart();
});

// Esc закриває вікно
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && cartModal.classList.contains('open')) closeCart();
});

// кнопки +, −, видалити, закрити (делегування)
cartItemsContainer.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;

    const id = Number(btn.dataset.id);
    switch (btn.dataset.action) {
        case 'inc': changeQuantity(id, 1); break;
        case 'dec': changeQuantity(id, -1); break;
        case 'remove': removeFromCart(id); break;
        case 'close': closeCart(); break;
    }
});

clearCartBtn.addEventListener('click', () => {
    cart = [];
    saveCart();
});

checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    orderPlaced = true;
    cart = [];
    saveCart();
});

/* ===================== ЗАПУСК ===================== */
updateCartUI();
fetchProducts();