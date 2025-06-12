const URL = "https://teachablemachine.withgoogle.com/models/gCL-xqZ8C/";

let model, webcam, maxPredictions;
const webcamButton = document.getElementById("webcamButton");
const fileUpload = document.getElementById("fileUpload");
const uploadButton = document.getElementById("uploadButton");
const retakeButton = document.getElementById("retakeButton");
const analyzeButton = document.getElementById("analyzeButton");
const webcamElement = document.getElementById("webcam");
const uploadedImageElement = document.getElementById("uploadedImage");
const canvasElement = document.getElementById("canvas");
const ctx = canvasElement.getContext("2d");
const resultText = document.getElementById("resultText");
const placeholderImage = document.getElementById("placeholderImage");
const confidenceBar = document.querySelector(".confidence-level");
const actionButtons = document.querySelector(".action-buttons");
const additionalInfo = document.getElementById("additionalInfo");

let isWebcamRunning = false;
let currentImage = null;

// ข้อมูลคำแนะนำเฉพาะสำหรับแมลงแต่ละชนิด
const insectAdvice = {
    "Lady Beetles - ด้วงเต่าลาย": {
        type: "friendly",
        advice: "ด้วงเต่าลายเป็นแมลงมีประโยชน์",
        detail: "ตัวเต็มวัยกินเพลี้ยวันละ 50-60 ตัว ควรอนุรักษ์ในสวน",
        solution: "ปลูกพืชดอกสีเหลืองเพื่อดึงดูดด้วงเต่าลาย"
    },
    "Green Lacewing - แมลงช้างปีกใส": {
        type: "friendly",
        advice: "แมลงช้างปีกใสเป็นแมลงมีประโยชน์",
        detail: "ตัวอ่อนกินเพลี้ยและไรศัตรูพืช ช่วยควบคุมประชากรศัตรูพืช",
        solution: "ปลูกพืชมีดอกเล็กๆ เพื่อดึงดูดตัวเต็มวัย"
    },
    "Stink Bug - มวนพิฆาต": {
        type: "friendly",
        advice: "มวนพิฆาตเป็นแมลงมีประโยชน์",
        detail: "กินหนอนและไข่ของแมลงศัตรูพืชหลายชนิด",
        solution: "รักษาสมดุลธรรมชาติในสวน"
    },
    "Assassin Bug - มวนเพชฌฆาต": {
        type: "friendly",
        advice: "มวนเพชฌฆาตเป็นแมลงมีประโยชน์",
        detail: "ล่าแมลงศัตรูพืชขนาดเล็กด้วยการดูดของเหลว",
        solution: "ไม่ควรใช้สารเคมีเพราะจะทำลายประชากรมวนชนิดนี้"
    },
    "Mealybugs - เพลี้ยแป้ง": {
        type: "pest",
        advice: "เพลี้ยแป้งศัตรูพืชร้ายแรง",
        detail: "ดูดน้ำเลี้ยงทำให้พืชแคระแกร็นและผลิตน้ำหวานที่ทำให้เกิดราดำ",
        solution: "ใช้สารสะเดาหรือเชื้อราบิวเวอร์เรียฉีดพ่น"
    },
    "Cutworm - หนอนกระทู้": {
        type: "pest",
        advice: "หนอนกระทู้กัดกินใบพืช",
        detail: "กัดกินใบและลำต้นพืชอ่อนในเวลากลางคืน",
        solution: "ใช้เชื้อ Bt (Bacillus thuringiensis) ฉีดพ่นตอนเย็น"
    },
    "Striped Flea Beetle - ด้วงหมัดผักแถบลาย": {
        type: "pest",
        advice: "ด้วงหมัดผักแถบลายทำลายพืช",
        detail: "กัดกินใบพืชทำให้เป็นรูพรุน โดยเฉพาะพืชตระกูลกะหล่ำ",
        solution: "ใช้สเปรย์พริกไทยหรือคลุมดินด้วยวัสดุสะท้อนแสง"
    }
};

