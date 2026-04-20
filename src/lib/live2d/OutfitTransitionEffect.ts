'use client';

export class OutfitTransitionEffect {
  private container: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async playTransition(callback: () => Promise<void>): Promise<void> {
    if (!this.container) return;

    // Phase 1: Blur in
    this.container.style.transition = 'filter 0.3s ease-in';
    this.container.style.filter = 'blur(8px) brightness(1.5)';

    await this.wait(300);

    // Phase 2: Execute the outfit change
    await callback();

    // Phase 3: Particle effect (CSS-based)
    this.createParticles();

    // Phase 4: Blur out
    await this.wait(200);
    this.container.style.filter = 'blur(4px) brightness(1.2)';
    await this.wait(200);
    this.container.style.filter = 'blur(0px) brightness(1.0)';

    // Clean up
    await this.wait(500);
    this.container.style.transition = '';
    this.container.style.filter = '';
  }

  private createParticles(): void {
    if (!this.container) return;

    const particleContainer = document.createElement('div');
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

    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = 2 + Math.random() * 6;
      const delay = Math.random() * 0.5;
      const duration = 0.8 + Math.random() * 0.7;
      const hue = 180 + Math.random() * 60; // Cyan-ish colors

      particle.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: ${size}px;
        height: ${size}px;
        background: hsla(${hue}, 100%, 80%, 0.9);
        border-radius: 50%;
        box-shadow: 0 0 ${size * 2}px hsla(${hue}, 100%, 70%, 0.6);
        animation: particleFade ${duration}s ease-out ${delay}s forwards;
      `;

      particleContainer.appendChild(particle);
    }

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes particleFade {
        0% { opacity: 1; transform: scale(0) translateY(0); }
        50% { opacity: 1; transform: scale(1.5) translateY(-20px); }
        100% { opacity: 0; transform: scale(0.5) translateY(-60px); }
      }
    `;
    particleContainer.appendChild(style);

    this.container.style.position = 'relative';
    this.container.appendChild(particleContainer);

    // Remove particles after animation
    setTimeout(() => {
      particleContainer.remove();
    }, 2000);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
