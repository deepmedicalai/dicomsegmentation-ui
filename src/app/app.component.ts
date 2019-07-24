import { Component, ViewChild, OnInit, Input, ViewChildren } from '@angular/core';
import { DicomService } from './_services/dicom.service';
import { CornerstoneDirective } from './_directives/cornerstone.directive';
import { ThumbnailDirective } from './_directives/thumbnail.directive';

declare const cornerstone;
declare const cornerstoneTools;
declare const cornerstoneWADOImageLoader;

@Component({
    selector: 'dicom-viewer',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    providers: [DicomService]
})
export class DICOMViewerComponent implements OnInit {

    public enableViewerTools = true; // enable viewer tools
    public downloadImagesURL = ''; // download images URL
    public maxImagesToLoad = 100; // limit for the automatic loading of study images

    public seriesList = []; // list of series on the images being displayed
    public dicomsList = [];
    public currentDicom = {
        _id: '',
        has_mask: "false"
    };
    public currentDicomMetadata = {
        relevant: ''
    };
    public currentDicomEl;
    public currentSeriesIndex = 0;
    public currentSeries: any = {};
    public imageCount = 0; // total image count being viewed

    // control enable/disable image scroll buttons
    public get hidePreviousImage(): any { return { color: (this.viewPort.currentIndex < 1) ? 'black' : 'white' }; }
    public get hideNextImage(): any { return { color: (this.viewPort.currentIndex >= (this.imageCount - 1)) ? 'black' : 'white' }; }

    // control message for more images to load
    public get moreImagestoLoad(): string {
        if (this.loadedImages.length < this.imageIdList.length && !this.loadingImages) { // are there any more images to load?
            const imagesToLoad = (this.maxImagesToLoad <= 0) ? (this.imageIdList.length - this.loadedImages.length) : Math.min(this.maxImagesToLoad, this.imageIdList.length - this.loadedImages.length);
            return imagesToLoad.toString();
        } else return '';
    }

    // control exhibition of a loading images progress indicator
    public loadingImages = false;
    public get showProgress(): any { return { display: (this.loadingImages) ? 'inline-block' : 'none' } };

    @ViewChild(CornerstoneDirective, { static: true }) viewPort: CornerstoneDirective; // the main cornertone view port
    @ViewChildren(ThumbnailDirective) thumbnails:Array<ThumbnailDirective>;

    private loadedImages = [];
    private imageIdList = [];
    private element: any;
    private targetImageCount = 0;

    private segmentationCanvas: HTMLCanvasElement;
    private segmentationCanvasContext;
    private canvasx = 0;
    private canvasy = 0;
    private last_mousex = 0;
    private last_mousey = 0;
    private mousex = 0;
    private mousey = 0;
    private mousedown = false;
    private leftButton = false;
    private rightButton = false;
    private brushDiameter = 10;
    private brushDiameterElement: HTMLElement;

    private color = "#ffffff";

    private region: Path2D;

    constructor(
        private dicomService: DicomService
    ) { }

    ngOnInit() {
        cornerstoneWADOImageLoader.external.cornerstone = cornerstone; // inicializa WADO Image loader
        // configura codecs e web workers
        cornerstoneWADOImageLoader.webWorkerManager.initialize({
            webWorkerPath: './assets/cornerstone/webworkers/cornerstoneWADOImageLoaderWebWorker.js',
            taskConfiguration: {
                'decodeTask': {
                    codecsPath: '../codecs/cornerstoneWADOImageLoaderCodecs.js'
                }
            }
        });
        cornerstoneWADOImageLoader.wadouri.dataSetCacheManager.purge();
        this.loadDicomList();
        this.element = this.viewPort.element; 
    }
    /**
     * Load dicom images for display
     *
     * @param imageIdList list of imageIds to load and display
     */
    loadDicomById(dicomData, event) {
        this.currentDicom = dicomData;
        this.resetAllTools();
        this.dicomService.getDicomById(this.currentDicom._id).subscribe(
            (data: File) => {
                var listOfDicomsFile = document.getElementsByClassName('list-group-item') as HTMLCollection;
                for (var i = 0; i < listOfDicomsFile.length; i++) {
                  listOfDicomsFile[i].classList.remove('active');
                }
                this.currentDicomEl = event;
                event.target.parentElement.classList.add('active');
                this.imageCount = 1;
                var dicomFile = new File([data], imageId);
                var imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(dicomFile);
                this.element = this.viewPort.element;
                this.viewPort.resetViewer();
                this.viewPort.resetImageCache(); // clean up image cache
                this.currentSeriesIndex = 0; // always display first series
                this.loadedImages = []; // reset list of images already loaded
                this.loadDicomMetadata(this.currentDicom._id);
                cornerstone.loadAndCacheImage(imageId).then(imageData => { this.imageLoaded(imageData) });
            }
        );
    }

