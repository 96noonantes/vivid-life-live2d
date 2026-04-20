'use client';

/**
 * 着せ替え演出: Visual effects for outfit changes
 * 
 * To maintain the sense of "vividness" during outfit changes, the transition
 * must not feel like a sudden pop-in. Instead, a combination of blur and
 * particle effects creates a magical moment that hides the loading time
 * while keeping the character feeling alive.
 */
export class OutfitTransitionEffect {
  private container: HTMLElement | null = null;
  private isPlaying = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  get isActive() { return this.isPlaying; }

  async playTransition(outfitChangeCallback: () => Promise<void>): Promise<void> {
    if (!this.container || this.isPlaying) {
      // If already playing, just execute the callback directly
      await outfitChangeCallback();
      return;
    }

    this.isPlaying = true;

    try {
      // Phase 1: Blur in - creates a magical "transformation" feeling
      this.container.style.transition = 'filter 0.3s ease-in';
      this.container.style.filter = 'blur(8px) brightness(1.5)';
      await this.wait(300);

      // Phase 2: Execute the outfit change while blurred
      await outfitChangeCallback();

      // Phase 3: Particle effect (CSS-based, GPU-accelerated)
      this.createParticles();

      // Phase 4: Gradual blur out - model reappears
      this.container.style.transition = 'filter 0.2s ease-out';
      this.container.style.filter = 'blur(4px) brightness(1.2)';
      await this.wait(200);

      this.container.style.filter = 'blur(0px) brightness(1.0)';
      await this.wait(200);

      // Phase 5: Clean up
      await this.wait(500);
      this.container.style.transition = '';
      this.container.style.filter = '';
    } finally {
      this.isPlaying = false;
    }
  }

  /**
   * Create CSS-based particle burst effect
   * Uses CSS animations for GPU acceleration and iOS Safari compatibility
   */
  private createParticles(): void {
    if (!this.container) return;

    const particleContainer = document.createElement('div');
    particleContainer.className = 'outfit-transition-particles';
    particleContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
      z-index: 1000;
    `;

    // Create 30 light particles with varied positions and timing
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      const x = 20 + Math.random() * 60; // Concentrate in center area
      const y = 20 + Math.random() * 60;
      const size = 2 + Math.random() * 6;
      const delay = Math.random() * 0.5;
      const duration = 0.8 + Math.random() * 0.7;
      const hue = 170 + Math.random() * 50; // Cyan-teal range matching theme

      particle.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: ${size}px;
        height: ${size}px;
        background: hsla(${hue}, 100%, 80%, 0.9);
        border-radius: 50%;
        box-shadow: 0 0 ${size * 2}px hsla(${hue}, 100%, 70%, 0.6);
        animation: outfitParticleFade ${duration}s ease-out ${delay}s forwards;
        will-change: transform, opacity;
      `;

      particleContainer.appendChild(particle);
    }

    // Inject animation keyframes if not already present
    this.injectAnimationStyles();

    this.container.style.position = 'relative';
    this.container.appendChild(particleContainer);

    // Remove particles after animation completes
    setTimeout(() => {
      particleContainer.remove();
    }, 2500);
  }

  // [修正 #12] インスタンス変数ではなくdocument内の存在チェックで二重注入を防止
  private injectAnimationStyles(): void {
    if (document.getElementById('outfit-transition-styles')) return;

    const style = document.createElement('style');
    style.id = 'outfit-transition-styles';
    style.textContent = `
      @keyframes outfitParticleFade {
        0% { opacity: 1; transform: scale(0) translateY(0); }
        50% { opacity: 1; transform: scale(1.5) translateY(-20px); }
        100% { opacity: 0; transform: scale(0.5) translateY(-60px); }
      }
    `;
    document.head.appendChild(style);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
