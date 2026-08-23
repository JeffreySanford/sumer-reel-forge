import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Subscription } from 'rxjs';

@Component({
  selector: 'app-studio-route',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="workspace-launchers" aria-label="Workspace utility navigation">
      <a routerLink="/" aria-label="Return to Studio home">Studio Home</a>
      <a routerLink="/system" aria-label="Open host system capabilities">Host System</a>
    </nav>
  `,
  styles: [
    `
      .workspace-launchers {
        position: fixed;
        right: 24px;
        bottom: 22px;
        z-index: 50;
        display: flex;
        gap: 7px;
      }

      .workspace-launchers a {
        border: 1px solid #2d5b5b;
        border-radius: 999px;
        background: #174848;
        padding: 9px 13px;
        color: #f8e8b0;
        font: 700 0.78rem/1 Inter, ui-sans-serif, system-ui, sans-serif;
        text-decoration: none;
        box-shadow: 0 8px 24px rgba(23, 72, 72, 0.2);
      }

      .workspace-launchers a:first-child {
        border-color: #56608c;
        background: #282d53;
        color: #e8e7ff;
      }

      .workspace-launchers a:hover,
      .workspace-launchers a:focus-visible {
        filter: brightness(1.12);
        outline: 2px solid #d9b86c;
        outline-offset: 2px;
      }
    `,
  ],
})
export class StudioRouteComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private subscription?: Subscription;

  ngOnInit(): void {
    const parent = this.route.parent;
    if (!parent) {
      return;
    }

    this.subscription = parent.paramMap.subscribe((params) => {
      const episodeId = Number(params.get('episodeId'));
      if (!Number.isInteger(episodeId) || episodeId < 1) {
        return;
      }

      globalThis.dispatchEvent(
        new CustomEvent('srf-route', {
          detail: { episodeId },
        }),
      );
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
