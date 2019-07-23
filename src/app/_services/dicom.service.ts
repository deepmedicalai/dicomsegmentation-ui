import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http';
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

    getDicomMetaDataById(id: string) {
        return this.http.get(`${this.configService.api()}/study/${id}/metadata`);
    }

    addDicomMetadataById(id: string, json) {
        return this.http.get(`${this.configService.api()}/study/${id}/metadata`, json);
    }

    saveMask(id: string, dataUrl) {
        var file = this.dataURItoBlob(dataUrl);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', `${id}.png`);
        return this.http.post(`${this.configService.api()}/study/${id}/mask`, formData);
    }

    dataURItoBlob(dataURI) {
        // convert base64/URLEncoded data component to raw binary data held in a string
        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0)
            byteString = atob(dataURI.split(',')[1]);
        else
            byteString = unescape(dataURI.split(',')[1]);
    
        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    
        // write the bytes of the string to a typed array
        var ia = new Uint8Array(byteString.length);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
    
        return new Blob([ia], {type:mimeString});
    }
}