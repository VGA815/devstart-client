import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StartupProduct } from '../../shared/models/startup-product.model';
import {
  StartupProductDto,
  UpdateStartupProductRequestDto,
  mapStartupProductDto,
} from '../../shared/models/dto/startup-product.dto';

@Injectable({ providedIn: 'root' })
export class StartupProductService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/startups`;

  getProduct(startupId: string): Observable<StartupProduct> {
    return this.http.get<StartupProductDto>(`${this.base}/${startupId}/products`).pipe(
      map(mapStartupProductDto)
    );
  }

  updateProduct(body: UpdateStartupProductRequestDto): Observable<void> {
    return this.http.put<void>(`${this.base}/products`, body);
  }
}
