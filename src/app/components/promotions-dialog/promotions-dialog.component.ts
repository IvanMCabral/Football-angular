import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { PromotionResult } from '../../core/services/career.model';

@Component({
  selector: 'app-promotions-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatTabsModule, MatIconModule],
  templateUrl: './promotions-dialog.component.html',
  styleUrls: ['./promotions-dialog.component.css']
})
export class PromotionsDialogComponent implements OnInit {
  promoted: PromotionResult[] = [];
  relegated: PromotionResult[] = [];

  constructor(
    public dialogRef: MatDialogRef<PromotionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      promotions: PromotionResult[]
    },
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    if (this.data.promotions) {
      this.promoted = this.data.promotions.filter(p => p.type === 'PROMOTED');
      this.relegated = this.data.promotions.filter(p => p.type === 'RELEGATED');
    }
  }
}
