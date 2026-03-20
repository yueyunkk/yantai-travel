// ===================== 全局通用交互脚本 - 滨海仙境版 =====================

// 1. 平滑滚动效果（高帧率优化）
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// 2. 导航栏滚动效果（柔和阴影）
const navbar = document.querySelector('.navbar');
if (navbar) {
    window.addEventListener('scroll', function() {
        if (window.scrollY > 80) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// 3. 标签页切换激活状态同步
const tabButtons = document.querySelectorAll('.nav-link');
tabButtons.forEach(button => {
    button.addEventListener('click', function() {
        const parentNav = this.closest('.nav');
        if (parentNav) {
            parentNav.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        }
    });
});

// 4. 首页轮播图自动播放（Bootstrap轮播增强）
const mainCarousel = document.querySelector('#mainCarousel');
if (mainCarousel) {
    new bootstrap.Carousel(mainCarousel, {
        interval: 5500,
        pause: 'hover',
        wrap: true
    });
}

// 5. 表单验证（联系页面）
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    // Bootstrap表单验证
    (function () {
        'use strict'
        const forms = document.querySelectorAll('.needs-validation');
        Array.prototype.slice.call(forms).forEach(function (form) {
            form.addEventListener('submit', function (event) {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            }, false);
        });
    })();

    // 表单提交模拟
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (this.checkValidity()) {
            alert('感谢您的留言！我们会尽快与您联系。');
            this.reset();
            this.classList.remove('was-validated');
        }
    });
}

// 6. 滚动渐显动画（高帧率清新感）
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            fadeInObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

// 页面加载完成后，给所有卡片和板块添加渐显类
document.addEventListener('DOMContentLoaded', function() {
    const elementsToAnimate = document.querySelectorAll(
        '.common-card, .attraction-card, .food-card, .hotel-card, .route-card, .feature-card, .area-card, .filter-section, .accommodation-section, .faq-section'
    );
    
    elementsToAnimate.forEach((el, index) => {
        el.classList.add('fade-in-up');
        el.style.transitionDelay = `${index * 0.08}s`; // 错开动画时间，更有层次感
        fadeInObserver.observe(el);
    });

    // 图片懒加载增强
    const lazyImages = document.querySelectorAll('img');
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const image = entry.target;
                    image.loading = 'lazy';
                    observer.unobserve(image);
                }
            });
        });
        lazyImages.forEach(img => imageObserver.observe(img));
    }
});
// ===================== 住宿筛选功能核心逻辑 =====================
document.addEventListener('DOMContentLoaded', function() {
    // 获取筛选元素
    const priceFilter = document.getElementById('priceFilter');
    const typeFilter = document.getElementById('typeFilter');
    const areaFilter = document.getElementById('areaFilter');
    const searchBtn = document.getElementById('searchBtn');
    const allHotelItems = document.querySelectorAll('.hotel-item'); // 所有住宿卡片

    // 点击搜索按钮，执行筛选
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            // 获取当前选中的筛选条件
            const selectedPrice = priceFilter.value;
            const selectedType = typeFilter.value;
            const selectedArea = areaFilter.value;

            // 遍历所有住宿卡片，逐个判断是否符合条件
            allHotelItems.forEach(function(hotelItem) {
                // 获取卡片的属性值
                const hotelPrice = parseInt(hotelItem.dataset.priceMin); // 酒店最低价格
                const hotelType = hotelItem.dataset.type; // 酒店类型
                const hotelArea = hotelItem.dataset.area; // 酒店区域

                // 初始化匹配结果：默认符合
                let isPriceMatch = true;
                let isTypeMatch = true;
                let isAreaMatch = true;

                // 1. 判断价格是否匹配
                if (selectedPrice !== 'all') {
                    switch(selectedPrice) {
                        case '100-200':
                            isPriceMatch = hotelPrice >= 100 && hotelPrice < 200;
                            break;
                        case '200-400':
                            isPriceMatch = hotelPrice >= 200 && hotelPrice < 400;
                            break;
                        case '400-800':
                            isPriceMatch = hotelPrice >= 400 && hotelPrice < 800;
                            break;
                        case '800+':
                            isPriceMatch = hotelPrice >= 800;
                            break;
                    }
                }

                // 2. 判断类型是否匹配
                if (selectedType !== 'all') {
                    isTypeMatch = hotelType === selectedType;
                }

                // 3. 判断区域是否匹配
                if (selectedArea !== 'all') {
                    isAreaMatch = hotelArea === selectedArea;
                }

                // 三个条件都符合，就显示；否则隐藏
                if (isPriceMatch && isTypeMatch && isAreaMatch) {
                    hotelItem.style.display = 'block';
                } else {
                    hotelItem.style.display = 'none';
                }
            });
        });
    }

    // 标签页切换时，重置筛选条件和显示所有卡片（可选，根据你的需求）
    const tabButtons = document.querySelectorAll('#accommodationTabs .nav-link');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 重置下拉框
            priceFilter.value = 'all';
            typeFilter.value = 'all';
            areaFilter.value = 'all';
            // 显示所有卡片
            allHotelItems.forEach(item => item.style.display = 'block');
        });
    });
});