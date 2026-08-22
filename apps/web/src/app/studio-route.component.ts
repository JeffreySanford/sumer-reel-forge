import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { Subscription } from 'rxjs';

@Component({
  selector: 'app-studio-route',
  standalone: true,
  template: '',
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
