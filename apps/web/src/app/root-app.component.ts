import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'srf-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class RootAppComponent {}
