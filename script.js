/**
 * 图片压缩工具 - 纯前端实现
 * 所有处理均在浏览器本地完成，不上传到服务器
 */

class ImageCompressor {
    constructor() {
        this.images = [];
        this.compressedImages = [];
        this.settings = {
            quality: 0.8,
            maxWidth: null,
            outputFormat: 'auto'
        };
        
        this.init();
    }
    
    init() {
        // DOM 元素
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.qualitySlider = document.getElementById('qualitySlider');
        this.qualityValue = document.getElementById('qualityValue');
        this.maxWidthInput = document.getElementById('maxWidth');
        this.outputFormatSelect = document.getElementById('outputFormat');
        this.settingsSection = document.getElementById('settingsSection');
        this.imagesSection = document.getElementById('imagesSection');
        this.imagesList = document.getElementById('imagesList');
        this.imageCount = document.getElementById('imageCount');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.compressAllBtn = document.getElementById('compressAllBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsList = document.getElementById('resultsList');
        this.totalSavings = document.getElementById('totalSavings');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.bindEvents();
    }
    
    bindEvents() {
        // 上传区域点击
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        
        // 文件选择
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        // 拖拽上传
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        
        // 质量滑块
        this.qualitySlider.addEventListener('input', (e) => {
            this.settings.quality = e.target.value / 100;
            this.qualityValue.textContent = `${e.target.value}%`;
        });
        
        // 最大宽度
        this.maxWidthInput.addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            this.settings.maxWidth = value > 0 ? value : null;
        });
        
        // 输出格式
        this.outputFormatSelect.addEventListener('change', (e) => {
            this.settings.outputFormat = e.target.value;
        });
        
        // 清空全部
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
        
        // 开始压缩
        this.compressAllBtn.addEventListener('click', () => this.compressAll());
        
