const BILLING = {
    period: 'monthly',
    daysPerMonth: 30,
    dailyMultiplier: 1.35,
    dailyMin: 2
};

function roundDailyPrice(value) {
    return Math.round(value * 10) / 10;
}

function calcDailyPrice(monthlyPrice) {
    const monthly = Number(monthlyPrice);
    if (!Number.isFinite(monthly) || monthly <= 0) return 0;
    const raw = (monthly / BILLING.daysPerMonth) * BILLING.dailyMultiplier;
    return Math.max(BILLING.dailyMin, roundDailyPrice(raw));
}

function getBillingLabel(period = BILLING.period) {
    return period === 'daily' ? 'รายวัน' : 'รายเดือน';
}

function getPricePeriodSuffix(period = BILLING.period) {
    return period === 'daily' ? '/วัน' : '/เดือน';
}

function getDisplayPrice(monthlyPrice, period = BILLING.period) {
    return period === 'daily' ? calcDailyPrice(monthlyPrice) : Number(monthlyPrice);
}

function getMonthlySavingsPercent(monthlyPrice) {
    const monthly = Number(monthlyPrice);
    const daily = calcDailyPrice(monthly);
    const dailyMonthTotal = daily * BILLING.daysPerMonth;
    if (!monthly || !dailyMonthTotal) return 0;
    return Math.round(((dailyMonthTotal - monthly) / dailyMonthTotal) * 100);
}

function formatPrice(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';

    if (Number.isInteger(num)) {
        return num.toLocaleString('th-TH', { maximumFractionDigits: 0 });
    }

    return num.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function updateBillingHint() {
    const hintText = document.getElementById('billingHintText');
    const hint = document.getElementById('billingHint');
    if (!hintText || !hint) return;

    if (BILLING.period === 'monthly') {
        hintText.textContent = 'รายเดือนถูกกว่ารายวัน — เหมาะสำหรับใช้งานต่อเนื่อง';
        hint.classList.remove('billing-hint-daily');
    } else {
        hintText.textContent = 'รายวันสะดวกสำหรับทดลองหรือใช้สั้น ๆ แต่รายเดือนถูกกว่าเมื่อใช้ต่อเนื่อง';
        hint.classList.add('billing-hint-daily');
    }
}

function updatePackagePrices() {
    document.querySelectorAll('.pkg-card').forEach((card) => {
        const button = card.querySelector('.btn-cta');
        const monthlyPrice = button?.dataset.packageMonthlyPrice;
        if (!monthlyPrice) return;

        const displayPrice = getDisplayPrice(monthlyPrice);
        const priceValue = card.querySelector('[data-price-display]');
        const pricePeriod = card.querySelector('[data-price-period]');
        const priceSavings = card.querySelector('[data-price-savings]');

        if (priceValue) priceValue.textContent = formatPrice(displayPrice);
        if (pricePeriod) pricePeriod.textContent = getPricePeriodSuffix();
        if (button) button.dataset.packagePrice = String(displayPrice);

        if (priceSavings) {
            const savings = getMonthlySavingsPercent(monthlyPrice);
            if (BILLING.period === 'monthly' && savings > 0) {
                priceSavings.hidden = false;
                priceSavings.textContent = `ประหยัดกว่ารายวัน ~${savings}%`;
            } else if (BILLING.period === 'daily') {
                priceSavings.hidden = false;
                priceSavings.textContent = `รายเดือน ฿${formatPrice(monthlyPrice)} ถูกกว่า`;
            } else {
                priceSavings.hidden = true;
                priceSavings.textContent = '';
            }
        }
    });

    if (selectedOrderPackage?.monthlyPrice) {
        selectedOrderPackage.price = String(getDisplayPrice(selectedOrderPackage.monthlyPrice));
        selectedOrderPackage.billingPeriod = BILLING.period;
        updateOrderModalSummary();
        updateOrderMessage();
    }
}

function setupBillingToggle() {
    const options = document.querySelectorAll('.billing-option[data-billing]');
    if (!options.length) return;

    options.forEach((option) => {
        option.addEventListener('click', () => {
            const period = option.dataset.billing;
            if (!period || period === BILLING.period) return;

            BILLING.period = period;
            options.forEach((item) => {
                const isActive = item.dataset.billing === period;
                item.classList.toggle('active', isActive);
                item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });

            updateBillingHint();
            updatePackagePrices();
        });
    });

    updateBillingHint();
    updatePackagePrices();
}

function selectPackage(pkg) {
    document.querySelectorAll('.pkg-card').forEach((card) => {
        const isSelected = card.dataset.package === pkg;
        card.classList.toggle('selected', isSelected);

        const button = card.querySelector('.btn-cta');
        if (button) {
            button.classList.toggle('btn-cta-orange', isSelected);
        }
    });
}

function setupPackageCards() {
    document.querySelectorAll('[data-select-package]').forEach((card) => {
        card.addEventListener('click', () => {
            if (card.dataset.package) selectPackage(card.dataset.package);
        });
    });

    document.querySelectorAll('[data-order-package]').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            orderPackageFromButton(button);
        });
    });
}

