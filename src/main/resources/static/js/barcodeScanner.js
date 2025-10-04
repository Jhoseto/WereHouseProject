/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BARCODE SCANNER MODULE - Pure JavaScript, No CSS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Файл: /static/js/shared/barcodeScanner.js
 *
 * Dependency: html5-qrcode (https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js)
 *
 * USAGE:
 *
 *   const scanner = BarcodeScannerManager.getInstance();
 *
 *   scanner.scan({
 *       onSuccess: (productData) => { ... },
 *       onNotFound: (barcode) => { ... },
 *       onError: (error) => { ... }
 *   });
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function(window) {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // PRODUCT DATA SERVICE
    // ═══════════════════════════════════════════════════════════════

    class ProductDataService {
        static async fetchByBarcode(barcode) {
            try {
                const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
                if (!response.ok) return null;

                const data = await response.json();
                if (data.status === 0 || !data.product) return null;

                return this.normalize(data.product, barcode);
            } catch (error) {
                console.error('Product API error:', error);
                return null;
            }
        }

        static normalize(p, barcode) {
            const name = p.product_name_bg || p.product_name || p.generic_name || `Продукт ${barcode}`;
            const category = this.getCategory(p.categories_tags);

            return {
                sku: barcode,
                name: name,
                category: category,
                unit: this.getUnit(p.quantity),
                description: p.ingredients_text_bg || p.ingredients_text || '',
                vatRate: this.getVAT(category),
                price: null,
                quantityAvailable: null,
                metadata: {
                    brand: p.brands || '',
                    quantity: p.quantity || '',
                    imageUrl: p.image_url || ''
                }
            };
        }

        static getCategory(tags) {
            if (!tags || !tags.length) return 'Други';

            const map = {
                'beverages': 'Напитки',
                'dairies': 'Млечни продукти',
                'breads': 'Хлебни изделия',
                'meats': 'Месни продукти',
                'snacks': 'Снаксове',
                'fruits': 'Плодове и зеленчуци',
                'cereals': 'Зърнени храни',
                'seafood': 'Риба и морски дарове',
                'sweets': 'Сладкиши'
            };

            for (const [key, value] of Object.entries(map)) {
                if (tags[0].includes(key)) return value;
            }
            return 'Други';
        }

        static getUnit(quantity) {
            if (!quantity) return 'бр';
            const q = quantity.toLowerCase();
            if (q.includes('л')) return 'л';
            if (q.includes('кг')) return 'кг';
            return 'бр';
        }

        static getVAT(category) {
            const lowVAT = ['Хлебни изделия', 'Млечни продукти', 'Плодове и зеленчуци', 'Зърнени храни'];
            return lowVAT.includes(category) ? 9 : 20;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BARCODE SCANNER MANAGER
    // ═══════════════════════════════════════════════════════════════

    class BarcodeScannerManager {
        constructor() {
            this.scanner = null;
            this.isScanning = false;
            this.callbacks = {};
        }

        static getInstance() {
            if (!BarcodeScannerManager.instance) {
                BarcodeScannerManager.instance = new BarcodeScannerManager();
            }
            return BarcodeScannerManager.instance;
        }

        isAvailable() {
            return typeof Html5Qrcode !== 'undefined';
        }

        async scan(options = {}) {
            // Проверка за библиотека
            if (!this.isAvailable()) {
                window.toastManager?.error('Библиотеката за сканиране не е заредена');
                if (options.onError) options.onError(new Error('Library not loaded'));
                return;
            }

            this.callbacks = {
                onSuccess: options.onSuccess || (() => {}),
                onNotFound: options.onNotFound || (() => {}),
                onError: options.onError || (() => {})
            };

            try {
                this.showOverlay();
                await this.startCamera();
            } catch (error) {
                console.error('Scanner error:', error);
                window.toastManager?.error('Грешка при стартиране на камерата: ' + error.message);
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
                this.hideOverlay();
            }
        }

        showOverlay() {
            const overlay = document.getElementById('barcode-scanner-overlay');
            if (overlay) {
                overlay.classList.add('active');
                overlay.style.display = 'flex';
            }
        }

        hideOverlay() {
            const overlay = document.getElementById('barcode-scanner-overlay');
            if (overlay) {
                overlay.classList.remove('active');
                overlay.style.display = 'none';
            }
        }

        async startCamera() {
            const config = {
                fps: 10,
                qrbox: { width: 300, height: 150 },
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.UPC_A
                ]
            };

            this.scanner = new Html5Qrcode("barcode-camera-feed");

            await this.scanner.start(
                { facingMode: "environment" },
                config,
                (barcode) => this.onBarcodeDetected(barcode),
                () => {} // Игнорираме scan errors за да не спамим
            );

            this.isScanning = true;
            this.showStatus('Насочи камерата към баркода...', 'loading');
        }

        async onBarcodeDetected(barcode) {
            if (!this.isScanning) return;

            // Покажи че баркодът е прочетен
            this.showStatus('✓ Баркод: ' + barcode, 'success');

            // Изчакай половин секунда за да се види
            await new Promise(resolve => setTimeout(resolve, 500));

            // Спри камерата
            await this.stopCamera();

            try {
                // Направи заявката БЕЗ визуален индикатор
                const productData = await ProductDataService.fetchByBarcode(barcode);

                if (productData) {
                    // Продуктът е намерен - просто извикай callback-а
                    this.callbacks.onSuccess(productData);

                    // Toast ще се покаже от ProductModal
                } else {
                    // Не е намерен
                    this.callbacks.onNotFound(barcode);
                }
            } catch (error) {
                console.error('Product fetch error:', error);
                window.toastManager?.error('Грешка при търсене на продукт');

                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
            }
        }

        async stopCamera() {
            if (this.scanner && this.isScanning) {
                try {
                    await this.scanner.stop();
                    this.scanner.clear();
                } catch (error) {
                    console.error('Stop camera error:', error);
                }
            }
            this.isScanning = false;
            this.hideOverlay();
        }

        showStatus(message, type = '') {
            const status = document.getElementById('barcode-scanner-status');
            if (status) {
                status.textContent = message;
                status.className = 'scanner-status active ' + type;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION & CLEANUP
    // ═══════════════════════════════════════════════════════════════

    document.addEventListener('DOMContentLoaded', () => {
        const closeBtn = document.getElementById('barcode-scanner-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                BarcodeScannerManager.getInstance().stopCamera();
            });
        }
    });

    window.addEventListener('beforeunload', () => {
        BarcodeScannerManager.getInstance().stopCamera();
    });

    // ═══════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════

    window.BarcodeScannerManager = BarcodeScannerManager;
    window.ProductDataService = ProductDataService;

})(window);