import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChemistryDetailDTO } from '../../shared/models/lineup/lineup.dto';
import { LineupSlotDTO } from '../../shared/models/lineup/lineup-slot.dto';

// Read-only chemistry preview used while the manager edits the lineup.
@Injectable({ providedIn: 'root' })
export class ChemistryPreviewService {
  constructor(private http: HttpClient) {}

  // Computes projected chemistry for the selected players and tactical slots.
  previewChemistry(
    playerIds: string[],
    formation?: string,
    slots?: LineupSlotDTO[]
  ): Observable<ChemistryDetailDTO> {
    return this.http.post<ChemistryDetailDTO>(
      `${environment.apiUrl}/career/lineup/preview-chemistry`,
      { playerIds, formation, slots }
    );
  }
}

