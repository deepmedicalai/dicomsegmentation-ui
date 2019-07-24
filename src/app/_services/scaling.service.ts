import { Injectable } from '@angular/core';


@Injectable()
export class CanvasScalingService {
    zoom: number;
    image: {
        height: number;
        width: number;
    }
    canvasDimensions: {
        height: number;
        width: number;
    }
    canvasElement: any;

    constructor() {
        this.image = { height: 0, width: 0 };
        this.canvasDimensions = { height: 0, width: 0 };
    }

    initCanvas(parent, canvas: HTMLCanvasElement) {
        this.zoom = +parent.zoomValue;
        const origin = { height: parent.element.clientHeight, width: parent.element.clientWidth };
        const wCenter = this.calculateCenter(origin);
        const iCenter = this.calculateCenter(this.image);

        const left = wCenter.x - iCenter.x * this.zoom;
        const width = this.image.width *  this.zoom;

        canvas.style.top = `0px`;
        canvas.style.left = `${left}px`;

        this.canvasDimensions.height = canvas.height = origin.height;
        this.canvasDimensions.width = canvas.width = width;
    }

    updateImage(rows, cols) {
        this.image.width = cols;
        this.image.height = rows;
    }

    calculateCenter(element) {
        const x = element.width / 2;
        const y = element.height / 2;
        return { x, y };
    }

    getImageData(canvas, canvasContext) {
        canvasContext.globalAlpha = 1;
        canvasContext.globalCompositeOperation = "destination-atop";
        canvasContext.rect(0, 0, this.canvasDimensions.width, this.canvasDimensions.height );
        canvasContext.fillStyle = 'black';
        canvasContext.fill();

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.image.width;
        tempCanvas.height = this.image.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0, this.canvasDimensions.width, this.canvasDimensions.height, 0, 0, this.image.width, this.image.height);
        const img = tempCanvas.toDataURL('image/png');
        tempCanvas.remove();

        return img;
    }
}