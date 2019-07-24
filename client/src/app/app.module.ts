import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http'; 
import { ConfigService } from './_services/config.service';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DICOMViewerComponent } from './app.component';
import { BrowserModule } from '@angular/platform-browser';
import { CornerstoneDirective } from './_directives/cornerstone.directive';
import { ThumbnailDirective } from './_directives/thumbnail.directive';

@NgModule({
  imports: [
    FormsModule,
    CommonModule,
    MatProgressSpinnerModule,
    HttpClientModule,
    BrowserModule
  ],
  declarations: [DICOMViewerComponent, CornerstoneDirective, ThumbnailDirective],
  providers: [ConfigService],
  bootstrap: [DICOMViewerComponent]
})
export class DicomViewerModule { }

