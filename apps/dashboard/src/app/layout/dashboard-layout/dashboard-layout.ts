import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar';
import { TopbarComponent } from './topbar/topbar';

@Component({
  selector: 'tf-dashboard-layout',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './dashboard-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout {}