    loadDicomList() {
        this.dicomService.getListOfDicoms().subscribe(
            data => {
                this.dicomsList = JSON.parse(JSON.stringify(data.data)); // start a new series list
            }
        )
    }

    loadDicomMetadata(id) {
        this.dicomService.getDicomMetaDataById(id).subscribe( 
            (data: any) => {
                this.currentDicomMetadata = data;
        },
            err => {
                this.currentDicomMetadata = {
                    relevant: ''
                };
        });
    }

    uploadDicomMetadata(id) {
        this.dicomService.addDicomMetadataById(id, this.currentDicomMetadata).subscribe( 
            (data: any) => {
        });
    }
    /**
     * Load the next batch of images
     */
    // public loadMoreImages() {
    //     this.element = this.viewPort.element;
    //     //
    //     // loop thru all imageIds, load and cache them for exhibition (up the the maximum limit defined)
    //     //
    //     const maxImages = (this.maxImagesToLoad <= 0) ? (this.imageIdList.length - this.loadedImages.length) : Math.min(this.maxImagesToLoad, this.imageIdList.length - this.loadedImages.length);
    //     this.loadingImages = true; // activate progress indicator
    //     this.targetImageCount += maxImages;
    //     let nextImageIndex = this.loadedImages.length;
    //     for (let index = 0; index < maxImages; index++) {
    //         const imageId = this.imageIdList[nextImageIndex++];
    //         cornerstone.loadAndCacheImage(imageId)
    //           .then(imageData => { this.imageLoaded(imageData) })
    //           .catch(err => {this.targetImageCount--;});
    //     }

    // }

    /**
     *
     * @param imageData the dicom image data
     */
    private imageLoaded(imageData) {
        const series = {
            studyID: imageData.data.string('x0020000d'),
            seriesID: imageData.data.string('x0020000e'),
            seriesNumber: imageData.data.intString('x00200011'),
            studyDescription: imageData.data.string('x00081030'),
            seriesDescription: imageData.data.string('x0008103e'),
            imageCount: 1,
            imageList: [imageData]
        }

        // if this is a new series, add it to the list
        // let seriesIndex = this.seriesList.findIndex(item => item.seriesID === series.seriesID);
        // if (seriesIndex < 0) {
        //     seriesIndex = this.seriesList.length;
        //     this.seriesList.push(series);
        //     this.seriesList.sort((a,b) => {
        //       if (a.seriesNumber > b.seriesNumber) return 1;
        //       if (a.seriesNumber < b.seriesNumber) return -1;
        //       return 0;
        // });
        // } else {
        //     let seriesItem = this.seriesList[seriesIndex];
        //     seriesItem.imageCount++;
        //     seriesItem.imageList.push(imageData);
        //     seriesItem.imageList.sort((a,b) => {
        //         if (a.data.intString('x00200013') > b.data.intString('x00200013')) return 1;
        //         if (a.data.intString('x00200013') < b.data.intString('x00200013')) return -1;
        //         return 0;
        //     })
        // }

        this.loadedImages.push(imageData); // save to images loaded

        //if (seriesIndex === this.currentSeriesIndex) {
            //this.currentSeries = this.seriesList[seriesIndex];
            //this.imageCount = this.currentSeries.imageCount; // get total image count
            //this.viewPort.addImageData(imageData);
            //this.showSeries(this.currentSeriesIndex)
       // }
         this.viewPort.addImageData(imageData);
        if (this.loadedImages.length >= this.targetImageCount) { // did we finish loading images?
            this.loadingImages = false; // deactivate progress indicator
        }

    }

