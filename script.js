document.addEventListener('DOMContentLoaded', function() {
    const firebaseConfig = {
        apiKey: "AIzaSyCOyWQSh7learNSgv5SQGt12PpVenz4z-s",
        authDomain: "whiteboard-12.firebaseapp.com",
        projectId: "whiteboard-12",
        storageBucket: "whiteboard-12.firebasestorage.app",
        messagingSenderId: "534486458655",
        appId: "1:534486458655:web:dd219b8a79f58f3386102a",
        measurementId: "G-J8C15MYXPJ"
    };

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const canvas = document.getElementById('whiteboard');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - document.getElementById('toolbar').offsetHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentColor = '#000000';
    let currentLineWidth = 2;
    let isEraser = false;
    let isTextMode = false;
    let currentTool = 'pencil';
    let startX, startY;
    let isDrawingShape = false;
    let drawnShapes = []; 

    const pencilBtn = document.getElementById('pencilBtn');
    const eraserBtn = document.getElementById('eraserBtn');
    const textBtn = document.getElementById('textBtn');
    const rectangleBtn = document.getElementById('rectangleBtn');
    const circleBtn = document.getElementById('circleBtn');
    const triangleBtn = document.getElementById('triangleBtn');
    const lineBtn = document.getElementById('lineBtn');
    const colorPicker = document.getElementById('colorPicker');
    const lineWidthInput = document.getElementById('lineWidth');
    const saveBtn = document.getElementById('saveBtn');
    const exportImageBtn = document.getElementById('exportImageBtn');
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    const clearBtn = document.getElementById('clearBtn');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    function startDrawing(event) {
        isDrawing = true;
        lastX = event.offsetX;
        lastY = event.offsetY;
        
        if (['rectangle', 'circle', 'triangle', 'line'].includes(currentTool)) {
            isDrawingShape = true;
            startX = event.offsetX;
            startY = event.offsetY;
        }
    }

    function draw(event) {
        if (!isDrawing) {
            return;
        }
        
        if (isDrawingShape) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawnShapes.forEach(function(shape) {
                drawShape(shape);
            });
            
            const width = event.offsetX - startX;
            const height = event.offsetY - startY;
            
            ctx.beginPath();
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentLineWidth;
            
            switch (currentTool) {
                case 'rectangle':
                    ctx.rect(startX, startY, width, height);
                    break;
                case 'circle':
                    const radius = Math.sqrt(width * width + height * height);
                    ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
                    break;
                case 'triangle':
                    ctx.moveTo(startX, startY + height);
                    ctx.lineTo(startX + width / 2, startY);
                    ctx.lineTo(startX + width, startY + height);
                    ctx.closePath();
                    break;
                case 'line':
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(event.offsetX, event.offsetY);
                    break;
            }
            ctx.stroke();
        } else if (!isTextMode) {
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(event.offsetX, event.offsetY);
            ctx.strokeStyle = isEraser ? '#ffffff' : currentColor;
            ctx.lineWidth = currentLineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
            lastX = event.offsetX;
            lastY = event.offsetY;
            
            saveDrawing(event.offsetX, event.offsetY, false);
        }
    }

    function endDrawing(event) {
        if (isDrawingShape && isDrawing) {
            const shapeData = {
                type: currentTool,
                startX: startX,
                startY: startY,
                endX: event.offsetX,
                endY: event.offsetY,
                color: currentColor,
                lineWidth: currentLineWidth
            };
            drawnShapes.push(shapeData);
            saveShapeToFirebase(shapeData);
        }
        
        isDrawing = false;
        isDrawingShape = false;
    }

    function addText(event) {
        if (!isTextMode) {
            return;
        }
        const text = prompt('Enter text:');
        if (text) {
            ctx.font = currentLineWidth * 8 + 'px Arial';
            ctx.fillStyle = currentColor;
            ctx.fillText(text, event.offsetX, event.offsetY);
            saveTextToFirebase(text, event.offsetX, event.offsetY);
        }
    }

    function saveDrawing(xCoord, yCoord, isNewLine) {
        const drawingRef = database.ref('drawings').push();
        drawingRef.set({
            x: xCoord,
            y: yCoord,
            color: isEraser ? '#ffffff' : currentColor,
            lineWidth: currentLineWidth,
            isNewLine: isNewLine,
            isEraser: isEraser
        });
    }

    function saveTextToFirebase(textContent, xCoord, yCoord) {
        const textRef = database.ref('texts').push();
        textRef.set({
            text: textContent,
            x: xCoord,
            y: yCoord,
            color: currentColor,
            fontSize: currentLineWidth * 8
        });
    }

    function saveShapeToFirebase(shapeData) {
        const shapeRef = database.ref('shapes').push();
        shapeRef.set(shapeData);
    }

    function drawShape(shape) {
        ctx.beginPath();
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = shape.lineWidth;
        
        const width = shape.endX - shape.startX;
        const height = shape.endY - shape.startY;
        
        switch (shape.type) {
            case 'rectangle':
                ctx.rect(shape.startX, shape.startY, width, height);
                break;
            case 'circle':
                const radius = Math.sqrt(width * width + height * height);
                ctx.arc(shape.startX, shape.startY, radius, 0, 2 * Math.PI);
                break;
            case 'triangle':
                ctx.moveTo(shape.startX, shape.startY + height);
                ctx.lineTo(shape.startX + width / 2, shape.startY);
                ctx.lineTo(shape.startX + width, shape.startY + height);
                ctx.closePath();
                break;
            case 'line':
                ctx.moveTo(shape.startX, shape.startY);
                ctx.lineTo(shape.endX, shape.endY);
                break;
        }
        ctx.stroke();
    }

    pencilBtn.addEventListener('click', function() {
        currentTool = 'pencil';
        isEraser = false;
        isTextMode = false;
        canvas.style.cursor = 'crosshair';
    });

    eraserBtn.addEventListener('click', function() {
        currentTool = 'eraser';
        isEraser = true;
        isTextMode = false;
        canvas.style.cursor = 'cell';
    });

    rectangleBtn.addEventListener('click', function() {
        currentTool = 'rectangle';
        isEraser = false;
        isTextMode = false;
        canvas.style.cursor = 'crosshair';
    });

    circleBtn.addEventListener('click', function() {
        currentTool = 'circle';
        isEraser = false;
        isTextMode = false;
        canvas.style.cursor = 'crosshair';
    });

    triangleBtn.addEventListener('click', function() {
        currentTool = 'triangle';
        isEraser = false;
        isTextMode = false;
        canvas.style.cursor = 'crosshair';
    });

    lineBtn.addEventListener('click', function() {
        currentTool = 'line';
        isEraser = false;
        isTextMode = false;
        canvas.style.cursor = 'crosshair';
    });

    textBtn.addEventListener('click', function() {
        currentTool = 'text';
        isTextMode = true;
        isEraser = false;
        canvas.style.cursor = 'text';
    });

    colorPicker.addEventListener('change', function(event) {
        currentColor = event.target.value;
    });

    lineWidthInput.addEventListener('input', function(event) {
        currentLineWidth = event.target.value;
    });

    database.ref('drawings').on('child_added', function(snapshot) {
        const data = snapshot.val();
        ctx.beginPath();
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.lineWidth;
        
        if (data.isNewLine) {
            ctx.moveTo(data.x, data.y);
        } else {
            ctx.lineTo(data.x, data.y);
            ctx.stroke();
        }
    });

    database.ref('texts').on('child_added', function(snapshot) {
        const data = snapshot.val();
        ctx.font = data.fontSize + 'px Arial';
        ctx.fillStyle = data.color;
        ctx.fillText(data.text, data.x, data.y);
    });

    database.ref('shapes').on('child_added', function(snapshot) {
        const shape = snapshot.val();
        if (!drawnShapes.some(function(existingShape) {
            return existingShape.startX === shape.startX && existingShape.startY === shape.startY;
        })) {
            drawnShapes.push(shape);
        }
        drawShape(shape);
    });

    clearBtn.addEventListener('click', function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawnShapes = [];
        database.ref('drawings').remove();
        database.ref('texts').remove();
        database.ref('shapes').remove();
    });

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDrawing);
    canvas.addEventListener('mouseout', endDrawing);
    canvas.addEventListener('click', addText);

    saveBtn.addEventListener('click', function() {
        alert('Drawing saved to Firebase');
    });

    exportImageBtn.addEventListener('click', function() {
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'whiteboard.png';
        link.href = dataURL;
        link.click();
    });

    exportPDFBtn.addEventListener('click', function() {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0);
        pdf.save('whiteboard.pdf');
    });

    const undoStack = [];
    const redoStack = [];

    function saveState() {
        undoStack.push(canvas.toDataURL());
        redoStack.length = 0;
    }

    undoBtn.addEventListener('click', function() {
        if (undoStack.length > 0) {
            redoStack.push(canvas.toDataURL());
            const imgData = undoStack.pop();
            const img = new Image();
            img.src = imgData;
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
        }
    });

    redoBtn.addEventListener('click', function() {
        if (redoStack.length > 0) {
            undoStack.push(canvas.toDataURL());
            const imgData = redoStack.pop();
            const img = new Image();
            img.src = imgData;
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
        }
    });

    canvas.addEventListener('mouseup', saveState);
    canvas.addEventListener('mouseout', saveState);
});
