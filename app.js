const elements = {
    canvas: document.getElementById('canvas'),
    loadingOverlay: document.getElementById('loading-overlay'),
    threeCanvas: document.getElementById('three-canvas'),
    planetPrerender: document.getElementById('planet-prerender'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    body: document.body
};

const state = {
    unityInstance: null,
    isFullscreen: false,
    resizeTimeout: null
};

const isDesktop = () => !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const checkImage = url => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
});

const initBackground = async () => {
    if (window.AppConfig.aspectRatioMode === 'default') return;
    
    const available = await checkImage(window.AppConfig.backgroundImageUrl);
    if (!available) {
        console.warn('Background image not found, using default');
        window.AppConfig.backgroundImageUrl = 'LoadingBackground.jpg';
    }
};

const updateAspectRatio = () => {
    if (window.AppConfig.aspectRatioMode === 'default' || !isDesktop()) {
        resetToFullscreen();
        return;
    }

    const targetRatio = window.AppConfig.aspectRatioMode === '16_9' ? 16/9 : 9/16;
    const { innerWidth: w, innerHeight: h } = window;

    let width, height;
    if (w / h > targetRatio) {
        height = h;
        width = h * targetRatio;
    } else {
        width = w;
        height = w / targetRatio;
    }

    applyCanvasSize(width, height, true);
    applyLoadingOverlaySize(width, height, true);
    applyBodyBackground();

    if (state.unityInstance) {
        scheduleUnityRepaint();
    }
};

const resetToFullscreen = () => {
    applyCanvasSize('100%', '100%', false);
    applyLoadingOverlaySize('100%', '100%', false);
    clearBodyBackground();

    if (state.unityInstance) {
        scheduleUnityRepaint();
    }
};

const applyCanvasSize = (width, height, centered) => {
    elements.canvas.style.width = `${width}${typeof width === 'number' ? 'px' : ''}`;
    elements.canvas.style.height = `${height}${typeof height === 'number' ? 'px' : ''}`;
    elements.canvas.style.position = 'absolute';
    
    if (centered) {
        elements.canvas.style.top = '50%';
        elements.canvas.style.left = '50%';
        elements.canvas.style.transform = 'translate(-50%, -50%)';
    } else {
        elements.canvas.style.top = '0';
        elements.canvas.style.left = '0';
        elements.canvas.style.transform = 'none';
    }
    
    const dpr = window.devicePixelRatio || 1;
    elements.canvas.width = (typeof width === 'number' ? width : window.innerWidth) * dpr;
    elements.canvas.height = (typeof height === 'number' ? height : window.innerHeight) * dpr;
};

const applyLoadingOverlaySize = (width, height, centered) => {
    if (!elements.loadingOverlay) return;
    
    elements.loadingOverlay.style.width = `${width}${typeof width === 'number' ? 'px' : ''}`;
    elements.loadingOverlay.style.height = `${height}${typeof height === 'number' ? 'px' : ''}`;
    
    if (centered) {
        elements.loadingOverlay.style.top = '50%';
        elements.loadingOverlay.style.left = '50%';
        elements.loadingOverlay.style.transform = 'translate(-50%, -50%)';
    } else {
        elements.loadingOverlay.style.top = '0';
        elements.loadingOverlay.style.left = '0';
        elements.loadingOverlay.style.transform = 'none';
    }
};

const applyBodyBackground = () => {
    elements.body.style.backgroundImage = `url('${window.AppConfig.backgroundImageUrl}')`;
    elements.body.style.backgroundSize = 'cover';
    elements.body.style.backgroundRepeat = 'no-repeat';
    elements.body.style.backgroundColor = '#000';
};

const clearBodyBackground = () => {
    elements.body.style.backgroundImage = '';
    elements.body.style.backgroundSize = '';
    elements.body.style.backgroundRepeat = '';
    elements.body.style.backgroundColor = '';
};

const scheduleUnityRepaint = () => {
    if (!state.unityInstance) return;
    
    if (state.unityInstance.Module?.Invalidate) {
        state.unityInstance.Module.Invalidate();
    }
    elements.canvas.focus();
};

const onProgress = progress => {
    if (elements.progressBarFill) {
        elements.progressBarFill.style.width = `${Math.min(100, progress * 100)}%`;
    }
};

const handleFullscreenChange = () => {
    state.isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );

    updateAspectRatio();
};

const initializeApp = async () => {
    await initBackground();
    updateAspectRatio();
    
    window.addEventListener('resize', () => {
        clearTimeout(state.resizeTimeout);
        state.resizeTimeout = setTimeout(updateAspectRatio, 200);
    });
    
    const fullscreenEvents = [
        'fullscreenchange',
        'webkitfullscreenchange',
        'mozfullscreenchange',
        'MSFullscreenChange'
    ];
    
    fullscreenEvents.forEach(event => {
        document.addEventListener(event, handleFullscreenChange);
    });
    
    const loadUnity = () => {
        const loaderScript = document.createElement('script');
        loaderScript.src = `Build/813700ccfaf64a0a3c57e3aa3166490b.loader.js`;
        loaderScript.onload = () => {
            createUnityInstance(elements.canvas, {
                dataUrl: `Build/d68029f7fba32df1644ee32bbea400d0.data.unityweb`,
                frameworkUrl: `Build/10547e4c00aeb53f4cc066fa410865b0.framework.js.unityweb`,
                codeUrl: `Build/30b63c9be2f72da06d79ba51826e02ab.wasm.unityweb`,
                streamingAssetsUrl: 'StreamingAssets',
                companyName: 'DefaultCompany',
                productName: 'ObbyOnlineMirror',
                productVersion: '1.2.2'
            }, onProgress).then(instance => {
                state.unityInstance = instance;
                window.unityInstance = instance;
                
                if (elements.loadingOverlay.parentNode) {
                    elements.loadingOverlay.parentNode.removeChild(elements.loadingOverlay);
                }
                
                if (window.disposeThreeScene) {
                    window.disposeThreeScene();
                }
                
                updateAspectRatio();
                
                elements.canvas.addEventListener('click', () => {
                    elements.canvas.focus();
                });
            }).catch(error => {
                console.error('Unity initialization failed:', error);
            });
        };
        document.body.appendChild(loaderScript);
    };

    if (window.AppConfig.useThreeJsLoader && typeof THREE === 'undefined') {
        const threeScript = document.createElement('script');
        threeScript.src = 'lib/threeImport.js';
        threeScript.onload = () => {
            if (window.AppConfig.useThreeJsLoader) {
                const sceneScript = document.createElement('script');
                sceneScript.src = 'threeCanvas.js';
                sceneScript.onload = loadUnity;
                document.body.appendChild(sceneScript);
            } else {
                loadUnity();
            }
        };
        document.body.appendChild(threeScript);
    } else {
        if (window.AppConfig.useThreeJsLoader) {
            const sceneScript = document.createElement('script');
            sceneScript.src = 'threeCanvas.js';
            sceneScript.onload = loadUnity;
            document.body.appendChild(sceneScript);
        } else {
            loadUnity();
        }
    }
};

window.onThreeJsLoaded = () => {
    if (elements.planetPrerender) {
        elements.planetPrerender.style.opacity = '0';
        setTimeout(() => {
            if (elements.planetPrerender) {
                elements.planetPrerender.style.display = 'none';
            }
        }, 300);
    }
};

document.addEventListener('DOMContentLoaded', initializeApp);
