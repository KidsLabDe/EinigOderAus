/**
 * CutoutAnimator — Gilliam-style paper cutout animation engine
 * Uses GSAP with stepped easing for stop-motion look
 */
const CutoutAnimator = {
    _layer: null,
    _timelines: [],
    _imageCache: {},

    init() {
        this._layer = document.getElementById('animation-layer');
    },

    /** Preload images into browser cache */
    preloadImages(paths) {
        paths.forEach(src => {
            if (!this._imageCache[src]) {
                const img = new Image();
                img.src = src;
                this._imageCache[src] = img;
            }
        });
    },

    /** Create an <img> element on the overlay */
    spawn(src, props = {}) {
        const img = document.createElement('img');
        img.src = src;
        img.draggable = false;
        // Apply initial positioning
        if (props.width) img.style.width = props.width + 'px';
        if (props.height) img.style.height = props.height + 'px';
        gsap.set(img, {
            x: props.x || 0,
            y: props.y || 0,
            opacity: props.opacity !== undefined ? props.opacity : 1,
            scale: props.scale || 1,
            rotation: props.rotation || 0,
            transformOrigin: props.transformOrigin || 'center center',
        });
        this._layer.appendChild(img);
        return img;
    },

    /** Remove an element from the overlay */
    despawn(el) {
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    },

    /** Kill all tracked timelines and remove all overlay elements */
    clearAll() {
        this._timelines.forEach(tl => tl.kill());
        this._timelines = [];
        if (this._layer) {
            this._layer.innerHTML = '';
        }
    },

    /** Register a GSAP timeline for cleanup */
    track(timeline) {
        this._timelines.push(timeline);
        return timeline;
    },

    // --- Gilliam Primitives ---

    /** Stepped easing for stop-motion feel */
    steppedEase(steps) {
        return 'steps(' + steps + ')';
    },

    /** Subtle rotation wobble — paper cutout feel */
    addWobble(el, intensity = 2) {
        const tl = gsap.timeline({ repeat: -1, yoyo: true });
        tl.to(el, {
            rotation: intensity,
            duration: 0.3,
            ease: 'steps(4)',
        });
        tl.to(el, {
            rotation: -intensity,
            duration: 0.3,
            ease: 'steps(4)',
        });
        this.track(tl);
        return tl;
    },

    /** Jerky slide in from offscreen */
    slideIn(el, from, toProps = {}) {
        const startProps = {};
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (from === 'left') startProps.x = -400;
        else if (from === 'right') startProps.x = vw + 100;
        else if (from === 'top') startProps.y = -400;
        else if (from === 'bottom') startProps.y = vh + 100;

        gsap.set(el, startProps);
        const tl = gsap.timeline();
        tl.to(el, {
            ...toProps,
            duration: toProps.duration || 0.6,
            ease: 'steps(8)',
        });
        this.track(tl);
        return tl;
    },

    /** Jerky slide out to offscreen */
    slideOut(el, to, duration = 0.4) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const target = {};

        if (to === 'left') target.x = -400;
        else if (to === 'right') target.x = vw + 100;
        else if (to === 'top') target.y = -400;
        else if (to === 'bottom') target.y = vh + 100;

        const tl = gsap.timeline();
        tl.to(el, {
            ...target,
            duration: duration,
            ease: 'steps(6)',
            onComplete: () => this.despawn(el),
        });
        this.track(tl);
        return tl;
    },

    /** Hinge-point rotation (arms, jaw, limbs) */
    hingeMotion(el, originX, originY, angle, duration = 0.5) {
        gsap.set(el, { transformOrigin: originX + ' ' + originY });
        const tl = gsap.timeline({ repeat: -1, yoyo: true });
        tl.to(el, {
            rotation: angle,
            duration: duration,
            ease: 'steps(6)',
        });
        this.track(tl);
        return tl;
    },

    /** Snappy pop-in with overshoot */
    popIn(el) {
        gsap.set(el, { scale: 0, opacity: 0 });
        const tl = gsap.timeline();
        tl.to(el, {
            scale: 1.2,
            opacity: 1,
            duration: 0.15,
            ease: 'steps(3)',
        });
        tl.to(el, {
            scale: 1,
            duration: 0.1,
            ease: 'steps(2)',
        });
        this.track(tl);
        return tl;
    },

    /** Monty Python foot stomp from above */
    stompDown(el, targetY) {
        gsap.set(el, { y: -500, scaleY: 1 });
        const tl = gsap.timeline();
        tl.to(el, {
            y: targetY,
            duration: 0.3,
            ease: 'steps(4)',
        });
        // Squash on impact
        tl.to(el, {
            scaleY: 0.7,
            scaleX: 1.15,
            duration: 0.08,
            ease: 'none',
        });
        tl.to(el, {
            scaleY: 1,
            scaleX: 1,
            duration: 0.12,
            ease: 'steps(2)',
        });
        this.track(tl);
        return tl;
    },
};
