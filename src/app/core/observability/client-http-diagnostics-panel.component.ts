import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ClientHttpDiagnosticsService } from './client-http-diagnostics.service';

@Component({
  selector: 'app-client-http-diagnostics-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="client-http-diagnostics" data-testid="client-http-diagnostics" aria-live="polite">
      <h2>Diagnóstico HTTP de equipos</h2>
      <p>
        Ruta normalizada: <code>/api/v1/world/teams</code>
        · Estado: {{ diagnostics.snapshot().inFlight ? 'en curso' : 'terminado' }}
      </p>
      <p *ngIf="!diagnostics.snapshot().events.length">Esperando inicio de la solicitud.</p>
      <ol *ngIf="diagnostics.snapshot().events.length">
        <li *ngFor="let item of diagnostics.snapshot().events; trackBy: trackEvent">
          <code>{{ item.event }}</code>
          <span>{{ item.elapsedMs }} ms</span>
          <span *ngIf="item.readyState !== undefined">readyState={{ item.readyState }}</span>
          <span *ngIf="item.status !== undefined">status={{ item.status }}</span>
          <span *ngIf="item.loadedBytes !== undefined">bytes={{ item.loadedBytes }}</span>
          <span *ngIf="item.totalBytes !== undefined">total={{ item.totalBytes }}</span>
          <span *ngIf="item.correlationId">correlationId={{ item.correlationId }}</span>
        </li>
      </ol>
    </section>
  `,
  styles: [`
    .client-http-diagnostics { margin: 1rem auto; max-width: 720px; padding: 1rem; border: 1px solid #90a4ae; border-radius: 8px; background: #f7fafc; text-align: left; font: 0.85rem/1.4 monospace; }
    .client-http-diagnostics h2 { margin: 0 0 0.5rem; font: 600 1rem/1.3 sans-serif; }
    .client-http-diagnostics p { margin: 0.35rem 0; }
    .client-http-diagnostics ol { margin: 0.75rem 0 0; padding-left: 1.5rem; }
    .client-http-diagnostics li { margin: 0.2rem 0; }
    .client-http-diagnostics li span { margin-left: 0.65rem; color: #455a64; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientHttpDiagnosticsPanelComponent {
  readonly diagnostics = inject(ClientHttpDiagnosticsService);

  trackEvent(index: number): number {
    return index;
  }
}