    public showSeries(index) {
//        this.resetAllTools();
        this.currentSeriesIndex = index;
        this.currentSeries = this.seriesList[index];
        this.imageCount = this.currentSeries.imageCount; // get total image count
        this.viewPort.resetImageCache(); // clean up image cache
//        this.loadingImages = true; // activate progress indicator
        for (let i = 0; i < this.currentSeries.imageList.length; i++) {
            const imageData = this.currentSeries.imageList[i];
            this.viewPort.addImageData(imageData);
        }
//        this.loadingImages = false; // de-activate progress indicator
    }

    public saveAs() {
        cornerstoneTools.saveAs(this.element, "test.jpg")
    }

    /**
     * Image scroll methods
     */
    public nextImage() {
        if (this.viewPort.currentIndex < this.imageCount) {
            this.viewPort.nextImage();
        }
    }

    public previousImage() {
        if (this.viewPort.currentIndex > 0) {
            this.viewPort.previousImage();
        }
    }

    /**
     * Methods to activate/deactivate viewer tools
     */

    // deactivate all tools
    public resetAllTools() {
        if (this.imageCount > 0) {
            cornerstoneTools.wwwc.deactivate(this.element, 1);
            cornerstoneTools.pan.deactivate(this.element, 1);
            cornerstoneTools.zoom.deactivate(this.element, 1);
            cornerstoneTools.probe.deactivate(this.element, 1);
            cornerstoneTools.length.deactivate(this.element, 1);
            cornerstoneTools.simpleAngle.deactivate(this.element, 1);
            cornerstoneTools.ellipticalRoi.deactivate(this.element, 1);
            cornerstoneTools.rectangleRoi.deactivate(this.element, 1);
            cornerstoneTools.stackScroll.deactivate(this.element, 1);
            cornerstoneTools.wwwcTouchDrag.deactivate(this.element);
            cornerstoneTools.zoomTouchDrag.deactivate(this.element);
            cornerstoneTools.panTouchDrag.deactivate(this.element);
            cornerstoneTools.stackScrollTouchDrag.deactivate(this.element);
            this.clearCanvas();
            this.stopClip();
        }
    }

