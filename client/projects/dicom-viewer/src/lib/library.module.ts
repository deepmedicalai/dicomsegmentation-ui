import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { CornerstoneDirective } from '../../../../src/app/_directives/cornerstone.directive';
import { ThumbnailDirective } from '../../../../src/app/_directives/thumbnail.directive';

@NgModule({
  imports: [
    HttpClientModule  ],
  declarations: [CornerstoneDirective, ThumbnailDirective]
})

export class LibraryModule { }
