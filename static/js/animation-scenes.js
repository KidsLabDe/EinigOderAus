/**
 * AnimationScenes — Choreography for each game moment
 * Uses CutoutAnimator primitives for Gilliam-style paper cutout animations
 */
const AnimationScenes = {
    _basePath: '/static/img/cutouts/',

    _img(sub) {
        return this._basePath + sub;
    },

    /** Preload all cutout images during idle */
    preload() {
        CutoutAnimator.preloadImages([
            this._img('characters/announcer.png'),
            this._img('characters/figure-thinking-left.png'),
            this._img('characters/figure-thinking-right.png'),
            this._img('characters/figure-arguing-left.png'),
            this._img('characters/figure-arguing-right.png'),
            this._img('characters/figure-cheering-left.png'),
            this._img('characters/figure-cheering-right.png'),
            this._img('objects/thumbs-up-man.png'),
            this._img('objects/thumbs-up-woman.png'),
            this._img('objects/gavel.png'),
            this._img('objects/trophy.png'),
            this._img('decorative/curtain-left.png'),
            this._img('decorative/curtain-right.png'),
            this._img('decorative/foot.png'),
            this._img('decorative/countdown-3.png'),
            this._img('decorative/countdown-2.png'),
            this._img('decorative/countdown-1.png'),
            this._img('decorative/countdown-go.png'),
        ]);
    },

    /** Idle screen — curtains + announcer with wobble */
    idle() {
        CutoutAnimator.clearAll();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Curtains framing the screen
        const curtainL = CutoutAnimator.spawn(this._img('decorative/curtain-left.png'), {
            x: -150, y: 0, height: vh,
        });
        const curtainR = CutoutAnimator.spawn(this._img('decorative/curtain-right.png'), {
            x: vw - 650, y: 0, height: vh,
        });

        // Announcer figure center-bottom
        const announcer = CutoutAnimator.spawn(this._img('characters/announcer.png'), {
            x: vw / 2 - 150, y: vh - 550, width: 500,
        });

        CutoutAnimator.addWobble(curtainL, 1);
        CutoutAnimator.addWobble(curtainR, 1);
        CutoutAnimator.addWobble(announcer, 2);
    },

    /** Game start — curtains slide out */
    gameStart() {
        CutoutAnimator.clearAll();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Briefly show curtains then slide them away
        const curtainL = CutoutAnimator.spawn(this._img('decorative/curtain-left.png'), {
            x: 0, y: 0, height: vh,
        });
        const curtainR = CutoutAnimator.spawn(this._img('decorative/curtain-right.png'), {
            x: vw - 200, y: 0, height: vh,
        });

        CutoutAnimator.slideOut(curtainL, 'left', 0.5);
        CutoutAnimator.slideOut(curtainR, 'right', 0.5);
    },

    /** Countdown before game starts — 3, 2, 1, LOS! with cutout images */
    countdown(onComplete) {
        const overlay = document.getElementById('countdown-overlay');
        const imgFiles = [
            'decorative/countdown-3.png',
            'decorative/countdown-2.png',
            'decorative/countdown-1.png',
            'decorative/countdown-go.png',
        ];
        let i = 0;
        const self = this;

        // Clear any text content
        overlay.innerHTML = '';
        overlay.classList.add('active');
        gsap.set(overlay, { opacity: 1 });

        function showNext() {
            if (i >= imgFiles.length) {
                gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => {
                    overlay.classList.remove('active');
                    overlay.innerHTML = '';
                    if (onComplete) onComplete();
                }});
                return;
            }

            // Remove previous image
            overlay.innerHTML = '';

            const img = document.createElement('img');
            img.src = self._img(imgFiles[i]);
            img.style.maxWidth = '70vw';
            img.style.maxHeight = '80vh';
            overlay.appendChild(img);

            // Pop-in effect
            gsap.fromTo(img,
                { scale: 3, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' }
            );
            // Fade out before next
            gsap.to(img, { opacity: 0, scale: 0.3, duration: 0.25, delay: 0.65 });

            i++;
            setTimeout(showNext, 1000);
        }

        showNext();
    },

    /** New question — thinking figures slide in from sides */
    votingEnter() {
        CutoutAnimator.clearAll();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const figL = CutoutAnimator.spawn(this._img('characters/figure-thinking-left.png'), {
            width: 320, y: vh - 580,
        });
        const figR = CutoutAnimator.spawn(this._img('characters/figure-thinking-right.png'), {
            width: 320, y: vh - 580,
        });

        CutoutAnimator.slideIn(figL, 'left', { x: -60, duration: 0.5 });
        CutoutAnimator.slideIn(figR, 'right', { x: vw - 260, duration: 0.5 });

        // Add wobble after slide-in
        setTimeout(() => {
            CutoutAnimator.addWobble(figL, 1.5);
            CutoutAnimator.addWobble(figR, 1.5);
        }, 600);
    },

    /** Agreement — thumbs-up pops in center, bounces, fades */
    agreement() {
        CutoutAnimator.clearAll();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const thumbFile = Math.random() < 0.5 ? 'objects/thumbs-up-man.png' : 'objects/thumbs-up-woman.png';
        const thumb = CutoutAnimator.spawn(this._img(thumbFile), {
            width: 280, x: vw / 2 - 140, y: vh / 2 + 20, opacity: 0,
        });

        const tl = CutoutAnimator.popIn(thumb);
        // Bounce up
        const bounce = gsap.timeline({ delay: 0.4 });
        bounce.to(thumb, { y: vh / 2 - 30, duration: 0.2, ease: 'steps(3)' });
        bounce.to(thumb, { y: vh / 2 + 20, duration: 0.15, ease: 'steps(2)' });
        // Fade out
        bounce.to(thumb, { opacity: 0, duration: 0.3, ease: 'steps(4)', delay: 0.5 });
        CutoutAnimator.track(bounce);
    },

    /** Disagreement — arguing figures slam in, gavel drops */
    disagreement() {
        CutoutAnimator.clearAll();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Arguing figures from sides
        const figL = CutoutAnimator.spawn(this._img('characters/figure-arguing-left.png'), {
            width: 340, y: vh - 600,
        });
        const figR = CutoutAnimator.spawn(this._img('characters/figure-arguing-right.png'), {
            width: 340, y: vh - 600,
        });

        CutoutAnimator.slideIn(figL, 'left', { x: -70, duration: 0.3 });
        CutoutAnimator.slideIn(figR, 'right', { x: vw - 270, duration: 0.3 });

        // Gavel drops from above center
        const gavel = CutoutAnimator.spawn(this._img('objects/gavel.png'), {
            width: 120, x: vw / 2 - 60,
        });
        CutoutAnimator.stompDown(gavel, vh / 2 - 60);

        // Add intense wobble after landing
        setTimeout(() => {
            CutoutAnimator.addWobble(figL, 3);
            CutoutAnimator.addWobble(figR, 3);
            CutoutAnimator.hingeMotion(gavel, 'right bottom', '', 15, 0.4);
        }, 500);
    },

    /** Debate getting urgent — ramp up wobble intensity */
    debateUrgent() {
        // Find all current images and add intense wobble
        const imgs = document.querySelectorAll('#animation-layer img');
        imgs.forEach(img => {
            CutoutAnimator.addWobble(img, 5);
        });
    },

    /** Game over — Monty Python foot stomps down */
    gameOver() {
        CutoutAnimator.clearAll();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const foot = CutoutAnimator.spawn(this._img('decorative/foot.png'), {
            width: 350, x: vw / 2 - 175,
            transformOrigin: 'center top',
        });

        CutoutAnimator.stompDown(foot, vh / 2 - 200);
    },

    /** Score screen — trophy rises, cheering figures */
    scoreScreen(score, total) {
        CutoutAnimator.clearAll();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Trophy rises from bottom
        const trophy = CutoutAnimator.spawn(this._img('objects/trophy.png'), {
            width: 300, x: vw / 2 - 150, y: vh + 50,
        });

        const rise = gsap.timeline();
        rise.to(trophy, {
            y: vh / 4 - 150,
            duration: 0.8,
            ease: 'steps(10)',
        });
        CutoutAnimator.track(rise);
        CutoutAnimator.addWobble(trophy, 1.5);

        // Cheering figures from sides
        const figL = CutoutAnimator.spawn(this._img('characters/figure-cheering-left.png'), {
            width: 320, y: vh - 580,
        });
        const figR = CutoutAnimator.spawn(this._img('characters/figure-cheering-right.png'), {
            width: 320, y: vh - 580,
        });

        CutoutAnimator.slideIn(figL, 'left', { x: -60, duration: 0.6 });
        CutoutAnimator.slideIn(figR, 'right', { x: vw - 260, duration: 0.6 });

        setTimeout(() => {
            CutoutAnimator.addWobble(figL, 3);
            CutoutAnimator.addWobble(figR, 3);
        }, 700);
    },
};