// ฟังก์ชันปรับขนาดรูปภาพใหม่
function resizeImage(image, width = 224, height = 224) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
}

// โหลดโมเดล Teachable Machine
async function init() {
    resultText.innerText = "กำลังโหลดโมเดล AI...";
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        resultText.innerText = "พร้อมใช้งาน! กรุณาอัปโหลดหรือถ่ายภาพแมลง";
    } catch (error) {
        console.error("ข้อผิดพลาดในการโหลดโมเดล:", error);
        resultText.innerText = "ไม่สามารถโหลดโมเดล AI ได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
    }

    webcamElement.style.display = 'none';
    uploadedImageElement.style.display = 'none';
    canvasElement.style.display = 'none';
    placeholderImage.style.display = 'flex';
    actionButtons.style.display = 'none';
    additionalInfo.style.display = 'none';
}

// เปิดกล้องหรือถ่ายภาพ
async function toggleWebcamAndCapture() {
    if (!isWebcamRunning) {
        try {
            uploadedImageElement.style.display = 'none';
            canvasElement.style.display = 'none';
            placeholderImage.style.display = 'none';
            actionButtons.style.display = 'none';
            resultText.innerText = "กำลังพรีวิวกล้อง...";

            webcamElement.style.display = 'block';
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 400, height: 300, facingMode: "environment" },
                audio: false
            });
            webcamElement.srcObject = stream;
            isWebcamRunning = true;
            webcamButton.innerHTML = '<i class="fas fa-camera"></i> ถ่ายภาพ';
        } catch (error) {
            console.error("ไม่สามารถเปิดกล้อง:", error);
            resultText.innerText = "ไม่สามารถเข้าถึงกล้องได้";
            webcamButton.innerHTML = '<i class="fas fa-camera"></i> เปิดกล้อง';
            placeholderImage.style.display = 'flex';
        }
    } else {
        capturePhoto();
    }
}

// ถ่ายภาพจากกล้อง
function capturePhoto() {
    if (!isWebcamRunning) return;
    
    const resizedCanvas = resizeImage(webcamElement);
    const stream = webcamElement.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    
    isWebcamRunning = false;
    webcamElement.style.display = 'none';
    webcamElement.srcObject = null;
    webcamButton.innerHTML = '<i class="fas fa-camera"></i> เปิดกล้อง';

    uploadedImageElement.src = resizedCanvas.toDataURL();
    uploadedImageElement.style.display = 'block';
    placeholderImage.style.display = 'none';
    actionButtons.style.display = 'flex';
    currentImage = resizedCanvas;
}