let selectedOrderPackage = null;
let selectedDiscordContact = null;

function orderPackageFromButton(button) {
    const monthlyPrice = button.dataset.packageMonthlyPrice || button.dataset.packagePrice || '-';
    const type = button.dataset.packageType || 'minecraft';

    selectedOrderPackage = {
        id: button.dataset.packageId || '',
        name: button.dataset.packageName || '-',
        type: type,
        monthlyPrice,
        price: String(getDisplayPrice(monthlyPrice)),
        billingPeriod: BILLING.period,
        tier: button.dataset.packageTier || button.dataset.packageCpuModel || '-',
        cpu: button.dataset.packageCpu || '-',
        ram: button.dataset.packageRam || '-',
        storage: button.dataset.packageStorage || button.dataset.packageSsd || '-',
        backup: button.dataset.packageBackup || '-',
        specs: button.dataset.packageSpecs ? JSON.parse(button.dataset.packageSpecs) : []
    };

    if (selectedOrderPackage.id) {
        selectPackage(selectedOrderPackage.id);
    }

    selectedDiscordContact = null;
    openOrderModal();
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    const messageBox = document.getElementById('toastMessage');
    const icon = toast?.querySelector('.iconify');
    if (!toast || !messageBox) return;

    const iconMap = {
        success: 'mdi:check-circle',
        error: 'mdi:alert-circle-outline',
        info: 'mdi:information-outline',
        warning: 'mdi:alert-outline'
    };

    if (type && iconMap[type] && icon) {
        icon.setAttribute('data-icon', iconMap[type]);
    }

    toast.removeAttribute('data-toast-type');
    if (type) {
        toast.setAttribute('data-toast-type', type);
    }

    messageBox.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function setupFaqAccordion() {
    const items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    items.forEach((item) => {
        const question = item.querySelector('.faq-question');
        if (!question) return;

        question.addEventListener('click', () => {
            const isOpen = item.classList.toggle('open');
            question.setAttribute('aria-expanded', isOpen);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const selectedCard = document.querySelector('.pkg-card.selected') || document.querySelector('.pkg-card');
    if (selectedCard) {
        selectPackage(selectedCard.dataset.package);
    }

    startEventCountdown();
    setupBillingToggle();
    setupPackageCards();
    setupOrderModal();
    initTypewriter('typewriterText', null, { typeSpeed: 70, deleteSpeed: 35, pauseEnd: 2500 });
    setupNavToggle();
    setupScrollReveal();
    setupBackToTop();
    setupPackageFilter();
    setupFaqAccordion();
    highlightKeySpecs();
    initPriceCounter();
    setupLazyImages();
});

function startEventCountdown() {
    const countdown = document.querySelector('[data-countdown-date]');
    if (!countdown) return;

    const target = new Date(countdown.dataset.countdownDate).getTime();
    if (Number.isNaN(target)) return;

    const parts = {
        days: countdown.querySelector('[data-countdown-days]'),
        hours: countdown.querySelector('[data-countdown-hours]'),
        minutes: countdown.querySelector('[data-countdown-minutes]'),
        seconds: countdown.querySelector('[data-countdown-seconds]')
    };

    const update = () => {
        const distance = Math.max(0, target - Date.now());
        const days = Math.floor(distance / 86400000);
        const hours = Math.floor((distance % 86400000) / 3600000);
        const minutes = Math.floor((distance % 3600000) / 60000);
        const seconds = Math.floor((distance % 60000) / 1000);

        parts.days.textContent = String(days).padStart(2, '0');
        parts.hours.textContent = String(hours).padStart(2, '0');
        parts.minutes.textContent = String(minutes).padStart(2, '0');
        parts.seconds.textContent = String(seconds).padStart(2, '0');

        if (distance === 0) {
            countdown.classList.add('event-ended');
        }
    };

    update();
    setInterval(update, 1000);
}

function setupOrderModal() {
    document.querySelectorAll('[data-order-close]').forEach((closeButton) => {
        closeButton.addEventListener('click', closeOrderModal);
    });

    const discordButton = document.getElementById('chooseDiscordButton');
    if (discordButton) {
        discordButton.addEventListener('click', () => {
            const panel = document.getElementById('discordOrderPanel');
            if (panel) panel.hidden = false;
            renderDiscordList();
            updateOrderMessage();
        });
    }

    const copyButton = document.getElementById('copyOrderMessage');
    if (copyButton) {
        copyButton.addEventListener('click', copyOrderMessage);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeOrderModal();
        }
    });
}

function openOrderModal() {
    const modal = document.getElementById('orderModal');
    const panel = document.getElementById('discordOrderPanel');

    if (!modal || !selectedOrderPackage) return;

    updateOrderModalSummary();

    if (panel) panel.hidden = true;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    updateOrderMessage();
}

function updateOrderModalSummary() {
    const summary = document.getElementById('orderPackageSummary');
    if (!summary || !selectedOrderPackage) return;

    const periodSuffix = selectedOrderPackage.billingPeriod === 'daily' ? '/วัน' : '/เดือน';
    summary.textContent = `${selectedOrderPackage.name} • ฿${formatPrice(selectedOrderPackage.price)}${periodSuffix} (${getBillingLabel(selectedOrderPackage.billingPeriod)}) • ${selectedOrderPackage.tier}`;
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (!modal) return;

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
}

function getDiscordContacts() {
    const data = document.getElementById('discordContactsData');
    if (!data) return [];

    try {
        return JSON.parse(data.textContent || '[]');
    } catch {
        return [];
    }
}

function renderDiscordList() {
    const list = document.getElementById('discordList');
    if (!list) return;

    const contacts = getDiscordContacts();
    if (!contacts.length) {
        list.innerHTML = '<p class="empty-discord">ยังไม่ได้ตั้งค่า Discord ใน data/settings.json</p>';
        return;
    }

    list.innerHTML = '';
    contacts.forEach((contact, index) => {
        const row = document.createElement('div');
        row.className = 'discord-row';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'discord-choice';
        button.innerHTML = `
            <span class="iconify" data-icon="mdi:discord"></span>
            <span>
                <strong></strong>
                <small></small>
            </span>
        `;

        button.querySelector('strong').textContent = contact.name || `Discord ${index + 1}`;
        button.querySelector('small').textContent = contact.description || 'กดเลือกเพื่อใช้ช่องทางนี้';
        button.addEventListener('click', () => {
            selectedDiscordContact = contact;
            document.querySelectorAll('.discord-choice').forEach((choice) => choice.classList.remove('selected'));
            button.classList.add('selected');
            updateOrderMessage();
        });

        const link = document.createElement('a');
        link.className = 'discord-open-link';
        link.href = contact.url || '#';
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'เปิด';

        row.append(button, link);
        list.append(row);

        if (index === 0 && !selectedDiscordContact) {
            button.click();
        }
    });
}

function buildOrderMessage() {
    if (!selectedOrderPackage) return '';

    const pkg = selectedOrderPackage;

    const typeLabels = {
        minecraft: 'ต้องการสั่งซื้อแพ็กเกจเซิร์ฟเวอร์ Minecraft',
        webhosting: 'ต้องการสั่งซื้อแพ็กเกจ Web Hosting',
        codehosting: 'ต้องการสั่งซื้อแพ็กเกจ Code Hosting',
        codeserver: 'ต้องการสั่งซื้อแพ็กเกจ Code Server'
    };

    const intro = typeLabels[pkg.type] || typeLabels.minecraft;

    const discordLine = selectedDiscordContact?.name
        ? `ช่องทาง Discord ที่เลือก: ${selectedDiscordContact.name}`
        : 'ช่องทาง Discord ที่เลือก: ยังไม่ได้เลือก';

    const lines = [
        'สวัสดีครับ/ค่ะ ' + intro,
        '',
        'รายละเอียดแพ็กเกจ',
        `• แพ็กเกจ: ${pkg.name}`,
        `• ${pkg.type === 'minecraft' ? 'CPU Model' : 'ระดับ'}: ${pkg.tier}`,
        `• รอบบิล: ${getBillingLabel(pkg.billingPeriod)}`,
        `• ราคา: ฿${formatPrice(pkg.price)}${pkg.billingPeriod === 'daily' ? '/วัน' : '/เดือน'}`
    ];

    if (pkg.billingPeriod === 'daily') {
        lines.push(`• ราคารายเดือน (ถูกกว่า): ฿${formatPrice(pkg.monthlyPrice)}/เดือน`);
    }

    (pkg.specs || []).forEach((spec) => {
        if (spec.label !== 'CPU Model') {
            lines.push(`• ${spec.label}: ${spec.value}`);
        }
    });

    lines.push('');
    lines.push(discordLine);
    lines.push('');
    lines.push('ข้อมูลที่ขอแจ้งเพิ่มเติม');

    if (pkg.type === 'minecraft') {
        lines.push('• เวอร์ชัน Minecraft:');
        lines.push('• จำนวนผู้เล่นประมาณ:');
        lines.push('• ต้องการย้ายข้อมูลเดิมไหม:');
        lines.push('• ต้องการทดลองเครื่องก่อนชำระเงินไหม:');
    } else if (pkg.type === 'webhosting') {
        lines.push('• ชื่อโดเมนที่ต้องการใช้:');
        lines.push('• CMS หรือ framework ที่ใช้:');
        lines.push('• ต้องการย้ายข้อมูลจากโฮสต์เดิมไหม:');
    } else if (pkg.type === 'codehosting') {
        lines.push('• ภาษาที่ต้องการใช้:');
        lines.push('• GitHub/GitLab repo:');
        lines.push('• ต้องใช้ database ไหม:');
    } else if (pkg.type === 'codeserver') {
        lines.push('• จำนวนผู้ใช้ที่ต้องการ:');
        lines.push('• ภาษา/ framework ที่ใช้:');
        lines.push('• ต้องการ extensions พิเศษไหม:');
    }

    lines.push('• หมายเหตุเพิ่มเติม:');
    lines.push('');
    lines.push('รบกวนแจ้งขั้นตอนต่อไปและยอดชำระให้หน่อยครับ/ค่ะ');

    return lines.join('\n');
}

function updateOrderMessage() {
    const messageBox = document.getElementById('orderMessageBox');
    if (!messageBox) return;

    messageBox.value = buildOrderMessage();
}

async function copyOrderMessage() {
    const messageBox = document.getElementById('orderMessageBox');
    if (!messageBox) return;

    const message = messageBox.value;
    try {
        await navigator.clipboard.writeText(message);
    } catch {
        messageBox.focus();
        messageBox.select();
        document.execCommand('copy');
    }

    showToast('คัดลอกข้อความสำหรับส่งใน Discord แล้ว', 'success');
}

function setupNavToggle() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;

    const toggle = nav.querySelector('.nav-toggle');
    const links = nav.querySelector('.nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        const isOpen = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen);
        const icon = toggle.querySelector('.iconify');
        if (icon) {
            icon.setAttribute('data-icon', isOpen ? 'mdi:close' : 'mdi:menu');
        }
    });

    links.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            links.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            const icon = toggle.querySelector('.iconify');
            if (icon) {
                icon.setAttribute('data-icon', 'mdi:menu');
            }
        });
    });
}

function setupScrollReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach((el) => observer.observe(el));
}

function setupBackToTop() {
    const btn = document.querySelector('.back-to-top');
    if (!btn) return;

    const handleScroll = () => {
        btn.classList.toggle('show', window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function setupPackageFilter() {
    const bar = document.querySelector('.pkg-filter-bar');
    if (!bar) return;

    const selects = bar.querySelectorAll('.pkg-filter-select');
    const clearBtn = bar.querySelector('.pkg-filter-clear');
    const countEl = bar.querySelector('.pkg-filter-count');
    const cards = document.querySelectorAll('.pkg-card');

    function getFilterValues() {
        const values = {};
        selects.forEach((sel) => {
            if (sel.value) values[sel.dataset.filter] = sel.value;
        });
        return values;
    }

    function getSpecValue(card, label) {
        const rows = card.querySelectorAll('.spec-row');
        for (const row of rows) {
            const labelEl = row.querySelector('span:first-child');
            const valueEl = row.querySelector('.spec-value');
            if (labelEl && valueEl && labelEl.textContent.trim() === label) {
                return valueEl.textContent.trim();
            }
        }
        return '';
    }

    function getPrice(card) {
        const priceEl = card.querySelector('[data-price-display]');
        if (!priceEl) return Infinity;
        return parseFloat(priceEl.textContent.replace(/,/g, '')) || Infinity;
    }

    function applyFilters() {
        const filters = getFilterValues();
        let visibleCount = 0;

        cards.forEach((card) => {
            let match = true;

            for (const [key, value] of Object.entries(filters)) {
                if (key === 'price') {
                    const price = getPrice(card);
                    const [min, max] = value.split('-').map(Number);
                    if (!isNaN(min) && price < min) { match = false; break; }
                    if (!isNaN(max) && price > max) { match = false; break; }
                } else {
                    const specVal = getSpecValue(card, key);
                    if (!specVal.toLowerCase().includes(value.toLowerCase())) {
                        match = false;
                        break;
                    }
                }
            }

            card.classList.toggle('filter-hidden', !match);
            if (match) visibleCount++;
        });

        if (countEl) countEl.textContent = `${visibleCount} จาก ${cards.length} แพ็กเกจ`;
    }

    selects.forEach((sel) => {
        sel.addEventListener('change', applyFilters);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            selects.forEach((sel) => { sel.value = ''; });
            applyFilters();
        });
    }

    applyFilters();
}

function highlightKeySpecs() {
    const keyLabels = ['RAM', 'CPU', 'SSD', 'Storage', 'Bandwidth', 'CPU Model'];
    document.querySelectorAll('.pkg-card').forEach((card) => {
        const rows = card.querySelectorAll('.spec-row');
        rows.forEach((row) => {
            const label = row.querySelector('span:first-child')?.textContent?.trim();
            if (label && keyLabels.some((k) => label.includes(k))) {
                row.classList.add('spec-row-highlight');
            }
        });
    });
}

function initPriceCounter() {
    const priceEls = document.querySelectorAll('[data-price-display]');
    if (!priceEls.length) return;

    priceEls.forEach((el) => {
        const finalText = el.textContent;
        const finalNum = parseFloat(finalText.replace(/,/g, ''));

        if (Number.isFinite(finalNum) && finalNum > 0) {
            const duration = Math.min(600, 200 + finalNum * 2);
            const start = performance.now();

            function update(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(finalNum * eased);
                el.textContent = current.toLocaleString('th-TH');
                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    el.textContent = finalText;
                }
            }
            requestAnimationFrame(update);
        }
    });
}

function setupLazyImages() {
    const imgs = document.querySelectorAll('.pkg-img');
    if (!imgs.length) return;

    imgs.forEach((img) => {
        img.setAttribute('loading', 'lazy');
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => img.classList.add('loaded'));
            img.addEventListener('error', () => img.classList.add('loaded'));
        }
    });
}

