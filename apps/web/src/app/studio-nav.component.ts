import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-studio-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="studio-nav" aria-label="Studio navigation">
      <a class="brand" routerLink="/" aria-label="Sumer Reel Forge home">
        <span class="brand-mark" aria-hidden="true">SRF</span>
        <span class="brand-copy">
          <strong>Sumer Reel Forge</strong>
          <small>Local cinematic studio</small>
        </span>
      </a>

      <div class="nav-links">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
        <a routerLink="/projects/blessings-of-sumer" routerLinkActive="active">Projects</a>
        <a routerLink="/system" routerLinkActive="active">Host System</a>
      </div>
    </nav>
  `,
  styles: [
    `
      :host { display: block; }

      .studio-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        width: min(1180px, calc(100% - 40px));
        margin: 0 auto;
        padding: 22px 0 16px;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        color: #f6fbff;
        text-decoration: none;
      }

      .brand-mark {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 14px;
        background: linear-gradient(135deg, #ffb85c 0%, #ef6ca8 48%, #7d73ff 100%);
        color: #0b1220;
        font: 900 0.78rem/1 ui-sans-serif, system-ui, sans-serif;
        box-shadow: 0 10px 30px rgba(126, 115, 255, 0.3);
      }

      .brand-copy { display: grid; gap: 2px; }
      .brand-copy strong { font: 800 0.94rem/1.1 ui-sans-serif, system-ui, sans-serif; letter-spacing: 0.01em; }
      .brand-copy small { color: #8fa8bd; font: 600 0.68rem/1.2 ui-sans-serif, system-ui, sans-serif; }

      .nav-links {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px;
        border: 1px solid rgba(147, 182, 204, 0.15);
        border-radius: 999px;
        background: rgba(8, 23, 34, 0.72);
        backdrop-filter: blur(14px);
      }

      .nav-links a {
        border-radius: 999px;
        padding: 9px 13px;
        color: #9eb3c4;
        font: 750 0.76rem/1 ui-sans-serif, system-ui, sans-serif;
        text-decoration: none;
        transition: color 140ms ease, background 140ms ease, transform 140ms ease;
      }

      .nav-links a:hover,
      .nav-links a:focus-visible,
      .nav-links a.active {
        background: rgba(255, 255, 255, 0.09);
        color: #fff;
      }

      .nav-links a:focus-visible,
      .brand:focus-visible {
        outline: 2px solid #67e8f9;
        outline-offset: 3px;
      }

      @media (max-width: 700px) {
        .studio-nav { align-items: flex-start; width: min(100% - 28px, 1180px); }
        .brand-copy small { display: none; }
        .nav-links { gap: 2px; }
        .nav-links a { padding: 9px 10px; font-size: 0.7rem; }
      }

      @media (max-width: 500px) {
        .brand-copy { display: none; }
      }
    `,
  ],
})
export class StudioNavComponent {}
