import { Injectable, inject } from '@angular/core';
import { XhrFactory } from '@angular/common';
import { ClientHttpDiagnosticsService, TEAMS_ROUTE } from './client-http-diagnostics.service';

/**
 * Angular's XHR factory hook. It decorates only the XHR instance created for a
 * request and never reads request or response bodies. No XMLHttpRequest
 * prototype is patched and no request options, headers, or callbacks change.
 */
@Injectable()
export class TeamsDiagnosticXhrFactory extends XhrFactory {
  private readonly diagnostics = inject(ClientHttpDiagnosticsService);

  build(): XMLHttpRequest {
    const xhr = new XMLHttpRequest();
    if (!this.diagnostics.isEnabled()) {
      return xhr;
    }

    let normalizedRoute: string | null = null;
    const originalOpen = xhr.open.bind(xhr) as (...args: unknown[]) => void;
    xhr.open = ((...args: unknown[]) => {
      const url = typeof args[1] === 'string' ? args[1] : '';
      normalizedRoute = this.normalizeRoute(url);
      originalOpen(...args);
      if (normalizedRoute === TEAMS_ROUTE) {
        this.diagnostics.attachNativeTransport();
      }
    }) as XMLHttpRequest['open'];

    const nativeEvent = (event: string, progress?: ProgressEvent): void => {
      if (normalizedRoute !== TEAMS_ROUTE) {
        return;
      }

      const fields = progress ? {
        loadedBytes: progress.loaded,
        totalBytes: progress.total,
        lengthComputable: progress.lengthComputable,
      } : {};
      this.diagnostics.recordNative(
        event as Parameters<ClientHttpDiagnosticsService['recordNative']>[0],
        {
          ...fields,
          correlationId: this.safeResponseCorrelationId(xhr),
          ...(event.startsWith('XHR_READY_STATE_') ? {
            readyState: xhr.readyState,
            status: xhr.status,
          } : {}),
          ...(event === 'XHR_LOAD' || event === 'XHR_ERROR' || event === 'XHR_ABORT' || event === 'XHR_TIMEOUT' ? {
            status: xhr.status,
          } : {}),
        }
      );
    };

    xhr.addEventListener('loadstart', () => nativeEvent('XHR_LOADSTART'));
    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState === 2) nativeEvent('XHR_READY_STATE_2');
      if (xhr.readyState === 3) nativeEvent('XHR_READY_STATE_3');
      if (xhr.readyState === 4) nativeEvent('XHR_READY_STATE_4');
    });
    xhr.addEventListener('progress', (event) => nativeEvent('XHR_PROGRESS', event));
    xhr.addEventListener('load', () => nativeEvent('XHR_LOAD'));
    xhr.addEventListener('error', () => nativeEvent('XHR_ERROR'));
    xhr.addEventListener('abort', () => nativeEvent('XHR_ABORT'));
    xhr.addEventListener('timeout', () => nativeEvent('XHR_TIMEOUT'));
    xhr.addEventListener('loadend', () => nativeEvent('XHR_LOADEND'));

    return xhr;
  }

  private normalizeRoute(url: string): string | null {
    try {
      const base = typeof location === 'undefined' ? 'http://localhost' : location.origin;
      return new URL(url, base).pathname === TEAMS_ROUTE ? TEAMS_ROUTE : null;
    } catch {
      return null;
    }
  }

  private safeResponseCorrelationId(xhr: XMLHttpRequest): string | undefined {
    try {
      return xhr.getResponseHeader('X-Request-Id') ?? undefined;
    } catch {
      // Cross-origin responses without Access-Control-Expose-Headers are not readable.
      return undefined;
    }
  }
}