    // activate windowing
    public enableWindowing() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            cornerstoneTools.wwwc.activate(this.element, 1);
            cornerstoneTools.wwwcTouchDrag.activate(this.element);
        }
    }

    // activate zoom
    public enableZoom() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            cornerstoneTools.zoom.activate(this.element, 5); // 5 is right mouse button and left mouse button
            cornerstoneTools.zoomTouchDrag.activate(this.element);
        }
    }

    // activate pan
    public enablePan() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            cornerstoneTools.pan.activate(this.element, 3); // 3 is middle mouse button and left mouse button
            cornerstoneTools.panTouchDrag.activate(this.element);
        }
    }

    // activate image scroll
    public enableScroll() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            cornerstoneTools.stackScroll.activate(this.element, 1);
            cornerstoneTools.stackScrollTouchDrag.activate(this.element);
            cornerstoneTools.stackScrollKeyboard.activate(this.element);
        }
    }

    // activate length measurement
    public enableLength() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            cornerstoneTools.length.activate(this.element, 1);
        }
    }

    // activate angle measurement
    public enableAngle() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            cornerstoneTools.simpleAngle.activate(this.element, 1);
        }
    }

    // activate pixel probe
    public enableProbe() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            cornerstoneTools.probe.activate(this.element, 1);
        }
    }

    // activate Elliptical ROI
    public enableElliptical() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            cornerstoneTools.ellipticalRoi.activate(this.element, 1);
        }
    }

    // activate Rectangle ROI
    public enableRectangle() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            cornerstoneTools.rectangleRoi.activate(this.element, 1);
        }
    }

    // Play Clip
    public playClip() {
        if (this.imageCount > 0) {
            let frameRate = 10;
            let stackState = cornerstoneTools.getToolState(this.element, 'stack');
            if (stackState) {
                frameRate = stackState.data[0].frameRate;
                // Play at a default 10 FPS if the framerate is not specified
                if (frameRate === undefined) {
                    frameRate = 10;
                }
            }
            cornerstoneTools.playClip(this.element, frameRate);
        }
    }

    // Stop Clip
    public stopClip() {
        cornerstoneTools.stopClip(this.element);
    }

    // invert image
    public invertImage() {
        if (this.imageCount > 0) {
            let viewport = cornerstone.getViewport(this.element);
            // Toggle invert
            if (viewport.invert === true) {
                viewport.invert = false;
            } else {
                viewport.invert = true;
            }
            cornerstone.setViewport(this.element, viewport);
        }
    }

    // reset image
    public resetImage() {
        if (this.imageCount > 0) {
            let toolStateManager = cornerstoneTools.getElementToolStateManager(this.element);
            // Note that this only works on ImageId-specific tool state managers (for now)
            //toolStateManager.clear(this.element);
            cornerstoneTools.clearToolState(this.element, "length");
            cornerstoneTools.clearToolState(this.element, "angle");
            cornerstoneTools.clearToolState(this.element, "simpleAngle");
            cornerstoneTools.clearToolState(this.element, "probe");
            cornerstoneTools.clearToolState(this.element, "ellipticalRoi");
            cornerstoneTools.clearToolState(this.element, "rectangleRoi");
            cornerstone.updateImage(this.element);
            this.resetAllTools();
        }
    }

    public clearImage() {
      this.viewPort.resetViewer();
      this.viewPort.resetImageCache();
      this.seriesList = []; // list of series on the images being displayed
      this.currentSeriesIndex = 0;
      this.currentSeries = {};
      this.imageCount = 0; // total image count being viewed

    }

    public createCanvasSegmentation() {      
        this.segmentationCanvas = document.getElementById('segmentation-canvas') as HTMLCanvasElement;
        this.segmentationCanvas.height = this.element.clientHeight;
        this.segmentationCanvas.width = this.element.clientWidth;
        // this.segmentationCanvas.height = 460.8;
        // this.segmentationCanvas.width = 1024;
        this.brushDiameterElement = document.getElementById('brush-diameter');
    }

    public enableBrush() {
        if (this.imageCount > 0) {
            this.createCanvasSegmentation();
            this.resetAllTools();
            this.segmentationCanvas.style.display = `block`;
            this.segmentationCanvasContext = this.segmentationCanvas.getContext('2d');
            //Variables
            this.canvasx = this.element.getBoundingClientRect().left;
            this.canvasy = this.element.getBoundingClientRect().top;
            // this.canvasy = ((this.element.clientHeight - 460) / 2 ) - this.element.getBoundingClientRect().top;
            // this.segmentationCanvas.style.cssText = `position: relative; top: ${this.canvasy}px`;
            this.segmentationCanvas.onmouseenter = () => {
                this.brushDiameterElement.style.cssText += `display: block; background: ${this.color}`;
            };
            this.segmentationCanvas.onmouseleave = () => {
                this.brushDiameterElement.style.cssText += `display: none;`;
            };
            //Mousedown
            this.segmentationCanvas.onmousedown = (e) => {
                this.last_mousex = this.mousex = e.clientX - this.canvasx;
                this.last_mousey = this.mousey = e.clientY - this.canvasy;
                this.mousedown = true;
                this.leftButton = e.button === 0;
                this.rightButton = e.button === 2;
                if (this.rightButton) {
                    this.brushDiameterElement.style.cssText += "background: grey; opacity: 0.5;"
                }
                this.region = new Path2D();
                this.region.moveTo(e.clientX - this.canvasx, e.clientY - this.canvasy);
            };

            //Mouseup
            this.segmentationCanvas.onmouseup = (e) => {
                this.mousedown = false;
                this.leftButton = false;
                this.rightButton = false;
                this.brushDiameterElement.style.cssText += "background: white; opacity: 1;";

                this.region.closePath();
                this.segmentationCanvasContext.fillStyle = this.color;
                this.segmentationCanvasContext.fill(this.region);
                };

                //Mousemove
                this.segmentationCanvas.onmousemove = (e) => {
                this.mousex = e.clientX - this.canvasx;
                this.mousey = e.clientY - this.canvasy;
                this.brushDiameterElement.style.cssText += `left: ${e.offsetX - this.brushDiameter / 2}px; top: ${e.offsetY - this.brushDiameter / 2}px`;
                
                if (this.mousedown) {
                    this.segmentationCanvasContext.beginPath();

                    if (this.leftButton) {
                        this.segmentationCanvasContext.globalCompositeOperation = 'source-over';
                        this.segmentationCanvasContext.strokeStyle = this.color;
                        this.segmentationCanvasContext.lineWidth = this.brushDiameter;
                    }
                    
                    if (this.rightButton) {
                        this.segmentationCanvasContext.globalCompositeOperation = 'destination-out';
                        this.segmentationCanvasContext.lineWidth = this.brushDiameter;
                    }

                    this.segmentationCanvasContext.moveTo(this.last_mousex, this.last_mousey);
                    this.segmentationCanvasContext.lineTo(this.mousex, this.mousey);
                    this.segmentationCanvasContext.lineJoin = this.segmentationCanvasContext.lineCap = 'round';
                    this.segmentationCanvasContext.stroke();

                    this.region.lineTo(this.mousex, this.mousey);
                }
                this.last_mousex = this.mousex;
                this.last_mousey = this.mousey;
            };

            this.segmentationCanvas.onwheel = (e) => {
                if (e.deltaY < 0) {
                    this.brushDiameter -= 4;
                    if(this.brushDiameter < 0) {
                        this.brushDiameter = 1; 
                    }
                    this.brushDiameterElement.style.cssText += `width: ${this.brushDiameter}px; height: ${this.brushDiameter}px; 
                                                                left: ${e.offsetX - this.brushDiameter / 2}px; top: ${e.offsetY - this.brushDiameter / 2}px`;
                }
                if (e.deltaY > 0) {
                    this.brushDiameter += 4;
                    if(this.brushDiameter > 300) {
                        this.brushDiameter = 300; 
                    }
                    this.brushDiameterElement.style.cssText += `width: ${this.brushDiameter}px; height: ${this.brushDiameter}px; 
                                                                left: ${e.offsetX - this.brushDiameter / 2}px; top: ${e.offsetY - this.brushDiameter / 2}px`;
                }
                return false;
            };
        }
    }
    public clearCanvas() {
        if(this.segmentationCanvasContext) {
            this.segmentationCanvasContext.clearRect(0, 0, this.segmentationCanvas.width, this.segmentationCanvas.height);
            this.brushDiameterElement.style.cssText = `display: none;`;
            this.segmentationCanvas.style.display = `none`;
        }
    }
    public saveSegmentedImg(event) {
        // сохраняет цвет маски
        if(this.segmentationCanvasContext) {
            this.segmentationCanvasContext.globalAlpha = 1;
            this.segmentationCanvasContext.globalCompositeOperation = "destination-atop"; 
            this.segmentationCanvasContext.rect(0, 0, this.segmentationCanvas.clientWidth, this.segmentationCanvas.clientHeight );
            this.segmentationCanvasContext.fillStyle = 'black';
            this.segmentationCanvasContext.fill();
            var image = this.segmentationCanvas.toDataURL('image/png');
            event.target.blur();
            this.clearCanvas();
            this.dicomService.saveMask(this.currentDicom._id, image).subscribe(
            data => {
                this.dicomsList = this.dicomsList.map((i) => {
                    if(i._id === this.currentDicom._id) {
                        this.currentDicom = i;
                        i.has_mask = "true";
                    }
                    return i;
                });
            }
            ); 
        }
        this.uploadDicomMetadata(this.currentDicom._id);
    }
}