        // 下载全部
        this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
    }
    
    handleFiles(files) {
        const validFiles = Array.from(files).filter(file => {
            // 检查文件类型
            if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
                alert(`${file.name} 不是支持的图片格式`);
                return false;
            }
            // 检查文件大小 (20MB)
            if (file.size > 20 * 1024 * 1024) {
                alert(`${file.name} 超过 20MB 大小限制`);
                return false;
            }
            return true;
        });
        
        if (validFiles.length === 0) return;
        
        validFiles.forEach(file => {
            const id = Date.now() + Math.random().toString(36).substr(2, 9);
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.images.push({
                        id,
                        file,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        width: img.width,
                        height: img.height,
                        dataUrl: e.target.result,
                        img
                    });
                    this.renderImagesList();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
    
    renderImagesList() {
        if (this.images.length === 0) {
            this.settingsSection.classList.remove('visible');
            this.imagesSection.classList.remove('visible');
            return;
        }
        
        this.settingsSection.classList.add('visible');
        this.imagesSection.classList.add('visible');
        this.imageCount.textContent = this.images.length;
        
        this.imagesList.innerHTML = this.images.map(image => `
            <div class="image-item" data-id="${image.id}">
                <img src="${image.dataUrl}" alt="${image.name}" class="image-thumb">
                <div class="image-info">
                    <div class="image-name">${image.name}</div>
                    <div class="image-meta">
                        <span>${this.formatSize(image.size)}</span>
                        <span>${image.width} × ${image.height}</span>
                    </div>
                </div>
                <div class="image-actions">
                    <button class="btn-icon danger" onclick="compressor.removeImage('${image.id}')" title="删除">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    removeImage(id) {
        this.images = this.images.filter(img => img.id !== id);
        this.renderImagesList();
    }
    
    clearAll() {
        this.images = [];
        this.compressedImages = [];
        this.fileInput.value = '';
        this.renderImagesList();
        this.resultsSection.classList.remove('visible');
    }
    
    async compressAll() {
        if (this.images.length === 0) return;
        
        this.showLoading();
        this.compressedImages = [];
        
        for (const image of this.images) {
            try {
                const compressed = await this.compressImage(image);
                this.compressedImages.push(compressed);
            } catch (error) {
                console.error(`压缩 ${image.name} 失败:`, error);
                alert(`压缩 ${image.name} 失败: ${error.message}`);
            }
        }
        
        this.hideLoading();
        this.renderResults();
    }
    
    compressImage(image) {
        return new Promise((resolve, reject) => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let width = image.width;
                let height = image.height;
                
                // 应用最大宽度限制
                if (this.settings.maxWidth && width > this.settings.maxWidth) {
                    height = Math.round(height * (this.settings.maxWidth / width));
                    width = this.settings.maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // 绘制图片
                ctx.drawImage(image.img, 0, 0, width, height);
                
                // 确定输出格式
                let outputType = image.type;
                if (this.settings.outputFormat !== 'auto') {
                    outputType = this.settings.outputFormat;
                }
                
                // PNG 格式不支持质量参数，使用不同的压缩策略
                const quality = outputType === 'image/png' ? undefined : this.settings.quality;
                
                // 转换为 Blob
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('压缩失败'));
                        return;
                    }
                    
                    // 生成新文件名
                    let newName = image.name;
                    if (this.settings.outputFormat !== 'auto') {
                        const ext = this.getExtension(outputType);
                        const baseName = image.name.replace(/\.[^.]+$/, '');
                        newName = `${baseName}.${ext}`;
                    }
                    
                    resolve({
                        id: image.id,
                        originalName: image.name,
                        name: newName,
                        originalSize: image.size,
                        size: blob.size,
                        width,
                        height,
                        type: outputType,
                        blob,
                        dataUrl: URL.createObjectURL(blob)
                    });
                }, outputType, quality);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    renderResults() {
        if (this.compressedImages.length === 0) return;
        
        this.resultsSection.classList.add('visible');
        
        // 计算总节省
        const totalOriginal = this.compressedImages.reduce((sum, img) => sum + img.originalSize, 0);
        const totalCompressed = this.compressedImages.reduce((sum, img) => sum + img.size, 0);
        const totalSaved = totalOriginal - totalCompressed;
        const totalPercent = Math.round((totalSaved / totalOriginal) * 100);
        
        this.totalSavings.textContent = `共节省 ${this.formatSize(totalSaved)} (${totalPercent}%)`;
        
        this.resultsList.innerHTML = this.compressedImages.map(image => {
            const saved = image.originalSize - image.size;
            const percent = Math.round((saved / image.originalSize) * 100);
            
            return `
                <div class="result-item" data-id="${image.id}">
                    <img src="${image.dataUrl}" alt="${image.name}" class="image-thumb">
                    <div class="image-info">
                        <div class="image-name">${image.name}</div>
                        <div class="image-meta">
                            <span>${image.width} × ${image.height}</span>
                        </div>
                    </div>
                    <div class="compression-stats">
                        <div class="size-change">
                            <span class="original-size">${this.formatSize(image.originalSize)}</span>
                            <span class="new-size">${this.formatSize(image.size)}</span>
                        </div>
                        <span class="savings-badge">-${percent}%</span>
                    </div>
                    <div class="image-actions">
                        <button class="btn-icon" onclick="compressor.downloadImage('${image.id}')" title="下载">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // 滚动到结果区域
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    downloadImage(id) {
        const image = this.compressedImages.find(img => img.id === id);
        if (!image) return;
        
        const link = document.createElement('a');
        link.href = image.dataUrl;
        link.download = image.name;
        link.click();
    }
    
    downloadAll() {
        if (this.compressedImages.length === 0) return;
        
        // 逐个下载（简单实现）
        this.compressedImages.forEach((image, index) => {
            setTimeout(() => {
                this.downloadImage(image.id);
            }, index * 200);
        });
    }
    
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    getExtension(mimeType) {
        const map = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp'
        };
        return map[mimeType] || 'jpg';
    }
    
    showLoading() {
        this.loadingOverlay.classList.add('visible');
    }
    
    hideLoading() {
        this.loadingOverlay.classList.remove('visible');
    }
}

// 初始化
const compressor = new ImageCompressor();
