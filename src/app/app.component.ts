import { Component, OnInit } from '@angular/core';
import { fabric } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';
import { AnnotationFactory } from 'annotpdf';
import { PDFDocument, rgb } from 'pdf-lib';

//var polygonjs = require('Polygon');

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  //https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf
  // https://pdf-lib.js.org/assets/copy_pages.pdf
  // https://www.free-ebooks.net/mystery/Disappeared-From-Her-Home-A-Novel/pdf?dl&preview
  // https://firebasestorage.googleapis.com/v0/b/m-profile.appspot.com/o/cv%2FCV%20mohamed%20bouaziz.pdf?alt=media&token=52823330-43f3-4827-8df4-283a6d3a0c35
  //https://files.fm/down.php?i=8e88yrkhy
  url =
    'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';
  pdfDocument = null;
  currPage = 1; //Pages are 1-based not 0-based
  numPages = 0;
  scale = 1;
  zoomStep = 0.2;
  KeywordToFind = '';
  findedKeywords = [];
  nbOccuranceKeyword = 0;
  activeFindedKeyword = 0;
  activeDrowMode = false;
  pdfFactory: AnnotationFactory;
  fabricCanvas = [];
  dataurl = '';
  originurl = '';

  constructor() {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.10.377/build/pdf.worker.js';
    fabric.Object.prototype.objectCaching = false;
  }

  ngOnInit(): void {
    this.initPdf();
  }

  initPdf() {
    this._getPdf();
  }

  _getPdf() {
    this.currPage = 1;
    document.getElementById('canvas-container').innerHTML = '';
    pdfjsLib.getDocument(this.url).promise.then((pdf) => {
      console.log(pdf);
      this.pdfDocument = pdf;
      this.numPages = pdf.numPages;
      this._drowPageContainer();
      pdf.getPage(1).then(this._handlePages);
    });
  }

  pdfOnload(event) {
    const pdfTatget: any = event.target;
    if (typeof FileReader !== 'undefined') {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        let blob = new Blob([e.target.result], {
          type: 'application/pdf',
        });
        this.dataurl = window.URL.createObjectURL(blob);
        this.url = this.dataurl;
        this._getPdf();
      };
      reader.readAsArrayBuffer(pdfTatget.files[0]);
    }
  }

  addAnnotation() {
    this.pdfDocument.getData().then((data) => {
      let factory = new AnnotationFactory(data);
      console.log(factory);
      factory.createTextAnnotation(0, [20, 0, 100, 100], 'Pop up note', 'Max');
      const originPdfBytes = factory.write();
      PDFDocument.load(originPdfBytes).then((pdfDoc) => {
        const page = pdfDoc.getPage(0);
        page.drawLine({
          start: { x: 25, y: 75 },
          end: { x: 125, y: 175 },
          thickness: 2,
          color: rgb(0.75, 0.2, 0.2),
          opacity: 0.75,
        });

        page.drawRectangle({
          x: 25,
          y: 75,
          width: 250,
          height: 75,
          borderWidth: 5,
          opacity: 0,
          borderOpacity: 0.75,
        });

        pdfDoc.save().then((pdfBytes) => {
          let blob = new Blob([pdfBytes], {
            type: 'application/pdf',
          });
          this.dataurl = window.URL.createObjectURL(blob);
        });
      });
    });
  }

  _drowPageContainer() {
    for (let i = 0; i < this.numPages; i++) {
      let containerPage = document.createElement('div');
      containerPage.setAttribute('id', 'page_' + i);
      containerPage.setAttribute('class', 'page_container');
      document.getElementById('canvas-container').appendChild(containerPage);
    }
  }

  _render() {
    this.currPage = 1;
    this.pdfDocument.getPage(1).then(this._handlePages);
  }

  _handlePages = (page) => {
    console.log(page.rotate);
    let viewport = page.getViewport({ scale: this.scale });

    let pdfCanvas = document.createElement('canvas');
    pdfCanvas.setAttribute('id', 'pdfjsCanvas_' + page._pageIndex);
    pdfCanvas.style.display = 'block';
    pdfCanvas.height = viewport.height;
    pdfCanvas.width = viewport.width;
    let context = pdfCanvas.getContext('2d');
    let textPage = document.createElement('div');
    textPage.setAttribute('id', 'text_' + page._pageIndex);
    textPage.setAttribute('class', 'text_container');

    page
      .render({
        canvasContext: context,
        viewport: viewport,
      })
      .promise.then(() => {
        let containerPage = document.getElementById('page_' + page._pageIndex);
        if (document.getElementById('pdfjsCanvas_' + page._pageIndex)) {
          document.getElementById('pdfjsCanvas_' + page._pageIndex).remove();
        }
        if (document.getElementById('text_' + page._pageIndex)) {
          document.getElementById('text_' + page._pageIndex).remove();
        }
        containerPage.appendChild(pdfCanvas);
        if (document.getElementById('fabricCanvas_' + page._pageIndex)) {
          this.fabricCanvas[page._pageIndex].setZoom(this.scale);
          this.fabricCanvas[page._pageIndex].setWidth(viewport.width);
          this.fabricCanvas[page._pageIndex].setHeight(viewport.height);
        } else {
          let fabricCanvas = document.createElement('canvas');
          fabricCanvas.style.display = 'block';
          fabricCanvas.height = viewport.height;
          fabricCanvas.width = viewport.width;
          fabricCanvas.setAttribute('id', 'fabricCanvas_' + page._pageIndex);
          containerPage.appendChild(fabricCanvas);
          let can = new fabric.Canvas('fabricCanvas_' + page._pageIndex);
          this.initCanvas(can);
          this.fabricCanvas.push(can);
        }
        containerPage.appendChild(textPage);

        this.currPage++;
        if (this.pdfDocument !== null && this.currPage <= this.numPages) {
          this.pdfDocument.getPage(this.currPage).then(this._handlePages);
        }
        return page.getTextContent();
      })
      .then(function (textContent) {
        let text = document.getElementById('text_' + page._pageIndex);
        text.innerHTML = '';
        let canvas_height = pdfCanvas.height;
        let canvas_width = pdfCanvas.width;
        text.setAttribute(
          'style',
          'left:' +
            pdfCanvas.offsetLeft +
            'px;top:' +
            pdfCanvas.offsetTop +
            'px;height:' +
            canvas_height +
            'px;width:' +
            canvas_width +
            'px'
        );
        pdfjsLib.renderTextLayer({
          textContent: textContent,
          container: text,
          viewport: viewport,
          textDivs: [],
        });
      });
  };

  zoomInOut(zoomStep) {
    if (this.pdfDocument === null) return;
    this.scale += zoomStep;

    this._render();
  }

  findKeyword() {
    if (this.KeywordToFind !== '') {
      let elements = document.querySelectorAll('.text_container');
      elements.forEach((elem) => {
        let text = elem.innerHTML;
        let searched = `<mark>${this.KeywordToFind.trim()}</mark>`;
        let searchedactive = `<mark class="active">${this.KeywordToFind.trim()}</mark>`;
        let re = new RegExp(searched, 'g'); // search for all instances
        let re2 = new RegExp(searchedactive, 'g'); // search for all instances
        let newText = text.replace(re, this.KeywordToFind.trim());
        newText = newText.replace(re2, this.KeywordToFind.trim());
        elem.innerHTML = newText;
      });
      this.nbOccuranceKeyword = 0;
      let searched = this.KeywordToFind.trim();
      if (searched !== '') {
        elements.forEach((elem) => {
          let text = elem.innerHTML;
          let re = new RegExp(searched, 'g'); // search for all instances
          let newText = text.replace(re, `<mark>${searched}</mark>`);
          elem.innerHTML = newText;
          elem.querySelectorAll('mark').forEach((mark) => {
            this.findedKeywords.push(mark);
            this.nbOccuranceKeyword++;
          });
        });
      }
    }
  }

  resetFindedKeyword() {
    let elements = document.querySelectorAll('.text_container');
    elements.forEach((elem) => {
      let text = elem.innerHTML;
      let searched = `<mark>${this.KeywordToFind.trim()}</mark>`;
      let searchedactive = `<mark class="active">${this.KeywordToFind.trim()}</mark>`;
      let re = new RegExp(searched, 'g'); // search for all instances
      let re2 = new RegExp(searchedactive, 'g'); // search for all instances
      let newText = text.replace(re, this.KeywordToFind.trim());
      newText = newText.replace(re2, this.KeywordToFind.trim());
      elem.innerHTML = newText;
    });
    this.nbOccuranceKeyword = 0;
    this.KeywordToFind = '';
    this.activeFindedKeyword = 0;
    this.findedKeywords = [];
  }

  goPrevKeyword() {
    if (this.activeFindedKeyword === 0) {
      this.activeFindedKeyword = this.findedKeywords.length - 1;
    } else {
      this.activeFindedKeyword--;
    }
    let scroll =
      this.findedKeywords[this.activeFindedKeyword].getBoundingClientRect()
        .top -
      document.getElementById('canvas-container').offsetTop +
      document.getElementById('canvas-container').scrollTop;
    document
      .querySelectorAll('mark')
      .forEach((elem) => elem.removeAttribute('class'));
    this.findedKeywords[this.activeFindedKeyword].setAttribute(
      'class',
      'active'
    );
    document.getElementById('canvas-container').scroll(0, scroll);
  }

  goNextKeyword() {
    if (this.activeFindedKeyword === this.findedKeywords.length - 1) {
      this.activeFindedKeyword = 0;
    } else {
      this.activeFindedKeyword++;
    }
    let scroll =
      this.findedKeywords[this.activeFindedKeyword].getBoundingClientRect()
        .top -
      document.getElementById('canvas-container').offsetTop +
      document.getElementById('canvas-container').scrollTop;
    document
      .querySelectorAll('mark')
      .forEach((elem) => elem.removeAttribute('class'));
    this.findedKeywords[this.activeFindedKeyword].setAttribute(
      'class',
      'active'
    );
    document.getElementById('canvas-container').scroll(0, scroll);
  }

  min = 99;
  max = 999999;
  polygonMode = true;
  pointArray = new Array();
  lineArray = new Array();
  activeLine;
  activeShape;

  drawPlygon() {
    this.activeDrowMode = true;
    let textContainer = document.querySelectorAll('.text_container');
    textContainer.forEach((elem: HTMLElement) => {
      elem.style.display = 'none';
    });

    this.polygonMode = true;
    this.pointArray = new Array();
    this.lineArray = new Array();
    this.activeLine;
  }

  initCanvas(canvas) {
    canvas.on('mouse:down', (options) => {
      if (options.target && options.target.id == this.pointArray[0].id) {
        this.generatePolygon(canvas, this.pointArray);
      }
      if (this.polygonMode) {
        this.addPoint(canvas, options);
      }
    });
    canvas.on('mouse:up', (options) => {});
    canvas.on('mouse:move', (options) => {
      if (this.activeLine && this.activeLine.class === 'line') {
        let pointer = canvas.getPointer(options.e);
        this.activeLine.set({ x2: pointer.x, y2: pointer.y });

        let points = this.activeShape.get('points');
        points[this.pointArray.length] = {
          x: pointer.x,
          y: pointer.y,
        };
        this.activeShape.set({
          points: points,
        });
        canvas.renderAll();
      }
      canvas.renderAll();
    });
  }

  addPoint(canvas, options) {
    let random =
      Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
    let id = new Date().getTime() + random;
    let circle = new fabric.Circle({
      radius: 5,
      fill: '#ffffff',
      stroke: '#333333',
      strokeWidth: 0.5,
      left: options.e.layerX / canvas.getZoom(),
      top: options.e.layerY / canvas.getZoom(),
      selectable: false,
      hasBorders: false,
      hasControls: false,
      originX: 'center',
      originY: 'center',
      id: id,
    });
    if (this.pointArray.length === 0) {
      circle.set({
        fill: 'red',
      });
    }
    let points = [
      options.e.layerX / canvas.getZoom(),
      options.e.layerY / canvas.getZoom(),
      options.e.layerX / canvas.getZoom(),
      options.e.layerY / canvas.getZoom(),
    ];
    let line = new fabric.Line(points, {
      strokeWidth: 2,
      fill: '#999999',
      stroke: '#999999',
      class: 'line',
      originX: 'center',
      originY: 'center',
      selectable: false,
      hasBorders: false,
      hasControls: false,
      evented: false,
    });
    if (this.activeShape) {
      let pos = canvas.getPointer(options.e);
      let points = this.activeShape.get('points');
      points.push({
        x: pos.x,
        y: pos.y,
      });
      let polygon = new fabric.Polygon(points, {
        stroke: '#333333',
        strokeWidth: 1,
        fill: '#cccccc',
        opacity: 0.3,
        selectable: false,
        hasBorders: false,
        hasControls: false,
        evented: false,
      });
      canvas.remove(this.activeShape);
      canvas.add(polygon);
      this.activeShape = polygon;
      canvas.renderAll();
    } else {
      let polyPoint = [
        {
          x: options.e.layerX / canvas.getZoom(),
          y: options.e.layerY / canvas.getZoom(),
        },
      ];
      let polygon = new fabric.Polygon(polyPoint, {
        stroke: '#333333',
        strokeWidth: 1,
        fill: '#cccccc',
        opacity: 0.3,
        selectable: false,
        hasBorders: false,
        hasControls: false,
        evented: false,
      });
      this.activeShape = polygon;
      canvas.add(polygon);
    }
    this.activeLine = line;

    this.pointArray.push(circle);
    this.lineArray.push(line);

    canvas.add(line);
    canvas.add(circle);
    canvas.selection = false;
  }

  generatePolygon(canvas, pointArray) {
    let points = new Array();
    pointArray.forEach((point) => {
      points.push({
        x: point.left,
        y: point.top,
      });
      canvas.remove(point);
    });
    this.lineArray.forEach((line) => {
      canvas.remove(line);
    });
    canvas.remove(this.activeShape).remove(this.activeLine);
    let polygon = new fabric.Polygon(points, {
      stroke: '#333333',
      strokeWidth: 0.5,
      fill: 'transparent',
      opacity: 1,
      hasBorders: false,
      hasControls: false,
    });
    canvas.add(polygon);

    this.activeLine = null;
    this.activeShape = null;
    this.polygonMode = false;
    canvas.selection = true;
    this.activeDrowMode = false;

    let newPoints = [];
    points.forEach((elem) => {
      newPoints.push({ x: elem.x / 37, y: elem.y / 37 });
    });
    //let a = new polygonjs(newPoints);
    //console.log(a.area());
  }

  disableDrowMode() {
    this.activeDrowMode = false;
    let textContainer = document.querySelectorAll('.text_container');
    textContainer.forEach((elem: HTMLElement) => {
      elem.style.display = 'block';
    });
  }

  saveByteArray() {
    /*this.pdfDoc.save().then((pdfBytes) => {
      let blob = new Blob([pdfBytes], {
        type: 'application/pdf',
      });
      this.dataurl = window.URL.createObjectURL(blob);
      this.pdfBuffer = pdfBytes;
    });*/
  }
}
