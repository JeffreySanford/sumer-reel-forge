import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-studio-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="studio-nav md3-container md3-top-app-bar" aria-label="Studio navigation">
      <a class="brand" routerLink="/" aria-label="Sumer Reel Forge home">
        <span class="brand-mark" aria-hidden="true">SRF</span>
        <span class="brand-copy">
          <strong>Sumer Reel Forge</strong>
          <small class="md3-muted">Local cinematic studio</small>
        </span>
      </a>

      <div class="md3-nav-pill">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
        <a routerLink="/projects/blessings-of-sumer" routerLinkActive="active">Projects</a>
        <a routerLink="/system" routerLinkActive="active">Host System</a>
      </div>
    </nav>
  `,
  styles: [
    `
      :host { display: block; }
      .studio-nav { padding-block: 18px 12px; }
      .brand { display: inline-flex; align-items: center; gap: 12px; color: var(--md-sys-color-on-surface); text-decoration: none; }
      .brand-mark { display: grid; width: 42px; height: 42px; place-items: center; border-radius: var(--md-sys-shape-corner-medium); background: linear-gradient(135deg, #ffb85c, #ef6ca8 48%, #7d73ff); color: #0b1220; font-weight: 900; font-size: .78rem; box-shadow: var(--md-sys-elevation-level2); }
      .brand-copy { display: grid; gap: 2px; }
      .brand-copy strong { font-size: .94rem; line-height: 1.1; }
      .brand-copy small { font-size: .68rem; }
      @media (max-width: 700px) { .studio-nav { align-items: flex-start; } .brand-copy small { display: none; } }
      @media (max-width: 500px) { .brand-copy { display: none; } }
    `,
  ],
})
export class StudioNavComponent {}