// จัดการอัปโหลดไฟล์
function handleFileUpload(event) {
    if (isWebcamRunning) {
        const stream = webcamElement.srcObject;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        }
        isWebcamRunning = false;
        webcamElement.style.display = 'none';
        webcamElement.srcObject = null;
        webcamButton.innerHTML = '<i class="fas fa-camera"></i> เปิดกล้อง';
    }

    const file = event.target.files[0];
    if (!file) {
        resultText.innerText = "ไม่ได้เลือกไฟล์";
        return;
    }

    resultText.innerText = "กำลังประมวลผลรูปภาพ...";
    uploadedImageElement.style.display = 'none';
    placeholderImage.style.display = 'none';
    canvasElement.style.display = 'none';
    actionButtons.style.display = 'none';

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const resizedCanvas = resizeImage(img);
            uploadedImageElement.src = resizedCanvas.toDataURL();
            uploadedImageElement.style.display = 'block';
            placeholderImage.style.display = 'none';
            actionButtons.style.display = 'flex';
            currentImage = resizedCanvas;
        };
        img.onerror = () => {
            resultText.innerText = "ไม่สามารถโหลดรูปภาพได้";
            placeholderImage.style.display = 'flex';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ทำนายภาพ
async function predict(image) {
    if (!model) {
        resultText.innerText = "ยังไม่ได้โหลดโมเดล";
        return;
    }

    if (image.width !== 224 || image.height !== 224) {
        image = resizeImage(image);
    }

    try {
        resultText.innerText = "กำลังวิเคราะห์ภาพ...";
        const prediction = await model.predict(image);
        let highestProbability = 0;
        let predictedClass = "ไม่ทราบ";

        for (let i = 0; i < maxPredictions; i++) {
            const { className, probability } = prediction[i];
            if (probability > highestProbability) {
                highestProbability = probability;
                predictedClass = className;
            }
        }

        confidenceBar.style.width = `${highestProbability * 100}%`;
        
        if (highestProbability > 0.8) {
            const adviceData = insectAdvice[predictedClass] || {
                type: "unknown",
                advice: "ไม่มีข้อมูลคำแนะนำเฉพาะ",
                detail: "กรุณาตรวจสอบข้อมูลเพิ่มเติมจากแหล่งอื่น",
                solution: "ปรึกษาผู้เชี่ยวชาญด้านกีฏวิทยา"
            };

            resultText.innerHTML = `
                <div class="prediction-header">
                    <strong>${predictedClass}</strong> 
                    <span>(${(highestProbability * 100).toFixed(1)}% ความมั่นใจ)</span>
                </div>
                <div class="advice-box ${adviceData.type}">
                    <div class="advice-header">
                        <span>${adviceData.advice}</span>
                    </div>
                    <div class="advice-detail">
                        <i class="fas fa-info-circle"></i>
                        <span>${adviceData.detail}</span>
                    </div>
                    <div class="advice-solution">
                        <i class="fas fa-lightbulb"></i>
                        <span><strong>วิธีแก้ไข:</strong> ${adviceData.solution}</span>
                    </div>
                </div>
            `;

            if (adviceData.type === "friendly") {
                resultText.style.color = "var(--primary-dark)";
                confidenceBar.style.backgroundColor = "var(--primary-color)";
            } else if (adviceData.type === "pest") {
                resultText.style.color = "var(--danger-color)";
                confidenceBar.style.backgroundColor = "var(--danger-color)";
            } else {
                resultText.style.color = "var(--primary-dark)";
                confidenceBar.style.backgroundColor = "var(--primary-color)";
            }
        } else {
            resultText.innerHTML = `
                <div>ไม่สามารถระบุชนิดแมลงได้แน่ชัด (ความมั่นใจต่ำกว่า 80%)</div>
                <div class="advice-box unknown">
                    <i class="fas fa-question-circle"></i>
                    <span>กรุณาถ่ายภาพใหม่อีกครั้งในมุมที่ชัดเจน</span>
                </div>
            `;
            resultText.style.color = "var(--warning-color)";
            confidenceBar.style.backgroundColor = "var(--warning-color)";
        }
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการทำนาย:", error);
        resultText.innerHTML = `
            <div>เกิดข้อผิดพลาดในการวิเคราะห์ภาพ</div>
            <div class="advice-box error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>กรุณาลองใหม่อีกครั้ง</span>
            </div>
        `;
        resultText.style.color = "var(--danger-color)";
        confidenceBar.style.backgroundColor = "var(--danger-color)";
    }
}

// Event listeners
webcamButton.addEventListener("click", toggleWebcamAndCapture);
uploadButton.addEventListener("click", () => fileUpload.click());
fileUpload.addEventListener("change", handleFileUpload);
retakeButton.addEventListener("click", () => {
    uploadedImageElement.style.display = 'none';
    placeholderImage.style.display = 'flex';
    actionButtons.style.display = 'none';
    resultText.innerText = "พร้อมใช้งาน! กรุณาอัปโหลดหรือถ่ายภาพแมลง";
    confidenceBar.style.width = '0%';
    additionalInfo.style.display = 'none';
});
analyzeButton.addEventListener("click", () => {
    if (currentImage) {
        predict(currentImage);
    }
});

// เริ่มโหลดโมเดลเมื่อหน้าเว็บโหลดเสร็จ
window.addEventListener('DOMContentLoaded', init);