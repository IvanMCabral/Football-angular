import { Injectable } from '@angular/core';
import { XhrFactory } from '@angular/common';

@Injectable()
export class TeamsDiagnosticXhrFactory extends XhrFactory {
  build(): XMLHttpRequest {
    return new XMLHttpRequest();
  }
}
