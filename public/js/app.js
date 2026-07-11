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

let selectedOrderPackage = null;
let selectedDiscordContact = null;

function orderPackageFromButton(button) {
    const monthlyPrice = button.dataset.packageMonthlyPrice || button.dataset.packagePrice || '-';

    selectedOrderPackage = {
        id: button.dataset.packageId || '',
        name: button.dataset.packageName || '-',
        monthlyPrice,
        price: String(getDisplayPrice(monthlyPrice)),
        billingPeriod: BILLING.period,
        cpuModel: button.dataset.packageCpuModel || '-',
        cpu: button.dataset.packageCpu || '-',
        ram: button.dataset.packageRam || '-',
        ssd: button.dataset.packageSsd || '-',
        backup: button.dataset.packageBackup || '-'
    };

    if (selectedOrderPackage.id) {
        selectPackage(selectedOrderPackage.id);
    }

    selectedDiscordContact = null;
    openOrderModal();
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const messageBox = document.getElementById('toastMessage');
    if (!toast || !messageBox) return;

    messageBox.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    const selectedCard = document.querySelector('.pkg-card.selected') || document.querySelector('.pkg-card');
    if (selectedCard) {
        selectPackage(selectedCard.dataset.package);
    }

    startEventCountdown();
    setupBillingToggle();
    setupOrderModal();
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
    summary.textContent = `${selectedOrderPackage.name} • ฿${formatPrice(selectedOrderPackage.price)}${periodSuffix} (${getBillingLabel(selectedOrderPackage.billingPeriod)}) • ${selectedOrderPackage.cpuModel}`;
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

    const discordLine = selectedDiscordContact?.name
        ? `ช่องทาง Discord ที่เลือก: ${selectedDiscordContact.name}`
        : 'ช่องทาง Discord ที่เลือก: ยังไม่ได้เลือก';

    const lines = [
        'สวัสดีครับ/ค่ะ ต้องการสั่งซื้อแพ็กเกจเซิร์ฟเวอร์ Minecraft',
        '',
        'รายละเอียดแพ็กเกจ',
        `• แพ็กเกจ: ${selectedOrderPackage.name}`,
        `• รอบบิล: ${getBillingLabel(selectedOrderPackage.billingPeriod)}`,
        `• ราคา: ฿${formatPrice(selectedOrderPackage.price)}${selectedOrderPackage.billingPeriod === 'daily' ? '/วัน' : '/เดือน'}`
    ];

    if (selectedOrderPackage.billingPeriod === 'daily') {
        lines.push(`• ราคารายเดือน (ถูกกว่า): ฿${formatPrice(selectedOrderPackage.monthlyPrice)}/เดือน`);
    }

    return lines.concat([
        `• CPU Model: ${selectedOrderPackage.cpuModel}`,
        `• CPU: ${selectedOrderPackage.cpu}`,
        `• RAM: ${selectedOrderPackage.ram}`,
        `• SSD: ${selectedOrderPackage.ssd}`,
        `• Backup: ${selectedOrderPackage.backup}`,
        '',
        discordLine,
        '',
        'ข้อมูลที่ขอแจ้งเพิ่มเติม',
        '• เวอร์ชัน Minecraft:',
        '• จำนวนผู้เล่นประมาณ:',
        '• ต้องการย้ายข้อมูลเดิมไหม:',
        '• ต้องการทดลองเครื่องก่อนชำระเงินไหม:',
        '• หมายเหตุเพิ่มเติม:',
        '',
        'รบกวนแจ้งขั้นตอนต่อไปและยอดชำระให้หน่อยครับ/ค่ะ'
    ]).join('\n');
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

    showToast('คัดลอกข้อความสำหรับส่งใน Discord แล้ว');
}
