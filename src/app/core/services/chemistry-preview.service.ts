import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChemistryDetailDTO } from '../../shared/models/lineup/lineup.dto';

/**
 * V25D45 (Sprint C10): thin HTTP wrapper around
 * {@code POST /api/v1/career/lineup/preview-chemistry}.
 *
 * <p>The SquadEditorModalComponent injects this service and pipes a
 * debounced stream of {@code playerIds[]} through it. The back returns a
 * {@link ChemistryDetailDTO} (mirrors the back's {@code ChemistryDetail}
 * record) with score + breakdown + maxSkillByType + coveragePercentage.
 *
 * <p>Read-only — no cache, no state. Each call is a fresh HTTP roundtrip
 * that re-loads the career from Redis on the back and computes the chemistry
 * on the fly. For the typical edit flow (~5 swaps before saving), that's
 * ~5 calls over the lifetime of the modal, each debounced 300ms apart.
 *
 * <p><b>Error contract:</b>
 * <ul>
 *   <li>200 + {@link ChemistryDetailDTO} — happy path.</li>
 *   <li>400 — request body malformed (e.g., playerIds size != 11). The
 *       service propagates the error to the subscriber; the caller should
 *       show a fallback message.</li>
 *   <li>404 — some playerIds not in the career (defensive: shouldn't
 *       happen for the editor flow since the modal loads players from
 *       {@code /career/lineup/current} initially).</li>
 *   <li>401 — JWT expired or missing (handled by the auth interceptor).</li>
 * </ul>
 */
@Injectable({ providedIn: 'root' })
export class ChemistryPreviewService {
  constructor(private http: HttpClient) {}

  /**
   * Compute the chemistry for an arbitrary set of 11 playerIds (read-only).
   *
   * @param playerIds Exactly 11 playerIds from the user's career. The back
   *                   validates this; if size != 11 the call returns 400.
   * @returns Observable that emits the {@link ChemistryDetailDTO} on success
   *          and errors with the HTTP error response on failure.
   */
  previewChemistry(playerIds: string[]): Observable<ChemistryDetailDTO> {
    return this.http.post<ChemistryDetailDTO>(
      `${environment.apiUrl}/career/lineup/preview-chemistry`,
      { playerIds }
    );
  }
}