function initTypewriter(elementId, phrases, options = {}) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const defaultPhrases = el.dataset.typewriter ? JSON.parse(el.dataset.typewriter) : null;
    const activePhrases = phrases || defaultPhrases;
    if (!activePhrases || !activePhrases.length) return;

    const { typeSpeed = 80, deleteSpeed = 40, pauseEnd = 2000 } = options;
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeout;

    const existingText = el.textContent.trim();
    if (existingText && activePhrases[0] && existingText === activePhrases[0]) {
        charIndex = existingText.length;
        isDeleting = true;
        timeout = setTimeout(type, pauseEnd);
        return () => clearTimeout(timeout);
    }

    function type() {
        const current = activePhrases[phraseIndex];

        if (isDeleting) {
            el.textContent = current.substring(0, charIndex - 1);
            charIndex--;
        } else {
            el.textContent = current.substring(0, charIndex + 1);
            charIndex++;
        }

        if (!isDeleting && charIndex === current.length) {
            isDeleting = true;
            timeout = setTimeout(type, pauseEnd);
            return;
        }

        if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % activePhrases.length;
            timeout = setTimeout(type, 500);
            return;
        }

        timeout = setTimeout(type, isDeleting ? deleteSpeed : typeSpeed);
    }

    type();

    return () => clearTimeout(timeout);
}
