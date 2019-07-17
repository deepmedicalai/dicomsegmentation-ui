import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ConfigService } from './config.service';

@Injectable()
export class DicomService {
    constructor(
        private http: HttpClient,
        private configService: ConfigService
    ){}

    getListOfDicoms() {
        return this.http.get<any>(`${this.configService.api()}/study/`);
    }

    getDicomById(id: string) {
        return this.http.get(`${this.configService.api()}/study/${id}`,  { responseType: 'blob' });
    }
}